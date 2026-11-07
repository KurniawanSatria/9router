export const SIDEBAR_ITEMS = [
  { key: "endpoint", href: "/dashboard/endpoint", label: "Endpoint & Key", icon: "api", group: "main" },
  { key: "usage", href: "/dashboard/usage", label: "Usage", icon: "speed", group: "main" },
  { key: "quota", href: "/dashboard/quota", label: "Quota Tracker", icon: "data_usage", group: "main" },
  { key: "providers", href: "/dashboard/providers", label: "Providers", icon: "dns", group: "main" },
  { key: "combos", href: "/dashboard/combos", label: "Combo", icon: "layers", group: "main" },
  { key: "proxy-pools", href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "lan", group: "system" },
  { key: "console-log", href: "/dashboard/console-log", label: "Console Log", icon: "terminal", group: "system" },
  { key: "translator", href: "/dashboard/translator", label: "Translator", icon: "translate", group: "system", needsTranslator: true },
];

export const DEFAULT_SIDEBAR_ORDER = SIDEBAR_ITEMS.map((item) => item.key);

export const SIDEBAR_ITEM_LABELS = Object.fromEntries(
  SIDEBAR_ITEMS.map((item) => [item.key, item.label]),
);

/**
 * Apply a saved order on top of the canonical item list: known keys first (in
 * the saved sequence), then anything the save predates. Never drops an item, so
 * adding a new sidebar entry later cannot make it disappear for existing users.
 */
export function resolveSidebarItems(savedOrder) {
  const byKey = new Map(SIDEBAR_ITEMS.map((item) => [item.key, item]));
  const ordered = [];
  if (Array.isArray(savedOrder)) {
    for (const key of savedOrder) {
      const item = byKey.get(key);
      if (item) {
        ordered.push(item);
        byKey.delete(key);
      }
    }
  }
  for (const item of SIDEBAR_ITEMS) {
    if (byKey.has(item.key)) ordered.push(item);
  }
  return ordered;
}
