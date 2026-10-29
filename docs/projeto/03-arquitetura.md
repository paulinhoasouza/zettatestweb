# Arquitetura — Zetta Propostas (v2)

> Como o sistema funciona por trás da tela, na versão 2 (28/10/2026). Cada regra cita a decisão que a motivou (D-xxx em [Decisões](04-decisoes.md)). A arquitetura da v1, reconstruída do código antigo, ficou registrada no histórico do repositório.

Legenda: verde = decidido · amarelo tracejado = hipótese · cinza = serviço externo.

## 1. Contexto

```mermaid
flowchart LR
  classDef decidido fill:#d1fae5,stroke:#059669,color:#064e3b
  classDef hipotese fill:#fef3c7,stroke:#d97706,color:#78350f,stroke-dasharray:4 3
  classDef externo fill:#e5e7eb,stroke:#6b7280,color:#111827
  admin(["Administrador"]) --> app
  com(["Comercial"]) --> app
  prospect(["Prospect vendo a demo"]) -.->|"?demo"| demo
  app["Zetta Propostas v2<br/>React + Vite<br/>Cloudflare Pages"]:::decidido
  demo["Banco de demonstração<br/>no navegador"]:::hipotese
  app -->|"login"| auth["Supabase Auth"]:::externo
  app -->|"leitura sob RLS"| api["Supabase API"]:::externo
  app -->|"rpc salvar_proposta<br/>rpc mudar_status_proposta"| api
  api --> db[("Postgres<br/>tabelas, RLS, gatilhos")]:::externo
  app -->|"anexos privados"| st["Storage<br/>zetta-anexos"]:::externo
  app -.->|"impressão do navegador"| pdf["PDF da proposta"]
```

Não há servidor próprio (D-001). O navegador usa a chave pública; quem garante as regras é o banco: RLS em todas as tabelas e duas funções como únicas portas de escrita das propostas (D-002).

## 2. Organização do código

```
src/
├── main.jsx, App.jsx        # moldura, login, carregamento e rotas
├── styles.css               # tokens e estilo (D-019: gradiente ZettaMinds)
├── assets/marca/            # logo ZettaMinds (normal, com "Zetta" em branco, símbolo)
├── lib/
│   ├── api.js               # interface única de dados: Supabase ou demonstração
│   ├── supabase.js          # cliente com a chave pública (lida de src/config.js, D-018)
│   ├── demo.js              # banco fictício no navegador (D-016)
│   ├── business.js          # regras puras: totais, transições, prazos (testadas)
│   ├── format.js            # moeda, datas, "há 3 dias"
│   └── rota.js              # rotas por hash (D-015)
├── components/              # Icon, ui (botões, campos, KPIs, gráficos), Anexos, Linha
└── pages/                   # VisaoGeral, Propostas, PropostaDetalhe, Solicitacoes, Clientes, Relatorios, Equipe, Login
supabase/
├── 01_estrutura.sql         # banco completo
├── 02_admin_inicial.sql     # primeiro administrador
└── testes/                  # stub do Supabase + testes de comportamento do banco
tests/business.test.js       # testes das regras (npm test)
```

## 3. O que acontece ao abrir o app

```mermaid
flowchart TD
  ini["Abrir o site"] --> demo{"Endereço com ?demo?"}
  demo -->|"sim"| painel
  demo -->|"não"| cfg{"Variáveis do Supabase<br/>configuradas?"}
  cfg -->|"não"| setup["Tela Conecte o Supabase<br/>com link para a demo"]
  cfg -->|"sim"| ses{"Sessão ativa?"}
  ses -->|"não"| login["Login"]
  login --> ses
  ses -->|"sim"| eq{"Ativo na equipe?"}
  eq -->|"não"| bloq["Acesso ainda não liberado"]
  eq -->|"sim"| load["carregarTudo: lê as tabelas"]
  load --> painel["Visão geral"]
```

Depois de cada gravação o app recarrega os dados e mostra "Atualizado às hh:mm" no topo. Funciona bem até algumas centenas de propostas (R-06).

## 4. Jornada principal

```mermaid
flowchart TD
  c["Cadastrar cliente"] --> s["Abrir solicitação<br/>prioridade, responsável, prazo"]
  s --> p["Criar proposta<br/>nasce como Rascunho, número ZP"]
  p --> sol1["Solicitação vai para Em proposta"]
  p --> env["Marcar como enviada"]
  env --> resp{"Cliente responde"}
  resp -->|"pede ajustes"| neg["Em negociação<br/>cada gravação = nova revisão"]
  neg --> reenv["Reenviar ao cliente"] --> resp
  resp -->|"aceita"| apr["Aprovada"]
  apr --> sol2["Solicitação vai para Concluída"]
  resp -->|"recusa"| rec["Recusada com motivo"]
```

## 5. Ciclos de status

### Proposta (D-007, D-008)

```mermaid
stateDiagram-v2
  state "Em negociação" as EmNegociacao
  [*] --> Rascunho
  Rascunho --> Enviada
  Rascunho --> Cancelada: motivo obrigatório
  Enviada --> EmNegociacao
  EmNegociacao --> Enviada: reenviar
  Enviada --> Aprovada
  EmNegociacao --> Aprovada
  Enviada --> Recusada: motivo obrigatório
  EmNegociacao --> Recusada: motivo obrigatório
  Enviada --> Cancelada: motivo obrigatório
  EmNegociacao --> Cancelada: motivo obrigatório
  Aprovada --> [*]
  Recusada --> [*]
  Cancelada --> [*]
```

Qualquer outra transição é recusada pelo banco com a mensagem "Uma proposta X não pode passar para Y". Aprovada, Recusada e Cancelada são finais: a proposta deixa de ser editável.

### Solicitação (D-010)

```mermaid
stateDiagram-v2
  state "Em análise" as EmAnalise
  state "Em proposta" as EmProposta
  state "Concluída" as Concluida
  [*] --> Aberta
  Aberta --> EmAnalise
  Aberta --> EmProposta: primeira proposta criada
  EmAnalise --> EmProposta: primeira proposta criada
  EmProposta --> Concluida: proposta aprovada
  Aberta --> Cancelada: motivo obrigatório
  EmAnalise --> Cancelada: motivo obrigatório
  EmProposta --> Cancelada: motivo obrigatório
```

A solicitação ainda pode ter o status trocado à mão na tela; toda troca fica no histórico de status. Não se cria proposta em solicitação Concluída ou Cancelada.

## 6. Modelo de dados

```mermaid
erDiagram
  equipe ||--o{ solicitacoes : "responde por"
  clientes ||--o{ solicitacoes : "faz"
  solicitacoes ||--o{ propostas : "gera"
  propostas ||--|{ proposta_itens : "contém"
  propostas ||--o{ revisoes : "versiona"
  equipe {
    uuid id PK "mesmo id do Supabase Auth"
    text nome
    text email
    text perfil "admin ou comercial"
    bool ativo
  }
  clientes {
    uuid id PK
    text nome
    text documento
    text contato
    text telefone
    text email
    text cidade
  }
  solicitacoes {
    uuid id PK
    uuid cliente_id FK
    text titulo
    text prioridade
    text status
    uuid responsavel_id FK
    date prazo
    text motivo_cancelamento
    timestamptz status_desde
  }
  propostas {
    uuid id PK
    text numero "ZP-00001"
    uuid solicitacao_id FK
    text status
    numeric subtotal
    numeric desconto
    numeric valor_total
    date validade
    int revisao_atual
    timestamptz status_desde
    timestamptz enviada_em
    timestamptz decidida_em
    text motivo_encerramento
  }
  proposta_itens {
    uuid id PK
    uuid proposta_id FK
    int revisao "itens de cada revisão ficam guardados (D-017)"
    int ordem
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
  }
```

Tabelas de apoio, ligadas por `entidade` + `registro_id`: `status_historico` (cada mudança de status, D-009), `historico` (auditoria legível) e `anexos` (arquivos no bucket privado).

## 7. Operações críticas

### Salvar proposta (D-002, D-003)

```mermaid
sequenceDiagram
  actor U as Usuário
  participant F as Tela
  participant R as business.js
  participant DB as salvar_proposta
  U->>F: Criar rascunho ou Salvar revisão
  F->>R: validarProposta
  alt há problemas
    R-->>F: lista de erros
    F-->>U: mostra os erros ao lado do total
  else ok
    F->>DB: rpc com itens
    DB->>DB: confere acesso, itens e desconto
    DB->>DB: soma linha a linha, arredondada
    alt proposta nova
      DB->>DB: gera ZP-xxxxx, status Rascunho
      DB->>DB: solicitação vai para Em proposta
    else edição
      DB->>DB: recusa se a proposta estiver encerrada
    end
    DB->>DB: grava os itens com o número da revisão, o instantâneo e o histórico
    DB-->>F: id, número, revisão, total
    F-->>U: aviso e recarga
  end
```

### Mudar status (D-007 a D-010)

```mermaid
sequenceDiagram
  actor U as Usuário
  participant F as Tela
  participant DB as mudar_status_proposta
  U->>F: Registrar recusa
  F-->>U: diálogo pede o motivo
  U->>F: confirma com motivo
  F->>DB: rpc id, Recusada, motivo
  DB->>DB: confere a transição e o motivo
  DB->>DB: atualiza status, status_desde, decidida_em
  DB->>DB: grava status_historico e historico
  DB-->>F: ok
```

## 8. Regras de negócio

| Regra | Onde é aplicada | Status |
|---|---|---|
| Só entra quem está ativo em `equipe` | RLS (`e_membro()`) + tela | 🧪 |
| Só administrador inclui ou altera integrantes | RLS (`e_admin()`) + tela | 🧪 |
| Primeiro admin automático para os e-mails de José, só com login confirmado | gatilho `zetta_primeiro_admin` em `auth.users` | 🧪 |
| Ninguém tira o próprio acesso de administrador; sempre resta um admin ativo | gatilho `proteger_equipe` | 🧪 |
| Propostas só são gravadas pelas duas funções | RLS sem política de escrita | 🧪 (D-002) |
| Quantidade > 0, valor unitário ≥ 0, desconto ≤ subtotal | `salvar_proposta` + `business.js` | 🧪 |
| Total = soma das linhas arredondadas − desconto | `salvar_proposta` + `business.js` | 🧪 |
| Toda gravação cria uma revisão | `salvar_proposta` | 🧪 (D-003) |
| Transições permitidas e status finais | `transicao_proposta_valida` + `business.js` | 🧪 (D-007) |
| Recusa e cancelamento com motivo | `mudar_status_proposta` + restrição na tabela | 🧪 (D-008) |
| Cancelar solicitação exige motivo | restrição `solicitacao_cancelada_tem_motivo` | 🧪 |
| Cliente com solicitação não pode ser excluído | chave estrangeira `on delete restrict` | 🧪 |
| Anexo de até 10 MB, bucket privado, link temporário de 60 s | Storage + `api.js` | 🧪 |
| "Precisa de ação": validade vencida ou em até 7 dias, enviada sem resposta há 7+ dias, rascunho parado há 5+ dias, solicitação com prazo vencido | `precisaAcao()` em `business.js` | 🧪 |
| Conversão = aprovadas ÷ (aprovadas + recusadas) pela data da decisão | `taxaConversao()` | 🧪 |
| CSV protege células que começam com `= + - @` | `paraCsv()` | 🧪 |

## 9. Integrações e segredos

| Serviço | Para quê | Variáveis |
|---|---|---|
| Supabase | banco, login, API, arquivos | projeto `zetta-propostas` (`vbpktfmngjirwasawktx`), URL e chave publicável em `src/config.js` (D-018) |
| Cloudflare Workers (Workers Builds) | Worker `zettatestweb`: build `npm run build`, deploy `npx wrangler deploy` com `wrangler.jsonc` (arquivos de `dist/`, modo SPA) | nenhuma obrigatória; opcional `VITE_MODO_DEMO=true` (variável de build) para um site só de demonstração |
| Google Fonts | IBM Plex Sans e Plex Mono | nenhuma |

Nunca usar `service_role`, `sb_secret_...` ou a senha do banco em variável `VITE_`: elas vão para o navegador.
