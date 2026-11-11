/**
 * Multi-turn continuity for store=false Responses backends (Codex-shaped /responses).
 * Prior-turn reasoning (+ encrypted_content) must survive Chat Completions ↔ Responses.
 */
import { describe, it, expect } from "vitest";
import {
  openaiToOpenAIResponsesRequest,
  openaiResponsesToOpenAIRequest,
} from "../../open-sse/translator/request/openai-responses.js";
import { translateRequest } from "../../open-sse/translator/index.js";

describe("openai ↔ responses multi-turn reasoning", () => {
  it("openai→responses re-emits reasoning item with summary + encrypted_content", () => {
    const body = {
      model: "gpt-5.5",
      messages: [
        { role: "user", content: "hi" },
        {
          role: "assistant",
          content: "hello",
          reasoning_content: "thinking hard about greeting",
          encrypted_content: "enc_blob_turn1",
        },
        { role: "user", content: "next" },
      ],
    };

    const out = openaiToOpenAIResponsesRequest("gpt-5.5", body, true, null);
    expect(out.store).toBe(false);

    const reasoning = out.input.filter((i) => i.type === "reasoning");
    expect(reasoning).toHaveLength(1);
    expect(reasoning[0].encrypted_content).toBe("enc_blob_turn1");
    expect(reasoning[0].summary?.[0]?.text).toMatch(/thinking hard/);

    // Order: user → reasoning → assistant → user
    const types = out.input.map((i) => i.type || i.role);
    expect(types).toEqual(["message", "reasoning", "message", "message"]);
    expect(out.input[0].role).toBe("user");
    expect(out.input[2].role).toBe("assistant");
    expect(out.input[3].role).toBe("user");
  });

  it("accepts reasoning_encrypted_content alias on assistant messages", () => {
    const out = openaiToOpenAIResponsesRequest(
      "m",
      {
        messages: [
          {
            role: "assistant",
            content: "ok",
            reasoning_encrypted_content: "alt_enc",
          },
        ],
      },
      true,
      null
    );
    expect(out.input.find((i) => i.type === "reasoning")?.encrypted_content).toBe("alt_enc");
  });

  it("responses→openai attaches reasoning_content + encrypted_content to assistant", () => {
    const body = {
      model: "gpt-5.5",
      input: [
        { type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] },
        {
          type: "reasoning",
          summary: [{ type: "summary_text", text: "plan A" }],
          encrypted_content: "enc_xyz",
        },
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "hello" }],
        },
      ],
    };

    const out = openaiResponsesToOpenAIRequest("gpt-5.5", body, true, null);
    const assistant = out.messages.find((m) => m.role === "assistant");
    expect(assistant).toBeTruthy();
    expect(assistant.reasoning_content).toBe("plan A");
    expect(assistant.encrypted_content).toBe("enc_xyz");
  });

  it("round-trips encrypted_content through openai → responses → openai", () => {
    const original = {
      model: "gpt-5.5",
      messages: [
        { role: "user", content: "q1" },
        {
          role: "assistant",
          content: "a1",
          reasoning_content: "r1",
          encrypted_content: "ENC_KEEP_ME",
        },
        { role: "user", content: "q2" },
      ],
    };

    const responses = openaiToOpenAIResponsesRequest("gpt-5.5", structuredClone(original), true, null);
    const back = openaiResponsesToOpenAIRequest("gpt-5.5", responses, true, null);
    const again = openaiToOpenAIResponsesRequest("gpt-5.5", back, true, null);

    const enc = again.input.find((i) => i.type === "reasoning")?.encrypted_content;
    expect(enc).toBe("ENC_KEEP_ME");
  });

  it("translateRequest openai→openai-responses preserves encrypted blob", () => {
    const body = {
      model: "gpt-5.5",
      messages: [
        { role: "user", content: "hi" },
        {
          role: "assistant",
          content: "yo",
          reasoning_content: "why",
          encrypted_content: "blob_via_registry",
        },
        { role: "user", content: "go" },
      ],
    };
    const out = translateRequest(
      "openai",
      "openai-responses",
      "gpt-5.5",
      structuredClone(body),
      true,
      {},
      "opencode"
    );
    expect(out.input.some((i) => i.type === "reasoning" && i.encrypted_content === "blob_via_registry")).toBe(
      true
    );
  });
});
