import { useMemo, useState } from 'react'
import { useApp, TituloTela, Segmentado, Kpis, Bloco, ColunasMes, ListaBarras, Vazio, Pill, Botao, Campo } from '../components/ui.jsx'
import { href } from '../lib/rota.js'
import { taxaConversao, porMes, paraCsv, rotulo } from '../lib/business.js'
import { brl, num, pct, data } from '../lib/format.js'

const PERIODOS = [
  { id: 'mes', rotulo: 'Este mês' }, { id: '3m', rotulo: '3 meses' }, { id: '12m', rotulo: '12 meses' }, { id: 'livre', rotulo: 'Escolher datas' },
]

function intervalo(id, de, ate, agora) {
  const fim = new Date(agora); fim.setHours(23, 59, 59, 999)
  if (id === 'mes') return [new Date(agora.getFullYear(), agora.getMonth(), 1), fim, 1]
  if (id === '3m') return [new Date(agora.getFullYear(), agora.getMonth() - 2, 1), fim, 3]
  if (id === '12m') return [new Date(agora.getFullYear(), agora.getMonth() - 11, 1), fim, 12]
  const i = de ? new Date(`${de}T00:00:00`) : new Date(agora.getFullYear(), 0, 1)
  const f = ate ? new Date(`${ate}T23:59:59`) : fim
  const meses = (f.getFullYear() - i.getFullYear()) * 12 + f.getMonth() - i.getMonth() + 1
  return [i, f, Math.min(Math.max(meses, 1), 24)]
}

export default function Relatorios() {
  const { dados, mapas } = useApp()
  const agora = new Date()
  const [periodo, setPeriodo] = useState('3m')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [ini, fim, meses] = intervalo(periodo, de, ate, agora)
  const dentro = v => v && new Date(v) >= ini && new Date(v) <= fim

  const criadas = dados.propostas.filter(p => dentro(p.criado_em))
  const decididas = dados.propostas.filter(p => ['Aprovada', 'Recusada', 'Cancelada'].includes(p.status) && dentro(p.decidida_em))
  const aprovadas = decididas.filter(p => p.status === 'Aprovada')
  const recusadas = decididas.filter(p => p.status === 'Recusada')
  const valor = l => l.reduce((s, p) => s + Number(p.valor_total), 0)
  const taxa = taxaConversao(aprovadas.length, aprovadas.length + recusadas.length)
  const serie = porMes(dados.propostas.filter(p => p.status === 'Aprovada'), 'decidida_em', 'valor_total', meses, fim)

  const ranking = useMemo(() => {
    const soma = {}
    aprovadas.forEach(p => { const c = mapas.clienteDaProposta(p); if (c) soma[c.id] = (soma[c.id] || 0) + Number(p.valor_total) })
    return Object.entries(soma).map(([id, v]) => ({ chave: id, rotulo: mapas.clientes[id].nome, valor: v })).sort((a, b) => b.valor - a.valor).slice(0, 5)
  }, [aprovadas, mapas])
  const perdas = decididas.filter(p => p.status !== 'Aprovada').sort((a, b) => new Date(b.decidida_em) - new Date(a.decidida_em))

  function exportar() {
    const linhas = [...new Set([...criadas, ...decididas])].map(p => [
      p.numero, p.titulo, mapas.clienteDaProposta(p)?.nome || '', rotulo(p.status), String(p.valor_total).replace('.', ','),
      data(p.criado_em), p.enviada_em ? data(p.enviada_em) : '', p.decidida_em ? data(p.decidida_em) : '', p.motivo_encerramento || '',
    ])
    const csv = paraCsv(['Número', 'Título', 'Cliente', 'Status', 'Valor (R$)', 'Criada em', 'Enviada em', 'Decidida em', 'Motivo'], linhas)
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `zetta-propostas-${data(ini).replaceAll('/', '-')}-a-${data(fim).replaceAll('/', '-')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <TituloTela titulo="Relatórios" linha={`De ${data(ini)} a ${data(fim)} · aprovação e conversão pela data da decisão`}
        acoes={<Botao variante="secundario" icone="baixar" onClick={exportar}>Exportar CSV</Botao>} />
      <div className="barra-ferramentas">
        <Segmentado rotuloAcessivel="Período" valor={periodo} aoMudar={setPeriodo} opcoes={PERIODOS} />
        {periodo === 'livre' && (
          <div className="datas">
            <Campo rotulo="De">{id => <input id={id} type="date" value={de} onChange={e => setDe(e.target.value)} />}</Campo>
            <Campo rotulo="Até">{id => <input id={id} type="date" value={ate} min={de || undefined} onChange={e => setAte(e.target.value)} />}</Campo>
          </div>
        )}
      </div>

      <Kpis itens={[
        { rotulo: 'Valor aprovado', valor: brl(valor(aprovadas)), legenda: `${aprovadas.length} ${aprovadas.length === 1 ? 'proposta aprovada' : 'propostas aprovadas'}`, lider: true },
        { rotulo: 'Conversão', valor: pct(taxa), legenda: aprovadas.length + recusadas.length ? `${aprovadas.length} aprovadas de ${aprovadas.length + recusadas.length} decididas` : 'Nenhuma decisão no período' },
        { rotulo: 'Propostas criadas', valor: num(criadas.length), legenda: `${brl(valor(criadas))} cotados` },
        { rotulo: 'Recusadas e canceladas', valor: num(perdas.length), legenda: perdas.length ? `${brl(valor(perdas))} que não fecharam` : 'Nenhuma perda no período' },
      ]} />

      <div className="grade-relatorio">
        <Bloco titulo="Aprovado por mês" id="rel-mes" className="largo">
          <ColunasMes dados={serie} rotulo={`Valor aprovado por mês de ${data(ini)} a ${data(fim)}`} />
        </Bloco>
        <Bloco titulo="Clientes que mais aprovaram" id="rel-clientes">
          {ranking.length ? <ListaBarras linhas={ranking} /> : <Vazio>Nenhuma proposta aprovada no período.</Vazio>}
        </Bloco>
        <Bloco titulo="Por que não fechou" id="rel-perdas">
          {perdas.length ? (
            <ul className="lista-perdas">
              {perdas.slice(0, 5).map(p => (
                <li key={p.id}>
                  <a href={href(`propostas/${p.id}`)}>
                    <span className="lp-cab"><strong>{mapas.clienteDaProposta(p)?.nome || '—'}</strong><span className="num">{brl(p.valor_total)}</span></span>
                    <span className="lp-motivo">{p.motivo_encerramento || 'Motivo não informado'}</span>
                    <span className="lp-meta"><Pill>{p.status}</Pill> em {data(p.decidida_em)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : <Vazio>Nenhuma proposta recusada ou cancelada no período.</Vazio>}
        </Bloco>
      </div>
    </>
  )
}
