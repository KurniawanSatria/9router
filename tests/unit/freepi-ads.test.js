import { describe, it, expect, vi, beforeEach } from "vitest";

const calls = [];
globalThis.fetch = vi.fn(async (url, init = {}) => {
  calls.push({ url, init });
  if (String(url).includes("/ads/next")) {
    return new Response(JSON.stringify({
      ad_id: "ad-1",
      click_token: "click-1",
      source: "gravity",
      imp_url: "https://api.trygravity.ai/ack?p=1",
    }), { status: 200 });
  }
  return new Response("{}", { status: 200 });
});

const { ensureFreepiAd } = await import("../../open-sse/services/freepiAds.js");

const creds = (userId) => ({
  accessToken: "jwt",
  providerSpecificData: { userId, clientVersion: "0.6.15" },
});

describe("ensureFreepiAd", () => {
  beforeEach(() => calls.length = 0);

  it("fetches an ad, fires the gravity pixel and posts the impression", async () => {
    await ensureFreepiAd(creds("user-a"));
    const paths = calls.map((c) => String(c.url));
    expect(paths[0]).toContain("/ads/next?slot=banner");
    expect(paths[1]).toBe("https://api.trygravity.ai/ack?p=1");
    expect(paths[2]).toContain("/ads/impression");
    const headers = calls[0].init.headers;
    expect(headers["x-session-id"]).toBe("user-a");
    expect(headers["x-client-version"]).toBe("0.6.15");
    expect(JSON.parse(calls[2].init.body)).toEqual({
      ad_id: "ad-1",
      click_token: "click-1",
      imp_fired: true,
    });
  });

  it("shares one fetch between concurrent calls and skips the next request within the TTL", async () => {
    const account = creds("user-b");
    await Promise.all([ensureFreepiAd(account), ensureFreepiAd(account)]);
    expect(calls.filter((c) => String(c.url).includes("/ads/next"))).toHaveLength(1);
    calls.length = 0;
    await ensureFreepiAd(account);
    expect(calls).toHaveLength(0);
  });

  it("does not throw when the ad request fails", async () => {
    fetch.mockImplementationOnce(async () => { throw new Error("offline"); });
    await expect(ensureFreepiAd(creds("user-c"))).resolves.toBeUndefined();
  });
});
