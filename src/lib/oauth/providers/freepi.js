import { FREEPI_CONFIG } from "../constants/oauth.js";
import { decodeJwtPayload, extractEmailFromAccessToken } from "../providerHelpers.js";

function postJson(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
}

async function fetchClientVersion(config) {
  try {
    const res = await fetch(`${config.baseUrl}${config.clientVersionPath}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.latest === "string" ? data.latest : null;
  } catch {
    return null;
  }
}

const freepi = {
  config: FREEPI_CONFIG,
  flowType: "device_code",
  requestDeviceCode: async (config) => {
    const deviceRes = await postJson(config.baseUrl, config.deviceCodePath, {});
    if (!deviceRes.ok) {
      throw new Error(`free-pi device code failed: ${await deviceRes.text()}`);
    }
    const device = await deviceRes.json();

    const consentRes = await postJson(config.baseUrl, config.consentPath, {
      session_id: device.session_id,
      consent_version: config.consentVersion,
    });
    if (!consentRes.ok) {
      throw new Error(`free-pi consent failed: ${await consentRes.text()}`);
    }

    return {
      device_code: device.session_id,
      user_code: device.user_code,
      verification_uri: device.verification_uri,
      verification_uri_complete: device.verification_uri_complete,
      expires_in: device.expires_in || 900,
      interval: device.interval || 5,
      _clientVersion: await fetchClientVersion(config),
    };
  },
  pollToken: async (config, deviceCode, _codeVerifier, extraData) => {
    const res = await postJson(config.baseUrl, config.tokenPath, { session_id: deviceCode });
    const data = await res.json().catch(() => ({}));

    if (data.token) {
      return { ok: true, data: { access_token: data.token, _clientVersion: extraData?._clientVersion } };
    }
    if (res.status === 403 || data.code === "consent_required") {
      return {
        ok: true,
        data: {
          error: "consent_required",
          error_description: data.message || "free-pi did not record consent; restart the login",
          fatal: true,
        },
      };
    }
    if (data.code === "slow_down" || data.retry_after) {
      return {
        ok: true,
        data: { error: "slow_down", error_description: data.message, retry_after: data.retry_after },
      };
    }
    return {
      ok: true,
      data: {
        error: data.code || "authorization_pending",
        error_description: data.message,
      },
    };
  },
  mapTokens: (tokens) => {
    const payload = decodeJwtPayload(tokens.access_token);
    const exp = Number(payload?.exp);
    const providerSpecificData = {};
    if (tokens._clientVersion) providerSpecificData.clientVersion = tokens._clientVersion;
    if (payload?.sub) providerSpecificData.userId = String(payload.sub);
    return {
      accessToken: tokens.access_token,
      refreshToken: null,
      expiresIn: Number.isFinite(exp) && exp > 0 ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : null,
      email: extractEmailFromAccessToken(tokens.access_token),
      providerSpecificData,
    };
  },
};

export default freepi;
