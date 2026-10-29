import { useApp, CartoesKpi, BarrasSemana, Bloco, TituloTela, Pill, Carregando, Vazio } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { href } from '../lib/rota.js'
import {
  precisaAcao, STATUS_COM_CLIENTE, STATUS_EM_ABERTO, SOLICITACAO_ATIVA, taxaConversao, mediana, diasDesde, dataLocal, inicioDoDia, rotulo,
} from '../lib/business.js'
import { brl, pct, dias, data, mesLongo, iniciais } from '../lib/format.js'

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
const LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const NOMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

// Movimentações do funil (aberturas, propostas criadas, envios e decisões) em cada dia da semana atual.
function semanaAtual(eventos, agora) {
  const hoje = inicioDoDia(agora)
  const domingo = new Date(hoje); domingo.setDate(hoje.getDate() - hoje.getDay())
  return LETRAS.map((letra, i) => {
    const dia = new Date(domingo); dia.setDate(domingo.getDate() + i)
    const fim = new Date(dia); fim.setDate(dia.getDate() + 1)
    const valor = eventos.filter(e => { const t = new Date(e.em); return t >= dia && t < fim }).length
    return { chave: i, letra, nome: NOMES[i], valor, futuro: dia > hoje, hoje: +dia === +hoje }
  })
}

function variacao(atual, anterior) {
  const d = atual - anterior
  if (!anterior && !atual) return { selo: '=', texto: 'nada aprovado nos dois meses' }
  if (!anterior) return { selo: 'novo', texto: 'nada aprovado no mês passado' }
  if (d === 0) return { selo: '=', texto: 'igual ao mês passado' }
  return { selo: `${d > 0 ? '+' : '−'}${brl(Math.abs(d))}`, texto: 'em relação ao mês passado' }
}

export default function VisaoGeral() {
  const { dados, mapas, estado } = useApp()
  const agora = new Date()
  const { propostas, solicitacoes } = dados
  const primeiraCarga = estado.carregando && !estado.em

  const comCliente = propostas.filter(p => STATUS_COM_CLIENTE.includes(p.status))
  const valorComCliente = comCliente.reduce((s, p) => s + Number(p.valor_total), 0)
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const inicioMesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
  const aprovadas = propostas.filter(p => p.status === 'Aprovada')
  const somaEntre = (de, ate) => aprovadas.filter(p => { const t = new Date(p.decidida_em); return t >= de && t < ate }).reduce((s, p) => s + Number(p.valor_total), 0)
  const aprovadoMes = somaEntre(inicioMes, new Date(agora.getFullYear(), agora.getMonth() + 1, 1))
  const aprovadoPassado = somaEntre(inicioMesPassado, inicioMes)
  const vari = variacao(aprovadoMes, aprovadoPassado)
  const limite90 = new Date(agora.getTime() - 90 * 86400000)
  const decididas90 = propostas.filter(p => ['Aprovada', 'Recusada'].includes(p.status) && new Date(p.decidida_em) >= limite90)
  const aprovadas90 = decididas90.filter(p => p.status === 'Aprovada').length
  const ativas = solicitacoes.filter(s => SOLICITACAO_ATIVA.includes(s.status))
  const atrasadas = ativas.filter(s => s.prazo && dataLocal(s.prazo) < inicioDoDia(agora))

  const acao = precisaAcao(dados, agora)
  const proxima = acao.find(a => a.tipo === 'proposta') || acao[0]
  const vencendo = acao.filter(a => a.motivo === 'vence' || a.motivo === 'validade')
  const emJogo = vencendo.reduce((s, a) => s + Number(a.registro.valor_total), 0)
  const linha = vencendo.length
    ? `${vencendo.length === 1 ? '1 proposta vence' : `${vencendo.length} propostas vencem`} nos próximos 7 dias, com ${brl(emJogo)} em jogo.`
    : acao.length ? `${acao.length} ${acao.length === 1 ? 'item pede' : 'itens pedem'} ação hoje.` : 'Nada pendente hoje.'

  const semana = semanaAtual(dados.statusHistorico, agora)
  const totalSemana = semana.reduce((s, d) => s + d.valor, 0)
  const recentes = [...propostas].sort((a, b) => new Date(b.atualizado_em) - new Date(a.atualizado_em)).slice(0, 6)

  const funil = STATUS_EM_ABERTO.map(st => {
    const lista = propostas.filter(p => p.status === st)
    return { status: st, qtd: lista.length, valor: lista.reduce((s, p) => s + Number(p.valor_total), 0), med: mediana(lista.map(p => diasDesde(p.status_desde, agora))) }
  })
  const maxFunil = Math.max(...funil.map(f => f.valor), 0)

  return (
    <>
      <TituloTela titulo="Visão geral" linha={primeiraCarga ? 'Carregando o funil…' : linha}
        acoes={<>
          <a className="btn btn-primario" href={href('propostas/nova')}><Icon nome="mais" /><span>Nova proposta</span></a>
          <a className="btn btn-secundario" href={href('solicitacoes?abrir=nova')}><Icon nome="solicitacao" /><span>Nova solicitação</span></a>
        </>} />

      <CartoesKpi itens={[
        { rotulo: 'Com o cliente', valor: brl(valorComCliente), selo: comCliente.length, legenda: comCliente.length === 1 ? 'proposta aguardando resposta' : 'propostas aguardando resposta', link: href('propostas?vista=quadro') },
        { rotulo: `Aprovado em ${mesLongo(agora)}`, valor: brl(aprovadoMes), selo: vari.selo, legenda: vari.texto, link: href('relatorios') },
        { rotulo: 'Conversão em 90 dias', valor: pct(taxaConversao(aprovadas90, decididas90.length)), selo: decididas90.length ? `${aprovadas90}/${decididas90.length}` : null, legenda: decididas90.length ? 'aprovadas entre as decididas' : 'nenhuma proposta decidida', link: href('relatorios') },
        { rotulo: 'Solicitações ativas', valor: String(ativas.length), selo: atrasadas.length || null, legenda: atrasadas.length ? (atrasadas.length === 1 ? 'com prazo vencido' : 'com prazo vencido') : 'nenhuma com prazo vencido', tom: atrasadas.length ? 'negativo' : null, link: href('solicitacoes') },
      ]} />

      <div className="painel-grade">
        <Bloco titulo="Movimento da semana" id="semana" className="pg-semana"
          acao={<span className="bloco-meta num">{totalSemana} {totalSemana === 1 ? 'movimentação' : 'movimentações'}</span>}>
          <p className="bloco-sub">Solicitações abertas, propostas criadas, enviadas e decididas em cada dia.</p>
          {primeiraCarga ? <Carregando linhas={3} /> : (
            <BarrasSemana dias={semana} rotulo={`Movimentações por dia nesta semana: ${semana.filter(d => !d.futuro).map(d => `${d.nome} ${d.valor}`).join(', ')}`} />
          )}
        </Bloco>

        <Bloco titulo="Próxima ação" id="proxima" className="pg-proxima">
          {proxima ? (() => {
            const r = proxima.registro
            const ehProposta = proxima.tipo === 'proposta'
            const cliente = ehProposta ? mapas.clienteDaProposta(r) : mapas.clientes[r.cliente_id]
            return (
              <div className="proxima">
                <p className="proxima-titulo">{r.titulo}</p>
                <p className="proxima-sub">{cliente?.nome || '—'}{ehProposta && <> · <span className="num">{brl(r.valor_total)}</span></>}</p>
                <p className="proxima-motivo"><Icon nome="relogio" tamanho={14} /> {MOTIVO[proxima.motivo](proxima)}</p>
                <a className="btn btn-primario btn-largo" href={href(ehProposta ? `propostas/${r.id}` : `propostas/nova?solicitacao=${r.id}`)}>
                  <Icon nome="direita" /><span>{ACAO[proxima.motivo]}</span>
                </a>
              </div>
            )
          })() : <Vazio>Nada pendente. Quando uma proposta precisar de atenção, ela aparece aqui.</Vazio>}
        </Bloco>

        <Bloco titulo="Propostas" id="recentes" className="pg-recentes"
          acao={<a className="btn btn-secundario btn-mini" href={href('propostas/nova')}><Icon nome="mais" tamanho={14} /><span>Nova</span></a>}>
          {recentes.length ? (
            <ul className="lista-recentes">
              {recentes.map(p => {
                const c = mapas.clienteDaProposta(p)
                return (
                  <li key={p.id}>
                    <a href={href(`propostas/${p.id}`)}>
                      <span className={`selo-cliente tom-${(c?.nome || 'x').charCodeAt(0) % 5}`} aria-hidden="true">{iniciais(c?.nome)}</span>
                      <span className="lr-id">
                        <strong>{p.titulo}</strong>
                        <small>{p.validade && STATUS_COM_CLIENTE.includes(p.status) ? `Válida até ${data(p.validade)}` : `${rotulo(p.status)} · ${c?.nome || '—'}`}</small>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          ) : <Vazio>Nenhuma proposta ainda.</Vazio>}
          <a className="ver-todos" href={href('propostas?aba=todas')}>Ver todas as propostas</a>
        </Bloco>

        <Bloco titulo="Precisa de ação" id="acao" className="pg-acao" acao={<span className="bloco-meta num">{acao.length ? `${acao.length} ${acao.length === 1 ? 'item' : 'itens'}` : ''}</span>}>
          {primeiraCarga ? <Carregando linhas={4} /> : acao.length ? (
            <ul className="lista-acao">
              {acao.slice(0, 5).map(a => {
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
                    </a>
                  </li>
                )
              })}
            </ul>
          ) : <Vazio>Tudo em dia.</Vazio>}
        </Bloco>

        <Bloco titulo="Funil em aberto" id="funil" className="pg-funil" acao={<a className="link-sutil" href={href('propostas?vista=quadro')}>Ver quadro</a>}>
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
      </div>
    </>
  )
}
