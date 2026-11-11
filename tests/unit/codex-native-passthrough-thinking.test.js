import { describe, expect, it } from "vitest";

import { translateRequest } from "../../open-sse/translator/index.js";

// The native codex passthrough path went away with the codex executor, but the
// suffix → reasoning contract it asserted lives in the shared thinking pipeline.
function runResponsesTranslation(model, body) {
  return translateRequest(
    "openai-responses",
    "openai",
    model,
    { model, input: "hello", stream: false, ...body },
    false,
    {},
    "codex",
    undefined,
    undefined,
    "test-connection",
    null,
  );
}

describe("Codex thinking suffixes", () => {
  it("forwards Ultra for Sol", () => {
    const body = runResponsesTranslation("gpt-5.6-sol(ultra)");

    expect(body.reasoning_effort).toBe("ultra");
  });

  it("converts unsupported Luna Ultra to Max without dropping reasoning metadata", () => {
    const body = runResponsesTranslation("gpt-5.6-luna(ultra)", {
      reasoning: { effort: "low", summary: "detailed" },
    });

    expect(body.reasoning_effort).toBe("max");
  });

  it("forwards Ultra for a Terra review alias", () => {
    const body = runResponsesTranslation("gpt-5.6-terra-review(ultra)", {
      reasoning: { effort: "low" },
    });

    expect(body.reasoning_effort).toBe("ultra");
  });
});
