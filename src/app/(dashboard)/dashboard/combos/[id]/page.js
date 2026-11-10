"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { Button, Input, CardSkeleton, ModelSelectModal } from "@/shared/components";
import { Card } from "@/shared/tailgrids/core/card";
import { cnx } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

export default function ComboDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState("");
  const [models, setModels] = useState([]);
  const [activeProviders, setActiveProviders] = useState([]);
  const [modelAliases, setModelAliases] = useState({});
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [comboRes, providersRes, aliasesRes] = await Promise.all([
          fetch(`/api/combos/${id}`),
          fetch("/api/providers"),
          fetch("/api/models/alias"),
        ]);
        if (cancelled) return;
        if (!comboRes.ok) {
          setMissing(true);
          return;
        }
        const combo = await comboRes.json();
        setName(combo.name || "");
        setModels(combo.models || []);
        if (providersRes.ok) {
          const data = await providersRes.json();
          setActiveProviders((data.connections || []).filter((c) => c.isActive !== false));
        }
        if (aliasesRes.ok) {
          const data = await aliasesRes.json();
          setModelAliases(data.aliases || {});
        }
        if (new URLSearchParams(window.location.search).get("pick") === "1") {
          setShowModelSelect(true);
        }
      } catch (error) {
        console.log("Error loading combo:", error);
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const modelItems = models.map((model, i) => ({ uid: `item-${i}`, model }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = modelItems.findIndex((m) => m.uid === active.id);
      const newIndex = modelItems.findIndex((m) => m.uid === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setModels((prev) => arrayMove(prev, oldIndex, newIndex));
      }
    }
  };

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

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (value) validateName(value);
    else setNameError("");
  };

  const handleAddModel = (model) => {
    if (!models.includes(model.value)) setModels([...models, model.value]);
  };

  const handleDeselectModel = (model) => {
    setModels(models.filter((m) => m !== model.value));
  };

  const handleRemoveModel = (index) => {
    setModels(models.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const next = [...models];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setModels(next);
  };

  const handleMoveDown = (index) => {
    if (index === models.length - 1) return;
    const next = [...models];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setModels(next);
  };

  const handleSave = async () => {
    if (!validateName(name)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/combos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), models }),
      });
      if (res.ok) {
        router.push("/dashboard/combos");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save combo");
      }
    } catch (error) {
      console.log("Error saving combo:", error);
      alert("Failed to save combo");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <CardSkeleton />
      </div>
    );
  }

  if (missing) {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <p className="text-sm text-text-secondary">Combo not found.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/dashboard/combos")}>
            Back to Combos
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5 px-1 sm:px-0">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm" icon="arrow_back" onClick={() => router.push("/dashboard/combos")}>
            Combos
          </Button>
        </div>
        <Button onClick={handleSave} disabled={!name.trim() || !!nameError || saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Card className="flex min-w-0 flex-col gap-5">
        <div>
          <Input
            label="Combo Name"
            value={name}
            onChange={handleNameChange}
            placeholder="my-combo"
            error={nameError}
          />
          <p className="mt-0.5 text-[10px] text-text-tertiary">
            Only letters, numbers, -, _ and . allowed
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label className="text-sm font-medium">Models</label>
            {models.length > 1 && (
              <span className="text-[10px] text-text-tertiary">Drag to reorder</span>
            )}
          </div>

          {models.length === 0 ? (
            <div className="rounded-xl border-[0.5px] border-dashed border-card-border bg-background-gray-primary py-6 text-center">
              <Icon name="layers" className="mb-1 text-text-tertiary size-5 mx-auto" />
              <p className="text-xs text-text-tertiary">No models added yet</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
              <SortableContext items={modelItems.map((m) => m.uid)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1">
                  {modelItems.map(({ uid, model }, index) => (
                    <ModelItem
                      key={uid}
                      id={uid}
                      index={index}
                      model={model}
                      isFirst={index === 0}
                      isLast={index === modelItems.length - 1}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                      onRemove={() => handleRemoveModel(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <button
            onClick={() => setShowModelSelect(true)}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border-[0.5px] border-dashed border-card-border py-2 text-xs font-medium text-primary-500 transition-colors hover:border-primary-500/50 hover:bg-primary-500/5"
          >
            <Icon name="add" className="size-4" />
            Add Model
          </button>
        </div>
      </Card>

      {showModelSelect && (
        <ModelSelectModal
          isOpen={showModelSelect}
          onClose={() => setShowModelSelect(false)}
          onSelect={handleAddModel}
          onDeselect={handleDeselectModel}
          activeProviders={activeProviders}
          modelAliases={modelAliases}
          title="Add Model to Combo"
          addedModelValues={models}
          closeOnSelect={false}
        />
      )}
    </div>
  );
}

function ModelItem({ id, index, model, isFirst, isLast, onMoveUp, onMoveDown, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      className={cnx(
        "group flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors",
        isDragging
          ? "border-primary-500/40 bg-primary-500/5 shadow-sm"
          : "border-transparent bg-background-gray-primary hover:bg-card-background"
      )}
    >
      <button
        {...attributes}
        type="button"
        aria-label={`Reorder ${model}`}
        className="cursor-grab touch-none rounded p-0.5 text-text-tertiary/70 hover:text-primary-500 active:cursor-grabbing shrink-0"
        title="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="4" r="2"/><circle cx="15" cy="4" r="2"/>
          <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
          <circle cx="9" cy="20" r="2"/><circle cx="15" cy="20" r="2"/>
        </svg>
      </button>

      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-background-gray-primary text-[10px] font-semibold tabular-nums text-text-tertiary">
        {index + 1}
      </span>

      <span className="min-w-0 flex-1 truncate px-1 font-mono text-xs text-text-primary">
        {model}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label="Move up"
          className={`rounded p-1 ${isFirst ? "cursor-not-allowed text-text-tertiary/20" : "text-text-tertiary hover:bg-background-gray-primary hover:text-primary-500"}`}
          title="Move up"
        >
          <Icon name="arrow_upward" className="size-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          aria-label="Move down"
          className={`rounded p-1 ${isLast ? "cursor-not-allowed text-text-tertiary/20" : "text-text-tertiary hover:bg-background-gray-primary hover:text-primary-500"}`}
          title="Move down"
        >
          <Icon name="arrow_downward" className="size-3.5" />
        </button>
      </div>

      <button
        onClick={onRemove}
        aria-label="Remove model"
        className="rounded p-1 text-text-tertiary transition-colors hover:bg-error-500/10 hover:text-error-500"
        title="Remove"
      >
        <Icon name="close" className="size-3.5" />
      </button>
    </div>
  );
}
