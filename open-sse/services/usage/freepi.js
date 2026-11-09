import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { U, parseResetTime, toFiniteNumber } from "./shared.js";

function formatTier(tier) {
  const raw = String(tier || "").trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Free";
}

export function parseFreepiStats(stats) {
  const quotas = {};
  const cap = toFiniteNumber(stats?.cap_usd_today);
  const spent = toFiniteNumber(stats?.spent_usd_today);
  const resetAt = parseResetTime(stats?.refill_at);

  if (cap > 0) {
    const used = Math.min(Math.max(0, spent), cap);
    quotas["Daily Allowance"] = {
      used,
      total: cap,
      remainingPercentage: ((cap - used) / cap) * 100,
      resetAt,
      currency: "USD",
    };
  }

  const credit = toFiniteNumber(stats?.credit_usd);
  if (credit > 0) {
    quotas["Credits"] = {
      used: 0,
      total: credit,
      remainingPercentage: 100,
      resetAt: null,
      isCreditBalance: true,
      currency: "USD",
    };
  }

  const prompt = toFiniteNumber(stats?.prompt_tokens_today);
  const completion = toFiniteNumber(stats?.completion_tokens_today);
  const notes = [`today: ${prompt.toLocaleString("en-US")} prompt / ${completion.toLocaleString("en-US")} completion tokens`];
  if (stats?.lane === "fallback") notes.push("slow lane");
  else if (stats?.lane === "wait") notes.push("queued: daily allowance exhausted");

  return {
    plan: `free-pi ${formatTier(stats?.tier)}`,
    quotas,
    message: notes.join(" · "),
  };
}

export async function getFreepiUsage(accessToken = null, proxyOptions = null) {
  if (!accessToken) {
    return { message: "free-pi access token not available. Sign in again." };
  }

  try {
    const response = await proxyAwareFetch(U("freepi").url || "https://api.freepi.ai/me/stats", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }, proxyOptions);

    if (response.status === 401 || response.status === 403) {
      return { message: "free-pi credential invalid or expired. Sign in again." };
    }
    if (!response.ok) {
      return { message: `free-pi usage API error (${response.status}).` };
    }

    return parseFreepiStats(await response.json());
  } catch (error) {
    return { message: `free-pi error: ${error.message || "Failed to fetch usage"}` };
  }
}
