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
- [ ] Implementar registo de convidados vinculados a membros

## Fase 3: Gestão de Atividades
- [x] Criar schema de atividades (nome, data, tipo, preletor, comissão)
- [x] Implementar formulário de criação de atividades
- [ ] Criar sistema de comissões (opcional por atividade)
- [ ] Implementar registo de presenças por membro
- [ ] Criar análise de presenças por grupo e sexo
- [x] Implementar gráficos de participação com Recharts

## Fase 4: Módulo Financeiro
- [x] Criar schema de cotas mensais (janeiro a dezembro, 100 XOF)
- [x] Implementar registo de cotas por membro
- [x] Criar sistema de outras receitas (campo livre)
- [x] Implementar registo de despesas com sequência automática
- [x] Criar dashboard financeiro com saldo total
- [ ] Implementar histórico completo de transações
- [x] Restringir acesso a Líderes apenas

## Fase 5: Módulo de Transferências
- [ ] Criar schema de transferências de membros
- [ ] Implementar fluxo de transferência com etapa intermédia
- [ ] Criar funcionalidade de adicionar/remover membros da lista de transferência
- [ ] Implementar histórico de transferências com motivo
- [ ] Criar relatório de transferências em PDF

## Fase 6: Relatórios e Atas
- [ ] Implementar geração de atas para atividades (1 dia)
- [ ] Implementar geração de relatórios para atividades (>1 dia)
- [ ] Criar exportação em PDF com layout A4 horizontal
- [ ] Implementar download de relatórios por Líderes e Oficiais
- [ ] Criar histórico de relatórios gerados

## Fase 7: Dashboard Principal
- [x] Implementar cards de estatísticas (membros, presenças, atividades, cotas)
- [x] Criar gráficos com Recharts (presenças semanais, contribuições, participação)
- [x] Implementar feed de atividade recente
- [x] Criar widgets de resumo (próximas atividades, membros recentes, pagamentos)
- [ ] Implementar painel lateral direito com perfil e calendário

## Fase 8: Interface e UX
- [x] Implementar tema visual elegante e profissional
- [x] Criar animações suaves com Framer Motion
- [x] Implementar responsividade para desktop, tablet e mobile
- [x] Criar notificações e toasts para feedback do utilizador
- [ ] Implementar modo dark/light (opcional)

## Fase 9: Integrações e Finalização
- [ ] Testar fluxos completos de utilizador
- [ ] Implementar validações de dados
- [ ] Criar testes unitários com Vitest
- [ ] Otimizar performance e carregamento
- [ ] Preparar para publicação

## Notas Importantes
- Idioma: Português Europeu em toda a interface
- Design: Elegante, refinado, com espaçamentos generosos
- Gráficos: Recharts para todas as visualizações
- Relatórios: Exportáveis em PDF, formato A4 horizontal
- Dados: Guardados em nuvem (MySQL/TiDB)
- Hierarquia: Líderes têm acesso completo, Oficiais acesso limitado, Louvor acesso restrito
