import { getProviderConnections } from "@/lib/localDb";
import REGISTRY from "open-sse/providers/registry/index.js";

/**
 * Virtual, always-dynamic System One combo.
 *
 * "Auto" is not a row in the combos table. On every request it is expanded to
 * every System One model (`kind: "systemone"`) of every provider that is
 * currently available — a provider with at least one active connection, or a
 * no-auth free lane — so adding or removing an account is reflected immediately
 * without editing a combo.
 *
 * The member list is model strings (`provider/model`) because that is what the
 * System One lanes address; account rotation inside a provider is handled by
 * `getProviderCredentials` (locks, cooldowns and fallback included).
 */

export const AUTO_SYSTEMONE_MODEL = "Auto";

const AUTO_ALIASES = new Set(["auto", "auto-systemone", "auto systemone"]);

/** Rotation cursor for the virtual combo (per-process, advanced per request). */
let rotationIndex = 0;

const registryById = new Map();
for (const entry of REGISTRY) {
  if (!entry?.id) continue;
  registryById.set(entry.id, entry);
  if (entry.alias) registryById.set(entry.alias, entry);
  for (const alias of entry.aliases || []) registryById.set(alias, entry);
}

/** True when `model` selects the virtual Auto System One combo. */
export function isAutoSystemoneModel(model) {
  if (typeof model !== "string") return false;
  return AUTO_ALIASES.has(model.trim().toLowerCase());
}

function isSystemoneProvider(entry) {
  if (!entry) return false;
  if (entry.systemoneConfig) return true;
  if (Array.isArray(entry.serviceKinds) && entry.serviceKinds.includes("systemone")) return true;
  return (entry.models || []).some((m) => m?.kind === "systemone");
}

function systemoneModelIds(entry) {
  return (entry?.models || [])
    .filter((m) => m?.kind === "systemone" && m.id)
    .map((m) => m.id);
}

/**
 * Build the current Auto member list.
 *
 * A provider contributes lanes when it has at least one active connection OR is
 * a no-auth free lane (e.g. opencode's `oc/jev-1.13-free`), which needs no
 * account and is always available. This matches how the dashboard marks lanes
 * as connected.
 *
 * Lanes are then health-ordered by `rankModelsByProviderAvailability`: a
 * provider whose every active account is locked / cooling down is moved to the
 * end while keeping its lanes in the list. Recovery is automatic because the
 * order is recomputed on every request.
 *
 * @returns {Promise<string[]>} e.g. ["oc/jev-1.13-free", "beatapi/jev-1.14"]
 */
export async function resolveAutoSystemoneMembers() {
  let connections = [];
  try {
    connections = (await getProviderConnections({ isActive: true })) || [];
  } catch {
    return [];
  }

  // Registry aliases resolve back to the canonical id so a connection saved
  // under an alias is still recognised.
  const connectedProviderIds = new Set();
  for (const connection of connections) {
    const providerId = connection?.provider;
    if (!providerId) continue;
    const entry = registryById.get(providerId);
    if (entry?.id) connectedProviderIds.add(entry.id);
  }

  const members = [];
  for (const entry of REGISTRY) {
    if (!entry?.id) continue;
    if (!connectedProviderIds.has(entry.id) && entry.noAuth !== true) continue;
    if (!isSystemoneProvider(entry)) continue;
    for (const modelId of systemoneModelIds(entry)) {
      members.push(`${entry.id}/${modelId}`);
    }
  }
  return members;
}

/**
 * Rotate the member list so this request starts at the next lane in sequence,
 * then advance the cursor immediately.
 *
 * Advancing before the request runs means concurrent requests that arrive
 * together each get a different start lane instead of all hammering the same
 * one. The returned array is a fresh copy; the stored list is untouched.
 */
export function rotateAutoSystemoneMembers(members) {
  if (!Array.isArray(members) || members.length <= 1) return [...(members || [])];
  const start = ((rotationIndex % members.length) + members.length) % members.length;
  rotationIndex = (start + 1) % members.length;
  return [...members.slice(start), ...members.slice(0, start)];
}

/** Reset the virtual combo cursor (used by tests / settings changes). */
export function resetAutoSystemoneRotation() {
  rotationIndex = 0;
}