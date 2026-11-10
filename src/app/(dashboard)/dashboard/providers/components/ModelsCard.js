"use client";

import { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { Card, Button, Input, Modal } from "@/shared/components";
import { cnx } from "@/shared/utils/cn";
import ModelIcon from "@/shared/components/ModelIcon";
import { getModelsByProviderId, getModelKind } from "@/shared/constants/models";
import { getProviderAlias } from "@/shared/constants/providers";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import Icon from "@/shared/components/Icon";

// ── ModelRow ───────────────────────────────────────────────────
export function ModelRow({ model, fullModel, copied, onCopy, testStatus, isCustom, isFree, onDeleteAlias, onTest, isTesting }) {
  const borderColor = testStatus === "ok" ? "border-success-500/40" : testStatus === "error" ? "border-error-500/40" : "border-card-border";

  return (
    <div className={cnx("group rounded-lg border bg-card-background px-3 py-2 transition-colors hover:bg-background-gray-primary", borderColor)}>
      <div className="flex items-center gap-2">
        <ModelIcon modelId={model.id || fullModel} testStatus={testStatus} size={16} />
        <div className="flex flex-col gap-1">
          <code className="text-xs text-text-secondary font-mono bg-background-soft-100 px-1.5 py-0.5 rounded">{fullModel}</code>
          {model.name && <span className="text-[9px] text-text-tertiary italic pl-1">{model.name}</span>}
        </div>
        {onTest && (
          <div className="relative group/btn">
            <button onClick={onTest} disabled={isTesting} aria-label="Test model" className={`p-0.5 hover:bg-background-gray-primary rounded text-text-tertiary hover:text-primary-500 transition-opacity ${isTesting ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              <Icon name={isTesting ? "progress_activity" : "science"} className="size-3.5" style={isTesting ? { animation: "spin 1s linear infinite" } : undefined} />
            </button>
            <span className="pointer-events-none absolute mt-1 top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-tertiary whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
              {isTesting ? "Testing..." : "Test"}
            </span>
          </div>
        )}
        <div className="relative group/btn">
          <button onClick={() => onCopy(fullModel, `model-${model.id}`)} className="p-0.5 hover:bg-background-gray-primary rounded text-text-tertiary hover:text-primary-500">
            <Icon name={copied === `model-${model.id}` ? "check" : "content_copy"} className="size-3.5" />
          </button>
          <span className="pointer-events-none absolute mt-1 top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-tertiary whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
            {copied === `model-${model.id}` ? "Copied!" : "Copy"}
          </span>
        </div>
        {isFree && <span className="rounded-full bg-success-500/10 px-2 py-0.5 text-[11px] font-medium text-success-500">FREE</span>}
        {isCustom && (
          <button onClick={onDeleteAlias} aria-label="Remove custom model" className="p-0.5 hover:bg-error-500/10 rounded text-text-tertiary hover:text-error-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" title="Remove custom model">
            <Icon name="close" className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

ModelRow.propTypes = {
  model: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
  fullModel: PropTypes.string.isRequired,
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  testStatus: PropTypes.oneOf(["ok", "error"]),
  isCustom: PropTypes.bool,
  isFree: PropTypes.bool,
  onDeleteAlias: PropTypes.func,
  onTest: PropTypes.func,
  isTesting: PropTypes.bool,
};

// ── AddCustomModelModal ────────────────────────────────────────
function AddCustomModelModal({ isOpen, onSave, onClose }) {
  const [modelId, setModelId] = useState("");

  const handleSave = () => {
    if (!modelId.trim()) return;
    onSave(modelId.trim());
    setModelId("");
  };

  return (
    <Modal isOpen={isOpen} title="Add Custom Model" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Input
          label="Model ID"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="e.g. tts-1-hd"
          autoFocus
        />
        <div className="flex gap-2">
          <Button onClick={handleSave} fullWidth disabled={!modelId.trim()}>Add</Button>
          <Button onClick={onClose} variant="ghost" fullWidth>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

AddCustomModelModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ── ModelsCard ─────────────────────────────────────────────────
// Self-contained card: shows models for a provider, filtered by optional `kindFilter`.
// kindFilter: if provided, only shows models with matching type/kinds field.
export default function ModelsCard({ providerId, kindFilter, providerAliasOverride }) {
  const { copied, copy } = useCopyToClipboard();
  const [modelAliases, setModelAliases] = useState({});
  const [customModels, setCustomModels] = useState([]);
  const [modelTestResults, setModelTestResults] = useState({});
  const [testingModelId, setTestingModelId] = useState(null);
  const [testError, setTestError] = useState("");
  const [showAddCustomModel, setShowAddCustomModel] = useState(false);

  const providerAlias = providerAliasOverride || getProviderAlias(providerId);
  const effectiveType = kindFilter || "llm";

  const fetchData = useCallback(async () => {
    try {
      const [aliasRes, customRes] = await Promise.all([
        fetch("/api/models/alias"),
        fetch("/api/models/custom", { cache: "no-store" }),
      ]);
      const aliasData = await aliasRes.json();
      const customData = await customRes.json();
      if (aliasRes.ok) setModelAliases(aliasData.aliases || {});
      if (customRes.ok) setCustomModels(customData.models || []);
    } catch (e) { console.log("ModelsCard fetch error:", e); }
  }, []);

  useEffect(() => { queueMicrotask(fetchData); }, [fetchData]);

  const handleSetAlias = async (modelId, alias) => {
    const fullModel = `${providerAlias}/${modelId}`;
    try {
      const res = await fetch("/api/models/alias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: fullModel, alias }),
      });
      if (res.ok) await fetchData();
    } catch (e) { console.log("set alias error:", e); }
  };

  const handleDeleteAlias = async (alias) => {
    try {
      const res = await fetch(`/api/models/alias?alias=${encodeURIComponent(alias)}`, { method: "DELETE" });
      if (res.ok) await fetchData();
    } catch (e) { console.log("delete alias error:", e); }
  };

  const handleAddCustomModel = async (modelId) => {
    try {
      const res = await fetch("/api/models/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerAlias, id: modelId, type: effectiveType }),
      });
      if (res.ok) {
        await fetchData();
        window.dispatchEvent(new CustomEvent("customModelChanged"));
      }
    } catch (e) { console.log("add custom model error:", e); }
  };

  const handleDeleteCustomModel = async (modelId) => {
    try {
      const params = new URLSearchParams({ providerAlias, id: modelId, type: effectiveType });
      const res = await fetch(`/api/models/custom?${params}`, { method: "DELETE" });
      if (res.ok) {
        await fetchData();
        window.dispatchEvent(new CustomEvent("customModelChanged"));
      }
    } catch (e) { console.log("delete custom model error:", e); }
  };

  const handleTestModel = async (modelId) => {
    if (testingModelId) return;
    setTestingModelId(modelId);
    try {
      const res = await fetch("/api/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: `${providerAlias}/${modelId}`, kind: kindFilter }),
      });
      const data = await res.json();
      setModelTestResults((prev) => ({ ...prev, [modelId]: data.ok ? "ok" : "error" }));
      setTestError(data.ok ? "" : (data.error || "Model not reachable"));
    } catch {
      setModelTestResults((prev) => ({ ...prev, [modelId]: "error" }));
      setTestError("Network error");
    } finally { setTestingModelId(null); }
  };

  // Built-in models — filter by kindFilter if provided
  const allBuiltIn = getModelsByProviderId(providerId);
  const builtInModels = kindFilter
    ? allBuiltIn.filter((m) => {
        if (m.kinds) return m.kinds.includes(kindFilter);
        return getModelKind(m, "llm") === kindFilter;
      })
    : allBuiltIn;

  // Custom models for this provider + kind, dedupe vs built-in
  const myCustomModels = customModels.filter(
    (m) => m.providerAlias === providerAlias
      && getModelKind(m, "llm") === effectiveType
      && !builtInModels.some((b) => b.id === m.id)
  );

  const displayModels = builtInModels;

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">Models{kindFilter ? ` — ${kindFilter.toUpperCase()}` : ""}</h2>
        </div>
        {testError && <p className="text-xs text-error-500 mb-3 break-words">{testError}</p>}

        <div className="flex flex-wrap gap-3">
          {displayModels.map((model) => {
            const fullModel = `${providerAlias}/${model.id}`;
            const existingAlias = Object.entries(modelAliases).find(([, m]) => m === fullModel)?.[0];
            return (
              <ModelRow
                key={model.id}
                model={model}
                fullModel={`${providerAlias}/${model.id}`}
                alias={existingAlias}
                copied={copied}
                onCopy={copy}
                onSetAlias={(alias) => handleSetAlias(model.id, alias)}
                onDeleteAlias={() => handleDeleteAlias(existingAlias)}
                testStatus={modelTestResults[model.id]}
                onTest={() => handleTestModel(model.id)}
                isTesting={testingModelId === model.id}
                isFree={model.isFree}
              />
            );
          })}

          {myCustomModels.map((model) => (
            <ModelRow
              key={`${model.id}-${model.type}`}
              model={{ id: model.id, name: model.name }}
              fullModel={`${providerAlias}/${model.id}`}
              copied={copied}
              onCopy={copy}
              onSetAlias={() => {}}
              onDeleteAlias={() => handleDeleteCustomModel(model.id)}
              testStatus={modelTestResults[model.id]}
              onTest={() => handleTestModel(model.id)}
              isTesting={testingModelId === model.id}
              isCustom
            />
          ))}

          <button
            onClick={() => setShowAddCustomModel(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-card-border text-xs text-text-secondary hover:text-primary-500 hover:border-primary-500/40 transition-colors"
          >
            <Icon name="add" className="size-3.5" />
            Add Model
          </button>
        </div>
      </Card>

      <AddCustomModelModal
        isOpen={showAddCustomModel}
        onSave={async (modelId) => {
          await handleAddCustomModel(modelId);
          setShowAddCustomModel(false);
        }}
        onClose={() => setShowAddCustomModel(false)}
      />
    </>
  );
}

ModelsCard.propTypes = {
  providerId: PropTypes.string.isRequired,
  kindFilter: PropTypes.string, // e.g. "tts", "embedding" — filters models shown
  providerAliasOverride: PropTypes.string, // override alias (e.g. for custom-embedding nodes using prefix)
};
