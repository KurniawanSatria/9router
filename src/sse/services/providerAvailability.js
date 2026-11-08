import { getProviderConnections } from "@/lib/localDb";
import { resolveProviderId, FREE_PROVIDERS } from "@/shared/constants/providers.js";
import { getModelUnlockTimeMs, formatRetryAfter } from "open-sse/services/accountFallback.js";
import { getAntigravityQuotaCache, getAntigravityModelQuota } from "./antigravityQuota.js";
import { getConnectionCooldownUntil, isConnectionEligible } from "./auth.js";
import { notifyDiscordError } from "./discordWebhook.js";
import { getModelInfo } from "./model.js";

/**
 * Provider-health ordering for combos and the System One "Auto" lane.
 *
 * A provider is moved to the bottom of the list ONLY when every one of its
 * active accounts is currently ineligible for every model it contributes to
 * this request. One healthy account is enough to keep the provider in place.
 *
 * Nothing is persisted: each request re-reads account health, so an account
 * that recovers (lock expires, cooldown ends, quota resets, account re-enabled)
 * automatically puts its provider back in the configured position.
 *
 * Eligibility comes from `isConnectionEligible`, the same predicate used by
 * `getProviderCredentials`, so ordering and real routing can never disagree.
 */

function connectionProviderId(connection) {
  if (!connection?.provider) return null;
  return resolveProviderId(connection.provider);
}

async function resolveMember(member) {
  if (typeof member !== "string" || member.length === 0) {
    return { member, providerId: null, model: null };
  }
  try {
    const info = await getModelInfo(member);
    if (!info?.provider || !info?.model) {
      // Nested combos / aliases that do not resolve to a provider stay in the
      // untouched group: unknown health must never look like an outage.
      return { member, providerId: null, model: null };
    }
    return { member, providerId: resolveProviderId(info.provider), model: info.model };
  } catch {
    return { member, providerId: null, model: null };
  }
}

/**
 * Availability of one provider for the given models.
 *
 * @param {string} providerId
 * @param {string[]} models - Models this provider contributes to the request
 * @param {object[]} activeConnections - Preloaded active connections (all providers)
 * @returns {{
 *   providerId: string,
 *   available: boolean,
 *   reason: "ok"|"no-auth"|"no-active-connections"|"all-accounts-unavailable",
 *   activeConnections: number,
 *   eligibleConnections: number,
 *   retryAfter: string|null,
 * }}
 */
export function getProviderAvailability(providerId, models = [], activeConnections = []) {
  const resolvedProviderId = resolveProviderId(providerId);
  const modelList = Array.isArray(models) && models.length > 0 ? models : [null];

  if (FREE_PROVIDERS[resolvedProviderId]?.noAuth) {
    return {
      providerId: resolvedProviderId,
      available: true,
      reason: "no-auth",
      activeConnections: 0,
      eligibleConnections: 0,
      retryAfter: null,
    };
  }

  const connections = (activeConnections || []).filter(
    (connection) => connectionProviderId(connection) === resolvedProviderId
  );

  if (connections.length === 0) {
    return {
      providerId: resolvedProviderId,
      available: false,
      reason: "no-active-connections",
      activeConnections: 0,
      eligibleConnections: 0,
      retryAfter: null,
    };
  }

  const quotaCache = resolvedProviderId === "antigravity" && modelList.some(Boolean)
    ? getAntigravityQuotaCache()
    : null;
  const now = Date.now();
  const expiries = [];
  let eligibleConnections = 0;

  for (const connection of connections) {
    let eligible = false;

    for (const model of modelList) {
      if (isConnectionEligible(connection, resolvedProviderId, model, {
        requestedModel: model,
        antigravityQuotaCache: quotaCache,
        now,
      })) {
        eligible = true;
        break;
      }

      // Not eligible: remember when this account/model pair could come back.
      const persisted = getModelUnlockTimeMs(connection, model);
      const local = getConnectionCooldownUntil(connection.id, model, now);
      const until = Math.max(persisted || 0, local || 0);
      if (until > 0) expiries.push(until);

      if (quotaCache && model) {
        const connQuotas = quotaCache.get(connection.id);
        const quota = getAntigravityModelQuota(connQuotas, model) || connQuotas?.[model];
        const resetAt = quota?.resetAt ? new Date(quota.resetAt).getTime() : null;
        if (quota && quota.remainingPercentage <= 0 && resetAt && resetAt > now) {
          expiries.push(resetAt);
        }
      }
    }

    if (eligible) eligibleConnections++;
  }

  const available = eligibleConnections > 0;
  const retryAfter = !available && expiries.length
    ? new Date(Math.min(...expiries)).toISOString()
    : null;

  if (!available) {
    void notifyDiscordError({
      title: `Provider ${resolvedProviderId} unavailable`,
      description: `All ${connections.length} account(s) unavailable. Reset after ${retryAfter || "unknown"}.`,
      color: 0xed4245,
    });
  }

  return {
    providerId: resolvedProviderId,
    available,
    reason: available ? "ok" : "all-accounts-unavailable",
    activeConnections: connections.length,
    eligibleConnections,
    retryAfter,
  };
}

/**
 * Rank combo/system-one members by provider health.
 *
 * Stable partition:
 *   1. members whose provider has at least one eligible account (and members
 *      whose provider cannot be resolved — unknown health fails open), in their
 *      original order;
 *   2. members whose provider has no eligible account, in their original order.
 *
 * Every member is kept, so fallback/manual recovery still works even when all
 * providers are down.
 *
 * @param {string[]} models - Combo members ("provider/model", alias or nested combo)
 * @param {object} [options]
 * @param {object[]} [options.activeConnections] - Preloaded active connections
 * @param {object} [options.log]
 * @param {string} [options.label] - Log label (combo name / "Auto")
 * @returns {Promise<{
 *   ordered: string[],
 *   available: string[],
 *   unavailable: string[],
 *   neutral: string[],
 *   providers: Record<string, ReturnType<typeof getProviderAvailability>>,
 * }>}
 */
export async function rankModelsByProviderAvailability(models, options = {}) {
  const list = Array.isArray(models) ? models : [];
  const neutralResult = {
    ordered: [...list],
    available: [...list],
    unavailable: [],
    neutral: [...list],
    providers: {},
  };
  if (list.length <= 1) return neutralResult;

  const resolved = await Promise.all(list.map(resolveMember));

  const modelsByProvider = new Map();
  for (const entry of resolved) {
    if (!entry.providerId) continue;
    let providerModels = modelsByProvider.get(entry.providerId);
    if (!providerModels) {
      providerModels = new Set();
      modelsByProvider.set(entry.providerId, providerModels);
    }
    providerModels.add(entry.model);
  }

  let activeConnections = options.activeConnections;
  if (!activeConnections) {
    try {
      activeConnections = (await getProviderConnections({ isActive: true })) || [];
    } catch (err) {
      options.log?.warn?.("COMBO", `provider-availability lookup failed, keeping order (${err?.message || String(err)})`);
      return neutralResult;
    }
  }

  const providers = {};
  for (const [providerId, providerModels] of modelsByProvider) {
    providers[providerId] = getProviderAvailability(providerId, [...providerModels], activeConnections);
  }

  const available = [];
  const unavailable = [];
  const neutral = [];

  for (const entry of resolved) {
    const info = entry.providerId ? providers[entry.providerId] : null;
    if (!info) {
      // Unknown provider (nested combo, alias or unparsable member): fail open
      // and keep it in the non-demoted group.
      neutral.push(entry.member);
      available.push(entry.member);
    } else if (info.available) {
      available.push(entry.member);
    } else {
      unavailable.push(entry.member);
    }
  }

  const ordered = [...available, ...unavailable];

  if (unavailable.length > 0) {
    const label = options.label ? `[${options.label}] ` : "";
    const demotedProviders = new Set(
      resolved
        .filter((entry) => entry.providerId && providers[entry.providerId] && !providers[entry.providerId].available)
        .map((entry) => entry.providerId)
    );
    for (const providerId of demotedProviders) {
      const info = providers[providerId];
      const retry = info.retryAfter ? `, ${formatRetryAfter(info.retryAfter)}` : "";
      options.log?.info?.(
        "COMBO",
        `${label}provider ${providerId} demoted: all ${info.activeConnections} active account(s) unavailable${retry}`
      );
    }
    options.log?.info?.("COMBO", `${label}availability order: ${ordered.join(", ")}`);
  }

  return { ordered, available, unavailable, neutral, providers };
}

/**
 * Convenience wrapper: stable-partition members by provider health.
 * Always returns a fresh array with the same members.
 */
export async function reorderModelsByProviderAvailability(models, options = {}) {
  const { ordered } = await rankModelsByProviderAvailability(models, options);
  return ordered;
}
