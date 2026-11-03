import { useState } from 'react'
import { useApp, Botao, Vazio } from './ui.jsx'
import Icon from './Icon.jsx'
import { api } from '../lib/api.js'
import { dataHora, tamanhoArquivo } from '../lib/format.js'

// Arquivos de um registro (proposta, solicitação, funcionário, treinamento, documento).
// compacto: lista curta e botão pequeno, para usar dentro de um cartão.
export default function Anexos({ entidade, registroId, anexos, compacto, vazio, rotuloBotao = 'Anexar arquivo', aceita, podeEditar = true }) {
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

  const botao = podeEditar && (
    <label className={`btn ${compacto ? 'btn-texto btn-mini' : 'btn-secundario'} envio ${ocupado ? 'desativado' : ''}`}>
      <Icon nome={ocupado ? 'atualizar' : 'anexo'} className={ocupado ? 'girando' : ''} tamanho={compacto ? 13 : 16} /><span>{ocupado ? 'Enviando…' : rotuloBotao}</span>
      <input type="file" className="sr" accept={aceita} onChange={enviar} disabled={ocupado} />
    </label>
  )

  if (compacto) {
    return (
      <div className="anexos-compactos">
        {anexos.map(a => (
          <span key={a.id} className="anexo-chip">
            <Icon nome="anexo" tamanho={13} />
            <button type="button" className="anexo-nome" title={`Abrir ${a.nome}`} onClick={() => api.baixarAnexo(a).catch(err => notificar(err.message))}>{a.nome}</button>
            {podeEditar && <button type="button" className="anexo-x" aria-label={`Excluir ${a.nome}`} onClick={() => excluir(a)} disabled={ocupado}><Icon nome="fechar" tamanho={11} traco={2.2} /></button>}
          </span>
        ))}
        {botao}
      </div>
    )
  }

  return (
    <div className="anexos">
      {anexos.length ? (
        <ul className="lista-anexos">
          {anexos.map(a => (
            <li key={a.id}>
              <Icon nome="anexo" />
              <span className="an-id"><strong>{a.nome}</strong><small className="num">{tamanhoArquivo(a.tamanho)} · {dataHora(a.criado_em)} · {mapas.equipe[a.criado_por]?.nome || 'Equipe'}</small></span>
              <Botao variante="texto" icone="baixar" onClick={() => api.baixarAnexo(a).catch(err => notificar(err.message))}>Abrir</Botao>
              {podeEditar && <button type="button" className="btn-icone" aria-label={`Excluir ${a.nome}`} onClick={() => excluir(a)} disabled={ocupado}><Icon nome="lixeira" /></button>}
            </li>
          ))}
        </ul>
      ) : <Vazio icone="anexo">{vazio || 'Nenhum arquivo anexado. Contratos, briefings e planilhas do cliente ficam guardados aqui, com acesso só da equipe.'}</Vazio>}
      {botao}
      <small className="campo-dica">Até 10 MB por arquivo.{demo ? ' Na demonstração, o arquivo fica só nesta aba.' : ''}</small>
    </div>
  )
}
