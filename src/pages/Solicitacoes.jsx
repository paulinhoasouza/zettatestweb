import { useMemo, useState } from 'react'
import { useApp, TituloTela, Abas, Busca, Pill, Vazio, Carregando, Gaveta, Campo, Botao } from '../components/ui.jsx'
import Anexos from '../components/Anexos.jsx'
import Linha from '../components/Linha.jsx'
import Icon from '../components/Icon.jsx'
import { api } from '../lib/api.js'
import { href, ir } from '../lib/rota.js'
import { STATUS_SOLICITACAO, SOLICITACAO_ATIVA, PRIORIDADES, rotulo, diasEntre, dataLocal } from '../lib/business.js'
import { brl, data, prazo, relativo } from '../lib/format.js'

const ABAS = {
  ativas: { rotulo: 'Ativas', filtro: s => SOLICITACAO_ATIVA.includes(s.status) },
  concluidas: { rotulo: 'Concluídas', filtro: s => s.status === 'Concluida' },
  canceladas: { rotulo: 'Canceladas', filtro: s => s.status === 'Cancelada' },
  todas: { rotulo: 'Todas', filtro: () => true },
}
const PESO = { Critica: 0, Alta: 1, Media: 2, Baixa: 3 }

export default function Solicitacoes({ params }) {
  const { dados, mapas, estado } = useApp()
  const aba = ABAS[params.get('aba')] ? params.get('aba') : 'ativas'
  const abrir = params.get('abrir')
  const [q, setQ] = useState('')
  const agora = new Date()
  const navegar = mudancas => {
    const p = new URLSearchParams(params)
    Object.entries(mudancas).forEach(([k, v]) => (v == null ? p.delete(k) : p.set(k, v)))
    ir(`solicitacoes${p.toString() ? `?${p}` : ''}`)
  }
  const busca = q.trim().toLowerCase()
  const lista = useMemo(() => dados.solicitacoes
    .filter(s => ABAS[aba].filtro(s))
    .filter(s => !busca || [s.titulo, s.descricao, mapas.clientes[s.cliente_id]?.nome].some(v => (v || '').toLowerCase().includes(busca)))
    .sort((a, b) => (SOLICITACAO_ATIVA.includes(a.status)
      ? (a.prazo || '9999').localeCompare(b.prazo || '9999') || PESO[a.prioridade] - PESO[b.prioridade]
      : new Date(b.atualizado_em) - new Date(a.atualizado_em))),
  [dados.solicitacoes, aba, busca, mapas])
  const ativas = dados.solicitacoes.filter(ABAS.ativas.filtro)
  const atrasadas = ativas.filter(s => s.prazo && diasEntre(dataLocal(s.prazo), agora) > 0).length
  const aberta = abrir === 'nova' ? 'nova' : mapas.solicitacoes[abrir]

  return (
    <>
      <TituloTela titulo="Solicitações"
        linha={`${ativas.length} ativas${atrasadas ? `, ${atrasadas} com prazo vencido` : ''}. Cada demanda de cliente começa aqui e vira proposta.`}
        acoes={<Botao variante="primario" icone="mais" onClick={() => navegar({ abrir: 'nova' })}>Nova solicitação</Botao>} />
      <Abas rotuloAcessivel="Situação das solicitações" ativa={aba} aoMudar={v => navegar({ aba: v })}
        abas={Object.entries(ABAS).map(([id, a]) => ({ id, rotulo: a.rotulo, conta: dados.solicitacoes.filter(a.filtro).length }))} />
      <div className="barra-ferramentas">
        <Busca valor={q} aoMudar={setQ} rotulo="Buscar solicitações" placeholder="Título, descrição ou cliente" />
        <span className="contagem num">{lista.length} {lista.length === 1 ? 'solicitação' : 'solicitações'}</span>
      </div>
      {estado.carregando && !estado.em ? <Carregando linhas={6} /> : lista.length ? (
        <div className="tabela-moldura">
          <table className="tabela">
            <thead><tr>
              <th scope="col">Solicitação</th><th scope="col">Prioridade</th><th scope="col">Responsável</th>
              <th scope="col" className="num">Prazo</th><th scope="col">Status</th><th scope="col" className="num col-opcional">Propostas</th><th scope="col"><span className="sr">Ação</span></th>
            </tr></thead>
            <tbody>
              {lista.map(s => {
                const props = dados.propostas.filter(p => p.solicitacao_id === s.id)
                const vencido = SOLICITACAO_ATIVA.includes(s.status) && s.prazo && diasEntre(dataLocal(s.prazo), agora) > 0
                return (
                  <tr key={s.id} className="clicavel" onClick={() => navegar({ abrir: s.id })}>
                    <td className="col-id">
                      <a href={href(`solicitacoes?abrir=${s.id}`)} onClick={e => { e.preventDefault(); e.stopPropagation(); navegar({ abrir: s.id }) }}>{s.titulo}</a>
                      <small>{mapas.clientes[s.cliente_id]?.nome || '—'} · aberta {relativo(s.criado_em, agora)}</small>
                    </td>
                    <td><Pill>{s.prioridade}</Pill></td>
                    <td>{mapas.equipe[s.responsavel_id]?.nome || <span className="traco">—</span>}</td>
                    <td className={`num ${vencido ? 'tom-negativo' : ''}`} title={s.prazo ? prazo(s.prazo, agora) : undefined} data-celular={s.prazo ? 'prazo' : undefined}>{s.prazo ? data(s.prazo) : <span className="traco">—</span>}</td>
                    <td><Pill>{s.status}</Pill></td>
                    <td className="num col-opcional">{props.length || <span className="traco">—</span>}</td>
                    <td className="col-acao">
                      {SOLICITACAO_ATIVA.includes(s.status) && <a className="link-acao" href={href(`propostas/nova?solicitacao=${s.id}`)} onClick={e => e.stopPropagation()}>Criar proposta</a>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : <Vazio>{busca ? `Nada encontrado para “${q.trim()}”.` : 'Nenhuma solicitação nesta situação.'}</Vazio>}

      {aberta && <GavetaSolicitacao registro={aberta === 'nova' ? null : aberta} aoFechar={() => navegar({ abrir: null })} />}
    </>
  )
}

function GavetaSolicitacao({ registro, aoFechar }) {
  const { dados, mapas, recarregar, notificar, eu } = useApp()
  const [aba, setAba] = useState('dados')
  const [f, setF] = useState(() => ({
    cliente_id: registro?.cliente_id || '', titulo: registro?.titulo || '', descricao: registro?.descricao || '',
    prioridade: registro?.prioridade || 'Media', status: registro?.status || 'Aberta', responsavel_id: registro?.responsavel_id || eu.id,
    prazo: registro?.prazo || '', motivo_cancelamento: registro?.motivo_cancelamento || '',
  }))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const propostas = registro ? dados.propostas.filter(p => p.solicitacao_id === registro.id) : []

  async function salvar(e) {
    e.preventDefault()
    if (!f.cliente_id) return setErro('Escolha o cliente.')
    if (!f.titulo.trim()) return setErro('Informe o título da solicitação.')
    if (f.status === 'Cancelada' && !f.motivo_cancelamento.trim()) return setErro('Informe o motivo do cancelamento.')
    setSalvando(true); setErro('')
    try {
      await api.salvarSolicitacao({ ...f, titulo: f.titulo.trim(), descricao: f.descricao.trim() || null, prazo: f.prazo || null,
        responsavel_id: f.responsavel_id || null, motivo_cancelamento: f.status === 'Cancelada' ? f.motivo_cancelamento.trim() : null }, registro?.id)
      await recarregar()
      notificar(registro ? 'Solicitação atualizada.' : 'Solicitação aberta.', 'sucesso')
      aoFechar()
    } catch (err) { setErro(err.message) } finally { setSalvando(false) }
  }

  const corpo = aba === 'dados' ? (
    <form id="form-solicitacao" className="form-gaveta" onSubmit={salvar} noValidate>
      <Campo rotulo="Cliente" obrigatorio dica={!dados.clientes.length ? 'Cadastre um cliente antes.' : undefined}>
        {(id, d) => <select id={id} aria-describedby={d} value={f.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
          <option value="">Escolha o cliente…</option>
          {dados.clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>}
      </Campo>
      <Campo rotulo="O que o cliente precisa" obrigatorio>{id => <input id={id} value={f.titulo} maxLength={160} onChange={e => set('titulo', e.target.value)} placeholder="Ex.: Agendamento de consultas pelo WhatsApp" />}</Campo>
      <Campo rotulo="Detalhes">{id => <textarea id={id} rows={4} value={f.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Como o cliente trabalha hoje, o que dói, volumes, prazos." />}</Campo>
      <div className="dupla">
        <Campo rotulo="Prioridade">{id => <select id={id} value={f.prioridade} onChange={e => set('prioridade', e.target.value)}>{PRIORIDADES.map(p => <option key={p} value={p}>{rotulo(p)}</option>)}</select>}</Campo>
        <Campo rotulo="Prazo para responder">{id => <input id={id} type="date" value={f.prazo || ''} onChange={e => set('prazo', e.target.value)} />}</Campo>
      </div>
      <div className="dupla">
        <Campo rotulo="Responsável">{id => <select id={id} value={f.responsavel_id || ''} onChange={e => set('responsavel_id', e.target.value)}>
          <option value="">Ninguém ainda</option>
          {dados.equipe.filter(m => m.ativo).map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>}</Campo>
        <Campo rotulo="Status">{id => <select id={id} value={f.status} onChange={e => set('status', e.target.value)}>{STATUS_SOLICITACAO.map(s => <option key={s} value={s}>{rotulo(s)}</option>)}</select>}</Campo>
      </div>
      {f.status === 'Cancelada' && <Campo rotulo="Motivo do cancelamento" obrigatorio>{id => <textarea id={id} rows={2} value={f.motivo_cancelamento} onChange={e => set('motivo_cancelamento', e.target.value)} />}</Campo>}
      {erro && <p className="erro-inline" role="alert">{erro}</p>}
    </form>
  ) : aba === 'propostas' ? (
    propostas.length ? (
      <ul className="lista-simples">{propostas.map(p => (
        <li key={p.id}><a href={href(`propostas/${p.id}`)}><span className="ls-id"><strong>{p.titulo}</strong><small><span className="mono">{p.numero}</span> · {brl(p.valor_total)}</small></span><Pill>{p.status}</Pill></a></li>
      ))}</ul>
    ) : <Vazio acao={SOLICITACAO_ATIVA.includes(registro.status) && <a className="btn btn-secundario" href={href(`propostas/nova?solicitacao=${registro.id}`)}>Criar proposta</a>}>Nenhuma proposta para esta solicitação.</Vazio>
  ) : aba === 'anexos' ? <Anexos entidade="solicitacoes" registroId={registro.id} anexos={dados.anexos.filter(a => a.entidade === 'solicitacoes' && a.registro_id === registro.id)} />
    : <Linha eventos={dados.historico.filter(h => h.entidade === 'solicitacoes' && h.registro_id === registro.id)} mapas={mapas} />

  return (
    <Gaveta titulo={registro ? registro.titulo : 'Nova solicitação'} subtitulo={registro ? `${mapas.clientes[registro.cliente_id]?.nome || '—'} · aberta em ${data(registro.criado_em)}` : 'Registre a demanda; a proposta vem depois.'}
      aoFechar={aoFechar}
      rodape={aba === 'dados' && <>
        <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
        <button type="submit" form="form-solicitacao" className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : registro ? 'Salvar alterações' : 'Abrir solicitação'}</button>
      </>}>
      {registro && (
        <div className="abas" role="tablist" aria-label="Partes da solicitação">
          {[['dados', 'Dados'], ['propostas', `Propostas`], ['anexos', 'Anexos'], ['historico', 'Histórico']].map(([id, r]) => (
            <button key={id} type="button" role="tab" aria-selected={aba === id} className={aba === id ? 'ativa' : ''} onClick={() => setAba(id)}>
              {r}{id === 'propostas' && <span className="aba-conta num">{propostas.length}</span>}
            </button>
          ))}
        </div>
      )}
      {corpo}
    </Gaveta>
  )
}
