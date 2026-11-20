import { beforeEach, describe, expect, it, vi } from "vitest";

const upstreamFetch = vi.fn();
vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: (...args) => upstreamFetch(...args),
}));

const versionFetch = vi.fn();
vi.stubGlobal("fetch", versionFetch);

const { getExecutor } = await import("../../open-sse/executors/index.js");
const { FILTERS } = await import("../../src/app/api/providers/suggested-models/filters.js");
const { resolveConversationKey, getConversationBinding, clearSessionStore } = await import("../../open-sse/utils/sessionManager.js");

const ok = { status: 200, headers: { get: () => "" } };
const credentials = (clientVersion, extra = {}) => ({
  accessToken: "jwt",
  connectionId: extra.connectionId,
  freshSession: extra.freshSession,
  providerSpecificData: { clientVersion, userId: extra.userId || "user-1" },
});
const execute = (body = {}, extra = {}) => getExecutor("freepi").execute({
  model: "particle",
  body,
  stream: false,
  credentials: credentials("0.6.2", extra),
});

beforeEach(() => {
  upstreamFetch.mockReset().mockResolvedValue(ok);
  versionFetch.mockReset().mockResolvedValue({ ok: true, json: async () => ({ latest: "0.6.15" }) });
  clearSessionStore();
});

describe("freepi additions", () => {
  it("refreshes the client version before the request and caches it", async () => {
    const versionCalls = () => versionFetch.mock.calls.filter(([url]) => !String(url).includes("/ads/")).length;
    await execute();
    expect(upstreamFetch.mock.calls[0][1].headers["x-client-version"]).toBe("0.6.15");
    await execute();
    expect(versionCalls()).toBe(1);
  });

  it("keeps one session id across the turns of a conversation", async () => {
    const body = {
      messages: [
        { role: "user", content: "build it" },
        { role: "assistant", content: "Sure, here is a reasonably long opening answer so the turn is recognisably in progress." },
        { role: "user", content: "go on" },
      ],
    };
    const run = (messages) => getExecutor("freepi").execute({
      model: "particle",
      body: { ...body, messages },
      stream: false,
      credentials: credentials("0.6.2"),
    });

    await run(body.messages);
    await run([...body.messages, { role: "assistant", content: "next" }, { role: "user", content: "more" }]);
    await run([{ role: "user", content: "a different conversation entirely" }]);

    const ids = upstreamFetch.mock.calls.map(([, init]) => init.headers["x-session-id"]);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
  });

  it("leaves a too-long conversation intact so the client can compact it", async () => {
    const tooLong = {
      status: 413,
      headers: { get: () => "application/json" },
      clone: () => ({ text: async () => '{"code":"context_too_long"}' }),
    };
    upstreamFetch.mockReset().mockResolvedValue(tooLong);

    const messages = [{ role: "system", content: "sys" }];
    for (let i = 0; i < 20; i++) {
      messages.push({ role: "user", content: `u${i}` }, { role: "assistant", content: `a${i}` });
    }

    const result = await getExecutor("freepi").execute({
      model: "particle",
      body: { messages },
      stream: false,
      credentials: credentials("0.6.2"),
    });

    expect(result.response.status).toBe(413);
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(upstreamFetch.mock.calls[0][1].body).messages).toEqual(messages);
  });

  it("remembers the account that owns a conversation", async () => {
    const body = {
      messages: [
        { role: "user", content: "pin this conversation" },
        { role: "assistant", content: "This opening answer is long enough to give the conversation a stable fingerprint." },
        { role: "user", content: "continue" },
      ],
    };
    await execute(body, { connectionId: "acct-a" });

    const key = resolveConversationKey({ body, scope: "freepi" });
    expect(key).toBeTruthy();
    expect(getConversationBinding("freepi", key)).toMatchObject({ connectionId: "acct-a" });
  });

  it("rekeys the session id after an account mismatch", async () => {
    const body = {
      messages: [
        { role: "user", content: "rekey this conversation" },
        { role: "assistant", content: "This opening answer is long enough to give the conversation a stable fingerprint." },
        { role: "user", content: "continue" },
      ],
    };
    await execute(body, { connectionId: "acct-a" });
    await execute(body, { connectionId: "acct-a", freshSession: true });
    await execute(body, { connectionId: "acct-b" });

    const ids = upstreamFetch.mock.calls.map(([, init]) => init.headers["x-session-id"]);
    expect(ids[1]).not.toBe(ids[0]);
    // The rekey is remembered, so the next turn on any account reuses it.
    expect(ids[2]).toBe(ids[1]);
  });

  it("strips the promo suffix from model names", () => {
    const out = FILTERS.freepi([
      { id: "particle", name: "Particle · 🔥 Free Unlimited: limited time" },
      { id: "gone", name: "Gone · unavailable", unavailable: true },
    ]);
    expect(out).toEqual([{ id: "particle", name: "Particle" }]);
  });
});
