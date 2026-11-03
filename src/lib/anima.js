// Movimento da interface: números que contam, gráficos que crescem, indicador
// deslizante dos controles segmentados e aparência clara/escura.
// Tudo respeita "reduzir movimento" do sistema.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const consulta = q => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null)

export function useMovimentoReduzido() {
  const [reduzido, setReduzido] = useState(() => Boolean(consulta('(prefers-reduced-motion: reduce)')?.matches))
  useEffect(() => {
    const m = consulta('(prefers-reduced-motion: reduce)')
    if (!m) return
    const f = e => setReduzido(e.matches)
    m.addEventListener?.('change', f)
    return () => m.removeEventListener?.('change', f)
  }, [])
  return reduzido
}

// Vira true na primeira vez que o elemento entra na tela (e não volta a false).
export function useVisivel(margem = '0px 0px -6% 0px') {
  const ref = useRef(null)
  const [visivel, setVisivel] = useState(false)
  useEffect(() => {
    if (visivel) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisivel(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisivel(true); io.disconnect() } }, { rootMargin: margem })
    io.observe(el)
    return () => io.disconnect()
  }, [visivel, margem])
  return [ref, visivel]
}

const desacelerar = t => 1 - Math.pow(1 - t, 4)

// Interpola uma lista de números do valor anterior até o alvo. Começa do zero
// quando fica ativo pela primeira vez (entrada), e anima cada mudança de dados.
export function useTransicao(alvo, { duracao = 720, ativo = true } = {}) {
  const reduzido = useMovimentoReduzido()
  const [atual, setAtual] = useState(() => alvo.map(() => 0))
  const anterior = useRef(alvo.map(() => 0))
  const quadro = useRef(0)
  const chave = alvo.map(v => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0)).join('|')
  useEffect(() => {
    if (!ativo) return undefined
    if (reduzido) { anterior.current = alvo; setAtual(alvo); return undefined }
    const de = anterior.current
    const inicio = performance.now()
    cancelAnimationFrame(quadro.current)
    const passo = agora => {
      const t = Math.min(1, (agora - inicio) / duracao)
      const e = desacelerar(t)
      const v = alvo.map((a, i) => { const x = de[i] ?? 0; return x + ((Number.isFinite(a) ? a : 0) - x) * e })
      anterior.current = v
      setAtual(v)
      if (t < 1) quadro.current = requestAnimationFrame(passo)
    }
    quadro.current = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, ativo, reduzido, duracao])
  return ativo ? atual : alvo.map(() => 0)
}

// Indicador que desliza até o item ativo de um trilho (controle segmentado, abas,
// menu lateral). O item ativo leva data-ativo="true".
export function useIndicador(ativo, ...deps) {
  const trilho = useRef(null)
  const [estilo, setEstilo] = useState({ opacity: 0 })
  const pronto = useRef(false)
  const medir = useCallback(() => {
    const el = trilho.current?.querySelector('[data-ativo="true"]')
    if (!el) { setEstilo(s => ({ ...s, opacity: 0 })); return }
    const s = { opacity: 1, width: el.offsetWidth, height: el.offsetHeight, transform: `translate3d(${el.offsetLeft}px, ${el.offsetTop}px, 0)` }
    if (!pronto.current) { s.transition = 'none'; pronto.current = true; requestAnimationFrame(() => setEstilo(x => ({ ...x, transition: undefined }))) }
    setEstilo(s)
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { medir() }, [ativo, medir, ...deps])
  useEffect(() => {
    const el = trilho.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => medir())
    ro.observe(el)
    Array.from(el.children).forEach(c => ro.observe(c))
    return () => ro.disconnect()
  }, [medir])
  return [trilho, estilo]
}

// ---------------------------------------------------------------- aparência
// "auto" segue o sistema; "clara" e "escura" ficam salvas neste navegador.
const CHAVE_APARENCIA = 'zp-aparencia'
export const APARENCIAS = ['auto', 'clara', 'escura']

export function lerAparencia() {
  try { const v = localStorage.getItem(CHAVE_APARENCIA); return APARENCIAS.includes(v) ? v : 'auto' } catch { return 'auto' }
}
export function aplicarAparencia(escolha) {
  const escuro = escolha === 'escura' || (escolha === 'auto' && Boolean(consulta('(prefers-color-scheme: dark)')?.matches))
  const raiz = document.documentElement
  raiz.dataset.tema = escuro ? 'escuro' : 'claro'
  raiz.style.colorScheme = escuro ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#0b0b0f' : '#f2f2f7')
}
// Uma escolha só para o app inteiro (todos os useAparencia veem a mesma).
let escolhaAtual = null
const ouvintes = new Set()
function definirAparencia(v) {
  escolhaAtual = v
  aplicarAparencia(v)
  try { localStorage.setItem(CHAVE_APARENCIA, v) } catch { /* sem armazenamento */ }
  ouvintes.forEach(f => f(v))
}
if (typeof window !== 'undefined') {
  consulta('(prefers-color-scheme: dark)')?.addEventListener?.('change', () => {
    if ((escolhaAtual ?? lerAparencia()) === 'auto') aplicarAparencia('auto')
  })
}
export function useAparencia() {
  const [escolha, setEscolha] = useState(() => escolhaAtual ?? (escolhaAtual = lerAparencia()))
  useEffect(() => {
    ouvintes.add(setEscolha)
    return () => { ouvintes.delete(setEscolha) }
  }, [])
  return [escolha, definirAparencia]
}
