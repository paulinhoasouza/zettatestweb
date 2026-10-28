-- =============================================================================
-- Zetta Propostas v2 — estrutura do banco (Supabase / PostgreSQL)
--
-- Execute UMA vez no SQL Editor de um projeto Supabase NOVO (ver GUIA-PUBLICACAO.md).
-- O script é idempotente nas funções e políticas, mas foi escrito para um banco
-- vazio: não rode por cima do banco da v1 sem antes exportar os dados.
--
-- O que este arquivo cria:
--   tabelas ........ equipe, clientes, solicitacoes, propostas, proposta_itens,
--                    revisoes, status_historico, historico, anexos
--   regras ......... funções salvar_proposta e mudar_status_proposta (únicas
--                    portas de escrita das propostas), transições de status,
--                    numeração ZP-00001, revisão a cada gravação
--   segurança ...... RLS em todas as tabelas: só quem está ativo em `equipe` lê
--                    ou grava; só administrador gerencia a equipe
--   arquivos ....... bucket privado zetta-anexos (até 10 MB por arquivo)
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Equipe e funções de acesso
-- -----------------------------------------------------------------------------
create table if not exists public.equipe (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null check (length(btrim(nome)) between 1 and 120),
  email      text,
  perfil     text not null default 'comercial' check (perfil in ('admin', 'comercial')),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

create or replace function public.e_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.equipe where id = auth.uid() and ativo);
$$;

create or replace function public.e_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.equipe where id = auth.uid() and ativo and perfil = 'admin');
$$;

-- -----------------------------------------------------------------------------
-- 2. Tabelas de negócio
-- -----------------------------------------------------------------------------
create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(btrim(nome)) between 1 and 160),
  documento     text,
  contato       text,
  email         text,
  telefone      text,
  cidade        text,
  observacoes   text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por    uuid default auth.uid() references public.equipe(id) on delete set null
);

create table if not exists public.solicitacoes (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.clientes(id) on delete restrict,
  titulo              text not null check (length(btrim(titulo)) between 1 and 160),
  descricao           text,
  prioridade          text not null default 'Media'
                      check (prioridade in ('Baixa', 'Media', 'Alta', 'Critica')),
  status              text not null default 'Aberta'
                      check (status in ('Aberta', 'Em analise', 'Em proposta', 'Concluida', 'Cancelada')),
  responsavel_id      uuid references public.equipe(id) on delete set null,
  prazo               date,
  motivo_cancelamento text,
  status_desde        timestamptz not null default now(),
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  criado_por          uuid default auth.uid() references public.equipe(id) on delete set null,
  constraint solicitacao_cancelada_tem_motivo
    check (status <> 'Cancelada' or length(btrim(coalesce(motivo_cancelamento, ''))) > 0)
);

create sequence if not exists public.proposta_numero_seq;

create table if not exists public.propostas (
  id                  uuid primary key default gen_random_uuid(),
  numero              text not null unique,
  solicitacao_id      uuid not null references public.solicitacoes(id) on delete restrict,
  titulo              text not null check (length(btrim(titulo)) between 1 and 160),
  escopo              text,
  status              text not null default 'Rascunho'
                      check (status in ('Rascunho', 'Enviada', 'Em negociacao', 'Aprovada', 'Recusada', 'Cancelada')),
  subtotal            numeric(14,2) not null default 0 check (subtotal >= 0),
  desconto            numeric(14,2) not null default 0 check (desconto >= 0),
  valor_total         numeric(14,2) not null default 0 check (valor_total >= 0),
  validade            date,
  condicoes_pagamento text,
  observacoes         text,
  motivo_encerramento text,
  revisao_atual       integer not null default 0,
  status_desde        timestamptz not null default now(),
  enviada_em          timestamptz,
  decidida_em         timestamptz,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  criado_por          uuid default auth.uid() references public.equipe(id) on delete set null,
  constraint proposta_desconto_ate_subtotal check (desconto <= subtotal),
  constraint proposta_encerrada_tem_motivo
    check (status not in ('Recusada', 'Cancelada') or length(btrim(coalesce(motivo_encerramento, ''))) > 0)
);

create table if not exists public.proposta_itens (
  id             uuid primary key default gen_random_uuid(),
  proposta_id    uuid not null references public.propostas(id) on delete cascade,
  revisao        integer not null default 1,   -- itens de cada revisão ficam guardados; vale o da revisao_atual
  ordem          integer not null default 0,
  descricao      text not null check (length(btrim(descricao)) between 1 and 300),
  quantidade     numeric(14,3) not null check (quantidade > 0),
  valor_unitario numeric(14,2) not null check (valor_unitario >= 0)
);

create table if not exists public.revisoes (
  id             uuid primary key default gen_random_uuid(),
  proposta_id    uuid not null references public.propostas(id) on delete cascade,
  numero_revisao integer not null,
  dados          jsonb not null,
  itens          jsonb not null,
  criado_em      timestamptz not null default now(),
  criado_por     uuid default auth.uid(),
  unique (proposta_id, numero_revisao)
);

-- Cada mudança de status (proposta ou solicitação): base do "tempo em cada etapa".
create table if not exists public.status_historico (
  id          bigserial primary key,
  entidade    text not null check (entidade in ('propostas', 'solicitacoes')),
  registro_id uuid not null,
  de          text,
  para        text not null,
  motivo      text,
  em          timestamptz not null default now(),
  por         uuid default auth.uid()
);

-- Auditoria legível: o que aconteceu com cada registro.
create table if not exists public.historico (
  id          bigserial primary key,
  entidade    text not null,
  registro_id uuid not null,
  acao        text not null,
  descricao   text,
  criado_em   timestamptz not null default now(),
  por         uuid default auth.uid()
);

create table if not exists public.anexos (
  id          uuid primary key default gen_random_uuid(),
  entidade    text not null check (entidade in ('solicitacoes', 'propostas')),
  registro_id uuid not null,
  nome        text not null,
  caminho     text not null unique,
  tamanho     integer not null check (tamanho between 1 and 10485760),
  tipo        text,
  criado_em   timestamptz not null default now(),
  criado_por  uuid default auth.uid()
);

create index if not exists solicitacoes_cliente_idx on public.solicitacoes (cliente_id);
create index if not exists propostas_solicitacao_idx on public.propostas (solicitacao_id);
create index if not exists propostas_status_idx on public.propostas (status);
create index if not exists itens_proposta_idx on public.proposta_itens (proposta_id, revisao, ordem);
create index if not exists revisoes_proposta_idx on public.revisoes (proposta_id);
create index if not exists status_hist_registro_idx on public.status_historico (entidade, registro_id, em);
create index if not exists historico_registro_idx on public.historico (entidade, registro_id, criado_em);
create index if not exists anexos_registro_idx on public.anexos (entidade, registro_id);

-- -----------------------------------------------------------------------------
-- 3. Gatilhos: data de atualização, auditoria e histórico de status
-- -----------------------------------------------------------------------------
create or replace function public.tocar_atualizado_em() returns trigger
language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists clientes_atualizado on public.clientes;
create trigger clientes_atualizado before update on public.clientes
  for each row execute function public.tocar_atualizado_em();
drop trigger if exists solicitacoes_atualizado on public.solicitacoes;
create trigger solicitacoes_atualizado before update on public.solicitacoes
  for each row execute function public.tocar_atualizado_em();

create or replace function public.auditar_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into historico (entidade, registro_id, acao, descricao) values ('clientes', new.id, 'Cadastro', new.nome);
  elsif tg_op = 'UPDATE' then
    insert into historico (entidade, registro_id, acao, descricao) values ('clientes', new.id, 'Edição', new.nome);
  else
    insert into historico (entidade, registro_id, acao, descricao) values ('clientes', old.id, 'Exclusão', old.nome);
  end if;
  return null;
end $$;

drop trigger if exists clientes_auditoria on public.clientes;
create trigger clientes_auditoria after insert or update or delete on public.clientes
  for each row execute function public.auditar_cliente();

-- Solicitação: registra criação, edição e cada troca de status.
create or replace function public.auditar_solicitacao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into historico (entidade, registro_id, acao, descricao) values ('solicitacoes', new.id, 'Abertura', new.titulo);
    insert into status_historico (entidade, registro_id, de, para) values ('solicitacoes', new.id, null, new.status);
  else
    if new.status is distinct from old.status then
      insert into status_historico (entidade, registro_id, de, para, motivo)
        values ('solicitacoes', new.id, old.status, new.status,
                case when new.status = 'Cancelada' then new.motivo_cancelamento end);
      insert into historico (entidade, registro_id, acao, descricao)
        values ('solicitacoes', new.id, 'Status', old.status || ' → ' || new.status);
    else
      insert into historico (entidade, registro_id, acao, descricao) values ('solicitacoes', new.id, 'Edição', new.titulo);
    end if;
  end if;
  return null;
end $$;

create or replace function public.solicitacao_status_desde() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status is distinct from old.status then
    new.status_desde := now();
  end if;
  if new.status <> 'Cancelada' then
    new.motivo_cancelamento := null;
  end if;
  return new;
end $$;

drop trigger if exists solicitacoes_status_desde on public.solicitacoes;
create trigger solicitacoes_status_desde before update on public.solicitacoes
  for each row execute function public.solicitacao_status_desde();
drop trigger if exists solicitacoes_auditoria on public.solicitacoes;
create trigger solicitacoes_auditoria after insert or update on public.solicitacoes
  for each row execute function public.auditar_solicitacao();

-- Equipe: ninguém tira o próprio acesso e sempre sobra um administrador ativo.
create or replace function public.proteger_equipe() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id = auth.uid() and (not new.ativo or new.perfil <> 'admin') and old.perfil = 'admin' then
    raise exception 'Não é possível remover o seu próprio acesso de administrador.';
  end if;
  if (old.perfil = 'admin' and old.ativo) and (new.perfil <> 'admin' or not new.ativo)
     and not exists (select 1 from equipe where perfil = 'admin' and ativo and id <> old.id) then
    raise exception 'A equipe precisa de ao menos um administrador ativo.';
  end if;
  return new;
end $$;

drop trigger if exists equipe_protecao on public.equipe;
create trigger equipe_protecao before update on public.equipe
  for each row execute function public.proteger_equipe();

-- -----------------------------------------------------------------------------
-- 4. Regras da proposta
-- -----------------------------------------------------------------------------
-- Transições permitidas. Aprovada, Recusada e Cancelada são finais.
create or replace function public.transicao_proposta_valida(p_de text, p_para text) returns boolean
language sql immutable set search_path = public as $$
  select (p_de, p_para) in (
    ('Rascunho',      'Enviada'),
    ('Rascunho',      'Cancelada'),
    ('Enviada',       'Em negociacao'),
    ('Enviada',       'Aprovada'),
    ('Enviada',       'Recusada'),
    ('Enviada',       'Cancelada'),
    ('Em negociacao', 'Enviada'),
    ('Em negociacao', 'Aprovada'),
    ('Em negociacao', 'Recusada'),
    ('Em negociacao', 'Cancelada')
  );
$$;

-- Cria ou edita uma proposta com seus itens, numa transação.
-- Entrada (jsonb): { id?, solicitacao_id, titulo, escopo, desconto, validade,
--   condicoes_pagamento, observacoes, itens: [{descricao, quantidade, valor_unitario}] }
-- O status NÃO é alterado aqui: use mudar_status_proposta.
-- Saída: { id, numero, revisao, valor_total }
create or replace function public.salvar_proposta(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id        uuid := nullif(p->>'id', '')::uuid;
  v_sol       uuid := nullif(p->>'solicitacao_id', '')::uuid;
  v_titulo    text := btrim(coalesce(p->>'titulo', ''));
  v_desconto  numeric(14,2) := round(coalesce(nullif(p->>'desconto', '')::numeric, 0), 2);
  v_subtotal  numeric(14,2);
  v_itens     jsonb := coalesce(p->'itens', '[]'::jsonb);
  v_atual     public.propostas%rowtype;
  v_sol_row   public.solicitacoes%rowtype;
  v_numero    text;
  v_revisao   integer;
  v_item      jsonb;
  v_ordem     integer := 0;
begin
  if not e_membro() then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;
  if v_titulo = '' then
    raise exception 'Informe o título da proposta.';
  end if;
  if jsonb_typeof(v_itens) <> 'array' or jsonb_array_length(v_itens) = 0 then
    raise exception 'A proposta precisa de ao menos um item.';
  end if;

  -- valida itens e soma o subtotal como o documento mostra (cada linha arredondada)
  v_subtotal := 0;
  for v_item in select * from jsonb_array_elements(v_itens) loop
    if btrim(coalesce(v_item->>'descricao', '')) = '' then
      raise exception 'Todo item precisa de descrição.';
    end if;
    if coalesce(nullif(v_item->>'quantidade', '')::numeric, 0) <= 0 then
      raise exception 'A quantidade de "%" precisa ser maior que zero.', v_item->>'descricao';
    end if;
    if coalesce(nullif(v_item->>'valor_unitario', '')::numeric, -1) < 0 then
      raise exception 'O valor unitário de "%" não pode ser negativo.', v_item->>'descricao';
    end if;
    v_subtotal := v_subtotal + round((v_item->>'quantidade')::numeric * (v_item->>'valor_unitario')::numeric, 2);
  end loop;

  if v_desconto < 0 then
    raise exception 'O desconto não pode ser negativo.';
  end if;
  if v_desconto > v_subtotal then
    raise exception 'O desconto não pode superar o subtotal.';
  end if;

  if v_id is null then
    select * into v_sol_row from solicitacoes where id = v_sol for update;
    if not found then
      raise exception 'Solicitação não encontrada.';
    end if;
    if v_sol_row.status in ('Concluida', 'Cancelada') then
      raise exception 'A solicitação está %; reabra-a antes de criar uma proposta.', lower(v_sol_row.status);
    end if;

    v_numero := 'ZP-' || lpad(nextval('proposta_numero_seq')::text, 5, '0');
    insert into propostas (numero, solicitacao_id, titulo, escopo, subtotal, desconto, valor_total,
                           validade, condicoes_pagamento, observacoes, revisao_atual)
    values (v_numero, v_sol, v_titulo, nullif(btrim(p->>'escopo'), ''), v_subtotal, v_desconto,
            v_subtotal - v_desconto, nullif(p->>'validade', '')::date,
            nullif(btrim(p->>'condicoes_pagamento'), ''), nullif(btrim(p->>'observacoes'), ''), 1)
    returning * into v_atual;

    insert into status_historico (entidade, registro_id, de, para) values ('propostas', v_atual.id, null, 'Rascunho');
    insert into historico (entidade, registro_id, acao, descricao)
      values ('propostas', v_atual.id, 'Criação', v_numero || ' · ' || v_titulo);

    -- a solicitação passa a "Em proposta"
    if v_sol_row.status in ('Aberta', 'Em analise') then
      update solicitacoes set status = 'Em proposta' where id = v_sol;
    end if;
  else
    select * into v_atual from propostas where id = v_id for update;
    if not found then
      raise exception 'Proposta não encontrada.';
    end if;
    if v_atual.status in ('Aprovada', 'Recusada', 'Cancelada') then
      raise exception 'A proposta % está % e não pode mais ser editada.', v_atual.numero, lower(v_atual.status);
    end if;

    update propostas set
      titulo = v_titulo,
      escopo = nullif(btrim(p->>'escopo'), ''),
      subtotal = v_subtotal,
      desconto = v_desconto,
      valor_total = v_subtotal - v_desconto,
      validade = nullif(p->>'validade', '')::date,
      condicoes_pagamento = nullif(btrim(p->>'condicoes_pagamento'), ''),
      observacoes = nullif(btrim(p->>'observacoes'), ''),
      revisao_atual = revisao_atual + 1,
      atualizado_em = now()
    where id = v_id
    returning * into v_atual;

    insert into historico (entidade, registro_id, acao, descricao)
      values ('propostas', v_id, 'Revisão ' || v_atual.revisao_atual, 'Itens e valores atualizados');
  end if;

  for v_item in select * from jsonb_array_elements(v_itens) loop
    v_ordem := v_ordem + 1;
    insert into proposta_itens (proposta_id, revisao, ordem, descricao, quantidade, valor_unitario)
    values (v_atual.id, v_atual.revisao_atual, v_ordem, btrim(v_item->>'descricao'),
            (v_item->>'quantidade')::numeric, round((v_item->>'valor_unitario')::numeric, 2));
  end loop;

  v_revisao := v_atual.revisao_atual;
  insert into revisoes (proposta_id, numero_revisao, dados, itens)
  values (v_atual.id, v_revisao,
          jsonb_build_object('titulo', v_atual.titulo, 'escopo', v_atual.escopo, 'status', v_atual.status,
                             'subtotal', v_atual.subtotal, 'desconto', v_atual.desconto,
                             'valor_total', v_atual.valor_total, 'validade', v_atual.validade,
                             'condicoes_pagamento', v_atual.condicoes_pagamento,
                             'observacoes', v_atual.observacoes),
          (select coalesce(jsonb_agg(jsonb_build_object('descricao', descricao, 'quantidade', quantidade,
                                                        'valor_unitario', valor_unitario) order by ordem), '[]')
             from proposta_itens where proposta_id = v_atual.id and revisao = v_revisao));

  return jsonb_build_object('id', v_atual.id, 'numero', v_atual.numero,
                            'revisao', v_revisao, 'valor_total', v_atual.valor_total);
end $$;

-- Muda o status de uma proposta respeitando as transições.
-- Recusada e Cancelada exigem motivo. Aprovada conclui a solicitação.
create or replace function public.mudar_status_proposta(p_id uuid, p_para text, p_motivo text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_atual  public.propostas%rowtype;
  v_de     text;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if not e_membro() then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;
  select * into v_atual from propostas where id = p_id for update;
  if not found then
    raise exception 'Proposta não encontrada.';
  end if;
  if not transicao_proposta_valida(v_atual.status, p_para) then
    raise exception 'Uma proposta % não pode passar para %.', lower(v_atual.status), lower(p_para);
  end if;
  if p_para in ('Recusada', 'Cancelada') and v_motivo is null then
    raise exception 'Informe o motivo para marcar a proposta como %.', lower(p_para);
  end if;
  v_de := v_atual.status;

  update propostas set
    status = p_para,
    status_desde = now(),
    enviada_em = case when p_para = 'Enviada' and enviada_em is null then now() else enviada_em end,
    decidida_em = case when p_para in ('Aprovada', 'Recusada', 'Cancelada') then now() else decidida_em end,
    motivo_encerramento = case when p_para in ('Recusada', 'Cancelada') then v_motivo else motivo_encerramento end,
    atualizado_em = now()
  where id = p_id
  returning * into v_atual;

  insert into status_historico (entidade, registro_id, de, para, motivo)
    values ('propostas', p_id, v_de, p_para, v_motivo);
  insert into historico (entidade, registro_id, acao, descricao)
    values ('propostas', p_id, 'Status', coalesce(p_para || ': ' || v_motivo, p_para));

  if p_para = 'Aprovada' then
    update solicitacoes set status = 'Concluida'
     where id = v_atual.solicitacao_id and status not in ('Concluida', 'Cancelada');
  end if;

  return jsonb_build_object('id', v_atual.id, 'status', v_atual.status);
end $$;

-- -----------------------------------------------------------------------------
-- 5. Segurança (RLS)
-- -----------------------------------------------------------------------------
alter table public.equipe           enable row level security;
alter table public.clientes         enable row level security;
alter table public.solicitacoes     enable row level security;
alter table public.propostas        enable row level security;
alter table public.proposta_itens   enable row level security;
alter table public.revisoes         enable row level security;
alter table public.status_historico enable row level security;
alter table public.historico        enable row level security;
alter table public.anexos           enable row level security;

-- equipe: cada um vê a própria linha; membros veem a equipe; só admin altera
drop policy if exists equipe_ler on public.equipe;
create policy equipe_ler on public.equipe for select to authenticated
  using (id = auth.uid() or e_membro());
drop policy if exists equipe_incluir on public.equipe;
create policy equipe_incluir on public.equipe for insert to authenticated with check (e_admin());
drop policy if exists equipe_alterar on public.equipe;
create policy equipe_alterar on public.equipe for update to authenticated using (e_admin()) with check (e_admin());

-- clientes e solicitações: membros leem e gravam; só clientes podem ser excluídos
-- (a exclusão falha se houver solicitação vinculada)
drop policy if exists clientes_ler on public.clientes;
create policy clientes_ler on public.clientes for select to authenticated using (e_membro());
drop policy if exists clientes_incluir on public.clientes;
create policy clientes_incluir on public.clientes for insert to authenticated with check (e_membro());
drop policy if exists clientes_alterar on public.clientes;
create policy clientes_alterar on public.clientes for update to authenticated using (e_membro()) with check (e_membro());
drop policy if exists clientes_excluir on public.clientes;
create policy clientes_excluir on public.clientes for delete to authenticated using (e_membro());

drop policy if exists solicitacoes_ler on public.solicitacoes;
create policy solicitacoes_ler on public.solicitacoes for select to authenticated using (e_membro());
drop policy if exists solicitacoes_incluir on public.solicitacoes;
create policy solicitacoes_incluir on public.solicitacoes for insert to authenticated with check (e_membro());
drop policy if exists solicitacoes_alterar on public.solicitacoes;
create policy solicitacoes_alterar on public.solicitacoes for update to authenticated using (e_membro()) with check (e_membro());

-- propostas e derivados: só leitura direta; escrita apenas pelas funções acima
drop policy if exists propostas_ler on public.propostas;
create policy propostas_ler on public.propostas for select to authenticated using (e_membro());
drop policy if exists itens_ler on public.proposta_itens;
create policy itens_ler on public.proposta_itens for select to authenticated using (e_membro());
drop policy if exists revisoes_ler on public.revisoes;
create policy revisoes_ler on public.revisoes for select to authenticated using (e_membro());
drop policy if exists status_hist_ler on public.status_historico;
create policy status_hist_ler on public.status_historico for select to authenticated using (e_membro());
drop policy if exists historico_ler on public.historico;
create policy historico_ler on public.historico for select to authenticated using (e_membro());

drop policy if exists anexos_ler on public.anexos;
create policy anexos_ler on public.anexos for select to authenticated using (e_membro());
drop policy if exists anexos_incluir on public.anexos;
create policy anexos_incluir on public.anexos for insert to authenticated
  with check (e_membro() and criado_por = auth.uid());
drop policy if exists anexos_excluir on public.anexos;
create policy anexos_excluir on public.anexos for delete to authenticated using (e_membro());

-- visitantes não autenticados não acessam nada
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

revoke all on function public.salvar_proposta(jsonb) from public, anon;
revoke all on function public.mudar_status_proposta(uuid, text, text) from public, anon;
grant execute on function public.salvar_proposta(jsonb) to authenticated;
grant execute on function public.mudar_status_proposta(uuid, text, text) to authenticated;
grant execute on function public.e_membro() to authenticated;
grant execute on function public.e_admin() to authenticated;

-- funções internas (gatilhos e regras auxiliares) não ficam expostas na API
revoke execute on function public.auditar_cliente() from public, anon, authenticated;
revoke execute on function public.auditar_solicitacao() from public, anon, authenticated;
revoke execute on function public.proteger_equipe() from public, anon, authenticated;
revoke execute on function public.solicitacao_status_desde() from public, anon, authenticated;
revoke execute on function public.tocar_atualizado_em() from public, anon, authenticated;
revoke execute on function public.transicao_proposta_valida(text, text) from public, anon;
revoke execute on function public.e_membro() from public, anon;
revoke execute on function public.e_admin() from public, anon;

-- -----------------------------------------------------------------------------
-- 6. Arquivos (Supabase Storage)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('zetta-anexos', 'zetta-anexos', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists zetta_anexos_ler on storage.objects;
create policy zetta_anexos_ler on storage.objects for select to authenticated
  using (bucket_id = 'zetta-anexos' and public.e_membro());
drop policy if exists zetta_anexos_enviar on storage.objects;
create policy zetta_anexos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'zetta-anexos' and public.e_membro());
drop policy if exists zetta_anexos_excluir on storage.objects;
create policy zetta_anexos_excluir on storage.objects for delete to authenticated
  using (bucket_id = 'zetta-anexos' and public.e_membro());
