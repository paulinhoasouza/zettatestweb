import { useState } from 'react'
import { api } from '../lib/api.js'
import { Marca } from '../components/Icon.jsx'
import { Campo } from '../components/ui.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setEntrando(true); setErro('')
    try { await api.entrar(email, senha) }
    catch { setErro('E-mail ou senha incorretos. Se o problema continuar, peça a um administrador para conferir o seu acesso.') }
    finally { setEntrando(false) }
  }

  return (
    <main className="login">
      <section className="login-assinatura" aria-label="Zetta Propostas">
        <div className="produto produto-claro"><Marca tamanho={36} /><div><strong>Zetta Propostas</strong><span>Gestão comercial da Zetta</span></div></div>
        <div className="login-frase">
          <h2>Da solicitação ao aceite, sem perder nenhuma proposta pelo caminho.</h2>
          <p>Clientes, demandas, propostas com revisões e o tempo de cada etapa num só lugar.</p>
        </div>
        <p className="login-pe">Zetta · Campo Grande, MS</p>
      </section>
      <section className="login-form-area">
        <form className="login-form" onSubmit={entrar}>
          <h1>Entrar</h1>
          <p className="login-sub">Use o e-mail e a senha cadastrados pela Zetta.</p>
          <Campo rotulo="E-mail">{id => <input id={id} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />}</Campo>
          <Campo rotulo="Senha">{id => <input id={id} type="password" autoComplete="current-password" required value={senha} onChange={e => setSenha(e.target.value)} />}</Campo>
          {erro && <p className="erro-inline" role="alert">{erro}</p>}
          <button type="submit" className="btn btn-primario btn-largo" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
          <p className="login-dica">Quer só conhecer? <a href="?demo">Abra a demonstração</a> com dados fictícios.</p>
        </form>
      </section>
    </main>
  )
}
