import { describe, expect, it, vi } from "vitest";
import { runQuotaWatchTick } from "../../src/shared/services/quotaWatcher.js";

function makeDeps({ connections, usage = {}, settings = {} } = {}) {
  return {
    getSettings: vi.fn(async () => ({ quotaAutoDisableEnabled: true, ...settings })),
    getProviderConnections: vi.fn(async () => connections),
    updateProviderConnection: vi.fn(async () => ({})),
    getUsageForProvider: vi.fn(async () => usage),
    resolveConnectionProxyConfig: vi.fn(async () => ({})),
    notifyDiscordError: vi.fn(async () => true),
  };
}

const conn = (extra = {}) => ({
  id: "c1",
  provider: "tokenharbor",
  name: "account@example.com",
  isActive: true,
  ...extra,
});

describe("quota watcher", () => {
  it("disables and notifies when a quota is exhausted", async () => {
    const deps = makeDeps({
      connections: [conn()],
      usage: { quotas: { "Free allowance": { used: 1, total: 1, resetAt: "2026-11-10T22:21:00.000Z" } } },
    });

    await runQuotaWatchTick(deps, {});

    expect(deps.updateProviderConnection).toHaveBeenCalledWith("c1", expect.objectContaining({
      isActive: false,
      quotaAutoResetAt: "2026-11-10T22:21:00.000Z",
    }));
    expect(deps.notifyDiscordError).toHaveBeenCalledWith(expect.objectContaining({
      title: "Quota exhausted: tokenharbor (account@example.com)",
    }));
  });

  it("re-enables and notifies when the quota is available again", async () => {
    const deps = makeDeps({
      connections: [conn({ isActive: false, quotaAutoDisabledAt: "2026-11-08T00:00:00.000Z", quotaAutoResetAt: "2026-11-08T01:00:00.000Z" })],
      usage: { quotas: { "Free allowance": { used: 1, total: 100 } } },
    });

    await runQuotaWatchTick(deps, {});

    expect(deps.updateProviderConnection).toHaveBeenCalledWith("c1", expect.objectContaining({
      isActive: true,
      quotaAutoDisabledAt: null,
    }));
    expect(deps.notifyDiscordError).toHaveBeenCalledWith(expect.objectContaining({
      title: "Quota available: tokenharbor (account@example.com)",
    }));
  });

  it("waits for the reset before re-checking a disabled account", async () => {
    const deps = makeDeps({
      connections: [conn({ isActive: false, quotaAutoDisabledAt: "2026-11-01T00:00:00.000Z", quotaAutoResetAt: "2999-01-01T00:00:00.000Z" })],
    });

    await runQuotaWatchTick(deps, {});

    expect(deps.getUsageForProvider).not.toHaveBeenCalled();
    expect(deps.updateProviderConnection).not.toHaveBeenCalled();
  });

  it("never touches an account the user disabled manually", async () => {
    const deps = makeDeps({
      connections: [conn({ isActive: false })],
      usage: { quotas: { "Free allowance": { used: 1, total: 1 } } },
    });

    await runQuotaWatchTick(deps, {});

    expect(deps.getUsageForProvider).not.toHaveBeenCalled();
    expect(deps.updateProviderConnection).not.toHaveBeenCalled();
  });

  it("does nothing when the feature is turned off", async () => {
    const deps = makeDeps({
      settings: { quotaAutoDisableEnabled: false },
      connections: [conn()],
      usage: { quotas: { "Free allowance": { used: 1, total: 1 } } },
    });

    await runQuotaWatchTick(deps, {});

    expect(deps.getProviderConnections).not.toHaveBeenCalled();
    expect(deps.updateProviderConnection).not.toHaveBeenCalled();
  });
});
