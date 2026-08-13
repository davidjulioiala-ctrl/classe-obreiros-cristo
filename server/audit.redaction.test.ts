import { describe, expect, it } from "vitest";
import { sanitizeAuditDetails } from "./db";

describe("audit detail redaction", () => {
  it("redacts sensitive keys in structured details", () => {
    const result = sanitizeAuditDetails(
      JSON.stringify({ username: "admin", password: "super-secret", nested: { token: "token-value" } }),
    );

    expect(result).toContain('"username":"admin"');
    expect(result).toContain('"password":"[REDACTED]"');
    expect(result).toContain('"token":"[REDACTED]"');
    expect(result).not.toContain("super-secret");
    expect(result).not.toContain("token-value");
  });

  it("redacts sensitive values in non-JSON details", () => {
    const result = sanitizeAuditDetails("password=super-secret authorization=Bearer-secret");

    expect(result).toBe("password=[REDACTED] authorization=[REDACTED]");
  });
});
