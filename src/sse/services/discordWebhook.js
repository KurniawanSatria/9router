/**
 * Discord webhook notifier using Components V2 (flags: 32768).
 *
 * Used to surface provider/combo failures without spawning OpenCode. Sends are
 * throttled per title (60s) to stay under Discord rate limits and avoid spam.
 */

const DEFAULT_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1568897847724613682/Fh80Y5erfX7j_s7Ybtl5FLh1Wxd5lUdDSS3gJfcvw7XxxJI-QQKDc5WrLPi-vKwhCEhC";

function appendWithComponents(url) {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("with_components")) u.searchParams.set("with_components", "true");
    return u.toString();
  } catch {
    return url.includes("?")
      ? `${url}&with_components=true`
      : `${url}?with_components=true`;
  }
}

const THROTTLE_MS = 60_000;
const lastSent = new Map();

async function resolveWebhookUrl() {
  if (process.env.DISCORD_WEBHOOK_URL) return process.env.DISCORD_WEBHOOK_URL;
  try {
    const { getSettings } = await import("@/lib/localDb");
    const settings = await getSettings();
    if (settings?.discordWebhookUrl) return settings.discordWebhookUrl;
  } catch {
    // fall through to default
  }
  return DEFAULT_WEBHOOK_URL;
}

export async function notifyDiscordError({ title, description, color = 0xed4245, fields } = {}) {
  const url = await resolveWebhookUrl();
  if (!url) return;

  const key = String(title || "error");
  const now = Date.now();
  const last = lastSent.get(key) || 0;
  if (now - last < THROTTLE_MS) return;
  lastSent.set(key, now);

  const components = [{ type: 10, content: `### ${title || "Error"}` }];
  if (description) components.push({ type: 10, content: String(description).slice(0, 3800) });
  if (Array.isArray(fields)) {
    for (const f of fields) {
      components.push({ type: 10, content: `**${f.name}**: ${f.value}` });
    }
  }

  const payload = {
    flags: 32768,
    components: [
      {
        type: 17,
        components,
      },
    ],
  };

  const sendUrl = appendWithComponents(url);

  try {
    await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // best effort; never throw into request path
  }
}
