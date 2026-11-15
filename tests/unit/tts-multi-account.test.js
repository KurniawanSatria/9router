// TTS account pool: the upstream status must survive to handleTts so a quota
// 429/402 locks that account instead of the default transient cooldown, and
// voices are read from every account, not just the first.
import { afterEach, describe, expect, it, vi } from "vitest";

import { handleTtsCore } from "open-sse/handlers/ttsCore.js";
import { mergeVoiceLists } from "open-sse/handlers/ttsProviders/_base.js";
import { fetchFishAudioVoices } from "open-sse/handlers/ttsProviders/fishAudio.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TTS upstream status", () => {
  it("keeps the ElevenLabs quota status instead of flattening it to 502", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ detail: { message: "quota exceeded" } }),
    })));

    const result = await handleTtsCore({
      provider: "elevenlabs",
      model: "voiceA",
      input: "hello",
      credentials: { apiKey: "k" },
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error).toBe("quota exceeded");
  });

  it("keeps the Fish Audio payment status on the generic path", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 402,
      text: async () => JSON.stringify({ message: "Insufficient credit" }),
    })));

    const result = await handleTtsCore({
      provider: "fish-audio",
      model: "s2.1-pro-free/voiceA",
      input: "hello",
      credentials: { apiKey: "k" },
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(402);
    expect(result.error).toBe("Insufficient credit");
  });
});

describe("mergeVoiceLists", () => {
  it("merges accounts in order and drops duplicate ids", () => {
    const merged = mergeVoiceLists(
      [[{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }], null],
    );
    expect(merged.map((v) => v.id)).toEqual(["a", "b", "c"]);
  });

  it("takes the id accessor for shapes that do not use `id`", () => {
    const merged = mergeVoiceLists(
      [[{ voice_id: "x", name: "first" }], [{ voice_id: "x", name: "second" }]],
      (v) => v.voice_id,
    );
    expect(merged).toEqual([{ voice_id: "x", name: "first" }]);
  });
});

describe("fetchFishAudioVoices", () => {
  it("lists the account's voice models with Bearer auth and caches them", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [{ _id: "m1", title: "Narrator", languages: [{ id: "en" }], state: "trained" }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const voices = await fetchFishAudioVoices("key-cache-test");
    expect(voices).toEqual([{ id: "m1", name: "Narrator", lang: "en", state: "trained" }]);

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer key-cache-test");
    expect(fetchMock.mock.calls[0][0]).toContain("self=true");

    await fetchFishAudioVoices("key-cache-test");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});