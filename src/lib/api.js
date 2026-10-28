// Camada de dados: uma única interface usada por todas as telas.
// Em produção fala com o Supabase; com ?demo no endereço (ou VITE_MODO_DEMO=true)
// usa o banco de demonstração em memória (src/lib/demo.js).
import { supabase, configurado } from './supabase.js'
import { criarDemo } from './demo.js'

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
function traduzir(error) {
  const msg = error?.message || 'Não foi possível concluir a operação.'
  if (error?.code === '23503') return new Error('Não é possível excluir: existem registros vinculados a este.')
  if (error?.code === '42501' || /row-level security/i.test(msg)) return new Error('Seu usuário não tem permissão para esta ação.')
  if (/solicitacao_cancelada_tem_motivo/.test(msg)) return new Error('Informe o motivo do cancelamento.')
  if (/Failed to fetch|NetworkError/i.test(msg)) return new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.')
  return new Error(msg)
}
const ok = ({ data, error }) => { if (error) throw traduzir(error); return data }

const nomeSeguro = nome => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-80)

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
    return { clientes, solicitacoes, propostas, itens, revisoes, statusHistorico, historico, equipe, anexos }
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
