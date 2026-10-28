import { useMemo, useState } from 'react'
import { useApp, TituloTela, Busca, Vazio, Carregando, Gaveta, Campo, Botao, Pill } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { href, ir } from '../lib/rota.js'
import { SOLICITACAO_ATIVA } from '../lib/business.js'
import { brl, data } from '../lib/format.js'

export default function Clientes({ params }) {
  const { dados, mapas, estado } = useApp()
  const [q, setQ] = useState('')
  const abrir = params.get('abrir')
  const fechar = () => ir('clientes')
  const busca = q.trim().toLowerCase()

  const linhas = useMemo(() => dados.clientes.map(c => {
    const sols = dados.solicitacoes.filter(s => s.cliente_id === c.id)
    const ids = new Set(sols.map(s => s.id))
    const props = dados.propostas.filter(p => ids.has(p.solicitacao_id))
    return {
      c, ativas: sols.filter(s => SOLICITACAO_ATIVA.includes(s.status)).length,
      aprovado: props.filter(p => p.status === 'Aprovada').reduce((s, p) => s + Number(p.valor_total), 0),
      ultima: [...sols.map(s => s.atualizado_em), ...props.map(p => p.atualizado_em)].sort().pop(),
    }
  }).filter(({ c }) => !busca || [c.nome, c.contato, c.documento, c.cidade, c.email].some(v => (v || '').toLowerCase().includes(busca)))
    .sort((a, b) => b.aprovado - a.aprovado || a.c.nome.localeCompare(b.c.nome)), [dados, busca])

  const aberto = abrir === 'novo' ? 'novo' : mapas.clientes[abrir]
  const totalAprovado = linhas.reduce((s, l) => s + l.aprovado, 0)

  return (
    <>
      <TituloTela titulo="Clientes" linha={`${dados.clientes.length} cadastrados · ${brl(totalAprovado)} em propostas aprovadas`}
        acoes={<Botao variante="primario" icone="mais" onClick={() => ir('clientes?abrir=novo')}>Novo cliente</Botao>} />
      <div className="barra-ferramentas">
        <Busca valor={q} aoMudar={setQ} rotulo="Buscar clientes" placeholder="Nome, contato, cidade ou CNPJ" />
        <span className="contagem num">{linhas.length} {linhas.length === 1 ? 'cliente' : 'clientes'}</span>
      </div>
      {estado.carregando && !estado.em ? <Carregando linhas={6} /> : linhas.length ? (
        <div className="tabela-moldura">
          <table className="tabela">
            <thead><tr>
              <th scope="col">Cliente</th><th scope="col">Contato</th><th scope="col">Cidade</th>
              <th scope="col" className="num">Solicitações ativas</th><th scope="col" className="num">Aprovado</th><th scope="col" className="num">Último movimento</th>
            </tr></thead>
            <tbody>
              {linhas.map(({ c, ativas, aprovado, ultima }) => (
                <tr key={c.id} className="clicavel" onClick={() => ir(`clientes?abrir=${c.id}`)}>
                  <td className="col-id"><a href={href(`clientes?abrir=${c.id}`)} onClick={e => e.stopPropagation()}>{c.nome}</a><small>{c.documento || c.email || c.telefone || 'Sem documento informado'}</small></td>
                  <td>{c.contato || <span className="traco">—</span>}<small className="sub-cel">{c.telefone}</small></td>
                  <td>{c.cidade || <span className="traco">—</span>}</td>
                  <td className="num">{ativas || <span className="traco">0</span>}</td>
                  <td className="num forte">{brl(aprovado)}</td>
                  <td className="num">{ultima ? data(ultima) : <span className="traco">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Vazio acao={!busca && <Botao variante="secundario" onClick={() => ir('clientes?abrir=novo')}>Cadastrar o primeiro cliente</Botao>}>{busca ? `Nenhum cliente encontrado para “${q.trim()}”.` : 'Nenhum cliente cadastrado.'}</Vazio>}

      {aberto && <GavetaCliente registro={aberto === 'novo' ? null : aberto} aoFechar={fechar} />}
    </>
  )
}

function GavetaCliente({ registro, aoFechar }) {
  const { dados, recarregar, notificar } = useApp()
  const [f, setF] = useState(() => Object.fromEntries(['nome', 'documento', 'contato', 'telefone', 'email', 'cidade', 'observacoes'].map(k => [k, registro?.[k] || ''])))
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const sols = registro ? dados.solicitacoes.filter(s => s.cliente_id === registro.id) : []

  async function salvar(e) {
    e.preventDefault()
    if (!f.nome.trim()) return setErro('Informe o nome ou a razão social.')
    setSalvando(true); setErro('')
    try {
      await api.salvarCliente(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null])), registro?.id)
      await recarregar(); notificar(registro ? 'Cliente atualizado.' : 'Cliente cadastrado.', 'sucesso'); aoFechar()
    } catch (err) { setErro(err.message) } finally { setSalvando(false) }
  }
  async function excluir() {
    setSalvando(true)
    try { await api.excluirCliente(registro.id); await recarregar(); notificar('Cliente excluído.', 'sucesso'); aoFechar() }
    catch (err) { setErro(err.message) } finally { setSalvando(false) }
  }

  return (
    <Gaveta titulo={registro ? registro.nome : 'Novo cliente'} subtitulo={registro ? `Cliente desde ${data(registro.criado_em)}` : 'Quem pede a solução e quem assina a proposta.'} aoFechar={aoFechar}
      rodape={<>
        {registro && !sols.length && (confirmar
          ? <Botao variante="perigo" onClick={excluir} disabled={salvando}>Confirmar exclusão de {registro.nome}</Botao>
          : <Botao variante="perigo-texto" onClick={() => setConfirmar(true)}>Excluir cliente</Botao>)}
        <span className="espaco" />
        <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
        <button type="submit" form="form-cliente" className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar cliente'}</button>
      </>}>
      <form id="form-cliente" className="form-gaveta" onSubmit={salvar} noValidate>
        <Campo rotulo="Nome ou razão social" obrigatorio>{id => <input id={id} value={f.nome} maxLength={160} onChange={e => set('nome', e.target.value)} />}</Campo>
        <div className="dupla">
          <Campo rotulo="CPF ou CNPJ">{id => <input id={id} value={f.documento} maxLength={30} onChange={e => set('documento', e.target.value)} />}</Campo>
          <Campo rotulo="Cidade">{id => <input id={id} value={f.cidade} onChange={e => set('cidade', e.target.value)} />}</Campo>
        </div>
        <Campo rotulo="Contato principal">{id => <input id={id} value={f.contato} onChange={e => set('contato', e.target.value)} placeholder="Quem decide ou assina" />}</Campo>
        <div className="dupla">
          <Campo rotulo="Telefone ou WhatsApp">{id => <input id={id} type="tel" value={f.telefone} onChange={e => set('telefone', e.target.value)} />}</Campo>
          <Campo rotulo="E-mail">{id => <input id={id} type="email" value={f.email} onChange={e => set('email', e.target.value)} />}</Campo>
        </div>
        <Campo rotulo="Observações">{id => <textarea id={id} rows={3} value={f.observacoes} onChange={e => set('observacoes', e.target.value)} />}</Campo>
        {registro && sols.length > 0 && (
          <div className="secao-gaveta">
            <h3>Solicitações</h3>
            <ul className="lista-simples">{sols.map(s => (
              <li key={s.id}><a href={href(`solicitacoes?abrir=${s.id}`)}><span className="ls-id"><strong>{s.titulo}</strong><small>aberta em {data(s.criado_em)}</small></span><Pill>{s.status}</Pill></a></li>
            ))}</ul>
            <p className="campo-dica">Clientes com solicitações não podem ser excluídos.</p>
          </div>
        )}
        {erro && <p className="erro-inline" role="alert">{erro}</p>}
      </form>
    </Gaveta>
  )
}
