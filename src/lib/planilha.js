// Leitura das planilhas de fechamento no navegador, para a prévia sem baixar o
// arquivo. Lê .xlsx/.xlsm (um ZIP com XML) e .csv; o .xls antigo e o .ods ficam
// só para baixar. Carregado sob demanda (import dinâmico), fora do pacote principal.
// Também gera .xlsx simples, usado pela demonstração e pelos testes.
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'

const LIMITE_LINHAS = 300
const LIMITE_COLUNAS = 40

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const decodificar = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
  return ENTIDADES[e] ?? m
})
const escapar = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const atributo = (atrs, nome) => (atrs.match(new RegExp(`(?:^|\\s)${nome}="([^"]*)"`)) || [])[1]
const textoDe = xml => decodificar((xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').match(/<t\b[^>]*>[\s\S]*?<\/t>/g) || [])
  .map(t => t.replace(/^<t\b[^>]*>|<\/t>$/g, '')).join(''))

const colunaDe = ref => {
  const letras = (ref.match(/^[A-Z]+/i) || [''])[0].toUpperCase()
  let n = 0
  for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64)
  return n - 1
}
export const letraDaColuna = i => { let s = ''; i += 1; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26) } return s }

// Formatos de data do Excel: os nativos 14–22 e 45–47, ou um código com d/m/a/h/s.
const DATAS_NATIVAS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])
function tipoDoFormato(id, codigo) {
  if (DATAS_NATIVAS.has(id)) return id >= 18 && id <= 21 || id >= 45 ? 'hora' : id === 22 ? 'data-hora' : 'data'
  if (id === 9 || id === 10) return 'porcento'
  if (!codigo) return 'numero'
  const limpo = codigo.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '')
  if (/%/.test(limpo)) return 'porcento'
  if (/R\$|\$|€/.test(codigo)) return 'moeda'
  const temData = /[dy]/i.test(limpo) || /m{3,}/i.test(limpo)
  const temHora = /[hs]/i.test(limpo)
  if (temData && temHora) return 'data-hora'
  if (temData || (/m/i.test(limpo) && !temHora)) return 'data'
  if (temHora) return 'hora'
  return 'numero'
}

const numeroBR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
const moedaBR = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const doisD = n => String(n).padStart(2, '0')
// Data serial do Excel (dias desde 30/12/1899) em texto, sem passar por fuso horário.
function serialParaTexto(v, tipo) {
  const dias = Math.floor(v)
  const ms = Math.round((v - dias) * 86400000)
  const d = new Date(Date.UTC(1899, 11, 30) + dias * 86400000 + ms)
  const data = `${doisD(d.getUTCDate())}/${doisD(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
  const hora = `${doisD(d.getUTCHours())}:${doisD(d.getUTCMinutes())}`
  return tipo === 'hora' ? hora : tipo === 'data-hora' ? `${data} ${hora}` : data
}
function formatar(valor, tipo) {
  if (valor === '' || valor == null || Number.isNaN(valor)) return ''
  if (tipo === 'data' || tipo === 'hora' || tipo === 'data-hora') return serialParaTexto(valor, tipo)
  if (tipo === 'porcento') return `${numeroBR.format(Math.round(valor * 10000) / 100)}%`
  if (tipo === 'moeda') return moedaBR.format(valor)
  return numeroBR.format(valor)
}

function lerXlsx(bytes) {
  let arquivos
  try {
    arquivos = unzipSync(bytes, { filter: f => /^(xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/[^/]+\.xml))$/.test(f.name) })
  } catch {
    throw new Error('O arquivo não parece ser uma planilha .xlsx válida.')
  }
  const ler = nome => (arquivos[nome] ? strFromU8(arquivos[nome]) : '')
  const workbook = ler('xl/workbook.xml')
  if (!workbook) throw new Error('O arquivo não parece ser uma planilha .xlsx válida.')

  const compartilhados = (ler('xl/sharedStrings.xml').match(/<si\b[\s\S]*?<\/si>/g) || []).map(textoDe)
  const estilos = ler('xl/styles.xml')
  const formatos = {}
  for (const m of estilos.matchAll(/<numFmt\b([^>]*)\/?>/g)) formatos[Number(atributo(m[1], 'numFmtId'))] = decodificar(atributo(m[1], 'formatCode') || '')
  const xfs = ((estilos.match(/<cellXfs\b[\s\S]*?<\/cellXfs>/) || [''])[0].match(/<xf\b[^>]*>/g) || [])
    .map(x => { const id = Number(atributo(x, 'numFmtId') || 0); return tipoDoFormato(id, formatos[id]) })

  const rels = {}
  for (const m of ler('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const alvo = atributo(m[1], 'Target') || ''
    rels[atributo(m[1], 'Id')] = alvo.startsWith('/') ? alvo.slice(1) : `xl/${alvo.replace(/^\.\//, '')}`
  }
  const abas = []
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const nome = decodificar(atributo(m[1], 'name') || `Planilha ${abas.length + 1}`)
    const caminho = rels[atributo(m[1], 'r:id')] || `xl/worksheets/sheet${abas.length + 1}.xml`
    if (atributo(m[1], 'state') === 'hidden') continue
    abas.push(lerAba(nome, ler(caminho), compartilhados, xfs))
  }
  return abas
}

function lerAba(nome, xml, compartilhados, xfs) {
  const linhas = []
  let totalLinhas = 0, largura = 0, proximaLinha = 0
  for (const m of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = Number(atributo(m[1], 'r')) || proximaLinha + 1
    proximaLinha = r
    if (!m[2]) continue
    const valores = []
    let proximaColuna = 0
    for (const c of m[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = atributo(c[1], 'r')
      const col = ref ? colunaDe(ref) : proximaColuna
      proximaColuna = col + 1
      if (col >= LIMITE_COLUNAS) continue
      const corpo = c[2] || ''
      const t = atributo(c[1], 't')
      const v = (corpo.match(/<v>([\s\S]*?)<\/v>/) || [])[1]
      const formula = (corpo.match(/<f\b[^>]*>([\s\S]*?)<\/f>/) || [])[1]
      let texto = ''
      if (t === 's') texto = compartilhados[Number(v)] ?? ''
      else if (t === 'inlineStr') texto = textoDe((corpo.match(/<is>([\s\S]*?)<\/is>/) || ['', ''])[1])
      else if (t === 'b') texto = v === '1' ? 'Verdadeiro' : v === '0' ? 'Falso' : ''
      else if ((t === 'str' || t === 'e') && v) texto = decodificar(v)
      else if (v != null && v !== '') texto = formatar(Number(v), xfs[Number(atributo(c[1], 's') || 0)] || 'numero')
      else if (formula) texto = `=${decodificar(formula)}` // fórmula sem resultado guardado (arquivo não salvo pelo Excel)
      valores[col] = texto
    }
    if (!valores.some(x => x !== undefined && x !== '')) continue
    totalLinhas++
    largura = Math.max(largura, valores.length)
    if (linhas.length < LIMITE_LINHAS) linhas.push({ numero: r, valores })
  }
  return {
    nome,
    linhas: linhas.map(l => ({ numero: l.numero, valores: Array.from({ length: largura }, (_, i) => l.valores[i] ?? '') })),
    totalLinhas,
    colunas: largura,
    cortada: totalLinhas > linhas.length,
  }
}

// CSV do Excel brasileiro: separador ";" e, muitas vezes, codificação Windows-1252.
function lerCsv(bytes) {
  let texto = new TextDecoder('utf-8').decode(bytes)
  if (texto.includes('�')) texto = new TextDecoder('windows-1252').decode(bytes)
  texto = texto.replace(/^﻿/, '')
  const primeira = texto.split(/\r?\n/, 1)[0] || ''
  const sep = [';', ',', '\t'].map(s => [s, primeira.split(s).length]).sort((a, b) => b[1] - a[1])[0][0]
  const linhas = []
  let campo = '', linha = [], aspas = false, total = 0, largura = 0
  const fecharLinha = () => {
    linha.push(campo); campo = ''
    if (linha.some(x => x.trim() !== '')) {
      total++
      largura = Math.max(largura, Math.min(linha.length, LIMITE_COLUNAS))
      if (linhas.length < LIMITE_LINHAS) linhas.push({ numero: total, valores: linha.slice(0, LIMITE_COLUNAS) })
    }
    linha = []
  }
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]
    if (aspas) {
      if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (ch === '"') aspas = false
      else campo += ch
    } else if (ch === '"') aspas = true
    else if (ch === sep) { linha.push(campo); campo = '' }
    else if (ch === '\n') fecharLinha()
    else if (ch !== '\r') campo += ch
  }
  if (campo !== '' || linha.length) fecharLinha()
  return [{
    nome: 'CSV',
    linhas: linhas.map(l => ({ numero: l.numero, valores: Array.from({ length: largura }, (_, i) => l.valores[i] ?? '') })),
    totalLinhas: total, colunas: largura, cortada: total > linhas.length,
  }]
}

// Lê um Blob/File/ArrayBuffer. Devolve { abas: [{ nome, linhas: [{numero, valores}], totalLinhas, colunas, cortada }] }.
export async function lerPlanilha(arquivo, nome = arquivo?.name || '') {
  const bytes = arquivo instanceof Uint8Array ? arquivo
    : new Uint8Array(arquivo instanceof ArrayBuffer ? arquivo : await arquivo.arrayBuffer())
  const ext = (String(nome).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1]
  const ehZip = bytes[0] === 0x50 && bytes[1] === 0x4b
  if (ext === 'csv' || (!ehZip && ext !== 'xls' && ext !== 'ods')) return { abas: lerCsv(bytes) }
  if (ext === 'xls' || ext === 'ods' || !ehZip) {
    throw new Error('A prévia funciona com .xlsx, .xlsm e .csv. Baixe o arquivo para abrir no Excel.')
  }
  const abas = lerXlsx(bytes)
  if (!abas.length) throw new Error('A planilha não tem abas visíveis.')
  return { abas }
}

// ---------------------------------------------------------------- geração (.xlsx mínimo)
const serialExcel = d => (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()) - Date.UTC(1899, 11, 30)) / 86400000

function abaXml(linhas) {
  const corpo = linhas.map((l, i) => `<row r="${i + 1}">${l.map((v, j) => {
    const ref = `${letraDaColuna(j)}${i + 1}`
    if (v == null || v === '') return ''
    if (v instanceof Date) return `<c r="${ref}" s="2"><v>${serialExcel(v)}</v></c>`
    if (typeof v === 'number') return `<c r="${ref}" s="${Number.isInteger(v) ? 0 : 1}"><v>${v}</v></c>`
    if (typeof v === 'object' && v.moeda != null) return `<c r="${ref}" s="3"><v>${v.moeda}</v></c>`
    return `<c r="${ref}" t="inlineStr"${i === 0 ? ' s="4"' : ''}><is><t xml:space="preserve">${escapar(v)}</t></is></c>`
  }).join('')}</row>`).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${corpo}</sheetData></worksheet>`
}

// abas: [{ nome, linhas: [[texto | número | Date | { moeda: número }]] }]. A 1ª linha sai em negrito.
export function gerarXlsx(abas) {
  const ns = 'http://schemas.openxmlformats.org'
  const arquivos = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${ns}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships"><sheets>${abas.map((a, i) => `<sheet name="${escapar(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${abas.length + 1}" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${ns}/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`,
  }
  abas.forEach((a, i) => { arquivos[`xl/worksheets/sheet${i + 1}.xml`] = abaXml(a.linhas) })
  return zipSync(Object.fromEntries(Object.entries(arquivos).map(([k, v]) => [k, strToU8(v)])), { level: 6 })
}
