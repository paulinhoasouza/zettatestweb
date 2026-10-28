import { useState } from 'react'
import { useApp, TituloTela, Pill, Gaveta, Campo, Botao, Avatar, Vazio } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { data } from '../lib/format.js'

export default function Equipe() {
  const { dados, eu } = useApp()
  const [aberto, setAberto] = useState(null)
  const admin = eu.perfil === 'admin'
  const ativos = dados.equipe.filter(m => m.ativo).length

  return (
    <>
      <TituloTela titulo="Equipe e acessos" linha={`${ativos} ${ativos === 1 ? 'pessoa com acesso' : 'pessoas com acesso'}. Só quem está ativo aqui entra no sistema.`}
        acoes={admin && <Botao variante="primario" icone="mais" onClick={() => setAberto('novo')}>Liberar acesso</Botao>} />
      <div className="grade-equipe">
        <div className="tabela-moldura">
          <table className="tabela">
            <thead><tr><th scope="col">Pessoa</th><th scope="col">Perfil</th><th scope="col">Situação</th><th scope="col" className="num">Desde</th>{admin && <th scope="col"><span className="sr">Ação</span></th>}</tr></thead>
            <tbody>
              {dados.equipe.map((m, i) => (
                <tr key={m.id}>
                  <td className="col-pessoa"><Avatar nome={m.nome} indice={i} /><span><strong>{m.nome}{m.id === eu.id && <span className="voce"> (você)</span>}</strong><small>{m.email || <span className="mono">{m.id.slice(0, 8)}…</span>}</small></span></td>
                  <td>{m.perfil === 'admin' ? 'Administrador' : 'Comercial'}</td>
                  <td><Pill tom={m.ativo ? 'positivo' : 'neutro'}>{m.ativo ? 'Ativo' : 'Sem acesso'}</Pill></td>
                  <td className="num">{data(m.criado_em)}</td>
                  {admin && <td className="col-acao"><button type="button" className="link-acao" onClick={() => setAberto(m)}>Editar</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="nota-lateral">
          <h2>Como liberar alguém</h2>
          <ol>
            <li>No Supabase, abra <strong>Authentication → Users → Add user</strong> e crie o login com o e-mail da pessoa.</li>
            <li>Copie o <strong>User UID</strong> que aparece na lista.</li>
            <li>Aqui, clique em <strong>Liberar acesso</strong>, cole o UID e escolha o perfil.</li>
          </ol>
          <p><strong>Administrador</strong> também gerencia esta tela. <strong>Comercial</strong> trabalha com clientes, solicitações e propostas.</p>
        </aside>
      </div>
      {!dados.equipe.length && <Vazio>Nenhum integrante carregado.</Vazio>}
      {aberto && <GavetaMembro registro={aberto === 'novo' ? null : aberto} aoFechar={() => setAberto(null)} />}
    </>
  )
}

function GavetaMembro({ registro, aoFechar }) {
  const { recarregar, notificar, eu } = useApp()
  const [f, setF] = useState({ id: registro?.id || '', nome: registro?.nome || '', email: registro?.email || '', perfil: registro?.perfil || 'comercial', ativo: registro?.ativo ?? true })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const proprio = registro?.id === eu.id

  async function salvar(e) {
    e.preventDefault()
    if (!registro && !/^[0-9a-f-]{36}$/i.test(f.id.trim()) && !f.id.startsWith('demo-')) return setErro('Cole o User UID completo (36 caracteres) copiado do Supabase.')
    if (!f.nome.trim()) return setErro('Informe o nome.')
    setSalvando(true); setErro('')
    try {
      const dados = { nome: f.nome.trim(), email: f.email.trim() || null, perfil: f.perfil, ativo: f.ativo }
      await api.salvarMembro(registro ? dados : { ...dados, id: f.id.trim() }, registro?.id)
      await recarregar(); notificar('Acesso salvo.', 'sucesso'); aoFechar()
    } catch (err) { setErro(err.message) } finally { setSalvando(false) }
  }

  return (
    <Gaveta titulo={registro ? registro.nome : 'Liberar acesso'} largura="estreita" aoFechar={aoFechar}
      rodape={<><Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao><button type="submit" form="form-membro" className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button></>}>
      <form id="form-membro" className="form-gaveta" onSubmit={salvar} noValidate>
        {!registro && <Campo rotulo="User UID do Supabase" obrigatorio dica="Authentication → Users → coluna UID.">{(id, d) => <input id={id} aria-describedby={d} className="mono" value={f.id} onChange={e => set('id', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />}</Campo>}
        <Campo rotulo="Nome" obrigatorio>{id => <input id={id} value={f.nome} onChange={e => set('nome', e.target.value)} />}</Campo>
        <Campo rotulo="E-mail">{id => <input id={id} type="email" value={f.email} onChange={e => set('email', e.target.value)} />}</Campo>
        <Campo rotulo="Perfil" dica={proprio ? 'Você não pode tirar o seu próprio perfil de administrador.' : undefined}>
          {(id, d) => <select id={id} aria-describedby={d} value={f.perfil} disabled={proprio} onChange={e => set('perfil', e.target.value)}><option value="comercial">Comercial</option><option value="admin">Administrador</option></select>}
        </Campo>
        <label className="caixa"><input type="checkbox" checked={f.ativo} disabled={proprio} onChange={e => set('ativo', e.target.checked)} /> Acesso ativo</label>
        {erro && <p className="erro-inline" role="alert">{erro}</p>}
      </form>
    </Gaveta>
  )
}
