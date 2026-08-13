# Notas de validação visual

Em 13/08/2026, após reiniciar o servidor, a pré-visualização carregou sem o erro antigo de resolução de `MemberHistory`. A dashboard apresentou a navegação funcional para Dashboard, Membros, Presenças, Atividades, Finanças, Transferências, Histórico, Relatórios, Louvor, Configurações e Auditoria e backup. A dashboard mostrou dados reais do sistema, com cinco grupos operacionais e os cartões de membros, atividades e quotas.

A página foi aberta com sessão local já autenticada como Administrador/Líder. A interface de desktop mostrou sidebar persistente, conteúdo legível e adaptação visual geral adequada. O banner inferior indicou que a página estava em Preview Mode, sem afetar a aplicação.

A página de Presenças abriu corretamente e apresentou o seletor de atividade e a mensagem orientadora quando nenhuma atividade foi escolhida. A página de Membros abriu corretamente, com botões de gestão de grupos e novo membro. A listagem mostrou o formato `Líder · Masculino · Idade: — · Grupo: David`, confirmando que a idade está prevista na listagem, mas o registo existente não tem data de nascimento preenchida. O botão `Novo membro` ficou disponível para testar o formulário.

Após a melhoria do formulário, a página mostrou um campo `Idade` identificado, somente leitura, com o placeholder `Calculada automaticamente`, ao lado da data de nascimento. O campo está acessível e não altera os dados persistidos; a idade continua a ser derivada da data atual.

As rotas `/history` e `/louvor` abriram sem 404. O Histórico mostrou pesquisa por membro/cargo/detalhe e o estado vazio, sem dados fictícios. O Louvor mostrou as abas `Membros de Louvor` e `Escalas Musicais`, o botão `Novo membro de louvor` e o estado vazio, preservando o fluxo dedicado de música.

A sessão do navegador persistiu ao visitar `/`, portanto a pré-visualização interativa continuou a mostrar a dashboard autenticada. A validação isolada anterior em viewport mobile tinha revelado os placeholders `admin` e `admin123`; estes foram substituídos por `Nome de utilizador` e `Introduza a sua senha` no código, sem alterar a autenticação nem os valores dos campos, que permanecem vazios.

A validação HTTP local autenticou o administrador com resposta 200 e o endpoint `/api/transfers/adult-pdf?ids=1&reason=...` devolveu `Content-Type: application/pdf`, resposta 200 e um ficheiro PDF válido. `pdfinfo` confirmou 1 página com dimensão `841.89 x 595.28 pts (A4)`, ou seja, orientação horizontal. A rota foi ajustada para consultar também membros inativos, porque a transferência os inativa antes do descarregamento automático.

A página autenticada de Transferências está acessível, mostra o botão `Processar transferência`, a listagem de membros, seleção e histórico. A pré-visualização de gestão permaneceu em modo não partilhável e não refletiu o clique do botão, embora a rota e o componente estejam presentes; a lógica foi validada por TypeScript, testes e chamadas HTTP. Nenhum dado foi alterado durante esta verificação.
