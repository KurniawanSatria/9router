// A custom-model row created before a model existed in the registry (dashboard
// "add custom model") stores thin caps — {vision, reasoning}, no contextWindow —
// under the UI alias (`oc|mimo-v2.6-flash-free|llm`). Once the registry gains the
// model, /api/models lists the real entry (fullModel opencode/…) AND the custom
// shadow (fullModel oc/…), both with routedModel oc/mimo-v2.6-flash-free.
// The client's useModelCaps builds byFull[routedModel] last-write-wins, so the
// shadow (resolved via the alias `oc`, which misses the provider-scoped entry
// and falls back to the *mimo* pattern) overwrote the real 1M caps and dragged
// every combo containing the seat down.
//
// Two behaviors pinned here (drive the route handler with mocked repos):
// 1. a custom row whose providerAlias/id collides with a listed routedModel is
//    dropped (read-time filter; the kv row itself is untouched);
// 2. surviving custom rows resolve caps through the provider id, not the alias.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/models", () => ({
  getModelAliases: vi.fn(async () => ({})),
  setModelAlias: vi.fn(),
  getCustomModels: vi.fn(async () => []),
}));
vi.mock("@/lib/disabledModelsDb", () => ({
  getDisabledModels: vi.fn(async () => ({})),
}));

import { GET } from "@/app/api/models/route.js";
import { getCustomModels } from "@/models";

// The registry list comes from AI_MODELS (static import) — real registry, so
// opencode/… is listed and any oc/ custom shadow collides.
async function fetchModels() {
  const res = await GET();
  const body = await res.json();
  return body.models || [];
}

beforeEach(() => {
  vi.mocked(getCustomModels).mockClear();
});

describe("/api/models — custom-model shadow dedupe", () => {
  it("drops the oc/mimo-v2.6-flash-free shadow and keeps the registry entry", async () => {
    vi.mocked(getCustomModels).mockResolvedValueOnce([
      { providerAlias: "oc", id: "mimo-v2.6-flash-free", type: "llm", name: "mimo-v2.6-flash-free", caps: { vision: true, reasoning: true } },
    ]);

    const models = await fetchModels();
    const routed = models.filter((m) => m.routedModel === "oc/mimo-v2.6-flash-free");

    expect(routed).toHaveLength(1);
    expect(routed[0].fullModel).toBe("oc/mimo-v2.6-flash-free");
    expect(routed[0].caps.contextWindow).toBe(1048576);
    expect(routed[0].caps.maxOutput).toBe(131072);
  });

  it("keeps non-colliding custom rows and resolves their caps by provider id", async () => {
    vi.mocked(getCustomModels).mockResolvedValueOnce([
      // does not collide: registry has no such id under a routed alias
      { providerAlias: "oc", id: "some-totally-custom-model", type: "llm", name: "x", caps: {} },
    ]);

    const models = await fetchModels();
    const kept = models.find((m) => m.fullModel === "oc/some-totally-custom-model");
    expect(kept).toBeDefined();
    // `oc` maps to opencode; resolving by id rather than by alias is what makes
    // provider-scoped capability overrides reachable at all.
    expect(kept.caps.contextWindow).toBeGreaterThan(0);
  });
});
