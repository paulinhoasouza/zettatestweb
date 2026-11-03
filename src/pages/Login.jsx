import { useState } from 'react'
import { api } from '../lib/api.js'
import { LogoAuto } from '../components/Icon.jsx'
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
      <div className="login-ceu" aria-hidden="true"><span /><span /><span /></div>
      <div className="login-marca"><LogoAuto altura={52} /></div>
      <section className="login-cartao" aria-label="Entrar no Zetta Propostas">
        <form className="login-form" onSubmit={entrar}>
          <span className="login-produto">Zetta Propostas</span>
          <h1>Entrar</h1>
          <p className="login-sub">Use o e-mail e a senha cadastrados pela Zetta.</p>
          <Campo rotulo="E-mail">{id => <input id={id} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />}</Campo>
          <Campo rotulo="Senha">{id => <input id={id} type="password" autoComplete="current-password" required value={senha} onChange={e => setSenha(e.target.value)} />}</Campo>
          {erro && <p className="erro-inline" role="alert">{erro}</p>}
          <button type="submit" className="btn btn-primario btn-largo btn-grande" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
          <p className="login-dica">Quer só conhecer? <a href="?demo">Abra a demonstração</a> com dados fictícios.</p>
        </form>
      </section>
      <p className="login-frase"><strong>Da solicitação ao aceite, e do caixa à equipe.</strong>Propostas, fechamentos do dia e os vencimentos de cada pessoa num só lugar.</p>
      <p className="login-pe">ZettaMinds · Campo Grande, MS</p>
    </main>
  )
}
