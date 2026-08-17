import { describe, expect, it } from "vitest";

describe("Resend credentials", () => {
  it("accepts the configured API key without sending an email", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !/^re_/.test(apiKey)) {
      return;
    }

    const response = await fetch("https://api.resend.com/domains?limit=1", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    expect(response.status, await response.text()).toBe(200);
  }, 15_000);
});
