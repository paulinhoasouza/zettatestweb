# Guia de publicação — Zetta Propostas v2

Tudo pelo navegador, sem instalar nada. Tempo estimado: 30 a 40 minutos.

## Situação em 28/10/2026

O banco já está pronto: o Claude criou o projeto Supabase **zetta-propostas** (ref `vbpktfmngjirwasawktx`, São Paulo), instalou `01_estrutura.sql` e o gatilho do primeiro administrador (`03_primeiro_admin.sql`) e testou as regras direto no projeto. O endereço e a chave pública já estão em `src/config.js`, então **não é preciso cadastrar variáveis na Cloudflare**. O projeto antigo (`paulinhoasouza's Project`) estava vazio e continua pausado.

Faltam três coisas:

## Passo 1 — Criar o seu login (2 minutos)

1. Abra https://supabase.com/dashboard/project/vbpktfmngjirwasawktx/auth/users
2. **Add user → Create new user**, use `josepauloalcantara2002@gmail.com` (ou `paulinhoalcantara44@gmail.com`), escolha uma senha e marque **Auto Confirm User**.
3. Pronto: ao ser confirmado, esse login vira administrador automaticamente.

## Passo 2 — Desligar o cadastro público

Em https://supabase.com/dashboard/project/vbpktfmngjirwasawktx/auth/providers, desligue **Allow new users to sign up**. Os outros acessos você libera pela tela **Equipe e acessos** do app.

## Passo 3 — Subir o código para o GitHub

O problema da v1 foi exatamente aqui: o upload pelo navegador perdeu as subpastas `src/lib`, `supabase` e `tests`. Por isso:

1. Descompacte o ZIP. Você verá a pasta `zetta-propostas` com `src`, `supabase`, `tests`, `docs`, `public` e os arquivos soltos.
2. No repositório `zettatestweb`, clique em **Add file → Upload files** e **arraste o conteúdo da pasta** (não o ZIP, não a pasta de fora). Os arquivos da v1 com o mesmo nome serão substituídos.
3. Escreva a mensagem "Zetta Propostas v2" e clique em **Commit changes**.
4. **Confira** no GitHub que existem: `src/lib/api.js`, `src/pages/PropostaDetalhe.jsx`, `supabase/01_estrutura.sql`, `tests/business.test.js` e `docs/projeto/README.md`. Se faltar alguma pasta, envie-a de novo arrastando a pasta em si.
5. Apague do repositório o único arquivo da v1 que a v2 não usa mais: `src/style.css` (a v2 usa `src/styles.css`). Os demais são substituídos pelo upload.
6. Recomendado: **Settings → General → Danger Zone → Change visibility → Private**.

Alternativa mais segura que o arraste: o **GitHub Desktop** envia a pasta inteira com as subpastas.

## Passo 4 — Publicar no Cloudflare Pages

Se o projeto Pages da v1 já publica a partir do repositório, o push da v2 já dispara o deploy; nada mais a fazer. Se não:

1. Em https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**, escolha o repositório.
2. **Framework preset:** Vite (ou None). **Build command:** `npm run build`. **Build output directory:** `dist`.
3. A versão do Node vem do arquivo `.node-version` (22).
4. Nenhuma variável é necessária (o Supabase está em `src/config.js`). Se existirem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` da v1, podem ser apagadas: a v2 não as lê.
5. **Save and Deploy**. Ao terminar, abra o endereço `*.pages.dev`, entre com o login do passo 1 e siga o [TESTES.md](TESTES.md).

## Liberar acesso para outra pessoa

1. Supabase → **Authentication → Users → Add user** (com Auto Confirm).
2. Copie o **UID** do usuário criado.
3. No app → **Equipe e acessos → Liberar acesso**, cole o UID, informe nome, e-mail e perfil.

## Demonstração para prospects

- Qualquer endereço do app com `?demo` no fim abre a demonstração com dados fictícios, sem tocar no banco.
- Para um site só de demonstração, crie um segundo projeto no Cloudflare Pages com a variável `VITE_MODO_DEMO=true` (sem as do Supabase).

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Tela "Conecte o Supabase" | `src/config.js` sem URL ou chave. |
| Build falha com "Could not resolve ./lib/..." | Subpastas não subiram no GitHub (passo 3.4). |
| "Acesso ainda não liberado" | O login não usa um dos dois e-mails do passo 1, não foi confirmado, ou o integrante está inativo. |
| "Seu usuário não tem permissão para esta ação" | Ação reservada a administrador, ou o SQL não foi executado no mesmo projeto da URL configurada. |
| Erro ao anexar arquivo | O passo 2.2 não terminou (bucket `zetta-anexos` e políticas) ou o arquivo passa de 10 MB. |
| Site lento no primeiro acesso do dia | Supabase Free pausado por inatividade; abra o painel do Supabase e reative. |
