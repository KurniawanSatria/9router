import { describe, it, expect } from "vitest";
import { summarizeProviderError } from "../../open-sse/utils/error.js";

describe("summarizeProviderError", () => {
  it("unwraps the provider error body into code + message", () => {
    const body = JSON.stringify({
      code: "ads_required",
      message: "ads are paused",
      error: { code: "ads_required", message: "ads are paused", type: "free_pi_error" },
    });
    expect(summarizeProviderError(body)).toBe("ads_required: ads are paused");
  });

  it("collapses whitespace and caps long messages", () => {
    const text = summarizeProviderError(`line one\nline two ${"x".repeat(400)}`);
    expect(text.startsWith("line one line two")).toBe(true);
    expect(text.length).toBe(301);
    expect(text.endsWith("…")).toBe(true);
  });

  it("keeps plain messages intact", () => {
    expect(summarizeProviderError("socket hang up")).toBe("socket hang up");
  });
});
