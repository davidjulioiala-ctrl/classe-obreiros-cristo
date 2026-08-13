# Validação da arquitetura de grupos — 13 de agosto de 2026

A autenticação local foi validada na pré-visualização: após o login administrativo, o router abriu o dashboard com a sessão local ativa.

A página `/members` respondeu com a listagem vazia e sem erro, mostrando o estado correto de ausência de membros. Ao abrir o formulário de novo membro, o seletor de grupo carregou as opções de distribuição automática, Convidados, Grupo A, Grupo B, Grupo C e Grupo D. A opção de convidado também ficou visível e indica o encaminhamento para o grupo de convidados.

Não foi criado nenhum membro de teste, para preservar a base de dados sem dados fictícios.

A gestão de utilizadores também foi aberta com a sessão local ativa e carregou o utilizador administrativo existente, com ações de editar e eliminar e o botão de novo utilizador visíveis. Nenhuma alteração foi submetida durante a validação para não introduzir dados fictícios.

Na edição do administrador, o campo “Utilizador (Código)” apareceu preenchido e editável, juntamente com o campo de senha opcional, função eclesiástica, papel e estado. O editor foi fechado pelo botão “Cancelar”, sem alterar nem criar dados.
