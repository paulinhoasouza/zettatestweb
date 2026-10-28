# Registro de decisões — Zetta Propostas

> Em 21/10/2026 a Zetta reiniciou a estruturação dos projetos. As escolhas abaixo foram encontradas no código e na documentação; ficam como 🧪 hipótese até José confirmar que foram decisões conscientes.

## D-004 — Gerar PDF pela impressão do navegador
- **Data:** 28/10/2026 (registro da situação encontrada)
- **Status:** 🧪 hipótese
- **Contexto:** A proposta precisa virar documento para o cliente.
- **Decisão:** `window.print()` sobre uma visualização formatada; o usuário escolhe "Salvar como PDF".
- **Alternativas consideradas:** geração no servidor (Edge Function), biblioteca de PDF no front.
- **Consequências:** custo zero e simples; o resultado depende do navegador, e não há envio automático.
- **Quem decidiu:** a confirmar

## D-003 — Versionar propostas com snapshot a cada gravação
- **Data:** 28/10/2026 (registro da situação encontrada)
- **Status:** 🧪 hipótese
- **Contexto:** Propostas mudam durante a negociação e é preciso saber o que foi enviado em cada momento.
- **Decisão:** A função `salvar_proposta` grava uma linha em `revisoes` com cópia dos dados e dos itens a cada salvamento.
- **Alternativas consideradas:** revisão só quando o status muda para Enviada.
- **Consequências:** histórico completo; muitas revisões quando se salva rascunho várias vezes.
- **Quem decidiu:** a confirmar

## D-002 — Regras críticas de proposta numa função transacional do Postgres
- **Data:** 28/10/2026 (registro da situação encontrada)
- **Status:** 🧪 hipótese
- **Contexto:** Proposta, itens e revisão precisam ser gravados juntos ou nenhum.
- **Decisão:** Criação e edição de propostas só pela RPC `salvar_proposta`.
- **Alternativas consideradas:** várias chamadas separadas pelo front.
- **Consequências:** consistência garantida no banco; a lógica fica no SQL, que hoje **não está no repositório** (R-01).
- **Quem decidiu:** a confirmar

## D-001 — Backend no Supabase, sem servidor próprio, front no Cloudflare Pages
- **Data:** 28/10/2026 (registro da situação encontrada)
- **Status:** 🧪 hipótese
- **Contexto:** Substituir a versão em Streamlit com custo zero e sem máquina para manter ligada.
- **Decisão:** React estático no Cloudflare Pages falando direto com Supabase (Auth, PostgREST, Storage, RLS).
- **Alternativas consideradas:** Streamlit (versão anterior); servidor Express/FastAPI (descartado no README por complexidade).
- **Consequências:** hospedagem gratuita; segurança depende inteiramente das políticas RLS; Supabase Free pode pausar e não tem backup diário.
- **Quem decidiu:** a confirmar
