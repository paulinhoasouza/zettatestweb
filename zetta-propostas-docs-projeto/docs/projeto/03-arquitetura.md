# Arquitetura — Zetta Propostas

> Como o sistema funciona por trás da tela. Tudo aqui foi extraído do código em 28/10/2026 (📌 observado) e indica o arquivo de origem. Partes que dependem de arquivos ausentes do repositório (`src/lib/*`, `supabase/*.sql`) foram deduzidas pelos nomes das funções e pelo README e estão marcadas como **dedução**.

Legenda dos diagramas: cinza = serviço externo · tracejado = dedução, confirmar no SQL.

## 1. Contexto

```mermaid
flowchart LR
  classDef externo fill:#e5e7eb,stroke:#6b7280,color:#111827
  admin(["Administrador"]) --> app
  com(["Comercial"]) --> app
  app["Zetta Propostas<br/>React + Vite<br/>Cloudflare Pages"]
  app -->|"login"| auth["Supabase Auth"]:::externo
  app -->|"consultas sob RLS"| api["Supabase API<br/>PostgREST"]:::externo
  app -->|"rpc salvar_proposta"| api
  api --> db[("Postgres<br/>tabelas, RLS, auditoria")]:::externo
  app -->|"anexos privados"| st["Supabase Storage<br/>bucket zetta-anexos"]:::externo
  app -.->|"impressão do navegador"| pdf["PDF da proposta"]
  pdf -.-> cli(["Cliente final"])
```

Não existe servidor próprio: o navegador fala direto com o Supabase usando a chave pública, e a segurança depende das políticas RLS e da função `salvar_proposta` (README, seção "Por que não há um servidor").

## 2. O que acontece ao abrir o app

Fonte: `App()` em `src/App.jsx`, linhas 150–167.

```mermaid
flowchart TD
  ini["Abrir o site"] --> cfg{"VITE_SUPABASE_URL e<br/>ANON_KEY configuradas?"}
  cfg -->|"não"| setup["Tela Configure a conexão"]
  cfg -->|"sim"| ses{"Há sessão no<br/>Supabase Auth?"}
  ses -->|"não"| login["Tela de login"]
  login -->|"e-mail e senha corretos"| ses
  ses -->|"sim"| eq{"Linha em equipe com<br/>este id e ativo = true?"}
  eq -->|"não"| bloq["Acesso ainda não autorizado"]
  eq -->|"sim"| load["fetchAll: carrega todas as tabelas"]
  load --> painel["Visão geral"]
```

Depois de carregar, **todas** as telas trabalham sobre os dados em memória. Cada gravação chama `refresh()`, que busca tudo de novo (`onDone`, linha 157). Funciona bem com poucos registros; com milhares, ficará lento (R-06).

## 3. Jornada principal

```mermaid
flowchart TD
  c["Cadastrar cliente"] --> s["Abrir solicitação<br/>prioridade, responsável, prazo"]
  s --> p["Criar proposta a partir da solicitação<br/>itens, desconto, validade"]
  p --> salvar["Salvar: banco gera ZP-00001<br/>e revisão 1"]
  salvar --> pdf["Visualizar e imprimir PDF"]
  pdf --> env["Mudar status para Enviada"]
  env --> resp{"Resposta do cliente"}
  resp -->|"ajuste"| edit["Editar proposta<br/>nova revisão"] --> pdf
  resp -->|"aceite"| apr["Aprovada"]
  resp -->|"recusa"| rec["Recusada"]
```

Travas observadas no front (`openNew`, linha 159): não deixa criar solicitação sem cliente cadastrado nem proposta sem solicitação.

📌 A solicitação **não muda de status sozinha** quando ganha uma proposta ou quando a proposta é aprovada; o usuário muda à mão (P-05).

## 4. Ciclos de status

### Proposta (`SP`, linha 27)

Fluxo esperado:

```mermaid
stateDiagram-v2
  state "Em negociação" as EmNegociacao
  [*] --> Rascunho
  Rascunho --> Enviada
  Enviada --> EmNegociacao
  EmNegociacao --> Enviada: nova revisão
  Enviada --> Aprovada
  EmNegociacao --> Aprovada
  Enviada --> Recusada
  EmNegociacao --> Recusada
  Rascunho --> Cancelada
  Enviada --> Cancelada
  Aprovada --> [*]
  Recusada --> [*]
  Cancelada --> [*]
```

📌 **No código, nenhuma transição é imposta**: o status é um `select` livre no formulário. É possível, por exemplo, voltar uma proposta Aprovada para Rascunho. Se a função `salvar_proposta` não validar isso, as métricas de conversão podem ser distorcidas (R-03).

### Solicitação (`SC`, linha 26)

```mermaid
stateDiagram-v2
  state "Em análise" as EmAnalise
  state "Em proposta" as EmProposta
  state "Concluída" as Concluida
  [*] --> Aberta
  Aberta --> EmAnalise
  EmAnalise --> EmProposta
  EmProposta --> Concluida
  Aberta --> Cancelada: exige motivo
  EmAnalise --> Cancelada: exige motivo
  EmProposta --> Cancelada: exige motivo
  Concluida --> [*]
  Cancelada --> [*]
```

O motivo de cancelamento é obrigatório só no formulário (campo `required`) e é apagado se o status deixar de ser Cancelada (linha 75).

## 5. Modelo de dados

Deduzido das chaves de `emptyData` (linha 29) e dos campos usados nos formulários. Os nomes reais das tabelas e os tipos precisam ser confirmados em `supabase/01_migracao.sql`.

```mermaid
erDiagram
  clientes ||--o{ solicitacoes : "faz"
  solicitacoes ||--o{ propostas : "gera"
  propostas ||--|{ itens : "contém"
  propostas ||--o{ revisoes : "versiona"
  equipe ||--o{ anexos : "envia"
  clientes {
    uuid id PK
    text nome
    text documento
    text contato
    text email
    text telefone
    text observacoes
    timestamptz criado_em
  }
  solicitacoes {
    uuid id PK
    uuid cliente_id FK
    text titulo
    text descricao
    text prioridade
    text status
    text responsavel
    date prazo
    text motivo_cancelamento
    timestamptz criado_em
  }
  propostas {
    uuid id PK
    uuid solicitacao_id FK
    text numero
    text titulo
    text escopo
    text status
    numeric desconto
    date validade
    text condicoes_pagamento
    text observacoes
    timestamptz criado_em
  }
  itens {
    uuid id PK
    uuid proposta_id FK
    text descricao
    numeric quantidade
    numeric valor_unitario
  }
  revisoes {
    uuid id PK
    uuid proposta_id FK
    int numero_revisao
    jsonb dados
    jsonb itens
    timestamptz criado_em
  }
  equipe {
    uuid id PK
    text nome
    text perfil
    bool ativo
    timestamptz criado_em
  }
  anexos {
    uuid id PK
    text entidade
    uuid registro_id
    text nome
    int tamanho
    uuid usuario_id FK "nome real a confirmar"
  }
  historico {
    uuid id PK
    text entidade
    uuid registro_id
    text acao
    text descricao
    timestamptz criado_em
  }
```

Observações:
- `equipe.id` é o mesmo UUID do usuário no Supabase Auth.
- `anexos` e `historico` são polimórficas: `entidade` ("solicitacoes" ou "propostas") + `registro_id`. Não há chave estrangeira real, então apagar um registro pode deixar anexos órfãos.
- `solicitacoes.responsavel` é texto livre, não uma referência a `equipe` (P-06).
- O total da proposta **não é gravado**: é recalculado no front a partir dos itens menos o desconto (`totalP`, linha 36).

## 6. Operações críticas

### Salvar proposta

Fonte: `ProposalModal.submit` (linha 95) e README. O interior da função é dedução.

```mermaid
sequenceDiagram
  actor U as Usuário
  participant F as Front React
  participant D as lib/data.js
  participant API as Supabase API
  participant DB as Postgres
  U->>F: Clica em Salvar proposta
  F->>F: total = subtotal - desconto
  alt total negativo
    F-->>U: Desconto não pode superar o subtotal
  else ok
    F->>D: persistProposal(f com itens)
    D->>API: rpc salvar_proposta
    API->>DB: BEGIN
    DB->>DB: valida e grava proposta
    DB->>DB: gera número ZP-xxxxx se nova
    DB->>DB: substitui itens
    DB->>DB: grava revisão n com snapshot
    DB->>DB: registra histórico
    API->>DB: COMMIT
    API-->>D: ok
    D-->>F: ok
    F->>D: fetchAll
    F-->>U: Proposta atualizada e revisão registrada
  end
```

### Anexar arquivo

Fonte: `Attachments` (linha 64). O interior de `uploadAttachment` é dedução.

```mermaid
sequenceDiagram
  actor U as Usuário
  participant F as Front React
  participant ST as Storage zetta-anexos
  participant DB as Postgres
  U->>F: Escolhe arquivo
  F->>ST: upload no caminho entidade/registro
  F->>DB: insere linha em anexos
  F->>DB: fetchAll
  U->>F: Clica em baixar
  F->>ST: URL temporária assinada
  ST-->>U: download
```

## 7. Regras de negócio

| Regra | Onde é aplicada | Status |
|---|---|---|
| Só entra quem tem linha ativa em `equipe` | front (linha 156) + RLS (README) | 📌 observado |
| Só admin vê botão de adicionar/editar integrante | front (`Team`) | 📌 observado; RLS precisa reforçar |
| Admin não pode remover o próprio acesso de admin | front (`MemberModal`) | 📌 observado |
| Cliente com solicitação não pode ser excluído | banco (mensagem no front) | 📌 dedução |
| Solicitação exige cliente; proposta exige solicitação | front (`openNew`) + FK no banco | 📌 observado |
| Desconto não pode deixar o total negativo | front (linha 95) | 📌 observado; banco? |
| Quantidade mínima 0,01 e valor unitário ≥ 0 | atributos HTML `min` | 📌 observado; fraco |
| Toda gravação de proposta gera revisão | função `salvar_proposta` | 📌 observado no README |
| Motivo obrigatório ao cancelar solicitação | front (`required`) | 📌 observado |
| Transições de status | **nenhum lugar** | 📌 observado (R-03) |
| Conversão = aprovadas ÷ (aprovadas + recusadas) | `lib/business.js` (ausente) | 📌 observado pelo uso |
| Anexo até 10 MB | README; não há checagem no front | 📌 observado |
| CSV escapa células iniciadas por `= + @ -` | front (`Reports.csv`) | 📌 observado |

## 8. Integrações e segredos

| Serviço | Para quê | Variáveis |
|---|---|---|
| Supabase | banco, login, API, arquivos | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (chave pública) |
| Cloudflare Pages | build e hospedagem | as duas acima, em Settings → Environment variables |

Nunca usar `service_role` ou senha do banco em variável `VITE_`: elas vão para o navegador.
