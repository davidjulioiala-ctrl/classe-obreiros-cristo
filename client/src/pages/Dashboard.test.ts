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
});
