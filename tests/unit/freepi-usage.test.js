import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn(),
}));

import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";
import { getUsageForProvider } from "../../open-sse/services/usage.js";
import { parseFreepiStats } from "../../open-sse/services/usage/freepi.js";
import {
  USAGE_SUPPORTED_PROVIDERS,
  USAGE_APIKEY_PROVIDERS,
} from "../../src/shared/constants/providers.js";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const STATS = {
  tier: "established",
  cap_usd_today: 2,
  spent_usd_today: 0.5,
  remaining_usd_today: 1.5,
  credit_usd: 3,
  refill_at: "2026-11-10T00:00:00.000Z",
  lane: "standard",
  prompt_tokens_today: 1200,
  completion_tokens_today: 300,
};

describe("freepi registry usage flags", () => {
  it("is an OAuth usage provider", () => {
    expect(USAGE_SUPPORTED_PROVIDERS).toContain("freepi");
    expect(USAGE_APIKEY_PROVIDERS).not.toContain("freepi");
  });
});

describe("parseFreepiStats", () => {
  it("maps the daily allowance and purchased credits", () => {
    const usage = parseFreepiStats(STATS);
    expect(usage.plan).toBe("free-pi Established");
    expect(usage.quotas["Daily Allowance"]).toMatchObject({
      used: 0.5,
      total: 2,
      remainingPercentage: 75,
      resetAt: "2026-11-10T00:00:00.000Z",
      currency: "USD",
    });
    expect(usage.quotas.Credits).toMatchObject({ total: 3, isCreditBalance: true });
    expect(usage.message).toBeUndefined();
  });

  it("drops empty rows and flags the slow lane", () => {
    const usage = parseFreepiStats({ tier: "new", cap_usd_today: 0, credit_usd: 0, lane: "fallback" });
    expect(usage.quotas).toEqual({});
    expect(usage.plan).toBe("free-pi New");
    expect(usage.message).toContain("slow lane");
  });
});

describe("getUsageForProvider(freepi)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GETs /me/stats with the OAuth access token", async () => {
    proxyAwareFetch.mockResolvedValueOnce(response(STATS));

    const usage = await getUsageForProvider({ provider: "freepi", accessToken: "jwt" });

    const [url, opts] = proxyAwareFetch.mock.calls[0];
    expect(url).toBe("https://api.freepi.ai/me/stats");
    expect(opts.headers.Authorization).toBe("Bearer jwt");
    expect(usage.quotas["Daily Allowance"].total).toBe(2);
  });

  it("explains an expired credential", async () => {
    proxyAwareFetch.mockResolvedValueOnce(response({}, 401));
    const usage = await getUsageForProvider({ provider: "freepi", accessToken: "jwt" });
    expect(usage.message).toContain("Sign in again");
  });
});
