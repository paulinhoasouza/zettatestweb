import { useMemo, useState } from 'react'
import { useApp, TituloTela, Segmentado, Bloco, ListaBarras, Vazio, Pill, Botao, Campo, CartoesKpi, Avatar, Medidor } from '../components/ui.jsx'
import { GraficoColunasLinha, Colunas, Funil, BarraSegmentada, MapaCalor, BarrasEtapas, VistaGrafico } from '../components/graficos.jsx'
import Icon from '../components/Icon.jsx'
import { href, ir } from '../lib/rota.js'
import {
  paraCsv, rotulo, metricasComerciais, periodoAnterior, variacaoPct, serieMensal, funilDeConversao, tempoMedianoPorEtapa,
  desempenhoPorResponsavel, movimentosPorDia, serieComercial, baldesDoPeriodo, vencimentos, resumoFechamentos, chaveDia,
  diasNoIntervalo, situacaoDia, enviadoNoPrazo, minutosDoEnvio, mediana, podeVerTela, centavos, dataLocal,
} from '../lib/business.js'
import { brl, num, pct, data, dias as diasTxt, mesCurto, horario, dataCurta, pp } from '../lib/format.js'

const PERIODOS = [
  { id: 'mes', rotulo: 'Este mês' }, { id: '3m', rotulo: '3 meses' }, { id: '12m', rotulo: '12 meses' }, { id: 'livre', rotulo: 'Escolher datas' },
]
const SECOES = [
  { id: 'comercial', rotulo: 'Comercial', icone: 'proposta' },
  { id: 'pessoas', rotulo: 'Pessoas', icone: 'pessoas' },
  { id: 'fechamentos', rotulo: 'Fechamentos', icone: 'fechamento' },
]

function intervalo(id, de, ate, agora) {
  const fim = new Date(agora); fim.setHours(23, 59, 59, 999)
  if (id === 'mes') return [new Date(agora.getFullYear(), agora.getMonth(), 1), fim]
  if (id === '3m') return [new Date(agora.getFullYear(), agora.getMonth() - 2, 1), fim]
  if (id === '12m') return [new Date(agora.getFullYear(), agora.getMonth() - 11, 1), fim]
  const i = de ? new Date(`${de}T00:00:00`) : new Date(agora.getFullYear(), 0, 1)
  const f = ate ? new Date(`${ate}T23:59:59`) : fim
  return [i, f < i ? new Date(i.getTime() + 86399999) : f]
}

function baixarCsv(nome, colunas, linhas) {
  const url = URL.createObjectURL(new Blob(['﻿' + paraCsv(colunas, linhas)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const diasFmt = v => (v == null ? '—' : v < 1 ? 'menos de 1 dia' : diasTxt(Math.round(v)))
const inteiro = v => num(Math.round(v))
const pct0 = v => pct(v == null ? null : Math.round(v * 10) / 10)

export default function Relatorios({ params }) {
  const { eu } = useApp()
  const agora = new Date()
  const [periodo, setPeriodo] = useState('3m')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const secoes = SECOES.filter(s => podeVerTela(eu.perfil, s.id === 'comercial' ? 'relatorios' : s.id))
  const secao = secoes.some(s => s.id === params.get('secao')) ? params.get('secao') : secoes[0]?.id || 'comercial'
  const [ini, fim] = intervalo(periodo, de, ate, agora)
  const periodoTxt = `De ${data(ini)} a ${data(fim)}`

  return (
    <>
      <TituloTela titulo="Relatórios"
        linha={secao === 'pessoas' ? 'Situação de hoje dos treinamentos e documentos da equipe' : `${periodoTxt}${secao === 'comercial' ? ' · aprovação e conversão pela data da decisão' : ''}`}
        acoes={secoes.length > 1 && <Segmentado rotuloAcessivel="Assunto do relatório" valor={secao} aoMudar={v => ir(`relatorios?secao=${v}`)} opcoes={secoes} />} />
      {secao !== 'pessoas' && (
        <div className="barra-filtros">
          <Segmentado rotuloAcessivel="Período" valor={periodo} aoMudar={setPeriodo} opcoes={PERIODOS} />
          {periodo === 'livre' && (
            <div className="datas">
              <Campo rotulo="De">{id => <input id={id} type="date" value={de} onChange={e => setDe(e.target.value)} />}</Campo>
              <Campo rotulo="Até">{id => <input id={id} type="date" value={ate} min={de || undefined} onChange={e => setAte(e.target.value)} />}</Campo>
            </div>
          )}
        </div>
      )}
      {secao === 'comercial' && <Comercial ini={ini} fim={fim} agora={agora} />}
      {secao === 'pessoas' && <PessoasRelatorio agora={agora} />}
      {secao === 'fechamentos' && <FechamentosRelatorio ini={ini} fim={fim} agora={agora} />}
    </>
  )
}

// =============================================================================== comercial
function Comercial({ ini, fim, agora }) {
  const { dados, mapas } = useApp()
  const [modo, setModo] = useState('valor')
  const m = useMemo(() => metricasComerciais(dados.propostas, ini, fim), [dados.propostas, ini.getTime(), fim.getTime()])
  const [ai, af] = periodoAnterior(ini, fim)
  const ant = useMemo(() => metricasComerciais(dados.propostas, ai, af), [dados.propostas, ai.getTime(), af.getTime()])
  const doze = useMemo(() => {
    const aprovadas = dados.propostas.filter(p => p.status === 'Aprovada')
    const decididas = dados.propostas.filter(p => ['Aprovada', 'Recusada'].includes(p.status))
    const somaV = l => centavos(l.reduce((s, p) => s + Number(p.valor_total), 0))
    return {
      rotulos: serieMensal([], 'x', () => 0, 12, fim).map(s => mesCurto(s.mes)),
      aprovado: serieMensal(aprovadas, 'decidida_em', somaV, 12, fim).map(s => s.valor),
      conversao: serieMensal(decididas, 'decidida_em', l => (l.length ? (100 * l.filter(p => p.status === 'Aprovada').length) / l.length : 0), 12, fim).map(s => s.valor),
      ticket: serieMensal(aprovadas, 'decidida_em', l => (l.length ? somaV(l) / l.length : 0), 12, fim).map(s => s.valor),
      cotado: serieMensal(dados.propostas, 'criado_em', somaV, 12, fim).map(s => s.valor),
    }
  }, [dados.propostas, fim.getTime()])

  const serie = useMemo(() => serieComercial(dados.propostas, ini, fim), [dados.propostas, ini.getTime(), fim.getTime()])
  const funil = useMemo(() => funilDeConversao(m.criadas, dados.statusHistorico), [m.criadas, dados.statusHistorico])
  const etapas = useMemo(() => tempoMedianoPorEtapa(dados.statusHistorico, new Set(m.criadas.map(p => p.id)), agora), [m.criadas, dados.statusHistorico])
  const responsaveis = useMemo(() => desempenhoPorResponsavel(dados.propostas, mapas.solicitacoes, ini, fim), [dados.propostas, mapas, ini.getTime(), fim.getTime()])
  const atividade = useMemo(() => {
    const dur = Math.min(371, Math.round((fim - ini) / 86400000) + 1)
    return movimentosPorDia(dados.statusHistorico, dur, fim)
  }, [dados.statusHistorico, ini.getTime(), fim.getTime()])
  const ranking = useMemo(() => {
    const somaC = {}
    m.aprovadas.forEach(p => { const c = mapas.clienteDaProposta(p); if (c) somaC[c.id] = (somaC[c.id] || 0) + Number(p.valor_total) })
    return Object.entries(somaC).map(([id, v]) => ({ chave: id, rotulo: mapas.clientes[id].nome, valor: v, sub: `${m.aprovadas.filter(p => mapas.clienteDaProposta(p)?.id === id).length} aprovada(s)` }))
      .sort((a, b) => b.valor - a.valor).slice(0, 5)
  }, [m.aprovadas, mapas])
  const fatos = useMemo(() => {
    const total = atividade.reduce((t, d) => t + d.valor, 0)
    const pico = atividade.reduce((a, d) => (d.valor > (a?.valor ?? 0) ? d : a), null)
    const porSemana = Array(7).fill(0)
    atividade.forEach(d => { porSemana[dataLocal(d.chave).getDay()] += d.valor })
    const melhor = total ? porSemana.indexOf(Math.max(...porSemana)) : null
    return { total, pico, melhor, parados: atividade.filter(d => d.valor === 0).length }
  }, [atividade])
  const perdas = [...m.perdas].sort((a, b) => new Date(b.decidida_em) - new Date(a.decidida_em))
  const canceladas = m.decididas.filter(p => p.status === 'Cancelada')
  const porVal = modo === 'valor'

  function exportar() {
    const linhas = [...new Set([...m.criadas, ...m.decididas])].map(p => [
      p.numero, p.titulo, mapas.clienteDaProposta(p)?.nome || '', rotulo(p.status), String(p.valor_total).replace('.', ','),
      data(p.criado_em), p.enviada_em ? data(p.enviada_em) : '', p.decidida_em ? data(p.decidida_em) : '', p.motivo_encerramento || '',
    ])
    baixarCsv(`zetta-propostas-${data(ini).replaceAll('/', '-')}-a-${data(fim).replaceAll('/', '-')}.csv`,
      ['Número', 'Título', 'Cliente', 'Status', 'Valor (R$)', 'Criada em', 'Enviada em', 'Decidida em', 'Motivo'], linhas)
  }

  return (
    <>
      <CartoesKpi itens={[
          { rotulo: 'Valor aprovado', icone: 'check-circulo', valor: m.valorAprovado, formato: brl, variacao: variacaoPct(m.valorAprovado, ant.valorAprovado), legenda: `${m.aprovadas.length} ${m.aprovadas.length === 1 ? 'aprovada' : 'aprovadas'} · vs período anterior`, serie: doze.aprovado, rotulosSerie: doze.rotulos },
          { rotulo: 'Conversão', icone: 'funil', valor: m.conversao ?? '—', formato: pct0, variacao: m.conversao != null && ant.conversao != null ? Math.round((m.conversao - ant.conversao) * 10) / 10 : null, sufixo: ' p.p.', legenda: m.aprovadas.length + m.recusadas.length ? `${m.aprovadas.length} de ${m.aprovadas.length + m.recusadas.length} decididas` : 'nenhuma decisão no período', serie: doze.conversao, rotulosSerie: doze.rotulos, formatoSerie: pct0 },
          { rotulo: 'Ticket médio', icone: 'moeda', valor: m.ticketMedio ?? '—', formato: brl, variacao: variacaoPct(m.ticketMedio || 0, ant.ticketMedio || 0), legenda: 'por proposta aprovada', serie: doze.ticket, rotulosSerie: doze.rotulos },
          { rotulo: 'Ciclo de venda', icone: 'relogio', valor: m.cicloMediano ?? '—', formato: diasFmt, variacao: m.cicloMediano != null && ant.cicloMediano != null ? variacaoPct(m.cicloMediano, ant.cicloMediano) : null, subirEBom: false, legenda: 'mediana da criação à aprovação' },
          { rotulo: 'Valor cotado', icone: 'proposta', valor: m.valorCotado, formato: brl, variacao: variacaoPct(m.valorCotado, ant.valorCotado), legenda: `${m.criadas.length} ${m.criadas.length === 1 ? 'proposta criada' : 'propostas criadas'}`, serie: doze.cotado, rotulosSerie: doze.rotulos },
          { rotulo: 'Não fechou', icone: 'x-circulo', valor: m.valorPerdido, formato: brl, variacao: variacaoPct(m.valorPerdido, ant.valorPerdido), subirEBom: false, legenda: `${m.perdas.length} ${m.perdas.length === 1 ? 'recusada ou cancelada' : 'recusadas ou canceladas'}` },
      ]} />

      <div className="grade-relatorio">
        <Bloco titulo={serie.granularidade === 'semana' ? 'Evolução por semana' : 'Evolução por mês'} id="rel-evolucao" className="largo"
          sub={porVal ? 'Valor aprovado (pela data da decisão) e valor cotado (pela data de criação), na mesma escala.' : 'Propostas aprovadas e propostas criadas, na mesma escala.'}
          acao={<Segmentado pequeno rotuloAcessivel="Medida" valor={modo} aoMudar={setModo} opcoes={[{ id: 'valor', rotulo: 'Valor' }, { id: 'quantidade', rotulo: 'Quantidade' }]} />}>
          <VistaGrafico rotulo="a evolução" tabela={{
            colunas: [serie.granularidade === 'semana' ? 'Semana' : 'Mês', 'Aprovado', 'Cotado', 'Aprovadas', 'Criadas'],
            linhas: serie.pontos.map(p => [p.titulo, brl(p.aprovado), brl(p.cotado), num(p.nAprovadas), num(p.nCriadas)]),
          }}>
            <GraficoColunasLinha rotulos={serie.pontos.map(p => p.rotulo)} titulos={serie.pontos.map(p => p.titulo)}
              formato={porVal ? brl : inteiro} formatoEixo={porVal ? undefined : inteiro} destacarUltimo={false}
              rotulo={`Evolução de ${periodoTexto(ini, fim)}: aprovado e cotado`}
              series={[
                { id: 'aprovado', rotulo: porVal ? 'Valor aprovado' : 'Aprovadas', tipo: 'coluna', chave: 'serie', valores: serie.pontos.map(p => (porVal ? p.aprovado : p.nAprovadas)) },
                { id: 'cotado', rotulo: porVal ? 'Valor cotado' : 'Criadas', tipo: serie.granularidade === 'semana' ? 'coluna' : 'linha', chave: 'contexto', valores: serie.pontos.map(p => (porVal ? p.cotado : p.nCriadas)) },
              ]} />
          </VistaGrafico>
        </Bloco>

        <Bloco titulo="Funil de conversão" id="rel-funil" sub="Das propostas criadas no período, quantas chegaram a cada etapa.">
          {m.criadas.length ? (
            <VistaGrafico rotulo="o funil" tabela={{ colunas: ['Etapa', 'Propostas', 'Valor', 'Da etapa anterior'], linhas: funil.map(e => [e.rotulo, num(e.qtd), brl(e.valor), e.daAnterior == null ? '—' : pct(e.daAnterior)]) }}>
              <Funil etapas={funil} />
            </VistaGrafico>
          ) : <Vazio icone="funil">Nenhuma proposta criada no período.</Vazio>}
        </Bloco>

        <Bloco titulo="Desfecho das decididas" id="rel-desfecho" sub="Propostas que receberam a decisão final no período.">
          {m.decididas.length ? (
            <>
              <BarraSegmentada rotulo="Desfecho das propostas decididas" formato={v => `${num(v)} ${v === 1 ? 'proposta' : 'propostas'}`} partes={[
                { id: 'aprovadas', rotulo: 'Aprovadas', valor: m.aprovadas.length, tom: 'st-bom', icone: 'check' },
                { id: 'recusadas', rotulo: 'Recusadas', valor: m.recusadas.length, tom: 'st-critico', icone: 'fechar' },
                { id: 'canceladas', rotulo: 'Canceladas', valor: canceladas.length, tom: 'st-neutro', icone: 'menos-circulo' },
              ]} />
              <div className="rel-fatos">
                <div className="rel-fato"><span>Aprovado</span><strong className="num">{brl(m.valorAprovado)}</strong></div>
                <div className="rel-fato"><span>Não fechou</span><strong className="num">{brl(m.valorPerdido)}</strong></div>
                <div className="rel-fato"><span>Ganho sobre o decidido</span><strong className="num">{pct0(m.valorAprovado + m.valorPerdido ? (100 * m.valorAprovado) / (m.valorAprovado + m.valorPerdido) : null)}</strong></div>
              </div>
            </>
          ) : <Vazio icone="check-circulo">Nenhuma decisão no período.</Vazio>}
        </Bloco>

        <Bloco titulo="Tempo em cada etapa" id="rel-etapas" sub="Mediana de dias que as propostas criadas no período ficaram em cada etapa.">
          {etapas.some(e => e.n) ? (
            <VistaGrafico rotulo="o tempo por etapa" tabela={{ colunas: ['Etapa', 'Mediana', 'Passagens'], linhas: etapas.map(e => [rotulo(e.status), diasFmt(e.mediana), num(e.n)]) }}>
              <BarrasEtapas formato={diasFmt} linhas={etapas.map(e => ({ id: e.status, rotulo: rotulo(e.status), sub: e.n ? `${e.n} ${e.n === 1 ? 'passagem' : 'passagens'}` : 'sem passagens encerradas', valor: e.mediana }))} />
            </VistaGrafico>
          ) : <Vazio icone="relogio">Ainda não há etapas encerradas para medir no período.</Vazio>}
        </Bloco>

        <Bloco titulo="Desempenho por responsável" id="rel-resp" sub="Pelo responsável da solicitação de cada proposta.">
          {responsaveis.length ? (
            <div className="g-tabela-moldura">
              <table className="tabela tabela-resp">
                <thead><tr><th scope="col">Pessoa</th><th scope="col" className="num">Criadas</th><th scope="col" className="num">Aprovadas</th><th scope="col" className="num">Aprovado</th><th scope="col" className="num">Conversão</th></tr></thead>
                <tbody>
                  {responsaveis.map(r => (
                    <tr key={r.id || 'sem'}>
                      <td><span className="col-pessoa"><Avatar nome={mapas.equipe[r.id]?.nome || '?'} tamanho="p" /><strong>{mapas.equipe[r.id]?.nome || 'Sem responsável'}</strong></span></td>
                      <td className="num">{num(r.criadas)}</td>
                      <td className="num">{num(r.aprovadas)}</td>
                      <td className="num forte">{brl(r.valorAprovado)}</td>
                      <td className="num"><span className="resp-conv">{pct0(r.conversao)}{r.conversao != null && <Medidor valor={r.conversao} rotulo={`Conversão de ${mapas.equipe[r.id]?.nome || 'sem responsável'}`} />}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Vazio icone="pessoa">Nenhuma proposta no período.</Vazio>}
        </Bloco>

        <Bloco titulo="Clientes que mais aprovaram" id="rel-clientes">
          {ranking.length ? <ListaBarras linhas={ranking} /> : <Vazio icone="clientes">Nenhuma proposta aprovada no período.</Vazio>}
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
          ) : <Vazio icone="x-circulo">Nenhuma proposta recusada ou cancelada no período.</Vazio>}
        </Bloco>

        <Bloco titulo="Atividade do funil" id="rel-atividade" className="largo" sub="Aberturas, criações, envios e decisões por dia. Passe o mouse em um dia para ver o número."
          acao={<Botao variante="secundario" tamanho="mini" icone="baixar" onClick={exportar}>Exportar CSV</Botao>}>
          <div className="atividade">
            <MapaCalor dias={atividade} rotulo={`Movimentações por dia de ${data(ini)} a ${data(fim)}`} />
            <dl className="atividade-fatos">
              <div><dt>Movimentações no período</dt><dd className="num">{num(fatos.total)}</dd></div>
              <div><dt>Dia mais movimentado</dt><dd>{fatos.pico ? <>{dataCurta(fatos.pico.chave)} <small>· {fatos.pico.valor}</small></> : '—'}</dd></div>
              <div><dt>Dia da semana mais ativo</dt><dd>{fatos.melhor == null ? '—' : ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][fatos.melhor]}</dd></div>
              <div><dt>Dias sem movimento</dt><dd className="num">{num(fatos.parados)} <small>de {num(atividade.length)}</small></dd></div>
            </dl>
          </div>
        </Bloco>
      </div>
    </>
  )
}

const periodoTexto = (ini, fim) => `${data(ini)} a ${data(fim)}`

// =============================================================================== pessoas
function PessoasRelatorio({ agora }) {
  const { dados, estado } = useApp()
  const itens = useMemo(() => vencimentos(dados, agora), [dados])
  if (dados.pendente04) return <AvisoMigracao />
  const ativos = dados.funcionarios.filter(f => f.situacao === 'Ativo').length
  const afastados = dados.funcionarios.filter(f => f.situacao === 'Afastado').length
  const conta = c => itens.filter(i => i.codigo === c).length
  const comValidade = itens.filter(i => i.codigo !== 'sem-validade')
  const emDiaPct = comValidade.length ? (100 * conta('em-dia')) / comValidade.length : null
  const hoje = chaveDia(agora)
  const meses = Array.from({ length: 12 }, (_, i) => { const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  const porMesV = meses.map(mes => {
    const lista = itens.filter(i => i.validade && i.validade >= hoje && i.validade.slice(0, 7) === mes)
    return { chave: mes, rotulo: mesCurto(mes), titulo: dataLocal(`${mes}-01`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), valor: lista.length, legenda: lista.length === 1 ? 'item vence' : 'itens vencem' }
  })
  const setores = {}
  itens.filter(i => i.codigo === 'vencido' || i.codigo === 'vence').forEach(i => { const s = i.funcionario.setor || 'Sem setor'; setores[s] = (setores[s] || 0) + 1 })
  const rankingSetor = Object.entries(setores).map(([s, v]) => ({ chave: s, rotulo: s, valor: v })).sort((a, b) => b.valor - a.valor)
  const urgentes = itens.filter(i => i.codigo === 'vencido' || i.codigo === 'vence').slice(0, 8)

  if (!dados.funcionarios.length && !estado.carregando) {
    return <Vazio icone="pessoas" acao={<a className="btn btn-primario" href={href('pessoas?abrir=novo')}>Cadastrar funcionário</a>}>Nenhum funcionário cadastrado ainda.</Vazio>
  }
  function exportar() {
    baixarCsv(`zetta-vencimentos-${hoje}.csv`, ['Funcionário', 'Setor', 'Tipo', 'Item', 'Validade', 'Situação'],
      itens.map(i => [i.funcionario.nome, i.funcionario.setor || '', i.categoria === 'treinamento' ? 'Treinamento' : 'Documento', i.nome, i.validade ? data(i.validade) : 'Sem validade',
        { vencido: 'Vencido', vence: 'Vence em até 30 dias', 'em-dia': 'Em dia', 'sem-validade': 'Sem validade' }[i.codigo]]))
  }
  return (
    <>
      <CartoesKpi itens={[
        { rotulo: 'Funcionários ativos', icone: 'pessoas', valor: ativos, formato: inteiro, legenda: afastados ? `${afastados} ${afastados === 1 ? 'afastado' : 'afastados'}` : 'nenhum afastado', link: href('pessoas') },
        { rotulo: 'Itens em dia', icone: 'check-circulo', valor: emDiaPct ?? '—', formato: pct0, legenda: `${conta('em-dia')} de ${comValidade.length} com validade` },
        { rotulo: 'Vencem em 30 dias', icone: 'relogio', valor: conta('vence'), formato: inteiro, tom: conta('vence') ? 'aviso' : null, legenda: 'treinamentos e documentos', link: href('pessoas?vista=vencimentos') },
        { rotulo: 'Vencidos', icone: 'alerta-circulo', valor: conta('vencido'), formato: inteiro, tom: conta('vencido') ? 'negativo' : null, legenda: conta('vencido') ? 'precisam de renovação' : 'nada vencido', link: href('pessoas?vista=vencimentos&filtro=vencido') },
      ]} />
      <div className="grade-relatorio">
        <Bloco titulo="Situação dos treinamentos e documentos" id="relp-situacao" sub="Só o registro mais recente de cada item vale; desligados não contam.">
          <BarraSegmentada rotulo="Situação dos itens da equipe" formato={v => `${num(v)} ${v === 1 ? 'item' : 'itens'}`} partes={[
            { id: 'em-dia', rotulo: 'Em dia', valor: conta('em-dia'), tom: 'st-bom', icone: 'check' },
            { id: 'vence', rotulo: 'Vence em até 30 dias', valor: conta('vence'), tom: 'st-aviso', icone: 'relogio' },
            { id: 'vencido', rotulo: 'Vencido', valor: conta('vencido'), tom: 'st-critico', icone: 'alerta' },
            { id: 'sem', rotulo: 'Sem validade', valor: conta('sem-validade'), tom: 'st-neutro', icone: 'menos-circulo' },
          ]} />
        </Bloco>
        <Bloco titulo="Pendências por setor" id="relp-setor" sub="Itens vencidos ou vencendo em até 30 dias.">
          {rankingSetor.length ? <ListaBarras linhas={rankingSetor} formato={v => `${num(v)} ${v === 1 ? 'item' : 'itens'}`} /> : <Vazio icone="check-circulo">Nenhuma pendência. Tudo em dia.</Vazio>}
        </Bloco>
        <Bloco titulo="Vencimentos nos próximos 12 meses" id="relp-meses" className="largo" sub="Quantos treinamentos e documentos vencem em cada mês, para planejar as renovações."
          acao={<Botao variante="secundario" tamanho="mini" icone="baixar" onClick={exportar}>Exportar CSV</Botao>}>
          <VistaGrafico rotulo="os vencimentos por mês" tabela={{ colunas: ['Mês', 'Itens que vencem'], linhas: porMesV.map(p => [p.titulo, num(p.valor)]) }}>
            <Colunas itens={porMesV} formato={v => `${num(v)}`} formatoEixo={inteiro} rotulo="Itens que vencem por mês nos próximos 12 meses" />
          </VistaGrafico>
        </Bloco>
        <Bloco titulo="Renovar primeiro" id="relp-urgentes" className="largo" acao={<a className="link-sutil" href={href('pessoas?vista=vencimentos')}>Ver todos os vencimentos</a>}>
          {urgentes.length ? (
            <ul className="lista-simples">
              {urgentes.map(i => (
                <li key={i.id}>
                  <a href={href(`pessoas?abrir=${i.funcionario.id}`)}>
                    <span className="ls-id"><strong>{i.nome}</strong><small>{i.funcionario.nome} · {i.funcionario.cargo || i.funcionario.setor || '—'}</small></span>
                    <Pill tom={i.codigo === 'vencido' ? 'negativo' : 'aviso'}>{i.dias < 0 ? `Venceu há ${diasTxt(-i.dias)}` : i.dias === 0 ? 'Vence hoje' : `Vence em ${diasTxt(i.dias)}`}</Pill>
                  </a>
                </li>
              ))}
            </ul>
          ) : <Vazio icone="check-circulo">Nada vencido ou vencendo em 30 dias.</Vazio>}
        </Bloco>
      </div>
    </>
  )
}

// =============================================================================== fechamentos
function FechamentosRelatorio({ ini, fim, agora }) {
  const { dados, mapas } = useApp()
  const aj = dados.fechamentoAjustes
  const de = chaveDia(ini), ate = chaveDia(fim)
  const r = useMemo(() => resumoFechamentos(dados.fechamentos, aj, de, ate, agora), [dados.fechamentos, aj, de, ate])
  const [ai, af] = periodoAnterior(ini, fim)
  const rAnt = useMemo(() => resumoFechamentos(dados.fechamentos, aj, chaveDia(ai), chaveDia(af), agora), [dados.fechamentos, aj, ai.getTime(), af.getTime()])
  const doPeriodo = dados.fechamentos.filter(f => f.data >= de && f.data <= ate && f.status !== 'Sem expediente')
  const porPessoa = useMemo(() => {
    const g = {}
    doPeriodo.forEach(f => { (g[f.enviado_por] = g[f.enviado_por] || []).push(f) })
    return Object.entries(g).map(([id, l]) => ({ id, n: l.length, noPrazo: l.filter(f => enviadoNoPrazo(f, aj)).length, horario: mediana(l.map(minutosDoEnvio)) })).sort((a, b) => b.n - a.n)
  }, [doPeriodo, aj])
  const { granularidade, baldes } = baldesDoPeriodo(ini, fim)
  const longo = Math.round((fim - ini) / 86400000) > 62
  const fim2 = ate > chaveDia(agora) ? chaveDia(agora) : ate
  const porData = new Map(dados.fechamentos.map(f => [f.data, f]))
  const colunasDia = longo
    ? baldes.map(b => { const l = doPeriodo.filter(f => f.data >= chaveDia(b.ini) && f.data <= chaveDia(b.fim) && f.valor_total != null); return { chave: b.chave, rotulo: b.rotulo, titulo: b.titulo, valor: l.length ? centavos(l.reduce((s, f) => s + Number(f.valor_total), 0)) : null, legenda: `${l.length} ${l.length === 1 ? 'fechamento' : 'fechamentos'}` } })
    : (de <= fim2 ? diasNoIntervalo(de, fim2) : []).map(k => { const f = porData.get(k); return { chave: k, rotulo: k.slice(8), titulo: dataCurta(k), valor: f && f.valor_total != null ? Number(f.valor_total) : null, legenda: f ? rotulo(f.status) : '' } })
  const faltando = r.diasAtrasados.slice(-8).reverse()
  const divergentes = doPeriodo.filter(f => f.status === 'Divergente')

  if (dados.pendente04) return <AvisoMigracao />
  function exportar() {
    const lista = dados.fechamentos.filter(f => f.data >= de && f.data <= ate).sort((a, b) => a.data.localeCompare(b.data))
    baixarCsv(`zetta-fechamentos-${de}-a-${ate}.csv`, ['Data', 'Situação', 'Total (R$)', 'Enviado por', 'Primeiro envio', 'No prazo', 'Conferido por', 'Observações'],
      lista.map(f => [data(f.data), rotulo(f.status), f.valor_total == null ? '' : String(f.valor_total).replace('.', ','), mapas.equipe[f.enviado_por]?.nome || '',
        f.status === 'Sem expediente' ? '' : `${data(f.primeiro_envio_em)} ${new Date(f.primeiro_envio_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        f.status === 'Sem expediente' ? '' : enviadoNoPrazo(f, aj) ? 'Sim' : 'Não', mapas.equipe[f.conferido_por]?.nome || '', f.nota_conferencia || f.observacoes || '']))
  }
  return (
    <>
      <CartoesKpi itens={[
        { rotulo: 'Cobertura', icone: 'fechamento', valor: r.cobertura ?? '—', formato: pct0, variacao: r.cobertura != null && rAnt.cobertura != null ? Math.round((r.cobertura - rAnt.cobertura) * 10) / 10 : null, legenda: `${r.enviados} de ${r.enviados + r.atrasados} dias com fechamento`, link: href('fechamentos') },
        { rotulo: 'Pontualidade', icone: 'relogio', valor: r.pontualidade ?? '—', formato: pct0, variacao: r.pontualidade != null && rAnt.pontualidade != null ? Math.round((r.pontualidade - rAnt.pontualidade) * 10) / 10 : null, legenda: `${r.noPrazo} no prazo · até ${String(aj?.horario_limite || '20:00').slice(0, 5)}${aj?.prazo_dia_seguinte ? ' do dia seguinte' : ''}` },
        { rotulo: 'Total dos fechamentos', icone: 'moeda', valor: r.total, formato: brl, variacao: variacaoPct(r.total, rAnt.total), legenda: r.mediaPorDia != null ? `média de ${brl(r.mediaPorDia)} por dia` : 'nenhum total informado' },
        { rotulo: 'Horário típico de envio', icone: 'enviar', valor: horario(r.horarioMediano), legenda: 'mediana do primeiro envio' },
      ]} />
      <div className="grade-relatorio">
        <Bloco titulo={longo ? `Total por ${granularidade === 'semana' ? 'semana' : 'mês'}` : 'Total por dia'} id="relf-total" className="largo"
          sub="Soma informada no envio de cada fechamento. Dias sem valor ficam em branco."
          acao={<Botao variante="secundario" tamanho="mini" icone="baixar" onClick={exportar}>Exportar CSV</Botao>}>
          {colunasDia.some(c => c.valor != null) ? (
            <VistaGrafico rotulo="os totais" tabela={{ colunas: [longo ? 'Período' : 'Dia', 'Total'], linhas: colunasDia.filter(c => c.valor != null).map(c => [c.titulo, brl(c.valor)]) }}>
              <Colunas itens={colunasDia} rotulo="Total dos fechamentos no período" media={r.mediaPorDia && !longo ? r.mediaPorDia : null} />
            </VistaGrafico>
          ) : <Vazio icone="moeda">Nenhum fechamento com total informado no período.</Vazio>}
        </Bloco>
        <Bloco titulo="Situação dos dias" id="relf-situacao" sub="Dias de fechamento do período, até hoje.">
          <BarraSegmentada rotulo="Situação dos dias de fechamento" formato={v => `${num(v)} ${v === 1 ? 'dia' : 'dias'}`} partes={[
            { id: 'conferido', rotulo: 'Conferidos', valor: r.conferidos, tom: 'st-bom', icone: 'check' },
            { id: 'enviado', rotulo: 'Aguardando conferência', valor: r.aguardando, tom: 'st-info', icone: 'relogio' },
            { id: 'divergente', rotulo: 'Com divergência', valor: r.divergentes, tom: 'st-serio', icone: 'alerta' },
            { id: 'atrasado', rotulo: 'Sem fechamento', valor: r.atrasados, tom: 'st-critico', icone: 'fechar' },
            { id: 'sem', rotulo: 'Sem expediente', valor: r.semExpediente, tom: 'st-neutro', icone: 'menos-circulo' },
          ]} />
        </Bloco>
        <Bloco titulo="Quem enviou" id="relf-pessoas" sub="Envios no período, pontualidade e horário típico.">
          {porPessoa.length ? (
            <div className="g-tabela-moldura">
              <table className="tabela tabela-resp">
                <thead><tr><th scope="col">Pessoa</th><th scope="col" className="num">Envios</th><th scope="col" className="num">No prazo</th><th scope="col" className="num">Horário típico</th></tr></thead>
                <tbody>{porPessoa.map(p => (
                  <tr key={p.id}>
                    <td><span className="col-pessoa"><Avatar nome={mapas.equipe[p.id]?.nome || '?'} tamanho="p" /><strong>{mapas.equipe[p.id]?.nome || 'Equipe'}</strong></span></td>
                    <td className="num">{num(p.n)}</td>
                    <td className="num"><span className="resp-conv">{pct0((100 * p.noPrazo) / p.n)}<Medidor valor={(100 * p.noPrazo) / p.n} tom={p.noPrazo === p.n ? 'bom' : 'aviso'} rotulo="Pontualidade" /></span></td>
                    <td className="num">{horario(p.horario)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <Vazio icone="pessoa">Nenhum envio no período.</Vazio>}
        </Bloco>
        <Bloco titulo="Pedem atenção" id="relf-atencao" className="largo">
          {faltando.length || divergentes.length ? (
            <ul className="lista-simples">
              {faltando.map(k => (
                <li key={k}><a href={href(`fechamentos?dia=${k}`)}><span className="ls-id"><strong>{dataCurta(k)} · {dataLocal(k).toLocaleDateString('pt-BR', { weekday: 'long' })}</strong><small>Nenhum fechamento enviado</small></span><Pill tom="negativo" icone="fechar">Sem fechamento</Pill></a></li>
              ))}
              {divergentes.map(f => (
                <li key={f.id}><a href={href(`fechamentos?dia=${f.data}`)}><span className="ls-id"><strong>{dataCurta(f.data)} · {brl(f.valor_total)}</strong><small>{f.nota_conferencia}</small></span><Pill>{f.status}</Pill></a></li>
              ))}
            </ul>
          ) : <Vazio icone="check-circulo">Nenhum dia sem fechamento e nenhuma divergência no período.</Vazio>}
        </Bloco>
      </div>
    </>
  )
}

export function AvisoMigracao() {
  return (
    <div className="nota nota-aviso" role="note">
      <Icon nome="info" />
      <span>Esta parte precisa da atualização do banco: rode o arquivo <code>supabase/04_pessoas_fechamentos.sql</code> no SQL Editor do Supabase (veja o GUIA-PUBLICACAO.md). Até lá, o resto do app funciona normalmente.</span>
    </div>
  )
}
