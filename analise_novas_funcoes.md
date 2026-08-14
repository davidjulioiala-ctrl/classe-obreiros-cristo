# Análise das novas funções solicitadas

## Objectivo

Este documento avalia as funções descritas no ficheiro enviado, considerando o estado actual do sistema Classe Obreiros de Cristo. A análise distingue correcções simples, extensões médias e funcionalidades estruturais que exigem alterações ao modelo de dados. **Nenhuma implementação deve começar antes da validação explícita do administrador.**

## Opinião geral

As propostas são coerentes com a evolução de um sistema de gestão eclesiástica mais auditável e orientado para histórico. A prioridade deve ser preservar os dados existentes e separar claramente três conceitos: **dados activos**, **histórico imutável** e **operações agendadas**. Recomendo não implementar todas as funções numa única alteração, porque transferências agendadas, edição pós-finalização, notificações, backup automático e histórico financeiro têm impacto transversal e podem introduzir riscos se forem tratados apenas no frontend.

A minha recomendação é aprovar a direcção geral, mas executar em fases. Primeiro devem ser corrigidos os fluxos actualmente incompletos e as melhorias de consulta/exportação. Depois devem ser introduzidos os novos registos de auditoria e de transferência em lote. Por fim devem ser tratados agendamento, notificações e backup automático, com testes de falha e recuperação.

## Classificação das funções

| Área | Função proposta | Estado provável | Complexidade | Recomendação |
|---|---|---:|---:|---|
| Membros | Exportação horizontal A4, tabela e filtros | Existe exportação PDF/CSV/XLSX com colunas seleccionáveis; precisa de refinamento | Média | Implementar primeiro |
| Campos em falta | Abrir directamente o formulário do membro a editar | O botão actual encaminha para `/members` | Baixa | Implementar primeiro |
| Presença | Filtros por pessoa, actividade, tipo e data | A página actual está centrada numa actividade | Média/Alta | Criar consulta histórica separada ou modo de pesquisa |
| Presença | Atalhos para as últimas 7 actividades | Não é o fluxo principal actual | Média | Implementar depois dos filtros base |
| Actividades | Mostrar apenas as últimas 7, com acesso por nome | A lista actual tem pesquisa e ordenação | Baixa/Média | Confirmar se “últimas 7” é limite inicial ou filtro fixo |
| Actividades | Editar depois de finalizada apenas pelo administrador, com motivo | O schema actual não tem histórico de edição pós-finalização | Alta | Criar tabela de revisões/auditoria antes da UI |
| Finanças | Mostrar nome do utilizador em vez de “has” | Correcção de apresentação e mapeamento do responsável | Baixa/Média | Implementar com validação de permissões |
| Transferências | Retirar transferidos dos membros activos, mantendo histórico | Parcialmente previsto, mas requer regra única de estado e contagens | Média | Implementar com transacção e testes |
| Transferências | Atribuir nova função depois da transferência | Requer histórico de cargos para não perder a função anterior | Média/Alta | Implementar junto com o histórico |
| Transferências | Registos com nome, data e detalhe dos membros transferidos | O modelo actual tem linhas por membro, sem lote nomeado | Alta | Criar “processo de transferência”/lote |
| Transferências | Agendar uma transferência para data futura | É uma operação automática e não deve usar temporizadores no processo web | Alta | Implementar com tarefa agendada persistente e idempotente |
| Transferências | Ao processar, encontrar automaticamente pessoas com idade >=18 e validar uma a uma | O fluxo de revisão de adultos já existe parcialmente | Média | Manter o fluxo, removendo a selecção manual inicial de nomes |
| Histórico | Filtrar por nome, cargo e estado | O histórico precisa de uma fonte de dados central | Média | Implementar depois de consolidar eventos de cargo/estado |
| Relatórios | Mostrar os últimos 7 relatórios/atas | Os registos existem, mas é necessário ordenar e limitar | Baixa | Implementar primeiro |
| Louvor | Mostrar nomes de actividades e abrir a actividade para fazer escala | A escala deve ficar vinculada à actividade | Média | Implementar com validação de actividade e confirmação |
| Definições | Corrigir Negrito, Itálico e Sublinhado | Já foi corrigido anteriormente, mas deve ser novamente testado | Baixa | Fazer regressão, não reescrever sem reproduzir |
| Notificações | Corrigir entrega e avisar quando a preferência for alterada | Requer distinguir preferência guardada de notificação efectiva | Média/Alta | Definir canais e eventos antes de implementar |
| Aparência | Corrigir modo claro/escuro | Já houve alterações recentes; não confundir com cor do texto | Baixa | Testar separadamente da paleta textual |
| Utilizadores | Mudar senha | A função deve invalidar sessões antigas e exigir política segura | Média | Implementar com confirmação e expiração opcional |
| Backup | Corrigir backup automático | Já existe conceito de agendamento, mas precisa de diagnóstico | Alta | Priorizar segurança, idempotência e restauração testada |
| Logs | Eliminação múltipla de logs | Extensão de UI, router e auditoria | Média | Implementar com selecção, confirmação e limite de lote |

## Pontos que precisam de decisão antes do desenvolvimento

### 1. Exportação de membros

Recomendo que o PDF seja A4 horizontal, com tabela paginada, cabeçalho configurável e filtros aplicados antes da exportação. É necessário confirmar se o filtro deve incluir apenas os resultados da pesquisa actual ou também estado, grupo, cargo, género e intervalo de datas. Também deve ser decidido se os campos sensíveis, como telefone e email, aparecem por padrão ou exigem selecção explícita.

### 2. Edição de actividades finalizadas

Esta função é importante, mas não deve sobrescrever silenciosamente a actividade. Recomendo guardar: utilizador administrador, data/hora, motivo obrigatório, campos alterados e valores anterior/novo. A página pública da actividade deve mostrar um aviso de que houve uma revisão, mas **não recomendo expor valores antigos ou detalhes sensíveis de auditoria a qualquer utilizador**. O administrador deve poder consultar o detalhe completo.

### 3. Transferências

A proposta de substituir a selecção inicial manual por um processo que encontra automaticamente todos os membros com idade igual ou superior a 18 anos é boa e reduz omissões. No entanto, o processo deve continuar a apresentar uma lista de revisão antes de qualquer alteração. Recomendo criar um lote com nome, data prevista, data de execução, estado e motivo comum; depois associar os membros aprovados ao lote. A execução deve ser transaccional: ou actualiza todos os aprovados e grava o histórico, ou não altera nenhum.

Para transferências agendadas, é necessário confirmar se a data representa o início do dia local da congregação ou uma hora específica. O sistema deverá guardar a timezone configurada, impedir execução duplicada e permitir cancelar um agendamento antes da data.

### 4. Presenças e “últimas 7”

A funcionalidade é útil, mas “últimas 7” pode significar duas coisas diferentes: mostrar apenas sete actividades no ecrã ou oferecer sete atalhos rápidos mantendo a pesquisa completa. Recomendo a segunda opção: sete cartões de acesso rápido no topo, sem limitar a pesquisa histórica. Assim não se perdem presenças antigas.

### 5. Notificações

É preciso definir o que significa “receber uma notificação”: alerta dentro do sistema, email, ou ambos. Recomendo começar com notificações internas persistentes, com evento, destinatário, data, estado lido/não lido e preferência por tipo. A alteração de uma preferência deve gerar um registo de confirmação apenas para o próprio utilizador, sem criar um ciclo de notificações.

### 6. Backup automático

Esta é a função de maior risco operacional. O backup deve ser executado por uma tarefa persistente no servidor, e não por `setInterval` no processo web. Deve haver um registo de cada execução, estado, duração, destino, tamanho e erro. O sistema deve impedir dois backups iguais em simultâneo, guardar pelo menos uma versão verificável e testar restauração antes de apresentar o backup como válido.

Também é necessário confirmar se o backup local significa descarregar para o dispositivo do administrador ou guardar no armazenamento do servidor. Um website não pode escrever directamente numa pasta arbitrária do computador do utilizador sem uma acção explícita de download.

### 7. Eliminação múltipla de logs

Recomendo selecção por caixas, “seleccionar todos os resultados desta página”, contador de itens, confirmação com a palavra `ELIMINAR` para lotes grandes e limite de quantidade por operação. A eliminação deve ser exclusiva para administradores e gerar um log de meta-auditoria, sem criar um ciclo infinito de logs eliminados.

## Ordem de implementação recomendada

| Fase | Conteúdo | Motivo |
|---|---|---|
| Fase 1 | Exportação A4 e filtros de membros; edição directa de Campos em falta; últimos 7 relatórios/actividades; filtros de presença; eliminação múltipla de logs | Melhorias de consulta e UX com baixo risco de dados |
| Fase 2 | Estado de transferência, histórico de cargos, processo nomeado e revisão automática de maiores de idade; escala de louvor por actividade | Consolidação do domínio e rastreabilidade |
| Fase 3 | Edição pós-finalização com motivo e revisões; histórico filtrável | Requer auditoria e alterações de schema |
| Fase 4 | Notificações internas e mudança de senha | Requer eventos, sessões e preferências consistentes |
| Fase 5 | Backup automático e transferências agendadas | Requer tarefas persistentes, idempotência, recuperação e definição de timezone |

## Riscos principais

| Risco | Consequência | Mitigação |
|---|---|---|
| Alterar estado de membro sem transacção | Contagens activas incorrectas ou dados parcialmente transferidos | Transacção, histórico e testes de rollback |
| Editar actividade finalizada sem revisão | Perda de confiança e impossibilidade de auditoria | Tabela de revisões, motivo obrigatório e permissões de administrador |
| Backup automático duplicado ou incompleto | Falsa sensação de recuperação | Idempotência, checksum/validação e teste de restauração |
| Notificações duplicadas | Fadiga e confusão dos utilizadores | Chave de deduplicação por evento e destinatário |
| Eliminação de logs sem controlo | Perda de evidência de segurança | Apenas administrador, confirmação forte e meta-auditoria |
| Agendamento baseado em hora do servidor | Execução em hora errada | Guardar timezone e converter para UTC |
| Exposição excessiva no PDF | Divulgação de dados pessoais | Colunas seleccionáveis, permissões e confirmação de campos sensíveis |

## Aprovação solicitada

Antes de iniciar o desenvolvimento, solicito a validação destas decisões:

1. **Exportação de membros:** confirmar os filtros obrigatórios e se telefone/email ficam excluídos por padrão.
2. **Actividades finalizadas:** confirmar que o motivo é obrigatório e se o histórico detalhado fica apenas para administradores.
3. **Transferências:** confirmar se deseja um processo nomeado em lote, com data prevista e estado (rascunho, agendado, executado, cancelado).
4. **Últimas 7:** confirmar que serão atalhos rápidos e que a pesquisa completa continuará disponível.
5. **Notificações:** escolher notificações internas, email ou ambas.
6. **Backup automático:** confirmar o destino pretendido: armazenamento do servidor, conta Google configurada ou download manual no dispositivo.
7. **Prioridade:** aprovar a execução faseada acima ou indicar outra ordem.

**Não iniciarei a implementação até receber a sua aprovação e eventuais alterações a estas decisões.**
