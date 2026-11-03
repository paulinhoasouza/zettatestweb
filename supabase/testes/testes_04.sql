-- =============================================================================
-- Testes da migração 04 (pessoas, fechamentos, perfil operacional).
-- Rodam num Postgres local, nesta ordem (não execute no Supabase de produção):
--   stub_supabase.sql → 01_estrutura.sql → 04_pessoas_fechamentos.sql
--   → testes_banco.sql → testes_04.sql
-- Usuários: A admin, B e C comercial (C entra no fim de testes_banco.sql),
-- D operacional, E autenticado sem acesso.
-- =============================================================================
\set ON_ERROR_STOP 1

create or replace function pg_temp.espera_erro(sql text, trecho text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'ESPERAVA ERRO e passou: %', sql;
exception when others then
  if sqlerrm like 'ESPERAVA ERRO%' then raise; end if;
  if trecho is not null and position(lower(trecho) in lower(sqlerrm)) = 0 then
    raise exception 'Erro diferente do esperado em [%]: %', sql, sqlerrm;
  end if;
end $$;
grant execute on function pg_temp.espera_erro(text, text) to authenticated, anon;

insert into auth.users values
  ('dddddddd-0000-0000-0000-000000000004', 'operacional@teste.local'),
  ('eeeeeeee-0000-0000-0000-000000000005', 'semacesso2@teste.local');
insert into public.equipe (id, nome, perfil) values
  ('dddddddd-0000-0000-0000-000000000004', 'Operacional Teste', 'operacional');

do $$ begin
  perform pg_temp.espera_erro($q$insert into public.equipe (id, nome, perfil) values ('eeeeeeee-0000-0000-0000-000000000005', 'X', 'gerente')$q$, 'equipe_perfil_check');
end $$;

-- arquivos e dados que só o superusuário cria (simulam envios ao Storage)
insert into storage.objects (bucket_id, name) values
  ('zetta-anexos', 'propostas/p1/contrato.pdf'),
  ('zetta-anexos', 'fechamentos/f1/fechamento-01.xlsx'),
  ('zetta-anexos', 'fechamentos/f1/fechamento-01-corrigido.xlsx'),
  ('zetta-anexos', 'fechamentos/f2/fechamento-02.xlsx');

-- ---------------------------------------------------------------- comercial: anexo de proposta
set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into public.anexos (entidade, registro_id, nome, caminho, tamanho, criado_por)
  values ('propostas', '33333333-0000-0000-0000-000000000001', 'contrato.pdf', 'propostas/p1/contrato.pdf', 1000,
          'bbbbbbbb-0000-0000-0000-000000000002');
reset role;

-- ---------------------------------------------------------------- operacional
set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000004';
do $$
declare r jsonb; n int;
begin
  -- não vê nada do comercial
  if (select count(*) from public.clientes) <> 0 then raise exception 'operacional não deveria ver clientes'; end if;
  if (select count(*) from public.propostas) <> 0 then raise exception 'operacional não deveria ver propostas'; end if;
  if (select count(*) from public.solicitacoes) <> 0 then raise exception 'operacional não deveria ver solicitações'; end if;
  if (select count(*) from public.historico where entidade = 'propostas') <> 0 then raise exception 'operacional não deveria ver histórico de propostas'; end if;
  if (select count(*) from public.anexos where entidade = 'propostas') <> 0 then raise exception 'operacional não deveria ver anexos de propostas'; end if;
  if (select count(*) from storage.objects where name like 'propostas/%') <> 0 then raise exception 'operacional não deveria ver arquivos de propostas'; end if;
  perform pg_temp.espera_erro($q$select public.salvar_proposta('{"titulo":"x","itens":[{"descricao":"a","quantidade":1,"valor_unitario":1}]}')$q$, 'Acesso não autorizado');
  perform pg_temp.espera_erro($q$insert into public.clientes (nome) values ('X')$q$, 'row-level security');
  -- nem das pessoas
  if (select count(*) from public.funcionarios) <> 0 then raise exception 'operacional não deveria ver funcionários'; end if;
  perform pg_temp.espera_erro($q$insert into public.funcionarios (nome) values ('X')$q$, 'row-level security');
  -- vê a equipe (para saber quem enviou)
  if (select count(*) from public.equipe) < 4 then raise exception 'operacional deveria ver a equipe'; end if;

  -- envio: precisa da planilha, de data válida e do arquivo no Storage
  perform pg_temp.espera_erro($q$select public.registrar_fechamento('{"data":"2026-10-01"}')$q$, 'Anexe a planilha');
  perform pg_temp.espera_erro(format('select public.registrar_fechamento(%L)', jsonb_build_object('data', current_date + 5,
    'anexo', jsonb_build_object('nome','x.xlsx','caminho','fechamentos/f9/x.xlsx','tamanho',10))), 'ainda não chegou');
  perform pg_temp.espera_erro($q$select public.registrar_fechamento('{"data":"2026-10-01","anexo":{"nome":"x.xlsx","caminho":"fechamentos/f9/nao-existe.xlsx","tamanho":10}}')$q$, 'não chegou ao armazenamento');
  perform pg_temp.espera_erro($q$select public.registrar_fechamento('{"data":"2026-10-01","anexo":{"nome":"x.xlsx","caminho":"propostas/p1/contrato.pdf","tamanho":10}}')$q$, 'local inválido');
  perform pg_temp.espera_erro($q$select public.registrar_fechamento('{"data":"2026-10-01","valor_total":-5,"anexo":{"nome":"x.xlsx","caminho":"fechamentos/f1/fechamento-01.xlsx","tamanho":10}}')$q$, 'negativo');

  r := public.registrar_fechamento('{"id":"f1f1f1f1-0000-0000-0000-000000000001","data":"2026-10-01","valor_total":"1520.456","observacoes":"Caixa fechado",
         "anexo":{"nome":"fechamento-01.xlsx","caminho":"fechamentos/f1/fechamento-01.xlsx","tamanho":2048,"tipo":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}}');
  if r->>'id' <> 'f1f1f1f1-0000-0000-0000-000000000001' or r->>'status' <> 'Enviado' or (r->>'reenvio')::boolean then raise exception 'envio inesperado %', r; end if;
  if (select valor_total from public.fechamentos where id = 'f1f1f1f1-0000-0000-0000-000000000001') <> 1520.46 then raise exception 'total deveria ser arredondado a centavos'; end if;
  if (select enviado_por from public.fechamentos where id = 'f1f1f1f1-0000-0000-0000-000000000001') <> 'dddddddd-0000-0000-0000-000000000004' then raise exception 'enviado_por deveria ser o operacional'; end if;
  if (select count(*) from public.anexos where entidade = 'fechamentos') <> 1 then raise exception 'operacional deveria ver a planilha enviada'; end if;
  if (select count(*) from public.historico where entidade = 'fechamentos' and acao = 'Envio') <> 1 then raise exception 'envio deveria ir para o histórico'; end if;

  -- não grava direto: nem conferir nem anexar fora da função
  update public.fechamentos set status = 'Conferido' where id = 'f1f1f1f1-0000-0000-0000-000000000001';
  if (select status from public.fechamentos where id = 'f1f1f1f1-0000-0000-0000-000000000001') <> 'Enviado' then raise exception 'operacional conseguiu conferir'; end if;
  perform pg_temp.espera_erro($q$insert into public.fechamentos (data) values ('2026-10-03')$q$, 'row-level security');
  perform pg_temp.espera_erro($q$insert into public.anexos (entidade, registro_id, nome, caminho, tamanho, criado_por) values ('fechamentos','f1f1f1f1-0000-0000-0000-000000000001','y','fechamentos/f1/y.xlsx',1,'dddddddd-0000-0000-0000-000000000004')$q$, 'row-level security');
  delete from public.anexos where entidade = 'fechamentos';
  if (select count(*) from public.anexos where entidade = 'fechamentos') <> 1 then raise exception 'operacional conseguiu apagar a planilha registrada'; end if;

  -- Storage: apaga só arquivo que não foi registrado (limpeza de envio que falhou)
  insert into storage.objects (bucket_id, name) values ('zetta-anexos', 'fechamentos/f9/orfao.xlsx');
  delete from storage.objects where name = 'fechamentos/f9/orfao.xlsx';
  if exists (select 1 from storage.objects where name = 'fechamentos/f9/orfao.xlsx') then raise exception 'deveria apagar arquivo órfão'; end if;
  delete from storage.objects where name = 'fechamentos/f1/fechamento-01.xlsx';
  if not exists (select 1 from storage.objects where name = 'fechamentos/f1/fechamento-01.xlsx') then raise exception 'não deveria apagar planilha registrada'; end if;
  perform pg_temp.espera_erro($q$insert into storage.objects (bucket_id, name) values ('zetta-anexos', 'propostas/p9/x.pdf')$q$, 'row-level security');

  -- ajustes: lê, não altera
  if (select dias_semana from public.fechamento_ajustes) <> '{1,2,3,4,5,6}' then raise exception 'ajustes padrão inesperados'; end if;
  update public.fechamento_ajustes set horario_limite = '23:00';
  if (select horario_limite from public.fechamento_ajustes) <> '20:00' then raise exception 'operacional conseguiu mudar os ajustes'; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- sem acesso
set role authenticated;
set request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000005';
do $$ begin
  if (select count(*) from public.fechamentos) <> 0 then raise exception 'E não deveria ver fechamentos'; end if;
  if (select count(*) from public.equipe) <> 0 then raise exception 'E não deveria ver a equipe'; end if;
  perform pg_temp.espera_erro($q$select public.registrar_fechamento('{"data":"2026-10-02"}')$q$, 'Acesso não autorizado');
end $$;
reset role;

-- ---------------------------------------------------------------- admin: conferência
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  update public.fechamentos set status = 'Conferido' where id = 'f1f1f1f1-0000-0000-0000-000000000001';
  if (select conferido_por from public.fechamentos where id = 'f1f1f1f1-0000-0000-0000-000000000001') <> 'aaaaaaaa-0000-0000-0000-000000000001'
     or (select conferido_em from public.fechamentos where id = 'f1f1f1f1-0000-0000-0000-000000000001') is null then
    raise exception 'conferência deveria registrar quem e quando';
  end if;
  if (select count(*) from public.historico where entidade = 'fechamentos' and acao = 'Conferido') <> 1 then raise exception 'conferência deveria ir para o histórico'; end if;
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000004';
do $$ begin
  perform pg_temp.espera_erro($q$select public.registrar_fechamento('{"data":"2026-10-01","anexo":{"nome":"c.xlsx","caminho":"fechamentos/f1/fechamento-01-corrigido.xlsx","tamanho":10}}')$q$, 'já foi conferido');
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$ begin
  perform pg_temp.espera_erro($q$update public.fechamentos set status = 'Divergente' where id = 'f1f1f1f1-0000-0000-0000-000000000001'$q$, 'fechamento_divergente_tem_nota');
  update public.fechamentos set status = 'Divergente', nota_conferencia = 'Faltou o PIX da tarde' where id = 'f1f1f1f1-0000-0000-0000-000000000001';
  if (select count(*) from public.historico where entidade = 'fechamentos' and acao = 'Divergente' and descricao = 'Faltou o PIX da tarde') <> 1 then
    raise exception 'divergência deveria ir para o histórico com a nota';
  end if;
end $$;
reset role;

-- reenvio depois da divergência volta para Enviado e limpa a conferência
set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000004';
do $$
declare r jsonb;
begin
  r := public.registrar_fechamento('{"data":"2026-10-01","valor_total":1600,"anexo":{"nome":"fechamento-01-corrigido.xlsx","caminho":"fechamentos/f1/fechamento-01-corrigido.xlsx","tamanho":3000}}');
  if not (r->>'reenvio')::boolean or r->>'status' <> 'Enviado' then raise exception 'reenvio inesperado %', r; end if;
  if exists (select 1 from public.fechamentos where id = 'f1f1f1f1-0000-0000-0000-000000000001'
              and (conferido_por is not null or conferido_em is not null or nota_conferencia is not null or valor_total <> 1600 or observacoes is not null)) then
    raise exception 'reenvio deveria limpar a conferência e gravar os dados novos';
  end if;
  if (select count(*) from public.anexos where entidade = 'fechamentos' and registro_id = 'f1f1f1f1-0000-0000-0000-000000000001') <> 2 then
    raise exception 'as duas versões da planilha deveriam ficar guardadas';
  end if;
  if (select count(*) from public.historico where entidade = 'fechamentos' and acao = 'Reenvio') <> 1 then raise exception 'reenvio deveria ir para o histórico'; end if;
  if (select primeiro_envio_em >= enviado_em from public.fechamentos where id = 'f1f1f1f1-0000-0000-0000-000000000001') then
    raise exception 'o reenvio não pode mudar a hora do primeiro envio';
  end if;
end $$;
reset role;

-- ---------------------------------------------------------------- admin: sem expediente, exclusão e ajustes
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$ begin
  perform pg_temp.espera_erro($q$insert into public.fechamentos (data, status) values ('2026-10-12', 'Sem expediente')$q$, 'fechamento_sem_expediente_tem_motivo');
  insert into public.fechamentos (data, status, observacoes) values ('2026-10-12', 'Sem expediente', 'Feriado');
  perform pg_temp.espera_erro($q$update public.fechamentos set status = 'Conferido' where data = '2026-10-12'$q$, 'sem expediente não tem');
  -- o fechamento com planilhas não pode ser excluído antes dos anexos
  perform pg_temp.espera_erro($q$delete from public.fechamentos where id = 'f1f1f1f1-0000-0000-0000-000000000001'$q$, 'Exclua os anexos');
  update public.fechamento_ajustes set dias_semana = '{1,2,3,4,5}', horario_limite = '10:00', prazo_dia_seguinte = true;
  perform pg_temp.espera_erro($q$update public.fechamento_ajustes set dias_semana = '{7}'$q$, 'check');
  perform pg_temp.espera_erro($q$update public.fechamento_ajustes set dias_semana = '{}'$q$, 'check');
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000004';
do $$ begin
  perform pg_temp.espera_erro($q$select public.registrar_fechamento('{"data":"2026-10-12","anexo":{"nome":"x.xlsx","caminho":"fechamentos/f2/fechamento-02.xlsx","tamanho":10}}')$q$, 'sem expediente');
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$ begin
  delete from public.fechamentos where data = '2026-10-12';
  if exists (select 1 from public.fechamentos where data = '2026-10-12') then raise exception 'admin deveria excluir o dia sem expediente'; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- comercial também envia, mas não confere
set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
do $$
declare r jsonb;
begin
  r := public.registrar_fechamento('{"data":"2026-10-02","anexo":{"nome":"fechamento-02.xlsx","caminho":"fechamentos/f2/fechamento-02.xlsx","tamanho":10}}');
  if r->>'status' <> 'Enviado' then raise exception 'comercial deveria enviar fechamento %', r; end if;
  update public.fechamentos set status = 'Conferido' where data = '2026-10-02';
  if (select status from public.fechamentos where data = '2026-10-02') <> 'Enviado' then raise exception 'comercial conseguiu conferir'; end if;
  -- comercial continua vendo o que é dele
  if (select count(*) from public.anexos where entidade = 'propostas') <> 1 then raise exception 'comercial deveria ver anexos de propostas'; end if;
  if (select count(*) from storage.objects where name like 'propostas/%') <> 1 then raise exception 'comercial deveria ver arquivos de propostas'; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- pessoas (só admin)
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$
declare n int;
begin
  insert into public.funcionarios (id, nome, cargo, setor, admissao)
    values ('44444444-0000-0000-0000-000000000001', 'Ana Souza', 'Eletricista', 'Manutenção', '2024-03-01');
  perform pg_temp.espera_erro($q$insert into public.treinamentos (funcionario_id, nome, realizado_em, validade) values ('44444444-0000-0000-0000-000000000001', 'NR-10', '2026-05-10', '2026-01-01')$q$, 'treinamento_validade_depois_da_realizacao');
  perform pg_temp.espera_erro($q$insert into public.treinamentos (funcionario_id, nome, realizado_em, carga_horaria) values ('44444444-0000-0000-0000-000000000001', 'NR-10', '2026-05-10', 0)$q$, 'check');
  insert into public.treinamentos (id, funcionario_id, nome, realizado_em, validade, carga_horaria, instituicao)
    values ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'NR-10 Segurança em eletricidade', '2026-05-10', '2028-05-10', 40, 'SENAI');
  insert into public.documentos (funcionario_id, tipo, emitido_em, validade)
    values ('44444444-0000-0000-0000-000000000001', 'ASO periódico', '2026-02-01', '2027-02-01');
  perform pg_temp.espera_erro($q$insert into public.documentos (funcionario_id, tipo, emitido_em, validade) values ('44444444-0000-0000-0000-000000000001', 'CNH', '2026-02-01', '2025-01-01')$q$, 'documento_validade_depois_da_emissao');
  update public.funcionarios set situacao = 'Afastado' where id = '44444444-0000-0000-0000-000000000001';
  perform pg_temp.espera_erro($q$update public.funcionarios set situacao = 'Férias' where id = '44444444-0000-0000-0000-000000000001'$q$, 'check');

  select count(*) into n from public.historico where entidade = 'funcionarios' and registro_id = '44444444-0000-0000-0000-000000000001';
  if n <> 4 then raise exception 'esperava 4 eventos no histórico da pessoa (cadastro, treinamento, documento, situação), há %', n; end if;
  if not exists (select 1 from public.historico where entidade = 'funcionarios' and descricao = 'NR-10 Segurança em eletricidade registrado · válido até 10/05/2028') then
    raise exception 'histórico do treinamento sem a validade';
  end if;
  if not exists (select 1 from public.historico where entidade = 'funcionarios' and acao = 'Situação' and descricao = 'Ativo → Afastado') then
    raise exception 'histórico deveria registrar a troca de situação';
  end if;

  -- certificado anexado ao treinamento: não exclui o treinamento antes do anexo
  insert into storage.objects (bucket_id, name) values ('zetta-anexos', 'treinamentos/55555555/certificado.pdf');
  insert into public.anexos (entidade, registro_id, nome, caminho, tamanho, criado_por)
    values ('treinamentos', '55555555-0000-0000-0000-000000000001', 'certificado.pdf', 'treinamentos/55555555/certificado.pdf', 500, 'aaaaaaaa-0000-0000-0000-000000000001');
  perform pg_temp.espera_erro($q$delete from public.treinamentos where id = '55555555-0000-0000-0000-000000000001'$q$, 'Exclua os anexos');
  -- funcionário com treinamentos não é excluído (use a situação Desligado)
  perform pg_temp.espera_erro($q$delete from public.funcionarios where id = '44444444-0000-0000-0000-000000000001'$q$, 'foreign key');
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';
do $$ begin
  if (select count(*) from public.funcionarios) <> 0 then raise exception 'comercial não deveria ver funcionários'; end if;
  if (select count(*) from public.treinamentos) <> 0 then raise exception 'comercial não deveria ver treinamentos'; end if;
  if (select count(*) from public.historico where entidade = 'funcionarios') <> 0 then raise exception 'comercial não deveria ver o histórico das pessoas'; end if;
  if (select count(*) from public.anexos where entidade = 'treinamentos') <> 0 then raise exception 'comercial não deveria ver certificados'; end if;
  if (select count(*) from storage.objects where name like 'treinamentos/%') <> 0 then raise exception 'comercial não deveria ver arquivos das pessoas'; end if;
  perform pg_temp.espera_erro($q$insert into public.documentos (funcionario_id, tipo) values ('44444444-0000-0000-0000-000000000001', 'RG')$q$, 'row-level security');
  -- e continua vendo o histórico comercial
  if (select count(*) from public.historico where entidade = 'propostas') = 0 then raise exception 'comercial deveria ver o histórico das propostas'; end if;
end $$;
reset role;

select 'TODOS OS TESTES DA MIGRAÇÃO 04 PASSARAM' as resultado;
