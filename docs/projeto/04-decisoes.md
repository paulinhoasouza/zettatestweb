# Registro de decisões — Zetta Propostas

> Em 21/10/2026 a Zetta reiniciou a estruturação dos projetos. As escolhas abaixo foram encontradas no código e na documentação; ficam como 🧪 hipótese até José confirmar que foram decisões conscientes.

> Atualização de 03/11/2026 (v4): José pediu o visual no estilo Apple, um relatório com mais informações e gráficos interativos, e duas abas novas (Pessoas e Fechamentos). O pedido de cada item está marcado como ✅; as escolhas de detalhe feitas pelo Claude ficam como 🧪 até José confirmar.

## D-025 — Ler as planilhas no navegador com fflate e um leitor próprio
- **Data:** 03/11/2026
- **Status:** 🧪 hipótese
- **Contexto:** Para conferir o fechamento sem baixar o arquivo, a tela precisa abrir a planilha. As bibliotecas conhecidas têm problemas: a versão do SheetJS publicada no npm (0.18.5) tem falhas de segurança conhecidas e a corrigida só é distribuída fora do npm; o exceljs pesa perto de 1 MB.
- **Decisão:** Leitor próprio de `.xlsx`/`.xlsm` (o arquivo é um ZIP com XML: textos compartilhados, estilos de data e moeda, fórmulas, abas ocultas) e de `.csv` (separador `;` e acentos do Windows-1252), em `src/lib/planilha.js`. A única dependência nova é o `fflate` 0.8.3 (descompactar ZIP, poucos KB, sem falhas conhecidas), carregado só quando alguém abre uma prévia. `.xls` antigo e `.ods` ficam só para baixar.
- **Alternativas consideradas:** SheetJS (segurança e distribuição), exceljs (tamanho), não ter prévia (a conferência exigiria baixar cada arquivo).
- **Consequências:** prévia de até 300 linhas e 40 colunas por aba; a demonstração gera planilhas `.xlsx` de verdade para abrir no Excel. Testes em `tests/v4.test.js`.
- **Quem decidiu:** Claude, a confirmar com José

## D-024 — Perfil "Operacional" e acesso por área
- **Data:** 03/11/2026
- **Status:** 🧪 hipótese
- **Contexto:** O fechamento diário é feito por um funcionário. Com os perfis antigos ele precisaria ser "Comercial" e veria clientes e propostas. As fichas das pessoas têm dados de saúde (ASO), protegidos pela LGPD.
- **Decisão:** Novo perfil **Operacional**, que só vê e envia fechamentos. No banco, `e_membro()` passa a significar "administrador ou comercial" (as políticas antigas continuam iguais e não se abrem para o operacional), `e_da_equipe()` vale para qualquer integrante ativo e `pode_acessar(entidade)` decide quem lê histórico, anexos e arquivos (a pasta no Storage tem o nome da entidade). Pessoas: só administrador. Fechamentos: toda a equipe vê e envia; só administrador confere, aponta divergência, marca dia sem expediente e muda os ajustes.
- **Alternativas consideradas:** usar o perfil Comercial para quem fecha o caixa; abrir Pessoas para o Comercial.
- **Consequências:** a tela esconde o que o perfil não acessa e o banco garante (testes em `supabase/testes/testes_04.sql`). Na demonstração, o seletor "Ver como" troca entre José (admin), Marina (comercial) e Rafael (operacional).
- **Quem decidiu:** Claude, a confirmar com José

## D-023 — Fechamento diário: uma planilha por dia, conferida pelo administrador
- **Data:** 03/11/2026
- **Status:** ✅ decidido (José pediu a aba: "todo dia um funcionário irá fazer o fechamento em Excel e anexar em uma parte do app") · fluxo e regras 🧪
- **Contexto:** O fechamento é feito em Excel e precisa ficar guardado e controlado: saber que dia faltou, quem enviou, se foi no prazo e se alguém conferiu.
- **Decisão:** Tabela `fechamentos` com um registro por dia e status **Enviado → Conferido** ou **Divergente** (com nota; a equipe reenvia a planilha corrigida e o dia volta a Enviado), além de **Sem expediente** (feriado, loja fechada, com motivo). A planilha sobe para o Storage e a função `registrar_fechamento` grava o fechamento e o anexo juntos; cada reenvio guarda uma versão nova. A pontualidade conta o **primeiro** envio. `fechamento_ajustes` define os dias com fechamento (padrão segunda a sábado), o horário limite (padrão 20h, no mesmo dia ou no seguinte) e a data de início do controle. O total do dia é opcional e digitado no envio (não é lido da planilha). Tela com o cartão de hoje (arrastar e soltar a planilha, conferir a prévia antes de enviar), resumo de 30 dias ou do mês, calendário com a situação de cada dia, total por dia e últimos envios; cada dia abre uma gaveta com as versões da planilha, a prévia, a conferência e o histórico.
- **Alternativas consideradas:** vários fechamentos por dia (por caixa ou loja); ler o total automaticamente da planilha; aceitar qualquer arquivo.
- **Consequências:** migração `supabase/04_pessoas_fechamentos.sql`; relatório de fechamentos (cobertura, pontualidade, total, horário típico, quem enviou). Uma planilha por dia por empresa: se houver mais de um caixa ou loja, o modelo muda (P-14).
- **Quem decidiu:** José (a aba) e Claude (o fluxo), a confirmar com José

## D-022 — Pessoas: funcionários, treinamentos e documentos com validade
- **Data:** 03/11/2026
- **Status:** ✅ decidido (José pediu a aba para ver funcionários, treinamentos, documentação e data de vencimento) · modelo 🧪
- **Contexto:** Treinamentos (NRs, brigada, primeiros socorros) e documentos (ASO, CNH, contrato de experiência) vencem, e hoje não há um lugar que avise antes.
- **Decisão:** Tabelas `funcionarios` (situação Ativo, Afastado ou Desligado), `treinamentos` (feito em, validade, carga horária, instituição) e `documentos` (emissão, validade, número). Renovar é registrar de novo: vale o registro mais recente de cada pessoa + nome, e os anteriores ficam em "Histórico de renovações". Um item pede atenção 30 dias antes de vencer. A tela mostra os funcionários em cartões com a situação de cada um e uma visão de vencimentos (vencidos, até 30 dias, 31 a 90 dias, depois, sem validade), com renovação em um clique. Certificados e cópias ficam como anexos do próprio registro. Sugestões de validade (NR-35 e NR-10: 24 meses; NR-33, brigada de incêndio e ASO periódico: 12 meses) aparecem só como ponto de partida, para a pessoa conferir. Quem tem registros não é excluído: muda para Desligado e sai dos vencimentos.
- **Alternativas consideradas:** uma tabela única de "itens com validade"; validade obrigatória.
- **Consequências:** só administrador acessa (D-024); a busca global também encontra pessoas; visão geral e menu mostram os vencidos.
- **Quem decidiu:** José (a aba) e Claude (o modelo), a confirmar com José

## D-021 — Relatórios com três assuntos e gráficos interativos
- **Data:** 03/11/2026
- **Status:** ✅ decidido (José pediu a página de relatório com mais informações, gráficos interativos e animações) · composição 🧪
- **Contexto:** O relatório da v3 tinha quatro números, um gráfico de colunas e duas listas.
- **Decisão:** Relatórios com seletor **Comercial · Pessoas · Fechamentos** e período (este mês, 3 meses, 12 meses ou datas). Comercial: seis indicadores com variação contra o período anterior e tendência de 12 meses (valor aprovado, conversão, ticket médio, ciclo de venda, valor cotado, valor que não fechou), evolução por semana ou por mês (valor ou quantidade), funil de conversão, desfecho das decididas, tempo em cada etapa, desempenho por responsável, clientes que mais aprovaram, por que não fechou e mapa de atividade por dia. Pessoas e Fechamentos com seus próprios indicadores e gráficos. Todos os gráficos animam ao aparecer e ao mudar o período, mostram uma dica ao passar o mouse ou com as setas do teclado e têm uma vista em tabela. Seguem a skill de visualização de dados: paleta validada pelo script dela, uma escala só por gráfico, barra segmentada no lugar de rosca, cor de status só com ícone e rótulo. Exportação CSV de cada assunto.
- **Alternativas consideradas:** biblioteca de gráficos (recharts); rosca para o desfecho.
- **Consequências:** D-014 continua valendo (gráficos em SVG próprio, em `src/components/graficos.jsx`); regras das métricas em `business.js`, com testes.
- **Quem decidiu:** José (o pedido) e Claude (a composição), a confirmar com José

## D-020 — Visual v4 no estilo Apple, com a marca ZettaMinds
- **Data:** 03/11/2026
- **Status:** ✅ decidido (José pediu "design estilo da Apple, com transparência, animações suaves, elegante") · detalhes 🧪
- **Contexto:** A v3 (D-019) usava o gradiente da marca em áreas grandes, painéis brancos opacos e a fonte Plus Jakarta Sans.
- **Decisão:** Materiais de vidro translúcido (desfoque com saturação) na lateral, na barra superior fixa, nos cartões, gavetas, diálogos e avisos, sobre um "papel de parede" com o brilho das cores da marca. Fonte do sistema (SF Pro nos aparelhos Apple; Inter nos outros), títulos grandes com espaçamento apertado, uma cor de destaque só para tudo que é clicável (o azul da marca, `#1c4feb`), botões em cápsula que encolhem ao toque, controles segmentados com indicador deslizante, interruptores no estilo iOS, gavetas que entram com efeito de mola (e viram "sheet" de baixo no celular), números que contam ao aparecer e transição suave entre telas. Aparência **automática, clara ou escura** (botão no topo; automática segue o sistema). O gradiente azul → roxo → vermelho fica só para a marca: logo, primeiro indicador, total da proposta e barra do documento. Tudo respeita "reduzir movimento" e "reduzir transparência" do sistema.
- **Alternativas consideradas:** copiar a linguagem do site da Apple ao pé da letra (azul da Apple, sem gradiente nenhum), descartado para manter a identidade ZettaMinds; manter a v3.
- **Consequências:** substitui o visual de D-019 (as cores e a logo continuam); `styles.css` reescrito com tokens para claro e escuro; saem Plus Jakarta Sans e IBM Plex Mono. O documento da proposta e o PDF continuam em papel branco.
- **Quem decidiu:** José (o estilo) e Claude (os detalhes)

## D-019 — Visual v3: identidade ZettaMinds com gradiente azul → roxo → vermelho
- **Data:** 29/10/2026
- **Status:** ✅ decidido (José pediu o visual a partir de uma referência de dashboard, com as cores em gradiente do botão e da logo ZettaMinds)
- **Contexto:** José trouxe uma referência de painel de gestão (cartões arredondados, primeiro indicador em destaque, barras em cápsula, lista com ícones coloridos) e pediu as cores azul, roxo e vermelho em degradê e a logo correta da ZettaMinds.
- **Decisão:** Gradiente da marca (`#1c4feb → #6a2ad0 → #e8234f`, tirado da logo e do botão enviado) no botão principal, no primeiro indicador, nas barras do gráfico, no total da proposta e nos destaques; painéis brancos arredondados (22px) sobre fundo `#f3f4f9`; botões em cápsula; fonte Plus Jakarta Sans; logo ZettaMinds (versões normal e com "Zetta" em branco, recortadas da imagem original) na lateral, no login e no documento da proposta. A visão geral passa a ter: 4 indicadores em cartões, "Movimento da semana" em barras-cápsula (dias futuros listrados), "Próxima ação", lista de propostas com ícones por cliente, "Precisa de ação" e funil.
- **Alternativas consideradas:** manter o estilo sóbrio da v2 (D-013); seletor de cor de destaque (fica como ideia).
- **Consequências:** o visual vira identidade da marca; usa gradientes e cores em áreas grandes, que o estilo da v2 evitava de propósito. Regras, dados e banco não mudam.
- **Quem decidiu:** José

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
- **Status:** 🧪 hipótese · mantida na v4 (D-021): os gráficos interativos continuam em SVG próprio; a única dependência nova é o fflate (D-025)
- **Contexto:** A v1 dependia de duas bibliotecas pesadas para dois gráficos e alguns ícones.
- **Decisão:** Gráficos em SVG próprios (`ColunasMes`, `ListaBarras`) e um conjunto de ícones próprio (`Icon.jsx`). Dependências ficam só React e Supabase.
- **Alternativas consideradas:** manter recharts e lucide-react.
- **Consequências:** pacote menor e visual sob controle; gráficos novos precisam ser escritos à mão.
- **Quem decidiu:** Claude, a confirmar com José

## D-013 — Estilo visual "folha sobre moldura" com o laranja da Zetta nos dados
- **Data:** 28/10/2026
- **Status:** substituída por D-019 (29/10/2026) (o uso das skills design-taste-frontend e awesome-design foi pedido por José ✅)
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
