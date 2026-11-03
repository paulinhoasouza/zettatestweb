# Ideias e pendências — Zetta Propostas

## Riscos e divergências
| # | Risco / divergência | Impacto | Ação sugerida |
|---|---|---|---|
| R-02 | Repositório `zettatestweb` está **público**; o guia manda criar privado (`zetta-propostas-web`) | Qualquer pessoa lê o código e, quando o SQL subir, as regras de segurança | Tornar privado antes de subir `supabase/` (P-01) |
| R-06 | O app carrega todas as tabelas e recarrega tudo após cada gravação (v1 e v2) | Lentidão com volume maior | Aceitável na v1; paginar quando passar de algumas centenas de propostas |
| R-08 | Supabase Free pausa após 7 dias sem uso e não tem backup diário | Perda de acesso ou de dados | Rotina de exportação manual (README já sugere) |
| R-09 | José testou o app publicado em 28/10/2026; o checklist completo do `TESTES.md` (anexos, perfis, relatórios) ainda não foi registrado | Algum caso menos usado pode falhar | Marcar o `TESTES.md` conforme o uso |
| R-10 | Recusa ou cancelamento de proposta não mexe na solicitação, que fica "Em proposta" | Solicitação parada no funil | Decidir se a recusa deve cancelar a solicitação (P-10) |
| R-13 | A migração `supabase/04_pessoas_fechamentos.sql` (v4) ainda **não foi aplicada** no Supabase `zetta-propostas` | Publicado o branch sem a migração, as telas Pessoas e Fechamentos mostram o aviso "precisa da atualização do banco" (o resto do app funciona) | Rodar o arquivo no SQL Editor antes de levar a v4 ao `main` (P-18) |
| R-14 | Pessoas guarda dados pessoais e de saúde (ASO), cobertos pela LGPD; o repositório é público (R-02) | Exposição de dados sensíveis | Acesso só de administrador (D-024); nunca subir dados reais ao GitHub; avisar os funcionários sobre o uso dos dados |
| R-15 | Planilhas, versões e certificados ocupam o Storage do Supabase Free (1 GB) | Uma planilha por dia (~30 KB) dá ~10 MB por ano; PDFs de certificado pesam mais | Acompanhar o uso em Supabase → Storage |
| R-16 | O prazo do fechamento é calculado no horário do navegador | Quem enviar de outro fuso vê o prazo deslocado | Suficiente para uso em MS; fixar o fuso se houver filial em outro estado |

## Perguntas em aberto
| # | Pergunta | Para quem | Desde | Situação |
|---|---|---|---|---|
| P-01 | O repositório deve ficar privado? | José e sócia | 28/10/2026 | aberta |
| P-02 | Onde está o pacote original com `src/lib` e `supabase/`? | José | 28/10/2026 | aberta |
| P-03 | O app é só para uso interno ou será vendido a outras PMEs? Se vendido, multiempresa? | José e sócia | 28/10/2026 | aberta |
| P-04 | Como o comercial da Zetta trabalha hoje fora do app? | José | 28/10/2026 | aberta |
| P-05 | A solicitação deve mudar de status sozinha quando ganha proposta ou quando a proposta é aprovada? | José | 28/10/2026 | proposta na v2 (D-010), aguarda confirmação |
| P-06 | "Responsável" deve ser um integrante da `equipe` em vez de texto livre? | José | 28/10/2026 | proposta na v2 (D-011), aguarda confirmação |
| P-07 | O app Streamlit antigo ainda está em uso? Os dados dele já migraram? | José | 28/10/2026 | aberta |
| P-09 | Confirmar ou ajustar as decisões D-006 a D-016 da v2 | José | 28/10/2026 | aberta |
| P-10 | Quando o cliente recusa a proposta, a solicitação deve ser cancelada automaticamente? | José | 28/10/2026 | aberta |
| P-11 | Administrador poderá reabrir proposta encerrada, ou reabrir sempre exige proposta nova? | José | 28/10/2026 | aberta |
| P-12 | Pessoas e Fechamentos são para a própria Zetta ou para um cliente (um comércio, por exemplo)? Se forem de um cliente, ele precisa de projeto e banco próprios (ligado a P-03) | José | 03/11/2026 | aberta |
| P-13 | O que a planilha de fechamento contém hoje? Existe um modelo padrão? O app deve ler o total sozinho da planilha (hoje o total é digitado e opcional)? | José | 03/11/2026 | aberta |
| P-14 | Há mais de um caixa ou loja fechando no mesmo dia? (hoje: um fechamento por dia, D-023) | José | 03/11/2026 | aberta |
| P-15 | Quais dias têm fechamento e até que horas a planilha deve chegar? (padrão: segunda a sábado, até 20h; ajustável na tela) | José | 03/11/2026 | aberta |
| P-16 | Quem pode ver Pessoas: só administradores (como está) ou também alguém de RH sem acesso total? | José | 03/11/2026 | aberta |
| P-17 | Confirmar ou ajustar as decisões D-020 a D-025 da v4 | José | 03/11/2026 | aberta |
| P-18 | Quem aplica a migração 04 no Supabase: José pelo SQL Editor ou o Claude pelo conector (com a confirmação de José)? | José | 03/11/2026 | aberta |

## Ideias (backlog)
- 💡 Seletor de cor de destaque em Preferências (visto na referência da v3) — 29/10/2026. Com os tokens da v4 (D-020) ficou simples: é trocar `--accent`.
- 💡 Avisar por WhatsApp ou e-mail (n8n) os vencimentos da semana e o fechamento pendente perto do horário limite — 03/11/2026
- 💡 Modelo padrão de planilha de fechamento para baixar no app — 03/11/2026
- 💡 Ler o total da planilha automaticamente (célula "Total") em vez de digitar — 03/11/2026
- 💡 Treinamentos exigidos por cargo, com alerta de quem nunca fez — 03/11/2026
- 💡 Notificações (sino no topo) quando uma validade estiver para vencer — 29/10/2026
- 💡 Arrastar cartões no quadro para mudar o status (hoje o quadro só mostra; D-012)
- 💡 Envio da proposta por e-mail/WhatsApp — listado como limitação da v1

## Resolvidas
- **Relatório de ciclo de venda por responsável** (ideia) → ciclo de venda, tempo em cada etapa e desempenho por responsável no relatório da v4 (D-021), 03/11/2026.
- **R-01** (arquivos ausentes) → v2 traz `src/lib/`, `supabase/` e `tests/` completos, 28/10/2026.
- **R-03** (status sem trava) → transições validadas no banco e na tela (D-007), 28/10/2026.
- **R-04** (motivo de cancelamento ausente) → recusa e cancelamento exigem motivo (D-008), 28/10/2026.
- **R-05** (validação só no front) → `salvar_proposta` valida itens e desconto no banco, 28/10/2026.
- **R-07** (anexos órfãos) → propostas e solicitações não são excluídas na v2; anexos excluídos apagam o arquivo, 28/10/2026.
- **Redesign visual** → feito na v2 (D-013), 28/10/2026.
- **R-12** (app fora do ar) → José criou o Worker `zettatestweb` na Cloudflare, publicou e testou o app, 28/10/2026.
- **R-11** (cadastro público ligado) → desligado por José, 28/10/2026.
- **P-08** (Supabase novo ou antigo) → José escolheu projeto novo; banco v2 instalado em `zetta-propostas`, 28/10/2026 (D-006).
- **Kanban de propostas** → quadro por etapa na v2 (D-012), 28/10/2026.
- **Tempo em cada status** → histórico de status e linha das etapas (D-009), 28/10/2026.
