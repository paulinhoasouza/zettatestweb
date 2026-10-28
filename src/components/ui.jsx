import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { rotulo } from '../lib/business.js'
import { iniciais, brl, mesCurto, num } from '../lib/format.js'

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

// ---------------------------------------------------------------- status
const TOM = {
  Rascunho: 'neutro', Enviada: 'info', 'Em negociacao': 'aviso', Aprovada: 'positivo', Recusada: 'negativo', Cancelada: 'neutro',
  Aberta: 'info', 'Em analise': 'aviso', 'Em proposta': 'info', Concluida: 'positivo',
  Baixa: 'neutro', Media: 'neutro', Alta: 'aviso', Critica: 'negativo',
}
export function Pill({ children, tom }) {
  return <span className={`pill pill-${tom || TOM[children] || 'neutro'}`}>{rotulo(children)}</span>
}

export function Avatar({ nome, indice = 0 }) {
  return <span className={`avatar avatar-${indice % 4}`} aria-hidden="true">{iniciais(nome)}</span>
}

// ---------------------------------------------------------------- blocos
export function Bloco({ titulo, acao, children, className = '', id }) {
  return (
    <section className={`bloco ${className}`} aria-labelledby={id}>
      {(titulo || acao) && (
        <header className="bloco-cab">
          {titulo && <h2 id={id}>{titulo}</h2>}
          {acao}
        </header>
      )}
      {children}
    </section>
  )
}

export function Vazio({ children, acao }) {
  return <div className="vazio"><p>{children}</p>{acao}</div>
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

export function Abas({ abas, ativa, aoMudar, rotuloAcessivel }) {
  return (
    <div className="abas" role="tablist" aria-label={rotuloAcessivel}>
      {abas.map(a => (
        <button key={a.id} role="tab" type="button" aria-selected={ativa === a.id}
          className={ativa === a.id ? 'ativa' : ''} onClick={() => aoMudar(a.id)}>
          {a.rotulo}{a.conta != null && <span className="aba-conta num">{a.conta}</span>}
        </button>
      ))}
    </div>
  )
}

export function Segmentado({ opcoes, valor, aoMudar, rotuloAcessivel }) {
  return (
    <div className="segmentado" role="radiogroup" aria-label={rotuloAcessivel}>
      {opcoes.map(o => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} className={valor === o.id ? 'ativa' : ''}
          onClick={() => aoMudar(o.id)}>
          {o.icone && <Icon nome={o.icone} />}<span>{o.rotulo}</span>
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

// KPIs: um container dividido por linhas finas (label em cima, valor embaixo, legenda com a base)
export function Kpis({ itens }) {
  return (
    <dl className={`kpis kpis-${itens.length}`}>
      {itens.map(k => (
        <div key={k.rotulo} className={`kpi ${k.lider ? 'kpi-lider' : ''}`}>
          <dt>{k.rotulo}</dt>
          <dd className="kpi-valor num">{k.valor}</dd>
          {k.legenda && <dd className={`kpi-legenda ${k.tom ? `tom-${k.tom}` : ''}`}>{k.legenda}</dd>}
        </div>
      ))}
    </dl>
  )
}

// ---------------------------------------------------------------- painéis flutuantes
function usarEsc(fechar) {
  useEffect(() => {
    const f = e => { if (e.key === 'Escape') fechar() }
    document.addEventListener('keydown', f)
    return () => document.removeEventListener('keydown', f)
  }, [fechar])
}

export function Gaveta({ titulo, subtitulo, aoFechar, children, rodape, largura = 'media' }) {
  usarEsc(aoFechar)
  const ref = useRef(null)
  useEffect(() => { ref.current?.querySelector('input,select,textarea,button')?.focus() }, [])
  return (
    <div className="sobreposicao" onMouseDown={e => { if (e.target === e.currentTarget) aoFechar() }}>
      <aside className={`gaveta gaveta-${largura}`} role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <header className="gaveta-cab">
          <div><h2>{titulo}</h2>{subtitulo && <p>{subtitulo}</p>}</div>
          <button type="button" className="btn-icone" aria-label="Fechar" onClick={aoFechar}><Icon nome="fechar" /></button>
        </header>
        <div className="gaveta-corpo">{children}</div>
        {rodape && <footer className="gaveta-rodape">{rodape}</footer>}
      </aside>
    </div>
  )
}

export function Dialogo({ titulo, children, aoFechar, acoes }) {
  usarEsc(aoFechar)
  const ref = useRef(null)
  useEffect(() => { ref.current?.querySelector('textarea,input,button.btn-primario')?.focus() }, [])
  return (
    <div className="sobreposicao centro" onMouseDown={e => { if (e.target === e.currentTarget) aoFechar() }}>
      <div className="dialogo" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <h2>{titulo}</h2>
        <div className="dialogo-corpo">{children}</div>
        <div className="dialogo-acoes">{acoes}</div>
      </div>
    </div>
  )
}

export function Aviso({ aviso, aoFechar }) {
  if (!aviso) return null
  return (
    <div className={`aviso aviso-${aviso.tipo}`} role="status">
      <Icon nome={aviso.tipo === 'sucesso' ? 'check' : 'alerta'} />
      <span>{aviso.texto}</span>
      <button type="button" className="btn-icone" aria-label="Fechar aviso" onClick={aoFechar}><Icon nome="fechar" tamanho={14} /></button>
    </div>
  )
}

// ---------------------------------------------------------------- gráficos (SVG próprio)
// Colunas por mês: uma série, uma cor, 4 linhas de grade, escala arredondada acima do máximo.
function passoRedondo(max, divisoes = 4) {
  if (max <= 0) return 1000
  const bruto = max / divisoes
  const mag = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map(m => m * mag).find(p => p >= bruto)
  return passo
}
const reaisCurto = v => (v >= 1000 ? `${num(Math.round(v / 100) / 10)} mil` : num(v))

function useLargura(padrao = 640) {
  const ref = useRef(null)
  const [largura, setLargura] = useState(padrao)
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, largura]
}

export function ColunasMes({ dados, altura = 200, destaqueUltimo = true, rotulo: r }) {
  const [ref, L] = useLargura()
  const max = Math.max(...dados.map(d => d.valor), 0)
  const passo = passoRedondo(max)
  const topo = Math.max(passo * 4, passo * Math.ceil((max * 1.001) / passo))
  const A = altura, esq = 52, base = A - 24, cima = 8
  const larg = (L - esq) / dados.length
  const barra = Math.min(56, larg * 0.56)
  const y = v => base - ((base - cima) * v) / topo
  const marcas = []
  for (let v = 0; v <= topo + 0.001; v += passo) marcas.push(v)
  return (
    <figure className="grafico" ref={ref}>
      <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} role="img" aria-label={r}>
        {marcas.map(v => (
          <g key={v}>
            <line x1={esq} x2={L} y1={y(v)} y2={y(v)} className={v === 0 ? 'g-base' : 'g-grade'} />
            <text x={esq - 10} y={y(v) + 4} className="g-eixo" textAnchor="end">{reaisCurto(v)}</text>
          </g>
        ))}
        {dados.map((d, i) => {
          const h = base - y(d.valor)
          const centro = esq + i * larg + larg / 2
          const x = centro - barra / 2
          const ultimo = i === dados.length - 1
          const passoRotulo = L < 480 && dados.length > 6 ? 2 : 1
          return (
            <g key={d.mes}>
              {d.valor > 0 && <rect x={x} y={y(d.valor)} width={barra} height={h}
                className={destaqueUltimo && ultimo ? 'g-barra g-barra-atual' : 'g-barra'}><title>{`${mesCurto(d.mes)}: ${brl(d.valor)}`}</title></rect>}
              {(i % passoRotulo === (dados.length - 1) % passoRotulo) && <text x={centro} y={A - 6} className="g-eixo" textAnchor="middle">{mesCurto(d.mes)}</text>}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

// Lista ranqueada com barra fina proporcional (a primeira em tinta, as demais em cinza).
export function ListaBarras({ linhas, formato = brl }) {
  const max = Math.max(...linhas.map(l => l.valor), 0)
  return (
    <ol className="lista-barras">
      {linhas.map((l, i) => (
        <li key={l.chave || l.rotulo}>
          <div className="lb-linha"><span className="lb-rotulo">{l.rotulo}</span><span className="lb-valor num">{formato(l.valor)}</span></div>
          {l.sub && <div className="lb-sub">{l.sub}</div>}
          <div className="lb-trilho"><span style={{ width: max ? `${(100 * l.valor) / max}%` : 0 }} className={i === 0 ? 'lb-topo' : ''} /></div>
        </li>
      ))}
    </ol>
  )
}
