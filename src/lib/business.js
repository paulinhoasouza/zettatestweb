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
