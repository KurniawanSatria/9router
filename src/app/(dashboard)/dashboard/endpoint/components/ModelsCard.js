"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Input, Toggle } from "@/shared/components";
import Icon from "@/shared/components/Icon";
import useSettingsStore from "@/store/settingsStore";

export default function ModelsCard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const comboOnlyMode = useSettingsStore((s) => s.settings?.comboOnlyMode === true);

  useEffect(() => {
    async function load() {
      try {
        const modelsRes = await fetch("/api/v1/models", { cache: "no-store" });
        const modelsData = modelsRes.ok ? await modelsRes.json() : {};
        setEntries(Array.isArray(modelsData.data) ? modelsData.data : []);
      } catch (error) {
        console.log("Error fetching models:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
    useSettingsStore.getState().fetchSettings();
  }, []);

  async function handleComboOnlyMode(value) {
    const updated = await useSettingsStore.getState().patchSettings({ comboOnlyMode: value });
    if (!updated) console.log("Error updating combo-only mode");
  }

  const groups = useMemo(() => {
    const map = new Map();
    const add = (alias, id) => {
      if (!map.has(alias)) map.set(alias, new Set());
      map.get(alias).add(id);
    };
    for (const entry of entries) {
      if (entry?.owned_by === "combo" || typeof entry?.id !== "string") continue;
      const slash = entry.id.indexOf("/");
      if (slash < 1) continue;
      add(entry.id.slice(0, slash), entry.id.slice(slash + 1));
    }
    return [...map.entries()]
      .map(([alias, ids]) => ({ alias, models: [...ids].sort() }))
      .sort((a, b) => a.alias.localeCompare(b.alias));
  }, [entries]);

  const total = groups.reduce((sum, group) => sum + group.models.length, 0);

  const needle = query.trim().toLowerCase();
  const filtered = groups
    .map((group) => ({
      ...group,
      models: group.models.filter(
        (id) => !needle || group.alias.toLowerCase().includes(needle) || id.toLowerCase().includes(needle)
      ),
    }))
    .filter((group) => group.models.length > 0);

  function toggleExpanded(alias) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(alias)) next.delete(alias);
      else next.add(alias);
      return next;
    });
  }

  return (
    <Card className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icon name="checklist" className="text-primary-500" />
            Model List
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Models served by <code className="text-text-primary">GET /v1/models</code>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Toggle
            size="sm"
            checked={comboOnlyMode}
            onChange={handleComboOnlyMode}
            label="Combo only mode"
            description="Hide every model except combos"
          />
          <span className="rounded-full border border-card-border px-2.5 py-1 text-xs text-text-secondary">
            {total} models
          </span>
        </div>
      </div>

      {comboOnlyMode && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary-500/30 bg-primary-500/5 px-3 py-2 text-xs text-text-secondary">
          <Icon name="info" className="size-3.5 shrink-0 text-primary-500" />
          Combo only mode is on — GET /v1/models lists combos only and direct model requests are rejected.
        </div>
      )}

      <div className="mt-4">
        <Input
          icon="search"
          placeholder="Search models or providers..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-text-secondary">Loading models...</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">No models match your search.</p>
      ) : (
        <div className="mt-4 grid auto-rows-max gap-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
          {filtered.map((group) => {
            const isOpen = Boolean(needle) || expanded.has(group.alias);
            return (
              <div
                key={group.alias}
                className="overflow-hidden rounded-lg border border-card-border bg-background-gray-primary/30"
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(group.alias)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <Icon
                    name={isOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                    className="size-4 shrink-0 text-text-tertiary"
                  />
                  <span className="truncate text-sm font-medium text-text-primary">{group.alias}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-primary-500/10 px-2 py-0.5 text-[11px] text-primary-500">
                    {group.models.length}
                  </span>
                </button>

                {isOpen && (
                  <div className="grid grid-cols-1 gap-x-4 border-t border-card-border px-3 py-2 sm:grid-cols-2 xl:grid-cols-3">
                    {group.models.map((id) => (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-2 border-b border-card-border/40 py-1.5 last:border-0"
                      >
                        <span className="truncate font-mono text-xs text-text-primary" title={id}>
                          {id}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
