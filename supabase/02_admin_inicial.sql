-- =============================================================================
-- Zetta Propostas v2 — primeiro administrador
--
-- 1. Crie o usuário em Supabase > Authentication > Users > Add user.
-- 2. Troque o e-mail e o nome abaixo e execute no SQL Editor.
-- =============================================================================

insert into public.equipe (id, nome, email, perfil, ativo)
select u.id, 'SEU NOME AQUI', u.email, 'admin', true
from auth.users u
where lower(u.email) = lower('COLOQUE_SEU_EMAIL_AQUI')
on conflict (id) do update set perfil = 'admin', ativo = true;

-- Confira: deve aparecer uma linha com perfil admin.
select id, nome, email, perfil, ativo from public.equipe;
