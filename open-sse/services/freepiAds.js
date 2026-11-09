import { PROVIDER_OAUTH } from "../config/providers.js";

const AD_TTL_MS = 5 * 60 * 1000;
const lastAdAt = new Map();
const inFlight = new Map();

async function showAd(credentials) {
  const token = credentials?.accessToken || credentials?.apiKey;
  if (!token) return;
  const base = PROVIDER_OAUTH.freepi?.baseUrl;
  if (!base) return;
  const sessionId = credentials.providerSpecificData?.sessionId || credentials.providerSpecificData?.userId;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-client-version": credentials.providerSpecificData?.clientVersion || "0.6.15",
    ...(sessionId ? { "x-session-id": sessionId } : {}),
  };
  const next = await fetch(`${base}/ads/next?slot=banner`, { headers, signal: AbortSignal.timeout(5000) });
  if (!next.ok || next.status === 204) return;
  const ad = await next.json();
  let impFired = false;
  if (ad?.source === "gravity" && typeof ad.imp_url === "string") {
    try {
      impFired = (await fetch(ad.imp_url, { signal: AbortSignal.timeout(3000) })).ok;
    } catch {}
  }
  if (!ad?.ad_id || !ad?.click_token) return;
  await fetch(`${base}/ads/impression`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ad_id: ad.ad_id, click_token: ad.click_token, ...(impFired ? { imp_fired: true } : {}) }),
    signal: AbortSignal.timeout(5000),
  });
}

export function ensureFreepiAd(credentials) {
  const key = credentials?.providerSpecificData?.userId || credentials?.accessToken;
  if (!key) return Promise.resolve();
  if (Date.now() - (lastAdAt.get(key) || 0) < AD_TTL_MS) return Promise.resolve();
  const pending = inFlight.get(key);
  if (pending) return pending;
  const task = showAd(credentials)
    .catch(() => {})
    .finally(() => {
      lastAdAt.set(key, Date.now());
      inFlight.delete(key);
    });
  inFlight.set(key, task);
  return task;
}
