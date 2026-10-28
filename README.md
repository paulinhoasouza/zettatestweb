# Zetta Propostas — gestão comercial (v2)

App web da Zetta para acompanhar o funil comercial: clientes, solicitações, propostas com itens e revisões, mudanças de status com motivo, o tempo de cada etapa, relatórios e anexos. React + Vite no Cloudflare Pages, Supabase (Postgres, login, API e arquivos) como backend.

**Ver sem configurar nada:** abra o site com `?demo` no fim do endereço. O app roda com clientes fictícios guardados só no seu navegador.

## O que tem

- **Visão geral** — o que precisa de ação hoje (validade vencendo, propostas sem resposta, rascunhos parados, prazos vencidos), valor com o cliente, aprovado no mês, conversão em 90 dias e o funil com os dias em cada etapa.
- **Propostas** — tabela ou quadro por etapa; cada proposta tem página própria com editor de itens, documento para imprimir em PDF, revisões, histórico e anexos.
- **Status com regra** — Rascunho → Enviada → Em negociação → Aprovada / Recusada / Cancelada. Transições inválidas são recusadas pelo banco; recusa e cancelamento exigem motivo; aprovar conclui a solicitação.
- **Solicitações** e **clientes** em gavetas laterais, com responsável da equipe, prazo, anexos e histórico.
- **Relatórios** por período, com exportação CSV.
- **Equipe e acessos** — só quem está ativo na tabela `equipe` entra; só administrador gerencia.

## Estrutura

```
├── index.html, vite.config.js, package.json
├── public/favicon.svg
├── src/
│   ├── main.jsx, App.jsx, styles.css
│   ├── lib/        api.js · supabase.js · demo.js · business.js · format.js · rota.js
│   ├── components/ Icon.jsx · ui.jsx · Anexos.jsx · Linha.jsx
│   └── pages/      VisaoGeral · Propostas · PropostaDetalhe · Solicitacoes · Clientes · Relatorios · Equipe · Login
├── supabase/
│   ├── 01_estrutura.sql      banco completo: tabelas, RLS, funções, gatilhos, bucket de anexos
│   ├── 02_admin_inicial.sql  primeiro administrador
│   └── testes/               stub do Supabase + testes de comportamento (Postgres local)
├── tests/business.test.js    testes das regras (npm test)
└── docs/projeto/             dossiê do projeto: decisões, arquitetura com fluxogramas, pendências
```

A arquitetura completa, com os fluxogramas de status, o modelo de dados e a sequência de cada gravação, está em [docs/projeto/03-arquitetura.md](docs/projeto/03-arquitetura.md).

## Publicar

Siga o [GUIA-PUBLICACAO.md](GUIA-PUBLICACAO.md) (tudo pelo navegador) e depois o checklist [TESTES.md](TESTES.md).

## Rodar no computador (opcional)

Node.js 20 ou superior.

```bash
cp .env.example .env    # preencha a URL e a chave PÚBLICA do Supabase
npm install
npm run dev             # http://localhost:5173  (ou http://localhost:5173/?demo)
npm test                # testes das regras de negócio
```

Testes do banco (precisa de PostgreSQL local; não rode no Supabase de produção):

```bash
createdb zt_teste
psql -d zt_teste -f supabase/testes/stub_supabase.sql
psql -d zt_teste -f supabase/01_estrutura.sql
psql -d zt_teste -f supabase/testes/testes_banco.sql   # termina com "TODOS OS TESTES DO BANCO PASSARAM"
```

## Segurança

- O endereço e a chave **publicável** do Supabase ficam em `src/config.js` — eles são públicos por natureza (vão para o navegador). Nunca coloque ali `service_role`, `sb_secret_...` ou a senha do banco.
- Propostas só são gravadas pelas funções `salvar_proposta` e `mudar_status_proposta`; as tabelas não aceitam escrita direta.
- Desative o cadastro público em Supabase → Authentication → Sign In / Providers ("Allow new users to sign up").
- Não suba dados de clientes reais para o GitHub. Prefira repositório **privado**.
- Supabase Free não faz backup diário e pausa após 7 dias sem uso: exporte os dados periodicamente.

© Zetta. Uso interno.
