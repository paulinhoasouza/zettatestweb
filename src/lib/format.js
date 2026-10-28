import { dataLocal, diasEntre } from './business.js'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const numero = new Intl.NumberFormat('pt-BR')
const numero1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const brl = n => moeda.format(Number(n) || 0)
export const num = n => numero.format(Number(n) || 0)
export const pct = n => (n == null ? '—' : `${numero1.format(n)}%`)
export const qtd = n => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(Number(n) || 0)

export const data = v => (v ? dataLocal(v).toLocaleDateString('pt-BR') : '—')
export const dataCurta = v => (v ? dataLocal(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '—')
export const hora = v => new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
export const dataHora = v => (v ? `${data(v)} às ${hora(v)}` : '—')
export const mesCurto = chave => {
  const [a, m] = chave.split('-').map(Number)
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}
export const mesLongo = (d = new Date()) => d.toLocaleDateString('pt-BR', { month: 'long' })

export const dias = n => (n === 1 ? '1 dia' : `${num(n)} dias`)
export const duracao = d => {
  if (d < 1) return 'menos de 1 dia'
  return dias(Math.round(d))
}

// "hoje", "ontem", "há 3 dias"
export function relativo(v, agora = new Date()) {
  if (!v) return '—'
  const d = diasEntre(new Date(v), agora)
  if (d <= 0) return 'hoje'
  if (d === 1) return 'ontem'
  return `há ${dias(d)}`
}

// Para validades: "vence hoje", "vence em 3 dias", "venceu há 2 dias"
export function prazo(v, agora = new Date(), verbo = 'vence') {
  if (!v) return '—'
  const d = diasEntre(agora, dataLocal(v))
  if (d === 0) return `${verbo} hoje`
  if (d > 0) return `${verbo} em ${dias(d)}`
  return `${verbo === 'vence' ? 'venceu' : verbo} há ${dias(-d)}`
}

export const iniciais = n => (n || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
