import { useMemo, useState } from 'react'
import { useApp, TituloTela, Abas, Segmentado, Busca, Pill, Vazio, Carregando } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { href, ir } from '../lib/rota.js'
import { STATUS_EM_ABERTO, STATUS_COM_CLIENTE, diasDesde, diasEntre, dataLocal, rotulo } from '../lib/business.js'
import { brl, data, dias, prazo } from '../lib/format.js'

const ABAS = {
  aberto: { rotulo: 'Em aberto', filtro: p => STATUS_EM_ABERTO.includes(p.status) },
  aprovadas: { rotulo: 'Aprovadas', filtro: p => p.status === 'Aprovada' },
  encerradas: { rotulo: 'Recusadas e canceladas', filtro: p => ['Recusada', 'Cancelada'].includes(p.status) },
  todas: { rotulo: 'Todas', filtro: () => true },
}
const COLUNAS = ['Rascunho', 'Enviada', 'Em negociacao', 'Aprovada']

export default function Propostas({ params }) {
  const { dados, mapas, estado } = useApp()
  const vista = params.get('vista') === 'quadro' ? 'quadro' : 'tabela'
  const aba = ABAS[params.get('aba')] ? params.get('aba') : 'aberto'
  const [q, setQ] = useState('')
  const agora = new Date()
  const mudar = (chave, valor) => { const p = new URLSearchParams(params); p.set(chave, valor); ir(`propostas?${p}`) }

  const busca = q.trim().toLowerCase()
  const casa = p => !busca || [p.numero, p.titulo, mapas.clienteDaProposta(p)?.nome].some(v => (v || '').toLowerCase().includes(busca))
  const filtradas = useMemo(
    () => dados.propostas.filter(p => ABAS[aba].filtro(p) && casa(p)).sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em)),
    [dados.propostas, aba, busca, mapas],
  )
  const emAberto = dados.propostas.filter(p => STATUS_EM_ABERTO.includes(p.status))
  const linha = `${emAberto.length} em aberto somando ${brl(emAberto.reduce((s, p) => s + Number(p.valor_total), 0))}`

  return (
    <>
      <TituloTela titulo="Propostas" linha={linha} acoes={<>
        <Segmentado rotuloAcessivel="Forma de exibir" valor={vista} aoMudar={v => mudar('vista', v)}
          opcoes={[{ id: 'tabela', rotulo: 'Tabela', icone: 'tabela' }, { id: 'quadro', rotulo: 'Quadro', icone: 'quadro' }]} />
        <a className="btn btn-primario" href={href('propostas/nova')}><Icon nome="mais" /><span>Nova proposta</span></a>
      </>} />

      {vista === 'tabela' ? (
        <>
          <Abas rotuloAcessivel="Situação das propostas" ativa={aba} aoMudar={v => mudar('aba', v)}
            abas={Object.entries(ABAS).map(([id, a]) => ({ id, rotulo: a.rotulo, conta: dados.propostas.filter(a.filtro).length }))} />
          <div className="barra-ferramentas">
            <Busca valor={q} aoMudar={setQ} rotulo="Buscar propostas" placeholder="Título, número ou cliente" />
            <span className="contagem num">{filtradas.length} {filtradas.length === 1 ? 'proposta' : 'propostas'}</span>
          </div>
          {estado.carregando && !estado.em ? <Carregando linhas={6} /> : filtradas.length ? (
            <div className="tabela-moldura">
              <table className="tabela">
                <thead><tr>
                  <th scope="col">Proposta</th><th scope="col">Status</th><th scope="col" className="num">Na etapa</th>
                  <th scope="col" className="num">Validade</th><th scope="col" className="num">Valor</th>
                </tr></thead>
                <tbody>
                  {filtradas.map(p => {
                    const naEtapa = diasDesde(p.status_desde, agora)
                    const vencida = STATUS_COM_CLIENTE.includes(p.status) && p.validade && diasEntre(agora, dataLocal(p.validade)) < 0
                    return (
                      <tr key={p.id} onClick={() => ir(`propostas/${p.id}`)} className="clicavel">
                        <td className="col-id">
                          <a href={href(`propostas/${p.id}`)} onClick={e => e.stopPropagation()}>{p.titulo}</a>
                          <small><span className="mono">{p.numero}</span> · {mapas.clienteDaProposta(p)?.nome || '—'}</small>
                        </td>
                        <td><Pill>{p.status}</Pill></td>
                        <td className="num" data-celular="na etapa há">{dias(naEtapa)}</td>
                        <td className={`num ${vencida ? 'tom-negativo' : ''}`} data-celular={p.validade ? 'válida até' : undefined}>{p.validade ? data(p.validade) : <span className="traco">—</span>}</td>
                        <td className="num forte">{brl(p.valor_total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Vazio acao={!busca && aba === 'aberto' ? <a className="btn btn-secundario" href={href('propostas/nova')}>Criar proposta</a> : null}>
              {busca ? `Nenhuma proposta encontrada para “${q.trim()}”.` : 'Nenhuma proposta nesta situação.'}
            </Vazio>
          )}
        </>
      ) : <Quadro propostas={dados.propostas.filter(casa)} mapas={mapas} agora={agora} q={q} setQ={setQ} />}
    </>
  )
}

function Quadro({ propostas, mapas, agora, q, setQ }) {
  const limiteAprovadas = new Date(agora.getTime() - 30 * 86400000)
  const encerradas = propostas.filter(p => ['Recusada', 'Cancelada'].includes(p.status)).length
  return (
    <>
      <div className="barra-ferramentas">
        <Busca valor={q} aoMudar={setQ} rotulo="Buscar propostas" placeholder="Título, número ou cliente" />
        <a className="link-sutil" href={href('propostas?aba=encerradas')}>{encerradas} recusadas ou canceladas</a>
      </div>
      <div className="quadro">
        {COLUNAS.map(st => {
          const lista = propostas
            .filter(p => p.status === st && (st !== 'Aprovada' || new Date(p.decidida_em) >= limiteAprovadas))
            .sort((a, b) => new Date(a.status_desde) - new Date(b.status_desde))
          const soma = lista.reduce((s, p) => s + Number(p.valor_total), 0)
          return (
            <section key={st} className="quadro-coluna" aria-label={rotulo(st)}>
              <header>
                <h2>{rotulo(st)}{st === 'Aprovada' && <small> · 30 dias</small>}</h2>
                <span className="num">{lista.length} · {brl(soma)}</span>
              </header>
              {lista.length ? lista.map(p => {
                const naEtapa = diasDesde(p.status_desde, agora)
                const faltam = p.validade ? diasEntre(agora, dataLocal(p.validade)) : null
                const alerta = STATUS_COM_CLIENTE.includes(p.status) && faltam != null && faltam <= 3
                return (
                  <a key={p.id} href={href(`propostas/${p.id}`)} className="cartao-proposta">
                    <strong>{p.titulo}</strong>
                    <span className="cp-cliente">{mapas.clienteDaProposta(p)?.nome || '—'}</span>
                    <span className="cp-valor num">{brl(p.valor_total)}</span>
                    <span className="cp-meta num">
                      <span><Icon nome="relogio" tamanho={13} /> {naEtapa === 0 ? 'entrou hoje' : `há ${dias(naEtapa)} na etapa`}</span>
                      {STATUS_COM_CLIENTE.includes(p.status) && p.validade && <span className={alerta ? 'tom-negativo' : ''}>{prazo(p.validade, agora)}</span>}
                    </span>
                  </a>
                )
              }) : <div className="quadro-vazio">Nenhuma proposta</div>}
            </section>
          )
        })}
      </div>
    </>
  )
}
