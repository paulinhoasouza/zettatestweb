# Zetta Propostas — gestão comercial

> App web interno da Zetta para controlar clientes, solicitações e propostas comerciais do primeiro contato ao fechamento, com React no Cloudflare Pages e Supabase como backend.

| | |
|---|---|
| **Cliente** | Uso interno da Zetta (possível produto para venda a outras PMEs) |
| **Tipo** | em desenvolvimento |
| **Fase atual** | MVP — v3 publicada em 29/10/2026; v4 (estilo Apple, Pessoas, Fechamentos) pronta no branch `claude/fervent-maxwell-f0njhi` em 03/11/2026, aguardando José |
| **Responsáveis Zetta** | José |
| **Repositório** | https://github.com/paulinhoasouza/zettatestweb |
| **Atualizado em** | 03/11/2026 |

## O problema
A Zetta precisa organizar as oportunidades comerciais: quem pediu o quê, em que pé está cada proposta, quais revisões foram enviadas e quanto já foi aprovado. Antes deste app, o controle passava por uma versão em Streamlit sobre o mesmo Supabase.

## A solução pretendida
Um sistema web com login restrito à equipe, cadastro de clientes, solicitações (demandas) e propostas versionadas, com PDF pela impressão do navegador, anexos privados, painel de indicadores e relatório exportável em CSV. Na v4 entram o controle de pessoas (treinamentos e documentos com vencimento) e o fechamento diário em planilha. Detalhes em [Solução](02-solucao.md).

## Estado atual
- ✅ v2 reescrita (D-005) e banco novo instalado no Supabase `zetta-propostas` (São Paulo) em 28/10/2026 (D-006), testado por SQL direto no projeto: numeração, totais, revisões, transições, motivo obrigatório e bloqueio de escrita direta.
- ✅ José criou o login `paulinhoalcantara44@gmail.com` em 28/10/2026 e ele entrou como administrador; cadastro público desligado.
- ✅ v3 no ar desde 29/10/2026 (visual ZettaMinds, D-019), aprovada por José; Worker `zettatestweb` na Cloudflare, publicado a partir do `main`. A v2 foi testada por José em 28/10/2026; regras e banco não mudaram na v3.
- 🧪 Decisões D-006 a D-018 da reescrita aguardam confirmação (P-09).
- 🧪 v4 pronta no branch `claude/fervent-maxwell-f0njhi` (03/11/2026): visual estilo Apple com aparência clara e escura (D-020), relatórios Comercial, Pessoas e Fechamentos com gráficos interativos (D-021), aba Pessoas (D-022), aba Fechamentos com prévia da planilha (D-023) e perfil Operacional (D-024). Testada na demonstração (`?demo`), com testes de regras, do banco e de ponta a ponta no navegador. Migração `supabase/04_pessoas_fechamentos.sql` aplicada no Supabase em 03/11/2026 (José, pelo SQL Editor) e conferida pelo Claude. PR [paulinhoasouza/zettatestweb#1](https://github.com/paulinhoasouza/zettatestweb/pull/1) aberto para o `main`, aguardando José (P-17).

## Próximos passos
1. Revisar e fazer o merge do PR #1 para publicar a v4 (P-17) — José
2. Seguir as seções v4 do `TESTES.md` no site publicado — José e Claude
3. Responder P-12 a P-16 (para quem são Pessoas e Fechamentos, conteúdo da planilha, dias e horário) — José
4. Tornar o repositório privado (P-01), ainda mais com dados de pessoas — José

## Mapa do dossiê
- [Descoberta](01-descoberta.md) · [Solução](02-solucao.md) · [Arquitetura](03-arquitetura.md) · [Decisões](04-decisoes.md) · [Ideias e pendências](05-ideias-e-pendencias.md) · [Diário](diario.md)
