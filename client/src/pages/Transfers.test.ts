import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const transfersSource = readFileSync(fileURLToPath(new URL("./Transfers.tsx", import.meta.url)), "utf8");

describe("processamento de transferências", () => {
  it("liga o botão à execução da revisão de membros elegíveis", () => {
    expect(transfersSource).toContain("onClick={() => void openAdultProcess()}");
    expect(transfersSource).not.toContain("onClick={() => void openAdultProcess}");
  });

  it("abre o painel antes de consultar e fecha-o quando a revisão falha", () => {
    expect(transfersSource).toContain("setShowAdultProcess(true)");
    expect(transfersSource).toContain("const result = await reviewQuery.refetch()");
    expect(transfersSource).toContain("if (result.error)");
    expect(transfersSource).toContain("setShowAdultProcess(false)");
  });
});
