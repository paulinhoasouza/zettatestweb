# Zetta Propostas — gestão comercial

> App web interno da Zetta para controlar clientes, solicitações e propostas comerciais do primeiro contato ao fechamento, com React no Cloudflare Pages e Supabase como backend.

| | |
|---|---|
| **Cliente** | Uso interno da Zetta (possível produto para venda a outras PMEs) |
| **Tipo** | em desenvolvimento |
| **Fase atual** | MVP — versão 1.0 em código, sem homologação registrada |
| **Responsáveis Zetta** | José |
| **Repositório** | https://github.com/paulinhoasouza/zettatestweb |
| **Atualizado em** | 28/10/2026 |

## O problema
A Zetta precisa organizar as oportunidades comerciais: quem pediu o quê, em que pé está cada proposta, quais revisões foram enviadas e quanto já foi aprovado. Antes deste app, o controle passava por uma versão em Streamlit sobre o mesmo Supabase.

## A solução pretendida
Um sistema web com login restrito à equipe, cadastro de clientes, solicitações (demandas) e propostas versionadas, com PDF pela impressão do navegador, anexos privados, painel de indicadores e relatório exportável em CSV. Detalhes em [Solução](02-solucao.md).

## Estado atual
- 📌 O front-end (`src/App.jsx`, 170 linhas, e `src/style.css`) está no repositório e cobre todas as telas.
- 📌 **A camada por trás do front não está no repositório**: `src/lib/supabase.js`, `src/lib/data.js`, `src/lib/business.js`, a pasta `supabase/` (SQL de banco, segurança e da função `salvar_proposta`) e `tests/`. O README os descreve, mas o build falha sem eles. Ver R-01 em [Ideias e pendências](05-ideias-e-pendencias.md).
- 📌 O repositório está público, embora o guia de publicação peça um repositório privado (R-02).
- Não há registro de homologação (o checklist `TESTES.md` existe, mas não foi marcado).

## Próximos passos
1. Localizar o pacote original (ZIP) e subir `src/lib/`, `supabase/` e `tests/` — José
2. Decidir se o repositório fica privado (P-01) — José e sócia
3. Revisar este dossiê e transformar em ✅ o que já é decisão consciente — José
4. Só então seguir para o redesign visual

## Mapa do dossiê
- [Descoberta](01-descoberta.md) · [Solução](02-solucao.md) · [Arquitetura](03-arquitetura.md) · [Decisões](04-decisoes.md) · [Ideias e pendências](05-ideias-e-pendencias.md) · [Diário](diario.md)
