import { describe, expect, it } from "vitest";
import { isPreviewableActivityDocument } from "./activityDocumentRoute";

describe("activity document preview policy", () => {
  it("permite pré-visualização apenas de documentos PDF", () => {
    expect(isPreviewableActivityDocument("application/pdf")).toBe(true);
    expect(isPreviewableActivityDocument("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(false);
    expect(isPreviewableActivityDocument("text/plain")).toBe(false);
  });
});
