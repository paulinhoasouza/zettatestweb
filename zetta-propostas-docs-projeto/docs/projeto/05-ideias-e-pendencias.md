# Ideias e pendências — Zetta Propostas

## Riscos e divergências
| # | Risco / divergência | Impacto | Ação sugerida |
|---|---|---|---|
| R-01 | `App.jsx` importa `src/lib/supabase.js`, `data.js` e `business.js`, e o README cita `supabase/01_migracao.sql`, `02_admin_inicial.sql` e `tests/business.test.js` — **nenhum desses arquivos está no repositório** | O build no Cloudflare falha; toda a lógica de banco, segurança e regras está fora do controle de versão | Achar o ZIP original e subir as pastas `src/lib`, `supabase` e `tests`. O upload pelo navegador costuma perder subpastas — conferir depois do envio |
| R-02 | Repositório `zettatestweb` está **público**; o guia manda criar privado (`zetta-propostas-web`) | Qualquer pessoa lê o código e, quando o SQL subir, as regras de segurança | Tornar privado antes de subir `supabase/` (P-01) |
| R-03 | Status de proposta e solicitação podem mudar para qualquer valor; nenhuma transição é validada | Proposta aprovada pode voltar a rascunho; conversão e pipeline ficam incorretos | Validar transições na `salvar_proposta` ou bloquear no front |
| R-04 | README promete "motivo de cancelamento" em propostas; o formulário de proposta não tem esse campo | Cancelamentos sem justificativa | Adicionar campo, como já existe na solicitação |
| R-05 | Validação de desconto e quantidade só no front | Chamada direta à API pode gravar valores inválidos | Repetir a validação dentro de `salvar_proposta` |
| R-06 | `fetchAll` carrega todas as tabelas e recarrega tudo após cada gravação | Lentidão com volume maior | Aceitável na v1; paginar quando passar de algumas centenas de propostas |
| R-07 | `anexos` e `historico` sem chave estrangeira real | Arquivos órfãos ao excluir registros | Verificar no SQL se há limpeza |
| R-08 | Supabase Free pausa após 7 dias sem uso e não tem backup diário | Perda de acesso ou de dados | Rotina de exportação manual (README já sugere) |

## Perguntas em aberto
| # | Pergunta | Para quem | Desde | Situação |
|---|---|---|---|---|
| P-01 | O repositório deve ficar privado? | José e sócia | 28/10/2026 | aberta |
| P-02 | Onde está o pacote original com `src/lib` e `supabase/`? | José | 28/10/2026 | aberta |
| P-03 | O app é só para uso interno ou será vendido a outras PMEs? Se vendido, multiempresa? | José e sócia | 28/10/2026 | aberta |
| P-04 | Como o comercial da Zetta trabalha hoje fora do app? | José | 28/10/2026 | aberta |
| P-05 | A solicitação deve mudar de status sozinha quando ganha proposta ou quando a proposta é aprovada? | José | 28/10/2026 | aberta |
| P-06 | "Responsável" deve ser um integrante da `equipe` em vez de texto livre? | José | 28/10/2026 | aberta |
| P-07 | O app Streamlit antigo ainda está em uso? Os dados dele já migraram? | José | 28/10/2026 | aberta |

## Ideias (backlog)
- 💡 Redesign visual — José, 28/10/2026 ("falta ter um design melhor")
- 💡 Kanban de propostas por status — ideia de versões anteriores
- 💡 Dashboard com tempo em cada status — ideia de versões anteriores; exige gravar a data de cada mudança de status
- 💡 Envio da proposta por e-mail/WhatsApp — listado como limitação da v1

## Resolvidas
_Nenhuma ainda._
