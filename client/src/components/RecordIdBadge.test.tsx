import { describe, expect, it } from "vitest";
import { RecordIdBadge } from "./RecordIdBadge";

describe("RecordIdBadge", () => {
  it("renderiza o primeiro ID de cada submenu como #1", () => {
    const element = RecordIdBadge({ id: 1 });

    expect(element.props.children).toEqual(["ID", " #", 1]);
    expect(element.props["aria-label"]).toBe("ID 1");
  });

  it("permite distinguir uma sequência própria pelo rótulo", () => {
    const element = RecordIdBadge({ id: 7, label: "Relatório" });

    expect(element.props.children).toEqual(["Relatório", " #", 7]);
    expect(element.props["aria-label"]).toBe("Relatório 7");
  });
});
