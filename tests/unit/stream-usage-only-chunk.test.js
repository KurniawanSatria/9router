import { describe, it, expect } from "vitest";
import { createSSEStream } from "../../open-sse/utils/stream.js";

const chunk = (payload) => `data: ${JSON.stringify({
  id: "chatcmpl-usage",
  object: "chat.completion.chunk",
  created: 1700000000,
  model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
  ...payload,
})}\n\n`;

async function readAll(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("passthrough usage-only trailer", () => {
  it("records the real token counts from a choices:[] chunk", async () => {
    const sse = [
      chunk({ choices: [{ index: 0, delta: { role: "assistant", reasoning_content: "hi" }, finish_reason: null }] }),
      chunk({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }),
      chunk({
        choices: [],
        usage: { prompt_tokens: 18, completion_tokens: 24, total_tokens: 42, completion_tokens_details: { reasoning_tokens: 24 } },
      }),
    ].join("") + "data: [DONE]\n\n";

    let completed = null;
    const stream = createSSEStream({
      mode: "passthrough",
      provider: "nvidia",
      model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
      onStreamComplete: (content, usage) => { completed = { content, usage }; },
    });

    const writer = stream.writable.getWriter();
    const readPromise = readAll(stream.readable);
    await writer.write(new TextEncoder().encode(sse));
    await writer.close();
    await readPromise;

    expect(completed.content.thinking).toBe("hi");
    expect(completed.usage.prompt_tokens).toBe(18);
    expect(completed.usage.completion_tokens).toBe(24);
    expect(completed.usage.reasoning_tokens).toBe(24);
  });
});
