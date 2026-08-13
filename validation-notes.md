# Notas de validação visual

Em 13/08/2026, após reiniciar o servidor, a pré-visualização carregou sem o erro antigo de resolução de `MemberHistory`. A dashboard apresentou a navegação funcional para Dashboard, Membros, Presenças, Atividades, Finanças, Transferências, Histórico, Relatórios, Louvor, Configurações e Auditoria e backup. A dashboard mostrou dados reais do sistema, com cinco grupos operacionais e os cartões de membros, atividades e quotas.

A página foi aberta com sessão local já autenticada como Administrador/Líder. A interface de desktop mostrou sidebar persistente, conteúdo legível e adaptação visual geral adequada. O banner inferior indicou que a página estava em Preview Mode, sem afetar a aplicação.

A página de Presenças abriu corretamente e apresentou o seletor de atividade e a mensagem orientadora quando nenhuma atividade foi escolhida. A página de Membros abriu corretamente, com botões de gestão de grupos e novo membro. A listagem mostrou o formato `Líder · Masculino · Idade: — · Grupo: David`, confirmando que a idade está prevista na listagem, mas o registo existente não tem data de nascimento preenchida. O botão `Novo membro` ficou disponível para testar o formulário.

Após a melhoria do formulário, a página mostrou um campo `Idade` identificado, somente leitura, com o placeholder `Calculada automaticamente`, ao lado da data de nascimento. O campo está acessível e não altera os dados persistidos; a idade continua a ser derivada da data atual.

As rotas `/history` e `/louvor` abriram sem 404. O Histórico mostrou pesquisa por membro/cargo/detalhe e o estado vazio, sem dados fictícios. O Louvor mostrou as abas `Membros de Louvor` e `Escalas Musicais`, o botão `Novo membro de louvor` e o estado vazio, preservando o fluxo dedicado de música.

A sessão do navegador persistiu ao visitar `/`, portanto a pré-visualização interativa continuou a mostrar a dashboard autenticada. A validação isolada anterior em viewport mobile tinha revelado os placeholders `admin` e `admin123`; estes foram substituídos por `Nome de utilizador` e `Introduza a sua senha` no código, sem alterar a autenticação nem os valores dos campos, que permanecem vazios.

A validação HTTP local autenticou o administrador com resposta 200 e o endpoint `/api/transfers/adult-pdf?ids=1&reason=...` devolveu `Content-Type: application/pdf`, resposta 200 e um ficheiro PDF válido. `pdfinfo` confirmou 1 página com dimensão `841.89 x 595.28 pts (A4)`, ou seja, orientação horizontal. A rota foi ajustada para consultar também membros inativos, porque a transferência os inativa antes do descarregamento automático.

A página autenticada de Transferências está acessível, mostra o botão `Processar transferência`, a listagem de membros, seleção e histórico. A pré-visualização de gestão permaneceu em modo não partilhável e não refletiu o clique do botão, embora a rota e o componente estejam presentes; a lógica foi validada por TypeScript, testes e chamadas HTTP. Nenhum dado foi alterado durante esta verificação.

## Validação do ciclo de alterações financeiras e backups
- 2026-08-13: Após reinício, o dashboard carregou com sessão local persistente e sem erro de runtime visível.
- A navegação lateral mostra Dashboard, Membros, Campos em falta, Presenças, Actividades, Finanças, Transferências, Histórico, Relatórios, Louvor, Configurações e Auditoria e backup.
- O dashboard apresentou dados reais existentes (1 membro, 1 actividade, 1 quota e 5 grupos), confirmando que não foram introduzidos dados fictícios durante a validação.

- 2026-08-13: Finanças carregou com dados reais e mostrou Cotas 100,00 XOF, Outras receitas 500,00 XOF, Despesas 450,00 XOF e Saldo total 150,00 XOF, consistente com a fórmula solicitada.
- O resumo anual apresentou 2026 com os mesmos totais e saldo. O painel de relatório mostrou datas inicial/final e os botões Exportar PDF e Exportar Excel.

- 2026-08-13: Configurações > Aparência abriu com os controlos Claro, Escuro, cores de destaque e Guardar Preferências. O tema escuro estava aplicado e os controlos ficaram visíveis, indicando que o provider global está ligado à página.

- 2026-08-13: A rota /members/incomplete abriu correctamente, apresentou o aviso de informação em falta e o estado 0 registos, sem introduzir dados de teste ou fictícios.

- 2026-08-13: Actividades abriu com uma actividade real em estado Planeada e com os controlos Editar, Finalizar e Eliminar. O formulário Nova actividade mostrou nome, data, horários, local, tipo, público-alvo, tema, Pregador/Preletor, referência bíblica, opção religiosa e comissão.

- 2026-08-13: Louvor abriu com as abas Membros de Louvor e Escalas Musicais. A aba de escalas mostrou a descrição de selecção múltipla e validação individual de comparecimento, o botão Adicionar à escala e o estado vazio sem dados fictícios.
