/**
 * Generic OAuth2 token refresh — config-driven profiles.
 *
 * Verifies refreshAccessToken() folds iflow onto a REFRESH_PROFILES entry
 * while preserving the legacy generic path for providers without a profile.
 * claude / github / kimi / cline profiles were retired with their providers
 * in b75837bf.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalFetch = global.fetch;

function mockFetchOnce(payload, { ok = true, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(JSON.stringify(payload)),
  });
  global.fetch = fn;
  vi.doMock("undici", async () => ({ ...(await vi.importActual("undici")), fetch: fn }));
  return fn;
}

describe("refreshAccessToken — config-driven profiles", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); global.fetch = originalFetch; });
  afterEach(() => { global.fetch = originalFetch; });

  it("iflow: Basic Auth header from clientId:clientSecret, form body keeps client_secret", async () => {
    const fm = mockFetchOnce({ access_token: "if-acc", refresh_token: "if-rot", expires_in: 3600 });
    const { refreshAccessToken } = await import("open-sse/services/tokenRefresh/providers.js");

    await refreshAccessToken("iflow", "if-old", {}, console);

    const [, init] = fm.mock.calls[0];
    expect(init.headers["Authorization"]).toMatch(/^Basic /);
    const body = new URLSearchParams(init.body);
    expect(body.get("client_id")).toBeTruthy();
    expect(body.get("client_secret")).toBeTruthy();
  });

  it("returns null on non-ok response", async () => {
    mockFetchOnce({ error: "invalid_grant" }, { ok: false, status: 400 });
    const { refreshAccessToken } = await import("open-sse/services/tokenRefresh/providers.js");
    const out = await refreshAccessToken("iflow", "dead", {}, console);
    expect(out).toBeNull();
  });

  it("returns null when refreshToken missing", async () => {
    const { refreshAccessToken } = await import("open-sse/services/tokenRefresh/providers.js");
    const out = await refreshAccessToken("iflow", "", {}, console);
    expect(out).toBeNull();
  });

  it("returns null for a provider with no config or refresh URL", async () => {
    mockFetchOnce({ access_token: "never" });
    const { refreshAccessToken } = await import("open-sse/services/tokenRefresh/providers.js");
    const out = await refreshAccessToken("no-such-provider", "tok", {}, console);
    expect(out).toBeNull();
  });

  it("dedupes concurrent calls with same refresh token (same dedupKey)", async () => {
    const fm = mockFetchOnce({ access_token: "dd-acc", expires_in: 3600 });
    const { refreshAccessToken } = await import("open-sse/services/tokenRefresh/providers.js");
    await Promise.all([
      refreshAccessToken("iflow", "dup-refresh", {}, console),
      refreshAccessToken("iflow", "dup-refresh", {}, console),
    ]);
    expect(fm).toHaveBeenCalledTimes(1);
  });
});
