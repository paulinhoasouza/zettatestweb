# Solução — Zetta Propostas

## Visão
Um único lugar para o funil comercial da Zetta: cada demanda vira solicitação, cada solicitação pode gerar propostas, e cada alteração de proposta fica registrada como revisão.

## Escopo
| Módulo / funcionalidade | Status | Prioridade | Observação |
|---|---|---|---|
| Login por e-mail e senha (Supabase Auth), sem cadastro público | 📌 observado | MVP | `Login` em App.jsx |
| Liberação de acesso pela tabela `equipe` (ativo, admin/comercial) | 📌 observado | MVP | usuário criado no painel do Supabase, depois aprovado pelo UUID |
| Clientes: cadastrar, buscar, editar, excluir sem solicitações | 📌 observado | MVP | bloqueio de exclusão depende do banco |
| Solicitações: prioridade, responsável, prazo, status, motivo de cancelamento | 📌 observado | MVP | prazo vencido aparece em vermelho |
| Propostas: itens, desconto, validade, condições de pagamento, status | 📌 observado | MVP | número `ZP-00001` gerado no banco |
| Revisão automática a cada gravação de proposta | 📌 observado | MVP | aba "Revisões" mostra snapshot |
| PDF pela impressão do navegador | 📌 observado | MVP | sem envio automático |
| Anexos privados até 10 MB em solicitações e propostas | 📌 observado | MVP | bucket `zetta-anexos` (README) |
| Histórico (auditoria) por registro | 📌 observado | MVP | aba "Histórico"; gerado no banco |
| Visão geral: pipeline, valor aprovado, conversão, funil | 📌 observado | MVP | |
| Relatórios por período + CSV | 📌 observado | MVP | CSV protegido contra injeção de fórmula |
| Motivo de cancelamento **da proposta** | 📌 observado como ausente | MVP | README promete, formulário não tem (R-04) |
| Kanban de propostas | 🧪 hipótese | futuro | ideia de versões anteriores; hoje é tabela |
| Tempo em cada status no dashboard | 🧪 hipótese | futuro | ideia de versões anteriores; exige histórico de status |
| Redesign visual | 💡 ideia | próximo | José: "falta ter um design melhor" |

## Fora do escopo (v1, segundo o README)
- Assinatura eletrônica, nota fiscal, envio automático por e-mail/WhatsApp.
- Cadastro de usuários dentro do app (feito no painel do Supabase).
- Trilha de auditoria certificada.

## Ferramentas e stack
| Camada | Ferramenta | Status | Motivo |
|---|---|---|---|
| Front-end | React 18 + Vite 6 | 📌 observado | `package.json` |
| Ícones / gráficos | lucide-react, recharts | 📌 observado | |
| Banco, Auth, API, arquivos | Supabase (Postgres, PostgREST, Auth, Storage) | 📌 observado | sem servidor próprio para manter |
| Regras críticas | Função Postgres `salvar_proposta` (RPC) | 📌 observado no README | código SQL ausente do repo |
| Hospedagem | Cloudflare Pages (build `npm run build`, saída `dist`) | 📌 observado | |
| Versionamento | GitHub | 📌 observado | |
| Testes | `node --test` em `tests/business.test.js` | 📌 observado no README | arquivo ausente do repo |

## Modelo comercial
_A definir._ Houve pergunta anterior sobre quanto cobrar pelo app; não há preço registrado (P-03).
