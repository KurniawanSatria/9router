import { describe, expect, it } from "vitest";

import { getCapabilitiesForModel } from "../../open-sse/providers/capabilities.js";

const caps = (id, provider = "freepi") => getCapabilitiesForModel(provider, id);

describe("free-pi publishes its real 200k window", () => {
  it("clamps every free-pi model to the CLI's 200k/8k budget", () => {
    expect(caps("deepseek-v4.1-flash").contextWindow).toBe(200000);
    expect(caps("deepseek-v4.1-flash").maxOutput).toBe(8192);
    expect(caps("some-unlisted-model").contextWindow).toBe(200000);
  });

  it("keeps the model's reasoning and modality flags", () => {
    const c = caps("deepseek-v4.1-flash");
    expect(c.reasoning).toBe(true);
    expect(c.vision).toBe(true);
    expect(c.thinkingFormat).toBe("deepseek");
  });

  it("does not clamp the same model on other providers", () => {
    expect(caps("deepseek-v4.1-flash", "tokenharbor").contextWindow).toBe(1000000);
  });
});