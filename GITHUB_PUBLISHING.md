# Publicação no GitHub

O repositório externo oficial deste projecto é [`davidjulioiala-ctrl/classe-obreiros-cristo`](https://github.com/davidjulioiala-ctrl/classe-obreiros-cristo). Mantém-se a origem interna de checkpoints como `origin`; o remoto `github` é utilizado para a cópia versionada no GitHub.

Depois de cada checkpoint validado e publicado, deve confirmar-se que o commit foi enviado ao GitHub com os comandos seguintes:

```bash
git push github main
git ls-remote github refs/heads/main
```

O valor devolvido pelo segundo comando deve coincidir com `git rev-parse HEAD`. Não devem ser enviados para o GitHub ficheiros `.env`, segredos, credenciais SMTP nem dados de produção. Antes de publicar, a alteração deve passar pelos testes, pela verificação de tipos e pelo build aplicáveis.
