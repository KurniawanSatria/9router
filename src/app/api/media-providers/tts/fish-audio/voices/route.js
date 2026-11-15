import { NextResponse } from "next/server";
import { getProviderConnections } from "@/lib/localDb";
import { fetchFishAudioVoices } from "open-sse/handlers/ttsProviders/fishAudio.js";
import { mergeVoiceLists } from "open-sse/handlers/ttsProviders/_base.js";

const langNames = new Intl.DisplayNames(["en"], { type: "language" });

/**
 * GET /api/media-providers/tts/fish-audio/voices[?lang=en]
 * Returns { languages, byLang } - the same shape as the other TTS voices routes.
 * Voice models (cloned or preset) are per account and used as `reference_id`.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const langFilter = searchParams.get("lang");

    // Direct DB read - bypass auth mutex used for TTS inference
    const connections = await getProviderConnections({ provider: "fish-audio", isActive: true });
    const apiKeys = [...new Set(connections.map((c) => c.apiKey).filter(Boolean))];
    if (!apiKeys.length) {
      return NextResponse.json({ error: "No Fish Audio connection found" }, { status: 400 });
    }

    const voices = mergeVoiceLists(
      await Promise.all(apiKeys.map((key) => fetchFishAudioVoices(key).catch(() => []))),
    );

    const byLang = {};
    for (const voice of voices) {
      const code = voice.lang || "und";
      if (!byLang[code]) {
        byLang[code] = {
          code,
          name: (() => { try { return langNames.of(code); } catch { return code; } })(),
          voices: [],
        };
      }
      byLang[code].voices.push({
        id: voice.id,
        name: voice.name,
        gender: "",
        lang: code,
      });
    }

    const languages = Object.values(byLang).sort((a, b) => a.name.localeCompare(b.name));

    if (langFilter) {
      return NextResponse.json({ voices: byLang[langFilter]?.voices || [] });
    }

    return NextResponse.json({ languages, byLang });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Failed to fetch voices" }, { status: 502 });
  }
}
