import { FREEPI_CONFIG } from "../constants/oauth.js";
import { decodeJwtPayload, extractEmailFromAccessToken } from "../providerHelpers.js";

const CLIENT_OS = process.platform === "win32" ? "win32" : process.platform;

function postJson(baseUrl, path, body, headers = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function deviceReport() {
  try {
    const { timeZone, locale } = Intl.DateTimeFormat().resolvedOptions();
    return { ...(timeZone ? { timezone: timeZone } : {}), ...(locale ? { locale } : {}) };
  } catch {
    return {};
  }
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

async function fetchProfile(accessToken) {
  try {
    const res = await fetch(`${FREEPI_CONFIG.baseUrl}${FREEPI_CONFIG.profilePath}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.handle === "string" && data.handle ? data : null;
  } catch {
    return null;
  }
}

async function startConnect(config, clientVersion) {
  try {
    const res = await postJson(config.baseUrl, config.connectStartPath, {
      consent_version: config.consentVersion,
      client: { os: CLIENT_OS, ...(clientVersion ? { cli_version: clientVersion } : {}) },
    }, { "x-freepi-signin-exp": "1" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function startDevice(config, clientVersion) {
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
    _clientVersion: clientVersion,
    _flow: "device",
  };
}

const freepi = {
  config: FREEPI_CONFIG,
  flowType: "device_code",
  requestDeviceCode: async (config) => {
    const clientVersion = await fetchClientVersion(config);
    const connect = await startConnect(config, clientVersion);
    if (connect?.session_id && connect?.connect_url) {
      return {
        device_code: connect.session_id,
        user_code: connect.confirm_code,
        verification_uri: connect.connect_url,
        verification_uri_complete: connect.connect_url,
        expires_in: connect.expires_in || 600,
        interval: connect.interval || 2,
        _clientVersion: clientVersion,
        _pollSecret: connect.poll_secret,
        _flow: "connect",
      };
    }
    return startDevice(config, clientVersion);
  },
  pollToken: async (config, deviceCode, _codeVerifier, extraData) => {
    const connectFlow = Boolean(extraData?._pollSecret);
    const res = await postJson(
      config.baseUrl,
      connectFlow ? config.connectPollPath : config.tokenPath,
      {
        session_id: deviceCode,
        ...(connectFlow ? { poll_secret: extraData._pollSecret } : {}),
        ...deviceReport(),
      },
    );
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
  postExchange: async (tokens) => {
    const profile = await fetchProfile(tokens.access_token);
    return profile ? { handle: profile.handle, userId: profile.user_id } : null;
  },
  mapTokens: (tokens, extra) => {
    const payload = decodeJwtPayload(tokens.access_token);
    const exp = Number(payload?.exp);
    const handle = extra?.handle || null;
    const providerSpecificData = {};
    if (tokens._clientVersion) providerSpecificData.clientVersion = tokens._clientVersion;
    const userId = extra?.userId || payload?.sub;
    if (userId) providerSpecificData.userId = String(userId);
    if (handle) providerSpecificData.username = handle;
    return {
      accessToken: tokens.access_token,
      refreshToken: null,
      expiresIn: Number.isFinite(exp) && exp > 0 ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : null,
      email: handle || extractEmailFromAccessToken(tokens.access_token),
      ...(handle ? { displayName: handle } : {}),
      providerSpecificData,
    };
  },
};

export default freepi;
