// Regras de negócio puras (sem tela, sem banco). Testadas em tests/business.test.js.
// As mesmas regras existem no banco (supabase/01_estrutura.sql); aqui servem para
// a tela avisar antes de enviar e para o modo demonstração.

export const STATUS_PROPOSTA = ['Rascunho', 'Enviada', 'Em negociacao', 'Aprovada', 'Recusada', 'Cancelada']
export const STATUS_EM_ABERTO = ['Rascunho', 'Enviada', 'Em negociacao']
export const STATUS_COM_CLIENTE = ['Enviada', 'Em negociacao']
export const STATUS_FINAIS = ['Aprovada', 'Recusada', 'Cancelada']
export const STATUS_SOLICITACAO = ['Aberta', 'Em analise', 'Em proposta', 'Concluida', 'Cancelada']
export const SOLICITACAO_ATIVA = ['Aberta', 'Em analise', 'Em proposta']
export const PRIORIDADES = ['Baixa', 'Media', 'Alta', 'Critica']

const ROTULOS = {
  'Em analise': 'Em análise', 'Concluida': 'Concluída', 'Em negociacao': 'Em negociação',
  'Media': 'Média', 'Critica': 'Crítica',
}
export const rotulo = v => ROTULOS[v] || v

// Transições permitidas — espelho de transicao_proposta_valida() no banco.
export const TRANSICOES = {
  'Rascunho': ['Enviada', 'Cancelada'],
  'Enviada': ['Em negociacao', 'Aprovada', 'Recusada', 'Cancelada'],
  'Em negociacao': ['Enviada', 'Aprovada', 'Recusada', 'Cancelada'],
  'Aprovada': [], 'Recusada': [], 'Cancelada': [],
}
export const proximosStatus = status => TRANSICOES[status] || []
export const transicaoValida = (de, para) => proximosStatus(de).includes(para)
export const exigeMotivo = para => para === 'Recusada' || para === 'Cancelada'
export const podeEditar = status => STATUS_EM_ABERTO.includes(status)

// Itens vigentes de uma proposta: os da revisão atual (as anteriores ficam guardadas no banco).
export const itensDaProposta = (itens, proposta) => (itens || [])
  .filter(i => i.proposta_id === proposta.id && (i.revisao == null || i.revisao === proposta.revisao_atual))
  .sort((a, b) => a.ordem - b.ordem)

// Dinheiro: cada linha é arredondada a centavos antes de somar, como no documento.
export const centavos = n => Math.round((Number(n) || 0) * 100) / 100
export const totalLinha = item => centavos(Number(item.quantidade || 0) * Number(item.valor_unitario || 0))
export const subtotal = itens => centavos((itens || []).reduce((s, i) => s + totalLinha(i), 0))
export const total = (itens, desconto) => centavos(subtotal(itens) - centavos(desconto))

// Lista de problemas que impedem salvar; vazia quando está tudo certo.
export function validarProposta(p) {
  const erros = []
  if (!p.id && !p.solicitacao_id) erros.push('Escolha a solicitação desta proposta.')
  if (!String(p.titulo || '').trim()) erros.push('Informe o título da proposta.')
  const itens = p.itens || []
  if (!itens.length) erros.push('Adicione ao menos um item.')
  itens.forEach((i, n) => {
    const nome = String(i.descricao || '').trim()
    if (!nome) erros.push(`O item ${n + 1} está sem descrição.`)
    if (!(Number(i.quantidade) > 0)) erros.push(`A quantidade de "${nome || `item ${n + 1}`}" precisa ser maior que zero.`)
    if (!(Number(i.valor_unitario) >= 0) || i.valor_unitario === '') erros.push(`O valor unitário de "${nome || `item ${n + 1}`}" é inválido.`)
  })
  const desc = Number(p.desconto || 0)
  if (desc < 0) erros.push('O desconto não pode ser negativo.')
  else if (itens.length && desc > subtotal(itens)) erros.push('O desconto não pode superar o subtotal.')
  return erros
}

// Aprovadas sobre decididas (aprovadas + recusadas). Sem decisões, não há taxa.
export function taxaConversao(aprovadas, decididas) {
  if (!decididas) return null
  return Math.round((aprovadas / decididas) * 1000) / 10
}

const DIA = 86400000
export const inicioDoDia = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
export const diasEntre = (a, b) => Math.round((inicioDoDia(b) - inicioDoDia(a)) / DIA)
export const diasDesde = (data, agora = new Date()) => diasEntre(new Date(data), agora)
export const dataLocal = s => (s && s.length === 10 ? new Date(`${s}T12:00:00`) : new Date(s))

// Duração (em dias, fracionados) que um registro passou em cada status, a partir do histórico.
export function tempoPorEtapa(eventos, agora = new Date()) {
  const ordenados = [...eventos].sort((a, b) => new Date(a.em) - new Date(b.em))
  const tempos = []
  ordenados.forEach((e, i) => {
    const fim = ordenados[i + 1] ? new Date(ordenados[i + 1].em) : agora
    tempos.push({ status: e.para, inicio: e.em, fim: ordenados[i + 1]?.em || null, dias: (fim - new Date(e.em)) / DIA, motivo: e.motivo })
  })
  return tempos
}

export function mediana(valores) {
  const v = valores.filter(x => Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

// Itens que pedem ação hoje, do mais urgente ao menos urgente.
// Regras: validade vencida ou vencendo em até 7 dias (com o cliente);
// sem resposta há 7 dias ou mais (enviada); rascunho parado há 5 dias ou mais;
// solicitação ativa com prazo vencido.
export function precisaAcao({ propostas, solicitacoes }, agora = new Date()) {
  const itens = []
  for (const p of propostas) {
    const naEtapa = diasDesde(p.status_desde, agora)
    if (STATUS_COM_CLIENTE.includes(p.status) && p.validade) {
      const faltam = diasEntre(agora, dataLocal(p.validade))
      if (faltam < 0) { itens.push({ tipo: 'proposta', id: p.id, peso: 0 + faltam, motivo: 'validade', dias: -faltam, registro: p }); continue }
      if (faltam <= 7) { itens.push({ tipo: 'proposta', id: p.id, peso: 10 + faltam, motivo: 'vence', dias: faltam, registro: p }); continue }
    }
    if (p.status === 'Enviada' && naEtapa >= 7) itens.push({ tipo: 'proposta', id: p.id, peso: 30 - naEtapa, motivo: 'sem-resposta', dias: naEtapa, registro: p })
    else if (p.status === 'Rascunho' && naEtapa >= 5) itens.push({ tipo: 'proposta', id: p.id, peso: 50 - naEtapa, motivo: 'rascunho-parado', dias: naEtapa, registro: p })
  }
  for (const s of solicitacoes) {
    if (!SOLICITACAO_ATIVA.includes(s.status) || !s.prazo) continue
    const atraso = diasEntre(dataLocal(s.prazo), agora)
    if (atraso > 0) itens.push({ tipo: 'solicitacao', id: s.id, peso: 20 - atraso, motivo: 'prazo', dias: atraso, registro: s })
  }
  return itens.sort((a, b) => a.peso - b.peso)
}

// Soma por mês (chave AAAA-MM) dos últimos `meses` meses, terminando no mês de `agora`.
export function porMes(registros, campoData, campoValor, meses, agora = new Date()) {
  const chaves = []
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const soma = Object.fromEntries(chaves.map(k => [k, 0]))
  for (const r of registros) {
    if (!r[campoData]) continue
    const d = new Date(r[campoData])
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (k in soma) soma[k] = centavos(soma[k] + Number(r[campoValor] || 0))
  }
  return chaves.map(k => ({ mes: k, valor: soma[k] }))
}

// Exportação CSV segura para Excel (protege contra fórmulas injetadas).
export function paraCsv(colunas, linhas) {
  const seguro = v => {
    const s = String(v ?? '')
    return /^[=+@\-\t\r]/.test(s) ? `'${s}` : s
  }
  return [colunas, ...linhas].map(l => l.map(c => `"${seguro(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
}

// =============================================================================
// v4 — perfis, pessoas (vencimentos), fechamentos e métricas do relatório
// =============================================================================

// ---------------------------------------------------------------- perfis
// Espelho das regras RLS (supabase/04_pessoas_fechamentos.sql): o banco é quem
// garante; aqui a tela só esconde o que o perfil não pode abrir.
export const PERFIS = {
  admin: { rotulo: 'Administrador', descricao: 'Tudo, inclusive pessoas, conferência dos fechamentos e acessos.' },
  comercial: { rotulo: 'Comercial', descricao: 'Clientes, solicitações, propostas, relatórios e envio de fechamentos.' },
  operacional: { rotulo: 'Operacional', descricao: 'Só envia e acompanha os fechamentos do dia.' },
}
const TELAS = {
  admin: ['visao-geral', 'propostas', 'solicitacoes', 'clientes', 'relatorios', 'pessoas', 'fechamentos', 'equipe'],
  comercial: ['visao-geral', 'propostas', 'solicitacoes', 'clientes', 'relatorios', 'fechamentos', 'equipe'],
  operacional: ['fechamentos'],
}
export const podeVerTela = (perfil, tela) => (TELAS[perfil] || TELAS.comercial).includes(tela)
export const telaInicial = perfil => (perfil === 'operacional' ? 'fechamentos' : 'visao-geral')
export const rotuloPerfil = perfil => PERFIS[perfil]?.rotulo || 'Comercial'

// ---------------------------------------------------------------- datas locais
const doisDigitos = n => String(n).padStart(2, '0')
// Chave do dia no fuso do navegador: AAAA-MM-DD.
export const chaveDia = (d = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${doisDigitos(x.getMonth() + 1)}-${doisDigitos(x.getDate())}` }
export const somarDias = (chave, n) => { const d = dataLocal(chave); d.setDate(d.getDate() + n); return chaveDia(d) }
export const somarMeses = (chave, n) => {
  const d = dataLocal(chave)
  const dia = d.getDate()
  d.setDate(1); d.setMonth(d.getMonth() + n)
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(dia, ultimo))
  return chaveDia(d)
}
export function diasNoIntervalo(de, ate) {
  const dias = []
  for (let k = de; k <= ate; k = somarDias(k, 1)) dias.push(k)
  return dias
}
// Semanas do mês (domingo a sábado), com null nos dias de fora do mês.
export function gradeDoMes(ano, mes) {
  const primeiro = new Date(ano, mes, 1, 12)
  const total = new Date(ano, mes + 1, 0).getDate()
  const celulas = Array(primeiro.getDay()).fill(null)
  for (let d = 1; d <= total; d++) celulas.push(chaveDia(new Date(ano, mes, d, 12)))
  while (celulas.length % 7) celulas.push(null)
  const semanas = []
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7))
  return semanas
}

// ---------------------------------------------------------------- pessoas
export const SITUACOES_FUNCIONARIO = ['Ativo', 'Afastado', 'Desligado']
export const JANELA_AVISO = 30 // dias antes do vencimento em que o item passa a pedir atenção

// Situação de uma validade. "Vale até hoje" ainda vale: vence hoje.
export function situacaoValidade(validade, agora = new Date(), janela = JANELA_AVISO) {
  if (!validade) return { codigo: 'sem-validade', dias: null }
  const dias = diasEntre(agora, dataLocal(validade))
  if (dias < 0) return { codigo: 'vencido', dias }
  if (dias <= janela) return { codigo: 'vence', dias }
  return { codigo: 'em-dia', dias }
}

const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')

// Renovar um treinamento é registrar outro com o mesmo nome. Vale o mais recente
// de cada pessoa + nome; os anteriores ficam no histórico como "renovado".
export function idsVigentes(registros, campoNome, campoData) {
  const melhor = new Map()
  const chaveOrdem = r => [r[campoData] || '', r.validade || '', r.criado_em || '']
  for (const r of registros || []) {
    const k = `${r.funcionario_id}|${semAcento(r[campoNome])}`
    const atual = melhor.get(k)
    if (!atual) { melhor.set(k, r); continue }
    const a = chaveOrdem(r), b = chaveOrdem(atual)
    const i = a.findIndex((v, n) => v !== b[n])
    if (i >= 0 && a[i] > b[i]) melhor.set(k, r)
  }
  return new Set([...melhor.values()].map(r => r.id))
}

const ORDEM_SITUACAO = { vencido: 0, vence: 1, 'em-dia': 2, 'sem-validade': 3 }

// Vencimentos da equipe: treinamentos e documentos vigentes de quem não está
// desligado, do mais urgente ao mais tranquilo.
export function vencimentos({ funcionarios = [], treinamentos = [], documentos = [] }, agora = new Date(), janela = JANELA_AVISO) {
  const pessoas = new Map(funcionarios.map(f => [f.id, f]))
  const vt = idsVigentes(treinamentos, 'nome', 'realizado_em')
  const vd = idsVigentes(documentos, 'tipo', 'emitido_em')
  const itens = []
  const incluir = (categoria, r, nome, vigente) => {
    const f = pessoas.get(r.funcionario_id)
    if (!f || f.situacao === 'Desligado' || !vigente) return
    itens.push({ categoria, id: r.id, nome, funcionario: f, validade: r.validade || null, registro: r, ...situacaoValidade(r.validade, agora, janela) })
  }
  treinamentos.forEach(t => incluir('treinamento', t, t.nome, vt.has(t.id)))
  documentos.forEach(d => incluir('documento', d, d.tipo, vd.has(d.id)))
  return itens.sort((a, b) => ORDEM_SITUACAO[a.codigo] - ORDEM_SITUACAO[b.codigo]
    || (a.dias ?? Infinity) - (b.dias ?? Infinity) || a.nome.localeCompare(b.nome))
}

// A pior situação entre os itens de uma pessoa define a dela.
export function situacaoPessoa(itens) {
  const vencidos = itens.filter(i => i.codigo === 'vencido').length
  const vencendo = itens.filter(i => i.codigo === 'vence').length
  const codigo = !itens.length ? 'sem-registros' : vencidos ? 'vencido' : vencendo ? 'vence' : 'em-dia'
  return { codigo, vencidos, vencendo, total: itens.length }
}

// Sugestões para os formulários. A validade sugerida é só um ponto de partida:
// confira a exigência da norma e do programa da empresa.
export const SUGESTOES_TREINAMENTO = [
  { nome: 'NR-35 Trabalho em altura', meses: 24 },
  { nome: 'NR-10 Segurança em eletricidade', meses: 24 },
  { nome: 'NR-33 Espaço confinado', meses: 12 },
  { nome: 'NR-06 Uso de EPI' },
  { nome: 'NR-11 Operação de empilhadeira' },
  { nome: 'NR-12 Máquinas e equipamentos' },
  { nome: 'NR-05 CIPA' },
  { nome: 'NR-20 Inflamáveis e combustíveis' },
  { nome: 'Brigada de incêndio', meses: 12 },
  { nome: 'Primeiros socorros' },
  { nome: 'Direção defensiva' },
  { nome: 'Boas práticas de manipulação de alimentos' },
]
export const SUGESTOES_DOCUMENTO = [
  { nome: 'ASO admissional' }, { nome: 'ASO periódico', meses: 12 }, { nome: 'CNH' }, { nome: 'Contrato de experiência' },
  { nome: 'Contrato de trabalho' }, { nome: 'Exame toxicológico' }, { nome: 'Ficha de EPI' }, { nome: 'Carteira de vacinação' },
  { nome: 'RG' }, { nome: 'CPF' }, { nome: 'Comprovante de residência' }, { nome: 'Certificado de reservista' },
]
export function validadeSugerida(lista, nome, data) {
  const s = lista.find(x => semAcento(x.nome) === semAcento(nome))
  return s?.meses && data ? somarMeses(data, s.meses) : ''
}

// ---------------------------------------------------------------- fechamentos
export const STATUS_FECHAMENTO = ['Enviado', 'Conferido', 'Divergente', 'Sem expediente']
export const AJUSTES_FECHAMENTO = { inicio: null, dias_semana: [1, 2, 3, 4, 5, 6], horario_limite: '20:00', prazo_dia_seguinte: false }
export const EXTENSOES_PLANILHA = ['xlsx', 'xlsm', 'xls', 'csv', 'ods']
export const extensao = nome => (String(nome || '').toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || ''
export const ehPlanilha = nome => EXTENSOES_PLANILHA.includes(extensao(nome))

const ajustesCompletos = a => ({ ...AJUSTES_FECHAMENTO, ...(a || {}), dias_semana: (a?.dias_semana?.length ? a.dias_semana : AJUSTES_FECHAMENTO.dias_semana).map(Number) })
export const diaComFechamento = (chave, ajustes) => ajustesCompletos(ajustes).dias_semana.includes(dataLocal(chave).getDay())

// Fim do prazo de envio do fechamento de um dia.
export function prazoDoDia(chave, ajustes) {
  const a = ajustesCompletos(ajustes)
  const [h, m] = String(a.horario_limite || '20:00').split(':').map(Number)
  const d = dataLocal(chave)
  d.setHours(h || 0, m || 0, 0, 0)
  if (a.prazo_dia_seguinte) d.setDate(d.getDate() + 1)
  return d
}
export const enviadoNoPrazo = (f, ajustes) => new Date(f.primeiro_envio_em || f.enviado_em) <= prazoDoDia(f.data, ajustes)

const STATUS_PARA_SITUACAO = { Enviado: 'enviado', Conferido: 'conferido', Divergente: 'divergente', 'Sem expediente': 'sem-expediente' }

// Situação de um dia no calendário. Com registro: o status dele. Sem registro:
// futuro, antes (anterior ao início do controle), livre (dia sem fechamento),
// pendente (ainda no prazo) ou atrasado (o prazo passou).
export function situacaoDia(chave, fechamento, ajustes, agora = new Date()) {
  if (fechamento) return STATUS_PARA_SITUACAO[fechamento.status] || 'enviado'
  const a = ajustesCompletos(ajustes)
  if (chave > chaveDia(agora)) return 'futuro'
  if (a.inicio && chave < a.inicio) return 'antes'
  if (!diaComFechamento(chave, a)) return 'livre'
  return agora <= prazoDoDia(chave, a) ? 'pendente' : 'atrasado'
}

// Minutos desde o início do dia do fechamento até o primeiro envio (pode passar de 24 h).
export const minutosDoEnvio = f => Math.round((new Date(f.primeiro_envio_em || f.enviado_em) - dataLocal(f.data).setHours(0, 0, 0, 0)) / 60000)

// Números de um período (chaves AAAA-MM-DD, inclusive; o que passa de hoje não conta).
export function resumoFechamentos(fechamentos, ajustes, de, ate, agora = new Date()) {
  const porData = new Map((fechamentos || []).map(f => [f.data, f]))
  const hoje = chaveDia(agora)
  const fim = ate > hoje ? hoje : ate
  const r = { enviados: 0, conferidos: 0, aguardando: 0, divergentes: 0, atrasados: 0, pendentes: 0, semExpediente: 0, noPrazo: 0, total: 0, comValor: 0, diasAtrasados: [], minutos: [] }
  if (de > fim) return { ...r, cobertura: null, pontualidade: null, horarioMediano: null, mediaPorDia: null }
  for (const chave of diasNoIntervalo(de, fim)) {
    const f = porData.get(chave)
    const s = situacaoDia(chave, f, ajustes, agora)
    if (s === 'atrasado') { r.atrasados++; r.diasAtrasados.push(chave); continue }
    if (s === 'pendente') { r.pendentes++; continue }
    if (s === 'sem-expediente') { r.semExpediente++; continue }
    if (!f) continue
    r.enviados++
    if (s === 'conferido') r.conferidos++
    if (s === 'enviado') r.aguardando++
    if (s === 'divergente') r.divergentes++
    if (enviadoNoPrazo(f, ajustes)) r.noPrazo++
    r.minutos.push(minutosDoEnvio(f))
    if (f.valor_total != null) { r.total = centavos(r.total + Number(f.valor_total)); r.comValor++ }
  }
  const pct1 = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null)
  return {
    ...r,
    cobertura: pct1(r.enviados, r.enviados + r.atrasados),
    pontualidade: pct1(r.noPrazo, r.enviados),
    horarioMediano: mediana(r.minutos),
    mediaPorDia: r.comValor ? centavos(r.total / r.comValor) : null,
  }
}

// ---------------------------------------------------------------- relatório comercial
const DIA_MS = 86400000
const dentroDe = (v, ini, fim) => v && new Date(v) >= ini && new Date(v) <= fim
const soma = l => centavos(l.reduce((s, p) => s + Number(p.valor_total || 0), 0))

// Indicadores de um período: aprovação e conversão pela data da decisão; criação
// e valor cotado pela data de criação.
export function metricasComerciais(propostas, ini, fim) {
  const criadas = propostas.filter(p => dentroDe(p.criado_em, ini, fim))
  const decididas = propostas.filter(p => STATUS_FINAIS.includes(p.status) && dentroDe(p.decidida_em, ini, fim))
  const aprovadas = decididas.filter(p => p.status === 'Aprovada')
  const recusadas = decididas.filter(p => p.status === 'Recusada')
  const perdas = decididas.filter(p => p.status !== 'Aprovada')
  const ciclos = aprovadas.map(p => (new Date(p.decidida_em) - new Date(p.criado_em)) / DIA_MS)
  return {
    criadas, decididas, aprovadas, recusadas, perdas,
    valorAprovado: soma(aprovadas), valorCotado: soma(criadas), valorPerdido: soma(perdas),
    conversao: taxaConversao(aprovadas.length, aprovadas.length + recusadas.length),
    ticketMedio: aprovadas.length ? centavos(soma(aprovadas) / aprovadas.length) : null,
    cicloMediano: mediana(ciclos),
  }
}

// Mesmo intervalo de tempo, imediatamente antes (para comparar).
export function periodoAnterior(ini, fim) {
  const dur = fim - ini
  const f = new Date(ini.getTime() - 1)
  return [new Date(f.getTime() - dur), f]
}

// Variação percentual com sinal; null quando não há base para comparar.
export const variacaoPct = (atual, anterior) => (anterior ? Math.round(((atual - anterior) / anterior) * 1000) / 10 : null)

// Qualquer agregação por mês (chave AAAA-MM), terminando no mês de `agora`.
export function serieMensal(registros, campoData, agregar, meses, agora = new Date()) {
  const chaves = []
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    chaves.push(`${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}`)
  }
  const grupos = Object.fromEntries(chaves.map(k => [k, []]))
  for (const r of registros) {
    if (!r[campoData]) continue
    const d = new Date(r[campoData])
    const k = `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}`
    if (k in grupos) grupos[k].push(r)
  }
  return chaves.map(k => ({ mes: k, valor: agregar(grupos[k]) }))
}

// Funil das propostas criadas no período: cada etapa contém as seguintes
// (só chega à aprovação quem foi enviado; "com resposta" = negociou, aprovou ou recusou).
export function funilDeConversao(propostas, statusHistorico) {
  const ids = new Set(propostas.map(p => p.id))
  const chegou = { Enviada: new Set(), resposta: new Set(), Aprovada: new Set() }
  for (const e of statusHistorico || []) {
    if (e.entidade !== 'propostas' || !ids.has(e.registro_id)) continue
    if (['Enviada', 'Em negociacao', 'Aprovada', 'Recusada'].includes(e.para)) chegou.Enviada.add(e.registro_id)
    if (['Em negociacao', 'Aprovada', 'Recusada'].includes(e.para)) chegou.resposta.add(e.registro_id)
    if (e.para === 'Aprovada') chegou.Aprovada.add(e.registro_id)
  }
  const valorDe = conjunto => soma(propostas.filter(p => conjunto === null || conjunto.has(p.id)))
  const etapas = [
    { id: 'criadas', rotulo: 'Criadas', qtd: propostas.length, valor: valorDe(null) },
    { id: 'enviadas', rotulo: 'Enviadas ao cliente', qtd: chegou.Enviada.size, valor: valorDe(chegou.Enviada) },
    { id: 'resposta', rotulo: 'Com resposta do cliente', qtd: chegou.resposta.size, valor: valorDe(chegou.resposta) },
    { id: 'aprovadas', rotulo: 'Aprovadas', qtd: chegou.Aprovada.size, valor: valorDe(chegou.Aprovada) },
  ]
  return etapas.map((e, i) => ({
    ...e,
    daAnterior: i === 0 ? null : (etapas[i - 1].qtd ? Math.round((e.qtd / etapas[i - 1].qtd) * 1000) / 10 : null),
    doInicio: etapas[0].qtd ? Math.round((e.qtd / etapas[0].qtd) * 1000) / 10 : null,
  }))
}

// Mediana de dias que as propostas ficaram em cada etapa (só passagens encerradas).
export function tempoMedianoPorEtapa(statusHistorico, idsPropostas, agora = new Date()) {
  const porProposta = new Map()
  for (const e of statusHistorico || []) {
    if (e.entidade !== 'propostas' || (idsPropostas && !idsPropostas.has(e.registro_id))) continue
    if (!porProposta.has(e.registro_id)) porProposta.set(e.registro_id, [])
    porProposta.get(e.registro_id).push(e)
  }
  const duracoes = { Rascunho: [], Enviada: [], 'Em negociacao': [] }
  for (const eventos of porProposta.values()) {
    for (const t of tempoPorEtapa(eventos, agora)) if (t.fim && duracoes[t.status]) duracoes[t.status].push(t.dias)
  }
  return Object.entries(duracoes).map(([status, l]) => ({ status, mediana: mediana(l), n: l.length }))
}

// Desempenho por responsável: o responsável da solicitação (ou quem criou a proposta).
export function desempenhoPorResponsavel(propostas, solicitacoesPorId, ini, fim) {
  const grupos = new Map()
  const grupo = id => { if (!grupos.has(id)) grupos.set(id, []); return grupos.get(id) }
  for (const p of propostas) grupo(solicitacoesPorId[p.solicitacao_id]?.responsavel_id || p.criado_por || null).push(p)
  return [...grupos.entries()].map(([id, lista]) => {
    const m = metricasComerciais(lista, ini, fim)
    return { id, criadas: m.criadas.length, aprovadas: m.aprovadas.length, recusadas: m.recusadas.length, valorAprovado: m.valorAprovado, valorCotado: m.valorCotado, conversao: m.conversao, cicloMediano: m.cicloMediano }
  }).filter(r => r.criadas || r.aprovadas || r.recusadas).sort((a, b) => b.valorAprovado - a.valorAprovado || b.criadas - a.criadas)
}

// Movimentações de status por dia (mapa de calor), dos últimos `dias` dias até hoje.
export function movimentosPorDia(eventos, dias, agora = new Date()) {
  const fim = chaveDia(agora)
  const ini = somarDias(fim, -(dias - 1))
  const conta = new Map()
  for (const e of eventos || []) {
    const k = chaveDia(new Date(e.em))
    if (k >= ini && k <= fim) conta.set(k, (conta.get(k) || 0) + 1)
  }
  return diasNoIntervalo(ini, fim).map(k => ({ chave: k, valor: conta.get(k) || 0 }))
}

// Séries do relatório com a granularidade certa para o período: por semana
// (começando na segunda) até ~3 meses, por mês acima disso.
export function baldesDoPeriodo(ini, fim) {
  const dias = Math.round((fim - ini) / DIA_MS) + 1
  const fmt = d => `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`
  if (dias > 100) {
    const baldes = []
    for (let d = new Date(ini.getFullYear(), ini.getMonth(), 1); d <= fim; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const fimMes = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      baldes.push({ chave: `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}`, ini: d < ini ? ini : d, fim: fimMes > fim ? fim : fimMes,
        rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), titulo: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) })
    }
    return { granularidade: 'mes', baldes }
  }
  const baldes = []
  const segunda = new Date(ini); segunda.setHours(0, 0, 0, 0); segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7))
  for (let d = segunda; d <= fim; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) {
    const domingo = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6, 23, 59, 59, 999)
    const a = d < ini ? ini : d, b = domingo > fim ? fim : domingo
    baldes.push({ chave: chaveDia(d), ini: a, fim: b, rotulo: fmt(a), titulo: `Semana de ${fmt(a)} a ${fmt(b)}` })
  }
  return { granularidade: 'semana', baldes }
}

export function serieComercial(propostas, ini, fim) {
  const { granularidade, baldes } = baldesDoPeriodo(ini, fim)
  return {
    granularidade,
    pontos: baldes.map(b => {
      const aprovadas = propostas.filter(p => p.status === 'Aprovada' && dentroDe(p.decidida_em, b.ini, b.fim))
      const criadas = propostas.filter(p => dentroDe(p.criado_em, b.ini, b.fim))
      return { ...b, aprovado: soma(aprovadas), cotado: soma(criadas), nAprovadas: aprovadas.length, nCriadas: criadas.length }
    }),
  }
}
