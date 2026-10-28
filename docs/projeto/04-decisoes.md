# Registro de decisões — Zetta Propostas

> Em 21/10/2026 a Zetta reiniciou a estruturação dos projetos. As escolhas abaixo foram encontradas no código e na documentação; ficam como 🧪 hipótese até José confirmar que foram decisões conscientes.

## D-018 — Endereço e chave pública do Supabase no código (`src/config.js`)
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** O conector da Cloudflare disponível não altera variáveis do Pages, e as variáveis antigas apontavam para o projeto da v1.
- **Decisão:** A URL do projeto e a chave **publicável** ficam em `src/config.js`; variáveis `VITE_ZP_SUPABASE_URL`/`VITE_ZP_SUPABASE_KEY` só servem para trocar de projeto. As antigas `VITE_SUPABASE_*` deixam de ser lidas.
- **Consequências:** o deploy não depende de configurar a Cloudflare; a chave publicável fica visível no repositório (isso é esperado: a proteção está nas regras RLS).
- **Quem decidiu:** Claude, a confirmar com José

## D-017 — Itens guardados por revisão, sem apagar os anteriores
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** O conector do Supabase não aplica comandos com exclusão sem uma confirmação que não chegou à tela de José; a versão anterior de `salvar_proposta` apagava os itens antigos a cada revisão.
- **Decisão:** `proposta_itens` ganhou a coluna `revisao`; cada gravação insere os itens com o número da revisão e a tela mostra os da `revisao_atual`.
- **Consequências:** nenhum dado de item é apagado; o histórico de itens fica também na tabela, além do instantâneo em `revisoes`.
- **Quem decidiu:** Claude, a confirmar com José

> Atualização de 28/10/2026 (v2): José pediu para refazer o app (D-005). As decisões D-006 a D-016 foram tomadas pelo Claude durante a reescrita e estão como 🧪 hipótese até José confirmar uma a uma. D-001 a D-004 foram mantidas na v2.

## D-016 — Modo demonstração com dados fictícios
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** É preciso mostrar o app a prospects e testar telas sem mexer no banco real.
- **Decisão:** Abrir o endereço com `?demo` (ou publicar com `VITE_MODO_DEMO=true`) roda o app com um banco em memória (`src/lib/demo.js`) que segue as mesmas regras do banco real e guarda as alterações só no navegador.
- **Alternativas consideradas:** um segundo projeto Supabase de demonstração.
- **Consequências:** demonstração sem custo e sem risco aos dados reais; os clientes de exemplo são fictícios.
- **Quem decidiu:** Claude, a confirmar com José

## D-015 — Rotas por hash e proposta em página própria
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** Na v1 tudo abria em janelas sobre a mesma tela, sem link para uma proposta.
- **Decisão:** Endereços como `#/propostas/<id>`; cada proposta tem página própria com abas (proposta, documento, revisões, histórico, anexos).
- **Alternativas consideradas:** roteador com URLs sem `#` (exige regra de redirecionamento no Cloudflare).
- **Consequências:** dá para mandar o link de uma proposta para a sócia; funciona no Cloudflare Pages sem configuração extra.
- **Quem decidiu:** Claude, a confirmar com José

## D-014 — Gráficos e ícones próprios, sem recharts e lucide-react
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** A v1 dependia de duas bibliotecas pesadas para dois gráficos e alguns ícones.
- **Decisão:** Gráficos em SVG próprios (`ColunasMes`, `ListaBarras`) e um conjunto de ícones próprio (`Icon.jsx`). Dependências ficam só React e Supabase.
- **Alternativas consideradas:** manter recharts e lucide-react.
- **Consequências:** pacote menor e visual sob controle; gráficos novos precisam ser escritos à mão.
- **Quem decidiu:** Claude, a confirmar com José

## D-013 — Estilo visual "folha sobre moldura" com o laranja da Zetta nos dados
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese (o uso das skills design-taste-frontend e awesome-design foi pedido por José ✅)
- **Contexto:** José pediu um design melhor usando as skills design-taste-frontend e awesome-design.
- **Decisão:** Estilo de app `framed-sheet` (moldura cinza-azulada, trabalho numa folha branca, cor só nos dados) com o par de botões preto/branco e o cartão de assinatura do Airtable no login. Fonte IBM Plex Sans; laranja Zetta escurecido (`#b4500e`) só em dados e na marca.
- **Alternativas consideradas:** estilo `accent-ladder` (tons do laranja nas áreas); manter o visual laranja da v1.
- **Consequências:** visual mais sóbrio e profissional; a cor passa a indicar dado ou estado, não decoração.
- **Quem decidiu:** Claude, a confirmar com José

## D-012 — Quadro por etapa além da tabela de propostas
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** Ideia antiga de Kanban de propostas.
- **Decisão:** A tela de propostas alterna entre Tabela e Quadro (Rascunho, Enviada, Em negociação, Aprovada nos últimos 30 dias), cada cartão com os dias na etapa e a validade. Arrastar cartões não muda o status; a mudança é feita na proposta, com confirmação.
- **Alternativas consideradas:** arrastar para mudar status.
- **Consequências:** visão do funil sem risco de mudar status por engano.
- **Quem decidiu:** Claude, a confirmar com José

## D-011 — Responsável da solicitação é um integrante da equipe
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** P-06 — na v1 era texto livre.
- **Decisão:** Coluna `responsavel_id` ligada à tabela `equipe`.
- **Consequências:** permite filtrar e medir por responsável no futuro.
- **Quem decidiu:** Claude, a confirmar com José

## D-010 — Solicitação muda de status sozinha com a proposta
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** P-05 — na v1 a solicitação ficava parada no status em que foi aberta.
- **Decisão:** Criar a primeira proposta leva a solicitação de Aberta/Em análise para **Em proposta**; aprovar a proposta leva a solicitação para **Concluída**. Recusa e cancelamento da proposta não mexem na solicitação.
- **Alternativas consideradas:** manter tudo manual.
- **Consequências:** o painel de solicitações ativas reflete o funil sem trabalho extra.
- **Quem decidiu:** Claude, a confirmar com José

## D-009 — Histórico de status para medir o tempo em cada etapa
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** Ideia antiga de "tempo em cada status" no dashboard.
- **Decisão:** Tabela `status_historico` grava cada mudança de status (de, para, motivo, quando, quem). A proposta mostra a linha das etapas com a duração de cada uma; a visão geral mostra a mediana de dias por etapa.
- **Consequências:** base para relatórios de ciclo de venda.
- **Quem decidiu:** Claude, a confirmar com José

## D-008 — Recusa e cancelamento exigem motivo
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** R-04 — a v1 prometia motivo de cancelamento na proposta e não tinha o campo.
- **Decisão:** `mudar_status_proposta` recusa Recusada/Cancelada sem motivo; o motivo aparece no relatório "Por que não fechou".
- **Quem decidiu:** Claude, a confirmar com José

## D-007 — Transições de status validadas no banco
- **Data:** 28/10/2026
- **Status:** 🧪 hipótese
- **Contexto:** R-03 — na v1 qualquer status podia virar qualquer outro.
- **Decisão:** Rascunho → Enviada/Cancelada; Enviada → Em negociação/Aprovada/Recusada/Cancelada; Em negociação → Enviada/Aprovada/Recusada/Cancelada. Aprovada, Recusada e Cancelada são finais e a proposta deixa de ser editável. Regra em `transicao_proposta_valida()` (banco) e espelhada em `business.js` (tela).
- **Alternativas consideradas:** permitir que administrador reabra propostas encerradas.
- **Consequências:** métricas de conversão confiáveis; reabrir exige criar nova proposta.
- **Quem decidiu:** Claude, a confirmar com José

## D-006 — Banco recriado do zero num projeto Supabase novo
- **Data:** 28/10/2026
- **Status:** ✅ decidido (José escolheu o projeto novo em 28/10/2026; projeto `zetta-propostas`, ref `vbpktfmngjirwasawktx`, região São Paulo)
- **Contexto:** R-01 — o SQL da v1 não estava no repositório, então não se sabe o formato exato do banco atual.
- **Decisão:** Novo `supabase/01_estrutura.sql`, testado num Postgres local (`supabase/testes/`), para rodar num projeto Supabase novo; os clientes da v1 entram por importação de CSV.
- **Alternativas consideradas:** migrar o banco da v1 no lugar (arriscado sem conhecer a estrutura).
- **Consequências:** estrutura conhecida e versionada; é preciso recriar os logins e importar os dados antigos.
- **Quem decidiu:** José, a partir da proposta do Claude. O projeto da v1 (`tyebgtevfidncbylkqoe`) estava vazio e continua pausado, intocado.

## D-005 — Refazer o app como versão 2
- **Data:** 28/10/2026
- **Status:** ✅ decidido
- **Contexto:** A v1 estava sem a camada de dados no repositório e com design a melhorar.
- **Decisão:** Reescrever o app inteiro (banco, regras, telas e design) mantendo React + Supabase + Cloudflare Pages.
- **Quem decidiu:** José

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
