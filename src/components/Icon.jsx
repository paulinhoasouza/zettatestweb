// Conjunto próprio de ícones de contorno (16px, traço 1.5) — sem dependência externa.
const P = {
  visao: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  proposta: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  solicitacao: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  clientes: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
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
}

export default function Icon({ nome, tamanho = 16, className = '', titulo }) {
  return (
    <svg className={`ico ${className}`} width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden={titulo ? undefined : true} role={titulo ? 'img' : undefined}>
      {titulo && <title>{titulo}</title>}
      <path d={P[nome]} />
    </svg>
  )
}

// Marca da Zetta Propostas: um "Z" desenhado como uma seta de fluxo (do pedido à proposta).
export function Marca({ tamanho = 28 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true" className="marca">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M9.5 10h12.5L10 22h12.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22.5" cy="22" r="1.9" fill="#fff" />
    </svg>
  )
}
