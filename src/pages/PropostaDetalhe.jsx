import { useMemo, useState } from 'react'
import { useApp, TituloTela, Abas, Pill, Botao, Campo, Dialogo, Vazio, Bloco } from '../components/ui.jsx'
import Anexos from '../components/Anexos.jsx'
import Linha from '../components/Linha.jsx'
import Icon, { Logo } from '../components/Icon.jsx'
import { api } from '../lib/api.js'
import { href, ir } from '../lib/rota.js'
import {
  validarProposta, subtotal as calcSubtotal, totalLinha, centavos, proximosStatus, exigeMotivo, podeEditar,
  tempoPorEtapa, rotulo, SOLICITACAO_ATIVA, itensDaProposta,
} from '../lib/business.js'
import { brl, data, dataHora, qtd, duracao, prazo } from '../lib/format.js'

const ACAO_STATUS = {
  Enviada: { rotulo: 'Marcar como enviada', reenvio: 'Reenviar ao cliente' },
  'Em negociacao': { rotulo: 'Cliente pediu ajustes' },
  Aprovada: { rotulo: 'Registrar aprovação' },
  Recusada: { rotulo: 'Registrar recusa' },
  Cancelada: { rotulo: 'Cancelar proposta' },
}
const itemVazio = () => ({ descricao: '', quantidade: 1, valor_unitario: '' })

export default function PropostaDetalhe({ id, params }) {
  const { dados, mapas, estado } = useApp()
  const nova = id === 'nova'
  const proposta = nova ? null : mapas.propostas[id]
  if (!nova && !proposta) {
    if (estado.carregando) return <p className="carregando-texto">Carregando a proposta…</p>
    return (
      <>
        <TituloTela titulo="Proposta não encontrada" voltar={<a className="voltar" href={href('propostas')}><Icon nome="esquerda" tamanho={14} />Propostas</a>} />
        <Vazio acao={<a className="btn btn-secundario" href={href('propostas')}>Ver propostas</a>}>Ela pode ter sido removida ou o link está incompleto.</Vazio>
      </>
    )
  }
  return <Editor key={proposta?.id || 'nova'} proposta={proposta} solicitacaoInicial={params.get('solicitacao')} />
}

function Editor({ proposta, solicitacaoInicial }) {
  const { dados, mapas, recarregar, notificar } = useApp()
  const nova = !proposta
  const itensSalvos = proposta ? itensDaProposta(dados.itens, proposta) : []
  const inicial = () => ({
    solicitacao_id: proposta?.solicitacao_id || solicitacaoInicial || '',
    titulo: proposta?.titulo || (solicitacaoInicial ? mapas.solicitacoes[solicitacaoInicial]?.titulo || '' : ''),
    escopo: proposta?.escopo || '',
    desconto: proposta ? String(proposta.desconto) : '0',
    validade: proposta?.validade || '',
    condicoes_pagamento: proposta?.condicoes_pagamento || '',
    observacoes: proposta?.observacoes || '',
    itens: itensSalvos.length ? itensSalvos.map(i => ({ descricao: i.descricao, quantidade: String(i.quantidade), valor_unitario: String(i.valor_unitario) })) : [itemVazio()],
  })
  const [f, setF] = useState(inicial)
  const [sujo, setSujo] = useState(false)
  const [erros, setErros] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [aba, setAba] = useState('proposta')
  const [mudanca, setMudanca] = useState(null)

  const editavel = nova || podeEditar(proposta.status)
  const set = (k, v) => { setF(x => ({ ...x, [k]: v })); setSujo(true) }
  const setItem = (n, k, v) => { setF(x => ({ ...x, itens: x.itens.map((it, i) => (i === n ? { ...it, [k]: v } : it)) })); setSujo(true) }
  const sub = calcSubtotal(f.itens)
  const tot = centavos(sub - Number(f.desconto || 0))

  const solicitacao = mapas.solicitacoes[f.solicitacao_id]
  const cliente = solicitacao ? mapas.clientes[solicitacao.cliente_id] : null
  const solicitacoesAbertas = dados.solicitacoes.filter(s => SOLICITACAO_ATIVA.includes(s.status))
  const revisoes = proposta ? dados.revisoes.filter(r => r.proposta_id === proposta.id).sort((a, b) => b.numero_revisao - a.numero_revisao) : []
  const eventos = proposta ? dados.statusHistorico.filter(e => e.entidade === 'propostas' && e.registro_id === proposta.id) : []
  const historico = proposta ? dados.historico.filter(h => h.entidade === 'propostas' && h.registro_id === proposta.id) : []
  const anexos = proposta ? dados.anexos.filter(a => a.entidade === 'propostas' && a.registro_id === proposta.id) : []

  async function salvar(e) {
    e?.preventDefault()
    const payload = { ...f, id: proposta?.id, desconto: Number(f.desconto || 0), itens: f.itens.map(i => ({ ...i, quantidade: Number(i.quantidade), valor_unitario: i.valor_unitario === '' ? '' : Number(i.valor_unitario) })) }
    const problemas = validarProposta(payload)
    setErros(problemas)
    if (problemas.length) return
    setSalvando(true)
    try {
      const r = await api.salvarProposta(payload)
      await recarregar()
      setSujo(false)
      notificar(nova ? `Proposta ${r.numero} criada como rascunho.` : `Revisão ${r.revisao} salva.`, 'sucesso')
      if (nova) ir(`propostas/${r.id}`)
    } catch (err) { setErros([err.message]) } finally { setSalvando(false) }
  }

  async function confirmarMudanca(para, motivo) {
    try {
      await api.mudarStatusProposta(proposta.id, para, motivo)
      await recarregar()
      setMudanca(null)
      notificar(`Proposta marcada como ${rotulo(para).toLowerCase()}.`, 'sucesso')
    } catch (err) { notificar(err.message) }
  }

  const proximos = proposta ? proximosStatus(proposta.status) : []
  const principal = proximos.includes('Aprovada') ? 'Aprovada' : proximos[0]
  const outros = proximos.filter(s => s !== principal)
  const rotuloAcao = s => (s === 'Enviada' && proposta?.status === 'Em negociacao' ? ACAO_STATUS.Enviada.reenvio : ACAO_STATUS[s].rotulo)
  const pedirMudanca = s => { if (sujo) { notificar('Salve ou descarte as alterações antes de mudar o status.'); return } setMudanca(s) }

  const linha = nova
    ? 'Escolha a solicitação, descreva o escopo e liste os itens. Ela nasce como rascunho.'
    : <>
        <span className="mono">{proposta.numero}</span> · {cliente?.nome || '—'} · revisão {proposta.revisao_atual} · <Pill>{proposta.status}</Pill>
      </>

  return (
    <>
      <TituloTela titulo={nova ? 'Nova proposta' : proposta.titulo} linha={linha}
        voltar={<a className="voltar" href={href('propostas')}><Icon nome="esquerda" tamanho={14} />Propostas</a>}
        acoes={!nova && principal && (
          <>
            {outros.map(s => <Botao key={s} variante={s === 'Cancelada' || s === 'Recusada' ? 'texto' : 'secundario'} onClick={() => pedirMudanca(s)}>{rotuloAcao(s)}</Botao>)}
            <Botao variante="primario" icone={principal === 'Aprovada' ? 'check' : null} onClick={() => pedirMudanca(principal)}>{rotuloAcao(principal)}</Botao>
          </>
        )} />

      {!nova && <Etapas eventos={eventos} />}

      {!nova && (
        <Abas rotuloAcessivel="Partes da proposta" ativa={aba} aoMudar={setAba} abas={[
          { id: 'proposta', rotulo: 'Proposta' },
          { id: 'documento', rotulo: 'Documento' },
          { id: 'revisoes', rotulo: 'Revisões', conta: revisoes.length },
          { id: 'historico', rotulo: 'Histórico' },
          { id: 'anexos', rotulo: 'Anexos', conta: anexos.length },
        ]} />
      )}

      {aba === 'proposta' && (
        <form className="grade-editor" onSubmit={salvar} noValidate>
          <div className="coluna">
            {!editavel && (
              <div className="nota" role="note">
                <Icon nome="info" />
                <span>Proposta {rotulo(proposta.status).toLowerCase()} em {data(proposta.decidida_em)}{proposta.motivo_encerramento ? ` — ${proposta.motivo_encerramento}` : ''}. Ela não pode mais ser editada; os valores abaixo são os da revisão {proposta.revisao_atual}.</span>
              </div>
            )}
            <fieldset disabled={!editavel || salvando} className="secao-form">
              <div className="grade-campos">
                <Campo rotulo="Solicitação" obrigatorio className="largo">
                  {id => nova ? (
                    <select id={id} value={f.solicitacao_id} onChange={e => { const v = e.target.value; set('solicitacao_id', v); if (!f.titulo.trim() && mapas.solicitacoes[v]) set('titulo', mapas.solicitacoes[v].titulo) }}>
                      <option value="">Escolha a solicitação…</option>
                      {solicitacoesAbertas.map(s => <option key={s.id} value={s.id}>{s.titulo} — {mapas.clientes[s.cliente_id]?.nome}</option>)}
                    </select>
                  ) : <input id={id} value={`${solicitacao?.titulo || '—'} — ${cliente?.nome || '—'}`} readOnly />}
                </Campo>
                <Campo rotulo="Título da proposta" obrigatorio className="largo">
                  {id => <input id={id} value={f.titulo} maxLength={160} onChange={e => set('titulo', e.target.value)} placeholder="Ex.: App de pedidos e painel de vendas" />}
                </Campo>
                <Campo rotulo="Escopo" className="largo">
                  {id => <textarea id={id} rows={4} value={f.escopo} onChange={e => set('escopo', e.target.value)} placeholder="O que será entregue, em que etapas, e o que não está incluído." />}
                </Campo>
              </div>
            </fieldset>

            <fieldset disabled={!editavel || salvando} className="secao-form">
              <legend>Itens</legend>
              <div className="itens" role="table" aria-label="Itens da proposta">
                <div className="itens-cab" role="row">
                  <span role="columnheader">Descrição</span><span role="columnheader" className="num">Qtd.</span>
                  <span role="columnheader" className="num">Valor unitário</span><span role="columnheader" className="num">Total</span><span aria-hidden="true" />
                </div>
                {f.itens.map((it, n) => (
                  <div className="itens-linha" role="row" key={n}>
                    <input aria-label={`Descrição do item ${n + 1}`} value={it.descricao} onChange={e => setItem(n, 'descricao', e.target.value)} placeholder="Serviço ou produto" />
                    <input aria-label={`Quantidade do item ${n + 1}`} className="num" type="number" inputMode="decimal" min="0" step="any" value={it.quantidade} onChange={e => setItem(n, 'quantidade', e.target.value)} />
                    <input aria-label={`Valor unitário do item ${n + 1}`} className="num" type="number" inputMode="decimal" min="0" step="0.01" value={it.valor_unitario} onChange={e => setItem(n, 'valor_unitario', e.target.value)} placeholder="0,00" />
                    <span className="num itens-total" role="cell">{brl(totalLinha(it))}</span>
                    {editavel ? (
                      <button type="button" className="btn-icone" aria-label={`Remover item ${n + 1}`} disabled={f.itens.length === 1}
                        onClick={() => { setF(x => ({ ...x, itens: x.itens.filter((_, i) => i !== n) })); setSujo(true) }}><Icon nome="lixeira" /></button>
                    ) : <span />}
                  </div>
                ))}
              </div>
              {editavel && <Botao icone="mais" variante="texto" onClick={() => { setF(x => ({ ...x, itens: [...x.itens, itemVazio()] })); setSujo(true) }}>Adicionar item</Botao>}
            </fieldset>

            <fieldset disabled={!editavel || salvando} className="secao-form">
              <legend>Condições</legend>
              <div className="grade-campos">
                <Campo rotulo="Válida até">{id => <input id={id} type="date" value={f.validade || ''} onChange={e => set('validade', e.target.value)} />}</Campo>
                <Campo rotulo="Desconto (R$)">{id => <input id={id} className="num" type="number" min="0" step="0.01" value={f.desconto} onChange={e => set('desconto', e.target.value)} />}</Campo>
                <Campo rotulo="Condições de pagamento" className="largo">
                  {id => <textarea id={id} rows={2} value={f.condicoes_pagamento} onChange={e => set('condicoes_pagamento', e.target.value)} placeholder="Ex.: 50% na assinatura e 50% na entrega." />}
                </Campo>
                <Campo rotulo="Observações" className="largo">
                  {id => <textarea id={id} rows={2} value={f.observacoes} onChange={e => set('observacoes', e.target.value)} />}
                </Campo>
              </div>
            </fieldset>
          </div>

          <aside className="resumo" aria-label="Resumo dos valores">
            <dl>
              <div><dt>Subtotal</dt><dd className="num">{brl(sub)}</dd></div>
              <div><dt>Desconto</dt><dd className="num">{Number(f.desconto) ? `− ${brl(f.desconto)}` : brl(0)}</dd></div>
              <div className="resumo-total"><dt>Total</dt><dd className="num">{brl(tot)}</dd></div>
            </dl>
            {proposta?.validade && <p className="resumo-nota">{prazo(proposta.validade)}{proposta.enviada_em ? ` · enviada em ${data(proposta.enviada_em)}` : ''}</p>}
            {erros.length > 0 && <ul className="erros" role="alert">{erros.map(e => <li key={e}>{e}</li>)}</ul>}
            {editavel && (
              <>
                {nova || sujo ? (
                  <button type="submit" className="btn btn-primario btn-largo" disabled={salvando}>
                    {salvando ? 'Salvando…' : nova ? 'Criar rascunho' : `Salvar revisão ${proposta.revisao_atual + 1}`}
                  </button>
                ) : <p className="resumo-salvo">Revisão {proposta.revisao_atual} salva. Edite os campos para criar a próxima.</p>}
                {!nova && sujo && <Botao variante="texto" className="btn-largo" onClick={() => { setF(inicial()); setSujo(false); setErros([]) }}>Descartar alterações</Botao>}
                {(nova || sujo) && <p className="resumo-nota">{nova ? 'O número ZP é gerado ao criar.' : 'Cada gravação guarda uma revisão com os itens e valores daquele momento.'}</p>}
              </>
            )}
          </aside>
        </form>
      )}

      {aba === 'documento' && proposta && <Documento proposta={proposta} itens={itensSalvos} cliente={cliente} />}
      {aba === 'revisoes' && <Revisoes revisoes={revisoes} mapas={mapas} />}
      {aba === 'historico' && <Bloco><Linha eventos={historico} mapas={mapas} /></Bloco>}
      {aba === 'anexos' && proposta && <Anexos entidade="propostas" registroId={proposta.id} anexos={anexos} />}

      {mudanca && <DialogoStatus para={mudanca} proposta={proposta} solicitacao={solicitacao} aoFechar={() => setMudanca(null)} aoConfirmar={confirmarMudanca} rotuloAcao={rotuloAcao(mudanca)} />}
    </>
  )
}

// Linha do tempo das etapas, com quanto tempo a proposta passou em cada uma.
function Etapas({ eventos }) {
  const etapas = tempoPorEtapa(eventos)
  if (!etapas.length) return null
  return (
    <ol className="etapas" aria-label="Etapas da proposta">
      {etapas.map((e, i) => {
        const atual = i === etapas.length - 1
        return (
          <li key={i} className={atual ? 'atual' : ''}>
            <span className="etapa-nome">{rotulo(e.status)}</span>
            <span className="etapa-tempo num">{atual && !['Aprovada', 'Recusada', 'Cancelada'].includes(e.status) ? `há ${duracao(e.dias)}` : atual ? `desde ${data(e.inicio)}` : duracao(e.dias)}</span>
            <span className="etapa-data num">{data(e.inicio)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function DialogoStatus({ para, proposta, solicitacao, aoFechar, aoConfirmar, rotuloAcao }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const precisa = exigeMotivo(para)
  const texto = {
    Enviada: proposta.status === 'Em negociacao'
      ? 'A proposta volta para "Enviada" e a contagem de dias sem resposta recomeça hoje.'
      : `A proposta passa a contar como "com o cliente" a partir de hoje${proposta.validade ? ` e vale até ${data(proposta.validade)}` : ''}.`,
    'Em negociacao': 'Use quando o cliente pedir ajustes. A proposta continua editável; cada gravação vira uma nova revisão.',
    Aprovada: `A proposta fica encerrada como aprovada (${brl(proposta.valor_total)}) e não poderá mais ser editada.${solicitacao && solicitacao.status !== 'Concluida' ? ` A solicitação "${solicitacao.titulo}" será concluída.` : ''}`,
    Recusada: 'A proposta fica encerrada como recusada. O motivo aparece nos relatórios.',
    Cancelada: 'A proposta fica encerrada como cancelada. O motivo aparece nos relatórios.',
  }[para]
  const confirmar = async () => { setEnviando(true); await aoConfirmar(para, motivo); setEnviando(false) }
  return (
    <Dialogo titulo={`${rotuloAcao}?`} aoFechar={aoFechar} acoes={<>
      <Botao variante="secundario" onClick={aoFechar}>Voltar</Botao>
      <Botao variante={para === 'Recusada' || para === 'Cancelada' ? 'perigo' : 'primario'} disabled={enviando || (precisa && !motivo.trim())} onClick={confirmar}>
        {enviando ? 'Salvando…' : rotuloAcao}
      </Botao>
    </>}>
      <p>{texto}</p>
      {precisa && (
        <Campo rotulo={para === 'Recusada' ? 'Por que o cliente recusou?' : 'Por que a proposta foi cancelada?'} obrigatorio>
          {id => <textarea id={id} rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} />}
        </Campo>
      )}
    </Dialogo>
  )
}

function Documento({ proposta, itens, cliente }) {
  return (
    <div className="documento-area">
      <div className="documento-barra">
        <p>Para gerar o PDF, escolha “Salvar como PDF” na janela de impressão.</p>
        <Botao variante="primario" icone="imprimir" onClick={() => window.print()}>Imprimir ou salvar PDF</Botao>
      </div>
      <article className="documento" id="documento">
        <header className="doc-topo">
          <div className="doc-marca"><Logo altura={46} /></div>
          <div className="doc-numero"><span>Proposta comercial</span><strong className="mono">{proposta.numero}</strong><span>Revisão {proposta.revisao_atual}</span></div>
        </header>
        <h1>{proposta.titulo}</h1>
        <div className="doc-meta">
          <div><span>Cliente</span><strong>{cliente?.nome || '—'}</strong>{cliente?.documento && <small>{cliente.documento}</small>}{cliente?.contato && <small>A/C {cliente.contato}</small>}</div>
          <div><span>Emissão</span><strong>{data(proposta.atualizado_em)}</strong></div>
          <div><span>Válida até</span><strong>{proposta.validade ? data(proposta.validade) : 'A combinar'}</strong></div>
        </div>
        {proposta.escopo && <><h2>Escopo</h2><p className="doc-texto">{proposta.escopo}</p></>}
        <h2>Investimento</h2>
        <table className="doc-tabela">
          <thead><tr><th>Descrição</th><th className="num">Qtd.</th><th className="num">Valor unitário</th><th className="num">Total</th></tr></thead>
          <tbody>{itens.map(i => <tr key={i.id}><td>{i.descricao}</td><td className="num">{qtd(i.quantidade)}</td><td className="num">{brl(i.valor_unitario)}</td><td className="num">{brl(totalLinha(i))}</td></tr>)}</tbody>
          <tfoot>
            <tr><td colSpan={3}>Subtotal</td><td className="num">{brl(proposta.subtotal)}</td></tr>
            {Number(proposta.desconto) > 0 && <tr><td colSpan={3}>Desconto</td><td className="num">− {brl(proposta.desconto)}</td></tr>}
            <tr className="doc-total"><td colSpan={3}>Total</td><td className="num">{brl(proposta.valor_total)}</td></tr>
          </tfoot>
        </table>
        <h2>Condições de pagamento</h2>
        <p className="doc-texto">{proposta.condicoes_pagamento || 'A combinar.'}</p>
        {proposta.observacoes && <><h2>Observações</h2><p className="doc-texto">{proposta.observacoes}</p></>}
        <footer className="doc-rodape">ZettaMinds · Automação, inteligência e resultados · Campo Grande, MS</footer>
      </article>
    </div>
  )
}

function Revisoes({ revisoes, mapas }) {
  if (!revisoes.length) return <Vazio>Nenhuma revisão registrada.</Vazio>
  return (
    <ol className="revisoes">
      {revisoes.map((r, i) => {
        const anterior = revisoes[i + 1]
        const total = Number(r.dados?.valor_total ?? 0)
        const dif = anterior ? centavos(total - Number(anterior.dados?.valor_total ?? 0)) : null
        return (
          <li key={r.id}>
            <details open={i === 0}>
              <summary>
                <span className="rev-nome">Revisão {r.numero_revisao}</span>
                <span className="rev-quando">{dataHora(r.criado_em)} · {mapas.equipe[r.criado_por]?.nome || 'Equipe'}</span>
                <span className="rev-valor num">{brl(total)}{dif != null && dif !== 0 && <small className={dif < 0 ? 'tom-positivo-neutro' : ''}> {dif > 0 ? '+' : '−'}{brl(Math.abs(dif))} vs revisão {anterior.numero_revisao}</small>}</span>
              </summary>
              <table className="tabela tabela-compacta">
                <thead><tr><th>Item</th><th className="num">Qtd.</th><th className="num">Valor unitário</th><th className="num">Total</th></tr></thead>
                <tbody>{(r.itens || []).map((it, k) => <tr key={k}><td>{it.descricao}</td><td className="num">{qtd(it.quantidade)}</td><td className="num">{brl(it.valor_unitario)}</td><td className="num">{brl(totalLinha(it))}</td></tr>)}</tbody>
              </table>
              {Number(r.dados?.desconto) > 0 && <p className="rev-desc num">Desconto de {brl(r.dados.desconto)}</p>}
            </details>
          </li>
        )
      })}
    </ol>
  )
}
