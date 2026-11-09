/**
 * Discord webhook notifier using Components V2 (flags: 32768).
 *
 * Used to surface provider/combo failures without spawning OpenCode. Sends are
 * throttled per title (60s) to stay under Discord rate limits and avoid spam.
 *
 * The destination webhook is configurable at runtime from Dashboard → Profile →
 * Notifications (persisted as `discordWebhookUrl` in settings). Resolution order:
 *   1. settings.discordWebhookUrl  (saved from the UI)
 *   2. DISCORD_WEBHOOK_URL env var
 *   3. DEFAULT_WEBHOOK_URL         (built-in fallback)
 */

import os from "node:os";

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

async function readSettingsSafely() {
  try {
    const { getSettings } = await import("@/lib/localDb");
    return (await getSettings()) || {};
  } catch {
    return {};
  }
}

export function isDiscordWebhookUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * Resolve the webhook target.
 * @param {{ overrideUrl?: string, settings?: object }} [opts]
 * @returns {Promise<{ url: string, source: "override"|"settings"|"env"|"default" }>}
 */
async function resolveWebhook(opts = {}) {
  if (isDiscordWebhookUrl(opts.overrideUrl)) {
    return { url: opts.overrideUrl.trim(), source: "override" };
  }

  const settings = opts.settings || (await readSettingsSafely());
  if (isDiscordWebhookUrl(settings.discordWebhookUrl)) {
    return { url: settings.discordWebhookUrl.trim(), source: "settings" };
  }

  if (isDiscordWebhookUrl(process.env.DISCORD_WEBHOOK_URL)) {
    return { url: process.env.DISCORD_WEBHOOK_URL.trim(), source: "env" };
  }

  return { url: DEFAULT_WEBHOOK_URL, source: "default" };
}

/** True unless the user turned the notifier off in settings. */
async function isNotifierEnabled(settingsOverride) {
  const settings = settingsOverride || (await readSettingsSafely());
  return settings.discordWebhookEnabled !== false;
}

export function formatDiscordTimestamp(value, style = "F") {
  if (!value) return "unknown";
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(ms)) return String(value);
  return `<t:${Math.floor(ms / 1000)}:${style}>`;
}

function buildPayload({ title, description, fields, footer }) {
  const header = [
    `**${title || "Error"}**`,
    description && `-# ${String(description).slice(0, 1500)}`,
  ].filter(Boolean).join("\n");
  const body = (Array.isArray(fields) ? fields : [])
    .filter((f) => f && f.name)
    .map((f) => `**${f.name}:** ${f.value ?? "unknown"}`)
    .join("\n");

  const components = [{ type: 10, content: header }];
  if (body) components.push({ type: 14 }, { type: 10, content: body.slice(0, 3500) });
  if (footer) components.push({ type: 14 }, { type: 10, content: `-# ${footer}` });

  return {
    flags: 32768,
    components: [{ type: 17, components }],
  };
}

async function postToDiscord(url, payload, timeoutMs = 8000) {
  const res = await fetch(appendWithComponents(url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const text = await res.text();
      detail = text ? `: ${text.slice(0, 300)}` : "";
    } catch {
      /* ignore */
    }
    throw new Error(`Discord responded ${res.status}${detail}`);
  }

  return res;
}

/**
 * Fire-and-forget notifier used inside request paths. Never throws.
 * @returns {Promise<boolean>} whether a message was actually sent
 */
export async function notifyDiscordError({ title, description, fields, footer } = {}) {
  try {
    const settings = await readSettingsSafely();
    if (!(await isNotifierEnabled(settings))) return false;

    const { url } = await resolveWebhook({ settings });
    if (!url) return false;

    const key = String(title || "error");
    const now = Date.now();
    const last = lastSent.get(key) || 0;
    if (now - last < THROTTLE_MS) return false;
    lastSent.set(key, now);

    await postToDiscord(url, buildPayload({ title, description, fields, footer }));
    return true;
  } catch {
    // best effort; never throw into request path
    return false;
  }
}

/**
 * Send a one-off test message (bypasses enable flag + throttle).
 * Used by the "Send test message" button on the settings page so the user can
 * verify a freshly pasted webhook URL before saving.
 */
export async function sendDiscordTestMessage({ url, title = "9Router webhook test" } = {}) {
  const resolved = await resolveWebhook({ overrideUrl: url });
  if (!resolved.url) {
    return { ok: false, error: "No webhook URL configured" };
  }

  try {
    await postToDiscord(
      resolved.url,
      buildPayload({
        title,
        description: `Webhook is reachable. Source: **${resolved.source}**.`,
        fields: [
          { name: "Time", value: formatDiscordTimestamp(Date.now(), "F") },
          { name: "Host", value: os.hostname() },
        ],
        footer: "_Test message completed successfully._",
      }),
    );
    return { ok: true, source: resolved.source };
  } catch (err) {
    return { ok: false, error: err?.message || String(err), source: resolved.source };
  }
}

/** Exposed for diagnostics; reports where the next message would go. */
export async function getDiscordWebhookStatus() {
  const settings = await readSettingsSafely();
  const { url, source } = await resolveWebhook({ settings });
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    host = "";
  }
  return {
    enabled: settings.discordWebhookEnabled !== false,
    source,
    host,
    usesDefault: source === "default",
  };
}
