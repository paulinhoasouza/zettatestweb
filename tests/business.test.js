import test from 'node:test'
import assert from 'node:assert/strict'
import {
  subtotal, total, validarProposta, taxaConversao, transicaoValida, proximosStatus,
  exigeMotivo, tempoPorEtapa, precisaAcao, porMes, paraCsv, mediana, podeEditar, itensDaProposta,
} from '../src/lib/business.js'

test('subtotal arredonda cada linha antes de somar', () => {
  const itens = [{ quantidade: 1, valor_unitario: 4800 }, { quantidade: 3.333, valor_unitario: 150 }]
  assert.equal(subtotal(itens), 5299.95)
  assert.equal(total(itens, 100), 5199.95)
})

test('validação aponta item sem descrição, quantidade zero e desconto alto', () => {
  const erros = validarProposta({ solicitacao_id: 's', titulo: 'P', desconto: 500, itens: [
    { descricao: '', quantidade: 0, valor_unitario: 10 },
  ] })
  assert.ok(erros.some(e => e.includes('sem descrição')))
  assert.ok(erros.some(e => e.includes('maior que zero')))
  assert.ok(erros.some(e => e.includes('superar o subtotal')))
  assert.deepEqual(validarProposta({ solicitacao_id: 's', titulo: 'P', desconto: 0, itens: [{ descricao: 'a', quantidade: 1, valor_unitario: 0 }] }), [])
})

test('transições seguem o mesmo mapa do banco', () => {
  assert.equal(transicaoValida('Rascunho', 'Enviada'), true)
  assert.equal(transicaoValida('Rascunho', 'Aprovada'), false)
  assert.equal(transicaoValida('Aprovada', 'Rascunho'), false)
  assert.deepEqual(proximosStatus('Recusada'), [])
  assert.equal(exigeMotivo('Recusada'), true)
  assert.equal(exigeMotivo('Aprovada'), false)
  assert.equal(podeEditar('Em negociacao'), true)
  assert.equal(podeEditar('Aprovada'), false)
})

test('conversão sem decisões não inventa número', () => {
  assert.equal(taxaConversao(0, 0), null)
  assert.equal(taxaConversao(2, 3), 66.7)
})

test('tempo por etapa usa o próximo evento como fim', () => {
  const t = tempoPorEtapa([
    { para: 'Rascunho', em: '2026-10-01T10:00:00Z' },
    { para: 'Enviada', em: '2026-10-03T10:00:00Z' },
  ], new Date('2026-10-08T10:00:00Z'))
  assert.equal(t[0].dias, 2)
  assert.equal(t[1].dias, 5)
  assert.equal(mediana([5, 1, 3]), 3)
  assert.equal(mediana([]), null)
})

test('precisa de ação ordena validade vencida antes de vencendo', () => {
  const agora = new Date('2026-10-28T12:00:00')
  const lista = precisaAcao({
    propostas: [
      { id: 'a', status: 'Enviada', status_desde: '2026-10-25T12:00:00', validade: '2026-10-30' },
      { id: 'b', status: 'Em negociacao', status_desde: '2026-10-20T12:00:00', validade: '2026-10-26' },
      { id: 'c', status: 'Enviada', status_desde: '2026-10-10T12:00:00', validade: null },
      { id: 'd', status: 'Aprovada', status_desde: '2026-10-01T12:00:00', validade: '2026-10-01' },
    ],
    solicitacoes: [{ id: 's', status: 'Aberta', prazo: '2026-10-27' }],
  }, agora)
  assert.deepEqual(lista.map(i => i.id), ['b', 'a', 'c', 's'])
  assert.equal(lista[0].motivo, 'validade')
  assert.equal(lista[1].dias, 2)
})

test('soma por mês só considera a janela pedida', () => {
  const r = porMes([
    { decidida_em: '2026-10-05T10:00:00', valor_total: 1000 },
    { decidida_em: '2026-09-15T10:00:00', valor_total: 250.5 },
    { decidida_em: '2026-01-15T10:00:00', valor_total: 9999 },
  ], 'decidida_em', 'valor_total', 3, new Date('2026-10-28T12:00:00'))
  assert.deepEqual(r, [{ mes: '2026-08', valor: 0 }, { mes: '2026-09', valor: 250.5 }, { mes: '2026-10', valor: 1000 }])
})

test('CSV protege células que começam com fórmula', () => {
  const csv = paraCsv(['a'], [['=HYPERLINK("x")'], ['ok']])
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`))
})

test('itens vigentes são os da revisão atual', () => {
  const itens = [
    { proposta_id: 'p', revisao: 1, ordem: 1, descricao: 'antigo' },
    { proposta_id: 'p', revisao: 2, ordem: 2, descricao: 'b' },
    { proposta_id: 'p', revisao: 2, ordem: 1, descricao: 'a' },
    { proposta_id: 'q', revisao: 2, ordem: 1, descricao: 'outra' },
  ]
  assert.deepEqual(itensDaProposta(itens, { id: 'p', revisao_atual: 2 }).map(i => i.descricao), ['a', 'b'])
})
