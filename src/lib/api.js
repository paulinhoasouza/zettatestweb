// Camada de dados: uma única interface usada por todas as telas.
// Em produção fala com o Supabase; com ?demo no endereço (ou VITE_MODO_DEMO=true)
// usa o banco de demonstração em memória (src/lib/demo.js).
import { supabase, configurado } from './supabase.js'
import { criarDemo } from './demo.js'
import { ehPlanilha, EXTENSOES_PLANILHA } from './business.js'

const pedidoDemo = () => {
  try {
    const q = new URLSearchParams(window.location.search)
    if (q.has('demo')) { sessionStorage.setItem('zp-demo', '1'); return true }
    return sessionStorage.getItem('zp-demo') === '1'
  } catch { return false }
}

export const modoDemo = import.meta.env.VITE_MODO_DEMO === 'true' || pedidoDemo()
export const pronto = modoDemo || configurado

export function sairDoDemo() {
  try { sessionStorage.removeItem('zp-demo') } catch { /* sem armazenamento */ }
  window.location.href = window.location.pathname
}

// Traduz erros do Postgres/Supabase para frases que a equipe entende.
const RESTRICOES = {
  solicitacao_cancelada_tem_motivo: 'Informe o motivo do cancelamento.',
  fechamento_divergente_tem_nota: 'Descreva a divergência encontrada.',
  fechamento_sem_expediente_tem_motivo: 'Informe o motivo do dia sem expediente.',
  treinamento_validade_depois_da_realizacao: 'A validade precisa ser igual ou posterior à data do treinamento.',
  documento_validade_depois_da_emissao: 'A validade precisa ser igual ou posterior à data de emissão.',
  fechamentos_data_key: 'Já existe um fechamento para este dia. Atualize a página e tente de novo.',
}
function traduzir(error) {
  const msg = error?.message || 'Não foi possível concluir a operação.'
  const restricao = Object.keys(RESTRICOES).find(k => msg.includes(k))
  if (restricao) return new Error(RESTRICOES[restricao])
  if (error?.code === '23503') return new Error('Não é possível excluir: existem registros vinculados a este.')
  if (error?.code === '42501' || error?.code === 'PGRST116' || /row-level security/i.test(msg)) return new Error('Seu usuário não tem permissão para esta ação.')
  if (/Failed to fetch|NetworkError/i.test(msg)) return new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.')
  return new Error(msg)
}
// Tabela que ainda não existe: a migração 04 não foi aplicada neste projeto.
const tabelaAusente = e => ['PGRST205', '42P01'].includes(e?.code) || /could not find the table|does not exist/i.test(e?.message || '')
const ok = ({ data, error }) => { if (error) throw traduzir(error); return data }

const nomeSeguro = nome => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-80)

export function validarPlanilha(arquivo) {
  if (!ehPlanilha(arquivo.name)) throw new Error(`Envie a planilha do fechamento (${EXTENSOES_PLANILHA.map(e => `.${e}`).join(', ')}).`)
  if (arquivo.size > 10 * 1024 * 1024) throw new Error('O arquivo passa de 10 MB.')
  if (!arquivo.size) throw new Error('O arquivo está vazio.')
}

const apiSupabase = {
  demo: false,
  async sessao() { return ok(await supabase.auth.getSession()).session },
  aoMudarSessao(fn) {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => fn(s))
    return () => data.subscription.unsubscribe()
  },
  async entrar(email, senha) { ok(await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })) },
  async sair() { ok(await supabase.auth.signOut()) },
  async membro(uid) { return ok(await supabase.from('equipe').select('*').eq('id', uid).eq('ativo', true).maybeSingle()) },

  async carregarTudo() {
    const q = t => supabase.from(t).select('*')
    const [clientes, solicitacoes, propostas, itens, revisoes, statusHistorico, historico, equipe, anexos] = await Promise.all([
      q('clientes').order('nome'),
      q('solicitacoes').order('criado_em', { ascending: false }),
      q('propostas').order('criado_em', { ascending: false }),
      q('proposta_itens').order('ordem'),
      q('revisoes').order('numero_revisao', { ascending: false }),
      q('status_historico').order('em'),
      q('historico').order('criado_em', { ascending: false }).limit(1000),
      q('equipe').order('nome'),
      q('anexos').order('criado_em', { ascending: false }),
    ].map(p => p.then(ok)))
    // Pessoas e fechamentos (migração 04): se as tabelas ainda não existem, o
    // resto do app continua funcionando e as telas novas explicam o que falta.
    let pendente04 = false
    const opcional = consulta => consulta.then(({ data, error }) => {
      if (!error) return data
      if (tabelaAusente(error)) { pendente04 = true; return [] }
      throw traduzir(error)
    })
    const [funcionarios, treinamentos, documentos, fechamentos, ajustes] = await Promise.all([
      opcional(q('funcionarios').order('nome')),
      opcional(q('treinamentos').order('realizado_em', { ascending: false })),
      opcional(q('documentos').order('criado_em', { ascending: false })),
      opcional(q('fechamentos').order('data', { ascending: false }).limit(1000)),
      opcional(q('fechamento_ajustes').limit(1)),
    ])
    return {
      clientes, solicitacoes, propostas, itens, revisoes, statusHistorico, historico, equipe, anexos,
      funcionarios, treinamentos, documentos, fechamentos, fechamentoAjustes: ajustes[0] || null, pendente04,
    }
  },

  async salvarCliente(dados, id) {
    return ok(await (id ? supabase.from('clientes').update(dados).eq('id', id) : supabase.from('clientes').insert(dados)).select().single())
  },
  async excluirCliente(id) { ok(await supabase.from('clientes').delete().eq('id', id)) },
  async salvarSolicitacao(dados, id) {
    return ok(await (id ? supabase.from('solicitacoes').update(dados).eq('id', id) : supabase.from('solicitacoes').insert(dados)).select().single())
  },
  async salvarProposta(payload) { return ok(await supabase.rpc('salvar_proposta', { p: payload })) },
  async mudarStatusProposta(id, para, motivo) {
    return ok(await supabase.rpc('mudar_status_proposta', { p_id: id, p_para: para, p_motivo: motivo || null }))
  },
  async salvarMembro(dados, id) {
    return ok(await (id ? supabase.from('equipe').update(dados).eq('id', id) : supabase.from('equipe').insert(dados)).select().single())
  },

  // ---------------------------------------------------------------- pessoas (só administrador)
  async salvarFuncionario(dados, id) {
    return ok(await (id ? supabase.from('funcionarios').update(dados).eq('id', id) : supabase.from('funcionarios').insert(dados)).select().single())
  },
  async excluirFuncionario(id) { ok(await supabase.from('funcionarios').delete().eq('id', id)) },
  async salvarTreinamento(dados, id) {
    return ok(await (id ? supabase.from('treinamentos').update(dados).eq('id', id) : supabase.from('treinamentos').insert(dados)).select().single())
  },
  async excluirTreinamento(registro, anexos = []) {
    for (const a of anexos) await this.excluirAnexo(a)
    ok(await supabase.from('treinamentos').delete().eq('id', registro.id))
  },
  async salvarDocumento(dados, id) {
    return ok(await (id ? supabase.from('documentos').update(dados).eq('id', id) : supabase.from('documentos').insert(dados)).select().single())
  },
  async excluirDocumento(registro, anexos = []) {
    for (const a of anexos) await this.excluirAnexo(a)
    ok(await supabase.from('documentos').delete().eq('id', registro.id))
  },

  // ---------------------------------------------------------------- fechamentos
  // A planilha sobe primeiro para o Storage; a função registrar_fechamento grava
  // o fechamento e o anexo juntos. Se ela recusar, o arquivo enviado é apagado.
  async enviarFechamento({ id, data, valor_total, observacoes }, arquivo) {
    const fid = id || crypto.randomUUID()
    let anexo = null
    if (arquivo) {
      validarPlanilha(arquivo)
      const caminho = `fechamentos/${fid}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`
      ok(await supabase.storage.from('zetta-anexos').upload(caminho, arquivo, { contentType: arquivo.type || undefined }))
      anexo = { nome: arquivo.name, caminho, tamanho: arquivo.size, tipo: arquivo.type || null }
    }
    const r = await supabase.rpc('registrar_fechamento', { p: { id: fid, data, valor_total: valor_total ?? null, observacoes: observacoes || null, anexo } })
    if (r.error) {
      if (anexo) await supabase.storage.from('zetta-anexos').remove([anexo.caminho])
      throw traduzir(r.error)
    }
    return r.data
  },
  async conferirFechamento(id, status, nota) {
    return ok(await supabase.from('fechamentos').update({ status, nota_conferencia: nota || null }).eq('id', id).select().single())
  },
  async marcarSemExpediente(data, motivo) {
    return ok(await supabase.from('fechamentos').insert({ data, status: 'Sem expediente', observacoes: motivo }).select().single())
  },
  async excluirFechamento(registro, anexos = []) {
    for (const a of anexos) await this.excluirAnexo(a)
    ok(await supabase.from('fechamentos').delete().eq('id', registro.id))
  },
  async salvarAjustesFechamento(dados) {
    return ok(await supabase.from('fechamento_ajustes').update(dados).eq('id', true).select().single())
  },
  async lerPlanilha(anexo) {
    const { data, error } = await supabase.storage.from('zetta-anexos').download(anexo.caminho)
    if (error) throw traduzir(error)
    const { lerPlanilha } = await import('./planilha.js')
    return lerPlanilha(data, anexo.nome)
  },

  async enviarAnexo(arquivo, entidade, registroId, uid) {
    if (arquivo.size > 10 * 1024 * 1024) throw new Error('O arquivo passa de 10 MB.')
    const caminho = `${entidade}/${registroId}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`
    ok(await supabase.storage.from('zetta-anexos').upload(caminho, arquivo, { contentType: arquivo.type || undefined }))
    const r = await supabase.from('anexos').insert({
      entidade, registro_id: registroId, nome: arquivo.name, caminho, tamanho: arquivo.size, tipo: arquivo.type || null, criado_por: uid,
    })
    if (r.error) { await supabase.storage.from('zetta-anexos').remove([caminho]); throw traduzir(r.error) }
  },
  async baixarAnexo(anexo) {
    const { signedUrl } = ok(await supabase.storage.from('zetta-anexos').createSignedUrl(anexo.caminho, 60))
    window.open(signedUrl, '_blank', 'noopener')
  },
  async excluirAnexo(anexo) {
    ok(await supabase.storage.from('zetta-anexos').remove([anexo.caminho]))
    ok(await supabase.from('anexos').delete().eq('id', anexo.id))
  },
}

export const api = modoDemo ? criarDemo() : configurado ? apiSupabase : null
