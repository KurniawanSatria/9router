import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveModelIcon, MODEL_ICONS } from "../../src/shared/utils/modelBrand.js";

const REPO = new URL("../../", import.meta.url).pathname;

describe("resolveModelIcon", () => {
  it("matches common model ids", () => {
    const cases = {
      "claude-sonnet-4-5": "claude",
      "anthropic/claude-opus-4-1": "claude",
      "gpt-5": "openai",
      "o3-mini": "openai",
      "gemini-2.5-pro": "gemini",
      "deepseek-chat": "deepseek",
      "qwen3-coder-plus": "qwen",
      "glm-4.6": "zai",
      "kimi-k2-0905": "moonshot",
      "grok-4": "grok",
      "mistral-large-2411": "mistral",
      "llama-3.3-70b": "meta",
      "command-a-03-2025": "cohere",
      "minimax-m2": "minimax",
      "step-3": "stepfun",
      "longcat-flash": "longcat",
      "beam-free": "reflection",
      "laguna-s-2.1": "poolside",
      "ling-3.0-flash-free": "ling",
    };
    for (const [modelId, slug] of Object.entries(cases)) {
      expect(resolveModelIcon(modelId)?.slug, modelId).toBe(slug);
    }
  });

  it("keeps lobehub's first-match-wins order", () => {
    expect(resolveModelIcon("glm-4.6v")?.slug).toBe("glmv");
    expect(resolveModelIcon("glm-4.6")?.slug).toBe("zai");
    expect(resolveModelIcon("glm-3-turbo")?.slug).toBe("chatglm");
  });

  it("returns null for a model it cannot attribute", () => {
    expect(resolveModelIcon("mystery-gateway-model")).toBeNull();
    expect(resolveModelIcon("")).toBeNull();
    expect(resolveModelIcon(null)).toBeNull();
  });

  it("paints currentColor-only brand art with the brand accent", () => {
    for (const slug of ["aws", "yi", "longcat", "unionalpha"]) {
      expect(MODEL_ICONS.find((m) => m.slug === slug)?.color, slug).toBe(true);
    }
  });

  it("points at an asset that exists in /public", () => {
    const missing = MODEL_ICONS.map((m) => `/model-icons/${m.slug}${m.color ? "-color" : ""}.svg`)
      .filter((url) => !existsSync(`${REPO}public${url}`));
    expect(missing).toEqual([]);
  });
});
