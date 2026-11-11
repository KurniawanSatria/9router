import { describe, expect, it, vi } from "vitest";
import { handleComboChat } from "../../open-sse/services/combo.js";

describe("combo credit fallback", () => {
  // Every case advances to the next member: credit exhaustion falls back via the
  // "insufficient credit" text rule, and a plain request-scoped 400 advances too
  // (a different provider may accept the body). When the whole combo fails, the
  // first request-scoped response is handed back so the client sees the real 400.
  it.each([
    ["You have insufficient credits to make this request.", true],
    ["Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.", true],
    ["Bad request", false],
  ])("routes a 400 response correctly: %s", async (message, shouldContinue) => {
    const body = { messages: [{ role: "user", content: "Hello" }] };
    const models = ["cmc/deepseek/deepseek-v4-pro", "mistral/mistral-medium-latest"];
    const failure = Response.json({ error: { message } }, { status: 400 });
    const success = Response.json({ choices: [{ message: { content: "Hello" } }] });
    const handleSingleModel = vi.fn()
      .mockResolvedValueOnce(failure);

    const response = await handleComboChat({
      body, models, handleSingleModel,
      log: { info: vi.fn(), warn: vi.fn() },
      comboName: "credit-fallback", comboStrategy: "fallback",
    });

    expect(response.status).toBe(400);
    expect(handleSingleModel.mock.calls).toEqual(
      models.map((model) => [body, model])
    );
  });

  it("a credit-exhausted member falls through to the next model", async () => {
    const body = { messages: [{ role: "user", content: "Hello" }] };
    const models = ["cmc/deepseek/deepseek-v4-pro", "mistral/mistral-medium-latest"];
    const failure = Response.json({ error: { message: "insufficient credits" } }, { status: 400 });
    const success = Response.json({ choices: [{ message: { content: "Hello" } }] });
    const handleSingleModel = vi.fn()
      .mockResolvedValueOnce(failure)
      .mockResolvedValueOnce(success);

    const response = await handleComboChat({
      body, models, handleSingleModel,
      log: { info: vi.fn(), warn: vi.fn() },
      comboName: "credit-fallback", comboStrategy: "fallback",
    });

    expect(response).toBe(success);
    expect(handleSingleModel.mock.calls).toEqual(
      models.map((model) => [body, model])
    );
  });
});
