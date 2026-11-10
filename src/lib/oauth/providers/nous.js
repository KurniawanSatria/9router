import { NOUS_CONFIG } from "../constants/oauth.js";
import { mintNousAgentKey } from "open-sse/services/nous.js";

const nous = {
  config: NOUS_CONFIG,
  flowType: "device_code",
  requestDeviceCode: async (config) => {
    const response = await fetch(config.deviceCodeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        scope: config.scope,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Nous device code request failed: ${error}`);
    }

    const data = await response.json();
    return {
      device_code: data.device_code,
      user_code: data.user_code,
      verification_uri: data.verification_uri,
      verification_uri_complete: data.verification_uri_complete,
      expires_in: data.expires_in,
      interval: data.interval,
    };
  },
  pollToken: async (config, deviceCode) => {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: config.clientId,
        device_code: deviceCode,
      }),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      const text = await response.text().catch(() => "");
      data = { error: "invalid_response", error_description: text };
    }

    const pending =
      data?.error === "authorization_pending" ||
      data?.error === "slow_down";
    return {
      ok: response.ok || pending,
      data,
    };
  },
  postExchange: async (tokens) => {
    const minted = await mintNousAgentKey(tokens.access_token);
    if (!minted.agentKey) console.warn(`[oauth] Nous agent key mint failed: ${minted.error}`);
    return minted;
  },
  mapTokens: (tokens, extra) => ({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scope: tokens.scope,
    apiKey: extra?.agentKey || tokens.access_token,
    providerSpecificData: {
      inferenceBaseUrl: NOUS_CONFIG.inferenceBaseUrl,
      ...(extra?.agentKeyId ? { agentKeyId: extra.agentKeyId } : {}),
      ...(extra?.agentKeyExpiresAt ? { agentKeyExpiresAt: extra.agentKeyExpiresAt } : {}),
    },
  }),
};

export default nous;
