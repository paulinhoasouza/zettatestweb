import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { Sparkline } from './graficos.jsx'
import { rotulo } from '../lib/business.js'
import { iniciais, brl } from '../lib/format.js'
import { useIndicador, useTransicao, useVisivel } from '../lib/anima.js'

// ---------------------------------------------------------------- contexto do app
export const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

// ---------------------------------------------------------------- botões e campos
export function Botao({ children, icone, variante = 'secundario', tamanho, className = '', ...props }) {
  return (
    <button type="button" className={`btn btn-${variante} ${tamanho ? `btn-${tamanho}` : ''} ${className}`} {...props}>
      {icone && <Icon nome={icone} />}
      {children && <span>{children}</span>}
    </button>
  )
}

// Uso: <Campo rotulo="Nome">{id => <input id={id} />}</Campo>  (o rótulo fica ligado ao campo)
export function Campo({ rotulo: r, obrigatorio, dica, children, className = '' }) {
  const id = useId()
  return (
    <div className={`campo ${className}`}>
      <label htmlFor={id}>{r}{obrigatorio && <span className="obrig" aria-hidden="true"> *</span>}</label>
      {children(id, dica ? `${id}-dica` : undefined)}
      {dica && <small id={`${id}-dica`} className="campo-dica">{dica}</small>}
    </div>
  )
}

// Interruptor no estilo iOS (é um checkbox por baixo, com role="switch").
export function Interruptor({ ligado, aoMudar, children, desativado, dica }) {
  return (
    <label className={`interruptor ${desativado ? 'desativado' : ''}`}>
      <input type="checkbox" role="switch" checked={ligado} disabled={desativado} onChange={e => aoMudar(e.target.checked)} />
      <span className="interruptor-trilho" aria-hidden="true"><span /></span>
      <span className="interruptor-texto">{children}{dica && <small>{dica}</small>}</span>
    </label>
  )
}

// ---------------------------------------------------------------- status
const TOM = {
  Rascunho: 'neutro', Enviada: 'info', 'Em negociacao': 'roxo', Aprovada: 'positivo', Recusada: 'negativo', Cancelada: 'neutro',
  Aberta: 'info', 'Em analise': 'aviso', 'Em proposta': 'roxo', Concluida: 'positivo',
  Baixa: 'neutro', Media: 'neutro', Alta: 'aviso', Critica: 'negativo',
  Ativo: 'positivo', Afastado: 'aviso', Desligado: 'neutro',
  Enviado: 'info', Conferido: 'positivo', Divergente: 'aviso', 'Sem expediente': 'neutro',
}
export function Pill({ children, tom, icone }) {
  return <span className={`pill pill-${tom || TOM[children] || 'neutro'}`}>{icone && <Icon nome={icone} tamanho={12} traco={2.2} />}{rotulo(children)}</span>
}

const somaCodigos = s => [...String(s || '')].reduce((n, c) => n + c.charCodeAt(0), 0)
export function Avatar({ nome, indice, tamanho }) {
  const tom = (indice ?? somaCodigos(nome)) % 6
  return <span className={`avatar avatar-${tom} ${tamanho ? `avatar-${tamanho}` : ''}`} aria-hidden="true">{iniciais(nome)}</span>
}

// ---------------------------------------------------------------- blocos
export function Bloco({ titulo, acao, children, className = '', id, sub }) {
  return (
    <section className={`bloco ${className}`} aria-labelledby={titulo ? id : undefined}>
      {(titulo || acao) && (
        <header className="bloco-cab">
          <div className="bloco-titulos">
            {titulo && <h2 id={id}>{titulo}</h2>}
            {sub && <p className="bloco-sub">{sub}</p>}
          </div>
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

export function Vazio({ children, acao, icone }) {
  return (
    <div className="vazio">
      {icone && <span className="vazio-icone"><Icon nome={icone} tamanho={20} /></span>}
      <p>{children}</p>
      {acao}
    </div>
  )
}

export function Carregando({ linhas = 4 }) {
  return <div className="carregando" aria-busy="true" aria-label="Carregando">{Array.from({ length: linhas }, (_, i) => <span key={i} />)}</div>
}

export function TituloTela({ titulo, linha, acoes, voltar }) {
  return (
    <div className="titulo-tela">
      <div className="titulo-texto">
        {voltar}
        <h1>{titulo}</h1>
        {linha && <p className="titulo-linha">{linha}</p>}
      </div>
      {acoes && <div className="titulo-acoes">{acoes}</div>}
    </div>
  )
}

// Abas e controle segmentado: trilho translúcido com um "polegar" que desliza até a opção ativa.
export function Abas({ abas, ativa, aoMudar, rotuloAcessivel }) {
  const [trilho, estilo] = useIndicador(ativa, abas.map(a => `${a.rotulo}${a.conta ?? ''}`).join())
  return (
    <div className="abas" role="tablist" aria-label={rotuloAcessivel} ref={trilho}>
      <span className="polegar" style={estilo} aria-hidden="true" />
      {abas.map(a => (
        <button key={a.id} role="tab" type="button" aria-selected={ativa === a.id} data-ativo={ativa === a.id}
          className={ativa === a.id ? 'ativa' : ''} onClick={() => aoMudar(a.id)}>
          {a.icone && <Icon nome={a.icone} tamanho={15} />}{a.rotulo}{a.conta != null && <span className="aba-conta num">{a.conta}</span>}
        </button>
      ))}
    </div>
  )
}

export function Segmentado({ opcoes, valor, aoMudar, rotuloAcessivel, pequeno }) {
  const [trilho, estilo] = useIndicador(valor, opcoes.map(o => o.rotulo).join())
  return (
    <div className={`segmentado ${pequeno ? 'segmentado-p' : ''}`} role="radiogroup" aria-label={rotuloAcessivel} ref={trilho}>
      <span className="polegar" style={estilo} aria-hidden="true" />
      {opcoes.map(o => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} data-ativo={valor === o.id}
          className={valor === o.id ? 'ativa' : ''} onClick={() => aoMudar(o.id)} title={o.titulo}>
          {o.icone && <Icon nome={o.icone} />}{o.rotulo && <span>{o.rotulo}</span>}
        </button>
      ))}
    </div>
  )
}

export function Busca({ valor, aoMudar, rotulo: r = 'Buscar', placeholder }) {
  return (
    <label className="busca">
      <Icon nome="busca" />
      <span className="sr">{r}</span>
      <input type="search" value={valor} placeholder={placeholder} onChange={e => aoMudar(e.target.value)} />
    </label>
  )
}

// ---------------------------------------------------------------- números animados
// O leitor de tela recebe o valor final; a contagem é só visual.
export function NumeroAnimado({ valor, formato = v => String(Math.round(v)), duracao = 900 }) {
  const [ref, visivel] = useVisivel()
  const finito = typeof valor === 'number' && Number.isFinite(valor)
  const [v] = useTransicao([finito ? valor : 0], { duracao, ativo: visivel })
  if (!finito) return <span>{formato(valor)}</span>
  return (
    <span ref={ref} className="numero-animado">
      <span className="sr">{formato(valor)}</span>
      <span aria-hidden="true">{formato(visivel ? v : 0)}</span>
    </span>
  )
}

// Variação com seta: a cor diz se a mudança foi boa (subir nem sempre é bom).
export function Variacao({ pct, subirEBom = true, sufixo }) {
  sufixo = sufixo ?? '%'
  if (pct == null) return null
  const sobe = pct > 0
  const tom = pct === 0 ? 'neutro' : sobe === subirEBom ? 'bom' : 'ruim'
  const n = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Math.abs(pct))
  return (
    <span className={`variacao variacao-${tom}`}>
      {pct !== 0 && <Icon nome={sobe ? 'sobe' : 'desce'} tamanho={12} traco={2.4} />}
      <span>{pct === 0 ? 'igual' : `${sobe ? '+' : '−'}${n}${sufixo}`}</span>
    </span>
  )
}

// ---------------------------------------------------------------- painéis flutuantes
// Presenca mantém o último conteúdo na tela por um instante depois de fechar,
// para a gaveta ou o diálogo saírem com animação.
// "Saindo" é decidido no próprio render em que o conteúdo some (não um quadro
// depois): assim o painel que sai já não recebe Esc nem cliques.
const SaindoCtx = createContext(false)
export function Presenca({ children, duracao = 240 }) {
  const ultimo = useRef(children || null)
  const [, redesenhar] = useState(0)
  if (children) ultimo.current = children
  const saindo = !children && ultimo.current != null
  useEffect(() => {
    if (!saindo) return undefined
    const t = setTimeout(() => { ultimo.current = null; redesenhar(n => n + 1) }, duracao)
    return () => clearTimeout(t)
  }, [saindo, duracao])
  if (!ultimo.current) return null
  return <SaindoCtx.Provider value={saindo}>{children || ultimo.current}</SaindoCtx.Provider>
}

// Esc fecha só o painel de cima (um diálogo aberto sobre uma gaveta fecha sozinho).
// Um painel que está saindo deixa de contar na hora (ativo = false já no render).
const pilhaEsc = []
function usarEsc(fechar, ativo = true) {
  const entrada = useRef({ fechar, ativo }).current
  entrada.fechar = fechar
  entrada.ativo = ativo
  // layout effect: registra antes da pintura, para um Esc logo depois de abrir já valer
  useLayoutEffect(() => {
    pilhaEsc.push(entrada)
    const f = e => {
      if (e.key !== 'Escape') return
      const topo = [...pilhaEsc].reverse().find(x => x.ativo)
      if (topo === entrada) { e.preventDefault(); entrada.fechar() }
    }
    document.addEventListener('keydown', f)
    return () => {
      document.removeEventListener('keydown', f)
      const i = pilhaEsc.indexOf(entrada)
      if (i >= 0) pilhaEsc.splice(i, 1)
    }
  }, [entrada])
}
function useTravarRolagem() {
  useEffect(() => {
    const b = document.body
    const antes = b.style.overflow
    b.style.overflow = 'hidden'
    return () => { b.style.overflow = antes }
  }, [])
}

export function Gaveta({ titulo, subtitulo, aoFechar, children, rodape, largura = 'media', cabecalho }) {
  const saindo = useContext(SaindoCtx)
  usarEsc(aoFechar, !saindo)
  useTravarRolagem()
  const ref = useRef(null)
  useEffect(() => { ref.current?.querySelector('input:not([type=file]),select,textarea')?.focus({ preventScroll: true }) }, [])
  return createPortal(
    <div className={`sobreposicao ${saindo ? 'saindo' : ''}`} onMouseDown={e => { if (e.target === e.currentTarget) aoFechar() }}>
      <aside className={`gaveta gaveta-${largura}`} role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <span className="gaveta-alca" aria-hidden="true" />
        <header className="gaveta-cab">
          {cabecalho}
          <div className="gaveta-titulos"><h2>{titulo}</h2>{subtitulo && <p>{subtitulo}</p>}</div>
          <button type="button" className="btn-icone btn-fechar" aria-label="Fechar" onClick={aoFechar}><Icon nome="fechar" /></button>
        </header>
        <div className="gaveta-corpo">{children}</div>
        {rodape && <footer className="gaveta-rodape">{rodape}</footer>}
      </aside>
    </div>,
    document.body,
  )
}

export function Dialogo({ titulo, children, aoFechar, acoes, icone, tom }) {
  const saindo = useContext(SaindoCtx)
  usarEsc(aoFechar, !saindo)
  useTravarRolagem()
  const ref = useRef(null)
  useEffect(() => { ref.current?.querySelector('textarea,input,button.btn-primario')?.focus({ preventScroll: true }) }, [])
  return createPortal(
    <div className={`sobreposicao centro ${saindo ? 'saindo' : ''}`} onMouseDown={e => { if (e.target === e.currentTarget) aoFechar() }}>
      <div className="dialogo" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        {icone && <span className={`dialogo-icone tom-${tom || 'info'}`}><Icon nome={icone} tamanho={22} /></span>}
        <h2>{titulo}</h2>
        <div className="dialogo-corpo">{children}</div>
        <div className="dialogo-acoes">{acoes}</div>
      </div>
    </div>,
    document.body,
  )
}

export function Aviso({ aviso, aoFechar }) {
  const saindo = useContext(SaindoCtx)
  if (!aviso) return null
  return (
    <div className={`aviso aviso-${aviso.tipo} ${saindo ? 'saindo' : ''}`} role="status">
      <span className="aviso-icone"><Icon nome={aviso.tipo === 'sucesso' ? 'check' : 'alerta'} tamanho={14} traco={2.2} /></span>
      <span>{aviso.texto}</span>
      <button type="button" className="btn-icone" aria-label="Fechar aviso" onClick={aoFechar}><Icon nome="fechar" tamanho={14} /></button>
    </div>
  )
}

// Zona para arrastar e soltar um arquivo (ou clicar e escolher).
export function ZonaArquivo({ aoEscolher, aceita, titulo, dica, desativado, ocupado, icone = 'enviar', compacta }) {
  const [sobre, setSobre] = useState(false)
  const profundidade = useRef(0)
  const soltar = e => {
    e.preventDefault(); profundidade.current = 0; setSobre(false)
    if (desativado) return
    const arquivo = e.dataTransfer?.files?.[0]
    if (arquivo) aoEscolher(arquivo)
  }
  return (
    <label className={`zona-arquivo ${sobre ? 'sobre' : ''} ${desativado ? 'desativado' : ''} ${ocupado ? 'ocupado' : ''} ${compacta ? 'compacta' : ''}`}
      onDragEnter={e => { e.preventDefault(); profundidade.current++; setSobre(true) }}
      onDragOver={e => e.preventDefault()}
      onDragLeave={() => { profundidade.current = Math.max(0, profundidade.current - 1); if (!profundidade.current) setSobre(false) }}
      onDrop={soltar}>
      <input type="file" className="sr" accept={aceita} disabled={desativado || ocupado}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) aoEscolher(f) }} />
      <span className="zona-icone"><Icon nome={ocupado ? 'atualizar' : icone} tamanho={compacta ? 18 : 24} className={ocupado ? 'girando' : ''} /></span>
      <span className="zona-texto"><strong>{titulo}</strong>{dica && <small>{dica}</small>}</span>
    </label>
  )
}

// ---------------------------------------------------------------- indicadores
// Cartões de indicador: número que conta ao aparecer, variação contra o período
// anterior e, quando houver, a tendência dos últimos meses.
export function CartoesKpi({ itens }) {
  return (
    <div className={`kpi-cartoes ${itens.length > 4 ? 'seis' : ''}`}>
      {itens.map((k, i) => (
        <section key={k.rotulo} className={`kpi-cartao ${i === 0 && !k.semDestaque ? 'kpi-destaque' : ''}`} aria-label={k.rotulo} style={{ '--n': i }}>
          <header>
            {k.icone && <span className="kpi-icone"><Icon nome={k.icone} tamanho={15} /></span>}
            <h2>{k.rotulo}</h2>
            {k.link && <a className="kpi-seta" href={k.link} aria-label={`Abrir ${k.rotulo.toLowerCase()}`}><Icon nome="direita" tamanho={14} /></a>}
          </header>
          <p className={`kpi-numero ${k.tom === 'negativo' ? 'tom-negativo' : ''}`}>
            {typeof k.valor === 'number' ? <NumeroAnimado valor={k.valor} formato={k.formato} /> : k.valor}
          </p>
          <div className="kpi-rodape">
            {k.variacao !== undefined && <Variacao pct={k.variacao} subirEBom={k.subirEBom !== false} sufixo={k.sufixo} />}
            {k.selo != null && <span className={`kpi-selo num ${k.tom ? `tom-${k.tom}` : ''}`}>{k.selo}</span>}
            <span className="kpi-legenda">{k.legenda}</span>
          </div>
          {k.serie && k.serie.length > 1 && <Sparkline valores={k.serie} rotulo={`${k.rotulo}: tendência dos últimos 12 meses`} formato={k.formatoSerie || k.formato} rotulos={k.rotulosSerie} />}
        </section>
      ))}
    </div>
  )
}

// Medidor: uma razão contra um limite (0–100%).
export function Medidor({ valor, tom = 'accent', rotulo: r }) {
  const [ref, visivel] = useVisivel()
  const pct = Math.max(0, Math.min(100, Number(valor) || 0))
  return (
    <span className={`medidor medidor-${tom}`} ref={ref} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={r}>
      <span style={{ width: visivel ? `${pct}%` : 0 }} />
    </span>
  )
}

// ---------------------------------------------------------------- barras em cápsula da semana
// Uma cápsula por dia (domingo a sábado). Dias que já passaram crescem até o valor;
// dias que ainda não chegaram aparecem listrados.
export function BarrasSemana({ dias: serie, rotulo: r, unidade = '' }) {
  const [ref, visivel] = useVisivel()
  const max = Math.max(...serie.map(d => d.valor || 0), 0)
  const pico = serie.findIndex(d => !d.futuro && d.valor === max && max > 0)
  return (
    <figure className="semana" role="img" aria-label={r} ref={ref}>
      <div className="semana-barras">
        {serie.map((d, i) => {
          const altura = max ? Math.max(8, Math.round((100 * d.valor) / max)) : 0
          return (
            <div key={d.chave} className={`semana-dia ${d.futuro ? 'futuro' : ''} ${d.hoje ? 'hoje' : ''}`}>
              <div className="semana-trilho" title={d.futuro ? `${d.nome}: ainda não chegou` : `${d.nome}: ${d.valor}${unidade}`}>
                {!d.futuro && d.valor > 0 && (
                  <span className={`semana-valor ${i === pico ? 'pico' : ''}`} style={{ height: visivel ? `${altura}%` : 0, transitionDelay: `${i * 55}ms` }} />
                )}
                {i === pico && <em className={`semana-etiqueta num ${visivel ? 'visivel' : ''}`}>{d.valor}</em>}
              </div>
              <span className="semana-nome">{d.letra}</span>
            </div>
          )
        })}
      </div>
    </figure>
  )
}

// Lista ranqueada com barra fina proporcional, que cresce ao aparecer.
export function ListaBarras({ linhas, formato = brl }) {
  const [ref, visivel] = useVisivel()
  const max = Math.max(...linhas.map(l => l.valor), 0)
  return (
    <ol className="lista-barras" ref={ref}>
      {linhas.map((l, i) => (
        <li key={l.chave || l.rotulo} title={`${l.rotulo}: ${formato(l.valor)}`}>
          <div className="lb-linha"><span className="lb-rotulo">{l.rotulo}</span><span className="lb-valor num">{formato(l.valor)}</span></div>
          {l.sub && <div className="lb-sub">{l.sub}</div>}
          <div className="lb-trilho"><span style={{ width: visivel && max ? `${(100 * l.valor) / max}%` : 0, transitionDelay: `${i * 70}ms` }} className={i === 0 ? 'lb-topo' : ''} /></div>
        </li>
      ))}
    </ol>
  )
}
