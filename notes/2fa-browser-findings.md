# Observações da validação visual 2FA

Em 15/08/2026, a versão publicada abriu correctamente a página de login local em `https://classegestao-8kngqmdx.manus.space/`. A página mostrou o logótipo e o nome configurado da organização, campos `Nome de utilizador` e `Introduza a sua senha`, e o botão `Entrar`. Não foi apresentado qualquer convite OAuth.

A validação seguinte deve autenticar uma conta local e abrir `Meu perfil e segurança`, onde o painel 2FA deve mostrar o estado opcional e o botão `Configurar 2FA`.

Após preencher `admin` e `admin123` e submeter o formulário publicado, a interface entrou em `A carregar...`. Esta verificação ocorreu antes de guardar/publicar as alterações locais do ciclo; deve ser repetida depois do checkpoint para validar a navegação ao perfil.

Na pré-visualização local corrigida, a página de login continua a apresentar a identidade da organização e os campos locais, sem OAuth. As credenciais de teste foram preenchidas com sucesso; a submissão será validada no passo seguinte.

Na pré-visualização corrigida, o login local foi concluído e abriu `/dashboard` sem erro de renderização. O menu da conta apresentou `Meu perfil e segurança`, confirmando que o acesso à configuração 2FA é alcançável depois da autenticação.

Após clicar em `Configurar 2FA`, surgiu o aviso `Configuração 2FA preparada. Guarde os códigos de recuperação.`, mas o browser não mostrou movimento de scroll nem o bloco de QR Code na área actualmente extraída. A consola do browser não apresentou erros. É necessário repetir a verificação numa captura da página completa após o servidor HMR estabilizar; o estado React pode estar abaixo do viewport ou o preview pode ter mantido a árvore anterior.

Após remover o `refresh()` do início do setup, a repetição na pré-visualização corrigida confirmou o resultado esperado: a página passou a ter 240 px abaixo do viewport, o conteúdo `1. Leia o QR Code`, a imagem QR, a chave manual, os códigos de recuperação e o campo `Código de 6 dígitos` ficaram visíveis. O endpoint `/api/auth/2fa/setup` respondeu 200; não houve desmontagem da rota.
