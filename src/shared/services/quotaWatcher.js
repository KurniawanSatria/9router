import { getSettings, getProviderConnections, updateProviderConnection } from "@/lib/localDb";
import { getUsageForProvider } from "open-sse/services/usage.js";
import { resolveConnectionProxyConfig } from "@/lib/network/connectionProxy";
import { notifyDiscordError, formatDiscordTimestamp } from "@/sse/services/discordWebhook.js";
import { QUOTA_WATCH_CONFIG } from "@/shared/constants/config";

const g = (global.__quotaWatch ??= { timer: null, startupTimer: null, running: false });

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isRowExhausted(quota) {
  if (!quota || quota.unlimited === true) return false;
  const remaining = toNumber(quota.remaining);
  if (remaining !== null) return remaining <= 0;
  const used = toNumber(quota.used);
  const total = toNumber(quota.total);
  return total !== null && total > 0 && used !== null && used >= total;
}

function getExhaustion(rows) {
  const exhausted = rows.filter(isRowExhausted);
  if (exhausted.length === 0) return null;
  const resetMs = exhausted
    .map((q) => new Date(q.resetAt).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b)[0];
  return { resetAt: Number.isFinite(resetMs) ? new Date(resetMs).toISOString() : null };
}

function quotaRows(usage) {
  return Object.values(usage?.quotas || {}).filter((q) => q && typeof q === "object");
}

function accountLabel(connection) {
  return connection.name || connection.email || connection.id;
}

function buildProxyOptions(cfg) {
  return {
    connectionProxyEnabled: cfg.connectionProxyEnabled === true,
    connectionProxyUrl: cfg.connectionProxyUrl || "",
    connectionNoProxy: cfg.connectionNoProxy || "",
    vercelRelayUrl: cfg.vercelRelayUrl || "",
    strictProxy: false,
  };
}

async function checkConnection(connection, autoDisabled, deps) {
  const proxyCfg = await deps.resolveConnectionProxyConfig(connection.providerSpecificData);
  const usage = await deps.getUsageForProvider(connection, buildProxyOptions(proxyCfg), {});
  const rows = quotaRows(usage);
  if (rows.length === 0) return;

  const exhaustion = getExhaustion(rows);
  const label = accountLabel(connection);

  if (autoDisabled) {
    if (exhaustion) return;
    await deps.updateProviderConnection(connection.id, {
      isActive: true,
      quotaAutoDisabledAt: null,
      quotaAutoResetAt: null,
      testStatus: "active",
    });
    await deps.notifyDiscordError({
      title: "✅ QUOTA AVAILABLE",
      description: "Your account has been re-enabled.",
      fields: [
        { name: "Provider", value: `\`${connection.provider}\`` },
        { name: "Account", value: `\`${label}\`` },
        { name: "Status", value: "🟢 Enabled" },
      ],
      footer: "_The account is available for requests again._",
    });
    return;
  }

  if (!exhaustion) return;
  await deps.updateProviderConnection(connection.id, {
    isActive: false,
    quotaAutoDisabledAt: new Date().toISOString(),
    quotaAutoResetAt: exhaustion.resetAt,
  });
  await deps.notifyDiscordError({
    title: "⚠️ QUOTA EXHAUSTED",
    description: "Your account has been temporarily disabled due to quota exhaustion.",
    fields: [
      { name: "Provider", value: `\`${connection.provider}\`` },
      { name: "Account", value: `\`${label}\`` },
      { name: "Status", value: "🔴 Disabled" },
      { name: "Quota Reset", value: formatDiscordTimestamp(exhaustion.resetAt, "F") },
      { name: "Time Remaining", value: formatDiscordTimestamp(exhaustion.resetAt, "R") },
    ],
    footer: "_The account will be available again after the quota resets._",
  });
}

function createDefaultDeps() {
  return {
    getSettings,
    getProviderConnections,
    updateProviderConnection,
    getUsageForProvider,
    resolveConnectionProxyConfig,
    notifyDiscordError,
  };
}

export async function runQuotaWatchTick(deps = createDefaultDeps(), state = g) {
  if (state.running) return;
  state.running = true;
  try {
    const settings = await deps.getSettings();
    if (settings.quotaAutoDisableEnabled === false) return;

    const connections = await deps.getProviderConnections();
    for (const connection of connections) {
      const autoDisabled = Boolean(connection.quotaAutoDisabledAt);
      if (!autoDisabled && connection.isActive === false) continue;
      if (autoDisabled && connection.quotaAutoResetAt) {
        const resetMs = new Date(connection.quotaAutoResetAt).getTime();
        if (Number.isFinite(resetMs) && Date.now() < resetMs) continue;
      }
      try {
        await checkConnection(connection, autoDisabled, deps);
      } catch (e) {
        console.warn(`[QuotaWatch] ${connection.provider}:${connection.id}: ${e.message}`);
      }
    }
  } catch (e) {
    console.warn("[QuotaWatch] tick error:", e.message);
  } finally {
    state.running = false;
  }
}

export function startQuotaWatch() {
  if (g.timer) return;
  const run = () => { runQuotaWatchTick().catch(() => {}); };
  g.startupTimer = setTimeout(run, QUOTA_WATCH_CONFIG.startupDelayMs);
  g.timer = setInterval(run, QUOTA_WATCH_CONFIG.tickIntervalMs);
  if (g.startupTimer.unref) g.startupTimer.unref();
  if (g.timer.unref) g.timer.unref();
  console.log("[QuotaWatch] scheduler started");
}

export function stopQuotaWatch() {
  if (g.startupTimer) { clearTimeout(g.startupTimer); g.startupTimer = null; }
  if (g.timer) { clearInterval(g.timer); g.timer = null; }
  console.log("[QuotaWatch] scheduler stopped");
}
