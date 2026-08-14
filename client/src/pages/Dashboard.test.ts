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

  it("apresenta destaques de activos e inactivos com o limiar de 60% e acesso às últimas sete actividades", () => {
    expect(dashboardSource).toContain("memberParticipationHighlights.useQuery({ threshold: 60, recentLimit: 7 })");
    expect(dashboardSource).toContain("Membros activos por participação");
    expect(dashboardSource).toContain("Membros inactivos por participação");
    expect(dashboardSource).toContain('setParticipationGroup("active")');
    expect(dashboardSource).toContain('setParticipationGroup("inactive")');
    expect(dashboardSource).toContain("Últimas 7 actividades frequentadas");
  });
});
