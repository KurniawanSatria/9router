import { FETCH_CONNECT_TIMEOUT_MS } from "../config/runtimeConfig.js";

export const NOUS_INFERENCE_BASE_URL = "https://inference-api.nousresearch.com/v1";
export const NOUS_CHAT_COMPLETIONS_URL = `${NOUS_INFERENCE_BASE_URL}/chat/completions`;
export const NOUS_MODELS_URL = `${NOUS_INFERENCE_BASE_URL}/models`;
export const NOUS_PORTAL_BASE_URL = "https://portal.nousresearch.com";
export const NOUS_DEVICE_CODE_URL = `${NOUS_PORTAL_BASE_URL}/api/oauth/device/code`;
export const NOUS_TOKEN_URL = `${NOUS_PORTAL_BASE_URL}/api/oauth/token`;
export const NOUS_AGENT_KEY_URL = `${NOUS_PORTAL_BASE_URL}/api/oauth/agent-key`;
export const NOUS_OAUTH_CLIENT_ID = "hermes-cli";
export const NOUS_OAUTH_SCOPE = "inference:invoke inference:mint_agent_key";
export const NOUS_AGENT_KEY_TTL_SECONDS = 7200;

// Use a current free-tier text model for the one-token credential probe so
// validating a Portal key or OAuth token never consumes paid credits. Only
// successful inference proves the Bearer credential was accepted; Nous can
// return 4xx responses before authentication (e.g. 402 when Authorization is absent).
export const NOUS_VALIDATION_MODEL = "poolside/laguna-xs-2.1:free";

export async function mintNousAgentKey(accessToken) {
  try {
    const response = await fetch(NOUS_AGENT_KEY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ min_ttl_seconds: NOUS_AGENT_KEY_TTL_SECONDS }),
      signal: AbortSignal.timeout(FETCH_CONNECT_TIMEOUT_MS),
    });
    if (!response.ok) {
      const error = await response.text().catch(() => "");
      return { agentKey: null, error: `(${response.status}) ${error}` };
    }
    const data = await response.json();
    return {
      agentKey: data.api_key || null,
      agentKeyId: data.key_id || null,
      agentKeyExpiresAt: data.expires_at || null,
      agentKeyExpiresIn: data.expires_in || null,
    };
  } catch (err) {
    return { agentKey: null, error: err?.message || String(err) };
  }
}

const asPositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const isTextCapable = (model) => {
  const outputModalities = model?.architecture?.output_modalities;
  return !Array.isArray(outputModalities)
    || outputModalities.length === 0
    || outputModalities.includes("text");
};

const getRawModels = (payload) => {
  const models = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.models || payload?.results || [];
  return Array.isArray(models) ? models : [];
};

const isZeroPrice = (value) =>
  value !== null && value !== undefined && Number(value) === 0;

/**
 * Normalize the OpenAI-style Nous catalogue for 9router model selectors.
 * The live endpoint also returns embedding and image-only entries, which are
 * not valid chat models and must not be offered by the LLM route.
 */
export function normalizeNousModels(payload) {
  return getRawModels(payload)
    .filter(isTextCapable)
    .map((model) => {
      const id = typeof model?.id === "string" ? model.id.trim() : "";
      if (!id) return null;

      const contextLength = asPositiveInteger(
        model.context_length ?? model.top_provider?.context_length,
      );
      const maxOutputTokens = asPositiveInteger(
        model.top_provider?.max_completion_tokens,
      );

      return {
        id,
        name: model.name || id,
        ...(contextLength ? { contextLength } : {}),
        ...(maxOutputTokens ? { maxOutputTokens } : {}),
        ...(model.description ? { description: model.description } : {}),
      };
    })
    .filter(Boolean)
    // Keep first-party Nous models prominent while preserving upstream order
    // within both first-party and third-party groups (Array#sort is stable).
    .sort((a, b) => Number(!a.id.startsWith("nousresearch/")) - Number(!b.id.startsWith("nousresearch/")));
}

/**
 * Return the live zero-cost text catalogue used by the provider detail page,
 * sorted by contextLength descending so the largest windows appear first.
 */
export function normalizeNousFreeModels(payload) {
  const freeModels = getRawModels(payload).filter((model) => {
    const contextLength = asPositiveInteger(
      model?.context_length ?? model?.top_provider?.context_length,
    );
    return isTextCapable(model)
      && isZeroPrice(model?.pricing?.prompt)
      && isZeroPrice(model?.pricing?.completion)
      && contextLength >= 200000;
  });

  return normalizeNousModels(freeModels).sort(
    (a, b) => (b.contextLength || 0) - (a.contextLength || 0),
  );
}

/**
 * Build the credential probe shared by initial validation and saved-connection
 * tests. Nous exposes /models publicly, so only an authenticated inference
 * request can prove that a Portal API key or OAuth token is accepted.
 */
export function createNousApiKeyProbe(apiKey) {
  return {
    url: NOUS_CHAT_COMPLETIONS_URL,
    options: {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NOUS_VALIDATION_MODEL,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false,
      }),
    },
  };
}

export function isNousApiKeyAccepted(status) {
  return status >= 200 && status < 300;
}

export function getNousApiKeyValidationError(status) {
  if (status === 401 || status === 403) {
    return "Invalid or inactive API key";
  }

  return `Unable to verify API key (Nous returned ${status})`;
}
