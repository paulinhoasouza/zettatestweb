# Ideias e pendências — Zetta Propostas

## Riscos e divergências
| # | Risco / divergência | Impacto | Ação sugerida |
|---|---|---|---|
| R-02 | Repositório `zettatestweb` está **público**; o guia manda criar privado (`zetta-propostas-web`) | Qualquer pessoa lê o código e, quando o SQL subir, as regras de segurança | Tornar privado antes de subir `supabase/` (P-01) |
| R-06 | O app carrega todas as tabelas e recarrega tudo após cada gravação (v1 e v2) | Lentidão com volume maior | Aceitável na v1; paginar quando passar de algumas centenas de propostas |
| R-08 | Supabase Free pausa após 7 dias sem uso e não tem backup diário | Perda de acesso ou de dados | Rotina de exportação manual (README já sugere) |
| R-09 | José testou o app publicado em 28/10/2026; o checklist completo do `TESTES.md` (anexos, perfis, relatórios) ainda não foi registrado | Algum caso menos usado pode falhar | Marcar o `TESTES.md` conforme o uso |
| R-10 | Recusa ou cancelamento de proposta não mexe na solicitação, que fica "Em proposta" | Solicitação parada no funil | Decidir se a recusa deve cancelar a solicitação (P-10) |

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

## Ideias (backlog)
- 💡 Arrastar cartões no quadro para mudar o status (hoje o quadro só mostra; D-012)
- 💡 Relatório de ciclo de venda: dias médios de Rascunho até a decisão, por responsável
- 💡 Envio da proposta por e-mail/WhatsApp — listado como limitação da v1

## Resolvidas
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
