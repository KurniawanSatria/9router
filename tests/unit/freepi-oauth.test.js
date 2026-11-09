import { describe, it, expect, vi, afterEach } from "vitest";

import freepi from "../../src/lib/oauth/providers/freepi.js";
import { getProvider } from "../../src/lib/oauth/providers/index.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jwt(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode(payload)}.sig`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("freepi device flow", () => {
  it("is registered as a device-code OAuth provider", () => {
    expect(getProvider("freepi")).toBe(freepi);
    expect(freepi.flowType).toBe("device_code");
  });

  it("starts the device code, records consent, and captures the client version", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({
        session_id: "session-1",
        user_code: "ABCD-1234",
        verification_uri: "https://github.com/login/device",
        verification_uri_complete: "https://github.com/login/device?user_code=ABCD-1234",
        interval: 5,
        expires_in: 899,
      }))
      .mockResolvedValueOnce(json({ ok: true }))
      .mockResolvedValueOnce(json({ latest: "0.6.15" }));
    vi.stubGlobal("fetch", fetchMock);

    const device = await freepi.requestDeviceCode(freepi.config);

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.freepi.ai/auth/github/device");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.freepi.ai/auth/consent");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      session_id: "session-1",
      consent_version: "4",
    });
    expect(device).toMatchObject({
      device_code: "session-1",
      user_code: "ABCD-1234",
      expires_in: 899,
      interval: 5,
      _clientVersion: "0.6.15",
    });
  });

  it("returns the JWT and carries the client version into provider data", async () => {
    const token = jwt({ sub: "user-1", email: "a@b.dev", exp: Math.floor(Date.now() / 1000) + 3600 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ token })));

    const result = await freepi.pollToken(freepi.config, "session-1", null, { _clientVersion: "0.6.15" });
    expect(result.ok).toBe(true);
    expect(result.data.access_token).toBe(token);

    const mapped = freepi.mapTokens(result.data);
    expect(mapped.accessToken).toBe(token);
    expect(mapped.refreshToken).toBeNull();
    expect(mapped.email).toBe("a@b.dev");
    expect(mapped.expiresIn).toBeGreaterThan(3500);
    expect(mapped.providerSpecificData).toEqual({ clientVersion: "0.6.15", userId: "user-1" });
  });

  it("keeps polling while GitHub has not authorized yet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ status: "pending" })));
    const result = await freepi.pollToken(freepi.config, "session-1", null, {});
    expect(result.ok).toBe(true);
    expect(result.data.error).toBe("authorization_pending");
  });

  it("surfaces a consent failure instead of hanging", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ code: "consent_required", message: "consent missing" }, 403)));
    const result = await freepi.pollToken(freepi.config, "session-1", null, {});
    expect(result.data.error).toBe("consent_required");
    expect(result.data.error_description).toBe("consent missing");
  });
});
