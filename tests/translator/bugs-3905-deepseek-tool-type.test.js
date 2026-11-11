// Regression for #3905: defaultClaudeToolType() (type:"custom") must only run for
// gateways that declare the requireClaudeToolType quirk (MiniMax). Claude-format
// endpoints that only accept the legacy typeless tool shape — e.g. DeepSeek's
// Anthropic-compatible endpoint, which answers HTTP 400 "unknown variant `custom`" —
// must never receive tools[].type = "custom".
import { describe, it, expect } from "vitest";
import { PROVIDERS } from "../../open-sse/providers/index.js";
import { FORMATS } from "../../open-sse/translator/formats.js";
import { shouldDefaultClaudeToolType } from "../../open-sse/translator/concerns/toolCall.js";

const tools = [{ name: "get_weather", description: "weather", input_schema: { type: "object" } }];

describe("Claude tool `type` defaulting is provider-scoped (#3905)", () => {
  const GATEWAY = { quirks: { requireClaudeToolType: true } };

  it("runs only for providers declaring requireClaudeToolType", () => {
    const providers = { gateway: GATEWAY };
    expect(shouldDefaultClaudeToolType("gateway", FORMATS.CLAUDE, tools, providers)).toBe(true);
    // Endpoints accepting only the legacy typeless shape must NOT get type:"custom".
    expect(shouldDefaultClaudeToolType("deepseek", FORMATS.CLAUDE, tools, PROVIDERS)).toBe(false);
    expect(shouldDefaultClaudeToolType("opencode", FORMATS.CLAUDE, tools, PROVIDERS)).toBe(false);
  });

  it("never applies outside Claude-format requests or without tools", () => {
    const providers = { gateway: GATEWAY };
    expect(shouldDefaultClaudeToolType("gateway", FORMATS.OPENAI, tools, providers)).toBe(false);
    expect(shouldDefaultClaudeToolType("gateway", FORMATS.CLAUDE, undefined, providers)).toBe(false);
    expect(shouldDefaultClaudeToolType("gateway", FORMATS.CLAUDE, null, providers)).toBe(false);
  });

  it("declares the quirk on no registered provider (registry tripwire)", () => {
    const declaring = Object.entries(PROVIDERS)
      .filter(([, p]) => p?.quirks?.requireClaudeToolType === true)
      .map(([id]) => id);
    expect(declaring).toEqual([]);
  });
});
