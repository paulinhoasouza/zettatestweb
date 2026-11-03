import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, pronto, sairDoDemo } from './lib/api.js'
import { useRota, href, ir } from './lib/rota.js'
import {
  STATUS_EM_ABERTO, SOLICITACAO_ATIVA, podeVerTela, telaInicial, rotuloPerfil, vencimentos, resumoFechamentos,
  chaveDia, somarDias, PERFIS,
} from './lib/business.js'
import { hora } from './lib/format.js'
import { useAparencia, useIndicador } from './lib/anima.js'
import Icon, { Logo, LogoAuto } from './components/Icon.jsx'
import { AppCtx, Aviso, Botao, Avatar, Presenca } from './components/ui.jsx'
import Login from './pages/Login.jsx'
import VisaoGeral from './pages/VisaoGeral.jsx'
import Propostas from './pages/Propostas.jsx'
import PropostaDetalhe from './pages/PropostaDetalhe.jsx'
import Solicitacoes from './pages/Solicitacoes.jsx'
import Clientes from './pages/Clientes.jsx'
import Relatorios from './pages/Relatorios.jsx'
import Equipe from './pages/Equipe.jsx'
import Pessoas from './pages/Pessoas.jsx'
import Fechamentos from './pages/Fechamentos.jsx'

const GRUPOS = [
  {
    rotulo: 'Comercial',
    itens: [
      { id: 'visao-geral', rotulo: 'Visão geral', icone: 'visao' },
      { id: 'propostas', rotulo: 'Propostas', icone: 'proposta', contaRotulo: 'em aberto' },
      { id: 'solicitacoes', rotulo: 'Solicitações', icone: 'solicitacao', contaRotulo: 'ativas' },
      { id: 'clientes', rotulo: 'Clientes', icone: 'clientes' },
      { id: 'relatorios', rotulo: 'Relatórios', icone: 'relatorio' },
    ],
  },
  {
    rotulo: 'Operação',
    itens: [
      { id: 'pessoas', rotulo: 'Pessoas', icone: 'pessoas', contaRotulo: 'com validade vencida', alerta: true },
      { id: 'fechamentos', rotulo: 'Fechamentos', icone: 'fechamento', contaRotulo: 'pedindo atenção', alerta: true },
    ],
  },
]
const TODAS = [...GRUPOS.flatMap(g => g.itens), { id: 'equipe', rotulo: 'Equipe e acessos' }]
const VAZIO = {
  clientes: [], solicitacoes: [], propostas: [], itens: [], revisoes: [], statusHistorico: [], historico: [], equipe: [], anexos: [],
  funcionarios: [], treinamentos: [], documentos: [], fechamentos: [], fechamentoAjustes: null, pendente04: false,
}

export default function App() {
  if (!pronto) return <TelaConfigurar />
  return <Autenticado />
}

function Autenticado() {
  const [sessao, setSessao] = useState(undefined)
  const [membro, setMembro] = useState(undefined)

  useEffect(() => {
    let vivo = true
    api.sessao().then(s => vivo && setSessao(s)).catch(() => vivo && setSessao(null))
    const parar = api.aoMudarSessao(s => vivo && setSessao(s))
    return () => { vivo = false; parar() }
  }, [])

  useEffect(() => {
    if (sessao === undefined) return undefined
    if (!sessao) { setMembro(null); return undefined }
    let vivo = true
    setMembro(undefined)
    api.membro(sessao.user.id).then(m => vivo && setMembro(m)).catch(() => vivo && setMembro(null))
    return () => { vivo = false }
  }, [sessao?.user?.id])

  if (sessao === undefined || (sessao && membro === undefined)) return <Inicio />
  if (!sessao) return <Login />
  if (!membro) return <SemAcesso email={sessao.user.email} />
  return <Shell eu={membro} sessao={sessao} />
}

function Shell({ eu, sessao }) {
  const rota = useRota()
  const [dados, setDados] = useState(VAZIO)
  const [estado, setEstado] = useState({ carregando: true, erro: null, em: null })
  const [aviso, setAviso] = useState(null)
  const [menuAberto, setMenuAberto] = useState(false)
  const [aparencia, setAparencia] = useAparencia()
  const tempo = useRef(0)

  const notificar = useCallback((texto, tipo = 'erro') => {
    setAviso({ texto, tipo, id: Date.now() })
    window.clearTimeout(tempo.current)
    tempo.current = window.setTimeout(() => setAviso(null), tipo === 'erro' ? 8000 : 4000)
  }, [])

  const recarregar = useCallback(async () => {
    setEstado(e => ({ ...e, carregando: true }))
    try {
      const d = await api.carregarTudo()
      setDados({ ...VAZIO, ...d })
      setEstado({ carregando: false, erro: null, em: new Date() })
    } catch (e) {
      setEstado(s => ({ ...s, carregando: false, erro: e.message }))
    }
  }, [])

  useEffect(() => { recarregar() }, [recarregar])
  useEffect(() => { setMenuAberto(false) }, [rota.bruto])

  const mapas = useMemo(() => {
    const por = lista => Object.fromEntries(lista.map(x => [x.id, x]))
    const clientes = por(dados.clientes)
    const solicitacoes = por(dados.solicitacoes)
    const equipe = por(dados.equipe)
    const clienteDaProposta = p => clientes[solicitacoes[p.solicitacao_id]?.cliente_id]
    return { clientes, solicitacoes, equipe, propostas: por(dados.propostas), funcionarios: por(dados.funcionarios), clienteDaProposta }
  }, [dados])

  const perfil = eu.perfil
  const tela = podeVerTela(perfil, rota.tela) ? rota.tela : telaInicial(perfil)
  useEffect(() => {
    if (rota.tela && !podeVerTela(perfil, rota.tela)) window.location.replace(`#/${telaInicial(perfil)}`)
  }, [rota.tela, perfil])

  const contagens = useMemo(() => {
    const hoje = chaveDia()
    const r = resumoFechamentos(dados.fechamentos, dados.fechamentoAjustes, somarDias(hoje, -30), hoje)
    return {
      propostas: dados.propostas.filter(p => STATUS_EM_ABERTO.includes(p.status)).length,
      solicitacoes: dados.solicitacoes.filter(x => SOLICITACAO_ATIVA.includes(x.status)).length,
      pessoas: vencimentos(dados).filter(v => v.codigo === 'vencido').length,
      fechamentos: r.atrasados + r.divergentes + r.pendentes,
    }
  }, [dados])

  const ctx = { dados, mapas, eu, sessao, recarregar, notificar, estado, demo: api.demo }
  const rotuloTela = TODAS.find(n => n.id === tela)?.rotulo || 'Visão geral'
  const grupos = GRUPOS.map(g => ({ ...g, itens: g.itens.filter(n => podeVerTela(perfil, n.id)) })).filter(g => g.itens.length)
  const [trilho, estiloPolegar] = useIndicador(tela, grupos.map(g => g.itens.length).join())

  let pagina
  if (tela === 'propostas' && rota.id) pagina = <PropostaDetalhe key={rota.id + rota.params.toString()} id={rota.id} params={rota.params} />
  else if (tela === 'propostas') pagina = <Propostas params={rota.params} />
  else if (tela === 'solicitacoes') pagina = <Solicitacoes params={rota.params} />
  else if (tela === 'clientes') pagina = <Clientes params={rota.params} />
  else if (tela === 'relatorios') pagina = <Relatorios params={rota.params} />
  else if (tela === 'equipe') pagina = <Equipe />
  else if (tela === 'pessoas') pagina = <Pessoas params={rota.params} />
  else if (tela === 'fechamentos') pagina = <Fechamentos params={rota.params} />
  else pagina = <VisaoGeral />

  const sair = async () => { if (api.demo) { sairDoDemo(); return } try { await api.sair() } catch (e) { notificar(e.message) } }
  const proximaAparencia = { auto: 'clara', clara: 'escura', escura: 'auto' }[aparencia]
  const nomeAparencia = { auto: 'automática (segue o sistema)', clara: 'clara', escura: 'escura' }[aparencia]

  return (
    <AppCtx.Provider value={ctx}>
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <div className={`moldura ${menuAberto ? 'menu-aberto' : ''}`}>
        <aside className="lateral" aria-label="Navegação">
          <div className="produto">
            <LogoAuto altura={32} />
            <button type="button" className="btn-icone so-celular" aria-label="Fechar menu" onClick={() => setMenuAberto(false)}><Icon nome="fechar" /></button>
          </div>
          <p className="produto-nome">Zetta Propostas</p>
          <div className="navegacao" ref={trilho}>
            <span className="polegar" style={estiloPolegar} aria-hidden="true" />
            {grupos.map(g => (
              <div key={g.rotulo}>
                <span className="nav-grupo">{g.rotulo}</span>
                <nav className="nav" aria-label={g.rotulo}>
                  {g.itens.map(n => (
                    <a key={n.id} href={href(n.id)} className={tela === n.id ? 'ativo' : ''} data-ativo={tela === n.id} aria-current={tela === n.id ? 'page' : undefined}>
                      <Icon nome={n.icone} tamanho={17} /><span>{n.rotulo}</span>
                      {contagens[n.id] > 0 && <b className={`nav-conta num ${n.alerta ? 'alerta' : ''}`} aria-label={`${contagens[n.id]} ${n.contaRotulo}`}>{contagens[n.id]}</b>}
                    </a>
                  ))}
                </nav>
              </div>
            ))}
            <span className="nav-grupo">Geral</span>
            <nav className="nav" aria-label="Geral">
              {podeVerTela(perfil, 'equipe') && (
                <a href={href('equipe')} className={tela === 'equipe' ? 'ativo' : ''} data-ativo={tela === 'equipe'} aria-current={tela === 'equipe' ? 'page' : undefined}>
                  <Icon nome="equipe" tamanho={17} /><span>Equipe e acessos</span>
                </a>
              )}
              <button type="button" onClick={sair}><Icon nome="sair" tamanho={17} /><span>{api.demo ? 'Sair da demonstração' : 'Sair'}</span></button>
            </nav>
          </div>
          <CartaoDemo eu={eu} />
        </aside>

        <div className="principal">
          <header className="topo">
            <button type="button" className="btn-icone so-celular" aria-label="Abrir menu" onClick={() => setMenuAberto(true)}><Icon nome="menu" tamanho={18} /></button>
            <span className="topo-tela so-celular">{rotuloTela}</span>
            {perfil !== 'operacional' && <BuscaGlobal dados={dados} mapas={mapas} />}
            <div className="topo-dir">
              {api.demo && <span className="pill pill-aviso" title="Dados fictícios guardados só neste navegador">Demonstração</span>}
              <button type="button" className="btn-redondo" aria-label={`Aparência ${nomeAparencia}. Mudar para ${proximaAparencia}.`} title={`Aparência: ${nomeAparencia}`}
                onClick={() => setAparencia(proximaAparencia)}>
                <Icon nome={{ auto: 'auto', clara: 'sol', escura: 'lua' }[aparencia]} />
              </button>
              <button type="button" className="btn-redondo" aria-label="Atualizar dados" title={estado.em ? `Atualizado às ${hora(estado.em)}. Clique para atualizar.` : 'Atualizar dados'} onClick={recarregar} disabled={estado.carregando}>
                <Icon nome="atualizar" className={estado.carregando ? 'girando' : ''} />
              </button>
              <div className="usuario">
                <Avatar nome={eu.nome} />
                <div><strong>{eu.nome}</strong><span>{eu.email || rotuloPerfil(perfil)}</span></div>
              </div>
            </div>
          </header>

          <main className="folha" id="conteudo" tabIndex={-1}>
            {estado.erro && (
              <div className="erro-bloco" role="alert">
                <Icon nome="alerta" />
                <span>Não foi possível carregar os dados{estado.em ? ` (última atualização às ${hora(estado.em)})` : ''}: {estado.erro}</span>
                <Botao variante="texto" onClick={recarregar}>Tentar de novo</Botao>
              </div>
            )}
            <div className="pagina" key={tela + (rota.id || '')}>{pagina}</div>
          </main>
        </div>
      </div>
      <div className="sombra-menu" onClick={() => setMenuAberto(false)} aria-hidden="true" />
      <Presenca>{aviso && <Aviso key={aviso.id} aviso={aviso} aoFechar={() => setAviso(null)} />}</Presenca>
    </AppCtx.Provider>
  )
}

function CartaoDemo({ eu }) {
  if (!api.demo) {
    return (
      <div className="cartao-demo">
        <span className="cd-icone"><Icon nome="raio" /></span>
        <strong>Mostre para um cliente</strong>
        <p>O app completo com dados fictícios, sem tocar no banco.</p>
        <a className="cd-botao" href="?demo" target="_blank" rel="noopener">Abrir demonstração</a>
      </div>
    )
  }
  const usuarios = api.usuarios?.() || []
  return (
    <div className="cartao-demo">
      <span className="cd-icone"><Icon nome="raio" /></span>
      <strong>Você está na demonstração</strong>
      <p>Os dados são fictícios e ficam só neste navegador.</p>
      {usuarios.length > 1 && (
        <div className="cd-como">
          <label htmlFor="ver-como">Ver como</label>
          <select id="ver-como" value={eu.id} onChange={e => api.entrarComo(e.target.value)}>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome.split(' ')[0]} · {PERFIS[u.perfil]?.rotulo || u.perfil}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

function BuscaGlobal({ dados, mapas }) {
  const [q, setQ] = useState('')
  const [aberta, setAberta] = useState(false)
  const campo = useRef(null)
  useEffect(() => {
    const atalho = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); campo.current?.focus() } }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [])
  const termo = q.trim().toLowerCase()
  const resultados = useMemo(() => {
    if (termo.length < 2) return []
    const tem = (...v) => v.some(x => (x || '').toLowerCase().includes(termo))
    const props = dados.propostas.filter(p => tem(p.numero, p.titulo, mapas.clienteDaProposta(p)?.nome)).slice(0, 5)
      .map(p => ({ id: p.id, rotulo: p.titulo, sub: `${p.numero} · ${mapas.clienteDaProposta(p)?.nome || '—'}`, link: `propostas/${p.id}`, tipo: 'Proposta' }))
    const clis = dados.clientes.filter(c => tem(c.nome, c.contato, c.documento)).slice(0, 3)
      .map(c => ({ id: c.id, rotulo: c.nome, sub: c.cidade || c.contato || '', link: `clientes?abrir=${c.id}`, tipo: 'Cliente' }))
    const pessoas = dados.funcionarios.filter(f => tem(f.nome, f.cargo, f.setor)).slice(0, 3)
      .map(f => ({ id: f.id, rotulo: f.nome, sub: [f.cargo, f.setor].filter(Boolean).join(' · '), link: `pessoas?abrir=${f.id}`, tipo: 'Pessoa' }))
    return [...props, ...clis, ...pessoas]
  }, [termo, dados, mapas])
  const escolher = r => { setQ(''); setAberta(false); ir(r.link) }
  return (
    <div className="busca-global" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setAberta(false) }}>
      <label className="busca">
        <Icon nome="busca" />
        <span className="sr">Buscar propostas, clientes e pessoas</span>
        <input ref={campo} type="search" value={q} placeholder="Buscar proposta, cliente ou pessoa" onFocus={() => setAberta(true)}
          onChange={e => { setQ(e.target.value); setAberta(true) }}
          onKeyDown={e => { if (e.key === 'Enter' && resultados[0]) escolher(resultados[0]); if (e.key === 'Escape') setAberta(false) }} />
        <kbd className="atalho" aria-hidden="true">Ctrl K</kbd>
      </label>
      {aberta && termo.length >= 2 && (
        <div className="busca-resultados" role="listbox" aria-label="Resultados">
          {resultados.length ? resultados.map(r => (
            <button key={r.tipo + r.id} type="button" role="option" aria-selected="false" onClick={() => escolher(r)}>
              <span><strong>{r.rotulo}</strong><small>{r.sub}</small></span><em>{r.tipo}</em>
            </button>
          )) : <p>Nada encontrado para “{q.trim()}”.</p>}
        </div>
      )}
    </div>
  )
}

function Inicio() {
  return <div className="tela-cheia"><Logo altura={44} /><p>Carregando…</p></div>
}

function SemAcesso({ email }) {
  return (
    <div className="tela-cheia">
      <div className="cartao-centro">
        <LogoAuto altura={40} />
        <h1>Acesso ainda não liberado</h1>
        <p>Você entrou como <strong>{email}</strong>, mas esta conta não está ativa na equipe da Zetta. Peça a um administrador para incluir o seu usuário em <em>Equipe e acessos</em>.</p>
        <Botao variante="secundario" onClick={() => api.sair()}>Sair desta conta</Botao>
      </div>
    </div>
  )
}

function TelaConfigurar() {
  return (
    <div className="tela-cheia">
      <div className="cartao-centro">
        <LogoAuto altura={40} />
        <h1>Conecte o Supabase</h1>
        <p>O endereço e a chave pública do Supabase ficam em <code>src/config.js</code>. Preencha os dois valores e publique de novo.</p>
        <a className="btn btn-primario" href="?demo">Ver o app com dados de demonstração</a>
      </div>
    </div>
  )
}
