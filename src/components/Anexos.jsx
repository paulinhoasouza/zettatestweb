import { useState } from 'react'
import { useApp, Botao, Vazio } from './ui.jsx'
import Icon from './Icon.jsx'
import { api } from '../lib/api.js'
import { dataHora } from '../lib/format.js'

const tamanho = b => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export default function Anexos({ entidade, registroId, anexos }) {
  const { recarregar, notificar, eu, mapas, demo } = useApp()
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setOcupado(true)
    try { await api.enviarAnexo(arquivo, entidade, registroId, eu.id); await recarregar(); notificar(`“${arquivo.name}” anexado.`, 'sucesso') }
    catch (err) { notificar(err.message) } finally { setOcupado(false) }
  }
  async function excluir(a) {
    if (!window.confirm(`Excluir o anexo “${a.nome}”? O arquivo será apagado.`)) return
    setOcupado(true)
    try { await api.excluirAnexo(a); await recarregar() } catch (err) { notificar(err.message) } finally { setOcupado(false) }
  }

  return (
    <div className="anexos">
      {anexos.length ? (
        <ul className="lista-anexos">
          {anexos.map(a => (
            <li key={a.id}>
              <Icon nome="anexo" />
              <span className="an-id"><strong>{a.nome}</strong><small className="num">{tamanho(a.tamanho)} · {dataHora(a.criado_em)} · {mapas.equipe[a.criado_por]?.nome || 'Equipe'}</small></span>
              <Botao variante="texto" icone="baixar" onClick={() => api.baixarAnexo(a).catch(err => notificar(err.message))}>Abrir</Botao>
              <button type="button" className="btn-icone" aria-label={`Excluir ${a.nome}`} onClick={() => excluir(a)} disabled={ocupado}><Icon nome="lixeira" /></button>
            </li>
          ))}
        </ul>
      ) : <Vazio>Nenhum arquivo anexado. Contratos, briefings e planilhas do cliente ficam guardados aqui, com acesso só da equipe.</Vazio>}
      <label className={`btn btn-secundario envio ${ocupado ? 'desativado' : ''}`}>
        <Icon nome="mais" /><span>{ocupado ? 'Enviando…' : 'Anexar arquivo'}</span>
        <input type="file" className="sr" onChange={enviar} disabled={ocupado} />
      </label>
      <small className="campo-dica">Até 10 MB por arquivo.{demo ? ' Na demonstração, o arquivo fica só nesta aba.' : ''}</small>
    </div>
  )
}
