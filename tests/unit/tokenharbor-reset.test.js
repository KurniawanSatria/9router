import { describe, expect, it } from "vitest";
import { tokenharborFreeTierResetMs } from "../../open-sse/services/accountFallback.js";

const WRAP = (message) => JSON.stringify({ error: { message, type: "free_tier_limit_reached" } });

describe("tokenharborFreeTierResetMs", () => {
  it("reads the 'comes back on … UTC' body", () => {
    const text = WRAP("Your free allowance for ':free' models is used up. It comes back on 10 Nov 2030 at 22:21 UTC. Your account is not limited.");
    expect(tokenharborFreeTierResetMs(429, text, "tokenharbor")).toBe(Date.UTC(2030, 10, 10, 22, 21));
  });

  it("reads the 'next rolling 7-day period starts on … UTC' body", () => {
    const text = WRAP("You've used this period's free allowance. Your next rolling 7-day period starts on 10 Nov 2030 at 22:21 UTC. Use the paid model.");
    expect(tokenharborFreeTierResetMs(429, text, "tokenharbor")).toBe(Date.UTC(2030, 10, 10, 22, 21));
  });

  it("ignores other providers and statuses", () => {
    const text = WRAP("comes back on 10 Nov 2030 at 22:21 UTC");
    expect(tokenharborFreeTierResetMs(429, text, "zro")).toBeNull();
    expect(tokenharborFreeTierResetMs(402, text, "tokenharbor")).toBeNull();
  });

  it("ignores a past reset time", () => {
    const text = WRAP("comes back on 10 Nov 2020 at 22:21 UTC");
    expect(tokenharborFreeTierResetMs(429, text, "tokenharbor")).toBeNull();
  });
});
