// Banco de demonstração: roda o app sem Supabase (endereço com ?demo).
// Segue as mesmas regras do banco real e guarda as alterações só neste navegador.
// Os clientes, pessoas e valores abaixo são FICTÍCIOS, criados para demonstrar o fluxo.
import {
  validarProposta, transicaoValida, exigeMotivo, podeEditar, subtotal, centavos, SOLICITACAO_ATIVA,
  chaveDia, somarDias, dataLocal, ehPlanilha, EXTENSOES_PLANILHA,
} from './business.js'

const CHAVE = 'zetta-propostas-demo-v4'
const CHAVE_USUARIO = 'zp-demo-usuario'
const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}${Date.now()}`)
const copia = o => JSON.parse(JSON.stringify(o))
const pausa = (ms = 120) => new Promise(r => setTimeout(r, ms))

const JOSE = 'demo-jose'
const MARINA = 'demo-marina'
const RAFAEL = 'demo-rafael'

// Data relativa a hoje: dia(-3, 14) = três dias atrás, às 14h.
function dia(delta, hora = 10) {
  const d = new Date(); d.setDate(d.getDate() + delta); d.setHours(hora, 0, 0, 0); return d.toISOString()
}
const diaSimples = delta => dia(delta).slice(0, 10)

function semear() {
  const db = { clientes: [], solicitacoes: [], propostas: [], itens: [], revisoes: [], statusHistorico: [], historico: [], anexos: [], seq: 0 }
  db.equipe = [
    { id: JOSE, nome: 'José Alcântara', email: 'jose@zetta.exemplo', perfil: 'admin', ativo: true, criado_em: dia(-160) },
    { id: MARINA, nome: 'Marina Costa', email: 'marina@zetta.exemplo', perfil: 'comercial', ativo: true, criado_em: dia(-150) },
    { id: RAFAEL, nome: 'Rafael Lima', email: 'rafael@zetta.exemplo', perfil: 'operacional', ativo: true, criado_em: dia(-50) },
  ]
  const cli = {}
  ;[
    ['pantanal', 'Distribuidora Pantanal', 'Rogério Nantes', 'Campo Grande', '(67) 99812-4410', -150],
    ['vida', 'Clínica Vida Plena', 'Dra. Helena Arruda', 'Campo Grande', '(67) 99654-2201', -140],
    ['rota', 'Transportadora Rota Oeste', 'Cláudio Ferraz', 'Dourados', '(67) 99733-0918', -135],
    ['bonfim', 'Construtora Bonfim', 'Eng. Paulo Bonfim', 'Campo Grande', '(67) 99140-7783', -60],
    ['afonso', 'Auto Center Afonso Pena', 'Marcos Ribas', 'Campo Grande', '(67) 99288-5530', -45],
    ['serra', 'Laticínios Serra de Maracaju', 'Luciana Teixeira', 'Maracaju', '(67) 99507-6612', -38],
    ['recanto', 'Escola Recanto do Saber', 'Fernanda Lopes', 'Campo Grande', '(67) 99361-2047', -9],
    ['tres', 'Agropecuária Três Lagoas', 'Antônio Siqueira', 'Três Lagoas', '(67) 99876-3354', -7],
    ['visao', 'Ótica Visão Central', 'Bruna Okada', 'Campo Grande', '(67) 99420-1189', -14],
    ['cerrado', 'Restaurante Sabor do Cerrado', 'Ana Paula Rezende', 'Campo Grande', '(67) 99215-8840', -2],
  ].forEach(([k, nome, contato, cidade, telefone, criado]) => {
    cli[k] = uid()
    db.clientes.push({ id: cli[k], nome, contato, cidade, telefone, email: null, documento: null, observacoes: null, criado_em: dia(criado), atualizado_em: dia(criado), criado_por: JOSE })
  })

  const sol = {}
  const solicitacao = (k, cliente, titulo, descricao, prioridade, resp, criado, prazo, eventos, motivo) => {
    sol[k] = uid()
    const ultimo = eventos[eventos.length - 1]
    db.solicitacoes.push({
      id: sol[k], cliente_id: cli[cliente], titulo, descricao, prioridade, status: ultimo[0], responsavel_id: resp,
      prazo: prazo == null ? null : diaSimples(prazo), motivo_cancelamento: motivo || null,
      status_desde: dia(ultimo[1]), criado_em: dia(criado), atualizado_em: dia(ultimo[1]), criado_por: resp,
    })
    let de = null
    for (const [para, quando] of eventos) {
      db.statusHistorico.push({ id: db.statusHistorico.length + 1, entidade: 'solicitacoes', registro_id: sol[k], de, para, motivo: para === 'Cancelada' ? motivo : null, em: dia(quando, 9), por: resp })
      db.historico.push({ id: db.historico.length + 1, entidade: 'solicitacoes', registro_id: sol[k], acao: de ? 'Status' : 'Abertura', descricao: de ? `${de} → ${para}` : titulo, criado_em: dia(quando, 9), por: resp })
      de = para
    }
  }
  solicitacao('fiscal', 'rota', 'Integração com o sistema fiscal', 'Enviar as notas emitidas para a planilha de custos automaticamente.', 'Media', JOSE, -138, null, [['Aberta', -138], ['Em proposta', -136], ['Concluida', -130]])
  solicitacao('planilha', 'pantanal', 'Planilha de estoque automatizada', 'Atualizar o estoque a partir dos pedidos do WhatsApp.', 'Baixa', MARINA, -110, null, [['Aberta', -110], ['Em proposta', -105], ['Cancelada', -95]], 'Cliente optou por esperar o sistema de pedidos completo.')
  solicitacao('financeiro', 'vida', 'Painel financeiro da clínica', 'Receitas por convênio e por profissional, atualizadas todo dia.', 'Media', JOSE, -88, null, [['Aberta', -88], ['Em proposta', -84], ['Concluida', -70]])
  solicitacao('entregas', 'rota', 'Dashboard de entregas e custos por rota', 'Custo por quilômetro e atrasos por rota, com histórico de 12 meses.', 'Alta', JOSE, -58, null, [['Aberta', -58], ['Em analise', -56], ['Em proposta', -52], ['Concluida', -40]])
  solicitacao('oficina', 'afonso', 'Orçamentos da oficina', 'Montar orçamentos de serviço com peças e mão de obra pelo celular.', 'Media', MARINA, -44, null, [['Aberta', -44], ['Em proposta', -40], ['Cancelada', -25]], 'Cliente recusou a proposta; retomar em março.')
  solicitacao('lotes', 'serra', 'Rastreio de lotes de produção', 'Registrar lote, data de fabricação e validade de cada produção.', 'Alta', JOSE, -36, null, [['Aberta', -36], ['Em analise', -34], ['Em proposta', -30], ['Concluida', -12]])
  solicitacao('pedidos', 'pantanal', 'App de pedidos para vendedores externos', 'Três vendedores tiram pedidos no WhatsApp e o escritório redigita no Excel.', 'Alta', JOSE, -20, 5, [['Aberta', -20], ['Em analise', -18], ['Em proposta', -16]])
  solicitacao('agenda', 'vida', 'Agendamento de consultas pelo WhatsApp', 'Pacientes marcam e confirmam consultas sem ligar para a recepção.', 'Media', MARINA, -15, 12, [['Aberta', -15], ['Em proposta', -11]])
  solicitacao('lembrete', 'visao', 'Lembrete de retorno de clientes', 'Avisar o cliente quando completar um ano da última consulta.', 'Baixa', MARINA, -12, 20, [['Aberta', -12], ['Em proposta', -5]])
  solicitacao('medicoes', 'bonfim', 'Controle de medições de obra', 'Medições quinzenais de empreiteiros, hoje feitas em planilhas soltas.', 'Alta', JOSE, -10, 8, [['Aberta', -10], ['Em proposta', -6]])
  solicitacao('matriculas', 'recanto', 'Matrículas online', 'Rematrícula e pagamento da primeira parcela pelo site.', 'Media', MARINA, -9, -2, [['Aberta', -9]])
  solicitacao('cardapio', 'cerrado', 'Cardápio digital com pedidos na mesa', 'Cliente lê o QR code, faz o pedido e a cozinha recebe na hora.', 'Media', MARINA, -2, 9, [['Aberta', -2], ['Em analise', -1]])
  solicitacao('relatorio', 'tres', 'Relatório mensal automático de vendas', 'Fechamento mensal por vendedor e por produto enviado por e-mail.', 'Baixa', MARINA, -7, 10, [['Aberta', -7], ['Em analise', -3]])

  const proposta = (solK, titulo, escopo, itens, desconto, eventos, { validade, motivo, pagamento, revisoes = 1 } = {}) => {
    const id = uid()
    db.seq += 1
    const numero = `ZP-${String(db.seq).padStart(5, '0')}`
    const s = db.solicitacoes.find(x => x.id === sol[solK])
    const sub = subtotal(itens)
    const ultimo = eventos[eventos.length - 1]
    const enviada = eventos.find(e => e[0] === 'Enviada')
    const final = ['Aprovada', 'Recusada', 'Cancelada'].includes(ultimo[0])
    const p = {
      id, numero, solicitacao_id: s.id, titulo, escopo, status: ultimo[0], subtotal: sub, desconto, valor_total: centavos(sub - desconto),
      validade: validade == null ? null : diaSimples(validade), condicoes_pagamento: pagamento || '50% na assinatura e 50% na entrega.',
      observacoes: null, motivo_encerramento: final && ultimo[0] !== 'Aprovada' ? motivo : null, revisao_atual: revisoes,
      status_desde: dia(ultimo[1], 15), enviada_em: enviada ? dia(enviada[1], 15) : null, decidida_em: final ? dia(ultimo[1], 15) : null,
      criado_em: dia(eventos[0][1], 11), atualizado_em: dia(ultimo[1], 15), criado_por: s.responsavel_id,
    }
    db.propostas.push(p)
    itens.forEach((i, n) => db.itens.push({ id: uid(), proposta_id: id, ordem: n + 1, ...i }))
    for (let r = 1; r <= revisoes; r++) {
      const quando = eventos[Math.min(r - 1, eventos.length - 1)][1]
      db.revisoes.push({
        id: uid(), proposta_id: id, numero_revisao: r, criado_em: dia(quando, 12), criado_por: p.criado_por,
        dados: { titulo, escopo, status: r === revisoes ? p.status : 'Rascunho', subtotal: sub, desconto: r === revisoes ? desconto : 0, valor_total: r === revisoes ? p.valor_total : sub, validade: p.validade },
        itens: itens.map(i => ({ ...i })),
      })
    }
    let de = null
    for (const [para, quando] of eventos) {
      const m = para === ultimo[0] && final && para !== 'Aprovada' ? motivo : null
      db.statusHistorico.push({ id: db.statusHistorico.length + 1, entidade: 'propostas', registro_id: id, de, para, motivo: m, em: dia(quando, 15), por: p.criado_por })
      db.historico.push({ id: db.historico.length + 1, entidade: 'propostas', registro_id: id, acao: de ? 'Status' : 'Criação', descricao: de ? (m ? `${para}: ${m}` : para) : `${numero} · ${titulo}`, criado_em: dia(quando, 15), por: p.criado_por })
      de = para
    }
  }
  const item = (descricao, quantidade, valor_unitario) => ({ descricao, quantidade, valor_unitario })

  proposta('fiscal', 'Integração das notas fiscais com a planilha de custos', 'Rotina diária que lê as notas emitidas e lança os custos por rota.',
    [item('Automação de leitura das notas (n8n)', 1, 3800), item('Ajuste da planilha de custos', 1, 1400)], 0,
    [['Rascunho', -136], ['Enviada', -134], ['Aprovada', -130]], { validade: -120 })
  proposta('planilha', 'Planilha de estoque com baixa automática', 'Baixa de estoque a partir dos pedidos registrados.',
    [item('Planilha de estoque com fórmulas e validações', 1, 1900), item('Automação de baixa pelo WhatsApp', 1, 2600)], 0,
    [['Rascunho', -105], ['Enviada', -103], ['Cancelada', -95]], { validade: -90, motivo: 'Cliente optou por esperar o sistema de pedidos completo.' })
  proposta('financeiro', 'Painel financeiro por convênio e profissional', 'Painel com receitas, glosas e repasses, atualizado diariamente.',
    [item('Modelagem dos dados financeiros', 1, 2400), item('Painel em Power BI (4 páginas)', 1, 4600), item('Treinamento da equipe administrativa', 4, 200)], 0,
    [['Rascunho', -84], ['Enviada', -82], ['Em negociacao', -76], ['Aprovada', -70]], { validade: -60, revisoes: 2 })
  proposta('entregas', 'Dashboard de entregas e custo por rota', 'Indicadores de custo por quilômetro, atrasos e ocupação por rota.',
    [item('Modelagem de dados das entregas', 1, 3000), item('Dashboard em Power BI (5 páginas)', 1, 5500), item('Atualização automática diária', 1, 900)], 400,
    [['Rascunho', -52], ['Enviada', -50], ['Em negociacao', -45], ['Aprovada', -40]], { validade: -30, revisoes: 2 })
  proposta('oficina', 'App de orçamentos para a oficina', 'Orçamento com peças e mão de obra, enviado ao cliente pelo WhatsApp.',
    [item('Aplicativo de orçamentos (PWA)', 1, 5600), item('Cadastro inicial de peças e serviços', 1, 1200)], 0,
    [['Rascunho', -40], ['Enviada', -37], ['Recusada', -25]], { validade: -22, motivo: 'Cliente achou o investimento alto para este ano; pediu para retomar em março.' })
  proposta('lotes', 'Sistema de rastreio de lotes', 'Registro de lotes com QR code, consulta por validade e relatório para a vigilância sanitária.',
    [item('Levantamento dos processos de produção', 1, 2000), item('Sistema web de rastreio de lotes', 1, 11800), item('Modelo de etiqueta com QR code', 1, 600)], 900,
    [['Rascunho', -30], ['Enviada', -27], ['Em negociacao', -20], ['Aprovada', -12]], { validade: -5, revisoes: 2 })
  proposta('pedidos', 'App de pedidos (PWA) e painel de vendas', 'Pedido pelo celular com estoque à vista, fila de separação no escritório e vendas por vendedor.',
    [item('Levantamento e protótipo', 1, 2400), item('Aplicativo de pedidos para vendedores (PWA)', 1, 9800), item('Painel de vendas por vendedor', 1, 3200), item('Treinamento da equipe (horas)', 4, 180)], 620,
    [['Rascunho', -16], ['Enviada', -12], ['Em negociacao', -4]], { validade: 3, revisoes: 3 })
  proposta('agenda', 'Chatbot de agendamento no WhatsApp', 'Paciente agenda, confirma e remarca consultas pelo WhatsApp, integrado à agenda da clínica.',
    [item('Fluxo de agendamento (n8n + WhatsApp)', 1, 4200), item('Integração com a agenda da clínica', 1, 1800), item('Manutenção mensal', 3, 350)], 0,
    [['Rascunho', -11], ['Enviada', -9]], { validade: 21 })
  proposta('medicoes', 'Sistema de medições de obra', 'Lançamento das medições quinzenais por empreiteiro, com aprovação do engenheiro.',
    [item('Sistema web de medições', 1, 12500), item('Importação das planilhas antigas', 1, 1500)], 0,
    [['Rascunho', -6]], { validade: 24 })
  proposta('lembrete', 'Lembretes de retorno por WhatsApp', 'Mensagem automática no aniversário de um ano da última consulta, com link para agendar.',
    [item('Automação de lembretes por WhatsApp', 1, 2900), item('Manutenção mensal', 6, 220)], 0,
    [['Rascunho', -3], ['Enviada', -2]], { validade: 6 })
  semearOperacao(db)
  return db
}

// ---------------------------------------------------------------- pessoas e fechamentos (fictícios)
// Gerador pseudoaleatório com semente fixa: a demonstração sai igual em todo navegador.
function sorteador(semente) {
  let a = semente >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
// Instante relativo a hoje, em horário local: momento(-3, 19, 42) = três dias atrás, 19h42.
function momento(delta, hora, minuto = 0) {
  const d = new Date(); d.setDate(d.getDate() + delta); d.setHours(hora, minuto, 0, 0); return d.toISOString()
}
const chave = delta => chaveDia(dataLocal(momento(delta, 12)))
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function semearOperacao(db) {
  db.funcionarios = []; db.treinamentos = []; db.documentos = []; db.fechamentos = []
  const F = {}
  ;[
    ['ana', 'Ana Paula Ribeiro', 'Eletricista', 'Manutenção', 'Ativo', -980, '(67) 99231-4471'],
    ['bruno', 'Bruno Henrique Dias', 'Técnico de segurança do trabalho', 'SESMT', 'Ativo', -1450, '(67) 99118-2034'],
    ['carla', 'Carla Mendes', 'Operadora de caixa', 'Loja', 'Ativo', -81, '(67) 99604-7718'],
    ['diego', 'Diego Fernandes', 'Auxiliar de manutenção', 'Manutenção', 'Ativo', -620, '(67) 99372-9150'],
    ['elaine', 'Elaine Cristina Rocha', 'Supervisora de loja', 'Loja', 'Ativo', -1820, '(67) 99845-3302'],
    ['fabio', 'Fábio Nogueira', 'Motorista', 'Logística', 'Ativo', -410, '(67) 99267-5589'],
    ['gabriela', 'Gabriela Santos', 'Assistente administrativa', 'Administrativo', 'Afastado', -760, '(67) 99453-6621'],
    ['hugo', 'Hugo Martins', 'Almoxarife', 'Logística', 'Desligado', -900, '(67) 99706-1148'],
    ['isabela', 'Isabela Costa', 'Operadora de empilhadeira', 'Logística', 'Ativo', -350, '(67) 99190-8836'],
  ].forEach(([k, nome, cargo, setor, situacao, admissao, telefone], i) => {
    F[k] = uid()
    db.funcionarios.push({
      id: F[k], nome, cargo, setor, situacao, telefone, email: null, matricula: String(1021 + i * 7), admissao: chave(admissao),
      observacoes: situacao === 'Afastado' ? 'Licença médica desde o mês passado.' : situacao === 'Desligado' ? 'Desligado a pedido.' : null,
      criado_em: momento(-60, 9), atualizado_em: momento(-60, 9), criado_por: JOSE,
    })
    db.historico.push({ id: db.historico.length + 1, entidade: 'funcionarios', registro_id: F[k], acao: 'Cadastro', descricao: nome, criado_em: momento(-60, 9, i), por: JOSE })
  })
  const evento = (func, acao, descricao, delta) => db.historico.push({ id: db.historico.length + 1, entidade: 'funcionarios', registro_id: func, acao, descricao, criado_em: momento(delta, 10), por: JOSE })
  const fmt = k => k.split('-').reverse().join('/')
  const treinamento = (k, nome, realizado, validade, horas, instituicao, certificado) => {
    const t = { id: uid(), funcionario_id: F[k], nome, realizado_em: chave(realizado), validade: validade == null ? null : chave(validade),
      carga_horaria: horas, instituicao, observacoes: null, criado_em: momento(Math.max(realizado, -60), 11), atualizado_em: momento(Math.max(realizado, -60), 11), criado_por: JOSE }
    db.treinamentos.push(t)
    evento(F[k], 'Treinamento', `${nome} registrado${t.validade ? ` · válido até ${fmt(t.validade)}` : ''}`, Math.max(realizado, -59))
    if (certificado) db.anexos.push({ id: uid(), entidade: 'treinamentos', registro_id: t.id, nome: certificado, caminho: `demo:certificado:${t.id}`, tamanho: 182400, tipo: 'application/pdf', criado_em: t.criado_em, criado_por: JOSE })
  }
  const documento = (k, tipo, emitido, validade, numero) => {
    const d = { id: uid(), funcionario_id: F[k], tipo, numero: numero || null, emitido_em: emitido == null ? null : chave(emitido), validade: validade == null ? null : chave(validade),
      observacoes: null, criado_em: momento(-59, 14), atualizado_em: momento(-59, 14), criado_por: JOSE }
    db.documentos.push(d)
    evento(F[k], 'Documento', `${tipo} registrado${d.validade ? ` · válido até ${fmt(d.validade)}` : ''}`, -58)
  }
  treinamento('ana', 'NR-10 Segurança em eletricidade', -712, 18, 40, 'SENAI', 'certificado-nr10-ana.pdf')
  treinamento('ana', 'NR-35 Trabalho em altura', -300, 430, 8, 'SENAI')
  treinamento('ana', 'Primeiros socorros', -200, null, 4, 'Cruz Vermelha')
  treinamento('bruno', 'NR-35 Trabalho em altura', -760, -30, 8, 'SENAI')
  treinamento('bruno', 'NR-35 Trabalho em altura', -25, 705, 8, 'SENAI', 'certificado-nr35-bruno.pdf')
  treinamento('bruno', 'NR-33 Espaço confinado', -340, 25, 16, 'SESI')
  treinamento('bruno', 'Brigada de incêndio', -100, 265, 8, 'Corpo de Bombeiros')
  treinamento('carla', 'Atendimento e caixa (PIX e cartões)', -78, null, 6, 'Treinamento interno')
  treinamento('diego', 'NR-35 Trabalho em altura', -745, -15, 8, 'SENAI')
  treinamento('diego', 'NR-06 Uso de EPI', -600, null, 2, 'Treinamento interno')
  treinamento('elaine', 'Primeiros socorros', -500, 230, 4, 'Cruz Vermelha')
  treinamento('elaine', 'Brigada de incêndio', -372, -7, 8, 'Corpo de Bombeiros')
  treinamento('fabio', 'Direção defensiva', -400, 330, 20, 'SEST SENAT')
  treinamento('hugo', 'NR-11 Operação de empilhadeira', -700, -100, 16, 'SENAI')
  treinamento('isabela', 'NR-11 Operação de empilhadeira', -300, 65, 16, 'SENAI', 'certificado-nr11-isabela.pdf')
  documento('ana', 'ASO periódico', -120, 245)
  documento('bruno', 'ASO periódico', -50, 315)
  documento('bruno', 'RG', -4000, null, '1.234.567 SSP/MS')
  documento('carla', 'Contrato de experiência', -81, 9)
  documento('carla', 'ASO admissional', -82, 283)
  documento('diego', 'ASO periódico', -330, 35)
  documento('elaine', 'ASO periódico', -200, 165)
  documento('fabio', 'CNH', -1800, 20, 'Categoria D')
  documento('fabio', 'Exame toxicológico', -905, 8)
  documento('fabio', 'ASO periódico', -90, 275)
  documento('gabriela', 'ASO periódico', -400, -35)
  documento('isabela', 'ASO periódico', -368, -3)
  db.historico.push({ id: db.historico.length + 1, entidade: 'funcionarios', registro_id: F.hugo, acao: 'Situação', descricao: 'Ativo → Desligado', criado_em: momento(-40, 16), por: JOSE })

  // Fechamentos das últimas seis semanas (segunda a sábado, prazo 20h).
  const inicio = -42
  db.fechamentoAjustes = { id: true, inicio: chave(inicio), dias_semana: [1, 2, 3, 4, 5, 6], horario_limite: '20:00:00', prazo_dia_seguinte: false, atualizado_em: momento(inicio, 9), atualizado_por: JOSE }
  const sorte = sorteador(20261103)
  const BASE = [0, 3200, 3400, 3650, 3900, 5200, 6100]
  // Dias especiais caem sempre em dia de fechamento (nunca no domingo) e não se repetem.
  const usados = new Set()
  const util = d => { while (new Date(momento(d, 12)).getDay() === 0 || usados.has(d)) d += 1; usados.add(d); return d }
  const divergenteEm = util(-5)
  const faltando = new Set([util(-23), util(-9)])
  const atrasados = new Set([util(-30), util(-12)])
  const semExpediente = util(-16)
  const corrigido = util(-19)
  for (let d = inicio; d <= -1; d++) {
    const semana = new Date(momento(d, 12)).getDay()
    const r = sorte(), r2 = sorte(), r3 = sorte()
    if (semana === 0 || faltando.has(d)) continue
    const id = uid()
    const data = chave(d)
    if (d === semExpediente) {
      db.fechamentos.push({ id, data, status: 'Sem expediente', valor_total: null, observacoes: 'Feriado municipal: loja fechada.', enviado_por: JOSE, enviado_em: momento(d - 1, 17), primeiro_envio_em: momento(d - 1, 17),
        conferido_por: null, conferido_em: null, nota_conferencia: null, criado_em: momento(d - 1, 17), atualizado_em: momento(d - 1, 17) })
      db.historico.push({ id: db.historico.length + 1, entidade: 'fechamentos', registro_id: id, acao: 'Sem expediente', descricao: 'Feriado municipal: loja fechada.', criado_em: momento(d - 1, 17), por: JOSE })
      continue
    }
    const quem = semana === 6 ? MARINA : RAFAEL
    const [h, m] = atrasados.has(d) ? [21 + Math.floor(r * 2), Math.floor(r2 * 50)] : [18 + Math.floor(r * 2), 20 + Math.floor(r2 * 39)]
    const envio = momento(d, h, m)
    const valor = centavos(BASE[semana] * (0.86 + r3 * 0.3))
    const divergente = d === divergenteEm
    const aguardando = d >= -3
    const status = divergente ? 'Divergente' : aguardando ? 'Enviado' : 'Conferido'
    const conferido = status === 'Enviado' ? null : momento(d + 1, 9, 10 + Math.floor(r * 40))
    const nota = divergente ? 'Diferença de R$ 42,00 no PIX: falta o comprovante da tarde.' : null
    const reenvio = d === corrigido ? momento(d + 1, 8, 15) : null
    db.fechamentos.push({
      id, data, status, valor_total: valor, observacoes: d === corrigido ? 'Corrigido o valor do cartão de débito.' : null,
      enviado_por: quem, enviado_em: reenvio || envio, primeiro_envio_em: envio,
      conferido_por: conferido ? JOSE : null, conferido_em: conferido, nota_conferencia: nota, criado_em: envio, atualizado_em: conferido || reenvio || envio,
    })
    const anexo = (nome, quando, k) => db.anexos.push({ id: uid(), entidade: 'fechamentos', registro_id: id, nome, caminho: `demo:fechamento:${data}:${k}`,
      tamanho: 18000 + Math.floor(r2 * 24000) + k * 900, tipo: MIME_XLSX, criado_em: quando, criado_por: quem })
    anexo(`fechamento-${data}.xlsx`, envio, 0)
    db.historico.push({ id: db.historico.length + 1, entidade: 'fechamentos', registro_id: id, acao: 'Envio', descricao: `fechamento-${data}.xlsx`, criado_em: envio, por: quem })
    if (reenvio) {
      anexo(`fechamento-${data}-corrigido.xlsx`, reenvio, 1)
      db.historico.push({ id: db.historico.length + 1, entidade: 'fechamentos', registro_id: id, acao: 'Reenvio', descricao: `fechamento-${data}-corrigido.xlsx`, criado_em: reenvio, por: quem })
    }
    if (conferido) db.historico.push({ id: db.historico.length + 1, entidade: 'fechamentos', registro_id: id, acao: status, descricao: nota || data.split('-').reverse().join('/'), criado_em: conferido, por: JOSE })
  }
}

// Planilha fictícia de um fechamento da demonstração (abre de verdade no Excel).
function linhasDoFechamento(f, nomeResponsavel) {
  const total = Number(f.valor_total || 0)
  const partes = [['Dinheiro', 0.14], ['Cartão de débito', 0.21], ['Cartão de crédito', 0.33], ['PIX', 0.27], ['Vale-refeição', 0.05]]
  let acumulado = 0
  const linhas = partes.map(([nome, p], i) => {
    const sistema = i === partes.length - 1 ? centavos(total - acumulado) : centavos(total * p)
    acumulado = centavos(acumulado + sistema)
    const conferido = f.status === 'Divergente' && nome === 'PIX' ? centavos(sistema - 42) : sistema
    return [nome, { moeda: sistema }, { moeda: conferido }, { moeda: centavos(conferido - sistema) }]
  })
  const conferidoTotal = centavos(linhas.reduce((s, l) => s + l[2].moeda, 0))
  return [
    ['Forma de pagamento', 'Sistema', 'Conferido', 'Diferença'],
    ...linhas,
    ['Total', { moeda: total }, { moeda: conferidoTotal }, { moeda: centavos(conferidoTotal - total) }],
    [],
    ['Data', dataLocal(f.data)],
    ['Responsável', nomeResponsavel || 'Equipe'],
    ['Sangria', { moeda: centavos(total * 0.08) }],
  ]
}


function carregar() {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) return JSON.parse(salvo)
  } catch { /* sem armazenamento: começa do zero */ }
  return semear()
}

// Quem está "logado" na demonstração (o seletor "Ver como" troca e recarrega).
function usuarioDemo() {
  try { return sessionStorage.getItem(CHAVE_USUARIO) || JOSE } catch { return JOSE }
}

export function criarDemo() {
  let db = carregar()
  if (!db.funcionarios) semearOperacao(db) // demonstração salva antes da v4
  const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)) } catch { /* só em memória */ } }
  const agora = () => new Date().toISOString()
  const EU = db.equipe.some(m => m.id === usuarioDemo() && m.ativo) ? usuarioDemo() : JOSE
  const perfil = () => db.equipe.find(m => m.id === EU)?.perfil || 'admin'
  const exigir = condicao => { if (!condicao) throw new Error('Seu usuário não tem permissão para esta ação.') }
  const admin = () => perfil() === 'admin'
  const comercial = () => perfil() !== 'operacional'
  // Mesmo critério das políticas RLS (pode_acessar no banco).
  const pode = entidade => entidade === 'fechamentos' ? true : ['funcionarios', 'treinamentos', 'documentos'].includes(entidade) ? admin() : comercial()
  const log = (entidade, registro_id, acao, descricao) =>
    db.historico.push({ id: db.historico.length + 1, entidade, registro_id, acao, descricao, criado_em: agora(), por: EU })
  const status = (entidade, registro_id, de, para, motivo = null) =>
    db.statusHistorico.push({ id: db.statusHistorico.length + 1, entidade, registro_id, de, para, motivo, em: agora(), por: EU })
  const nomeDe = id => db.equipe.find(m => m.id === id)?.nome
  const fmtData = k => k.split('-').reverse().join('/')

  const salvarRegistro = (tabela, rotulo, nome, dados, id) => {
    const fmtVal = v => (v ? ` · válido até ${fmtData(v)}` : '')
    if (id) {
      const r = db[tabela].find(x => x.id === id)
      Object.assign(r, dados, { atualizado_em: agora() })
      log('funcionarios', r.funcionario_id, rotulo, `${nome} editado${fmtVal(r.validade)}`)
    } else {
      const r = { id: uid(), ...dados, criado_em: agora(), atualizado_em: agora(), criado_por: EU }
      db[tabela].push(r); id = r.id
      log('funcionarios', r.funcionario_id, rotulo, `${nome} registrado${fmtVal(r.validade)}`)
    }
    gravar(); return copia(db[tabela].find(x => x.id === id))
  }
  const excluirRegistro = (tabela, rotulo, nome, registro, anexos) => {
    const ids = new Set(anexos.map(a => a.id))
    db.anexos = db.anexos.filter(a => !ids.has(a.id))
    if (db.anexos.some(a => a.entidade === tabela && a.registro_id === registro.id)) throw new Error('Exclua os anexos antes de excluir este registro.')
    db[tabela] = db[tabela].filter(x => x.id !== registro.id)
    log('funcionarios', registro.funcionario_id, rotulo, `${nome} excluído`); gravar()
  }

  const mudarSolicitacao = (s, para, motivo) => {
    if (s.status === para) return
    status('solicitacoes', s.id, s.status, para, para === 'Cancelada' ? motivo : null)
    log('solicitacoes', s.id, 'Status', `${s.status} → ${para}`)
    s.status = para; s.status_desde = agora()
  }

  return {
    demo: true,
    async sessao() { return { user: { id: EU, email: db.equipe.find(m => m.id === EU)?.email } } },
    aoMudarSessao() { return () => {} },
    async entrar() {},
    async sair() {},
    async membro(id) { return copia(db.equipe.find(m => m.id === id && m.ativo) || null) },
    restaurar() { db = semear(); gravar() },
    usuarios() { return db.equipe.filter(m => m.ativo).map(({ id, nome, perfil: p }) => ({ id, nome, perfil: p })) },
    entrarComo(id) { try { sessionStorage.setItem(CHAVE_USUARIO, id) } catch { /* sem armazenamento */ } window.location.reload() },

    async carregarTudo() {
      await pausa()
      const { seq, fechamentoAjustes, ...resto } = db
      const c = comercial(), a = admin()
      return copia({
        ...resto,
        clientes: c ? resto.clientes : [], solicitacoes: c ? resto.solicitacoes : [], propostas: c ? resto.propostas : [],
        itens: c ? resto.itens : [], revisoes: c ? resto.revisoes : [], statusHistorico: c ? resto.statusHistorico : [],
        historico: resto.historico.filter(h => pode(h.entidade)), anexos: resto.anexos.filter(x => pode(x.entidade)),
        funcionarios: a ? resto.funcionarios : [], treinamentos: a ? resto.treinamentos : [], documentos: a ? resto.documentos : [],
        fechamentoAjustes, pendente04: false,
      })
    },

    async salvarCliente(dados, id) {
      await pausa()
      exigir(comercial())
      if (!String(dados.nome || '').trim()) throw new Error('Informe o nome do cliente.')
      if (id) {
        const c = db.clientes.find(x => x.id === id); Object.assign(c, dados, { atualizado_em: agora() })
        log('clientes', id, 'Edição', c.nome)
      } else {
        const c = { id: uid(), ...dados, criado_em: agora(), atualizado_em: agora(), criado_por: EU }
        db.clientes.push(c); log('clientes', c.id, 'Cadastro', c.nome); id = c.id
      }
      gravar(); return copia(db.clientes.find(x => x.id === id))
    },
    async excluirCliente(id) {
      await pausa()
      exigir(comercial())
      if (db.solicitacoes.some(s => s.cliente_id === id)) throw new Error('Não é possível excluir: existem registros vinculados a este.')
      db.clientes = db.clientes.filter(c => c.id !== id); gravar()
    },

    async salvarSolicitacao(dados, id) {
      await pausa()
      exigir(comercial())
      if (dados.status === 'Cancelada' && !String(dados.motivo_cancelamento || '').trim()) throw new Error('Informe o motivo do cancelamento.')
      if (id) {
        const s = db.solicitacoes.find(x => x.id === id)
        const para = dados.status
        Object.assign(s, { ...dados, status: s.status, motivo_cancelamento: para === 'Cancelada' ? dados.motivo_cancelamento : null, atualizado_em: agora() })
        if (para !== s.status) mudarSolicitacao(s, para, dados.motivo_cancelamento)
        else log('solicitacoes', id, 'Edição', s.titulo)
      } else {
        const s = { id: uid(), ...dados, status: dados.status || 'Aberta', status_desde: agora(), criado_em: agora(), atualizado_em: agora(), criado_por: EU }
        db.solicitacoes.push(s); status('solicitacoes', s.id, null, s.status); log('solicitacoes', s.id, 'Abertura', s.titulo); id = s.id
      }
      gravar(); return copia(db.solicitacoes.find(x => x.id === id))
    },

    async salvarProposta(p) {
      await pausa(200)
      exigir(comercial())
      const erros = validarProposta(p)
      if (erros.length) throw new Error(erros[0])
      const itens = p.itens.map((i, n) => ({ ordem: n + 1, descricao: i.descricao.trim(), quantidade: Number(i.quantidade), valor_unitario: centavos(i.valor_unitario) }))
      const sub = subtotal(itens)
      const desconto = centavos(p.desconto)
      const campos = {
        titulo: p.titulo.trim(), escopo: p.escopo || null, subtotal: sub, desconto, valor_total: centavos(sub - desconto),
        validade: p.validade || null, condicoes_pagamento: p.condicoes_pagamento || null, observacoes: p.observacoes || null,
      }
      let prop
      if (!p.id) {
        const s = db.solicitacoes.find(x => x.id === p.solicitacao_id)
        if (!s) throw new Error('Solicitação não encontrada.')
        if (!SOLICITACAO_ATIVA.includes(s.status)) throw new Error(`A solicitação está ${s.status === 'Concluida' ? 'concluída' : 'cancelada'}; reabra-a antes de criar uma proposta.`)
        db.seq += 1
        prop = { id: uid(), numero: `ZP-${String(db.seq).padStart(5, '0')}`, solicitacao_id: s.id, status: 'Rascunho', ...campos,
          motivo_encerramento: null, revisao_atual: 1, status_desde: agora(), enviada_em: null, decidida_em: null, criado_em: agora(), atualizado_em: agora(), criado_por: EU }
        db.propostas.push(prop)
        status('propostas', prop.id, null, 'Rascunho'); log('propostas', prop.id, 'Criação', `${prop.numero} · ${prop.titulo}`)
        if (s.status === 'Aberta' || s.status === 'Em analise') mudarSolicitacao(s, 'Em proposta')
      } else {
        prop = db.propostas.find(x => x.id === p.id)
        if (!prop) throw new Error('Proposta não encontrada.')
        if (!podeEditar(prop.status)) throw new Error(`A proposta ${prop.numero} está encerrada e não pode mais ser editada.`)
        Object.assign(prop, campos, { revisao_atual: prop.revisao_atual + 1, atualizado_em: agora() })
        db.itens = db.itens.filter(i => i.proposta_id !== prop.id)
        log('propostas', prop.id, `Revisão ${prop.revisao_atual}`, 'Itens e valores atualizados')
      }
      itens.forEach(i => db.itens.push({ id: uid(), proposta_id: prop.id, ...i }))
      db.revisoes.push({ id: uid(), proposta_id: prop.id, numero_revisao: prop.revisao_atual, criado_em: agora(), criado_por: EU,
        dados: { ...campos, status: prop.status }, itens: itens.map(({ ordem, ...i }) => i) })
      gravar()
      return { id: prop.id, numero: prop.numero, revisao: prop.revisao_atual, valor_total: prop.valor_total }
    },

    async mudarStatusProposta(id, para, motivo) {
      await pausa()
      exigir(comercial())
      const p = db.propostas.find(x => x.id === id)
      if (!transicaoValida(p.status, para)) throw new Error('Esta mudança de status não é permitida.')
      const m = String(motivo || '').trim()
      if (exigeMotivo(para) && !m) throw new Error('Informe o motivo.')
      status('propostas', id, p.status, para, exigeMotivo(para) ? m : null)
      log('propostas', id, 'Status', exigeMotivo(para) ? `${para}: ${m}` : para)
      Object.assign(p, { status: para, status_desde: agora(), atualizado_em: agora() })
      if (para === 'Enviada' && !p.enviada_em) p.enviada_em = agora()
      if (['Aprovada', 'Recusada', 'Cancelada'].includes(para)) p.decidida_em = agora()
      if (exigeMotivo(para)) p.motivo_encerramento = m
      if (para === 'Aprovada') {
        const s = db.solicitacoes.find(x => x.id === p.solicitacao_id)
        if (s && !['Concluida', 'Cancelada'].includes(s.status)) mudarSolicitacao(s, 'Concluida')
      }
      gravar(); return { id, status: para }
    },

    async salvarMembro(dados, id) {
      await pausa()
      exigir(admin())
      if (id) {
        const m = db.equipe.find(x => x.id === id)
        if (id === EU && (dados.perfil !== 'admin' || !dados.ativo)) throw new Error('Não é possível remover o seu próprio acesso de administrador.')
        Object.assign(m, dados)
      } else {
        if (!dados.id) throw new Error('Informe o UUID do usuário.')
        if (db.equipe.some(m => m.id === dados.id)) throw new Error('Este usuário já faz parte da equipe.')
        db.equipe.push({ ...dados, criado_em: agora() })
      }
      gravar()
    },

    // Na demonstração o arquivo fica só nesta aba do navegador.
    async enviarAnexo(arquivo, entidade, registroId) {
      await pausa()
      exigir(pode(entidade) && (entidade !== 'fechamentos' || admin()))
      if (arquivo.size > 10 * 1024 * 1024) throw new Error('O arquivo passa de 10 MB.')
      const a = { id: uid(), entidade, registro_id: registroId, nome: arquivo.name, caminho: URL.createObjectURL(arquivo), tamanho: arquivo.size, tipo: arquivo.type, criado_em: agora(), criado_por: EU }
      db.anexos.push(a); gravar()
    },
    async baixarAnexo(a) {
      if (a.caminho.startsWith('blob:')) { window.open(a.caminho, '_blank', 'noopener'); return }
      const f = a.caminho.startsWith('demo:fechamento:') && db.fechamentos.find(x => x.id === a.registro_id)
      if (!f) throw new Error('Na demonstração, este arquivo é fictício: só os arquivos enviados nesta aba podem ser abertos.')
      const { gerarXlsx } = await import('./planilha.js')
      const url = URL.createObjectURL(new Blob([gerarXlsx([{ nome: 'Fechamento', linhas: linhasDoFechamento(f, nomeDe(f.enviado_por)) }])], { type: MIME_XLSX }))
      const link = document.createElement('a'); link.href = url; link.download = a.nome; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    },
    async excluirAnexo(a) {
      exigir(pode(a.entidade) && (a.entidade !== 'fechamentos' || admin()))
      db.anexos = db.anexos.filter(x => x.id !== a.id); gravar()
    },
    async lerPlanilha(a) {
      await pausa(260)
      const { lerPlanilha, gerarXlsx } = await import('./planilha.js')
      if (a.caminho.startsWith('blob:')) {
        const resposta = await fetch(a.caminho).catch(() => null)
        if (!resposta) throw new Error('Na demonstração, o arquivo só fica disponível na aba em que foi enviado.')
        return lerPlanilha(await resposta.blob(), a.nome)
      }
      const f = db.fechamentos.find(x => x.id === a.registro_id)
      if (!f) throw new Error('Prévia indisponível para este arquivo fictício.')
      return lerPlanilha(gerarXlsx([{ nome: 'Fechamento', linhas: linhasDoFechamento(f, nomeDe(f.enviado_por)) }]), a.nome)
    },

    // ---------------------------------------------------------------- pessoas (só administrador)
    async salvarFuncionario(dados, id) {
      await pausa()
      exigir(admin())
      if (!String(dados.nome || '').trim()) throw new Error('Informe o nome do funcionário.')
      if (id) {
        const f = db.funcionarios.find(x => x.id === id)
        const antes = f.situacao
        Object.assign(f, dados, { atualizado_em: agora() })
        log('funcionarios', id, antes !== f.situacao ? 'Situação' : 'Edição', antes !== f.situacao ? `${antes} → ${f.situacao}` : f.nome)
      } else {
        const f = { id: uid(), situacao: 'Ativo', ...dados, criado_em: agora(), atualizado_em: agora(), criado_por: EU }
        db.funcionarios.push(f); log('funcionarios', f.id, 'Cadastro', f.nome); id = f.id
      }
      db.funcionarios.sort((a, b) => a.nome.localeCompare(b.nome))
      gravar(); return copia(db.funcionarios.find(x => x.id === id))
    },
    async excluirFuncionario(id) {
      await pausa()
      exigir(admin())
      if (db.treinamentos.some(t => t.funcionario_id === id) || db.documentos.some(d => d.funcionario_id === id)) throw new Error('Não é possível excluir: existem registros vinculados a este.')
      if (db.anexos.some(a => a.entidade === 'funcionarios' && a.registro_id === id)) throw new Error('Exclua os anexos antes de excluir este registro.')
      const f = db.funcionarios.find(x => x.id === id)
      db.funcionarios = db.funcionarios.filter(x => x.id !== id); log('funcionarios', id, 'Exclusão', f?.nome); gravar()
    },
    async salvarTreinamento(dados, id) {
      await pausa()
      exigir(admin())
      if (!String(dados.nome || '').trim()) throw new Error('Informe o nome do treinamento.')
      if (!dados.realizado_em) throw new Error('Informe a data em que o treinamento foi feito.')
      if (dados.validade && dados.validade < dados.realizado_em) throw new Error('A validade precisa ser igual ou posterior à data do treinamento.')
      if (dados.carga_horaria != null && !(Number(dados.carga_horaria) > 0)) throw new Error('A carga horária precisa ser maior que zero.')
      return salvarRegistro('treinamentos', 'Treinamento', dados.nome, dados, id)
    },
    async excluirTreinamento(registro, anexos = []) {
      await pausa(); exigir(admin())
      return excluirRegistro('treinamentos', 'Treinamento', registro.nome, registro, anexos)
    },
    async salvarDocumento(dados, id) {
      await pausa()
      exigir(admin())
      if (!String(dados.tipo || '').trim()) throw new Error('Informe o tipo do documento.')
      if (dados.validade && dados.emitido_em && dados.validade < dados.emitido_em) throw new Error('A validade precisa ser igual ou posterior à data de emissão.')
      return salvarRegistro('documentos', 'Documento', dados.tipo, dados, id)
    },
    async excluirDocumento(registro, anexos = []) {
      await pausa(); exigir(admin())
      return excluirRegistro('documentos', 'Documento', registro.tipo, registro, anexos)
    },

    // ---------------------------------------------------------------- fechamentos
    async enviarFechamento({ id, data, valor_total, observacoes }, arquivo) {
      await pausa(320)
      if (!data) throw new Error('Informe a data do fechamento.')
      if (data > somarDias(chaveDia(), 1)) throw new Error('Não é possível enviar o fechamento de um dia que ainda não chegou.')
      if (valor_total != null && Number(valor_total) < 0) throw new Error('O total do dia não pode ser negativo.')
      if (arquivo) {
        if (!ehPlanilha(arquivo.name)) throw new Error(`Envie a planilha do fechamento (${EXTENSOES_PLANILHA.map(e => `.${e}`).join(', ')}).`)
        if (arquivo.size > 10 * 1024 * 1024) throw new Error('O arquivo passa de 10 MB.')
      }
      let f = db.fechamentos.find(x => x.data === data)
      const valor = valor_total == null || valor_total === '' ? null : centavos(valor_total)
      const obs = String(observacoes || '').trim() || null
      if (f) {
        if (f.status === 'Conferido' && !admin()) throw new Error(`O fechamento de ${fmtData(data)} já foi conferido. Peça a um administrador para reabrir.`)
        if (f.status === 'Sem expediente' && !admin()) throw new Error(`O dia ${fmtData(data)} está marcado como sem expediente.`)
        Object.assign(f, { status: 'Enviado', valor_total: valor, observacoes: obs, enviado_por: EU, enviado_em: agora(), conferido_por: null, conferido_em: null, nota_conferencia: null, atualizado_em: agora() })
      } else {
        if (!arquivo) throw new Error('Anexe a planilha do fechamento.')
        f = { id: id || uid(), data, status: 'Enviado', valor_total: valor, observacoes: obs, enviado_por: EU, enviado_em: agora(), primeiro_envio_em: agora(),
          conferido_por: null, conferido_em: null, nota_conferencia: null, criado_em: agora(), atualizado_em: agora() }
        db.fechamentos.push(f)
      }
      const reenvio = db.historico.some(h => h.entidade === 'fechamentos' && h.registro_id === f.id && h.acao === 'Envio')
      if (arquivo) db.anexos.push({ id: uid(), entidade: 'fechamentos', registro_id: f.id, nome: arquivo.name, caminho: URL.createObjectURL(arquivo), tamanho: arquivo.size, tipo: arquivo.type || MIME_XLSX, criado_em: agora(), criado_por: EU })
      log('fechamentos', f.id, reenvio ? 'Reenvio' : 'Envio', arquivo?.name || 'Dados atualizados')
      gravar()
      return { id: f.id, status: f.status, reenvio }
    },
    async conferirFechamento(id, para, nota) {
      await pausa()
      exigir(admin())
      const f = db.fechamentos.find(x => x.id === id)
      if (f.status === 'Sem expediente') throw new Error('Dia sem expediente não tem fechamento para conferir.')
      const n = String(nota || '').trim()
      if (para === 'Divergente' && !n) throw new Error('Descreva a divergência encontrada.')
      Object.assign(f, { status: para, nota_conferencia: n || null, conferido_por: EU, conferido_em: agora(), atualizado_em: agora() })
      log('fechamentos', id, para, para === 'Divergente' ? n : fmtData(f.data))
      gravar(); return copia(f)
    },
    async marcarSemExpediente(data, motivo) {
      await pausa()
      exigir(admin())
      const m = String(motivo || '').trim()
      if (!m) throw new Error('Informe o motivo do dia sem expediente.')
      if (db.fechamentos.some(x => x.data === data)) throw new Error('Já existe um fechamento para este dia. Atualize a página e tente de novo.')
      const f = { id: uid(), data, status: 'Sem expediente', valor_total: null, observacoes: m, enviado_por: EU, enviado_em: agora(), primeiro_envio_em: agora(),
        conferido_por: null, conferido_em: null, nota_conferencia: null, criado_em: agora(), atualizado_em: agora() }
      db.fechamentos.push(f); log('fechamentos', f.id, 'Sem expediente', m); gravar(); return copia(f)
    },
    async excluirFechamento(registro, anexos = []) {
      await pausa()
      exigir(admin())
      const ids = new Set(anexos.map(a => a.id))
      db.anexos = db.anexos.filter(a => !ids.has(a.id))
      if (db.anexos.some(a => a.entidade === 'fechamentos' && a.registro_id === registro.id)) throw new Error('Exclua os anexos antes de excluir este registro.')
      db.fechamentos = db.fechamentos.filter(x => x.id !== registro.id)
      log('fechamentos', registro.id, 'Exclusão', fmtData(registro.data)); gravar()
    },
    async salvarAjustesFechamento(dados) {
      await pausa()
      exigir(admin())
      const dias = [...new Set((dados.dias_semana || []).map(Number))].filter(d => d >= 0 && d <= 6).sort()
      if (!dias.length) throw new Error('Escolha ao menos um dia da semana com fechamento.')
      Object.assign(db.fechamentoAjustes, { ...dados, dias_semana: dias, atualizado_em: agora(), atualizado_por: EU })
      gravar(); return copia(db.fechamentoAjustes)
    },
  }
}
