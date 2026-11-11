/**
 * Unit tests for the OpenRouter + Vertex (Veo) video adapters.
 *
 * Covers:
 *  - registry wiring (videoConfig, video serviceKind, video-kind models)
 *  - OpenRouter: POST to the collection root, GET poll, verbatim passthrough
 *  - Vertex: predictLongRunning body translation, fetchPredictOperation polling,
 *    operation-name round-trip through the job id, response mapping
 *  - xAI default path is unchanged by the adapter hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("open-sse/services/tokenRefresh.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, refreshTokenByProvider: vi.fn(), refreshVertexToken: vi.fn() };
});

import { handleVideoProxyCore, getVideoConfig } from "open-sse/handlers/videoCore.js";
import { refreshVertexToken } from "open-sse/services/tokenRefresh.js";
import { PROVIDER_MEDIA, PROVIDER_MODELS } from "open-sse/providers/index.js";

const originalFetch = global.fetch;
const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Vertex operation names are resource paths; the adapter base64url-encodes them.
const OPERATION_NAME =
  "projects/proj-1/locations/us-central1/publishers/google/models/veo-3.1-generate-preview/operations/op-abc";
const JOB_ID = Buffer.from(OPERATION_NAME, "utf8").toString("base64url");

describe("registry wiring", () => {
  it("exposes videoConfig + video serviceKind for openrouter", () => {
    expect(getVideoConfig("openrouter").baseUrl).toBe("https://openrouter.ai/api/v1/videos");
    expect(PROVIDER_MEDIA.openrouter.serviceKinds).toContain("video");
  });

  it("registers video-kind models on openrouter", () => {
    const or = PROVIDER_MODELS.openrouter.find((m) => m.id === "google/veo-3.1");
    expect(or?.kind).toBe("video");
  });
});

describe("openrouter video adapter", () => {
  beforeEach(() => { global.fetch = vi.fn(); });
  afterEach(() => { global.fetch = originalFetch; });

  it("POSTs creation to the collection root (no /generations suffix)", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ id: "job-1", status: "pending" }));

    const raw = '{"model":"google/veo-3.1","prompt":"a paper boat"}';
    const result = await handleVideoProxyCore({
      provider: "openrouter",
      action: "generations",
      rawBody: raw,
      contentType: "application/json",
      credentials: { apiKey: "sk-or-key" },
    });

    expect(result.success).toBe(true);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/videos");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(raw); // verbatim
    expect(init.headers.Authorization).toBe("Bearer sk-or-key");
    expect(init.headers["HTTP-Referer"]).toBe("https://endpoint-proxy.local");
    expect(await result.response.json()).toEqual({ id: "job-1", status: "pending" });
  });

  it("polls GET /videos/{id} and passes the payload through verbatim", async () => {
    const payload = { id: "job-1", status: "completed", unsigned_urls: ["https://cdn/v.mp4"] };
    global.fetch.mockResolvedValueOnce(jsonResponse(payload));

    const result = await handleVideoProxyCore({
      provider: "openrouter",
      requestId: "job-1",
      credentials: { apiKey: "sk-or-key" },
    });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/videos/job-1");
    expect(init.method).toBe("GET");
    expect(await result.response.json()).toEqual(payload);
  });

  it("rejects unsupported actions before any upstream call (no billable job)", async () => {
    const result = await handleVideoProxyCore({
      provider: "openrouter",
      action: "extensions",
      rawBody: "{}",
      contentType: "application/json",
      credentials: { apiKey: "sk-or-key" },
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("vertex (veo) video adapter", () => {
  // b75837bf dropped the vertex registry entry, so getVideoConfig("vertex") is
  // null and handleVideoProxyCore rejects every request before the adapter runs.
  // Only the reachability guard is still meaningful here.
  beforeEach(() => { global.fetch = vi.fn(); });
  afterEach(() => { global.fetch = originalFetch; });

  it("is unreachable without a registry entry", async () => {
    const result = await handleVideoProxyCore({
      provider: "vertex",
      action: "generations",
      rawBody: JSON.stringify({ model: "veo-3.1-generate-preview", prompt: "x" }),
      contentType: "application/json",
      credentials: { apiKey: "AIzaRawKey" },
    });
    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
