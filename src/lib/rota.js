// Rotas por hash (#/propostas/123): funcionam no Cloudflare Pages sem configuração
// de redirecionamento e permitem compartilhar o link de uma proposta.
import { useEffect, useState } from 'react'

function ler() {
  const bruto = window.location.hash.replace(/^#\/?/, '') || 'visao-geral'
  const [caminho, busca = ''] = bruto.split('?')
  const partes = caminho.split('/').filter(Boolean)
  return { tela: partes[0], id: partes[1] || null, params: new URLSearchParams(busca), bruto }
}

export function useRota() {
  const [rota, setRota] = useState(ler)
  useEffect(() => {
    const aoMudar = () => { setRota(ler()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])
  return rota
}

export const ir = caminho => { window.location.hash = `#/${caminho}` }
export const href = caminho => `#/${caminho}`
