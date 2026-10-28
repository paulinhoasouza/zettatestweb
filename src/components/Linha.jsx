import { Vazio } from './ui.jsx'
import { data, hora } from '../lib/format.js'

// Linha do tempo de auditoria de um registro (o que aconteceu, quando e por quem).
export default function Linha({ eventos, mapas }) {
  const ordenados = [...eventos].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
  if (!ordenados.length) return <Vazio>Ainda não há histórico.</Vazio>
  return (
    <ol className="linha-tempo">
      {ordenados.map(h => (
        <li key={h.id}>
          <span className="lt-quando num">{data(h.criado_em)}<small>{hora(h.criado_em)}</small></span>
          <span className="lt-o-que"><strong>{h.acao}</strong>{h.descricao && <span> — {h.descricao}</span>}<small>{mapas.equipe[h.por]?.nome || 'Equipe'}</small></span>
        </li>
      ))}
    </ol>
  )
}
