import marcaPng from '../assets/marca/zettaminds-marca.png'
import logoPng from '../assets/marca/zettaminds-logo.png'
import logoBrancaPng from '../assets/marca/zettaminds-logo-branca.png'

// Conjunto próprio de ícones de contorno (16px, traço 1.5) — sem dependência externa.
const P = {
  visao: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  proposta: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  solicitacao: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  clientes: 'M3 21h18M5 21V7l7-4 7 4v14M10 21v-4h4v4M9 9.5h.01M15 9.5h.01M9 13.5h.01M15 13.5h.01',
  pessoas: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  pessoa: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  fechamento: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM9 15.5l2 2 4-4',
  calendario: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  planilha: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M8.5 12h7M8.5 15.5h7M12 12v7M8.5 19h7',
  enviar: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  olho: 'M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  certificado: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9 7 22l5-3 5 3-1.2-8.1',
  documento: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8.5 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4M5.5 16.5c.5-1.3 1.6-2 3-2s2.5.7 3 2M14 9.5h4.5M14 13h3',
  sol: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  lua: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  auto: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 2v20M12 7l5 5M12 12l5.5 5.5',
  sobe: 'M7 17 17 7M9 7h8v8',
  desce: 'M7 7l10 10M17 9v8H9',
  'check-circulo': 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3',
  'x-circulo': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15 9l-6 6M9 9l6 6',
  'menos-circulo': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 12h8',
  'alerta-circulo': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 7.5v5M12 16.5h.01',
  ajustes: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  tendencia: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  funil: 'M22 3H2l8 9.5V19l4 2v-8.5z',
  moeda: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  tabela2: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18',
  troca: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3',
  relatorio: 'M3 3v18h18M7 16v-4M12 16V8M17 16v-7',
  equipe: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  busca: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  mais: 'M12 5v14M5 12h14',
  atualizar: 'M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5',
  sair: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M4 6h16M4 12h16M4 18h16',
  fechar: 'M18 6 6 18M6 6l12 12',
  direita: 'M9 18l6-6-6-6',
  esquerda: 'M15 18l-6-6 6-6',
  baixo: 'M6 9l6 6 6-6',
  baixar: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  anexo: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  lixeira: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  imprimir: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  check: 'M20 6 9 17l-5-5',
  alerta: 'M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
  quadro: 'M3 3h5v18H3zM10 3h5v12h-5zM17 3h4v8h-4z',
  tabela: 'M3 5h18M3 12h18M3 19h18',
  editar: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
  relogio: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  externo: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  diagonal: 'M7 17 17 7M8 7h9v9',
  celular: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2',
  raio: 'M13 2 4 14h7l-1 8 9-12h-7z',
}

export default function Icon({ nome, tamanho = 16, className = '', titulo, traco = 1.7 }) {
  return (
    <svg className={`ico ${className}`} width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={traco} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={titulo ? undefined : true} role={titulo ? 'img' : undefined}>
      {titulo && <title>{titulo}</title>}
      <path d={P[nome]} />
    </svg>
  )
}


// Marca ZettaMinds (o símbolo), para espaços pequenos.
export function Marca({ tamanho = 28 }) {
  return <img src={marcaPng} width={Math.round(tamanho * 0.93)} height={tamanho} alt="" className="marca" />
}

// Logo completa ZettaMinds. `clara` = versão com "Zetta" em branco, para fundos escuros.
export function Logo({ altura = 36, clara = false }) {
  return <img src={clara ? logoBrancaPng : logoPng} height={altura} width={Math.round(altura * 3.05)} alt="ZettaMinds" className="logo" />
}

// Logo que acompanha a aparência: "Zetta" escuro no claro e branco no escuro.
export function LogoAuto({ altura = 36 }) {
  return (
    <>
      <img src={logoPng} height={altura} width={Math.round(altura * 3.05)} alt="ZettaMinds" className="logo logo-auto-clara" />
      <img src={logoBrancaPng} height={altura} width={Math.round(altura * 3.05)} alt="" aria-hidden="true" className="logo logo-auto-escura" />
    </>
  )
}
