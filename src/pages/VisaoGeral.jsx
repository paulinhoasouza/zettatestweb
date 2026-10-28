import { useApp, Kpis, Bloco, ColunasMes, TituloTela, Pill, Carregando, Vazio } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { href } from '../lib/rota.js'
import {
  precisaAcao, STATUS_COM_CLIENTE, STATUS_EM_ABERTO, SOLICITACAO_ATIVA, taxaConversao, porMes, mediana, diasDesde, dataLocal,
} from '../lib/business.js'
import { brl, num, pct, dias, mesLongo, relativo } from '../lib/format.js'

const MOTIVO = {
  validade: r => `Validade venceu há ${dias(r.dias)}`,
  vence: r => (r.dias === 0 ? 'Validade vence hoje' : `Validade vence em ${dias(r.dias)}`),
  'sem-resposta': r => `Enviada há ${dias(r.dias)}, sem resposta`,
  'rascunho-parado': r => `Rascunho parado há ${dias(r.dias)}`,
  prazo: r => `Prazo da solicitação venceu há ${dias(r.dias)}`,
}
const ACAO = {
  validade: 'Renovar ou encerrar', vence: 'Cobrar retorno', 'sem-resposta': 'Cobrar retorno',
  'rascunho-parado': 'Revisar e enviar', prazo: 'Criar proposta',
}

export default function VisaoGeral() {
  const { dados, mapas, estado } = useApp()
  const agora = new Date()
  const { propostas, solicitacoes } = dados

  const comCliente = propostas.filter(p => STATUS_COM_CLIENTE.includes(p.status))
  const valorComCliente = comCliente.reduce((s, p) => s + Number(p.valor_total), 0)
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const aprovadasMes = propostas.filter(p => p.status === 'Aprovada' && new Date(p.decidida_em) >= inicioMes)
  const limite90 = new Date(agora.getTime() - 90 * 86400000)
  const decididas90 = propostas.filter(p => ['Aprovada', 'Recusada'].includes(p.status) && new Date(p.decidida_em) >= limite90)
  const aprovadas90 = decididas90.filter(p => p.status === 'Aprovada').length
  const taxa = taxaConversao(aprovadas90, decididas90.length)
  const ativas = solicitacoes.filter(s => SOLICITACAO_ATIVA.includes(s.status))
  const atrasadas = ativas.filter(s => s.prazo && dataLocal(s.prazo) < new Date(agora.toDateString()))

  const acao = precisaAcao(dados, agora)
  const vencendo = acao.filter(a => a.motivo === 'vence' || a.motivo === 'validade')
  const emJogo = vencendo.reduce((s, a) => s + Number(a.registro.valor_total), 0)
  const linha = vencendo.length
    ? `${vencendo.length === 1 ? '1 proposta vence' : `${vencendo.length} propostas vencem`} nos próximos 7 dias — ${brl(emJogo)} em jogo.`
    : acao.length ? `${acao.length} ${acao.length === 1 ? 'item pede' : 'itens pedem'} ação hoje.` : 'Nada pendente hoje: nenhuma validade vencendo e nenhum prazo atrasado.'

  const meses = porMes(propostas.filter(p => p.status === 'Aprovada'), 'decidida_em', 'valor_total', 6, agora)
  const totalMeses = meses.reduce((s, m) => s + m.valor, 0)

  const funil = STATUS_EM_ABERTO.map(st => {
    const lista = propostas.filter(p => p.status === st)
    return { status: st, qtd: lista.length, valor: lista.reduce((s, p) => s + Number(p.valor_total), 0), med: mediana(lista.map(p => diasDesde(p.status_desde, agora))) }
  })
  const maxFunil = Math.max(...funil.map(f => f.valor), 0)
  const recentes = [...solicitacoes].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em)).slice(0, 5)
  const primeiraCarga = estado.carregando && !estado.em

  return (
    <>
      <TituloTela titulo="Visão geral" linha={primeiraCarga ? 'Carregando o funil…' : linha}
        acoes={<a className="btn btn-primario" href={href('propostas/nova')}><Icon nome="mais" /><span>Nova proposta</span></a>} />

      <Kpis itens={[
            { rotulo: 'Com o cliente', valor: brl(valorComCliente), legenda: `${comCliente.length} ${comCliente.length === 1 ? 'proposta enviada ou em negociação' : 'propostas enviadas ou em negociação'}`, lider: true },
            { rotulo: `Aprovado em ${mesLongo(agora)}`, valor: brl(aprovadasMes.reduce((s, p) => s + Number(p.valor_total), 0)), legenda: `${aprovadasMes.length} ${aprovadasMes.length === 1 ? 'proposta' : 'propostas'} desde o dia 1º` },
            { rotulo: 'Conversão em 90 dias', valor: pct(taxa), legenda: decididas90.length ? `${aprovadas90} aprovadas de ${decididas90.length} decididas` : 'Nenhuma proposta decidida no período' },
            { rotulo: 'Solicitações ativas', valor: num(ativas.length), legenda: atrasadas.length ? `${atrasadas.length} com prazo vencido` : 'Nenhuma com prazo vencido', tom: atrasadas.length ? 'negativo' : null },
          ]} />

      <div className="grade-trilho">
        <div className="coluna">


          <Bloco titulo="Precisa de ação" id="acao" acao={<span className="bloco-meta num">{acao.length ? `${acao.length} ${acao.length === 1 ? 'item' : 'itens'}` : ''}</span>}>
            {primeiraCarga ? <Carregando linhas={4} /> : acao.length ? (
              <ul className="lista-acao">
                {acao.slice(0, 6).map(a => {
                  const ehProposta = a.tipo === 'proposta'
                  const r = a.registro
                  const cliente = ehProposta ? mapas.clienteDaProposta(r) : mapas.clientes[r.cliente_id]
                  const urgente = a.motivo === 'validade' || a.motivo === 'prazo' || (a.motivo === 'vence' && a.dias <= 3)
                  return (
                    <li key={a.tipo + a.id}>
                      <a href={href(ehProposta ? `propostas/${r.id}` : `solicitacoes?abrir=${r.id}`)} className="linha-acao">
                        <span className="la-id">
                          <strong>{r.titulo}</strong>
                          <small>{ehProposta ? <><span className="mono">{r.numero}</span> · </> : 'Solicitação · '}{cliente?.nome || '—'}</small>
                        </span>
                        <span className={`la-motivo ${urgente ? 'tom-negativo' : ''}`}>{MOTIVO[a.motivo](a)}</span>
                        <span className="la-valor num">{ehProposta ? brl(r.valor_total) : <span className="traco">—</span>}</span>
                        <span className="la-acao">{ACAO[a.motivo]}<Icon nome="direita" tamanho={14} /></span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            ) : <Vazio>Tudo em dia. Propostas com validade perto do fim, sem resposta há uma semana ou paradas em rascunho aparecem aqui.</Vazio>}
            {acao.length > 6 && <a className="ver-todos" href={href('propostas?aba=aberto')}>Ver todas as propostas em aberto</a>}
          </Bloco>

          <Bloco titulo="Aprovado por mês" id="aprovado" acao={<span className="bloco-meta num">{brl(totalMeses)} nos últimos 6 meses</span>}>
            <ColunasMes dados={meses} rotulo={`Valor aprovado por mês nos últimos 6 meses, total ${brl(totalMeses)}`} />
          </Bloco>
        </div>

        <aside className="trilho" aria-label="Resumo do funil e solicitações recentes">
          <Bloco titulo="Funil em aberto" id="funil" acao={<a className="link-sutil" href={href('propostas?vista=quadro')}>Ver quadro</a>}>
            <ul className="funil">
              {funil.map(f => (
                <li key={f.status}>
                  <div className="funil-linha">
                    <span><Pill>{f.status}</Pill></span>
                    <span className="num funil-valor">{brl(f.valor)}</span>
                  </div>
                  <div className="funil-sub num">
                    {f.qtd === 0 ? 'Nenhuma proposta' : f.qtd === 1 ? `1 proposta · há ${dias(Math.round(f.med))} na etapa` : `${f.qtd} propostas · mediana de ${dias(Math.round(f.med))} na etapa`}
                  </div>
                  <div className="lb-trilho"><span style={{ width: maxFunil ? `${(100 * f.valor) / maxFunil}%` : 0 }} className="lb-dado" /></div>
                </li>
              ))}
            </ul>
          </Bloco>

          <Bloco titulo="Solicitações recentes" id="recentes" acao={<a className="link-sutil" href={href('solicitacoes')}>Ver todas</a>}>
            {recentes.length ? (
              <ul className="lista-simples">
                {recentes.map(s => (
                  <li key={s.id}>
                    <a href={href(`solicitacoes?abrir=${s.id}`)}>
                      <span className="ls-id"><strong>{s.titulo}</strong><small>{mapas.clientes[s.cliente_id]?.nome || '—'} · {relativo(s.criado_em, agora)}</small></span>
                      <Pill>{s.status}</Pill>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <Vazio>Nenhuma solicitação ainda.</Vazio>}
          </Bloco>
        </aside>
      </div>
    </>
  )
}
