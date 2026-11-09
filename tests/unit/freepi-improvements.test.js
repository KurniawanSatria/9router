import { beforeEach, describe, expect, it, vi } from "vitest";

const upstreamFetch = vi.fn();
vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: (...args) => upstreamFetch(...args),
}));

const versionFetch = vi.fn();
vi.stubGlobal("fetch", versionFetch);

const { getExecutor } = await import("../../open-sse/executors/index.js");
const { FILTERS } = await import("../../src/app/api/providers/suggested-models/filters.js");

const ok = { status: 200, headers: { get: () => "" } };
const credentials = (clientVersion) => ({ accessToken: "jwt", providerSpecificData: { clientVersion } });
const execute = () => getExecutor("freepi").execute({ model: "particle", body: {}, stream: false, credentials: credentials("0.6.2") });

beforeEach(() => {
  upstreamFetch.mockReset().mockResolvedValue(ok);
  versionFetch.mockReset().mockResolvedValue({ ok: true, json: async () => ({ latest: "0.6.15" }) });
});

describe("freepi additions", () => {
  it("refreshes the client version before the request and caches it", async () => {
    await execute();
    expect(upstreamFetch.mock.calls[0][1].headers["x-client-version"]).toBe("0.6.15");
    await execute();
    expect(versionFetch).toHaveBeenCalledTimes(1);
  });

  it("strips the promo suffix from model names", () => {
    const out = FILTERS.freepi([
      { id: "particle", name: "Particle · 🔥 Free Unlimited: limited time" },
      { id: "gone", name: "Gone · unavailable", unavailable: true },
    ]);
    expect(out).toEqual([{ id: "particle", name: "Particle" }]);
  });
});
