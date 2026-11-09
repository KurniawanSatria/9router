import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getProviderConnections: vi.fn(),
  updateProviderConnection: vi.fn(),
}));

vi.mock("@/lib/localDb", () => dbMocks);
vi.mock("@/lib/network/connectionProxy", () => ({
  pickProxyPoolId: vi.fn(),
  resolveConnectionProxyConfig: vi.fn(),
}));
vi.mock("@/shared/constants/providers.js", () => ({
  FREE_PROVIDERS: {},
  resolveProviderId: (provider) => provider,
}));
vi.mock("@/sse/utils/logger.js", () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn() }));

const { markAccountUnavailable } = await import("../../src/sse/services/auth.js");
const { default: orcarouter } = await import("../../open-sse/providers/registry/orcarouter.js");

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.getProviderConnections.mockResolvedValue([{
    id: "orca-a",
    provider: "orcarouter",
    name: "orca-a",
    backoffLevel: 0,
  }]);
});

describe("OrcaRouter 1 request/minute limit", () => {
  it("locks the whole key for 60s on 429, not just the model", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T07:00:00.000Z"));

    try {
      await markAccountUnavailable(
        "orca-a",
        429,
        '{"error":{"code":"free_rate_limited","message":"Rate limit exceeded: at most 1 successful requests per 1 minute(s)."}}',
        "orcarouter",
        "deepseek/deepseek-v4.1-flash-free",
      );

      expect(dbMocks.updateProviderConnection).toHaveBeenCalledWith(
        "orca-a",
        expect.objectContaining({
          modelLock___all: "2026-11-08T07:01:00.000Z",
          backoffLevel: 0,
          errorCode: 429,
        }),
      );
      expect(dbMocks.updateProviderConnection.mock.calls[0][1])
        .not.toHaveProperty("modelLock_deepseek/deepseek-v4.1-flash-free");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps other providers' 429 model-scoped", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-08T07:00:00.000Z"));

    try {
      await markAccountUnavailable(
        "orca-a",
        429,
        "Too many requests",
        "unorouter",
        "step-5-preview:free",
      );

      expect(dbMocks.updateProviderConnection).toHaveBeenCalledWith(
        "orca-a",
        expect.objectContaining({
          "modelLock_step-5-preview:free": expect.any(String),
        }),
      );
      expect(dbMocks.updateProviderConnection.mock.calls[0][1])
        .not.toHaveProperty("modelLock___all");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry 429 in-process", () => {
    expect(orcarouter.transport.retry?.[429] ?? 0).toBe(0);
  });
});
