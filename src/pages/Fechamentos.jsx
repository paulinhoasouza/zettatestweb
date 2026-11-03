import { useEffect, useMemo, useState } from 'react'
import {
  useApp, TituloTela, Bloco, Pill, Vazio, Gaveta, Campo, Botao, Avatar, Medidor, Presenca, Dialogo, ZonaArquivo, Interruptor, Segmentado,
} from '../components/ui.jsx'
import { Colunas, VistaGrafico, reaisCurto } from '../components/graficos.jsx'
import Linha from '../components/Linha.jsx'
import Icon from '../components/Icon.jsx'
import { AvisoMigracao } from './Relatorios.jsx'
import { api } from '../lib/api.js'
import { ir } from '../lib/rota.js'
import {
  AJUSTES_FECHAMENTO, EXTENSOES_PLANILHA, chaveDia, situacaoDia, resumoFechamentos, prazoDoDia, enviadoNoPrazo, diaComFechamento,
  gradeDoMes, ehPlanilha, extensao, dataLocal, rotulo, centavos, somarDias, diasNoIntervalo, podeVerTela,
} from '../lib/business.js'
import { brl, num, pct, data, hora, dataHora, horario, tamanhoArquivo, dataLonga } from '../lib/format.js'

const ACEITA = EXTENSOES_PLANILHA.map(e => `.${e}`).join(',')
const LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const NOMES_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const SITUACAO = {
  conferido: { rotulo: 'Conferido', icone: 'check-circulo', tom: 'positivo', op: 'bom' },
  enviado: { rotulo: 'Aguardando conferência', curto: 'Enviado', icone: 'relogio', tom: 'info', op: 'info' },
  divergente: { rotulo: 'Com divergência', curto: 'Divergente', icone: 'alerta', tom: 'aviso', op: 'aviso' },
  atrasado: { rotulo: 'Sem fechamento', curto: 'Faltando', icone: 'x-circulo', tom: 'negativo', op: 'ruim' },
  pendente: { rotulo: 'Pendente', icone: 'relogio', tom: 'aviso', op: 'aviso' },
  'sem-expediente': { rotulo: 'Sem expediente', curto: 'Sem exped.', icone: 'menos-circulo', tom: 'neutro', op: 'info' },
  livre: { rotulo: 'Dia sem fechamento', icone: 'menos-circulo', tom: 'neutro' },
  antes: { rotulo: 'Antes do início do controle', icone: 'menos-circulo', tom: 'neutro' },
  futuro: { rotulo: 'Ainda não chegou', icone: 'calendario', tom: 'neutro' },
}
const limiteTexto = aj => `${String(aj.horario_limite || '20:00').slice(0, 5)}${aj.prazo_dia_seguinte ? ' do dia seguinte' : ''}`

// "1.234,56", "1234.56" ou "R$ 1.234" → número; vazio → null; inválido → NaN
export function lerValor(texto) {
  const t = String(texto ?? '').replace(/R\$|\s/g, '')
  if (!t) return null
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  return /^\d+(\.\d{1,2})?$/.test(normal) ? Number(normal) : NaN
}

export default function Fechamentos({ params }) {
  const { dados, eu, estado } = useApp()
  const admin = eu.perfil === 'admin'
  const aj = { ...AJUSTES_FECHAMENTO, ...(dados.fechamentoAjustes || {}) }
  const hoje = chaveDia()
  const [mes, setMes] = useState(() => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() } })
  const [ajustes, setAjustes] = useState(false)
  const diaAberto = /^\d{4}-\d{2}-\d{2}$/.test(params.get('dia') || '') ? params.get('dia') : null
  const abrirDia = k => ir(`fechamentos?dia=${k}`)
  const fecharDia = () => ir('fechamentos')

  const [janela, setJanela] = useState('30')
  const porData = useMemo(() => new Map(dados.fechamentos.map(f => [f.data, f])), [dados.fechamentos])
  const inicioMesAtual = `${hoje.slice(0, 7)}-01`
  const deResumo = janela === '30' ? somarDias(hoje, -29) : inicioMesAtual
  const resumo = useMemo(() => resumoFechamentos(dados.fechamentos, aj, deResumo, hoje), [dados.fechamentos, dados.fechamentoAjustes, deResumo, hoje])
  const recentes = useMemo(() => [...dados.fechamentos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8), [dados.fechamentos])

  useEffect(() => {
    if (!diaAberto) return
    const d = dataLocal(diaAberto)
    setMes(m => (m.ano === d.getFullYear() && m.mes === d.getMonth() ? m : { ano: d.getFullYear(), mes: d.getMonth() }))
  }, [diaAberto])

  if (dados.pendente04) return <><TituloTela titulo="Fechamentos" linha="O fechamento diário em planilha, enviado pela equipe." /><AvisoMigracao /></>

  const fHoje = porData.get(hoje)
  const sHoje = situacaoDia(hoje, fHoje, aj)
  const ehMesAtual = mes.ano === new Date().getFullYear() && mes.mes === new Date().getMonth()
  const nomeMes = new Date(mes.ano, mes.mes, 1).toLocaleDateString('pt-BR', { month: 'long' })
  const tituloMes = `${nomeMes[0].toUpperCase()}${nomeMes.slice(1)} de ${mes.ano}`
  const mudarMes = n => setMes(m => { const d = new Date(m.ano, m.mes + n, 1); return { ano: d.getFullYear(), mes: d.getMonth() } })
  const colunasMes = diasNoIntervalo(somarDias(hoje, -29), hoje).map(k => {
    const f = porData.get(k)
    return { chave: k, rotulo: `${k.slice(8)}/${k.slice(5, 7)}`, titulo: `${data(k)} · ${NOMES_DIA[dataLocal(k).getDay()]}`, valor: f && f.valor_total != null ? Number(f.valor_total) : null, legenda: f ? rotulo(f.status) : '' }
  })

  return (
    <>
      <TituloTela titulo="Fechamentos"
        linha={<>Hoje, {dataLonga(hoje)} · {diaComFechamento(hoje, aj) ? `prazo até ${limiteTexto(aj)}` : 'dia sem fechamento'}</>}
        acoes={<>
          {podeVerTela(eu.perfil, 'relatorios') && <a className="btn btn-secundario" href="#/relatorios?secao=fechamentos"><Icon nome="relatorio" /><span>Relatório</span></a>}
          {admin && <Botao variante="secundario" icone="ajustes" onClick={() => setAjustes(true)}>Ajustes</Botao>}
        </>} />

      <div className="fech-topo">
        <Bloco titulo="Fechamento de hoje" id="fech-hoje" className="hoje-cartao">
          <CartaoHoje chave={hoje} fechamento={fHoje} situacao={sHoje} aj={aj} aoAbrir={() => abrirDia(hoje)} />
        </Bloco>
        <Bloco titulo="Como estão os envios" id="fech-mes" className="resumo-mes" sub="Até hoje, nos dias com fechamento."
          acao={<Segmentado pequeno rotuloAcessivel="Período do resumo" valor={janela} aoMudar={setJanela} opcoes={[{ id: '30', rotulo: '30 dias' }, { id: 'mes', rotulo: 'Este mês' }]} />}>
          <div className="rm-linha">
            <span>Cobertura</span><strong className="num">{pct(resumo.cobertura)}</strong>
            <Medidor valor={resumo.cobertura ?? 0} tom={resumo.atrasados ? 'aviso' : 'bom'} rotulo="Cobertura" />
          </div>
          <div className="rm-linha">
            <span>Pontualidade (até {limiteTexto(aj)})</span><strong className="num">{pct(resumo.pontualidade)}</strong>
            <Medidor valor={resumo.pontualidade ?? 0} tom={(resumo.pontualidade ?? 100) >= 90 ? 'bom' : 'aviso'} rotulo="Pontualidade" />
          </div>
          <div className="rm-fatos">
            <div className="rel-fato"><span>Enviados</span><strong className="num">{num(resumo.enviados)} <small className="muted">de {num(resumo.enviados + resumo.atrasados)}</small></strong></div>
            <div className="rel-fato"><span>Faltando</span><strong className={`num ${resumo.atrasados ? 'tom-negativo' : ''}`}>{num(resumo.atrasados)}</strong></div>
            <div className="rel-fato"><span>{janela === '30' ? 'Total em 30 dias' : 'Total do mês'}</span><strong className="num">{brl(resumo.total)}</strong></div>
            <div className="rel-fato"><span>Horário típico</span><strong className="num">{horario(resumo.horarioMediano)}</strong></div>
          </div>
        </Bloco>
      </div>

      <section className="bloco cal-cartao" aria-labelledby="cal-titulo">
        <div className="cal-cab">
          <h2 id="cal-titulo">{tituloMes}</h2>
          <div className="cal-nav">
            {!ehMesAtual && <Botao variante="texto" tamanho="mini" onClick={() => setMes({ ano: new Date().getFullYear(), mes: new Date().getMonth() })}>Hoje</Botao>}
            <button type="button" className="btn-redondo" aria-label="Mês anterior" onClick={() => mudarMes(-1)}><Icon nome="esquerda" /></button>
            <button type="button" className="btn-redondo" aria-label="Próximo mês" onClick={() => mudarMes(1)} disabled={ehMesAtual}><Icon nome="direita" /></button>
          </div>
        </div>
        <div className="calendario" role="group" aria-label={`Fechamentos de ${tituloMes}`} key={`${mes.ano}-${mes.mes}`}>
          {LETRAS.map((l, i) => <span key={i} className="cal-semana-nome" aria-hidden="true">{l}</span>)}
          {gradeDoMes(mes.ano, mes.mes).flat().map((k, i) => {
            if (!k) return <span key={`v${i}`} className="cal-vazio" />
            const f = porData.get(k)
            const s = situacaoDia(k, f, aj)
            const info = SITUACAO[s]
            const rotuloCel = `${Number(k.slice(8))} de ${tituloMes.split(' ')[0]}: ${info.rotulo}${f?.valor_total != null ? `, ${brl(f.valor_total)}` : ''}`
            const conteudo = <>
              <span className="cal-num">{Number(k.slice(8))}</span>
              {['conferido', 'enviado', 'divergente', 'atrasado', 'pendente', 'sem-expediente'].includes(s) && (
                <span className="cal-marca"><Icon nome={info.icone} tamanho={12} traco={2.2} /><span>{info.curto || info.rotulo}</span></span>
              )}
              {f?.valor_total != null && <span className="cal-valor">R$ {reaisCurto(Number(f.valor_total))}</span>}
            </>
            return s === 'futuro'
              ? <span key={k} className={`cal-dia s-${s}`} style={{ '--i': i }} aria-label={rotuloCel}>{conteudo}</span>
              : <button key={k} type="button" className={`cal-dia s-${s} ${k === hoje ? 'hoje' : ''}`} style={{ '--i': i }} aria-label={rotuloCel} onClick={() => abrirDia(k)}>{conteudo}</button>
          })}
        </div>
        <div className="cal-legenda" aria-hidden="true">
          <span><i style={{ background: 'var(--st-bom)' }} />Conferido</span>
          <span><i style={{ background: 'var(--st-info)' }} />Aguardando conferência</span>
          <span><i style={{ background: 'var(--st-serio)' }} />Divergente</span>
          <span><i style={{ background: 'var(--st-critico)' }} />Faltando</span>
          <span><i style={{ background: 'var(--st-aviso)' }} />Pendente hoje</span>
          <span><i style={{ background: 'var(--st-neutro)' }} />Sem expediente</span>
        </div>
      </section>

      <div className="grade-relatorio" style={{ marginTop: 'var(--gap)' }}>
        <Bloco titulo="Total por dia" id="fech-total" sub="Últimos 30 dias, pela soma informada em cada fechamento.">
          {colunasMes.some(c => c.valor != null) ? (
            <VistaGrafico rotulo="o total por dia" tabela={{ colunas: ['Dia', 'Total'], linhas: colunasMes.filter(c => c.valor != null).map(c => [c.titulo, brl(c.valor)]) }}>
              <Colunas itens={colunasMes} altura={200} rotulo="Total por dia nos últimos 30 dias" media={janela === '30' ? resumo.mediaPorDia : null} />
            </VistaGrafico>
          ) : <Vazio icone="moeda">Nenhum total informado nos últimos 30 dias.</Vazio>}
        </Bloco>
        <Bloco titulo="Últimos envios" id="fech-recentes">
          {recentes.length ? (
            <ul className="lista-simples">
              {recentes.map(f => {
                const s = situacaoDia(f.data, f, aj)
                return (
                  <li key={f.id}>
                    <button type="button" className="ls-linha" onClick={() => abrirDia(f.data)}>
                      <span className="ls-id">
                        <strong>{data(f.data)} · {NOMES_DIA[dataLocal(f.data).getDay()]}</strong>
                        <small>{f.status === 'Sem expediente' ? f.observacoes : `${f.valor_total != null ? `${brl(f.valor_total)} · ` : ''}${f.enviado_por ? `${nomeCurto(dados, f.enviado_por)} às ${hora(f.primeiro_envio_em || f.enviado_em)}` : ''}${enviadoNoPrazo(f, aj) ? '' : ' · fora do prazo'}`}</small>
                      </span>
                      <Pill tom={SITUACAO[s].tom} icone={SITUACAO[s].icone}>{SITUACAO[s].curto || SITUACAO[s].rotulo}</Pill>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : <Vazio icone="fechamento">Nenhum fechamento enviado ainda.</Vazio>}
        </Bloco>
      </div>

      <Presenca>{diaAberto && <GavetaDia key={diaAberto} chave={diaAberto} fechamento={porData.get(diaAberto)} aj={aj} aoFechar={fecharDia} />}</Presenca>
      <Presenca>{ajustes && admin && <GavetaAjustes aj={aj} aoFechar={() => setAjustes(false)} />}</Presenca>
      {estado.carregando && !estado.em && <p className="carregando-texto">Carregando…</p>}
    </>
  )
}

const nomeCurto = (dados, id) => dados.equipe.find(m => m.id === id)?.nome?.split(' ')[0] || 'Equipe'

// ------------------------------------------------------------------ cartão de hoje
function CartaoHoje({ chave, fechamento: f, situacao: s, aj, aoAbrir }) {
  const { dados, mapas } = useApp()
  const [mostrarForm, setMostrarForm] = useState(false)
  const info = SITUACAO[s]
  const anexos = f ? dados.anexos.filter(a => a.entidade === 'fechamentos' && a.registro_id === f.id).sort((a, b) => b.criado_em.localeCompare(a.criado_em)) : []
  const prazo = prazoDoDia(chave, aj)

  const estado = (
    <div className="hoje-estado">
      <span className={`op-icone tom-${info.op || 'info'}`}><Icon nome={s === 'livre' ? 'calendario' : info.icone} tamanho={20} /></span>
      <span>
        <strong>{s === 'livre' ? 'Hoje não tem fechamento' : s === 'pendente' ? 'Ainda não enviado' : s === 'atrasado' ? 'Prazo vencido' : info.rotulo}</strong>
        <small>
          {s === 'pendente' && `Envie a planilha até ${hora(prazo)}${aj.prazo_dia_seguinte ? ' de amanhã' : ''}.`}
          {s === 'atrasado' && `O prazo era ${hora(prazo)}. Ainda dá para enviar.`}
          {s === 'livre' && `${NOMES_DIA[dataLocal(chave).getDay()][0].toUpperCase()}${NOMES_DIA[dataLocal(chave).getDay()].slice(1)} não está entre os dias com fechamento.`}
          {f && f.status !== 'Sem expediente' && `Enviado por ${mapas.equipe[f.enviado_por]?.nome || 'Equipe'} às ${hora(f.primeiro_envio_em || f.enviado_em)}${enviadoNoPrazo(f, aj) ? ', no prazo' : ', fora do prazo'}.`}
          {f?.status === 'Sem expediente' && f.observacoes}
        </small>
      </span>
    </div>
  )

  if (!f && (s === 'pendente' || s === 'atrasado' || mostrarForm)) {
    return <>{estado}<FormEnvio chave={chave} /></>
  }
  return (
    <>
      {estado}
      {f?.status === 'Divergente' && <div className="nota nota-aviso" role="note"><Icon nome="alerta" /><span><strong>Divergência:</strong> {f.nota_conferencia}</span></div>}
      {anexos[0] && <ArquivoCartao anexo={anexos[0]} versoes={anexos.length} />}
      {f && f.valor_total != null && <p className="hoje-total">Total do dia <strong className="num">{brl(f.valor_total)}</strong></p>}
      <div className="hoje-acoes">
        {f && <Botao variante="secundario" icone="direita" onClick={aoAbrir}>{f.status === 'Divergente' ? 'Corrigir e reenviar' : 'Abrir o dia'}</Botao>}
        {!f && s === 'livre' && <Botao variante="secundario" icone="enviar" onClick={() => setMostrarForm(true)}>Enviar mesmo assim</Botao>}
      </div>
    </>
  )
}

function ArquivoCartao({ anexo, versoes, aoPrevia, atual = true }) {
  const { notificar, mapas } = useApp()
  const ext = extensao(anexo.nome)
  return (
    <div className="arquivo-cartao">
      <span className={`arq-icone ${ext === 'csv' ? 'csv' : ['xlsx', 'xlsm', 'xls', 'ods'].includes(ext) ? '' : 'outro'}`} aria-hidden="true">{(ext || 'arq').toUpperCase().slice(0, 4)}</span>
      <span className="arq-info">
        <strong title={anexo.nome}>{anexo.nome}</strong>
        <small className="num">{tamanhoArquivo(anexo.tamanho)} · {dataHora(anexo.criado_em)} · {mapas.equipe[anexo.criado_por]?.nome || 'Equipe'}{versoes > 1 && atual ? ` · ${versoes} versões` : ''}</small>
      </span>
      <span className="arq-acoes">
        {aoPrevia && <Botao variante="texto" tamanho="mini" icone="olho" onClick={aoPrevia}>Prévia</Botao>}
        <Botao variante="secundario" tamanho="mini" icone="baixar" onClick={() => api.baixarAnexo(anexo).catch(e => notificar(e.message))}>Abrir</Botao>
      </span>
    </div>
  )
}

// ------------------------------------------------------------------ envio da planilha
function FormEnvio({ chave, existente, aoEnviado, compacto }) {
  const { recarregar, notificar } = useApp()
  const [arquivo, setArquivo] = useState(null)
  const [valor, setValor] = useState(existente?.valor_total != null ? String(existente.valor_total).replace('.', ',') : '')
  const [obs, setObs] = useState(existente?.status === 'Sem expediente' ? '' : existente?.observacoes || '')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [previa, setPrevia] = useState(false)
  const reenvio = Boolean(existente)

  const escolher = f => {
    setErro('')
    if (!ehPlanilha(f.name)) { setErro(`“${f.name}” não é uma planilha. Envie ${EXTENSOES_PLANILHA.map(e => `.${e}`).join(', ')}.`); return }
    if (f.size > 10 * 1024 * 1024) { setErro('O arquivo passa de 10 MB.'); return }
    setArquivo(f); setPrevia(false)
  }
  async function enviar(e) {
    e.preventDefault()
    const v = lerValor(valor)
    if (Number.isNaN(v)) return setErro('Total do dia inválido. Use números, como 4.250,90.')
    if (!arquivo && !reenvio) return setErro('Escolha a planilha do fechamento.')
    setEnviando(true); setErro('')
    try {
      await api.enviarFechamento({ id: existente?.id, data: chave, valor_total: v == null ? null : centavos(v), observacoes: obs.trim() || null }, arquivo)
      await recarregar()
      notificar(`Fechamento de ${data(chave)} ${reenvio ? 'atualizado' : 'enviado'}.`, 'sucesso')
      setArquivo(null)
      aoEnviado?.()
    } catch (err) { setErro(err.message) } finally { setEnviando(false) }
  }

  return (
    <form className="form-envio" onSubmit={enviar} noValidate>
      <div className="largo">
        {arquivo ? (
          <div className="arquivo-cartao">
            <span className={`arq-icone ${extensao(arquivo.name) === 'csv' ? 'csv' : ''}`} aria-hidden="true">{extensao(arquivo.name).toUpperCase()}</span>
            <span className="arq-info"><strong title={arquivo.name}>{arquivo.name}</strong><small className="num">{tamanhoArquivo(arquivo.size)} · pronto para enviar</small></span>
            <span className="arq-acoes">
              {['xlsx', 'xlsm', 'csv'].includes(extensao(arquivo.name)) && <Botao variante="texto" tamanho="mini" icone="olho" onClick={() => setPrevia(p => !p)}>{previa ? 'Ocultar' : 'Conferir'}</Botao>}
              <Botao variante="secundario" tamanho="mini" onClick={() => { setArquivo(null); setPrevia(false) }} disabled={enviando}>Trocar</Botao>
            </span>
          </div>
        ) : (
          <ZonaArquivo aoEscolher={escolher} aceita={ACEITA} compacta={compacto} desativado={enviando}
            titulo={reenvio ? 'Arraste a planilha corrigida ou clique para escolher' : 'Arraste a planilha do fechamento aqui'}
            dica={`ou clique para escolher · ${EXTENSOES_PLANILHA.map(e => `.${e}`).join(' ')} · até 10 MB`} />
        )}
      </div>
      {previa && arquivo && <div className="largo"><Previa arquivo={arquivo} /></div>}
      <Campo rotulo="Total do dia (R$)" dica="Opcional. Entra nos gráficos e relatórios.">{(id, d) => <input id={id} aria-describedby={d} inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />}</Campo>
      <Campo rotulo="Observações">{id => <input id={id} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: sangria às 15h" maxLength={300} />}</Campo>
      {erro && <p className="erro-inline largo" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="submit" className="btn btn-primario" disabled={enviando || (!arquivo && !reenvio)}>
          <Icon nome={enviando ? 'atualizar' : 'enviar'} className={enviando ? 'girando' : ''} />
          <span>{enviando ? 'Enviando…' : reenvio ? (arquivo ? 'Reenviar fechamento' : 'Salvar dados') : 'Enviar fechamento'}</span>
        </button>
      </div>
    </form>
  )
}

// ------------------------------------------------------------------ prévia da planilha
function Previa({ anexo, arquivo }) {
  const { notificar } = useApp()
  const [estado, setEstado] = useState({ carregando: true })
  const [aba, setAba] = useState(0)
  useEffect(() => {
    let vivo = true
    setEstado({ carregando: true })
    const tarefa = arquivo ? import('../lib/planilha.js').then(m => m.lerPlanilha(arquivo, arquivo.name)) : api.lerPlanilha(anexo)
    tarefa.then(r => vivo && setEstado({ planilha: r })).catch(e => vivo && setEstado({ erro: e.message }))
    return () => { vivo = false }
  }, [anexo?.id, arquivo])
  if (estado.carregando) return <div className="previa"><div className="previa-rodape"><Icon nome="atualizar" tamanho={13} className="girando" /> Lendo a planilha…</div></div>
  if (estado.erro) {
    return (
      <div className="previa">
        <div className="previa-rodape"><Icon nome="info" tamanho={14} /> {estado.erro}</div>
        {anexo && <div className="previa-barra"><span /><Botao variante="secundario" tamanho="mini" icone="baixar" onClick={() => api.baixarAnexo(anexo).catch(e => notificar(e.message))}>Abrir no Excel</Botao></div>}
      </div>
    )
  }
  const abas = estado.planilha.abas
  const atual = abas[Math.min(aba, abas.length - 1)]
  const letras = Array.from({ length: atual.colunas }, (_, i) => { let s = ''; let n = i + 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26) } return s })
  return (
    <div className="previa">
      <div className="previa-barra">
        <strong className="previa-titulo"><Icon nome="planilha" tamanho={15} /> Prévia</strong>
        {abas.length > 1 && <Segmentado pequeno rotuloAcessivel="Aba da planilha" valor={String(Math.min(aba, abas.length - 1))} aoMudar={v => setAba(Number(v))} opcoes={abas.map((a, i) => ({ id: String(i), rotulo: a.nome }))} />}
      </div>
      {atual.linhas.length ? (
        <div className="previa-rolagem">
          <table className="previa-tabela">
            <thead><tr><th scope="col" aria-label="Linha" />{letras.map(l => <th key={l} scope="col">{l}</th>)}</tr></thead>
            <tbody>{atual.linhas.map(l => <tr key={l.numero}><th scope="row">{l.numero}</th>{l.valores.map((v, i) => <td key={i} className={/^-?(R\$\s?)?[\d.,]+%?$/.test(v.replace(/ /g, ' ')) ? 'num' : ''} title={v}>{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : <div className="previa-rodape">Esta aba está vazia.</div>}
      <div className="previa-rodape">{atual.cortada ? `Mostrando as primeiras ${num(atual.linhas.length)} de ${num(atual.totalLinhas)} linhas.` : `${num(atual.totalLinhas)} ${atual.totalLinhas === 1 ? 'linha' : 'linhas'} com dados · aba “${atual.nome}”.`}</div>
    </div>
  )
}

// ------------------------------------------------------------------ gaveta do dia
function GavetaDia({ chave, fechamento: f, aj, aoFechar }) {
  const { dados, mapas, eu, recarregar, notificar } = useApp()
  const admin = eu.perfil === 'admin'
  const s = situacaoDia(chave, f, aj)
  const info = SITUACAO[s]
  const anexos = f ? dados.anexos.filter(a => a.entidade === 'fechamentos' && a.registro_id === f.id).sort((a, b) => b.criado_em.localeCompare(a.criado_em)) : []
  const historico = f ? dados.historico.filter(h => h.entidade === 'fechamentos' && h.registro_id === f.id) : []
  const [previa, setPrevia] = useState(() => anexos[0]?.id || null)
  const [dialogo, setDialogo] = useState(null)
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const podeEnviar = s !== 'futuro' && (!f || f.status === 'Enviado' || f.status === 'Divergente' || admin)
  const anexoPrevia = anexos.find(a => a.id === previa)

  async function executar(fn, msg) {
    setOcupado(true)
    try { await fn(); await recarregar(); notificar(msg, 'sucesso'); setDialogo(null); setTexto('') }
    catch (e) { notificar(e.message) } finally { setOcupado(false) }
  }
  const conferir = () => executar(() => api.conferirFechamento(f.id, 'Conferido', texto), `Fechamento de ${data(chave)} conferido.`)

  return (
    <Gaveta titulo={`Fechamento de ${dataLonga(chave)}`} subtitulo={info.rotulo} aoFechar={aoFechar} largura="larga"
      cabecalho={<span className={`op-icone tom-${info.op || 'info'}`}><Icon nome={info.icone} tamanho={18} /></span>}
      rodape={admin && f && f.status !== 'Sem expediente' ? <>
        <Botao variante="perigo-texto" icone="lixeira" onClick={() => setDialogo('excluir')}>Excluir</Botao>
        <span className="espaco" />
        {f.status !== 'Divergente' && <Botao variante="secundario" icone="alerta" onClick={() => setDialogo('divergente')}>Apontar divergência</Botao>}
        {f.status !== 'Conferido' && <Botao variante="primario" icone="check" onClick={conferir} disabled={ocupado}>Marcar como conferido</Botao>}
      </> : admin && f?.status === 'Sem expediente' ? <>
        <span className="espaco" /><Botao variante="secundario" icone="fechar" onClick={() => executar(() => api.excluirFechamento(f, []), 'O dia voltou a esperar fechamento.')} disabled={ocupado}>Desfazer “sem expediente”</Botao>
      </> : admin && !f && s !== 'futuro' ? <>
        <span className="espaco" /><Botao variante="secundario" icone="menos-circulo" onClick={() => setDialogo('sem-expediente')}>Marcar sem expediente</Botao>
      </> : null}>
      <div className="dia-corpo">
        {f && f.status !== 'Sem expediente' && (
          <dl className="ficha">
            <div><dt>Enviado por</dt><dd>{mapas.equipe[f.enviado_por]?.nome || 'Equipe'}</dd></div>
            <div><dt>Primeiro envio</dt><dd>{dataHora(f.primeiro_envio_em || f.enviado_em)} {enviadoNoPrazo(f, aj) ? <Pill tom="positivo">No prazo</Pill> : <Pill tom="aviso">Fora do prazo</Pill>}</dd></div>
            <div><dt>Total do dia</dt><dd className="num">{f.valor_total != null ? brl(f.valor_total) : '—'}</dd></div>
            <div><dt>Conferência</dt><dd>{f.conferido_em ? `${mapas.equipe[f.conferido_por]?.nome || 'Administrador'} em ${dataHora(f.conferido_em)}` : 'Ainda não conferido'}</dd></div>
            {f.observacoes && <div className="largo"><dt>Observações</dt><dd>{f.observacoes}</dd></div>}
          </dl>
        )}
        {f?.status === 'Divergente' && <div className="nota nota-aviso" role="note"><Icon nome="alerta" /><span><strong>Divergência apontada:</strong> {f.nota_conferencia}{podeEnviar ? ' Envie a planilha corrigida abaixo.' : ''}</span></div>}
        {f?.status === 'Conferido' && f.nota_conferencia && <div className="nota" role="note"><Icon nome="check-circulo" /><span>{f.nota_conferencia}</span></div>}
        {f?.status === 'Sem expediente' && <Vazio icone="menos-circulo">Dia marcado como sem expediente: {f.observacoes}</Vazio>}
        {!f && s === 'livre' && <div className="nota" role="note"><Icon nome="info" /><span>Este dia não está entre os dias com fechamento, mas você pode enviar se houve expediente.</span></div>}
        {!f && s === 'antes' && <div className="nota" role="note"><Icon nome="info" /><span>Este dia é anterior ao início do controle; ele não conta como faltando.</span></div>}
        {s === 'futuro' && <Vazio icone="calendario">Este dia ainda não chegou.</Vazio>}

        {anexos.length > 0 && (
          <section className="dia-secao">
            <h3>Planilhas {anexos.length > 1 && <span className="muted">· {anexos.length} versões</span>}</h3>
            <ul className="arquivos">
              {anexos.map((a, i) => (
                <li key={a.id}>
                  <ArquivoCartao anexo={a} versoes={anexos.length} atual={i === 0} aoPrevia={['xlsx', 'xlsm', 'csv'].includes(extensao(a.nome)) ? () => setPrevia(p => (p === a.id ? null : a.id)) : null} />
                  {i === 0 && anexos.length > 1 && <small className="versao">Versão atual</small>}
                </li>
              ))}
            </ul>
            {anexoPrevia && <Previa anexo={anexoPrevia} />}
          </section>
        )}

        {podeEnviar && f?.status !== 'Sem expediente' && (
          <section className="dia-secao">
            <h3>{f ? (f.status === 'Divergente' ? 'Enviar a planilha corrigida' : 'Substituir ou atualizar') : 'Enviar o fechamento deste dia'}</h3>
            {f?.status === 'Conferido' && <p className="campo-dica">Reenviar um fechamento conferido volta o dia para “aguardando conferência”.</p>}
            <FormEnvio chave={chave} existente={f} compacto />
          </section>
        )}
        {!podeEnviar && f?.status === 'Conferido' && <p className="campo-dica">Fechamento conferido. Para corrigir, peça a um administrador para apontar a divergência.</p>}

        {historico.length > 0 && <section className="dia-secao"><h3>Histórico</h3><Linha eventos={historico} mapas={mapas} /></section>}
      </div>

      <Presenca>{dialogo === 'divergente' && (
        <Dialogo titulo="Apontar divergência" icone="alerta" tom="aviso" aoFechar={() => setDialogo(null)} acoes={<>
          <Botao variante="secundario" onClick={() => setDialogo(null)}>Voltar</Botao>
          <Botao variante="primario" disabled={!texto.trim() || ocupado} onClick={() => executar(() => api.conferirFechamento(f.id, 'Divergente', texto), 'Divergência registrada. A equipe pode reenviar a planilha.')}>Registrar divergência</Botao>
        </>}>
          <p>Quem enviou verá a nota e poderá mandar a planilha corrigida. O dia fica marcado em laranja no calendário.</p>
          <Campo rotulo="O que está diferente?" obrigatorio>{id => <textarea id={id} rows={3} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Ex.: o PIX da tarde não bate com o extrato" />}</Campo>
        </Dialogo>
      )}</Presenca>
      <Presenca>{dialogo === 'sem-expediente' && (
        <Dialogo titulo="Marcar dia sem expediente" icone="menos-circulo" aoFechar={() => setDialogo(null)} acoes={<>
          <Botao variante="secundario" onClick={() => setDialogo(null)}>Voltar</Botao>
          <Botao variante="primario" disabled={!texto.trim() || ocupado} onClick={() => executar(() => api.marcarSemExpediente(chave, texto), `${data(chave)} marcado como sem expediente.`)}>Marcar</Botao>
        </>}>
          <p>O dia deixa de contar como faltando. Use para feriados, inventário ou loja fechada.</p>
          <Campo rotulo="Motivo" obrigatorio>{id => <input id={id} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Ex.: feriado municipal" />}</Campo>
        </Dialogo>
      )}</Presenca>
      <Presenca>{dialogo === 'excluir' && (
        <Dialogo titulo="Excluir este fechamento?" icone="lixeira" tom="ruim" aoFechar={() => setDialogo(null)} acoes={<>
          <Botao variante="secundario" onClick={() => setDialogo(null)}>Voltar</Botao>
          <Botao variante="perigo" disabled={ocupado} onClick={() => executar(() => api.excluirFechamento(f, anexos), 'Fechamento excluído.')}>Excluir</Botao>
        </>}>
          <p>{anexos.length ? `As ${anexos.length} planilhas enviadas serão apagadas. ` : ''}O dia volta a aparecer como {s === 'livre' ? 'sem fechamento' : 'faltando'} no calendário.</p>
        </Dialogo>
      )}</Presenca>
    </Gaveta>
  )
}

// ------------------------------------------------------------------ ajustes (administrador)
function GavetaAjustes({ aj, aoFechar }) {
  const { recarregar, notificar } = useApp()
  const [dias, setDias] = useState(() => new Set(aj.dias_semana.map(Number)))
  const [limite, setLimite] = useState(String(aj.horario_limite || '20:00').slice(0, 5))
  const [seguinte, setSeguinte] = useState(Boolean(aj.prazo_dia_seguinte))
  const [inicio, setInicio] = useState(aj.inicio || chaveDia())
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const alternar = d => setDias(s => { const n = new Set(s); n.has(d) ? n.delete(d) : n.add(d); return n })
  async function salvar(e) {
    e.preventDefault()
    if (!dias.size) return setErro('Escolha ao menos um dia da semana com fechamento.')
    if (!/^\d{2}:\d{2}$/.test(limite)) return setErro('Informe o horário limite.')
    setSalvando(true); setErro('')
    try {
      await api.salvarAjustesFechamento({ dias_semana: [...dias].sort(), horario_limite: limite, prazo_dia_seguinte: seguinte, inicio })
      await recarregar(); notificar('Ajustes dos fechamentos salvos.', 'sucesso'); aoFechar()
    } catch (err) { setErro(err.message) } finally { setSalvando(false) }
  }
  return (
    <Gaveta titulo="Ajustes dos fechamentos" subtitulo="Valem para toda a equipe." largura="estreita" aoFechar={aoFechar}
      rodape={<><Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao><button type="submit" form="form-ajustes" className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button></>}>
      <form id="form-ajustes" className="form-gaveta" onSubmit={salvar} noValidate>
        <div className="campo">
          <span className="campo-rotulo">Dias com fechamento</span>
          <div className="dias-semana" role="group" aria-label="Dias da semana com fechamento">
            {LETRAS.map((l, d) => <button key={d} type="button" aria-pressed={dias.has(d)} aria-label={NOMES_DIA[d]} title={NOMES_DIA[d]} onClick={() => alternar(d)}>{l}</button>)}
          </div>
          <small className="campo-dica">Nos outros dias, a falta de fechamento não conta.</small>
        </div>
        <div className="dupla">
          <Campo rotulo="Enviar até">{id => <input id={id} type="time" value={limite} onChange={e => setLimite(e.target.value)} />}</Campo>
          <Campo rotulo="Controle desde" dica="Dias anteriores não contam.">{(id, d) => <input id={id} aria-describedby={d} type="date" value={inicio} max={chaveDia()} onChange={e => setInicio(e.target.value)} />}</Campo>
        </div>
        <Interruptor ligado={seguinte} aoMudar={setSeguinte} dica={seguinte ? `O fechamento de cada dia pode ser enviado até ${limite} do dia seguinte.` : `O fechamento precisa ser enviado até ${limite} do próprio dia.`}>Prazo vai até o dia seguinte</Interruptor>
        {erro && <p className="erro-inline" role="alert">{erro}</p>}
      </form>
    </Gaveta>
  )
}

