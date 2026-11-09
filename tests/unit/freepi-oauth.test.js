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

describe("freepi login flow", () => {
  it("is registered as a device-code OAuth provider", () => {
    expect(getProvider("freepi")).toBe(freepi);
    expect(freepi.flowType).toBe("device_code");
  });

  it("starts the browser connect flow before falling back to a device code", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ latest: "0.6.15" }))
      .mockResolvedValueOnce(json({
        session_id: "connect-1",
        poll_secret: "secret-1",
        confirm_code: "ABCD-1234",
        connect_url: "https://freepi.ai/connect#t=token",
        interval: 2,
        expires_in: 600,
      }));
    vi.stubGlobal("fetch", fetchMock);

    const device = await freepi.requestDeviceCode(freepi.config);

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.freepi.ai/client-version");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.freepi.ai/auth/connect/start");
    expect(fetchMock.mock.calls[1][1].headers["x-freepi-signin-exp"]).toBe("1");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      consent_version: "4",
      client: { cli_version: "0.6.15" },
    });
    expect(device).toMatchObject({
      device_code: "connect-1",
      user_code: "ABCD-1234",
      verification_uri: "https://freepi.ai/connect#t=token",
      interval: 2,
      _pollSecret: "secret-1",
      _clientVersion: "0.6.15",
      _flow: "connect",
    });
  });

  it("falls back to the GitHub device flow when connect start fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ latest: "0.6.15" }))
      .mockResolvedValueOnce(json({ error: "unavailable" }, 500))
      .mockResolvedValueOnce(json({
        session_id: "device-1",
        user_code: "EF34-5678",
        verification_uri: "https://github.com/login/device",
        interval: 5,
        expires_in: 899,
      }))
      .mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const device = await freepi.requestDeviceCode(freepi.config);

    expect(fetchMock.mock.calls[2][0]).toBe("https://api.freepi.ai/auth/github/device");
    expect(fetchMock.mock.calls[3][0]).toBe("https://api.freepi.ai/auth/consent");
    expect(device).toMatchObject({ device_code: "device-1", interval: 5, _flow: "device" });
    expect(device._pollSecret).toBeUndefined();
  });

  it("polls the connect endpoint with the poll secret", async () => {
    const token = jwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ token }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await freepi.pollToken(freepi.config, "connect-1", null, {
      _clientVersion: "0.6.15",
      _pollSecret: "secret-1",
    });

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.freepi.ai/auth/connect/poll");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      session_id: "connect-1",
      poll_secret: "secret-1",
    });
    expect(result.data.access_token).toBe(token);
  });

  it("keeps the device token endpoint when no poll secret is present", async () => {
    const token = jwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
    const fetchMock = vi.fn().mockResolvedValueOnce(json({ token }));
    vi.stubGlobal("fetch", fetchMock);

    await freepi.pollToken(freepi.config, "device-1", null, { _clientVersion: "0.6.15" });

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.freepi.ai/auth/token");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("poll_secret");
  });

  it("uses the /me handle as the connection identity", async () => {
    const token = jwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ user_id: "user-1", handle: "KurniawanSatria", tier: "established" }))
      .mockResolvedValueOnce(json({ token }));
    vi.stubGlobal("fetch", fetchMock);

    const extra = await freepi.postExchange({ access_token: token });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.freepi.ai/me");
    expect(extra).toEqual({ handle: "KurniawanSatria", userId: "user-1" });

    const mapped = freepi.mapTokens({ access_token: token, _clientVersion: "0.6.15" }, extra);
    expect(mapped.email).toBe("KurniawanSatria");
    expect(mapped.displayName).toBe("KurniawanSatria");
    expect(mapped.providerSpecificData).toEqual({
      clientVersion: "0.6.15",
      userId: "user-1",
      username: "KurniawanSatria",
    });
  });

  it("falls back to the JWT subject when /me is unreachable", async () => {
    const token = jwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("nope", { status: 500 })));

    const extra = await freepi.postExchange({ access_token: token });
    expect(extra).toBeNull();
    expect(freepi.mapTokens({ access_token: token }).email).toBe("user-1");
  });

  it("keeps polling while the browser has not authorized yet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(json({ status: "pending" })));
    const result = await freepi.pollToken(freepi.config, "connect-1", null, { _pollSecret: "secret-1" });
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
