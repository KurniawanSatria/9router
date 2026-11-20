import { describe, expect, it } from "vitest";

const { checkFallbackError } = await import("../../open-sse/services/accountFallback.js");

const mismatch = "This conversation belongs to another free-pi account. Sharing or rotating accounts isn't allowed; use one account per person.";

describe("free-pi account mismatch", () => {
  it("rotates to the next account without locking this one", () => {
    const result = checkFallbackError(409, mismatch, 0, "freepi");
    expect(result.shouldFallback).toBe(true);
    expect(result.cooldownMs).toBe(0);
    expect(result.rotateAccount).toBe(true);
  });

  it("leaves the same message alone on other providers", () => {
    expect(checkFallbackError(409, mismatch, 0, "openai").shouldFallback).toBe(false);
  });
});
