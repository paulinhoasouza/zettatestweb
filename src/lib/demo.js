// Banco de demonstração: roda o app sem Supabase (endereço com ?demo).
// Segue as mesmas regras do banco real e guarda as alterações só neste navegador.
// Os clientes e valores abaixo são FICTÍCIOS, criados para demonstrar o fluxo.
import {
  validarProposta, transicaoValida, exigeMotivo, podeEditar, subtotal, centavos, SOLICITACAO_ATIVA,
} from './business.js'

const CHAVE = 'zetta-propostas-demo-v3'
const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}${Date.now()}`)
const copia = o => JSON.parse(JSON.stringify(o))
const pausa = (ms = 120) => new Promise(r => setTimeout(r, ms))

const JOSE = 'demo-jose'
const MARINA = 'demo-marina'

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
  return db
}

function carregar() {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) return JSON.parse(salvo)
  } catch { /* sem armazenamento: começa do zero */ }
  return semear()
}

export function criarDemo() {
  let db = carregar()
  const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)) } catch { /* só em memória */ } }
  const agora = () => new Date().toISOString()
  const log = (entidade, registro_id, acao, descricao) =>
    db.historico.push({ id: db.historico.length + 1, entidade, registro_id, acao, descricao, criado_em: agora(), por: JOSE })
  const status = (entidade, registro_id, de, para, motivo = null) =>
    db.statusHistorico.push({ id: db.statusHistorico.length + 1, entidade, registro_id, de, para, motivo, em: agora(), por: JOSE })

  const mudarSolicitacao = (s, para, motivo) => {
    if (s.status === para) return
    status('solicitacoes', s.id, s.status, para, para === 'Cancelada' ? motivo : null)
    log('solicitacoes', s.id, 'Status', `${s.status} → ${para}`)
    s.status = para; s.status_desde = agora()
  }

  return {
    demo: true,
    async sessao() { return { user: { id: JOSE, email: 'jose@zetta.exemplo' } } },
    aoMudarSessao() { return () => {} },
    async entrar() {},
    async sair() {},
    async membro(id) { return copia(db.equipe.find(m => m.id === id && m.ativo) || null) },
    restaurar() { db = semear(); gravar() },

    async carregarTudo() {
      await pausa()
      const { seq, ...resto } = db
      return copia(resto)
    },

    async salvarCliente(dados, id) {
      await pausa()
      if (!String(dados.nome || '').trim()) throw new Error('Informe o nome do cliente.')
      if (id) {
        const c = db.clientes.find(x => x.id === id); Object.assign(c, dados, { atualizado_em: agora() })
        log('clientes', id, 'Edição', c.nome)
      } else {
        const c = { id: uid(), ...dados, criado_em: agora(), atualizado_em: agora(), criado_por: JOSE }
        db.clientes.push(c); log('clientes', c.id, 'Cadastro', c.nome); id = c.id
      }
      gravar(); return copia(db.clientes.find(x => x.id === id))
    },
    async excluirCliente(id) {
      await pausa()
      if (db.solicitacoes.some(s => s.cliente_id === id)) throw new Error('Não é possível excluir: existem registros vinculados a este.')
      db.clientes = db.clientes.filter(c => c.id !== id); gravar()
    },

    async salvarSolicitacao(dados, id) {
      await pausa()
      if (dados.status === 'Cancelada' && !String(dados.motivo_cancelamento || '').trim()) throw new Error('Informe o motivo do cancelamento.')
      if (id) {
        const s = db.solicitacoes.find(x => x.id === id)
        const para = dados.status
        Object.assign(s, { ...dados, status: s.status, motivo_cancelamento: para === 'Cancelada' ? dados.motivo_cancelamento : null, atualizado_em: agora() })
        if (para !== s.status) mudarSolicitacao(s, para, dados.motivo_cancelamento)
        else log('solicitacoes', id, 'Edição', s.titulo)
      } else {
        const s = { id: uid(), ...dados, status: dados.status || 'Aberta', status_desde: agora(), criado_em: agora(), atualizado_em: agora(), criado_por: JOSE }
        db.solicitacoes.push(s); status('solicitacoes', s.id, null, s.status); log('solicitacoes', s.id, 'Abertura', s.titulo); id = s.id
      }
      gravar(); return copia(db.solicitacoes.find(x => x.id === id))
    },

    async salvarProposta(p) {
      await pausa(200)
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
          motivo_encerramento: null, revisao_atual: 1, status_desde: agora(), enviada_em: null, decidida_em: null, criado_em: agora(), atualizado_em: agora(), criado_por: JOSE }
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
      db.revisoes.push({ id: uid(), proposta_id: prop.id, numero_revisao: prop.revisao_atual, criado_em: agora(), criado_por: JOSE,
        dados: { ...campos, status: prop.status }, itens: itens.map(({ ordem, ...i }) => i) })
      gravar()
      return { id: prop.id, numero: prop.numero, revisao: prop.revisao_atual, valor_total: prop.valor_total }
    },

    async mudarStatusProposta(id, para, motivo) {
      await pausa()
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
      if (id) {
        const m = db.equipe.find(x => x.id === id)
        if (id === JOSE && (dados.perfil !== 'admin' || !dados.ativo)) throw new Error('Não é possível remover o seu próprio acesso de administrador.')
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
      if (arquivo.size > 10 * 1024 * 1024) throw new Error('O arquivo passa de 10 MB.')
      const a = { id: uid(), entidade, registro_id: registroId, nome: arquivo.name, caminho: URL.createObjectURL(arquivo), tamanho: arquivo.size, tipo: arquivo.type, criado_em: agora(), criado_por: JOSE }
      db.anexos.push(a); gravar()
    },
    async baixarAnexo(a) {
      if (a.caminho.startsWith('blob:')) window.open(a.caminho, '_blank', 'noopener')
      else throw new Error('Na demonstração, o arquivo só fica disponível na aba em que foi enviado.')
    },
    async excluirAnexo(a) { db.anexos = db.anexos.filter(x => x.id !== a.id); gravar() },
  }
}
