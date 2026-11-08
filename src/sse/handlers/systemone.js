import {
  getProviderCredentials,
  markAccountUnavailable,
  clearAccountError,
  extractApiKey,
  isValidApiKey,
} from "../services/auth.js";
import { getSettings } from "@/lib/localDb";
import { getModelInfo } from "../services/model.js";
import { getKeyAccessContext, enforceKeyAccessResolved } from "../services/keyAccess.js";
import { handleSystemoneCore } from "open-sse/handlers/systemoneCore.js";
import { errorResponse, unavailableResponse } from "open-sse/utils/error.js";
import { formatRetryAfter } from "open-sse/services/accountFallback.js";
import { HTTP_STATUS } from "open-sse/config/runtimeConfig.js";
import * as log from "../utils/logger.js";
import { checkAndRefreshToken } from "../services/tokenRefresh.js";
import { saveRequestUsage } from "@/lib/usageDb.js";
import {
  isAutoSystemoneModel,
  resolveAutoSystemoneMembers,
  rotateAutoSystemoneMembers,
} from "../services/autoSystemone.js";
import { rankModelsByProviderAvailability } from "../services/providerAvailability.js";

/**
 * Handle System One (Jev) decision requests for the Next.js server.
 * Follows the same auth + account-fallback pattern as handleEmbeddings.
 *
 * @param {Request} request
 */
export async function handleSystemone(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    log.warn("SYSTEMONE", "Invalid JSON body");
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }

  const url = new URL(request.url);
  const modelStr = body.model;

  log.request("POST", `${url.pathname} | ${modelStr}`);

  // Log API key (masked)
  const apiKey = extractApiKey(request);
  if (apiKey) {
    log.debug("AUTH", `API Key: ${log.maskKey(apiKey)}`);
  } else {
    log.debug("AUTH", "No API key provided (local mode)");
  }

  // Enforce API key if enabled in settings
  const settings = await getSettings();
  if (settings.requireApiKey) {
    if (!apiKey) {
      log.warn("AUTH", "Missing API key (requireApiKey=true)");
      return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Missing API key");
    }
    const valid = await isValidApiKey(apiKey);
    if (!valid) {
      log.warn("AUTH", "Invalid API key (requireApiKey=true)");
      return errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key");
    }
  }

  if (!modelStr) {
    log.warn("SYSTEMONE", "Missing model");
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing model");
  }
  if (body.state === undefined || body.state === null) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing required field: state");
  }
  if (!body.questions || typeof body.questions !== "object" || Array.isArray(body.questions)) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing required field: questions");
  }

  // Virtual "Auto" combo: expand to every connected System One lane and
  // round-robin across them. Handled before getModelInfo() because "Auto" is
  // not a real provider/model pair.
  if (isAutoSystemoneModel(modelStr)) {
    log.info("ROUTING", `${modelStr} → dynamic System One combo`);
    return await handleAutoSystemone({ request, body, apiKey, endpoint: url.pathname });
  }

  const modelInfo = await getModelInfo(modelStr);
  if (!modelInfo.provider) {
    log.warn("SYSTEMONE", "Invalid model format", { model: modelStr });
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid model format");
  }

  const { provider, model } = modelInfo;

  // Per-key access control: checked before any credential lookup.
  const keyAccessDenied = await enforceKeyAccessResolved(await getKeyAccessContext(request), modelStr, provider, model);
  if (keyAccessDenied) return keyAccessDenied;

  if (modelStr !== `${provider}/${model}`) {
    log.info("ROUTING", `${modelStr} → ${provider}/${model}`);
  } else {
    log.info("ROUTING", `Provider: ${provider}, Model: ${model}`);
  }

  // Credential + fallback loop (mirrors handleEmbeddings)
  const excludeConnectionIds = new Set();
  let lastError = null;
  let lastStatus = null;

  while (true) {
    const credentials = await getProviderCredentials(provider, excludeConnectionIds, model);

    // All accounts unavailable
    if (!credentials || credentials.allRateLimited) {
      if (credentials?.allRateLimited) {
        const errorMsg = lastError || credentials.lastError || "Unavailable";
        const status = lastStatus || Number(credentials.lastErrorCode) || HTTP_STATUS.SERVICE_UNAVAILABLE;
        log.warn("SYSTEMONE", `[${provider}/${model}] ${errorMsg} (${credentials.retryAfterHuman})`);
        return unavailableResponse(status, `[${provider}/${model}] ${errorMsg}`, credentials.retryAfter, credentials.retryAfterHuman);
      }
      if (excludeConnectionIds.size === 0) {
        log.error("AUTH", `No credentials for provider: ${provider}`);
        return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${provider}`);
      }
      log.warn("SYSTEMONE", "No more accounts available", { provider });
      return errorResponse(lastStatus || HTTP_STATUS.SERVICE_UNAVAILABLE, lastError || "All accounts unavailable");
    }

    log.info("AUTH", `\x1b[32mUsing ${provider} account: ${credentials.connectionName}\x1b[0m`);

    const refreshedCredentials = await checkAndRefreshToken(provider, credentials);

    const result = await handleSystemoneCore({
      body,
      modelInfo: { provider, model },
      credentials: refreshedCredentials,
      log,
      onRequestSuccess: async () => {
        await clearAccountError(credentials.connectionId, credentials, model);
      }
    });

    if (result.success) {
      if (result.usage) {
        saveRequestUsage({
          provider,
          model,
          connectionId: credentials.connectionId,
          apiKey,
          endpoint: url.pathname,
          tokens: {
            ...result.usage,
            total_tokens: result.usage.prompt_tokens + result.usage.completion_tokens,
          },
          status: "success",
        }).catch(() => {});
      }
      return result.response;
    }

    const { shouldFallback } = await markAccountUnavailable(credentials.connectionId, result.status, result.error, provider, model);

    if (shouldFallback) {
      log.warn("AUTH", `Account ${credentials.connectionName} unavailable (${result.status}), trying fallback`);
      excludeConnectionIds.add(credentials.connectionId);
      lastError = result.error;
      lastStatus = result.status;
      continue;
    }

    return result.response;
  }
}

/**
 * Dynamic "Auto" lane: every System One model of every provider with an active
 * connection, tried in round-robin order.
 *
 * Per request we start at the next lane in sequence, then fall through the rest
 * on failure. Accounts inside a provider are selected round-robin and the
 * existing auth layer skips model-locked, cooling-down and otherwise
 * unavailable connections, so a lane that failed earlier is not hammered again.
 *
 * @param {object} opts
 * @param {Request} opts.request
 * @param {object} opts.body
 * @param {string|null} opts.apiKey
 * @param {string} opts.endpoint
 */
async function handleAutoSystemone({ request, body, apiKey, endpoint }) {
  const members = await resolveAutoSystemoneMembers();
  if (members.length === 0) {
    log.warn("SYSTEMONE", "Auto: no connected System One lanes");
    return errorResponse(
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      "[Auto] No connected System One lanes available. Connect a System One provider first."
    );
  }

  // Provider health: lanes whose provider has no eligible account move to the
  // end, but stay in the list so an all-down moment still falls through. The
  // healthy group is rotated; rotation never lifts a demoted lane back to the
  // front, and a recovered account automatically rejoins the rotation.
  const ranked = await rankModelsByProviderAvailability(members, { log, label: "Auto" });
  const ordered = [
    ...rotateAutoSystemoneMembers(ranked.available),
    ...ranked.unavailable,
  ];
  log.info("SYSTEMONE", `Auto → ${ordered.length} lane(s), starting at ${ordered[0]}: ${ordered.join(", ")}`);

  // Remember failures per provider so the same account is never retried twice
  // within one request, even when several lanes share the provider.
  const excludeByProvider = new Map();
  let accessDeniedResponse = null;
  let lastStatus = null;
  let lastError = null;
  let lastRetryAfter = null;
  let lastRetryAfterHuman = null;
  let attempted = false;

  for (const candidate of ordered) {
    const modelInfo = await getModelInfo(candidate);
    if (!modelInfo?.provider) {
      log.warn("SYSTEMONE", `Auto: skip unrecognized lane ${candidate}`);
      continue;
    }
    const { provider, model } = modelInfo;

    const keyAccessDenied = await enforceKeyAccessResolved(
      await getKeyAccessContext(request),
      candidate,
      provider,
      model
    );
    if (keyAccessDenied) {
      log.warn("SYSTEMONE", `Auto: key access denied for ${candidate}`);
      accessDeniedResponse = accessDeniedResponse || keyAccessDenied;
      continue;
    }

    let exclude = excludeByProvider.get(provider);
    if (!exclude) {
      exclude = new Set();
      excludeByProvider.set(provider, exclude);
    }

    attempted = true;
    let laneError = null;
    let laneStatus = null;

    while (true) {
      // Round-robin over the provider's accounts for this virtual combo. The
      // auth layer drops locked/cooling accounts and returns allRateLimited
      // when none are eligible, which moves us to the next lane.
      const credentials = await getProviderCredentials(provider, exclude, model, {
        fallbackStrategy: "round-robin",
        stickyRoundRobinLimit: 1,
      });

      if (!credentials || credentials.allRateLimited) {
        if (credentials?.allRateLimited) {
          laneError = laneError || credentials.lastError || "Unavailable";
          laneStatus = laneStatus || Number(credentials.lastErrorCode) || HTTP_STATUS.SERVICE_UNAVAILABLE;
          // Surface the earliest moment any lane could serve again, not just
          // the last lane we happened to inspect.
          const candidateRetry = credentials.retryAfter;
          if (candidateRetry && (!lastRetryAfter || new Date(candidateRetry) < new Date(lastRetryAfter))) {
            lastRetryAfter = candidateRetry;
            lastRetryAfterHuman = credentials.retryAfterHuman || null;
          }
        } else if (exclude.size === 0) {
          laneError = `No credentials for provider: ${provider}`;
          laneStatus = HTTP_STATUS.BAD_REQUEST;
        }
        break;
      }

      log.info("AUTH", `\x1b[32m[Auto] Using ${provider} account: ${credentials.connectionName}\x1b[0m`);
      const refreshedCredentials = await checkAndRefreshToken(provider, credentials);

      const result = await handleSystemoneCore({
        body,
        modelInfo: { provider, model },
        credentials: refreshedCredentials,
        log,
        onRequestSuccess: async () => {
          await clearAccountError(credentials.connectionId, credentials, model);
        }
      });

      if (result.success) {
        if (result.usage) {
          saveRequestUsage({
            provider,
            model,
            connectionId: credentials.connectionId,
            apiKey,
            endpoint,
            tokens: {
              ...result.usage,
              total_tokens: result.usage.prompt_tokens + result.usage.completion_tokens,
            },
            status: "success",
          }).catch(() => {});
        }
        return result.response;
      }

      const { shouldFallback } = await markAccountUnavailable(
        credentials.connectionId,
        result.status,
        result.error,
        provider,
        model
      );

      if (shouldFallback) {
        log.warn("AUTH", `[Auto] ${candidate} account ${credentials.connectionName} unavailable (${result.status}), trying next account`);
        exclude.add(credentials.connectionId);
        laneError = result.error;
        laneStatus = result.status;
        continue;
      }

      // Per-lane failure that is not account-scoped (e.g. the provider is not
      // configured for System One): skip this lane rather than aborting the
      // whole auto rotation.
      log.warn("SYSTEMONE", `[Auto] ${candidate} failed without account fallback (${result.status}), trying next lane`);
      laneError = result.error;
      laneStatus = result.status;
      break;
    }

    lastError = laneError || lastError;
    lastStatus = laneStatus || lastStatus;
  }

  if (!attempted && accessDeniedResponse) return accessDeniedResponse;

  const message = `[Auto] ${lastError || "All System One lanes unavailable"}`;
  log.warn("SYSTEMONE", message);

  if (lastRetryAfter) {
    return unavailableResponse(
      lastStatus || HTTP_STATUS.SERVICE_UNAVAILABLE,
      message,
      lastRetryAfter,
      lastRetryAfterHuman || formatRetryAfter(lastRetryAfter)
    );
  }
  return errorResponse(lastStatus || HTTP_STATUS.SERVICE_UNAVAILABLE, message);
}
