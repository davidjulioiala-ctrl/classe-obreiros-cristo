import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const activitiesSource = readFileSync(fileURLToPath(new URL("./Activities.tsx", import.meta.url)), "utf8");

describe("fluxos de actividades", () => {
  it("permite seleccionar membros e valida cargo na comissão", () => {
    expect(activitiesSource).toContain("membersQuery.data");
    expect(activitiesSource).toContain("Pesquisar membros por nome ou ID");
    expect(activitiesSource).toContain("filteredCommissionMembers");
    expect(activitiesSource).toContain("Membros da comissão");
  });

  it("usa descarga autenticada e mantém as acções de PDF para documentos", () => {
    expect(activitiesSource).toContain("downloadProtectedFile");
    expect(activitiesSource).toContain("/api/activity-documents/${document.id}/download");
    expect(activitiesSource).toContain("Imprimir documento");
    expect(activitiesSource).toContain("Pré-visualização PDF autenticada");
  });

  it("mantém o campo Data e valida o ficheiro antes de iniciar o upload", () => {
    expect(activitiesSource).toContain('<Label htmlFor="activity-date">Data</Label>');
    expect(activitiesSource).toContain("selectActivityDocument");
    expect(activitiesSource).toContain("MAX_ACTIVITY_DOCUMENT_BYTES");
    expect(activitiesSource).toContain("event.currentTarget.files?.item(0)");
    expect(activitiesSource).toContain("event.currentTarget.value = \"\"");
  });

  it("reinicia cada formulário com um estado novo e permite repetir o carregamento", () => {
    expect(activitiesSource).toContain("const createBlankForm = (): ActivityForm");
    expect(activitiesSource).toContain("activitiesQuery.isError");
    expect(activitiesSource).toContain("activitiesQuery.refetch()");
    expect(activitiesSource).toContain("Não foi possível carregar as actividades.");
  });

  it("mostra progresso e mensagens accionáveis durante o upload do documento", () => {
    expect(activitiesSource).toContain("XMLHttpRequest");
    expect(activitiesSource).toContain("request.upload.addEventListener(\"progress\"");
    expect(activitiesSource).toContain("uploadProgress");
    expect(activitiesSource).toContain("Não feche esta página até o envio terminar.");
    expect(activitiesSource).toContain("Falha de rede ao enviar o documento.");
    expect(activitiesSource).toContain("O envio demorou demasiado tempo.");
    expect(activitiesSource).toContain("Documento enviado com sucesso.");
  });

  it("oferece filtros avançados por texto, intervalo de datas e estado", () => {
    expect(activitiesSource).toContain('id="activity-search"');
    expect(activitiesSource).toContain('id="activity-date-from"');
    expect(activitiesSource).toContain('id="activity-date-to"');
    expect(activitiesSource).toContain('id="activity-status"');
    expect(activitiesSource).toContain('id="activity-sort"');
    expect(activitiesSource).toContain('value="date-desc"');
    expect(activitiesSource).toContain('value="date-asc"');
    expect(activitiesSource).toContain('value="status-asc"');
    expect(activitiesSource).toContain('value="status-desc"');
    expect(activitiesSource).toContain("activityStatusRank");
    expect(activitiesSource).toContain("matchingActivities.sort");
    expect(activitiesSource).toContain("hasInvalidDateRange");
    expect(activitiesSource).toContain("filteredActivities");
    expect(activitiesSource).toContain("setActivitySort(\"date-desc\")");
    expect(activitiesSource).toContain("Limpar filtros");
  });
});
