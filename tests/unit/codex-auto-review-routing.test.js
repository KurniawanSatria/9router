import { describe, expect, it } from "vitest";

import {
  getDefaultModel,
} from "../../open-sse/config/providerModels.js";
import { getModelInfoCore } from "../../open-sse/services/model.js";

// Codex CLI's auto-review sends the bare model id "codex-auto-review". Before #1398 it fell
// through prefix inference to the "openai" default and failed with
// "No active credentials for provider: openai".
describe("codex auto-review routing (#1398)", () => {
  it("routes the bare Codex auto-review model to the OAuth Codex provider", async () => {
    await expect(getModelInfoCore("codex-auto-review", {})).resolves.toEqual({
      provider: "codex",
      model: "codex-auto-review",
    });
  });

  // The codex model catalog was dropped with the provider registry trim, so only the
  // prefix-inference contract above still has code to exercise.
  it("does not shadow the bare id with a registered Codex model", () => {
    expect(getDefaultModel("cx")).not.toBe("codex-auto-review");
  });
});
