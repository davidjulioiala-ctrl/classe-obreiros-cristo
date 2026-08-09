# Classe Obreiros de Cristo - TODO

## Fase 1: Autenticação e Hierarquia
- [x] Implementar modelo de dados de utilizadores com roles (Líder, Oficial, Líder de Louvor)
- [x] Criar página de login com identidade visual e animações
- [x] Implementar autenticação OAuth com Manus
- [x] Criar dashboard layout com sidebar colapsível
- [x] Implementar controlo de acesso por papel (RBAC)

## Fase 2: Gestão de Membros
- [x] Criar schema de membros (nome, sexo, contacto, grupo, cargo)
- [x] Implementar cadastro de membros com validação
- [x] Criar sistema de grupos automáticos
- [x] Implementar pesquisa e filtros avançados de membros
- [x] Criar listagem de membros com edição inline
- [x] Implementar registo de convidados vinculados a membros

## Fase 3: Gestão de Atividades
- [x] Criar schema de atividades (nome, data, tipo, preletor, comissão)
- [x] Implementar formulário de criação de atividades
- [x] Criar sistema de comissões (opcional por atividade)
- [x] Implementar registo de presenças por membro
- [x] Criar análise de presenças por grupo e sexo
- [x] Implementar gráficos de participação com Recharts

## Fase 4: Módulo Financeiro
- [x] Criar schema de cotas mensais (janeiro a dezembro, 100 XOF)
- [x] Implementar registo de cotas por membro
- [x] Criar sistema de outras receitas (campo livre)
- [x] Implementar registo de despesas com sequência automática
- [x] Criar dashboard financeiro com saldo total
- [x] Implementar histórico completo de transações
- [x] Restringir acesso a Líderes apenas

## Fase 5: Módulo de Transferências
- [x] Criar schema de transferências de membros
- [x] Implementar fluxo de transferência com etapa intermédia
- [x] Criar funcionalidade de adicionar/remover membros da lista de transferência
- [x] Implementar histórico de transferências com motivo
- [x] Criar relatório de transferências em PDF

## Fase 6: Relatórios e Atas
- [x] Implementar geração de atas para atividades (1 dia)
- [x] Implementar geração de relatórios para atividades (>1 dia)
- [x] Criar exportação em PDF com layout A4 horizontal
- [x] Implementar download de relatórios por Líderes e Oficiais
- [x] Criar histórico de relatórios gerados

## Fase 7: Dashboard Principal
- [x] Implementar cards de estatísticas (membros, presenças, atividades, cotas)
- [x] Criar gráficos com Recharts (presenças semanais, contribuições, participação)
- [x] Implementar feed de atividade recente
- [x] Criar widgets de resumo (próximas atividades, membros recentes, pagamentos)
- [x] Implementar painel lateral direito com perfil e calendário

## Fase 8: Interface e UX
- [x] Implementar tema visual elegante e profissional
- [x] Criar animações suaves com Framer Motion
- [x] Implementar responsividade para desktop, tablet e mobile
- [x] Criar notificações e toasts para feedback do utilizador
- [x] Implementar modo dark/light (opcional)

## Fase 9: Integrações e Finalização
- [x] Testar fluxos completos de utilizador
- [x] Implementar validações de dados
- [x] Criar testes unitários com Vitest
- [x] Otimizar performance e carregamento
- [x] Preparar para publicação

## Notas Importantes
- Idioma: Português Europeu em toda a interface
- Design: Elegante, refinado, com espaçamentos generosos
- Gráficos: Recharts para todas as visualizações
- Relatórios: Exportáveis em PDF, formato A4 horizontal
- Dados: Guardados em nuvem (MySQL/TiDB)
- Hierarquia: Líderes têm acesso completo, Oficiais acesso limitado, Louvor acesso restrito


## Fase 10: Sistema de Login Local
- [x] Criar schema com campos de autenticação local (username, password)
- [x] Implementar helpers de autenticação com hash de senha
- [x] Criar procedimentos tRPC para login e CRUD de utilizadores
- [x] Criar página de login local com formulário
- [x] Implementar página de gestão de utilizadores com CRUD completo
- [x] Adicionar menu de utilizadores ao sidebar
- [x] Integrar autenticação local no fluxo da aplicação
- [ ] Criar endpoint de login local (/api/auth/login)
- [ ] Implementar sessões com cookies
- [ ] Testar fluxo completo de login e CRUD
