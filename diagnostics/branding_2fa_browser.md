# Diagnóstico de branding e 2FA — 2026-08-15

A pré-visualização `https://3000-ijxyrl810599qbcqe0wbb-803ccf44.us1.manus.computer/users` redireciona para o login quando não há sessão local.

O conteúdo extraído e a segunda captura confirmaram que o nome persistido `ESCOLA BIBLICA DOMINICAL` e o logótipo configurado aparecem no login, incluindo o rodapé. Isto indica que o endpoint público de branding funciona pelo menos no ecrã de autenticação.

A captura inicial parecia mostrar o nome antigo, mas a atualização seguinte mostrou o nome novo; deve ser evitada qualquer conclusão baseada numa captura imediatamente anterior à hidratação.

O ecrã público não permitiu reproduzir a ativação 2FA porque não havia sessão autenticada disponível no navegador.
