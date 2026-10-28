-- =============================================================================
-- Zetta Propostas v2 — primeiro administrador automático (já aplicado no projeto
-- zetta-propostas em 28/10/2026). Alternativa ao 02_admin_inicial.sql:
-- quando um dos e-mails abaixo tiver o login CONFIRMADO e ainda não houver
-- administrador, ele entra na equipe como admin.
-- =============================================================================
create or replace function public.primeiro_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null
     and lower(new.email) in ('josepauloalcantara2002@gmail.com', 'paulinhoalcantara44@gmail.com')
     and not exists (select 1 from public.equipe where perfil = 'admin') then
    insert into public.equipe (id, nome, email, perfil, ativo)
    values (new.id, 'José Paulo Alcântara', new.email, 'admin', true)
    on conflict (id) do update set perfil = 'admin', ativo = true;
  end if;
  return new;
end $$;
revoke execute on function public.primeiro_admin() from public, anon, authenticated;

drop trigger if exists zetta_primeiro_admin on auth.users;
create trigger zetta_primeiro_admin
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.primeiro_admin();
