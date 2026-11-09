import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProviderConnections: vi.fn(),
  getComboByName: vi.fn(),
}));

const webhook = vi.hoisted(() => ({ notifyDiscordError: vi.fn(async () => true) }));

vi.mock("@/sse/services/discordWebhook.js", () => ({
  notifyDiscordError: webhook.notifyDiscordError,
  formatDiscordTimestamp: () => "soon",
}));

vi.mock("@/lib/localDb", () => ({
  getProviderConnections: mocks.getProviderConnections,
  getModelAliases: vi.fn(async () => ({})),
  getComboByName: mocks.getComboByName,
  getProviderNodes: vi.fn(async () => []),
  validateApiKey: vi.fn(),
  updateProviderConnection: vi.fn(),
  getSettings: vi.fn(async () => ({})),
  getProxyPools: vi.fn(async () => []),
}));

vi.mock("@/lib/network/connectionProxy", () => ({
  resolveConnectionProxyConfig: vi.fn(async () => ({})),
  pickProxyPoolId: vi.fn(),
}));

vi.mock("@/shared/constants/providers.js", () => ({
  FREE_PROVIDERS: { free: { noAuth: true } },
  resolveProviderId: (id) => id,
}));

vi.mock("@/sse/services/antigravityQuota.js", () => ({
  getAntigravityQuotaCache: () => new Map(),
  getAntigravityModelQuota: () => null,
}));

vi.mock("@/sse/utils/logger.js", () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

const {
  reorderModelsByProviderAvailability,
  rankModelsByProviderAvailability,
} = await import("@/sse/services/providerAvailability.js");
const { handleComboChat } = await import("open-sse/services/combo.js");

const log = { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} };
const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 1000).toISOString();

function connection(id, provider, locks = {}) {
  return { id, provider, isActive: true, providerSpecificData: {}, ...locks };
}

function okResponse(content = "ok") {
  const json = { choices: [{ message: { role: "assistant", content } }] };
  const make = () => ({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    clone: make,
    json: async () => json,
  });
  return make();
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getComboByName.mockResolvedValue(null);
  mocks.getProviderConnections.mockResolvedValue([]);
});

describe("provider availability ordering", () => {
  it("keeps a provider in place when at least one account is eligible", async () => {
    mocks.getProviderConnections.mockResolvedValue([
      connection("p1-locked", "p1", { modelLock_a: FUTURE }),
      connection("p1-ok", "p1"),
      connection("p2-ok", "p2"),
    ]);

    const ordered = await reorderModelsByProviderAvailability(["p1/a", "p2/b"], { log });

    expect(ordered).toEqual(["p1/a", "p2/b"]);
  });

  it("demotes a provider when every account is unavailable", async () => {
    mocks.getProviderConnections.mockResolvedValue([
      connection("p1-a", "p1", { modelLock_a: FUTURE }),
      connection("p1-b", "p1", { modelLock___all: FUTURE }),
      connection("p2-ok", "p2"),
    ]);

    const ordered = await reorderModelsByProviderAvailability(["p1/a", "p2/b"], { log });

    expect(ordered).toEqual(["p2/b", "p1/a"]);
  });

  it("notifies a provider outage once, and again after it recovers", async () => {
    const models = ["alertp/a", "p2-ok/b"];
    mocks.getProviderConnections.mockResolvedValue([
      connection("alertp-a", "alertp", { modelLock___all: FUTURE }),
      connection("p2-ok", "p2-ok"),
    ]);

    await reorderModelsByProviderAvailability(models, { log });
    await reorderModelsByProviderAvailability(models, { log });
    expect(webhook.notifyDiscordError).toHaveBeenCalledTimes(1);

    mocks.getProviderConnections.mockResolvedValue([
      connection("alertp-a", "alertp"),
      connection("p2-ok", "p2-ok"),
    ]);
    await reorderModelsByProviderAvailability(models, { log });

    mocks.getProviderConnections.mockResolvedValue([
      connection("alertp-a", "alertp", { modelLock___all: FUTURE }),
      connection("p2-ok", "p2-ok"),
    ]);
    await reorderModelsByProviderAvailability(models, { log });
    expect(webhook.notifyDiscordError).toHaveBeenCalledTimes(2);
  });

  it("keeps the original relative order inside both groups", async () => {
    mocks.getProviderConnections.mockResolvedValue([
      connection("p1-a", "p1", { modelLock___all: FUTURE }),
      connection("p2-ok", "p2"),
      connection("p3-ok", "p3"),
    ]);

    const ordered = await reorderModelsByProviderAvailability(
      ["p1/a1", "p2/b", "p1/a2", "p3/c"],
      { log }
    );

    expect(ordered).toEqual(["p2/b", "p3/c", "p1/a1", "p1/a2"]);
  });

  it("restores the original position as soon as a lock expires", async () => {
    const futureLocks = [
      connection("p1-a", "p1", { modelLock___all: FUTURE }),
      connection("p2-ok", "p2"),
    ];
    mocks.getProviderConnections.mockResolvedValue(futureLocks);

    expect(await reorderModelsByProviderAvailability(["p1/a", "p2/b"], { log }))
      .toEqual(["p2/b", "p1/a"]);

    mocks.getProviderConnections.mockResolvedValue([
      connection("p1-a", "p1", { modelLock___all: PAST }),
      connection("p2-ok", "p2"),
    ]);

    expect(await reorderModelsByProviderAvailability(["p1/a", "p2/b"], { log }))
      .toEqual(["p1/a", "p2/b"]);
  });

  it("demotes a provider with no active accounts but keeps its members for fallback", async () => {
    mocks.getProviderConnections.mockResolvedValue([connection("p2-ok", "p2")]);

    const ranked = await rankModelsByProviderAvailability(["p1/a", "p2/b"], { log });

    expect(ranked.ordered).toEqual(["p2/b", "p1/a"]);
    expect(ranked.unavailable).toEqual(["p1/a"]);
    expect(ranked.providers.p1).toMatchObject({
      available: false,
      reason: "no-active-connections",
      activeConnections: 0,
    });
  });

  it("never demotes a no-auth free provider", async () => {
    mocks.getProviderConnections.mockResolvedValue([]);

    const ordered = await reorderModelsByProviderAvailability(["free/a", "p2/b"], { log });

    // p2 has no active account either, so both stay in their original order.
    expect(ordered).toEqual(["free/a", "p2/b"]);
    mocks.getProviderConnections.mockResolvedValue([connection("p2-ok", "p2")]);
    expect(await reorderModelsByProviderAvailability(["free/a", "p2/b"], { log }))
      .toEqual(["free/a", "p2/b"]);
  });

  it("keeps every member when all providers are unavailable", async () => {
    mocks.getProviderConnections.mockResolvedValue([]);

    const ordered = await reorderModelsByProviderAvailability(["p1/a", "p2/b"], { log });

    expect(ordered).toEqual(["p1/a", "p2/b"]);
  });

  it("fails open for members whose health cannot be resolved", async () => {
    mocks.getComboByName.mockImplementation(async (name) => (name === "Nested" ? { name } : null));
    mocks.getProviderConnections.mockResolvedValue([
      connection("p1-a", "p1", { modelLock___all: FUTURE }),
    ]);

    const ranked = await rankModelsByProviderAvailability(["p1/a", "Nested"], { log });

    expect(ranked.neutral).toEqual(["Nested"]);
    expect(ranked.ordered).toEqual(["Nested", "p1/a"]);
  });

  it("fails open when the connection lookup throws", async () => {
    mocks.getProviderConnections.mockRejectedValue(new Error("db down"));

    const ranked = await rankModelsByProviderAvailability(["p1/a", "p2/b"], { log });

    expect(ranked.ordered).toEqual(["p1/a", "p2/b"]);
    expect(ranked.providers).toEqual({});
  });
});

describe("handleComboChat provider-health reorder", () => {
  it("applies the reorder immediately before the fallback loop", async () => {
    const calls = [];
    const handleSingleModel = vi.fn(async (_body, model) => {
      calls.push(model);
      return okResponse();
    });
    const reorderModels = vi.fn(async () => ["healthy/b", "dead/a"]);

    const res = await handleComboChat({
      body: {},
      models: ["dead/a", "healthy/b"],
      handleSingleModel,
      log,
      comboName: "health-combo",
      comboStrategy: "fallback",
      reorderModels,
    });

    expect(res.ok).toBe(true);
    expect(reorderModels).toHaveBeenCalledWith(["dead/a", "healthy/b"]);
    expect(calls).toEqual(["healthy/b"]);
  });

  it("runs the reorder after round-robin rotation", async () => {
    const seen = [];
    const handleSingleModel = vi.fn(async () => okResponse());
    const reorderModels = vi.fn(async (models) => {
      seen.push(models);
      return models;
    });

    await handleComboChat({
      body: {},
      models: ["a/one", "b/two", "c/three"],
      handleSingleModel,
      log,
      comboName: "health-rotation",
      comboStrategy: "round-robin",
      comboStickyLimit: 1,
      reorderModels,
    });
    await handleComboChat({
      body: {},
      models: ["a/one", "b/two", "c/three"],
      handleSingleModel,
      log,
      comboName: "health-rotation",
      comboStrategy: "round-robin",
      comboStickyLimit: 1,
      reorderModels,
    });

    expect(seen).toEqual([
      ["a/one", "b/two", "c/three"],
      ["b/two", "c/three", "a/one"],
    ]);
  });

  it("keeps the current order when the reorder callback throws", async () => {
    const calls = [];
    const handleSingleModel = vi.fn(async (_body, model) => {
      calls.push(model);
      return okResponse();
    });

    const res = await handleComboChat({
      body: {},
      models: ["dead/a", "healthy/b"],
      handleSingleModel,
      log,
      comboName: "health-fail-open",
      comboStrategy: "fallback",
      reorderModels: async () => { throw new Error("availability unavailable"); },
    });

    expect(res.ok).toBe(true);
    expect(calls).toEqual(["dead/a"]);
  });

  it("ignores a reorder result that changes the member count", async () => {
    const calls = [];
    const handleSingleModel = vi.fn(async (_body, model) => {
      calls.push(model);
      return okResponse();
    });

    const res = await handleComboChat({
      body: {},
      models: ["dead/a", "healthy/b"],
      handleSingleModel,
      log,
      comboName: "health-bad-result",
      comboStrategy: "fallback",
      reorderModels: async () => ["healthy/b"],
    });

    expect(res.ok).toBe(true);
    expect(calls).toEqual(["dead/a"]);
  });
});
