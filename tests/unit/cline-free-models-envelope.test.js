// Cline free models (z-ai/glm-5.3-flash, deepseek-v4-flash) wrap non-stream
// chat completions in {"success":true,data":{...choices...}} on
// https://api.cline.bot/api/v1/chat/completions, and the {success,data} envelope
// is also used by the /api/v1/models catalog endpoint exercised below.
//
// The proxy-side unwrap is opt-in via transport.quirks.clineEnvelope, and the
// cline/clinepass registry entries were retired in b75837bf, so only the
// catalog resolution behavior is still reachable and pinned here.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("cline /api/v1/models aggregation (resolveClineModels vs resolveClinepassModels)", () => {
  const API_MODELS_URL = "https://api.cline.bot/api/v1/models";

  const API_RESPONSE = [
    { id: "cline-pass/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "cline-pass/glm-5.2", name: "GLM-5.2" },
    { id: "z-ai/glm-5.3-flash", name: "GLM-5.3 Flash" },
    { id: "z-ai/deepseek-v4-flash", name: "DeepSeek V4 Flash (Free)" },
  ];

  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolveClineModels returns all models (including free-tier)", async () => {
    const { resolveClineModels } = await import("../../open-sse/services/clinepassModels.js");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => API_RESPONSE,
    });
    const result = await resolveClineModels({ accessToken: "test-token" });
    expect(result).not.toBeNull();
    expect(result.models).toHaveLength(4);
    const ids = result.models.map((m) => m.id);
    expect(ids).toContain("cline-pass/deepseek-v4-flash");
    expect(ids).toContain("z-ai/glm-5.3-flash");
    expect(ids).toContain("z-ai/deepseek-v4-flash");
  });

  it("resolveClinepassModels returns only cline-pass/ models", async () => {
    const { resolveClinepassModels } = await import("../../open-sse/services/clinepassModels.js");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => API_RESPONSE,
    });
    const result = await resolveClinepassModels({ accessToken: "test-token" });
    expect(result).not.toBeNull();
    expect(result.models).toHaveLength(2);
    const ids = result.models.map((m) => m.id);
    expect(ids).toContain("cline-pass/deepseek-v4-flash");
    expect(ids).toContain("cline-pass/glm-5.2");
    expect(ids).not.toContain("z-ai/glm-5.3-flash");
  });

  it("resolveClineModels unwraps {success,data} envelope", async () => {
    const { resolveClineModels } = await import("../../open-sse/services/clinepassModels.js");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: API_RESPONSE }),
    });
    const result = await resolveClineModels({ accessToken: "test-token" });
    expect(result).not.toBeNull();
    expect(result.models).toHaveLength(4);
  });

  it("resolveClineModels returns null when no token", async () => {
    const { resolveClineModels } = await import("../../open-sse/services/clinepassModels.js");
    const result = await resolveClineModels({});
    expect(result).toBeNull();
  });

  it("resolveClineModels returns null on fetch error", async () => {
    const { resolveClineModels } = await import("../../open-sse/services/clinepassModels.js");
    fetchMock.mockRejectedValue(new Error("network error"));
    const result = await resolveClineModels({ accessToken: "test-token" });
    expect(result).toBeNull();
  });

  it("resolveClineModels returns {id,name} shape", async () => {
    const { resolveClineModels } = await import("../../open-sse/services/clinepassModels.js");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => API_RESPONSE,
    });
    const result = await resolveClineModels({ accessToken: "test-token" });
    expect(result.models[0]).toHaveProperty("id");
    expect(result.models[0]).toHaveProperty("name");
    expect(typeof result.models[0].id).toBe("string");
    expect(typeof result.models[0].name).toBe("string");
  });
});
