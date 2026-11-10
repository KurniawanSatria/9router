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
const credentials = (clientVersion) => ({ accessToken: "jwt", providerSpecificData: { clientVersion, userId: "user-1" } });
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

  it("gives every request its own session id", async () => {
    await execute();
    await execute();
    const ids = upstreamFetch.mock.calls.map(([, init]) => init.headers["x-session-id"]);
    expect(ids[0]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("keeps trimming and retrying while the conversation is still too long", async () => {
    const tooLong = () => ({
      status: 413,
      headers: { get: () => "application/json" },
      clone: () => ({ text: async () => '{"code":"context_too_long"}' }),
    });
    upstreamFetch.mockReset()
      .mockResolvedValueOnce(tooLong())
      .mockResolvedValueOnce(tooLong())
      .mockResolvedValue(ok);

    const messages = [{ role: "system", content: "sys" }];
    for (let i = 0; i < 6; i++) {
      messages.push({ role: "user", content: `u${i}` }, { role: "assistant", content: `a${i}` });
    }

    const result = await getExecutor("freepi").execute({
      model: "particle",
      body: { messages },
      stream: false,
      credentials: credentials("0.6.2"),
    });

    expect(result.response.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledTimes(3);
    const first = JSON.parse(upstreamFetch.mock.calls[1][1].body).messages;
    const second = JSON.parse(upstreamFetch.mock.calls[2][1].body).messages;
    expect(second.length).toBeLessThan(first.length);
    expect(second[0].role).toBe("system");
    expect(second[1].role).toBe("user");
  });

  it("strips the promo suffix from model names", () => {
    const out = FILTERS.freepi([
      { id: "particle", name: "Particle · 🔥 Free Unlimited: limited time" },
      { id: "gone", name: "Gone · unavailable", unavailable: true },
    ]);
    expect(out).toEqual([{ id: "particle", name: "Particle" }]);
  });
});
