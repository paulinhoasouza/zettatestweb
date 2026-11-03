// Gráficos em SVG próprio (D-014), no padrão da skill de visualização de dados:
// marcas finas (barras até 24px com ponta arredondada, linhas de 2px), grade em
// linha fina, uma única escala por gráfico, dica ao passar o mouse ou focar com o
// teclado, legenda quando há duas séries e uma vista em tabela para cada gráfico.
// As cores vêm dos tokens --serie-*, --ordinal-*, --seq-* e --st-* (styles.css).
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { useTransicao, useVisivel } from '../lib/anima.js'
import { brl, num, mesCurto } from '../lib/format.js'

// ---------------------------------------------------------------- base
function useLargura(padrao = 600) {
  const ref = useRef(null)
  const [largura, setLargura] = useState(padrao)
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(240, Math.round(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, largura]
}

function passoRedondo(max, divisoes = 4) {
  if (max <= 0) return 1
  const bruto = max / divisoes
  const mag = 10 ** Math.floor(Math.log10(bruto))
  return [1, 2, 2.5, 5, 10].map(m => m * mag).find(p => p >= bruto)
}
function escala(max, divisoes = 4) {
  const passo = passoRedondo(max, divisoes)
  const topo = Math.max(passo * divisoes, passo * Math.ceil((max * 1.0001) / passo))
  const marcas = []
  for (let v = 0; v <= topo + passo / 1000; v += passo) marcas.push(Math.round(v * 1000) / 1000)
  return { topo, marcas }
}
export const reaisCurto = v => (Math.abs(v) >= 1e6 ? `${num(Math.round(v / 1e5) / 10)} mi` : Math.abs(v) >= 1000 ? `${num(Math.round(v / 100) / 10)} mil` : num(Math.round(v)))

// Coluna com 4px de raio na ponta e base reta.
function caminhoColuna(x, y, w, h, r = 4) {
  if (h <= 0) return ''
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

// Dica flutuante: o valor vem primeiro e em destaque; o nome da série, depois.
function Dica({ x, y, largura, titulo, linhas }) {
  const ref = useRef(null)
  const [w, setW] = useState(160)
  useEffect(() => { if (ref.current) setW(ref.current.offsetWidth) })
  const esquerda = Math.max(4, Math.min(largura - w - 4, x - w / 2))
  return (
    <div className="g-dica" ref={ref} style={{ left: esquerda, top: y }} role="status">
      {titulo && <strong className="g-dica-titulo">{titulo}</strong>}
      {linhas.map(l => (
        <span key={l.rotulo} className="g-dica-linha">
          {l.chave && <i className={`g-chave g-chave-${l.chave}`} aria-hidden="true" />}
          <b className="num">{l.valor}</b><span>{l.rotulo}</span>
        </span>
      ))}
    </div>
  )
}

// Alterna entre o gráfico e a mesma informação em tabela (acessível sem passar o mouse).
export function VistaGrafico({ tabela, children, rotulo }) {
  const [comoTabela, setComoTabela] = useState(false)
  return (
    <div className="vista-grafico">
      {comoTabela ? (
        <div className="g-tabela-moldura">
          <table className="tabela tabela-compacta g-tabela">
            <thead><tr>{tabela.colunas.map((c, i) => <th key={c} scope="col" className={i ? 'num' : ''}>{c}</th>)}</tr></thead>
            <tbody>{tabela.linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j} className={j ? 'num' : ''}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : children}
      <div className="g-rodape">
        <button type="button" className="g-alternar" onClick={() => setComoTabela(v => !v)} aria-pressed={comoTabela}
          aria-label={comoTabela ? `Ver ${rotulo || 'gráfico'} como gráfico` : `Ver ${rotulo || 'gráfico'} como tabela`}>
          <Icon nome={comoTabela ? 'relatorio' : 'tabela2'} tamanho={13} /><span>{comoTabela ? 'Ver gráfico' : 'Ver tabela'}</span>
        </button>
      </div>
    </div>
  )
}

export function Legenda({ itens }) {
  return (
    <ul className="g-legenda">
      {itens.map(i => <li key={i.rotulo}><i className={`g-chave g-chave-${i.chave}`} aria-hidden="true" />{i.rotulo}</li>)}
    </ul>
  )
}

// ---------------------------------------------------------------- colunas + linha (mesma escala)
// series: [{ id, rotulo, tipo: 'coluna' | 'linha', chave, valores: number[] }]; rotulos: string[] (eixo x)
export function GraficoColunasLinha({ rotulos, titulos, series, formato = brl, formatoEixo = reaisCurto, altura = 240, rotulo: r, destacarUltimo = true }) {
  const [ref, L] = useLargura()
  const [refVis, visivel] = useVisivel()
  const [ativo, setAtivo] = useState(null)
  const todos = series.flatMap(s => s.valores)
  const animados = useTransicao(todos, { ativo: visivel })
  const n = rotulos.length
  const { topo, marcas } = escala(Math.max(...todos, 0))
  const esq = Math.max(44, String(formatoEixo(topo)).length * 7 + 14), dir = 8, cima = 14, base = altura - 26
  const larg = (L - esq - dir) / n
  const colunas = series.filter(s => s.tipo === 'coluna')
  const barra = Math.min(24, (larg * 0.62) / Math.max(1, colunas.length))
  const y = v => base - ((base - cima) * v) / topo
  const cx = i => esq + i * larg + larg / 2
  let k = 0
  const valoresAnimados = series.map(s => s.valores.map(() => animados[k++] ?? 0))
  const largRotulo = Math.max(36, Math.max(...rotulos.map(r => String(r).length)) * 7 + 14)
  const passoRotulo = Math.ceil(n / Math.max(2, Math.floor((L - esq) / largRotulo)))
  const mover = e => {
    const caixa = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - caixa.left - esq) / larg)
    setAtivo(i >= 0 && i < n ? i : null)
  }
  const teclado = e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setAtivo(a => Math.min(n - 1, a == null ? n - 1 : a + 1)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setAtivo(a => Math.max(0, a == null ? n - 1 : a - 1)) }
    if (e.key === 'Escape') setAtivo(null)
  }
  const topoDica = ativo == null ? 0 : Math.max(0, Math.min(...series.map(s => y(s.valores[ativo] || 0))) - 12)
  return (
    <figure className="grafico" ref={el => { ref.current = el; refVis.current = el }}>
      <div className="g-area" style={{ height: altura }}>
        <svg width={L} height={altura} viewBox={`0 0 ${L} ${altura}`} role="img" aria-label={r} tabIndex={0}
          onPointerMove={mover} onPointerLeave={() => setAtivo(null)} onKeyDown={teclado} onFocus={() => setAtivo(a => a ?? n - 1)} onBlur={() => setAtivo(null)}>
          {marcas.map(v => (
            <g key={v}>
              <line x1={esq} x2={L - dir} y1={y(v)} y2={y(v)} className={v === 0 ? 'g-base' : 'g-grade'} />
              <text x={esq - 8} y={y(v) + 4} className="g-eixo" textAnchor="end">{formatoEixo(v)}</text>
            </g>
          ))}
          {ativo != null && <line className="g-cruz" x1={cx(ativo)} x2={cx(ativo)} y1={cima - 4} y2={base} />}
          {colunas.map((s, j) => {
            const vals = valoresAnimados[series.indexOf(s)]
            return vals.map((v, i) => {
              const x = cx(i) - (barra * colunas.length) / 2 - (colunas.length - 1) + j * (barra + 2)
              const atual = destacarUltimo && i === n - 1
              return <path key={`${s.id}-${i}`} d={caminhoColuna(x, y(v), barra, base - y(v))}
                className={`g-coluna g-chave-${s.chave} ${atual ? 'atual' : ''} ${ativo === i ? 'ativa' : ''} ${ativo != null && ativo !== i ? 'apagada' : ''}`} />
            })
          })}
          {series.filter(s => s.tipo === 'linha').map(s => {
            const vals = valoresAnimados[series.indexOf(s)]
            const pontos = vals.map((v, i) => `${cx(i)},${y(v)}`).join(' ')
            return (
              <g key={s.id} className={`g-serie-linha g-chave-${s.chave}`}>
                <polyline points={pontos} className="g-linha" />
                {vals.map((v, i) => (i === n - 1 || ativo === i) && <circle key={i} cx={cx(i)} cy={y(v)} r={4} className="g-ponto" />)}
              </g>
            )
          })}
          {rotulos.map((m, i) => (i % passoRotulo === (n - 1) % passoRotulo) && (
            <text key={m} x={cx(i)} y={altura - 7} className={`g-eixo ${ativo === i ? 'g-eixo-ativo' : ''}`} textAnchor="middle">{m}</text>
          ))}
        </svg>
        {ativo != null && (
          <Dica x={cx(ativo)} y={topoDica} largura={L} titulo={titulos?.[ativo] || rotulos[ativo]}
            linhas={series.map(s => ({ rotulo: s.rotulo, valor: formato(s.valores[ativo] || 0), chave: s.chave }))} />
        )}
      </div>
      {series.length > 1 && <Legenda itens={series.map(s => ({ rotulo: s.rotulo, chave: s.chave }))} />}
    </figure>
  )
}

// ---------------------------------------------------------------- colunas simples (uma série)
// itens: [{ chave, rotulo, titulo, valor, tom? }]; valor null = sem dado (não desenha)
export function Colunas({ itens, formato = brl, formatoEixo = reaisCurto, altura = 200, rotulo: r, media }) {
  const [ref, L] = useLargura()
  const [refVis, visivel] = useVisivel()
  const [ativo, setAtivo] = useState(null)
  const valores = itens.map(i => i.valor || 0)
  const animados = useTransicao(valores, { ativo: visivel })
  const n = itens.length
  const { topo, marcas } = escala(Math.max(...valores, 0), 3)
  const esq = Math.max(40, String(formatoEixo(topo)).length * 7 + 12), dir = 6, cima = 12, base = altura - 24
  const larg = (L - esq - dir) / Math.max(1, n)
  const barra = Math.max(3, Math.min(18, larg * 0.6))
  const y = v => base - ((base - cima) * v) / topo
  const cx = i => esq + i * larg + larg / 2
  const largRotulo = Math.max(30, Math.max(...itens.map(i => String(i.rotulo).length)) * 7 + 12)
  const passoRotulo = Math.ceil(n / Math.max(2, Math.floor((L - esq) / largRotulo)))
  const mover = e => {
    const caixa = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - caixa.left - esq) / larg)
    setAtivo(i >= 0 && i < n && itens[i].valor != null ? i : null)
  }
  const teclado = e => {
    const proximo = (de, passo) => { for (let i = de + passo; i >= 0 && i < n; i += passo) if (itens[i].valor != null) return i; return de }
    if (e.key === 'ArrowRight') { e.preventDefault(); setAtivo(a => proximo(a ?? -1, 1)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setAtivo(a => proximo(a ?? n, -1)) }
  }
  return (
    <figure className="grafico" ref={el => { ref.current = el; refVis.current = el }}>
      <div className="g-area" style={{ height: altura }}>
        <svg width={L} height={altura} viewBox={`0 0 ${L} ${altura}`} role="img" aria-label={r} tabIndex={0}
          onPointerMove={mover} onPointerLeave={() => setAtivo(null)} onKeyDown={teclado} onBlur={() => setAtivo(null)}>
          {marcas.map(v => (
            <g key={v}>
              <line x1={esq} x2={L - dir} y1={y(v)} y2={y(v)} className={v === 0 ? 'g-base' : 'g-grade'} />
              <text x={esq - 8} y={y(v) + 4} className="g-eixo" textAnchor="end">{formatoEixo(v)}</text>
            </g>
          ))}
          {itens.map((it, i) => it.valor != null && (
            <path key={it.chave} d={caminhoColuna(cx(i) - barra / 2, y(animados[i] || 0), barra, base - y(animados[i] || 0), Math.min(4, barra / 2))}
              className={`g-coluna g-chave-${it.tom || 'serie'} ${ativo === i ? 'ativa' : ''} ${ativo != null && ativo !== i ? 'apagada' : ''}`} />
          ))}
          {media != null && media > 0 && (
            <g className="g-media">
              <line x1={esq} x2={L - dir} y1={y(media)} y2={y(media)} />
              <text x={L - dir} y={y(media) - 6} textAnchor="end">média {formatoEixo(media)}</text>
            </g>
          )}
          {itens.map((it, i) => (i % passoRotulo === (n - 1) % passoRotulo) && (
            <text key={`r${it.chave}`} x={cx(i)} y={altura - 7} className={`g-eixo ${ativo === i ? 'g-eixo-ativo' : ''}`} textAnchor="middle">{it.rotulo}</text>
          ))}
        </svg>
        {ativo != null && <Dica x={cx(ativo)} y={Math.max(0, y(itens[ativo].valor) - 12)} largura={L} titulo={itens[ativo].titulo || itens[ativo].rotulo}
          linhas={[{ rotulo: itens[ativo].legenda || '', valor: formato(itens[ativo].valor) }]} />}
      </div>
    </figure>
  )
}

// ---------------------------------------------------------------- sparkline (cartões de indicador)
// Linha em cinza de contexto; o último ponto (período atual) na cor de destaque.
export function Sparkline({ valores, rotulo: r, formato = v => num(v), rotulos }) {
  const [ref, L] = useLargura(160)
  const [refVis, visivel] = useVisivel()
  const [ativo, setAtivo] = useState(null)
  const anim = useTransicao(valores, { ativo: visivel, duracao: 900 })
  const A = 34, pad = 5
  const max = Math.max(...valores), min = Math.min(...valores, 0)
  const amp = max - min || 1
  const x = i => pad + (i * (L - pad * 2)) / Math.max(1, valores.length - 1)
  const y = v => A - pad - ((v - min) / amp) * (A - pad * 2)
  const pontos = anim.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const ultimo = valores.length - 1
  const mover = e => {
    const caixa = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - caixa.left - pad) / (L - pad * 2)) * ultimo)
    setAtivo(Math.max(0, Math.min(ultimo, i)))
  }
  return (
    <div className="sparkline" ref={el => { ref.current = el; refVis.current = el }}>
      <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} role="img" aria-label={r} onPointerMove={mover} onPointerLeave={() => setAtivo(null)}>
        <polygon points={`${x(0)},${A - pad} ${pontos} ${x(ultimo)},${A - pad}`} className="sp-area" />
        <polyline points={pontos} className="sp-linha" />
        {ativo != null && <line x1={x(ativo)} x2={x(ativo)} y1={2} y2={A - 2} className="g-cruz" />}
        <circle cx={x(ativo ?? ultimo)} cy={y(anim[ativo ?? ultimo] ?? 0)} r={3.5} className="sp-ponto" />
      </svg>
      {ativo != null && <span className="sp-dica num">{rotulos?.[ativo] ? `${rotulos[ativo]}: ` : ''}<b>{formato(valores[ativo])}</b></span>}
    </div>
  )
}

// ---------------------------------------------------------------- funil (rampa ordinal)
// etapas: [{ id, rotulo, qtd, valor, daAnterior, doInicio }]
export function Funil({ etapas, formato = brl }) {
  const [ref, visivel] = useVisivel()
  const max = Math.max(...etapas.map(e => e.qtd), 0)
  return (
    <ol className="funil-g" ref={ref}>
      {etapas.map((e, i) => (
        <li key={e.id} style={{ '--i': i }}>
          {i > 0 && (
            <span className="funil-passo num" aria-label={`${e.daAnterior ?? 0}% seguiram para ${e.rotulo.toLowerCase()}`}>
              <Icon nome="baixo" tamanho={12} traco={2.2} />{e.daAnterior == null ? '—' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(e.daAnterior)}%`}
            </span>
          )}
          <div className="funil-cab">
            <span className="funil-rotulo">{e.rotulo}</span>
            <span className="funil-num num"><b>{num(e.qtd)}</b> · {formato(e.valor)}</span>
          </div>
          <div className="funil-trilho" title={`${e.rotulo}: ${num(e.qtd)} (${formato(e.valor)})`}>
            <span className={`funil-barra ordinal-${i + 1}`} style={{ width: visivel && max ? `${Math.max(2, (100 * e.qtd) / max)}%` : 0 }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

// ---------------------------------------------------------------- barra segmentada (parte do todo)
// partes: [{ id, rotulo, valor, tom (classe de cor), icone }]. Alta (28px) com o
// percentual dentro de cada bloco quando cabe; a legenda dá os nomes.
export function BarraSegmentada({ partes, formato = v => num(v), rotulo: r, legendaValores = true }) {
  const [ref, visivel] = useVisivel()
  const [ativo, setAtivo] = useState(null)
  const total = partes.reduce((s, p) => s + p.valor, 0)
  const pct1 = v => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(total ? (100 * v) / total : 0)
  const visiveis = partes.filter(p => p.valor > 0)
  return (
    <figure className="segbar" ref={ref}>
      <div className="segbar-barra" role="img" aria-label={`${r}: ${visiveis.map(p => `${p.rotulo} ${formato(p.valor)} (${pct1(p.valor)}%)`).join(', ')}`}>
        {total === 0 ? <span className="segbar-vazia" /> : visiveis.map((p, i) => {
          const largura = (100 * p.valor) / total
          return (
            <span key={p.id} className={`segbar-bloco ${p.tom} ${ativo === p.id ? 'ativo' : ''} ${ativo && ativo !== p.id ? 'apagado' : ''}`}
              style={{ flexGrow: visivel ? p.valor : 0.0001, transitionDelay: `${i * 60}ms` }} tabIndex={0}
              onPointerEnter={() => setAtivo(p.id)} onPointerLeave={() => setAtivo(null)} onFocus={() => setAtivo(p.id)} onBlur={() => setAtivo(null)}
              title={`${p.rotulo}: ${formato(p.valor)} (${pct1(p.valor)}%)`}>
              {largura >= 9 && <em>{pct1(p.valor)}%</em>}
            </span>
          )
        })}
      </div>
      <ul className="segbar-legenda">
        {partes.map(p => (
          <li key={p.id} className={ativo === p.id ? 'ativo' : ''} onPointerEnter={() => setAtivo(p.id)} onPointerLeave={() => setAtivo(null)}>
            <i className={`g-chave-bloco ${p.tom}`} aria-hidden="true">{p.icone && <Icon nome={p.icone} tamanho={10} traco={2.6} />}</i>
            <span>{p.rotulo}</span>
            {legendaValores && <b className="num">{formato(p.valor)}</b>}
          </li>
        ))}
      </ul>
    </figure>
  )
}

// ---------------------------------------------------------------- mapa de calor (atividade por dia)
// dias: [{ chave: 'AAAA-MM-DD', valor }]. Semanas em colunas, de domingo a sábado.
const NOMES_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export function MapaCalor({ dias, rotulo: r, unidade = ['movimentação', 'movimentações'] }) {
  const [ref, L] = useLargura()
  const [ativo, setAtivo] = useState(null)
  const vao = 3, esq = 30, cima = 18
  const totalSemanas = Math.ceil((dias.length + (dias.length ? new Date(`${dias[0].chave}T12:00:00`).getDay() : 0)) / 7)
  const celula = Math.max(11, Math.min(24, Math.floor((L - esq) / Math.max(1, totalSemanas)) - vao))
  const cabem = Math.max(8, Math.floor((L - esq) / (celula + vao)))
  const semanas = useMemo(() => {
    if (!dias.length) return []
    const primeira = new Date(`${dias[0].chave}T12:00:00`).getDay()
    const cel = [...Array(primeira).fill(null), ...dias]
    const s = []
    for (let i = 0; i < cel.length; i += 7) s.push(cel.slice(i, i + 7))
    return s.slice(-cabem)
  }, [dias, cabem])
  const valores = dias.map(d => d.valor).filter(v => v > 0).sort((a, b) => a - b)
  const corte = q => valores[Math.min(valores.length - 1, Math.floor(q * valores.length))] || 0
  const limites = [corte(0.25), corte(0.5), corte(0.75)]
  const nivel = v => (!v ? 0 : v <= limites[0] ? 1 : v <= limites[1] ? 2 : v <= limites[2] ? 3 : 4)
  const largura = esq + semanas.length * (celula + vao)
  const altura = cima + 7 * (celula + vao)
  const fmt = c => new Date(`${c}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/\./g, '')
  const mesDe = c => new Date(`${c}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return (
    <figure className="grafico mapa-calor" ref={ref}>
      <div className="g-area" style={{ height: altura }}>
        <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={r}>
          {[1, 3, 5].map(d => <text key={d} x={0} y={cima + d * (celula + vao) + 10} className="g-eixo g-eixo-p">{NOMES_DIA[d]}</text>)}
          {semanas.map((s, i) => {
            const primeiro = s.find(Boolean)
            const novoMes = primeiro && i < semanas.length - 1 && (i === 0 ? primeiro.chave.slice(8) <= '21' : primeiro.chave.slice(8) <= '07')
            return (
              <g key={i} transform={`translate(${esq + i * (celula + vao)}, 0)`}>
                {novoMes && <text x={0} y={11} className="g-eixo g-eixo-p">{mesDe(primeiro.chave)}</text>}
                {s.map((d, j) => d && (
                  <rect key={d.chave} x={0} y={cima + j * (celula + vao)} width={celula} height={celula} rx={Math.round(celula / 4)}
                    className={`mc-celula seq-${nivel(d.valor)} ${ativo?.chave === d.chave ? 'ativa' : ''}`} tabIndex={0}
                    onPointerEnter={() => setAtivo({ ...d, x: esq + i * (celula + vao) + celula / 2, y: cima + j * (celula + vao) })}
                    onFocus={() => setAtivo({ ...d, x: esq + i * (celula + vao) + celula / 2, y: cima + j * (celula + vao) })}
                    onPointerLeave={() => setAtivo(null)} onBlur={() => setAtivo(null)}>
                    <title>{`${fmt(d.chave)}: ${d.valor} ${d.valor === 1 ? unidade[0] : unidade[1]}`}</title>
                  </rect>
                ))}
              </g>
            )
          })}
        </svg>
        {ativo && <Dica x={ativo.x} y={Math.max(0, ativo.y - 8)} largura={Math.max(L, largura)} titulo={fmt(ativo.chave)}
          linhas={[{ valor: num(ativo.valor), rotulo: ativo.valor === 1 ? unidade[0] : unidade[1] }]} />}
      </div>
      <div className="mc-escala" aria-hidden="true">
        <span>Menos</span>{[0, 1, 2, 3, 4].map(n => <i key={n} className={`seq-${n}`} />)}<span>Mais</span>
      </div>
    </figure>
  )
}

// ---------------------------------------------------------------- barras horizontais com duas medidas
// Para tempo por etapa: uma barra por linha (rampa ordinal), valor na ponta.
export function BarrasEtapas({ linhas, formato }) {
  const [ref, visivel] = useVisivel()
  const max = Math.max(...linhas.map(l => l.valor || 0), 0)
  return (
    <ul className="barras-etapas" ref={ref}>
      {linhas.map((l, i) => (
        <li key={l.id} title={`${l.rotulo}: ${l.valor == null ? 'sem dados' : formato(l.valor)}`}>
          <span className="be-rotulo">{l.rotulo}<small>{l.sub}</small></span>
          <span className="be-trilho">
            <span className={`be-barra ordinal-${i + 1}`} style={{ width: visivel && max && l.valor != null ? `${Math.max(3, (100 * l.valor) / max)}%` : 0 }} />
            <b className="be-valor num">{l.valor == null ? '—' : formato(l.valor)}</b>
          </span>
        </li>
      ))}
    </ul>
  )
}

export const rotulosMeses = serie => serie.map(s => mesCurto(s.mes))
