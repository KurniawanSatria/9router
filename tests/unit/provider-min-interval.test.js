import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getProviderConnections: vi.fn(),
  updateProviderConnection: vi.fn(),
  getSettings: vi.fn(),
  validateApiKey: vi.fn(),
  getProxyPools: vi.fn(),
}));

vi.mock("@/lib/localDb", () => dbMocks);
vi.mock("@/lib/network/connectionProxy", () => ({
  pickProxyPoolId: vi.fn(() => null),
  resolveConnectionProxyConfig: vi.fn(async () => ({})),
}));
vi.mock("@/shared/constants/providers.js", () => ({
  FREE_PROVIDERS: {},
  resolveProviderId: (provider) => provider,
}));
vi.mock("@/sse/utils/logger.js", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

const { getProviderCredentials } = await import("../../src/sse/services/auth.js");

const connection = (id, provider) => ({
  id,
  provider,
  name: id,
  priority: 1,
  isActive: true,
  apiKey: "test-key",
});

describe("per-key request window", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T07:00:00.000Z"));
    vi.clearAllMocks();
    dbMocks.getSettings.mockResolvedValue({});
    dbMocks.updateProviderConnection.mockResolvedValue({});
  });

  it.each(["orcarouter", "beatapi"])("skips %s for one minute after a dispatch", async (provider) => {
    dbMocks.getProviderConnections.mockResolvedValue([connection(`${provider}-a`, provider)]);

    const first = await getProviderCredentials(provider, null, "some-model");
    expect(first.connectionId).toBe(`${provider}-a`);

    const blocked = await getProviderCredentials(provider, null, "some-model");
    expect(blocked).toMatchObject({ allRateLimited: true });
    expect(new Date(blocked.retryAfter).getTime() - Date.now()).toBeGreaterThan(0);

    vi.advanceTimersByTime(60001);
    const again = await getProviderCredentials(provider, null, "some-model");
    expect(again.connectionId).toBe(`${provider}-a`);
  });

  it("leaves providers without a per-key window untouched", async () => {
    dbMocks.getProviderConnections.mockResolvedValue([connection("uno-a", "unorouter")]);

    const first = await getProviderCredentials("unorouter", null, "some-model");
    const second = await getProviderCredentials("unorouter", null, "some-model");
    expect(first.connectionId).toBe("uno-a");
    expect(second.connectionId).toBe("uno-a");
  });
});
