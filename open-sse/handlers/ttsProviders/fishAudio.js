// Fish Audio voice models — an account's cloned/preset voices are listed by
// `GET /model?self=true` and used as `reference_id` at synthesis time.
const VOICES_TTL = 24 * 60 * 60 * 1000;
const _voicesCache = new Map(); // by API key

export async function fetchFishAudioVoices(apiKey) {
  if (!apiKey) throw new Error("Fish Audio API key required");
  const now = Date.now();
  const cached = _voicesCache.get(apiKey);
  if (cached && now - cached.time < VOICES_TTL) return cached.voices;

  const res = await fetch("https://api.fish.audio/model?self=true&page_size=100", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Fish Audio voices fetch failed: ${res.status}`);
  const data = await res.json();
  const voices = (data.items || []).map((m) => ({
    id: m._id,
    name: m.title || m._id,
    lang: m.languages?.[0]?.id || "",
    state: m.state,
  }));
  _voicesCache.set(apiKey, { voices, time: now });
  return voices;
}
