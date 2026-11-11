import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("open-sse/index.js", () => ({}), { virtual: true });

vi.mock("@/lib/localDb", () => ({
  getSettings: vi.fn(),
  getProviderConnections: vi.fn(),
  updateProviderConnection: vi.fn(),
}));

vi.mock("@/lib/network/connectionProxy", () => ({
  resolveConnectionProxyConfig: vi.fn(),
}));

vi.mock("@/app/api/usage/[connectionId]/route.js", () => ({
  refreshAndUpdateCredentials: vi.fn(),
}));

vi.mock("@/shared/constants/config", () => ({
  QUOTA_AUTOPING_CONFIG: {
    tickIntervalMs: 60000,
    pingLeadMs: 5000,
    refreshAheadMs: 300000,
    failureCooldownMs: 900000,
    providers: {
      claude: {
        settingsKey: "claudeAutoPing",
        quotaKey: "session (5h)",
        pingModel: "claude-haiku-4-5-20251001",
        pingText: "hi",
        pingMaxTokens: 1,
      },
    },
  },
}));

vi.mock("open-sse/providers/shared.js", () => ({
  CLAUDE_CLI_SPOOF_HEADERS: { "anthropic-version": "2023-06-01" },
}));

vi.mock("open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn(),
}));

vi.mock("open-sse/services/usage/claude.js", () => ({
  getClaudeUsage: vi.fn(),
}));

vi.mock("open-sse/executors/index.js", () => ({
  getExecutor: vi.fn(),
}));

describe("quota auto-ping", () => {
  let runQuotaAutoPingTick;
  let configureQuotaAutoPing;
  let deps;
  let state;
  let getClaudeUsage;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
    delete global.__quotaAutoPing;

    ({ getClaudeUsage } = await import("open-sse/services/usage/claude.js"));
    ({ runQuotaAutoPingTick, configureQuotaAutoPing } = await import("../../src/shared/services/quotaAutoPing.js"));

    deps = {
      getSettings: vi.fn(),
      getProviderConnections: vi.fn(),
      updateProviderConnection: vi.fn(),
      resolveConnectionProxyConfig: vi.fn().mockResolvedValue({}),
      refreshAndUpdateCredentials: vi.fn(async (connection) => ({ connection, refreshed: false })),
      proxyAwareFetch: vi.fn().mockResolvedValue({ ok: true }),
      getExecutor: vi.fn(() => ({
        execute: vi.fn().mockResolvedValue({ response: { ok: true, text: vi.fn().mockResolvedValue("") } }),
      })),
    };
    state = { running: false, resetCache: {}, failureCache: {} };
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
  });

  it("does not ping when the setting is absent", async () => {
    deps.getSettings.mockResolvedValue({});

    await runQuotaAutoPingTick(deps, state);

    expect(deps.getProviderConnections).not.toHaveBeenCalled();
    expect(deps.proxyAwareFetch).not.toHaveBeenCalled();
  });

  it("starts the scheduler only when an account opts in", () => {
    vi.useFakeTimers();

    configureQuotaAutoPing({ claudeAutoPing: { connections: {} } });
    expect(vi.getTimerCount()).toBe(0);

    configureQuotaAutoPing({ claudeAutoPing: { connections: { "claude-1": true } } });
    expect(vi.getTimerCount()).toBe(1);
  });

  it("stops the scheduler when the last account opts out", () => {
    vi.useFakeTimers();
    configureQuotaAutoPing({ claudeAutoPing: { connections: { "claude-1": true } } });

    configureQuotaAutoPing({ claudeAutoPing: { connections: { "claude-1": false } } });

    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps Claude session quota key behavior", async () => {
    deps.getSettings.mockResolvedValue({ claudeAutoPing: { connections: { "claude-1": true } } });
    deps.getProviderConnections.mockImplementation(async ({ provider }) => (
      provider === "claude" ? [{ id: "claude-1", provider: "claude", authType: "oauth", accessToken: "token" }] : []
    ));
    getClaudeUsage.mockResolvedValue({
      quotas: { "session (5h)": { resetAt: "2026-01-01T11:59:00.000Z" } },
    });

    await runQuotaAutoPingTick(deps, state);

    expect(deps.proxyAwareFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(deps.proxyAwareFetch.mock.calls[0][1].body)).toMatchObject({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
  });

  describe("anchored schedule", () => {
    const schedule = {
      enabled: true,
      anchor: "09:30",
      timezone: "America/Sao_Paulo",
      windowHours: 5,
      slotsPerDay: 3,
    };

    const claudeConnection = (extra = {}) => ({
      id: "claude-1", provider: "claude", authType: "oauth", accessToken: "token", ...extra,
    });

    const settingsWithSchedule = (overrides = {}) => ({
      claudeAutoPing: {
        connections: { "claude-1": true },
        schedules: { "claude-1": { ...schedule, ...overrides } },
      },
    });

    const usageAt = (resetAt) => ({ quotas: { "session (5h)": { resetAt } } });

    let connection = claudeConnection();

    beforeEach(() => {
      connection = claudeConnection();
      deps.getProviderConnections.mockImplementation(async ({ provider }) => (
        provider === "claude" ? [connection] : []
      ));
    });

    it("pings on the 09:30 BRT slot even when resetAt is stable", async () => {
      // 12:31 UTC = 09:31 BRT — the reactive path alone would stay quiet here.
      vi.setSystemTime(new Date("2026-08-20T12:31:00.000Z"));
      deps.getSettings.mockResolvedValue(settingsWithSchedule());
      state.resetCache["claude:claude-1"] = "2026-08-20T20:00:00.000Z";
      getClaudeUsage.mockResolvedValue(usageAt("2026-08-20T20:00:00.000Z"));

      await runQuotaAutoPingTick(deps, state);

      expect(deps.proxyAwareFetch).toHaveBeenCalledTimes(1);
      expect(deps.updateProviderConnection).toHaveBeenCalledWith("claude-1", expect.objectContaining({
        lastPingedSlotKey: "2026-08-20#0",
      }));
    });

    it("does not repeat a slot that was already pinged", async () => {
      vi.setSystemTime(new Date("2026-08-20T12:31:00.000Z"));
      connection = claudeConnection({ lastPingedSlotKey: "2026-08-20#0" });
      deps.getSettings.mockResolvedValue(settingsWithSchedule());
      state.resetCache["claude:claude-1"] = "2026-08-20T20:00:00.000Z";
      getClaudeUsage.mockResolvedValue(usageAt("2026-08-20T20:00:00.000Z"));

      await runQuotaAutoPingTick(deps, state);

      expect(deps.proxyAwareFetch).not.toHaveBeenCalled();
    });

    it("stays quiet overnight", async () => {
      // 06:00 UTC = 03:00 BRT, outside every slot.
      vi.setSystemTime(new Date("2026-08-20T06:00:00.000Z"));
      deps.getSettings.mockResolvedValue(settingsWithSchedule());
      state.resetCache["claude:claude-1"] = "2026-08-20T20:00:00.000Z";
      getClaudeUsage.mockResolvedValue(usageAt("2026-08-20T20:00:00.000Z"));

      await runQuotaAutoPingTick(deps, state);

      expect(deps.proxyAwareFetch).not.toHaveBeenCalled();
    });

    it("ignores a disabled schedule", async () => {
      vi.setSystemTime(new Date("2026-08-20T12:31:00.000Z"));
      deps.getSettings.mockResolvedValue(settingsWithSchedule({ enabled: false }));
      state.resetCache["claude:claude-1"] = "2026-08-20T20:00:00.000Z";
      getClaudeUsage.mockResolvedValue(usageAt("2026-08-20T20:00:00.000Z"));

      await runQuotaAutoPingTick(deps, state);

      expect(deps.proxyAwareFetch).not.toHaveBeenCalled();
    });

    it("pings Claude on a slot before its reset is due", async () => {
      vi.setSystemTime(new Date("2026-08-20T12:31:00.000Z"));
      deps.getSettings.mockResolvedValue({
        claudeAutoPing: {
          connections: { "claude-1": true },
          schedules: { "claude-1": schedule },
        },
      });
      state.resetCache["claude:claude-1"] = "2026-08-20T23:00:00.000Z";
      getClaudeUsage.mockResolvedValue(usageAt("2026-08-20T23:00:00.000Z"));

      await runQuotaAutoPingTick(deps, state);

      expect(deps.proxyAwareFetch).toHaveBeenCalledTimes(1);
      expect(deps.updateProviderConnection).toHaveBeenCalledWith("claude-1", expect.objectContaining({
        lastPingedSlotKey: "2026-08-20#0",
      }));
    });

    it("runs a schedule on a connection with the reactive ping switched off", async () => {
      vi.setSystemTime(new Date("2026-08-20T12:31:00.000Z"));
      deps.getSettings.mockResolvedValue({
        claudeAutoPing: {
          connections: { "claude-1": false },
          schedules: { "claude-1": schedule },
        },
      });
      state.resetCache["claude:claude-1"] = "2026-08-20T20:00:00.000Z";
      getClaudeUsage.mockResolvedValue(usageAt("2026-08-20T20:00:00.000Z"));

      await runQuotaAutoPingTick(deps, state);

      expect(deps.proxyAwareFetch).toHaveBeenCalledTimes(1);
      expect(deps.updateProviderConnection).toHaveBeenCalledWith("claude-1", expect.objectContaining({
        lastPingedSlotKey: "2026-08-20#0",
      }));
    });

    it("needs the scheduler running for a schedule alone", async () => {
      const { hasAnyAutoPingEnabled } = await import("../../src/shared/services/quotaAutoPing.js");

      expect(hasAnyAutoPingEnabled({ claudeAutoPing: { connections: { "claude-1": false } } })).toBe(false);
      expect(hasAnyAutoPingEnabled({
        claudeAutoPing: { connections: { "claude-1": false }, schedules: { "claude-1": schedule } },
      })).toBe(true);
      expect(hasAnyAutoPingEnabled({
        claudeAutoPing: { connections: {}, schedules: { "claude-1": { ...schedule, enabled: false } } },
      })).toBe(false);
    });

    it("skips the slot when the quota is exhausted", async () => {
      vi.setSystemTime(new Date("2026-08-20T12:31:00.000Z"));
      deps.getSettings.mockResolvedValue(settingsWithSchedule());
      getClaudeUsage.mockResolvedValue({
        quotas: { "session (5h)": { used: 100, total: 100, remaining: 0, resetAt: "2026-08-20T20:00:00.000Z" } },
      });

      await runQuotaAutoPingTick(deps, state);

      expect(deps.proxyAwareFetch).not.toHaveBeenCalled();
    });
  });
});
