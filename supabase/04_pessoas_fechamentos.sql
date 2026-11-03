-- =============================================================================
-- Zetta Propostas v4 — Pessoas e Fechamentos diários
--
-- Execute UMA vez no SQL Editor do projeto Supabase, DEPOIS do 01_estrutura.sql.
-- O script é idempotente: rodar de novo não duplica nada nem apaga dados.
--
-- O que este arquivo cria ou muda:
--   perfis ......... novo perfil "operacional", que só vê e envia fechamentos.
--                    e_membro() passa a significar "admin ou comercial" (o acesso
--                    comercial de sempre); e_da_equipe() = qualquer integrante ativo.
--   pessoas ........ funcionarios, treinamentos e documentos, com validade.
--                    Só administrador lê e grava: são dados pessoais, e alguns são
--                    de saúde (ASO), protegidos pela LGPD.
--   fechamentos .... um por dia. A equipe envia a planilha pela função
--                    registrar_fechamento; o administrador confere, aponta
--                    divergência ou marca o dia como sem expediente.
--                    fechamento_ajustes guarda os dias com fechamento e o prazo.
--   anexos ......... aceitam as novas entidades; o acesso aos arquivos passa a ser
--                    por pasta (a pasta tem o nome da entidade).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Perfis e funções de acesso
-- -----------------------------------------------------------------------------
do $$
declare c text;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.equipe'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ilike '%perfil%'
  loop
    execute format('alter table public.equipe drop constraint %I', c);
  end loop;
end $$;
alter table public.equipe add constraint equipe_perfil_check
  check (perfil in ('admin', 'comercial', 'operacional'));

-- Acesso comercial (clientes, solicitações, propostas, relatórios). O perfil
-- operacional fica de fora, então nenhuma política antiga se abre para ele.
create or replace function public.e_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.equipe
                  where id = auth.uid() and ativo and perfil in ('admin', 'comercial'));
$$;

-- Qualquer integrante ativo, de qualquer perfil.
create or replace function public.e_da_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.equipe where id = auth.uid() and ativo);
$$;

-- Quem acessa os registros (histórico, anexos) e os arquivos de cada entidade.
-- A primeira pasta do caminho no Storage é o nome da entidade.
create or replace function public.pode_acessar(p_entidade text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p_entidade = 'fechamentos' then public.e_da_equipe()
    when p_entidade in ('funcionarios', 'treinamentos', 'documentos') then public.e_admin()
    else public.e_membro()
  end;
$$;

create or replace function public.anexo_registrado(p_caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.anexos where caminho = p_caminho);
$$;

-- -----------------------------------------------------------------------------
-- 2. Pessoas: funcionários, treinamentos e documentos
-- -----------------------------------------------------------------------------
create table if not exists public.funcionarios (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(btrim(nome)) between 1 and 160),
  cargo         text,
  setor         text,
  matricula     text,
  email         text,
  telefone      text,
  admissao      date,
  situacao      text not null default 'Ativo' check (situacao in ('Ativo', 'Afastado', 'Desligado')),
  observacoes   text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por    uuid default auth.uid() references public.equipe(id) on delete set null
);

-- Cada linha é um treinamento feito. Renovar = registrar o novo; o anterior fica
-- como histórico e a tela considera o mais recente de cada nome (ver business.js).
create table if not exists public.treinamentos (
  id             uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete restrict,
  nome           text not null check (length(btrim(nome)) between 1 and 160),
  realizado_em   date not null,
  validade       date,                     -- vazio = não vence
  carga_horaria  numeric(6,1) check (carga_horaria is null or carga_horaria > 0),
  instituicao    text,
  observacoes    text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  criado_por     uuid default auth.uid() references public.equipe(id) on delete set null,
  constraint treinamento_validade_depois_da_realizacao check (validade is null or validade >= realizado_em)
);

create table if not exists public.documentos (
  id             uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references public.funcionarios(id) on delete restrict,
  tipo           text not null check (length(btrim(tipo)) between 1 and 120),
  numero         text,
  emitido_em     date,
  validade       date,                     -- vazio = não vence
  observacoes    text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  criado_por     uuid default auth.uid() references public.equipe(id) on delete set null,
  constraint documento_validade_depois_da_emissao check (validade is null or emitido_em is null or validade >= emitido_em)
);

create index if not exists treinamentos_funcionario_idx on public.treinamentos (funcionario_id, realizado_em);
create index if not exists treinamentos_validade_idx on public.treinamentos (validade);
create index if not exists documentos_funcionario_idx on public.documentos (funcionario_id);
create index if not exists documentos_validade_idx on public.documentos (validade);

-- -----------------------------------------------------------------------------
-- 3. Fechamentos diários
-- -----------------------------------------------------------------------------
create table if not exists public.fechamentos (
  id               uuid primary key default gen_random_uuid(),
  data             date not null unique,
  status           text not null default 'Enviado'
                   check (status in ('Enviado', 'Conferido', 'Divergente', 'Sem expediente')),
  valor_total      numeric(14,2) check (valor_total is null or valor_total >= 0),
  observacoes      text,
  enviado_por      uuid default auth.uid() references public.equipe(id) on delete set null,
  enviado_em       timestamptz not null default now(),   -- último envio
  primeiro_envio_em timestamptz not null default now(),  -- base da pontualidade
  conferido_por    uuid references public.equipe(id) on delete set null,
  conferido_em     timestamptz,
  nota_conferencia text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  constraint fechamento_divergente_tem_nota
    check (status <> 'Divergente' or length(btrim(coalesce(nota_conferencia, ''))) > 0),
  constraint fechamento_sem_expediente_tem_motivo
    check (status <> 'Sem expediente' or length(btrim(coalesce(observacoes, ''))) > 0)
);

-- Linha única com os dias da semana em que há fechamento (0 = domingo … 6 = sábado),
-- o prazo de envio (até horario_limite do próprio dia ou do dia seguinte) e a data
-- em que o controle começou (dias anteriores não contam como faltando).
create table if not exists public.fechamento_ajustes (
  id                 boolean primary key default true check (id),
  inicio             date not null default current_date,
  dias_semana        smallint[] not null default '{1,2,3,4,5,6}'
                     check (dias_semana <@ '{0,1,2,3,4,5,6}'::smallint[] and cardinality(dias_semana) > 0),
  horario_limite     time not null default '20:00',
  prazo_dia_seguinte boolean not null default false,
  atualizado_em      timestamptz not null default now(),
  atualizado_por     uuid default auth.uid()
);
insert into public.fechamento_ajustes (id) values (true) on conflict (id) do nothing;

-- colunas acrescentadas depois da primeira versão deste arquivo (rodar de novo é seguro)
alter table public.fechamentos add column if not exists primeiro_envio_em timestamptz not null default now();
alter table public.fechamento_ajustes add column if not exists inicio date not null default current_date;

create index if not exists fechamentos_data_idx on public.fechamentos (data desc);

-- anexos: aceitar as novas entidades
do $$
declare c text;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.anexos'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) ilike '%entidade%'
  loop
    execute format('alter table public.anexos drop constraint %I', c);
  end loop;
end $$;
alter table public.anexos add constraint anexos_entidade_check
  check (entidade in ('solicitacoes', 'propostas', 'funcionarios', 'treinamentos', 'documentos', 'fechamentos'));

-- -----------------------------------------------------------------------------
-- 4. Gatilhos: data de atualização, regras, auditoria e anexos
-- -----------------------------------------------------------------------------
drop trigger if exists funcionarios_atualizado on public.funcionarios;
create trigger funcionarios_atualizado before update on public.funcionarios
  for each row execute function public.tocar_atualizado_em();
drop trigger if exists treinamentos_atualizado on public.treinamentos;
create trigger treinamentos_atualizado before update on public.treinamentos
  for each row execute function public.tocar_atualizado_em();
drop trigger if exists documentos_atualizado on public.documentos;
create trigger documentos_atualizado before update on public.documentos
  for each row execute function public.tocar_atualizado_em();
drop trigger if exists fechamento_ajustes_atualizado on public.fechamento_ajustes;
create trigger fechamento_ajustes_atualizado before update on public.fechamento_ajustes
  for each row execute function public.tocar_atualizado_em();

-- Registro com arquivos não é excluído: a tela apaga os anexos (e os arquivos)
-- antes, para não sobrar arquivo órfão no Storage.
create or replace function public.bloquear_exclusao_com_anexos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from anexos where entidade = tg_argv[0] and registro_id = old.id) then
    raise exception 'Exclua os anexos antes de excluir este registro.';
  end if;
  return old;
end $$;

drop trigger if exists funcionarios_sem_anexos on public.funcionarios;
create trigger funcionarios_sem_anexos before delete on public.funcionarios
  for each row execute function public.bloquear_exclusao_com_anexos('funcionarios');
drop trigger if exists treinamentos_sem_anexos on public.treinamentos;
create trigger treinamentos_sem_anexos before delete on public.treinamentos
  for each row execute function public.bloquear_exclusao_com_anexos('treinamentos');
drop trigger if exists documentos_sem_anexos on public.documentos;
create trigger documentos_sem_anexos before delete on public.documentos
  for each row execute function public.bloquear_exclusao_com_anexos('documentos');
drop trigger if exists fechamentos_sem_anexos on public.fechamentos;
create trigger fechamentos_sem_anexos before delete on public.fechamentos
  for each row execute function public.bloquear_exclusao_com_anexos('fechamentos');

-- Auditoria das pessoas: tudo fica no histórico do funcionário (entidade
-- 'funcionarios'), inclusive os treinamentos e documentos dele.
create or replace function public.auditar_pessoa() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_reg   record := case when tg_op = 'DELETE' then old else new end;
  v_func  uuid;
  v_acao  text;
  v_desc  text;
  v_venc  date;
begin
  if tg_table_name = 'funcionarios' then
    v_func := v_reg.id;
    v_acao := case tg_op when 'INSERT' then 'Cadastro' when 'UPDATE' then 'Edição' else 'Exclusão' end;
    v_desc := v_reg.nome;
    if tg_op = 'UPDATE' and new.situacao is distinct from old.situacao then
      v_acao := 'Situação';
      v_desc := old.situacao || ' → ' || new.situacao;
    end if;
  else
    v_func := v_reg.funcionario_id;
    v_venc := v_reg.validade;
    if tg_table_name = 'treinamentos' then
      v_acao := 'Treinamento';
      v_desc := v_reg.nome;
    else
      v_acao := 'Documento';
      v_desc := v_reg.tipo;
    end if;
    v_desc := v_desc || case tg_op when 'INSERT' then ' registrado' when 'UPDATE' then ' editado' else ' excluído' end
              || case when v_venc is not null and tg_op <> 'DELETE' then ' · válido até ' || to_char(v_venc, 'DD/MM/YYYY') else '' end;
  end if;
  insert into historico (entidade, registro_id, acao, descricao) values ('funcionarios', v_func, v_acao, v_desc);
  return null;
end $$;

drop trigger if exists funcionarios_auditoria on public.funcionarios;
create trigger funcionarios_auditoria after insert or update or delete on public.funcionarios
  for each row execute function public.auditar_pessoa();
drop trigger if exists treinamentos_auditoria on public.treinamentos;
create trigger treinamentos_auditoria after insert or update or delete on public.treinamentos
  for each row execute function public.auditar_pessoa();
drop trigger if exists documentos_auditoria on public.documentos;
create trigger documentos_auditoria after insert or update or delete on public.documentos
  for each row execute function public.auditar_pessoa();

-- Fechamento: quem confere fica registrado; Conferido/Divergente não valem para
-- dia sem expediente.
create or replace function public.fechamento_regras() returns trigger
language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  if tg_op = 'INSERT' then
    if new.status = 'Sem expediente' then
      new.enviado_por := auth.uid();
      new.enviado_em := now();
    end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    if new.status in ('Conferido', 'Divergente') then
      if old.status = 'Sem expediente' then
        raise exception 'Dia sem expediente não tem fechamento para conferir.';
      end if;
      new.conferido_por := auth.uid();
      new.conferido_em := now();
    elsif new.status = 'Sem expediente' then
      new.conferido_por := null;
      new.conferido_em := null;
      new.nota_conferencia := null;
    end if;
  end if;
  if new.status = 'Enviado' then
    -- reenvio: a conferência anterior era de outra planilha
    new.conferido_por := null;
    new.conferido_em := null;
    new.nota_conferencia := null;
  end if;
  return new;
end $$;

drop trigger if exists fechamentos_regras on public.fechamentos;
create trigger fechamentos_regras before insert or update on public.fechamentos
  for each row execute function public.fechamento_regras();

-- Envio e reenvio são registrados pela função registrar_fechamento; aqui ficam
-- conferência, divergência, dia sem expediente e exclusão.
create or replace function public.auditar_fechamento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    insert into historico (entidade, registro_id, acao, descricao)
      values ('fechamentos', old.id, 'Exclusão', to_char(old.data, 'DD/MM/YYYY'));
    return null;
  end if;
  if (tg_op = 'INSERT' or new.status is distinct from old.status) and new.status <> 'Enviado' then
    insert into historico (entidade, registro_id, acao, descricao)
      values ('fechamentos', new.id, new.status,
              case new.status
                when 'Divergente' then new.nota_conferencia
                when 'Sem expediente' then new.observacoes
                else to_char(new.data, 'DD/MM/YYYY') end);
  end if;
  return null;
end $$;

drop trigger if exists fechamentos_auditoria on public.fechamentos;
create trigger fechamentos_auditoria after insert or update or delete on public.fechamentos
  for each row execute function public.auditar_fechamento();

-- -----------------------------------------------------------------------------
-- 5. Enviar o fechamento do dia (única porta de envio para a equipe)
-- -----------------------------------------------------------------------------
-- Entrada (jsonb): { id?, data, valor_total?, observacoes?,
--                    anexo?: { nome, caminho, tamanho, tipo } }
-- O arquivo já deve estar no Storage em fechamentos/<id>/... (a tela envia antes).
-- Fechamento novo exige o arquivo; reenvio pode só atualizar os dados.
-- Reenviar volta o status para "Enviado" e apaga a conferência anterior;
-- primeiro_envio_em não muda (a pontualidade é a do primeiro envio).
-- Saída: { id, status, reenvio }
create or replace function public.registrar_fechamento(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_data    date := nullif(p->>'data', '')::date;
  v_id      uuid := nullif(p->>'id', '')::uuid;
  v_valor   numeric(14,2) := round(nullif(p->>'valor_total', '')::numeric, 2);
  v_obs     text := nullif(btrim(coalesce(p->>'observacoes', '')), '');
  v_anexo   jsonb := case when jsonb_typeof(p->'anexo') = 'object' then p->'anexo' end;
  v_atual   public.fechamentos%rowtype;
  v_reenvio boolean := false;
begin
  if not e_da_equipe() then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;
  if v_data is null then
    raise exception 'Informe a data do fechamento.';
  end if;
  if v_data > current_date + 1 then
    raise exception 'Não é possível enviar o fechamento de um dia que ainda não chegou.';
  end if;
  if v_valor is not null and v_valor < 0 then
    raise exception 'O total do dia não pode ser negativo.';
  end if;
  if v_anexo is not null then
    if coalesce(v_anexo->>'caminho', '') not like 'fechamentos/%' then
      raise exception 'Arquivo do fechamento em local inválido.';
    end if;
    if coalesce(nullif(v_anexo->>'tamanho', '')::bigint, 0) not between 1 and 10485760 then
      raise exception 'O arquivo precisa ter até 10 MB.';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'zetta-anexos' and name = v_anexo->>'caminho') then
      raise exception 'A planilha não chegou ao armazenamento. Envie de novo.';
    end if;
  end if;

  select * into v_atual from fechamentos where data = v_data for update;
  if found then
    if v_atual.status = 'Conferido' and not e_admin() then
      raise exception 'O fechamento de % já foi conferido. Peça a um administrador para reabrir.', to_char(v_data, 'DD/MM/YYYY');
    end if;
    if v_atual.status = 'Sem expediente' and not e_admin() then
      raise exception 'O dia % está marcado como sem expediente.', to_char(v_data, 'DD/MM/YYYY');
    end if;
    v_reenvio := true;
    update fechamentos set
      status = 'Enviado', valor_total = v_valor, observacoes = v_obs,
      enviado_por = auth.uid(), enviado_em = now(),
      conferido_por = null, conferido_em = null, nota_conferencia = null
    where id = v_atual.id
    returning * into v_atual;
  else
    if v_anexo is null then
      raise exception 'Anexe a planilha do fechamento.';
    end if;
    insert into fechamentos (id, data, status, valor_total, observacoes, enviado_por, enviado_em, primeiro_envio_em)
    values (coalesce(v_id, gen_random_uuid()), v_data, 'Enviado', v_valor, v_obs, auth.uid(), now(), now())
    returning * into v_atual;
  end if;

  if v_anexo is not null then
    insert into anexos (entidade, registro_id, nome, caminho, tamanho, tipo, criado_por)
    values ('fechamentos', v_atual.id, left(coalesce(nullif(btrim(v_anexo->>'nome'), ''), 'planilha'), 200),
            v_anexo->>'caminho', (v_anexo->>'tamanho')::int, nullif(v_anexo->>'tipo', ''), auth.uid());
  end if;

  insert into historico (entidade, registro_id, acao, descricao)
  values ('fechamentos', v_atual.id, case when v_reenvio then 'Reenvio' else 'Envio' end,
          coalesce(v_anexo->>'nome', 'Dados atualizados'));

  return jsonb_build_object('id', v_atual.id, 'status', v_atual.status, 'reenvio', v_reenvio);
end $$;

-- -----------------------------------------------------------------------------
-- 6. Segurança (RLS)
-- -----------------------------------------------------------------------------
alter table public.funcionarios       enable row level security;
alter table public.treinamentos       enable row level security;
alter table public.documentos         enable row level security;
alter table public.fechamentos        enable row level security;
alter table public.fechamento_ajustes enable row level security;

-- pessoas: só administrador
drop policy if exists funcionarios_admin on public.funcionarios;
create policy funcionarios_admin on public.funcionarios for all to authenticated using (e_admin()) with check (e_admin());
drop policy if exists treinamentos_admin on public.treinamentos;
create policy treinamentos_admin on public.treinamentos for all to authenticated using (e_admin()) with check (e_admin());
drop policy if exists documentos_admin on public.documentos;
create policy documentos_admin on public.documentos for all to authenticated using (e_admin()) with check (e_admin());

-- fechamentos: toda a equipe vê; o envio é pela função; só admin grava direto
drop policy if exists fechamentos_ler on public.fechamentos;
create policy fechamentos_ler on public.fechamentos for select to authenticated using (e_da_equipe());
drop policy if exists fechamentos_incluir on public.fechamentos;
create policy fechamentos_incluir on public.fechamentos for insert to authenticated with check (e_admin());
drop policy if exists fechamentos_alterar on public.fechamentos;
create policy fechamentos_alterar on public.fechamentos for update to authenticated using (e_admin()) with check (e_admin());
drop policy if exists fechamentos_excluir on public.fechamentos;
create policy fechamentos_excluir on public.fechamentos for delete to authenticated using (e_admin());

drop policy if exists fechamento_ajustes_ler on public.fechamento_ajustes;
create policy fechamento_ajustes_ler on public.fechamento_ajustes for select to authenticated using (e_da_equipe());
drop policy if exists fechamento_ajustes_alterar on public.fechamento_ajustes;
create policy fechamento_ajustes_alterar on public.fechamento_ajustes for update to authenticated using (e_admin()) with check (e_admin());

-- equipe: qualquer integrante ativo vê os nomes (para saber quem enviou)
drop policy if exists equipe_ler on public.equipe;
create policy equipe_ler on public.equipe for select to authenticated using (id = auth.uid() or e_da_equipe());

-- histórico e anexos: cada entidade com a sua regra (pode_acessar)
drop policy if exists historico_ler on public.historico;
create policy historico_ler on public.historico for select to authenticated using (pode_acessar(entidade));

drop policy if exists anexos_ler on public.anexos;
create policy anexos_ler on public.anexos for select to authenticated using (pode_acessar(entidade));
drop policy if exists anexos_incluir on public.anexos;
create policy anexos_incluir on public.anexos for insert to authenticated
  with check (pode_acessar(entidade) and criado_por = auth.uid() and (entidade <> 'fechamentos' or e_admin()));
drop policy if exists anexos_excluir on public.anexos;
create policy anexos_excluir on public.anexos for delete to authenticated
  using (case when entidade = 'fechamentos' then e_admin() else pode_acessar(entidade) end);

-- arquivos: a primeira pasta do caminho decide quem acessa. Na pasta de
-- fechamentos, quem enviou só pode apagar arquivo que ainda não foi registrado
-- (é a limpeza quando o envio falha no meio).
drop policy if exists zetta_anexos_ler on storage.objects;
create policy zetta_anexos_ler on storage.objects for select to authenticated
  using (bucket_id = 'zetta-anexos' and public.pode_acessar((storage.foldername(name))[1]));
drop policy if exists zetta_anexos_enviar on storage.objects;
create policy zetta_anexos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'zetta-anexos' and public.pode_acessar((storage.foldername(name))[1]));
drop policy if exists zetta_anexos_excluir on storage.objects;
create policy zetta_anexos_excluir on storage.objects for delete to authenticated
  using (bucket_id = 'zetta-anexos' and (
    case when (storage.foldername(name))[1] = 'fechamentos'
      then public.e_admin() or (public.e_da_equipe() and not public.anexo_registrado(name))
      else public.pode_acessar((storage.foldername(name))[1]) end));

-- permissões
revoke all on public.funcionarios, public.treinamentos, public.documentos,
              public.fechamentos, public.fechamento_ajustes from anon;
grant select, insert, update, delete on public.funcionarios, public.treinamentos, public.documentos,
              public.fechamentos, public.fechamento_ajustes to authenticated;

revoke all on function public.registrar_fechamento(jsonb) from public, anon;
grant execute on function public.registrar_fechamento(jsonb) to authenticated;
revoke execute on function public.e_da_equipe() from public, anon;
revoke execute on function public.pode_acessar(text) from public, anon;
revoke execute on function public.anexo_registrado(text) from public, anon;
grant execute on function public.e_da_equipe() to authenticated;
grant execute on function public.pode_acessar(text) to authenticated;
grant execute on function public.anexo_registrado(text) to authenticated;

-- funções de gatilho não ficam expostas na API
revoke execute on function public.bloquear_exclusao_com_anexos() from public, anon, authenticated;
revoke execute on function public.auditar_pessoa() from public, anon, authenticated;
revoke execute on function public.fechamento_regras() from public, anon, authenticated;
revoke execute on function public.auditar_fechamento() from public, anon, authenticated;

-- Confira: deve listar as 5 tabelas novas com RLS ativo.
select c.relname as tabela, c.relrowsecurity as rls_ativo
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and c.relname in ('funcionarios', 'treinamentos', 'documentos', 'fechamentos', 'fechamento_ajustes')
 order by 1;
