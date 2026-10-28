# Checklist de homologação — v2

Faça com dados de teste criados por você, no Supabase novo, antes de usar com clientes reais. Marque cada item.

## Acesso
- [ ] Senha errada não entra e mostra a mensagem de erro.
- [ ] Usuário criado no Supabase **sem** linha em Equipe vê "Acesso ainda não liberado".
- [ ] Administrador libera um usuário comercial pelo UID; o comercial entra e **não** vê "Liberar acesso" nem "Editar".
- [ ] Administrador não consegue tirar o próprio perfil de administrador.

## Clientes e solicitações
- [ ] Cadastrar, buscar e editar cliente.
- [ ] Excluir cliente sem solicitações funciona; o botão some quando há solicitação.
- [ ] Abrir solicitação com responsável e prazo; prazo vencido aparece em vermelho e em "Precisa de ação".
- [ ] Cancelar solicitação sem motivo é recusado.
- [ ] Anexar e abrir um arquivo; excluir o anexo.

## Propostas
- [ ] Criar proposta a partir da solicitação: nasce como Rascunho com número `ZP-00001` e revisão 1; a solicitação passa para "Em proposta".
- [ ] Quantidade zero, item sem descrição e desconto maior que o subtotal são recusados com mensagem.
- [ ] Editar e salvar gera a revisão 2; a aba Revisões mostra a diferença de valor.
- [ ] Marcar como enviada → a validade aparece em "Precisa de ação" quando faltam 7 dias ou menos.
- [ ] "Cliente pediu ajustes" → Em negociação; "Reenviar ao cliente" → Enviada.
- [ ] Registrar recusa exige motivo; o motivo aparece em Relatórios → "Por que não fechou".
- [ ] Registrar aprovação: a proposta fica travada para edição e a solicitação vira "Concluída".
- [ ] Aba Documento → Imprimir ou salvar PDF gera um PDF só com o documento.
- [ ] O quadro mostra as propostas por etapa com os dias na etapa.

## Relatórios e visão geral
- [ ] Com 2 aprovadas e 1 recusada no período, a conversão mostra 66,7%.
- [ ] Exportar CSV abre no Excel com acentos corretos.
- [ ] Os valores da visão geral batem com a soma das propostas na tabela.

## Segurança (no painel do Supabase)
- [ ] **Database → Tables**: RLS ativado em todas as tabelas do `public`.
- [ ] A chave `service_role`/`sb_secret` não aparece no Cloudflare nem no GitHub.
- [ ] Cadastro público desligado em Authentication.

## Telas
- [ ] Computador, tablet e celular: menu lateral, gavetas, diálogos e tabela viram listas no celular.
- [ ] Atualizar a página mantém os dados (vêm do Supabase).

Se algo falhar, anote a tela, o que fez e a mensagem (sem copiar chaves) e registre em `docs/projeto/05-ideias-e-pendencias.md`.
