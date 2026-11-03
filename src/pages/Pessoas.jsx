import { useMemo, useState } from 'react'
import {
  useApp, TituloTela, Segmentado, Busca, Pill, Vazio, Carregando, Gaveta, Campo, Botao, Avatar, Abas, CartoesKpi, Medidor, Presenca, Dialogo,
} from '../components/ui.jsx'
import Anexos from '../components/Anexos.jsx'
import Linha from '../components/Linha.jsx'
import Icon from '../components/Icon.jsx'
import { AvisoMigracao } from './Relatorios.jsx'
import { api } from '../lib/api.js'
import { ir } from '../lib/rota.js'
import {
  vencimentos, situacaoPessoa, idsVigentes, situacaoValidade, SITUACOES_FUNCIONARIO, SUGESTOES_TREINAMENTO, SUGESTOES_DOCUMENTO,
  validadeSugerida, chaveDia, JANELA_AVISO,
} from '../lib/business.js'
import { data, dias, num, pct } from '../lib/format.js'

const FILTROS_PESSOAS = [
  { id: 'todos', rotulo: 'Todos' }, { id: 'pendencia', rotulo: 'Com pendência' },
  { id: 'Ativo', rotulo: 'Ativos' }, { id: 'Afastado', rotulo: 'Afastados' }, { id: 'Desligado', rotulo: 'Desligados' },
]
const FILTROS_VENC = [
  { id: 'atencao', rotulo: 'Pedem atenção' }, { id: 'vencido', rotulo: 'Vencidos' }, { id: '90', rotulo: 'Próximos 90 dias' }, { id: 'todos', rotulo: 'Todos' },
]
const GRUPOS_VENC = [
  { id: 'vencido', rotulo: 'Vencidos', filtro: i => i.codigo === 'vencido' },
  { id: 'vence', rotulo: `Vencem em até ${JANELA_AVISO} dias`, filtro: i => i.codigo === 'vence' },
  { id: '90', rotulo: 'Vencem em 31 a 90 dias', filtro: i => i.codigo === 'em-dia' && i.dias <= 90 },
  { id: 'depois', rotulo: 'Depois de 90 dias', filtro: i => i.codigo === 'em-dia' && i.dias > 90 },
  { id: 'sem', rotulo: 'Sem validade', filtro: i => i.codigo === 'sem-validade' },
]
const ICONE_SITUACAO = { vencido: 'alerta', vence: 'relogio', 'em-dia': 'check', 'sem-validade': 'menos-circulo' }

export function textoValidade(item) {
  if (item.codigo === 'sem-validade') return 'Sem validade'
  if (item.dias < 0) return `Venceu há ${dias(-item.dias)}`
  if (item.dias === 0) return 'Vence hoje'
  if (item.codigo === 'vence') return `Vence em ${dias(item.dias)}`
  return `Válido até ${data(item.validade)}`
}
const tomPill = codigo => ({ vencido: 'negativo', vence: 'aviso', 'em-dia': 'positivo', 'sem-validade': 'neutro' }[codigo])

export default function Pessoas({ params }) {
  const { dados, estado } = useApp()
  const vista = params.get('vista') === 'vencimentos' ? 'vencimentos' : 'funcionarios'
  const abrir = params.get('abrir')
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const filtroV = FILTROS_VENC.some(f => f.id === params.get('filtro')) ? params.get('filtro') : 'atencao'
  const [categoria, setCategoria] = useState('todos')
  const navegar = mudancas => {
    const p = new URLSearchParams(params)
    Object.entries(mudancas).forEach(([k, v]) => (v == null ? p.delete(k) : p.set(k, v)))
    ir(`pessoas${p.toString() ? `?${p}` : ''}`)
  }

  const itens = useMemo(() => vencimentos(dados), [dados])
  const porPessoa = useMemo(() => {
    const m = new Map(dados.funcionarios.map(f => [f.id, []]))
    itens.forEach(i => m.get(i.funcionario.id)?.push(i))
    return m
  }, [itens, dados.funcionarios])
  const busca = q.trim().toLowerCase()
  const pessoas = useMemo(() => dados.funcionarios
    .map(f => ({ f, s: situacaoPessoa(porPessoa.get(f.id) || []) }))
    .filter(({ f, s }) => filtro === 'todos' || (filtro === 'pendencia' ? s.vencidos + s.vencendo > 0 && f.situacao !== 'Desligado' : f.situacao === filtro))
    .filter(({ f }) => !busca || [f.nome, f.cargo, f.setor, f.matricula].some(v => (v || '').toLowerCase().includes(busca)))
    .sort((a, b) => (a.f.situacao === 'Desligado') - (b.f.situacao === 'Desligado') || b.s.vencidos - a.s.vencidos || b.s.vencendo - a.s.vencendo || a.f.nome.localeCompare(b.f.nome)),
  [dados.funcionarios, porPessoa, filtro, busca])

  const aberto = abrir === 'novo' ? 'novo' : dados.funcionarios.find(f => f.id === abrir)
  const conta = c => itens.filter(i => i.codigo === c).length
  const comValidade = itens.filter(i => i.codigo !== 'sem-validade').length
  const ativos = dados.funcionarios.filter(f => f.situacao === 'Ativo').length
  const linha = dados.funcionarios.length
    ? `${ativos} ${ativos === 1 ? 'funcionário ativo' : 'funcionários ativos'} · ${conta('vencido')} ${conta('vencido') === 1 ? 'item vencido' : 'itens vencidos'} · ${conta('vence')} ${conta('vence') === 1 ? 'vence' : 'vencem'} em ${JANELA_AVISO} dias`
    : 'Funcionários, treinamentos, documentos e as datas de vencimento de cada um.'

  if (dados.pendente04) return <><TituloTela titulo="Pessoas" linha="Funcionários, treinamentos, documentos e vencimentos." /><AvisoMigracao /></>

  return (
    <>
      <TituloTela titulo="Pessoas" linha={linha} acoes={<>
        <Segmentado rotuloAcessivel="O que mostrar" valor={vista} aoMudar={v => navegar({ vista: v === 'funcionarios' ? null : v, filtro: null })}
          opcoes={[{ id: 'funcionarios', rotulo: 'Funcionários', icone: 'pessoas' }, { id: 'vencimentos', rotulo: 'Vencimentos', icone: 'calendario' }]} />
        <Botao variante="primario" icone="mais" onClick={() => navegar({ abrir: 'novo' })}>Novo funcionário</Botao>
      </>} />

      <CartoesKpi itens={[
        { rotulo: 'Funcionários ativos', icone: 'pessoas', valor: ativos, formato: v => num(Math.round(v)), legenda: `${dados.funcionarios.length} cadastrados` },
        { rotulo: 'Itens em dia', icone: 'check-circulo', valor: comValidade ? (100 * conta('em-dia')) / comValidade : '—', formato: v => pct(Math.round(v * 10) / 10), legenda: `${conta('em-dia')} de ${comValidade} com validade` },
        { rotulo: `Vencem em ${JANELA_AVISO} dias`, icone: 'relogio', valor: conta('vence'), formato: v => num(Math.round(v)), tom: conta('vence') ? 'aviso' : null, legenda: 'renove antes de vencer', link: '#/pessoas?vista=vencimentos&filtro=atencao' },
        { rotulo: 'Vencidos', icone: 'alerta-circulo', valor: conta('vencido'), formato: v => num(Math.round(v)), tom: conta('vencido') ? 'negativo' : null, legenda: conta('vencido') ? 'precisam de renovação' : 'nada vencido', link: '#/pessoas?vista=vencimentos&filtro=vencido' },
      ]} />

      {vista === 'funcionarios' ? (
        <>
          <div className="barra-ferramentas">
            <Busca valor={q} aoMudar={setQ} rotulo="Buscar funcionários" placeholder="Nome, cargo, setor ou matrícula" />
            <div className="filtros" role="group" aria-label="Filtrar funcionários">
              {FILTROS_PESSOAS.map(f => (
                <button key={f.id} type="button" className="chip" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.rotulo}</button>
              ))}
            </div>
          </div>
          {estado.carregando && !estado.em ? <Carregando linhas={6} /> : pessoas.length ? (
            <div className="grade-pessoas">
              {pessoas.map(({ f, s }) => <CartaoPessoa key={f.id} funcionario={f} situacao={s} itens={porPessoa.get(f.id) || []} aoAbrir={() => navegar({ abrir: f.id })} />)}
            </div>
          ) : (
            <Vazio icone="pessoas" acao={!busca && filtro === 'todos' && <Botao variante="primario" icone="mais" onClick={() => navegar({ abrir: 'novo' })}>Cadastrar o primeiro funcionário</Botao>}>
              {busca ? `Ninguém encontrado para “${q.trim()}”.` : filtro === 'todos' ? 'Nenhum funcionário cadastrado. Cadastre a equipe e registre os treinamentos e documentos de cada pessoa para acompanhar os vencimentos.' : 'Ninguém nesta situação.'}
            </Vazio>
          )}
        </>
      ) : (
        <Vencimentos itens={itens} filtro={filtroV} aoFiltrar={v => navegar({ filtro: v })} categoria={categoria} aoCategoria={setCategoria}
          aoAbrir={(id, aba) => navegar({ abrir: id, aba })} />
      )}

      <Presenca>{aberto && <GavetaPessoa key={aberto === 'novo' ? 'novo' : aberto.id} registro={aberto === 'novo' ? null : aberto} abaInicial={params.get('aba')}
        aoFechar={() => navegar({ abrir: null, aba: null })} aoCriar={id => navegar({ abrir: id, aba: 'treinamentos' })} />}</Presenca>
    </>
  )
}

function CartaoPessoa({ funcionario: f, situacao: s, itens, aoAbrir }) {
  const comValidade = itens.filter(i => i.codigo !== 'sem-validade')
  const emDia = comValidade.filter(i => i.codigo === 'em-dia').length
  const resumo = s.codigo === 'sem-registros' ? 'Nenhum treinamento ou documento'
    : [s.vencidos && `${s.vencidos} ${s.vencidos === 1 ? 'vencido' : 'vencidos'}`, s.vencendo && `${s.vencendo} ${s.vencendo === 1 ? 'vence' : 'vencem'} em breve`].filter(Boolean).join(' · ') || 'Tudo em dia'
  const proximo = itens.find(i => i.codigo === 'vencido' || i.codigo === 'vence')
  return (
    <button type="button" className={`pessoa-cartao ${f.situacao === 'Desligado' ? 'desligado' : ''}`} onClick={aoAbrir}>
      <span className="pc-topo">
        <Avatar nome={f.nome} />
        <span className="pc-id"><strong>{f.nome}</strong><small>{[f.cargo, f.setor].filter(Boolean).join(' · ') || 'Sem cargo informado'}</small></span>
        <Icon nome="direita" tamanho={14} className="muted" />
      </span>
      <span className="pc-situacoes">
        {f.situacao !== 'Ativo' && <Pill>{f.situacao}</Pill>}
        {f.situacao !== 'Desligado' && <Pill tom={{ vencido: 'negativo', vence: 'aviso', 'em-dia': 'positivo', 'sem-registros': 'neutro' }[s.codigo]} icone={{ vencido: 'alerta', vence: 'relogio', 'em-dia': 'check', 'sem-registros': 'menos-circulo' }[s.codigo]}>{resumo}</Pill>}
      </span>
      {proximo && f.situacao !== 'Desligado' && <span className="pc-proximo"><b>{proximo.nome}</b> · {textoValidade(proximo).toLowerCase()}</span>}
      {comValidade.length > 0 && f.situacao !== 'Desligado' && (
        <span className="pc-rodape">
          <Medidor valor={(100 * emDia) / comValidade.length} tom={s.vencidos ? 'ruim' : s.vencendo ? 'aviso' : 'bom'} rotulo={`${emDia} de ${comValidade.length} em dia`} />
          <span className="num">{emDia}/{comValidade.length} em dia</span>
        </span>
      )}
    </button>
  )
}

function Vencimentos({ itens, filtro, aoFiltrar, categoria, aoCategoria, aoAbrir }) {
  const lista = itens.filter(i => categoria === 'todos' || i.categoria === categoria)
  const visiveis = lista.filter(i => filtro === 'todos' || (filtro === 'atencao' ? ['vencido', 'vence'].includes(i.codigo)
    : filtro === 'vencido' ? i.codigo === 'vencido' : i.codigo !== 'sem-validade' && i.dias <= 90))
  return (
    <>
      <div className="barra-ferramentas">
        <div className="filtros" role="group" aria-label="Filtrar vencimentos">
          {FILTROS_VENC.map(f => (
            <button key={f.id} type="button" className="chip" aria-pressed={filtro === f.id} onClick={() => aoFiltrar(f.id)}>{f.rotulo}</button>
          ))}
        </div>
        <Segmentado pequeno rotuloAcessivel="Tipo" valor={categoria} aoMudar={aoCategoria}
          opcoes={[{ id: 'todos', rotulo: 'Todos' }, { id: 'treinamento', rotulo: 'Treinamentos' }, { id: 'documento', rotulo: 'Documentos' }]} />
      </div>
      {visiveis.length ? (
        <div className="vencimentos">
          {GRUPOS_VENC.map(g => {
            const doGrupo = visiveis.filter(g.filtro)
            if (!doGrupo.length) return null
            return (
              <section key={g.id} className="venc-grupo" aria-label={g.rotulo}>
                <h3>{g.rotulo} <b className="num">{doGrupo.length}</b></h3>
                <ul className="venc-lista">
                  {doGrupo.map(i => (
                    <li key={i.id} className="venc-item">
                      <span className={`venc-icone tom-${i.codigo}`} aria-hidden="true"><Icon nome={i.categoria === 'treinamento' ? 'certificado' : 'documento'} tamanho={16} /></span>
                      <span className="venc-info">
                        <strong>{i.nome}</strong>
                        <small>{i.categoria === 'treinamento' ? `Treinamento · feito em ${data(i.registro.realizado_em)}` : `Documento${i.registro.numero ? ` · ${i.registro.numero}` : i.registro.emitido_em ? ` · emitido em ${data(i.registro.emitido_em)}` : ''}`}</small>
                      </span>
                      <button type="button" className="venc-pessoa" onClick={() => aoAbrir(i.funcionario.id, i.categoria === 'treinamento' ? 'treinamentos' : 'documentos')}>
                        <Avatar nome={i.funcionario.nome} tamanho="p" /><span>{i.funcionario.nome}</span>
                      </button>
                      <span className="venc-data num">
                        <Pill tom={tomPill(i.codigo)} icone={ICONE_SITUACAO[i.codigo]}>{textoValidade(i)}</Pill>
                        {i.validade && i.codigo !== 'em-dia' && <small>{data(i.validade)}</small>}
                      </span>
                      {(i.codigo === 'vencido' || i.codigo === 'vence') ? (
                        <Botao variante="secundario" tamanho="mini" icone="atualizar" onClick={() => aoAbrir(i.funcionario.id, `renovar-${i.categoria}-${i.id}`)}>Renovar</Botao>
                      ) : <span />}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ) : (
        <Vazio icone="check-circulo">{filtro === 'atencao' ? `Nada vencido nem vencendo nos próximos ${JANELA_AVISO} dias.` : 'Nenhum item neste filtro.'}</Vazio>
      )}
    </>
  )
}

// =============================================================================== gaveta da pessoa
const vazioF = { nome: '', cargo: '', setor: '', matricula: '', email: '', telefone: '', admissao: '', situacao: 'Ativo', observacoes: '' }

function GavetaPessoa({ registro, abaInicial, aoFechar, aoCriar }) {
  const { dados, mapas, recarregar, notificar } = useApp()
  const renovar = abaInicial?.startsWith('renovar-') ? abaInicial.split('-') : null
  const [aba, setAba] = useState(() => (renovar ? (renovar[1] === 'treinamento' ? 'treinamentos' : 'documentos') : ['treinamentos', 'documentos', 'dados', 'historico'].includes(abaInicial) ? abaInicial : registro ? 'treinamentos' : 'dados'))
  const [form, setForm] = useState(() => {
    if (!renovar || !registro) return null
    const [, categoria, ...resto] = renovar
    const id = resto.join('-')
    const base = (categoria === 'treinamento' ? dados.treinamentos : dados.documentos).find(x => x.id === id)
    return base ? { categoria, base, renovacao: true } : null
  })
  const treinamentos = registro ? dados.treinamentos.filter(t => t.funcionario_id === registro.id) : []
  const documentos = registro ? dados.documentos.filter(d => d.funcionario_id === registro.id) : []
  const historico = registro ? dados.historico.filter(h => h.entidade === 'funcionarios' && h.registro_id === registro.id) : []

  if (!registro) {
    return (
      <Gaveta titulo="Novo funcionário" subtitulo="Depois de cadastrar, registre os treinamentos e documentos com validade." aoFechar={aoFechar} largura="estreita"
        rodape={<><Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao><button type="submit" form="form-funcionario" className="btn btn-primario">Cadastrar</button></>}>
        <FormFuncionario registro={null} aoSalvar={f => { notificar(`${f.nome} cadastrado.`, 'sucesso'); aoCriar(f.id) }} />
      </Gaveta>
    )
  }

  const cabecalho = <Avatar nome={registro.nome} tamanho="g" />
  const subtitulo = [registro.cargo, registro.setor, registro.situacao !== 'Ativo' && registro.situacao].filter(Boolean).join(' · ') || 'Sem cargo informado'

  if (form) {
    const titulo = form.categoria === 'treinamento' ? (form.registro ? 'Editar treinamento' : form.renovacao ? 'Renovar treinamento' : 'Registrar treinamento') : (form.registro ? 'Editar documento' : form.renovacao ? 'Renovar documento' : 'Registrar documento')
    return (
      <Gaveta titulo={titulo} subtitulo={registro.nome} aoFechar={aoFechar} cabecalho={cabecalho}
        rodape={<><Botao variante="secundario" icone="esquerda" onClick={() => setForm(null)}>Voltar</Botao><span className="espaco" /><button type="submit" form="form-registro" className="btn btn-primario">Salvar</button></>}>
        <FormRegistro funcionario={registro} {...form} aoSalvar={async () => { await recarregar(); setForm(null); notificar('Registro salvo.', 'sucesso') }} />
      </Gaveta>
    )
  }

  const nT = new Set(treinamentos.map(t => t.nome.toLowerCase())).size
  const nD = new Set(documentos.map(d => d.tipo.toLowerCase())).size
  return (
    <Gaveta titulo={registro.nome} subtitulo={subtitulo} aoFechar={aoFechar} cabecalho={cabecalho} largura="media"
      rodape={aba === 'dados' && <><Botao variante="secundario" onClick={aoFechar}>Fechar</Botao><button type="submit" form="form-funcionario" className="btn btn-primario">Salvar alterações</button></>}>
      <Abas rotuloAcessivel="Partes do cadastro" ativa={aba} aoMudar={setAba} abas={[
        { id: 'treinamentos', rotulo: 'Treinamentos', conta: nT },
        { id: 'documentos', rotulo: 'Documentos', conta: nD },
        { id: 'dados', rotulo: 'Dados' },
        { id: 'historico', rotulo: 'Histórico' },
      ]} />
      {aba === 'treinamentos' && (
        <ListaRegistros categoria="treinamento" registros={treinamentos} funcionario={registro}
          aoNovo={() => setForm({ categoria: 'treinamento' })} aoEditar={r => setForm({ categoria: 'treinamento', registro: r })}
          aoRenovar={r => setForm({ categoria: 'treinamento', base: r, renovacao: true })} />
      )}
      {aba === 'documentos' && (
        <ListaRegistros categoria="documento" registros={documentos} funcionario={registro}
          aoNovo={() => setForm({ categoria: 'documento' })} aoEditar={r => setForm({ categoria: 'documento', registro: r })}
          aoRenovar={r => setForm({ categoria: 'documento', base: r, renovacao: true })} />
      )}
      {aba === 'dados' && <FormFuncionario registro={registro} temRegistros={treinamentos.length + documentos.length > 0}
        aoSalvar={() => notificar('Cadastro atualizado.', 'sucesso')} aoExcluir={aoFechar} />}
      {aba === 'historico' && <Linha eventos={historico} mapas={mapas} />}
    </Gaveta>
  )
}

function ListaRegistros({ categoria, registros, funcionario, aoNovo, aoEditar, aoRenovar }) {
  const { dados, recarregar, notificar } = useApp()
  const [excluir, setExcluir] = useState(null)
  const campoNome = categoria === 'treinamento' ? 'nome' : 'tipo'
  const campoData = categoria === 'treinamento' ? 'realizado_em' : 'emitido_em'
  const vigentes = idsVigentes(registros, campoNome, campoData)
  const ordenar = l => [...l].sort((a, b) => {
    const sa = situacaoValidade(a.validade), sb = situacaoValidade(b.validade)
    const o = { vencido: 0, vence: 1, 'em-dia': 2, 'sem-validade': 3 }
    return o[sa.codigo] - o[sb.codigo] || (sa.dias ?? 1e9) - (sb.dias ?? 1e9)
  })
  const atuais = ordenar(registros.filter(r => vigentes.has(r.id)))
  const antigos = registros.filter(r => !vigentes.has(r.id)).sort((a, b) => String(b[campoData] || '').localeCompare(String(a[campoData] || '')))
  const entidade = categoria === 'treinamento' ? 'treinamentos' : 'documentos'
  const anexosDe = r => dados.anexos.filter(a => a.entidade === entidade && a.registro_id === r.id)
  const desligado = funcionario.situacao === 'Desligado'

  async function confirmarExclusao() {
    const r = excluir
    try {
      if (categoria === 'treinamento') await api.excluirTreinamento(r, anexosDe(r))
      else await api.excluirDocumento(r, anexosDe(r))
      await recarregar(); notificar('Registro excluído.', 'sucesso')
    } catch (e) { notificar(e.message) } finally { setExcluir(null) }
  }

  const cartao = (r, antigo) => {
    const s = situacaoValidade(r.validade)
    const item = { ...s, validade: r.validade }
    const meta = categoria === 'treinamento'
      ? [r.realizado_em && `Feito em ${data(r.realizado_em)}`, r.carga_horaria && `${String(r.carga_horaria).replace('.', ',')} h`, r.instituicao].filter(Boolean).join(' · ')
      : [r.numero, r.emitido_em && `Emitido em ${data(r.emitido_em)}`].filter(Boolean).join(' · ')
    return (
      <li key={r.id} className={`registro ${antigo ? 'renovado' : ''}`}>
        <div className="registro-cab">
          <span className={`venc-icone tom-${antigo ? 'sem-validade' : s.codigo}`} aria-hidden="true"><Icon nome={categoria === 'treinamento' ? 'certificado' : 'documento'} tamanho={15} /></span>
          <span className="registro-titulo"><strong>{r[campoNome]}</strong><small>{meta || 'Sem detalhes'}</small></span>
          {antigo ? <Pill tom="neutro">Renovado</Pill> : <Pill tom={tomPill(s.codigo)} icone={ICONE_SITUACAO[s.codigo]}>{textoValidade(item)}</Pill>}
        </div>
        {r.observacoes && <p className="registro-obs">{r.observacoes}</p>}
        <div className="registro-rodape">
          <Anexos compacto entidade={entidade} registroId={r.id} anexos={anexosDe(r)} rotuloBotao={categoria === 'treinamento' ? 'Anexar certificado' : 'Anexar cópia'} />
          {!antigo && (
            <div className="registro-acoes">
              {!desligado && (s.codigo === 'vencido' || s.codigo === 'vence') && <Botao variante="secundario" tamanho="mini" icone="atualizar" onClick={() => aoRenovar(r)}>Renovar</Botao>}
              <button type="button" className="btn-icone" aria-label={`Editar ${r[campoNome]}`} onClick={() => aoEditar(r)}><Icon nome="editar" /></button>
              <button type="button" className="btn-icone" aria-label={`Excluir ${r[campoNome]}`} onClick={() => setExcluir(r)}><Icon nome="lixeira" /></button>
            </div>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="lista-registros">
      <div className="gaveta-sub-cab">
        <h3>{atuais.length ? `${atuais.length} ${categoria === 'treinamento' ? (atuais.length === 1 ? 'treinamento' : 'treinamentos') : (atuais.length === 1 ? 'documento' : 'documentos')}` : ''}</h3>
        <Botao variante="primario" tamanho="mini" icone="mais" onClick={aoNovo}>{categoria === 'treinamento' ? 'Registrar treinamento' : 'Registrar documento'}</Botao>
      </div>
      {atuais.length ? <ul className="registros">{atuais.map(r => cartao(r, false))}</ul> : (
        <Vazio icone={categoria === 'treinamento' ? 'certificado' : 'documento'}>
          {categoria === 'treinamento' ? 'Nenhum treinamento registrado. Registre NRs, brigada, primeiros socorros e outros cursos com a validade de cada um.' : 'Nenhum documento registrado. ASO, CNH, contratos e exames com validade aparecem aqui.'}
        </Vazio>
      )}
      {antigos.length > 0 && (
        <details className="renovados">
          <summary>Histórico de renovações ({antigos.length})</summary>
          <ul className="registros">{antigos.map(r => cartao(r, true))}</ul>
        </details>
      )}
      <Presenca>{excluir && (
        <Dialogo titulo={`Excluir ${excluir[campoNome]}?`} icone="lixeira" tom="ruim" aoFechar={() => setExcluir(null)} acoes={<>
          <Botao variante="secundario" onClick={() => setExcluir(null)}>Voltar</Botao>
          <Botao variante="perigo" onClick={confirmarExclusao}>Excluir</Botao>
        </>}>
          <p>O registro{anexosDe(excluir).length ? ' e os arquivos anexados a ele' : ''} serão apagados. Para guardar o histórico, prefira registrar uma renovação.</p>
        </Dialogo>
      )}</Presenca>
    </div>
  )
}

function FormRegistro({ funcionario, categoria, registro, base, renovacao, aoSalvar }) {
  const treino = categoria === 'treinamento'
  const hoje = chaveDia()
  const sugestoes = treino ? SUGESTOES_TREINAMENTO : SUGESTOES_DOCUMENTO
  const [f, setF] = useState(() => {
    const r = registro || {}
    const nome = r.nome || r.tipo || base?.nome || base?.tipo || ''
    const dataBase = registro ? (treino ? r.realizado_em : r.emitido_em) || '' : hoje
    return {
      nome, data: dataBase, validade: registro ? r.validade || '' : validadeSugerida(sugestoes, nome, dataBase),
      carga_horaria: r.carga_horaria ?? base?.carga_horaria ?? '', instituicao: r.instituicao ?? base?.instituicao ?? '',
      numero: r.numero ?? '', observacoes: r.observacoes ?? '',
    }
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [validadeTocada, setValidadeTocada] = useState(Boolean(registro))
  const set = (k, v) => setF(x => {
    const n = { ...x, [k]: v }
    if ((k === 'nome' || k === 'data') && !validadeTocada) n.validade = validadeSugerida(sugestoes, n.nome, n.data) || x.validade
    return n
  })
  const sugestao = sugestoes.find(s => s.nome.toLowerCase() === f.nome.trim().toLowerCase())

  async function salvar(e) {
    e.preventDefault()
    if (!f.nome.trim()) return setErro(treino ? 'Informe o nome do treinamento.' : 'Informe o tipo do documento.')
    if (treino && !f.data) return setErro('Informe a data em que o treinamento foi feito.')
    if (f.validade && f.data && f.validade < f.data) return setErro(treino ? 'A validade precisa ser igual ou posterior à data do treinamento.' : 'A validade precisa ser igual ou posterior à data de emissão.')
    setSalvando(true); setErro('')
    try {
      if (treino) {
        await api.salvarTreinamento({
          funcionario_id: funcionario.id, nome: f.nome.trim(), realizado_em: f.data, validade: f.validade || null,
          carga_horaria: f.carga_horaria === '' ? null : Number(String(f.carga_horaria).replace(',', '.')), instituicao: f.instituicao.trim() || null, observacoes: f.observacoes.trim() || null,
        }, registro?.id)
      } else {
        await api.salvarDocumento({
          funcionario_id: funcionario.id, tipo: f.nome.trim(), numero: f.numero.trim() || null, emitido_em: f.data || null,
          validade: f.validade || null, observacoes: f.observacoes.trim() || null,
        }, registro?.id)
      }
      await aoSalvar()
    } catch (err) { setErro(err.message) } finally { setSalvando(false) }
  }

  return (
    <form id="form-registro" className="form-gaveta" onSubmit={salvar} noValidate>
      {renovacao && base && (
        <div className="nota" role="note"><Icon nome="info" /><span>O registro anterior ({base.validade ? `válido até ${data(base.validade)}` : 'sem validade'}) fica guardado no histórico de renovações. Informe a data e a validade novas.</span></div>
      )}
      <Campo rotulo={treino ? 'Treinamento' : 'Documento'} obrigatorio dica={treino ? 'Escolha da lista ou escreva o nome do curso.' : 'Escolha da lista ou escreva o tipo.'}>
        {(id, d) => <>
          <input id={id} aria-describedby={d} list={`${id}-lista`} value={f.nome} maxLength={160} disabled={renovacao} onChange={e => set('nome', e.target.value)} placeholder={treino ? 'Ex.: NR-35 Trabalho em altura' : 'Ex.: ASO periódico'} />
          <datalist id={`${id}-lista`}>{sugestoes.map(s => <option key={s.nome} value={s.nome} />)}</datalist>
        </>}
      </Campo>
      <div className="dupla">
        <Campo rotulo={treino ? 'Feito em' : 'Emitido em'} obrigatorio={treino}>{id => <input id={id} type="date" value={f.data} max={hoje} onChange={e => set('data', e.target.value)} />}</Campo>
        <Campo rotulo="Válido até" dica={sugestao?.meses ? `Sugestão: ${sugestao.meses} meses. Confira a exigência da norma e da empresa.` : 'Deixe vazio se não vence.'}>
          {(id, d) => <input id={id} aria-describedby={d} type="date" value={f.validade} min={f.data || undefined} onChange={e => { setValidadeTocada(true); set('validade', e.target.value) }} />}
        </Campo>
      </div>
      {treino ? (
        <div className="dupla">
          <Campo rotulo="Carga horária (h)">{id => <input id={id} inputMode="decimal" value={f.carga_horaria} onChange={e => set('carga_horaria', e.target.value)} placeholder="8" />}</Campo>
          <Campo rotulo="Instituição">{id => <input id={id} value={f.instituicao} onChange={e => set('instituicao', e.target.value)} placeholder="Ex.: SENAI" />}</Campo>
        </div>
      ) : (
        <Campo rotulo="Número ou categoria">{id => <input id={id} value={f.numero} onChange={e => set('numero', e.target.value)} placeholder="Ex.: categoria D" />}</Campo>
      )}
      <Campo rotulo="Observações">{id => <textarea id={id} rows={2} value={f.observacoes} onChange={e => set('observacoes', e.target.value)} />}</Campo>
      {erro && <p className="erro-inline" role="alert">{erro}</p>}
      {salvando && <p className="campo-dica">Salvando…</p>}
      <p className="campo-dica">{treino ? 'Depois de salvar, anexe o certificado no próprio cartão do treinamento.' : 'Depois de salvar, anexe a cópia no cartão do documento.'}</p>
    </form>
  )
}

function FormFuncionario({ registro, temRegistros, aoSalvar, aoExcluir }) {
  const { dados, recarregar, notificar } = useApp()
  const [f, setF] = useState(() => Object.fromEntries(Object.keys(vazioF).map(k => [k, registro?.[k] ?? vazioF[k]])))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const setores = [...new Set(dados.funcionarios.map(x => x.setor).filter(Boolean))].sort()
  const cargos = [...new Set(dados.funcionarios.map(x => x.cargo).filter(Boolean))].sort()
  const anexos = registro ? dados.anexos.filter(a => a.entidade === 'funcionarios' && a.registro_id === registro.id) : []

  async function salvar(e) {
    e.preventDefault()
    if (!f.nome.trim()) return setErro('Informe o nome do funcionário.')
    setSalvando(true); setErro('')
    try {
      const salvo = await api.salvarFuncionario(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, k === 'situacao' ? v : String(v || '').trim() || null])), registro?.id)
      await recarregar(); aoSalvar?.(salvo)
    } catch (err) { setErro(err.message) } finally { setSalvando(false) }
  }
  async function excluir() {
    setSalvando(true)
    try { await api.excluirFuncionario(registro.id); await recarregar(); notificar('Funcionário excluído.', 'sucesso'); aoExcluir?.() }
    catch (err) { setErro(err.message) } finally { setSalvando(false) }
  }

  return (
    <form id="form-funcionario" className="form-gaveta" onSubmit={salvar} noValidate>
      <Campo rotulo="Nome completo" obrigatorio>{id => <input id={id} value={f.nome} maxLength={160} onChange={e => set('nome', e.target.value)} />}</Campo>
      <div className="dupla">
        <Campo rotulo="Cargo">{id => <><input id={id} list={`${id}-l`} value={f.cargo} onChange={e => set('cargo', e.target.value)} /><datalist id={`${id}-l`}>{cargos.map(c => <option key={c} value={c} />)}</datalist></>}</Campo>
        <Campo rotulo="Setor">{id => <><input id={id} list={`${id}-l`} value={f.setor} onChange={e => set('setor', e.target.value)} /><datalist id={`${id}-l`}>{setores.map(c => <option key={c} value={c} />)}</datalist></>}</Campo>
      </div>
      <div className="dupla">
        <Campo rotulo="Situação">{id => <select id={id} value={f.situacao} onChange={e => set('situacao', e.target.value)}>{SITUACOES_FUNCIONARIO.map(s => <option key={s} value={s}>{s}</option>)}</select>}</Campo>
        <Campo rotulo="Admissão">{id => <input id={id} type="date" value={f.admissao || ''} onChange={e => set('admissao', e.target.value)} />}</Campo>
      </div>
      <div className="dupla">
        <Campo rotulo="Telefone">{id => <input id={id} type="tel" value={f.telefone} onChange={e => set('telefone', e.target.value)} />}</Campo>
        <Campo rotulo="Matrícula">{id => <input id={id} value={f.matricula} onChange={e => set('matricula', e.target.value)} />}</Campo>
      </div>
      <Campo rotulo="E-mail">{id => <input id={id} type="email" value={f.email} onChange={e => set('email', e.target.value)} />}</Campo>
      <Campo rotulo="Observações">{id => <textarea id={id} rows={2} value={f.observacoes} onChange={e => set('observacoes', e.target.value)} />}</Campo>
      {registro && (
        <div className="secao-gaveta">
          <h3>Arquivos da pessoa</h3>
          <Anexos compacto entidade="funcionarios" registroId={registro.id} anexos={anexos} rotuloBotao="Anexar arquivo" />
          <p className="campo-dica">Ficha de registro, contrato e outros arquivos sem validade. Só administradores veem.</p>
        </div>
      )}
      {erro && <p className="erro-inline" role="alert">{erro}</p>}
      {salvando && <p className="campo-dica">Salvando…</p>}
      {registro && (
        <div className="secao-gaveta">
          {temRegistros || anexos.length ? (
            <p className="campo-dica">Quem tem treinamentos, documentos ou arquivos não pode ser excluído. Para tirar a pessoa dos vencimentos, mude a situação para “Desligado”.</p>
          ) : confirmar ? (
            <Botao variante="perigo" onClick={excluir} disabled={salvando}>Confirmar exclusão de {registro.nome}</Botao>
          ) : <Botao variante="perigo-texto" icone="lixeira" onClick={() => setConfirmar(true)}>Excluir funcionário</Botao>}
        </div>
      )}
    </form>
  )
}
