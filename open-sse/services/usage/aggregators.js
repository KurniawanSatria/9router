/**
 * Aggregator usage (zro, tokenharbor, …) — these OpenAI-compatible gateways
 * carry no dedicated quota endpoint. Quota state rides on the chat response
 * instead: an exhausted key answers 402/429 with a message that states the
 * remaining wait ("It resets in 1h 35m"). So the tracker issues the cheapest
 * possible probe (max_tokens:1) and reads that message.
 *
 * Recognised bodies:
 *   402 budget_exceeded  → daily/free quota drained, resets in <duration>
 *   402 balance_zero     → no plan + empty wallet (tokenharbor)
 *   429                  → rate limited, may carry its own reset duration
 *   200                  → key still has quota (nothing to report)
 */

import { proxyAwareFetch } from "../../utils/proxyFetch.js";

// Groq-style duration strings ("1h35m", "2m59.56s", "7.66s") → milliseconds.
function parseDurationMs(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  const re = /(\d+(?:\.\d+)?)\s*(ms|s|m|h)/gi;
  let match;
  let totalMs = 0;
  let matched = false;
  while ((match = re.exec(value))) {
    matched = true;
    const amount = Number(match[1]);
    const unitMs = { h: 3600000, m: 60000, s: 1000, ms: 1 }[match[2].toLowerCase()];
    totalMs += amount * unitMs;
  }
  return matched ? totalMs : null;
}

function resetAtFromMessage(message) {
  // "It resets in 1h 35m", "resets in 45m", "resets in 2 hours 10 minutes"
  const m = String(message).match(/resets?\s+in\s+([^.,;]+)/i);
  if (!m) return null;
  const ms = parseDurationMs(m[1]);
  return ms === null ? null : new Date(Date.now() + ms).toISOString();
}

function pickFirstModel(models) {
  const list = Array.isArray(models) ? models : [];
  const chat = list.find((m) => (m.mode || "chat") === "chat");
  return (chat || list[0])?.id || null;
}

async function probeAggregator({ apiKey, baseUrl, proxyOptions }) {
  // Discover a model with the same key (cheap, no generation), then burn the
  // minimum possible completion to surface the quota error body.
  const modelsRes = await proxyAwareFetch(
    `${baseUrl}/models`,
    { method: "GET", headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } },
    proxyOptions,
  );
  if (modelsRes.status === 401 || modelsRes.status === 403) {
    return { auth: false };
  }
  const models = modelsRes.ok ? await modelsRes.json().catch(() => ({})) : {};
  const model = pickFirstModel(models?.data);
  if (!model) return { auth: true, model: null };

  const chatRes = await proxyAwareFetch(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
    },
    proxyOptions,
  );
  const body = await chatRes.json().catch(() => ({}));
  return { auth: true, model, status: chatRes.status, body };
}

async function getAggregatorUsage(provider, baseUrl, apiKey, proxyOptions = null) {
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return { plan: provider, message: `${provider} API key not available. Add a key to view usage.` };
  }
  const key = apiKey.trim();

  try {
    const probe = await probeAggregator({ apiKey: key, baseUrl, proxyOptions });

    if (probe.auth === false) {
      return { plan: provider, message: `${provider} authentication failed. Check the API key.` };
    }

    // Key works and the model answered — quota available, nothing to meter.
    if (probe.status === 200) {
      return {
        plan: provider,
        message: `${provider} connected. Quota available.`,
        quotas: {},
      };
    }

    const error = probe.body?.error || {};
    const message = error.message || "";
    const resetAt = resetAtFromMessage(message);

    // Quota drained with a stated reset → tracker row with countdown.
    if (resetAt) {
      return {
        plan: provider,
        quotas: {
          "Daily quota": {
            used: 1,
            total: 1,
            resetAt,
            unlimited: false,
          },
        },
      };
    }

    // Auth ok, but no quota and no reset window (e.g. empty wallet).
    return { plan: provider, message: message || `${provider} quota unavailable (status ${probe.status || "?"}).` };
  } catch (error) {
    return { message: `${provider} error: ${error.message}` };
  }
}

export function getZroUsage(apiKey, proxyOptions = null) {
  return getAggregatorUsage("zro", "https://zro.moonmath.ai/v1", apiKey, proxyOptions);
}

export function getTokenharborUsage(apiKey, proxyOptions = null) {
  return getAggregatorUsage("tokenharbor", "https://tokenharbor.ai/v1", apiKey, proxyOptions);
}
