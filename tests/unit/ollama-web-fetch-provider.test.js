import { afterEach, describe, expect, it, vi } from "vitest";

import REGISTRY from "../../open-sse/providers/registry/index.js";
import { handleFetchCore } from "../../open-sse/handlers/fetch/index.js";
import { AI_PROVIDERS, getProvidersByKind } from "@/shared/constants/providers.js";

const CONFIG = {
  baseUrl: "https://api.fetch.tinyfish.ai",
  timeoutMs: 30000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TinyFish web fetch provider", () => {
  it("registers web fetch on its own connection", () => {
    const entry = REGISTRY.find((candidate) => candidate.id === "tinyfish");

    expect(entry).toMatchObject({
      serviceKinds: ["webSearch", "webFetch"],
      fetchConfig: {
        baseUrl: "https://api.fetch.tinyfish.ai",
        method: "POST",
        authHeader: "x-api-key",
        formats: ["markdown", "html"],
      },
    });
    expect(AI_PROVIDERS.tinyfish?.fetchConfig).toEqual(entry.fetchConfig);
    expect(getProvidersByKind("webFetch").map((provider) => provider.id)).toContain("tinyfish");
  });

  it("calls TinyFish with api-key auth and normalizes the response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      results: [{ url: "https://example.com", title: "Example Domain", text: "Hello from TinyFish", links: ["https://www.iana.org/domains/example"] }],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));

    const result = await handleFetchCore({
      url: "https://example.com",
      format: "markdown",
      maxCharacters: 5,
      provider: "tinyfish",
      providerConfig: CONFIG,
      credentials: { apiKey: "tinyfish-test-key" },
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [requestUrl, init] = global.fetch.mock.calls[0];
    expect(requestUrl).toBe("https://api.fetch.tinyfish.ai");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "content-type": "application/json",
      "X-API-Key": "tinyfish-test-key",
    });
    expect(JSON.parse(init.body)).toEqual({ urls: ["https://example.com"], format: "markdown" });
    expect(result.data).toMatchObject({
      provider: "tinyfish",
      url: "https://example.com",
      title: "Example Domain",
      content: { format: "markdown", text: "Hello", length: 5 },
      links: ["https://www.iana.org/domains/example"],
    });
  });

  it("returns the upstream status and error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ error: { message: "invalid API key" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )));

    const result = await handleFetchCore({
      url: "https://example.com",
      provider: "tinyfish",
      providerConfig: CONFIG,
      credentials: { apiKey: "bad-key" },
    });

    expect(result).toMatchObject({
      success: false,
      status: 401,
      error: "invalid API key",
    });
  });

  it("treats an empty successful response as an upstream error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));

    const result = await handleFetchCore({
      url: "https://example.com",
      provider: "tinyfish",
      providerConfig: CONFIG,
      credentials: { apiKey: "tinyfish-test-key" },
    });

    expect(result).toEqual({
      success: false,
      status: 502,
      error: "TinyFish returned no extractable content",
    });
  });
});
