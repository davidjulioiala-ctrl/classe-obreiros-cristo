import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dashboardSource = readFileSync(fileURLToPath(new URL("./Dashboard.tsx", import.meta.url)), "utf8");

describe("filtro temporal do Dashboard", () => {
  it("apresenta datas inicial e final com limpeza e validação do intervalo", () => {
    expect(dashboardSource).toContain('const [dateFrom, setDateFrom] = useState("")');
    expect(dashboardSource).toContain('const [dateTo, setDateTo] = useState("")');
    expect(dashboardSource).toContain("dateRangeInvalid");
    expect(dashboardSource).toContain('type="date"');
    expect(dashboardSource).toContain("Limpar datas");
  });

  it("aplica o intervalo aos gráficos de membros, grupos, género e participação", () => {
    expect(dashboardSource).toContain("chartMembers");
    expect(dashboardSource).toContain("groupChartData");
    expect(dashboardSource).toContain("genderData");
    expect(dashboardSource).toContain("participationByType.useQuery");
    expect(dashboardSource).toContain("startDate: dateFrom || undefined");
    expect(dashboardSource).toContain("endDate: dateTo || undefined");
  });

  it("apresenta destaques de activos e inactivos com limiar configurável e acesso às últimas sete actividades", () => {
    expect(dashboardSource).toContain("participationThresholdConfig");
    expect(dashboardSource).toContain("memberParticipationHighlights.useQuery(");
    expect(dashboardSource).toContain("threshold: participationThresholdConfig, recentLimit: 7, startDate: dateFrom || undefined, endDate: dateTo || undefined");
    expect(dashboardSource).toContain("participationLabels.active");
    expect(dashboardSource).toContain("participationLabels.inactive");
    expect(dashboardSource).toContain('activeHighlightLabel');
    expect(dashboardSource).toContain('inactiveHighlightLabel');
    expect(dashboardSource).toContain('setParticipationGroup("active")');
    expect(dashboardSource).toContain('setParticipationGroup("inactive")');
    expect(dashboardSource).toContain("Últimas 7 actividades frequentadas");
    expect(dashboardSource).toContain("participation-member-search");
    expect(dashboardSource).toContain("participation-sex-filter");
    expect(dashboardSource).toContain("participation-group-filter");
    expect(dashboardSource).toContain("participation-sort");
    expect(dashboardSource).toContain("filterAndSortParticipationMembers");
    expect(dashboardSource).toContain("shadow-[0_0_0_1px_rgba(147,197,253,0.18)]");
    expect(dashboardSource).toContain("participationStatus: participationGroup");
    expect(dashboardSource).toContain("Exportar PDF");
    expect(dashboardSource).toContain("Exportar CSV");
    expect(dashboardSource).toContain("Exportar Excel");
  });
});
