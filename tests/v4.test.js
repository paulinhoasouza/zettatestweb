import test from 'node:test'
import assert from 'node:assert/strict'
import {
  situacaoValidade, idsVigentes, vencimentos, situacaoPessoa, validadeSugerida, SUGESTOES_TREINAMENTO,
  prazoDoDia, situacaoDia, resumoFechamentos, enviadoNoPrazo, ehPlanilha, gradeDoMes, somarMeses, chaveDia,
  metricasComerciais, periodoAnterior, variacaoPct, funilDeConversao, tempoMedianoPorEtapa,
  desempenhoPorResponsavel, movimentosPorDia, podeVerTela, telaInicial, serieMensal,
} from '../src/lib/business.js'
import { gerarXlsx, lerPlanilha } from '../src/lib/planilha.js'

const AGORA = new Date('2026-11-03T15:00:00')

test('validade: vencido, vence hoje, vence na janela, em dia e sem validade', () => {
  assert.deepEqual(situacaoValidade('2026-11-01', AGORA), { codigo: 'vencido', dias: -2 })
  assert.deepEqual(situacaoValidade('2026-11-03', AGORA), { codigo: 'vence', dias: 0 })
  assert.deepEqual(situacaoValidade('2026-12-03', AGORA), { codigo: 'vence', dias: 30 })
  assert.equal(situacaoValidade('2026-12-04', AGORA).codigo, 'em-dia')
  assert.deepEqual(situacaoValidade(null, AGORA), { codigo: 'sem-validade', dias: null })
})

test('renovação: vale o treinamento mais recente de cada nome, sem diferenciar acentos', () => {
  const t = [
    { id: 'velho', funcionario_id: 'f1', nome: 'NR-35 Trabalho em altura', realizado_em: '2024-01-10', validade: '2026-01-10' },
    { id: 'novo', funcionario_id: 'f1', nome: 'nr-35 trabalho em  altura', realizado_em: '2026-01-05', validade: '2028-01-05' },
    { id: 'outro', funcionario_id: 'f2', nome: 'NR-35 Trabalho em altura', realizado_em: '2024-01-10', validade: '2026-01-10' },
  ]
  assert.deepEqual([...idsVigentes(t, 'nome', 'realizado_em')].sort(), ['novo', 'outro'])
})

test('vencimentos ignoram desligados e vêm do mais urgente ao mais tranquilo', () => {
  const dados = {
    funcionarios: [{ id: 'f1', nome: 'Ana', situacao: 'Ativo' }, { id: 'f2', nome: 'Bia', situacao: 'Desligado' }, { id: 'f3', nome: 'Caio', situacao: 'Afastado' }],
    treinamentos: [
      { id: 't1', funcionario_id: 'f1', nome: 'NR-10', realizado_em: '2025-01-01', validade: '2027-01-01' },
      { id: 't2', funcionario_id: 'f2', nome: 'NR-10', realizado_em: '2024-01-01', validade: '2026-01-01' },
      { id: 't3', funcionario_id: 'f3', nome: 'NR-35', realizado_em: '2024-11-01', validade: '2026-11-20' },
    ],
    documentos: [
      { id: 'd1', funcionario_id: 'f1', tipo: 'ASO periódico', emitido_em: '2025-10-01', validade: '2026-10-01' },
      { id: 'd2', funcionario_id: 'f1', tipo: 'RG', emitido_em: '2010-01-01', validade: null },
    ],
  }
  const v = vencimentos(dados, AGORA)
  assert.deepEqual(v.map(i => i.id), ['d1', 't3', 't1', 'd2'])
  assert.deepEqual(v.map(i => i.codigo), ['vencido', 'vence', 'em-dia', 'sem-validade'])
  assert.deepEqual(situacaoPessoa(v.filter(i => i.funcionario.id === 'f1')), { codigo: 'vencido', vencidos: 1, vencendo: 0, total: 3 })
  assert.equal(situacaoPessoa([]).codigo, 'sem-registros')
})

test('validade sugerida soma os meses e respeita o fim do mês', () => {
  assert.equal(validadeSugerida(SUGESTOES_TREINAMENTO, 'NR-35 Trabalho em altura', '2026-11-03'), '2028-11-03')
  assert.equal(validadeSugerida(SUGESTOES_TREINAMENTO, 'Primeiros socorros', '2026-11-03'), '')
  assert.equal(somarMeses('2024-02-29', 12), '2025-02-28')
  assert.equal(somarMeses('2026-01-31', 1), '2026-02-28')
})

const AJ = { inicio: '2026-10-01', dias_semana: [1, 2, 3, 4, 5, 6], horario_limite: '20:00:00', prazo_dia_seguinte: false }

test('prazo do fechamento: mesmo dia ou dia seguinte', () => {
  assert.equal(prazoDoDia('2026-11-03', AJ).toString(), new Date('2026-11-03T20:00:00').toString())
  assert.equal(prazoDoDia('2026-11-03', { ...AJ, horario_limite: '10:00', prazo_dia_seguinte: true }).toString(), new Date('2026-11-04T10:00:00').toString())
  assert.equal(enviadoNoPrazo({ data: '2026-11-02', primeiro_envio_em: '2026-11-02T19:59:00', enviado_em: '2026-11-03T09:00:00' }, AJ), true)
  assert.equal(enviadoNoPrazo({ data: '2026-11-02', primeiro_envio_em: '2026-11-02T20:01:00' }, AJ), false)
})

test('situação do dia no calendário', () => {
  assert.equal(situacaoDia('2026-11-04', null, AJ, AGORA), 'futuro')
  assert.equal(situacaoDia('2026-09-30', null, AJ, AGORA), 'antes')
  assert.equal(situacaoDia('2026-11-01', null, AJ, AGORA), 'livre') // domingo
  assert.equal(situacaoDia('2026-11-03', null, AJ, AGORA), 'pendente')
  assert.equal(situacaoDia('2026-11-03', null, AJ, new Date('2026-11-03T20:30:00')), 'atrasado')
  assert.equal(situacaoDia('2026-11-02', null, AJ, AGORA), 'atrasado')
  assert.equal(situacaoDia('2026-11-02', { status: 'Conferido' }, AJ, AGORA), 'conferido')
  assert.equal(situacaoDia('2026-11-01', { status: 'Sem expediente' }, AJ, AGORA), 'sem-expediente')
})

test('resumo dos fechamentos: cobertura, pontualidade e total', () => {
  const f = [
    { data: '2026-10-26', status: 'Conferido', primeiro_envio_em: '2026-10-26T19:00:00', valor_total: 1000 },
    { data: '2026-10-27', status: 'Divergente', primeiro_envio_em: '2026-10-27T21:00:00', valor_total: 500 },
    { data: '2026-10-28', status: 'Sem expediente', primeiro_envio_em: '2026-10-28T08:00:00' },
    { data: '2026-10-29', status: 'Enviado', primeiro_envio_em: '2026-10-29T18:00:00', valor_total: null },
  ]
  // 26 a 31/10: 26, 27, 29 enviados; 28 sem expediente; 30 e 31 atrasados; 25 é domingo
  const r = resumoFechamentos(f, AJ, '2026-10-25', '2026-10-31', AGORA)
  assert.equal(r.enviados, 3)
  assert.equal(r.atrasados, 2)
  assert.deepEqual(r.diasAtrasados, ['2026-10-30', '2026-10-31'])
  assert.equal(r.semExpediente, 1)
  assert.equal(r.cobertura, 60)
  assert.equal(r.pontualidade, 66.7)
  assert.equal(r.total, 1500)
  assert.equal(r.mediaPorDia, 750)
  assert.equal(r.horarioMediano, 19 * 60)
  // o período que passa de hoje para no dia de hoje, que ainda está no prazo
  assert.equal(resumoFechamentos([], AJ, '2026-11-03', '2026-11-30', AGORA).pendentes, 1)
})

test('planilhas aceitas e calendário do mês', () => {
  assert.equal(ehPlanilha('Fechamento 03-11.XLSX'), true)
  assert.equal(ehPlanilha('foto.jpg'), false)
  const nov = gradeDoMes(2026, 10)
  assert.equal(nov[0][0], '2026-11-01') // 1/11/2026 é domingo
  assert.equal(nov.flat().filter(Boolean).length, 30)
  assert.ok(nov.every(s => s.length === 7))
  assert.equal(chaveDia(new Date('2026-11-03T23:59:00')), '2026-11-03')
})

const P = [
  { id: 'a', solicitacao_id: 's1', status: 'Aprovada', valor_total: 1000, criado_em: '2026-10-01T10:00:00', decidida_em: '2026-10-11T10:00:00' },
  { id: 'b', solicitacao_id: 's1', status: 'Recusada', valor_total: 500, criado_em: '2026-10-02T10:00:00', decidida_em: '2026-10-20T10:00:00' },
  { id: 'c', solicitacao_id: 's2', status: 'Enviada', valor_total: 300, criado_em: '2026-10-05T10:00:00', decidida_em: null },
  { id: 'd', solicitacao_id: 's2', status: 'Rascunho', valor_total: 200, criado_em: '2026-10-06T10:00:00', decidida_em: null },
]
const H = [
  ['a', 'Rascunho', '2026-10-01T10:00:00'], ['a', 'Enviada', '2026-10-03T10:00:00'], ['a', 'Aprovada', '2026-10-11T10:00:00'],
  ['b', 'Rascunho', '2026-10-02T10:00:00'], ['b', 'Enviada', '2026-10-04T10:00:00'], ['b', 'Em negociacao', '2026-10-10T10:00:00'], ['b', 'Recusada', '2026-10-20T10:00:00'],
  ['c', 'Rascunho', '2026-10-05T10:00:00'], ['c', 'Enviada', '2026-10-06T10:00:00'],
  ['d', 'Rascunho', '2026-10-06T10:00:00'],
].map(([registro_id, para, em], i) => ({ id: i, entidade: 'propostas', registro_id, para, em }))

test('métricas comerciais do período e comparação com o anterior', () => {
  const ini = new Date('2026-10-01T00:00:00'), fim = new Date('2026-10-31T23:59:59')
  const m = metricasComerciais(P, ini, fim)
  assert.equal(m.criadas.length, 4)
  assert.equal(m.valorAprovado, 1000)
  assert.equal(m.valorCotado, 2000)
  assert.equal(m.conversao, 50)
  assert.equal(m.ticketMedio, 1000)
  assert.equal(m.cicloMediano, 10)
  assert.equal(m.valorPerdido, 500)
  const [ai, af] = periodoAnterior(ini, fim)
  assert.ok(af < ini && af - ai === fim - ini)
  assert.equal(variacaoPct(150, 100), 50)
  assert.equal(variacaoPct(5, 0), null)
})

test('funil só diminui e tempo por etapa usa passagens encerradas', () => {
  const f = funilDeConversao(P, H)
  assert.deepEqual(f.map(e => e.qtd), [4, 3, 2, 1])
  assert.deepEqual(f.map(e => e.daAnterior), [null, 75, 66.7, 50])
  assert.equal(f[3].valor, 1000)
  const t = Object.fromEntries(tempoMedianoPorEtapa(H, null, AGORA).map(e => [e.status, e]))
  assert.equal(t.Rascunho.mediana, 2) // a: 2 dias, b: 2 dias, c: 1 dia
  assert.equal(t.Enviada.mediana, 7) // a: 8 dias, b: 6 dias (c continua enviada)
  assert.equal(t['Em negociacao'].mediana, 10)
})

test('desempenho por responsável e movimentos por dia', () => {
  const sol = { s1: { responsavel_id: 'jose' }, s2: { responsavel_id: 'marina' } }
  const r = desempenhoPorResponsavel(P, sol, new Date('2026-10-01T00:00:00'), new Date('2026-10-31T23:59:59'))
  assert.deepEqual(r.map(x => [x.id, x.criadas, x.aprovadas, x.conversao]), [['jose', 2, 1, 50], ['marina', 2, 0, null]])
  const mov = movimentosPorDia(H.map(e => ({ ...e, em: e.em })), 7, new Date('2026-10-11T12:00:00'))
  assert.equal(mov.length, 7)
  assert.equal(mov.at(-1).chave, '2026-10-11')
  assert.equal(mov.find(d => d.chave === '2026-10-06').valor, 2)
  const s = serieMensal(P, 'criado_em', l => l.length, 3, new Date('2026-11-15T12:00:00'))
  assert.deepEqual(s.map(x => x.valor), [0, 4, 0])
})

test('perfis: operacional só vê fechamentos; pessoas só para admin', () => {
  assert.equal(podeVerTela('operacional', 'propostas'), false)
  assert.equal(podeVerTela('operacional', 'fechamentos'), true)
  assert.equal(podeVerTela('comercial', 'pessoas'), false)
  assert.equal(podeVerTela('admin', 'pessoas'), true)
  assert.equal(telaInicial('operacional'), 'fechamentos')
})

test('planilha .xlsx gerada é lida de volta, com moeda, data e texto especial', async () => {
  const bytes = gerarXlsx([{ nome: 'Caixa', linhas: [['Forma', 'Valor'], ['PIX', { moeda: 1520.5 }], ['Dia', new Date(2026, 10, 3)], ['Obs', 'A & B <c>']] }])
  const { abas } = await lerPlanilha(bytes, 'caixa.xlsx')
  assert.equal(abas[0].nome, 'Caixa')
  const espacos = v => v.map(x => x.replace(/\u00a0/g, ' '))
  assert.deepEqual(abas[0].linhas.map(l => espacos(l.valores)), [['Forma', 'Valor'], ['PIX', 'R$ 1.520,50'], ['Dia', '03/11/2026'], ['Obs', 'A & B <c>']])
  const csv = await lerPlanilha(new TextEncoder().encode('a;b\r\n"x;y";2\r\n'), 'f.csv')
  assert.deepEqual(csv.abas[0].linhas.map(l => l.valores), [['a', 'b'], ['x;y', '2']])
  await assert.rejects(lerPlanilha(new Uint8Array([1, 2, 3]), 'velho.xls'), /Baixe o arquivo/)
})
