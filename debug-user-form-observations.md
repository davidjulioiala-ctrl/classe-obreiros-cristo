# Diagnóstico do formulário de criação de utilizadores

Data: 2026-08-16
Pré-visualização: https://3000-inro5de3xymepervtf0fe-5675b718.us4.manus.computer

## Reprodução observada

- O login com a conta administrativa padrão abriu o painel corretamente.
- A página `/users` abriu corretamente na pré-visualização.
- O botão `Novo utilizador` abriu o modal sem quebrar.
- Os campos username, password, nome e email aceitaram dados de teste sem erro visual.
- O seletor de função eclesiástica aceitou a opção `Oficial` sem erro visual.
- O seletor de papel do sistema ainda não foi submetido.
- O formulário não foi submetido para não criar dados de teste na base de dados.

## Dados de teste usados apenas no formulário

- username: `debug.user.20260816`
- password: `DebugPass123!`
- nome: `Utilizador de Diagnóstico`
- email: `debug.user.20260816@example.test`

## Logs observados

- O log de rede mostrou chamadas `/api/auth/me` com `401 Not authenticated` quando a página iniciou sem sessão; depois do login, o painel carregou.
- O `devserver.log` não apresentou erro recente específico de `createUser`, `churchRole`, Zod ou base de dados; apenas entradas antigas de encerramento de processo.
- A execução de `pnpm tsc` terminou sem erro. O comando `pnpm vit` falhou apenas porque o script/comando não existe; `pnpm test` foi executado corretamente e passou: 56 ficheiros, 220 testes.

## Estado do diagnóstico

A falha ainda não foi reproduzida ao preencher os campos básicos nem ao selecionar `Oficial`. É necessário testar o papel `Administrador`, todos os valores de função e o envio controlado, idealmente com uma transação/fixture de teste, antes de concluir a causa.

## Fonte

A evidência foi recolhida diretamente da pré-visualização acima e dos ficheiros locais `.manus-logs/devserver.log`, `.manus-logs/browserConsole.log` e `.manus-logs/networkRequests.log`.

> Não guardar nem reutilizar a senha de teste; ela foi usada somente durante esta sessão de depuração.

> Nota de segurança: o formulário não foi submetido, portanto não houve criação de utilizador de teste.


## Testes adicionais

- O papel `Administrador` também foi selecionado sem erro visual ou erro na consola.
- A consola do navegador permaneceu sem mensagens de erro depois do preenchimento e das seleções.
- O erro ainda não foi reproduzido apenas com a interação local; o próximo ponto de diagnóstico é o submit controlado e a resposta tRPC, com limpeza imediata de qualquer registo se ocorrer criação acidental.

