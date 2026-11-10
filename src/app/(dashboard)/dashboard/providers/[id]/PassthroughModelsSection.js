"use client";

import { useState } from "react";
import PropTypes from "prop-types";
import { Button } from "@/shared/components";
import ModelIcon from "@/shared/components/ModelIcon";
import { getProviderCustomModelRows } from "@/shared/utils/providerCustomModels";
import Icon from "@/shared/components/Icon";

function PassthroughModelRow({ modelId, fullModel, copied, onCopy, onDeleteAlias, onTest, testStatus, isTesting }) {
  const borderColor = testStatus === "ok"
    ? "border-success-500/40"
    : testStatus === "error"
    ? "border-error-500/40"
    : "border-card-border";

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${borderColor} hover:bg-background-gray-primary`}>
      <ModelIcon modelId={modelId || fullModel} testStatus={testStatus} size={16} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{modelId}</p>

        <div className="flex items-center gap-1 mt-1">
        <code className="text-xs text-text-secondary font-mono bg-background-soft-50 px-1.5 py-0.5 rounded">{fullModel}</code>
          <div className="relative group/btn">
            <button
              onClick={() => onCopy(fullModel, `model-${modelId}`)}
              className="p-0.5 hover:bg-background-soft-50 rounded text-text-secondary hover:text-primary-500"
            >
              <Icon name={copied === `model-${modelId}` ? "check" : "content_copy"} className="size-3.5" />
            </button>
            <span className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-secondary whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
              {copied === `model-${modelId}` ? "Copied!" : "Copy"}
            </span>
          </div>
          {onTest && (
            <div className="relative group/btn">
              <button
                onClick={onTest}
                disabled={isTesting}
                aria-label="Test model"
                className="p-0.5 hover:bg-background-soft-50 rounded text-text-secondary hover:text-primary-500 transition-colors"
              >
                <Icon name={isTesting ? "progress_activity" : "science"} className="size-3.5" style={isTesting ? { animation: "spin 1s linear infinite" } : undefined} />
              </button>
              <span className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-secondary whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
                {isTesting ? "Testing..." : "Test"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={onDeleteAlias}
        className="p-1 hover:bg-error-500/10 rounded text-error-500"
        title="Remove model"
      >
        <Icon name="delete" className="size-3.5" />
      </button>
    </div>
  );
}

PassthroughModelRow.propTypes = {
  modelId: PropTypes.string.isRequired,
  fullModel: PropTypes.string.isRequired,
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  onDeleteAlias: PropTypes.func.isRequired,
  onTest: PropTypes.func,
  testStatus: PropTypes.oneOf(["ok", "error"]),
  isTesting: PropTypes.bool,
};

export default function PassthroughModelsSection({ providerAlias, modelAliases, customModels, copied, onCopy, onDeleteAlias, onAddCustomModel, onDeleteCustomModel }) {
  const [newModel, setNewModel] = useState("");
  const [adding, setAdding] = useState(false);

  const allModels = getProviderCustomModelRows({
    customModels,
    modelAliases,
    providerAlias,
    type: "llm",
  });

  const handleAdd = async () => {
    if (!newModel.trim() || adding) return;
    const modelId = newModel.trim();

    if (allModels.some((model) => model.id === modelId)) {
      alert("Model already exists for this provider.");
      return;
    }

    setAdding(true);
    try {
      await onAddCustomModel(modelId);
      setNewModel("");
    } catch (error) {
      console.log("Error adding model:", error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        OpenRouter supports any model. Add models and create aliases for quick access.
      </p>

      {/* Add new model */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="new-model-input" className="text-xs text-text-secondary mb-1 block">Model ID (from OpenRouter)</label>
          <input
            id="new-model-input"
            type="text"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="anthropic/claude-3-opus"
            className="h-10 w-full rounded-lg border border-input-border bg-card-background px-3 text-sm text-text-primary outline-none placeholder:text-input-placeholder-text focus:border-primary-500"
          />
        </div>
        <Button size="sm" icon="add" onClick={handleAdd} disabled={!newModel.trim() || adding}>
          {adding ? "Adding..." : "Add"}
        </Button>
      </div>

      {/* Models list */}
      {allModels.length > 0 && (
        <div className="flex flex-col gap-3">
          {allModels.map(({ id, fullModel, alias, source }) => (
            <PassthroughModelRow
              key={`${source}-${fullModel}`}
              modelId={id}
              fullModel={fullModel}
              copied={copied}
              onCopy={onCopy}
              onDeleteAlias={() => source === "custom" ? onDeleteCustomModel(id) : onDeleteAlias(alias)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

PassthroughModelsSection.propTypes = {
  providerAlias: PropTypes.string.isRequired,
  modelAliases: PropTypes.object.isRequired,
  customModels: PropTypes.arrayOf(PropTypes.object),
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  onDeleteAlias: PropTypes.func.isRequired,
  onAddCustomModel: PropTypes.func.isRequired,
  onDeleteCustomModel: PropTypes.func.isRequired,
};
