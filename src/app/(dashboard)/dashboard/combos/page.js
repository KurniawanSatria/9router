"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Input, CardSkeleton, ModelSelectModal, ConfirmModal, CapacityBadges, Select, Toggle, Badge, SmartPolicyModal } from "@/shared/components";
import { Card } from "@/shared/tailgrids/core/card";
import { cnx } from "@/shared/utils/cn";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { useModelCaps } from "@/shared/hooks/useModelCaps";
import { aggregateComboCapabilities } from "open-sse/providers/capabilities.js";
import { resolveProviderId, AI_PROVIDERS } from "@/shared/constants/providers";
import Icon from "@/shared/components/Icon";

// Validate combo name: only a-z, A-Z, 0-9, -, _
const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

const STRATEGY_OPTIONS = [
  { value: "fallback", label: "Fallback — try in order" },
  { value: "round-robin", label: "Round Robin — rotate" },
  { value: "smart", label: "Smart Router — System One" },
  { value: "fusion", label: "Fusion — panel + judge" },
];

function getPolicyBadgeLabel(strategy = {}) {
  const policy = strategy.smartPolicy || (strategy.sessionSticky === false ? "per-turn" : "smart");
  if (policy === "strict") return "Strict Lock";
  if (policy === "per-turn") return "Per-Turn";
  if (policy === "custom") {
    const raw = strategy.confidenceThreshold;
    const pct = Math.round((raw || 0.8) * (raw && raw <= 1 ? 100 : 1));
    return `Custom (≥${pct || 80}%)`;
  }
  return "Smart (≥80%)";
}

export default function CombosPage() {
  const router = useRouter();
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeProviders, setActiveProviders] = useState([]);
  const [comboStrategies, setComboStrategies] = useState({});
  const { getCaps } = useModelCaps();
  const [confirmState, setConfirmState] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { copied, copy } = useCopyToClipboard();

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drop stale selection when the combo list changes (delete / refresh).
  useEffect(() => {
    const alive = new Set(combos.map((c) => c.id));
    queueMicrotask(() => setSelectedIds((prev) => prev.filter((id) => alive.has(id))));
  }, [combos]);

  const selectedCombos = combos.filter((c) => selectedIds.includes(c.id));
  const someSelected = selectedIds.length > 0;

  // Case-insensitive search over the combo name and its model ids, so both
  // "deepseek" and "deepseek-v4.1-flash" find the right rows.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCombos = normalizedQuery
    ? combos.filter((c) => {
        if (String(c.name || "").toLowerCase().includes(normalizedQuery)) return true;
        return (c.models || []).some((m) => String(m).toLowerCase().includes(normalizedQuery));
      })
    : combos;

  // Select-all follows the search: with a query active it must only reach the
  // rows on screen, otherwise the bulk Delete would take out hidden combos.
  const allSelected = filteredCombos.length > 0 && filteredCombos.every((c) => selectedIds.includes(c.id));

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : filteredCombos.map((c) => c.id));
  };

  const clearSelection = () => setSelectedIds([]);

  const fetchData = async () => {
    try {
      const [combosRes, providersRes, settingsRes] = await Promise.all([
        fetch("/api/combos"),
        fetch("/api/providers"),
        fetch("/api/settings"),
      ]);
      const combosData = await combosRes.json();
      const providersData = await providersRes.json();
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};

      // Only LLM combos here - webSearch/webFetch combos belong to media-providers/web
      if (combosRes.ok) setCombos((combosData.combos || []).filter(c => !c.kind || c.kind === "llm"));
      if (providersRes.ok) {
        setActiveProviders((providersData.connections || []).filter((c) => c.isActive !== false));
      }
      setComboStrategies(settingsData.comboStrategies || {});
    } catch (error) {
      console.log("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (name) => {
    try {
      const res = await fetch("/api/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, models: [] }),
      });
      if (res.ok) {
        const combo = await res.json();
        setShowCreateModal(false);
        router.push(`/dashboard/combos/${combo.id}?pick=1`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create combo");
      }
    } catch (error) {
      console.log("Error creating combo:", error);
    }
  };

  const pruneStrategiesForNames = (names, base = comboStrategies) => {
    const updated = { ...base };
    for (const name of names) delete updated[name];
    return updated;
  };

  const persistComboStrategies = async (updated) => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comboStrategies: updated }),
    });
    setComboStrategies(updated);
  };

  const handleDelete = async (id) => {
    const combo = combos.find((c) => c.id === id);
    setConfirmState({
      title: "Delete Combo",
      message: combo ? `Delete combo "${combo.name}"?` : "Delete this combo?",
      onConfirm: async () => {
        setConfirmState((prev) => prev ? { ...prev, loading: true } : null);
        try {
          const res = await fetch(`/api/combos/${id}`, { method: "DELETE" });
          if (res.ok) {
            if (combo?.name) {
              await persistComboStrategies(pruneStrategiesForNames([combo.name]));
            }
            setCombos((prev) => prev.filter((c) => c.id !== id));
            setSelectedIds((prev) => prev.filter((x) => x !== id));
          }
          setConfirmState(null);
        } catch (error) {
          console.log("Error deleting combo:", error);
          setConfirmState((prev) => prev ? { ...prev, loading: false } : null);
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedCombos.length === 0) return;
    const count = selectedCombos.length;
    setConfirmState({
      title: "Delete Selected Combos",
      message: `Delete ${count} selected combo${count === 1 ? "" : "s"}? This cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setConfirmState((prev) => prev ? { ...prev, loading: true } : null);
        setBulkBusy(true);
        try {
          const ids = selectedCombos.map((c) => c.id);
          const names = selectedCombos.map((c) => c.name);
          const results = await Promise.all(
            ids.map((id) => fetch(`/api/combos/${id}`, { method: "DELETE" }))
          );
          const failed = results.filter((r) => !r.ok).length;
          await persistComboStrategies(pruneStrategiesForNames(names));
          setCombos((prev) => prev.filter((c) => !ids.includes(c.id)));
          clearSelection();
          setConfirmState(null);
          if (failed > 0) alert(`Deleted with ${failed} failure${failed === 1 ? "" : "s"}.`);
        } catch (error) {
          console.log("Error bulk deleting combos:", error);
          alert("Failed to delete selected combos");
          setConfirmState((prev) => prev ? { ...prev, loading: false } : null);
        } finally {
          setBulkBusy(false);
        }
      },
    });
  };

  // Merge a per-combo strategy patch into settings.comboStrategies. Passing an empty
  // patch (strategy back to default "fallback") drops the entry entirely.
  const handleSetComboStrategy = async (comboName, patch) => {
    try {
      const updated = { ...comboStrategies };
      const next = { ...(updated[comboName] || {}), ...patch };
      // Prune to keep settings clean: default fallback with no extras = no entry.
      if (!next.fallbackStrategy || next.fallbackStrategy === "fallback") {
        delete updated[comboName];
      } else {
        updated[comboName] = next;
      }

      await persistComboStrategies(updated);
    } catch (error) {
      console.log("Error updating combo strategy:", error);
    }
  };

  const handleBulkSetStrategy = async (strategy) => {
    if (selectedCombos.length === 0 || !strategy) return;
    setBulkBusy(true);
    try {
      const updated = { ...comboStrategies };
      for (const combo of selectedCombos) {
        if (!strategy || strategy === "fallback") {
          delete updated[combo.name];
        } else {
          updated[combo.name] = {
            ...(updated[combo.name] || {}),
            fallbackStrategy: strategy,
          };
        }
      }
      await persistComboStrategies(updated);
    } catch (error) {
      console.log("Error bulk updating combo strategy:", error);
      alert("Failed to update strategy for selected combos");
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-text-secondary">
            Group models under one name, then pick a strategy per combo.
          </p>
          <details className="group/help mt-1.5 text-sm text-text-tertiary">
            <summary className="-ml-1.5 inline-flex cursor-pointer select-none list-none items-center gap-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-background-gray-primary hover:text-text-primary [&::-webkit-details-marker]:hidden">
              <Icon name="info" className="size-4" />
              <span className="font-medium">Strategy guide</span>
              <Icon name="expand_more" className="size-4 transition-transform group-open/help:rotate-180" />
            </summary>
            <ul className="mt-2 grid gap-x-6 gap-y-3 rounded-xl border-[0.5px] border-card-border bg-background-gray-primary p-4 sm:grid-cols-2">
              <li>
                <span className="font-medium text-text-primary">Fallback</span>
                <span className="block text-xs text-text-tertiary">Tries each model in order; moves on when one fails.</span>
              </li>
              <li>
                <span className="font-medium text-text-primary">Round Robin</span>
                <span className="block text-xs text-text-tertiary">Rotates models across requests to spread load.</span>
              </li>
              <li>
                <span className="font-medium text-text-primary">Smart Router</span>
                <span className="block text-xs text-text-tertiary">A System One model picks the best model per request. Supports Smart Switch, Strict Lock, and Per-Turn prompt-cache modes.</span>
              </li>
              <li>
                <span className="font-medium text-text-primary">Fusion</span>
                <span className="block text-xs text-text-tertiary">All models answer in parallel, then a judge merges one answer. Best quality, highest cost.</span>
              </li>
            </ul>
          </details>
          <p className="mt-3 hidden max-w-2xl text-xs text-text-tertiary">
            <span className="font-medium text-text-primary">Cursor / Claude Default</span> create combos named exactly like those clients&apos; model IDs (e.g. <code className="font-mono">composer-2.5</code>, <code className="font-mono">opus</code>), seeded with the matching <code className="font-mono">cu/…</code> or <code className="font-mono">cc/…</code> route so traffic can hit 9router without the prefix.
            {" "}Note: Cursor IDE itself often blocks built-in Composer / Grok from Override OpenAI Base URL (&quot;model does not support custom API&quot;); add them via Cursor&apos;s <span className="font-medium text-text-primary">Add Custom Model</span> using the combo name, or pick a model Cursor allows through the custom endpoint.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4.5 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search combos…"
              aria-label="Search combos"
              className="h-10 w-full rounded-lg border border-input-border bg-card-background py-2 pl-10 pr-9 text-sm text-text-primary outline-none placeholder:text-input-placeholder-text focus:border-primary-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-tertiary transition-colors hover:text-text-primary"
              >
                <Icon name="close" className="size-4" />
              </button>
            )}
          </div>
          <Button icon="add" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto whitespace-nowrap">
            Create Combo
          </Button>
          <div className="hidden">
          </div>
        </div>
      </div>

      {/* Combos List */}
      {combos.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
              <Icon name="layers" className="size-8" />
            </div>
            <p className="mb-1 font-medium text-text-primary">No combos yet</p>
            <p className="mb-4 text-sm text-text-tertiary">Create model combos with fallback support</p>
            <Button icon="add" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
              Create Combo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Selection toolbar */}
          <div className="flex min-w-0 flex-col gap-2 rounded-xl border-[0.5px] border-card-border bg-card-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-text-tertiary hover:text-primary-500">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-input-border text-primary-500 focus:ring-primary-500"
              />
              <span>
                {someSelected
                  ? `${selectedIds.length} selected`
                  : `Select all (${filteredCombos.length})`}
              </span>
            </label>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {normalizedQuery ? (
                <span className="text-xs tabular-nums text-text-tertiary">
                  {filteredCombos.length} of {combos.length} shown
                </span>
              ) : !someSelected ? (
                <span className="text-xs tabular-nums text-text-tertiary">
                  {combos.length} {combos.length === 1 ? "combo" : "combos"}
                </span>
              ) : null}
              {someSelected && (
                <>
                  <div className="w-full min-w-[160px] sm:w-[200px]">
                    <Select
                      options={STRATEGY_OPTIONS}
                      value=""
                      placeholder="Set strategy…"
                      disabled={bulkBusy}
                      onChange={(value) => {
                        if (value) handleBulkSetStrategy(value);
                      }}
                      size="sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    icon="delete"
                    disabled={bulkBusy}
                    loading={bulkBusy}
                    onClick={handleBulkDelete}
                    className="whitespace-nowrap"
                  >
                    Delete ({selectedIds.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearSelection}
                    disabled={bulkBusy}
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>

          <Card className="p-0">
            {(() => {
              const comboByName = Object.fromEntries(combos.map((c) => [c.name, c.models]));
              if (filteredCombos.length === 0) {
                return (
                  <Card>
                    <div className="py-10 text-center">
                      <p className="mb-1 font-medium text-text-primary">No combos match “{searchQuery.trim()}”</p>
                      <p className="mb-4 text-sm text-text-tertiary">Try a shorter query, or clear the search to see all {combos.length} combos.</p>
                      <Button variant="secondary" onClick={() => setSearchQuery("")}>
                        Clear search
                      </Button>
                    </div>
                  </Card>
                );
              }
              return filteredCombos.map((combo) => (
                <ComboCard
                  key={combo.id}
                  combo={combo}
                  getCaps={getCaps}
                  comboByName={comboByName}
                  activeProviders={activeProviders}
                  copied={copied}
                  onCopy={copy}
                  onEdit={() => router.push(`/dashboard/combos/${combo.id}`)}
                  onDelete={() => handleDelete(combo.id)}
                  strategy={comboStrategies[combo.name] || {}}
                  onSetStrategy={(patch) => handleSetComboStrategy(combo.name, patch)}
                  selected={selectedIds.includes(combo.id)}
                  onToggleSelect={() => toggleSelect(combo.id)}
                />
              ));
            })()}
          </Card>
        </div>
      )}

      {showCreateModal && (
        <CreateComboModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
        />
      )}

      {/* Confirm (delete / generate presets) */}
      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => !confirmState?.loading && setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText || "Confirm"}
        variant={confirmState?.variant || "danger"}
        loading={!!confirmState?.loading}
      />
    </div>
  );
}

const fmtK = (n) => {
  if (!n) return "?";
  if (n >= 1000000) {
    const m = n / 1000000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  return `${Math.round(n / 1000)}k`;
};

function getRouterModelStatus(routerModel, activeProviders) {
  const effectiveModel = (typeof routerModel === "string" && routerModel.trim())
    ? routerModel.trim()
    : "oc/jev-1.13-free";
  const slashIdx = effectiveModel.indexOf("/");
  const prefix = slashIdx !== -1 ? effectiveModel.slice(0, slashIdx) : effectiveModel;
  const providerId = resolveProviderId(prefix);
  const providerDef = AI_PROVIDERS[providerId];
  const isNoAuth = !!providerDef?.noAuth;

  if (isNoAuth) {
    return { ready: true, label: "Ready (Free)", providerId };
  }

  const isConnected = (activeProviders || []).some((c) => c.provider === providerId && c.isActive !== false);
  if (isConnected) {
    return { ready: true, label: "Connected", providerId };
  }

  return { ready: false, label: "Not configured", providerId };
}

function ComboCard({ combo, getCaps, comboByName = {}, activeProviders = [], copied, onCopy, onEdit, onDelete, strategy = {}, onSetStrategy, selected = false, onToggleSelect }) {
  const [showJudgeSelect, setShowJudgeSelect] = useState(false);
  const [showRouterSelect, setShowRouterSelect] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const current = strategy.fallbackStrategy || "fallback";
  const judge = strategy.judgeModel || "";
  const routerModel = strategy.routerModel || "";
  const isFusion = current === "fusion";
  const isSmart = current === "smart";
  // The synced catalog is server-only, so resolving here would fall back to the
  // generic patterns and under-report the limits. getCaps carries the server's
  // answer for /api/models.
  const comboCaps = aggregateComboCapabilities(combo.models, comboByName, getCaps);

  return (
    <div className={cnx(
      "min-w-0 border-b border-card-border p-5 transition-colors last:border-0 hover:bg-background-gray-primary",
      selected && "bg-primary-500/[0.04]"
    )}>
      <div className="flex min-w-0 items-start gap-2.5">
        <label className="mt-0.5 flex shrink-0 cursor-pointer items-center" title="Select combo">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-input-border text-primary-500 focus:ring-primary-500"
            aria-label={`Select ${combo.name}`}
          />
        </label>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
          <Icon name="layers" className="size-4.5 text-primary-500" />
        </div>
        <div className="min-w-0 flex-1">
          <code title={combo.name} className="block truncate font-mono text-sm font-semibold text-text-primary">{combo.name}</code>
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              {combo.models.length === 0 ? (
                <span className="text-xs italic text-text-tertiary">No models</span>
              ) : (
                combo.models.slice(0, 2).map((model, index) => (
                  <code key={index} title={model} className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-md border border-card-border bg-background-gray-primary px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">
                    <span className="truncate">{model}</span>
                    <CapacityBadges caps={
                      comboByName[model]
                        ? aggregateComboCapabilities(comboByName[model], comboByName, getCaps)
                        : getCaps?.(model)
                    } />
                  </code>
                ))
              )}
              {combo.models.length > 2 && (
                <span className="inline-flex shrink-0 items-center rounded-md border border-dashed border-card-border px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                  +{combo.models.length - 2} more
                </span>
              )}
              {comboCaps && (
                <span className="inline-flex shrink-0 items-center gap-1.5 pl-1 text-[11px] tabular-nums text-text-tertiary">
                  <span className="h-3 w-px bg-card-border" aria-hidden="true" />
                  <span>ctx {fmtK(comboCaps.contextWindow)}</span>
                  <span className="opacity-40">·</span>
                  <span>max {fmtK(comboCaps.maxOutput)}</span>
                </span>
              )}
            </div>
            {/* Fusion: judge picker (Auto = first model) */}
            {isFusion && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-text-tertiary">Judge</span>
                <button
                  onClick={() => setShowJudgeSelect(true)}
                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-dashed border-primary-500/40 px-2 py-0.5 font-mono text-[11px] text-primary-500 transition-colors hover:border-primary-500 hover:bg-primary-500/5"
                  title="Pick the model that fuses panel answers"
                >
                  <Icon name="gavel" className="size-[13px]" />
                  <span className="truncate">{judge || `Auto — ${combo.models[0] || "first model"}`}</span>
                </button>
                {judge && (
                  <button
                    onClick={() => onSetStrategy({ judgeModel: "" })}
                    className="rounded p-0.5 text-text-tertiary transition-colors hover:bg-error-500/10 hover:text-error-500"
                    title="Reset judge to Auto"
                  >
                    <Icon name="close" className="size-[13px]" />
                  </button>
                )}
              </div>
            )}
            {/* Smart: System One router picker and policy modal trigger */}
            {isSmart && (() => {
              const routerStatus = getRouterModelStatus(routerModel, activeProviders);
              const policyLabel = getPolicyBadgeLabel(strategy);
              return (
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-text-tertiary">Router</span>
                  <button
                    onClick={() => setShowRouterSelect(true)}
                    className="inline-flex max-w-full items-center gap-1 rounded-lg border border-dashed border-primary-500/40 px-2 py-0.5 font-mono text-[11px] text-primary-500 transition-colors hover:border-primary-500 hover:bg-primary-500/5"
                    title="Pick the System One model that decides model routing"
                  >
                    <Icon name="psychology" className="size-[13px]" />
                    <span className="truncate">{routerModel || "Auto — oc/jev-1.13-free"}</span>
                  </button>
                  {routerStatus.ready ? (
                    <Badge variant="success" size="sm" dot>{routerStatus.label}</Badge>
                  ) : (
                    <Badge variant="error" size="sm" dot>{routerStatus.label}</Badge>
                  )}
                  <button
                    onClick={() => setShowPolicyModal(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-card-border bg-background-gray-primary px-2 py-0.5 text-[11px] text-text-primary transition-colors hover:border-primary-500/50 hover:bg-primary-500/5"
                    title="Configure routing policy and prompt cache retention"
                  >
                    <Icon name="tune" className="size-[13px] text-text-tertiary" />
                    <span className="font-medium">{policyLabel}</span>
                  </button>
                  {routerModel && (
                    <button
                      onClick={() => onSetStrategy({ routerModel: "" })}
                      className="rounded p-0.5 text-text-tertiary transition-colors hover:bg-error-500/10 hover:text-error-500"
                      title="Reset router to Auto"
                    >
                      <Icon name="close" className="size-[13px]" />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-card-border bg-background-gray-primary p-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(combo.name, `combo-${combo.id}`); }}
              aria-label={`Copy ${combo.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-card-background hover:text-primary-500"
              title="Copy combo name"
            >
              <Icon name={copied === `combo-${combo.id}` ? "check" : "content_copy"} className="size-4.5" />
            </button>
            <button
              onClick={onEdit}
              aria-label={`Edit ${combo.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-card-background hover:text-primary-500"
              title="Edit"
            >
              <Icon name="edit" className="size-4.5" />
            </button>
            <button
              onClick={onDelete}
              aria-label={`Delete ${combo.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-error-500/10 hover:text-error-500"
              title="Delete"
            >
              <Icon name="delete" className="size-4.5" />
            </button>
          </div>
      </div>

      <div className="mt-3">
        <Select
          options={STRATEGY_OPTIONS}
          value={current}
          onChange={(value) => onSetStrategy({ fallbackStrategy: value })}
          size="sm"
          className="w-full"
          ariaLabel={`Strategy for ${combo.name}`}
        />
      </div>

      {/* Judge model picker (single-select; combo members make natural judges too) */}
      {showJudgeSelect && (
        <ModelSelectModal
          isOpen={showJudgeSelect}
          onClose={() => setShowJudgeSelect(false)}
          onSelect={(m) => { onSetStrategy({ judgeModel: m?.value || "" }); setShowJudgeSelect(false); }}
          activeProviders={activeProviders}
          title="Select Judge Model"
          addedModelValues={judge ? [judge] : []}
          closeOnSelect={true}
        />
      )}

      {/* System One Router model picker (single-select from systemone kind) */}
      {showRouterSelect && (
        <ModelSelectModal
          isOpen={showRouterSelect}
          onClose={() => setShowRouterSelect(false)}
          onSelect={(m) => { onSetStrategy({ routerModel: m?.value || "" }); setShowRouterSelect(false); }}
          activeProviders={activeProviders}
          title="Select System One Router Model"
          kindFilter="systemone"
          addedModelValues={routerModel ? [routerModel] : []}
          closeOnSelect={true}
        />
      )}

      {/* Smart Router Policy Settings Modal */}
      {showPolicyModal && (
        <SmartPolicyModal
          isOpen={showPolicyModal}
          onClose={() => setShowPolicyModal(false)}
          comboName={combo.name}
          currentPolicy={strategy.smartPolicy || (strategy.sessionSticky === false ? "per-turn" : "smart")}
          currentThreshold={strategy.confidenceThreshold ?? 80}
          onSave={onSetStrategy}
        />
      )}
    </div>
  );
}

function CreateComboModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const validateName = (value) => {
    if (!value.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (!VALID_NAME_REGEX.test(value)) {
      setNameError("Only letters, numbers, -, _ and . allowed");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (value) validateName(value);
    else setNameError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateName(name)) return;
    setSaving(true);
    await onSave(name.trim());
    setSaving(false);
  };

  return (
    <Modal isOpen onClose={onClose} title="Create Combo">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <Input
            label="Combo Name"
            value={name}
            onChange={handleChange}
            placeholder="my-combo"
            error={nameError}
            autoFocus
          />
          <p className="mt-0.5 text-[10px] text-text-tertiary">
            Only letters, numbers, -, _ and . allowed. You add models on the next page.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Button type="button" onClick={onClose} variant="ghost" fullWidth size="sm">
            Cancel
          </Button>
          <Button type="submit" fullWidth size="sm" disabled={!name.trim() || !!nameError || saving}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
