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

## Validação visual — ciclo de segurança — 13/08/2026

A pré-visualização abriu em `/` com o login local como primeira página. Os campos de utilizador e senha aparecem vazios, sem credenciais fixas visíveis. O cartão central apresenta boa hierarquia visual, contraste adequado, foco visível e botão Entrar acessível. O endpoint de bootstrap não mostrou o link de primeiro acesso porque a base de dados já contém pelo menos um utilizador, o que corresponde à regra de bloqueio após a primeira conta.

A captura mostrou uma faixa de Preview mode no rodapé da pré-visualização; esta é chrome da ferramenta e não parte da aplicação. A página não revelou erros de renderização no conteúdo extraído.

## Capturas responsivas — ciclo de segurança — 13/08/2026

A captura desktop (1280×720) confirmou um cartão de login centrado, campos vazios, contrastes legíveis e botão Entrar com largura adequada. A captura mobile (375×812) confirmou que o cartão se adapta à largura disponível, os campos permanecem utilizáveis, o texto não é cortado e não existe overflow horizontal. O estado normal do sistema não apresenta a faixa de manutenção porque a manutenção está desactivada na base de dados.

## Regressão de login — 2026-08-13
- O caminho de credenciais inválidas no preview mostrou apenas a mensagem segura "Credenciais inválidas" e não gerou erros no console.
- A transição pós-login não pôde ser reproduzida com sucesso porque as credenciais existentes no ambiente não foram aceites; foi confirmada a existência de contas administrativas na base de dados sem expor hashes ou segredos.
- A análise independente identificou como causa provável de alta confiança o uso de `useTheme` de `next-themes` no Sonner enquanto o App usa o `ThemeProvider` local.
- Correcções aplicadas: Sonner agora lê `useTheme` de `@/contexts/ThemeContext`; removido o Toaster duplicado do layout autenticado; substituída a recarga completa por navegação SPA após login/2FA.
- Typecheck, testes de autenticação/logout e build de produção passaram após as correcções.

- Após o alinhamento do Sonner com o ThemeProvider local, as capturas desktop (1280×720) e mobile (375×812) mostram o login estável, legível, sem overflow e sem credenciais predefinidas visíveis.

## Regressão pós-login — sessão partilhada — 2026-08-13
- A causa identificada foi a existência de duas instâncias independentes de `useLocalAuth`: o `Router` mantinha `user=null` enquanto `LocalLogin` actualizava apenas o seu próprio estado após a resposta 200.
- Foi criado `LocalAuthProvider` com contexto único e o provider foi colocado na raiz do `App`, permitindo que o `Router` e o `LocalLogin` partilhem a mesma sessão.
- Typecheck, testes de autenticação/2FA, teste de regressão do fluxo e build passaram. As capturas desktop (1280×720) e mobile (375×812) continuam legíveis, sem overflow e com os campos de login vazios.
- A validação funcional de credenciais válidas no browser depende de uma credencial administrativa fornecida pelo responsável; os testes automatizados cobrem a resposta de login, a criação do estado de sessão e a navegação SPA sem usar credenciais fictícias.

## Validação da continuação — 13/08/2026

- O primeiro ecrã (`/`) apresenta exclusivamente o formulário de autenticação local com Utilizador, Senha e botão Entrar; não mostra Google, Manus ou OAuth.
- A captura em 375x812 confirma que o formulário de login local é responsivo e permanece utilizável em telemóvel.
- A tentativa HTTP com `admin/admin123` foi rejeitada porque a conta `admin` existente na base de dados está inactiva (`isActive=0`). Não foi alterada a base de dados para reactivar uma credencial histórica fraca.
- A base de dados contém também o administrador local activo `dany` (`isActive=1`); a palavra-passe não foi consultada nem exposta.
- `pnpm check` passou; `pnpm test` passou com 15 ficheiros e 40 testes; `pnpm build` passou.
- O teste de adulteração AES-256-GCM foi corrigido para alterar um carácter significativo do payload Base64URL, evitando os bits de preenchimento não autenticados do último carácter.


## Estabilização das operações — 2026-08-13

Os logs anteriores mostravam `TRPCClientError: Please login (10001)` durante consultas protegidas e `JWSInvalid: Invalid Compact JWS` no servidor. A causa foi confirmada no transporte: o cliente lia `sessionStorage.manus-cookie` e enviava o valor como `Authorization: Bearer`, enquanto a autenticação local usa um token HMAC próprio no cookie `app_session_id`, não um JWT Compact JWS.

A correcção removeu esse fallback do cliente tRPC, centralizou a política em `client/src/lib/localTrpcHeaders.ts` e alterou `server/_core/context.ts` para resolver exclusivamente `getLocalUserFromRequest`. Assim, as chamadas protegidas usam apenas o cookie local enviado por `credentials: include`, sem tentativa de validação OAuth.

Após a correcção, `pnpm check`, `pnpm test` e `pnpm build` passaram. A suite ficou com 17 ficheiros e 44 testes aprovados. O servidor reiniciado arrancou sem novos erros de transformação; os erros JWS e `Please login` observados no log são anteriores ao reinício/correcção. Foi acrescentada uma regressão em `server/loginTransition.test.ts` e um teste directo de `localTrpcHeaders`.
