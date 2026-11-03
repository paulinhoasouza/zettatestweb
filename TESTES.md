# Checklist de homologação — v2 a v4

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

## v4 — visual
- [ ] Botão de aparência no topo alterna Automática → Clara → Escura; a escolha fica salva neste navegador.
- [ ] Gaveta abre e fecha com animação; no celular ela sobe de baixo; Esc fecha só o painel de cima.
- [ ] Imprimir a proposta continua saindo só o documento, em papel branco, também no modo escuro.

## v4 — relatórios
- [ ] Comercial, Pessoas e Fechamentos aparecem no seletor do topo (Pessoas só para administrador).
- [ ] Passar o mouse (ou focar e usar as setas) no gráfico de evolução mostra aprovado e cotado do período.
- [ ] "Ver tabela" em cada gráfico mostra os mesmos números.
- [ ] Mudar o período anima os gráficos e os números batem com a tabela de propostas.

## v4 — pessoas (administrador)
- [ ] Cadastrar funcionário, registrar um treinamento com validade e anexar o certificado.
- [ ] Validade anterior à data do treinamento é recusada.
- [ ] "Renovar" cria um registro novo; o anterior vai para "Histórico de renovações".
- [ ] Item que vence em até 30 dias aparece em laranja; vencido em vermelho; a contagem aparece no menu.
- [ ] Funcionário com registros não pode ser excluído; marcado como Desligado sai dos vencimentos.
- [ ] Usuário Comercial não vê a aba Pessoas (e o banco não devolve os dados).

## v4 — fechamentos
- [ ] Rodar `supabase/04_pessoas_fechamentos.sql` no SQL Editor; o resultado lista 5 tabelas com RLS ativo.
- [ ] Arrastar uma planilha .xlsx para "Fechamento de hoje", conferir a prévia, informar o total e enviar.
- [ ] Arquivo que não é planilha é recusado com mensagem.
- [ ] Administrador abre o dia, vê a prévia e marca como conferido; o dia fica verde no calendário.
- [ ] Apontar divergência exige nota; quem envia vê a nota e reenvia; as duas versões ficam guardadas.
- [ ] Marcar um feriado como sem expediente (com motivo); o dia deixa de contar como faltando.
- [ ] Ajustes: mudar os dias e o horário limite muda o que aparece como pendente ou sem fechamento.
- [ ] Usuário Operacional entra e só vê Fechamentos; não confere, não vê Ajustes nem o relatório.

Se algo falhar, anote a tela, o que fez e a mensagem (sem copiar chaves) e registre em `docs/projeto/05-ideias-e-pendencias.md`.
