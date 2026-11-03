# Solução — Zetta Propostas

## Visão
Um único lugar para o funil comercial da Zetta: cada demanda vira solicitação, cada solicitação pode gerar propostas, e cada alteração de proposta fica registrada como revisão.

## Escopo (v2, 28/10/2026; v4, 03/11/2026)
| Módulo / funcionalidade | Status | Prioridade | Observação |
|---|---|---|---|
| Login por e-mail e senha, acesso só para quem está ativo na equipe | 🧪 hipótese | MVP | mantido da v1 |
| Visão geral: "precisa de ação", com o cliente, aprovado no mês, conversão em 90 dias, funil com dias na etapa | 🧪 hipótese | MVP | nova na v2 |
| Propostas em tabela e em quadro por etapa | 🧪 hipótese | MVP | D-012 |
| Proposta em página própria: editor de itens, documento/PDF, revisões, histórico, anexos | 🧪 hipótese | MVP | D-015 |
| Linha das etapas com o tempo em cada uma | 🧪 hipótese | MVP | D-009 |
| Mudança de status com confirmação e motivo na recusa/cancelamento | 🧪 hipótese | MVP | D-007, D-008 |
| Solicitações com responsável da equipe, prazo, anexos e histórico | 🧪 hipótese | MVP | D-010, D-011 |
| Clientes com solicitações ativas e valor aprovado | 🧪 hipótese | MVP | |
| Relatórios por período: aprovado por mês, clientes que mais aprovaram, por que não fechou, CSV | 🧪 hipótese | MVP | |
| Equipe e acessos (admin) | 🧪 hipótese | MVP | |
| Busca global por proposta, número ou cliente | 🧪 hipótese | MVP | |
| Modo demonstração com dados fictícios (`?demo`) | 🧪 hipótese | MVP | D-016 |
| Visual estilo Apple: vidro translúcido, movimento suave, aparência clara/escura | ✅ decidido (detalhes 🧪) | v4 | D-020 |
| Relatórios Comercial, Pessoas e Fechamentos com gráficos interativos e animados | ✅ decidido (composição 🧪) | v4 | D-021 |
| Pessoas: funcionários, treinamentos, documentos e vencimentos, com renovação e anexos | ✅ decidido (modelo 🧪) | v4 | D-022 |
| Fechamentos: planilha do dia, calendário, prazo, conferência, divergência e prévia | ✅ decidido (fluxo 🧪) | v4 | D-023 |
| Perfil Operacional (só fechamentos) e acesso por área | 🧪 hipótese | v4 | D-024 |
| Operação na visão geral: fechamento de hoje, dias sem fechamento, vencidos | 🧪 hipótese | v4 | |
| Envio da proposta por e-mail/WhatsApp | 💡 ideia | futuro | |

## Fora do escopo (v1, segundo o README)
- Assinatura eletrônica, nota fiscal, envio automático por e-mail/WhatsApp.
- Cadastro de usuários dentro do app (feito no painel do Supabase).
- Trilha de auditoria certificada.

## Ferramentas e stack
| Camada | Ferramenta | Status | Motivo |
|---|---|---|---|
| Front-end | React 18 + Vite 6 | 📌 observado | mantido na v2 |
| Estilo | Estilo Apple (awesome-design) com a marca ZettaMinds; fonte do sistema (SF Pro) e Inter | ✅ decidido · detalhes 🧪 | D-020 (substitui D-013 e o visual de D-019) |
| Ícones / gráficos | próprios, em SVG; gráficos interativos no padrão da skill de visualização de dados | 🧪 hipótese | D-014, D-021 |
| Leitura de planilhas | leitor próprio + fflate 0.8.3 (sob demanda) | 🧪 hipótese | D-025 |
| Banco, Auth, API, arquivos | Supabase (Postgres, PostgREST, Auth, Storage) | 📌 observado | sem servidor próprio para manter |
| Regras críticas | Funções `salvar_proposta` e `mudar_status_proposta` | 🧪 hipótese | `supabase/01_estrutura.sql` (v2) |
| Hospedagem | Cloudflare Pages (build `npm run build`, saída `dist`) | 📌 observado | |
| Versionamento | GitHub | 📌 observado | |
| Testes | `npm test` (regras) e `supabase/testes/` (banco) | 🧪 hipótese | v2 |

## Modelo comercial
_A definir._ Houve pergunta anterior sobre quanto cobrar pelo app; não há preço registrado (P-03).
