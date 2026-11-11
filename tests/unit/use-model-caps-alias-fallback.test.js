// useModelCaps.resolveCaps — the local fallback path (when /api/models has no
// entry for the key) must map the seat's UI alias to the provider id before
// calling getCapabilitiesForModel. The tables are keyed by provider id
// (opencode, commandcode, …); a raw alias like `oc` misses the
// provider-scoped entries and falls to the generic patterns, under-reporting.
//
// resolveCaps is exported for this test; the hook itself is client code and is
// not exercised here.
import { describe, it, expect } from "vitest";
import { resolveCaps } from "@/shared/hooks/useModelCaps.js";

describe("useModelCaps resolveCaps — alias → provider id in the fallback", () => {
  it("oc/mimo-v2.6-flash-free resolves through the opencode override, not the mimo pattern", () => {
    const caps = resolveCaps({}, {}, "oc/mimo-v2.6-flash-free");
    expect(caps.contextWindow).toBe(1048576);
    expect(caps.maxOutput).toBe(131072);
  });

  it("byFull hit still wins over the fallback", () => {
    const fed = { contextWindow: 555000 };
    const caps = resolveCaps({ "oc/mimo-v2.6-flash-free": fed }, {}, "oc/mimo-v2.6-flash-free");
    expect(caps).toBe(fed);
  });

  it("bare id without a slash still works (no provider)", () => {
    const caps = resolveCaps({}, {}, "kimi-k3");
    expect(caps.contextWindow).toBeGreaterThan(0);
  });
});
