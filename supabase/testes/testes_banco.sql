-- =============================================================================
-- Testes do banco — rodam num Postgres local com stub_supabase.sql
-- (não execute no Supabase de produção). Cada bloco falha com exceção se a
-- regra não se comportar como esperado.
-- =============================================================================
\set ON_ERROR_STOP 1

-- usuários de teste: A = admin, B = comercial, C = autenticado sem acesso
insert into auth.users values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@teste.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'comercial@teste.local'),
  ('cccccccc-0000-0000-0000-000000000003', 'semacesso@teste.local');
insert into public.equipe (id, nome, perfil) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Admin Teste', 'admin'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Comercial Teste', 'comercial');

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

-- ---------------------------------------------------------------- sem acesso
set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000003';
do $$ begin
  if (select count(*) from public.equipe) <> 0 then raise exception 'C não deveria ver a equipe'; end if;
  perform pg_temp.espera_erro($q$insert into public.clientes (nome) values ('X')$q$, 'row-level security');
  perform pg_temp.espera_erro($q$select public.salvar_proposta('{"titulo":"x","itens":[{"descricao":"a","quantidade":1,"valor_unitario":1}]}')$q$, 'Acesso não autorizado');
end $$;
reset role;

-- ---------------------------------------------------------------- anônimo
set role anon;
do $$ begin
  perform pg_temp.espera_erro('select * from public.clientes', 'permission denied');
end $$;
reset role;

-- ---------------------------------------------------------------- comercial
set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';

insert into public.clientes (id, nome, cidade) values ('11111111-0000-0000-0000-000000000001', 'Cliente Teste', 'Campo Grande');
insert into public.solicitacoes (id, cliente_id, titulo) values
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Automação de pedidos');

do $$
declare r jsonb; v_id uuid; s text; n int;
begin
  -- validações de item e desconto
  perform pg_temp.espera_erro($q$select public.salvar_proposta('{"solicitacao_id":"22222222-0000-0000-0000-000000000001","titulo":"P","itens":[]}')$q$, 'ao menos um item');
  perform pg_temp.espera_erro($q$select public.salvar_proposta('{"solicitacao_id":"22222222-0000-0000-0000-000000000001","titulo":"P","itens":[{"descricao":"a","quantidade":0,"valor_unitario":10}]}')$q$, 'maior que zero');
  perform pg_temp.espera_erro($q$select public.salvar_proposta('{"solicitacao_id":"22222222-0000-0000-0000-000000000001","titulo":"P","desconto":50,"itens":[{"descricao":"a","quantidade":1,"valor_unitario":10}]}')$q$, 'superar o subtotal');
  perform pg_temp.espera_erro($q$insert into public.propostas (numero, solicitacao_id, titulo) values ('ZP-99999','22222222-0000-0000-0000-000000000001','direto')$q$, 'row-level security');

  -- criação: número, revisão 1, total com arredondamento por linha
  r := public.salvar_proposta('{"solicitacao_id":"22222222-0000-0000-0000-000000000001","titulo":"Automação","desconto":"100",
        "itens":[{"descricao":"Implantação","quantidade":1,"valor_unitario":4800},
                 {"descricao":"Horas de suporte","quantidade":3.333,"valor_unitario":150}]}');
  v_id := (r->>'id')::uuid;
  if r->>'numero' <> 'ZP-00001' then raise exception 'número inesperado %', r; end if;
  if (r->>'revisao')::int <> 1 then raise exception 'revisão inesperada %', r; end if;
  -- 4800 + round(3.333*150,2)=499.95 → 5299.95 − 100 = 5199.95
  if (r->>'valor_total')::numeric <> 5199.95 then raise exception 'total inesperado %', r; end if;
  select status into s from public.solicitacoes where id = '22222222-0000-0000-0000-000000000001';
  if s <> 'Em proposta' then raise exception 'solicitação deveria estar Em proposta, está %', s; end if;

  -- edição: revisão 2, itens substituídos
  r := public.salvar_proposta(jsonb_build_object('id', v_id, 'titulo', 'Automação v2', 'desconto', 0,
        'itens', '[{"descricao":"Implantação","quantidade":1,"valor_unitario":5000}]'::jsonb));
  if (r->>'revisao')::int <> 2 then raise exception 'esperava revisão 2 %', r; end if;
  select count(*) into n from public.proposta_itens where proposta_id = v_id and revisao = 2;
  if n <> 1 then raise exception 'esperava 1 item na revisão 2, há %', n; end if;
  select count(*) into n from public.proposta_itens where proposta_id = v_id and revisao = 1;
  if n <> 2 then raise exception 'os 2 itens da revisão 1 deveriam continuar guardados, há %', n; end if;
  select count(*) into n from public.revisoes where proposta_id = v_id;
  if n <> 2 then raise exception 'esperava 2 revisões, há %', n; end if;

  -- transições
  perform pg_temp.espera_erro(format('select public.mudar_status_proposta(%L, %L)', v_id, 'Aprovada'), 'não pode passar');
  perform public.mudar_status_proposta(v_id, 'Enviada');
  if (select enviada_em from public.propostas where id = v_id) is null then raise exception 'enviada_em vazio'; end if;
  perform pg_temp.espera_erro(format('select public.mudar_status_proposta(%L, %L)', v_id, 'Recusada'), 'motivo');
  perform public.mudar_status_proposta(v_id, 'Em negociacao');
  perform public.mudar_status_proposta(v_id, 'Aprovada');
  select status into s from public.solicitacoes where id = '22222222-0000-0000-0000-000000000001';
  if s <> 'Concluida' then raise exception 'aprovação deveria concluir a solicitação, está %', s; end if;
  perform pg_temp.espera_erro(format('select public.salvar_proposta(%L)', jsonb_build_object('id', v_id, 'titulo','x','itens','[{"descricao":"a","quantidade":1,"valor_unitario":1}]'::jsonb)), 'não pode mais ser editada');
  perform pg_temp.espera_erro(format('select public.mudar_status_proposta(%L, %L)', v_id, 'Rascunho'), 'não pode passar');

  -- histórico de status: Rascunho → Enviada → Em negociacao → Aprovada
  select string_agg(coalesce(de, '∅') || '>' || para, ' ' order by id) into s
    from public.status_historico where entidade = 'propostas' and registro_id = v_id;
  if s <> '∅>Rascunho Rascunho>Enviada Enviada>Em negociacao Em negociacao>Aprovada' then
    raise exception 'histórico de status inesperado: %', s;
  end if;

  -- não cria proposta em solicitação concluída
  perform pg_temp.espera_erro($q$select public.salvar_proposta('{"solicitacao_id":"22222222-0000-0000-0000-000000000001","titulo":"P","itens":[{"descricao":"a","quantidade":1,"valor_unitario":1}]}')$q$, 'reabra');

  -- cliente com solicitação não pode ser excluído
  perform pg_temp.espera_erro($q$delete from public.clientes where id = '11111111-0000-0000-0000-000000000001'$q$, 'foreign key');

  -- cancelar solicitação exige motivo
  perform pg_temp.espera_erro($q$update public.solicitacoes set status = 'Cancelada' where id = '22222222-0000-0000-0000-000000000001'$q$, 'solicitacao_cancelada_tem_motivo');

  -- comercial não altera a equipe (a política filtra: nenhuma linha muda)
  update public.equipe set perfil = 'admin' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
  if (select perfil from public.equipe where id = 'bbbbbbbb-0000-0000-0000-000000000002') <> 'comercial' then
    raise exception 'comercial conseguiu se promover';
  end if;
  perform pg_temp.espera_erro($q$insert into public.equipe (id, nome) values ('cccccccc-0000-0000-0000-000000000003','C')$q$, 'row-level security');
end $$;
reset role;

-- ---------------------------------------------------------------- admin
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
do $$ begin
  perform pg_temp.espera_erro($q$update public.equipe set perfil = 'comercial' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$, 'próprio acesso');
  insert into public.equipe (id, nome) values ('cccccccc-0000-0000-0000-000000000003', 'Novo Integrante');
  if (select count(*) from public.equipe) <> 3 then raise exception 'admin deveria incluir integrante'; end if;
end $$;
reset role;

select 'TODOS OS TESTES DO BANCO PASSARAM' as resultado;
