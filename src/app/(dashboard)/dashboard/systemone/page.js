"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, ModelSelectModal } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { getProvidersByKind } from "@/shared/constants/providers";
import { getModelsByProviderId, getModelKind } from "@/shared/constants/models";

const DEFAULT_STATE = "Customer: I was charged twice for my order this morning.";

const DEFAULT_QUESTIONS = JSON.stringify(
  {
    probe: {
      type: "noul",
      instructions: "Is the customer reporting a billing problem?",
    },
  },
  null,
  2
);

const QUESTION_TYPES = [
  {
    type: "noul",
    label: "Yes / No / Unknown",
    desc: "Binary decision with an explicit unknown bucket.",
  },
  {
    type: "choice",
    label: "Choice",
    desc: "Pick one option from a fixed list, with calibrated confidence.",
  },
  {
    type: "score",
    label: "Score",
    desc: "Numeric score plus a legend describing the scale.",
  },
  {
    type: "box",
    label: "Box",
    desc: "Locate one thing in an image (fractions of width/height). Needs an image in `assets`.",
  },
];

export default function SystemOnePage() {
  const [model, setModel] = useState("");
  const [state, setState] = useState(DEFAULT_STATE);
  const [questionsText, setQuestionsText] = useState(DEFAULT_QUESTIONS);
  const [assetsText, setAssetsText] = useState("");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [activeProviders, setActiveProviders] = useState([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const { copied, copy } = useCopyToClipboard();

  const lanes = useMemo(() => {
    return getProvidersByKind("systemone").map((provider) => {
      const models = getModelsByProviderId(provider.id)
        .filter((m) => getModelKind(m) === "systemone")
        .map((m) => ({ id: m.id, name: m.name || m.id, alias: provider.alias }));
      return { provider, models };
    });
  }, []);

  useEffect(() => {
    setOrigin(globalThis.location?.origin || "");
    fetch("/api/providers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const connections = Array.isArray(data?.connections)
          ? data.connections.filter((c) => c.isActive !== false)
          : [];
        setActiveProviders(connections);
      })
      .catch(() => setActiveProviders([]));
  }, []);

  const connectedIds = useMemo(
    () => new Set(activeProviders.map((c) => c.provider)),
    [activeProviders]
  );

  const noAuthIds = useMemo(
    () => new Set(lanes.filter((l) => l.provider.noAuth).map((l) => l.provider.id)),
    [lanes]
  );

  const isConnected = (providerId) =>
    connectedIds.has(providerId) || noAuthIds.has(providerId);

  // Number of lanes the virtual "Auto" combo would round-robin right now.
  const connectedLaneCount = lanes.reduce(
    (total, lane) => total + (isConnected(lane.provider.id) ? lane.models.length : 0),
    0
  );

  const requestCurl = useMemo(() => {
    let questions = DEFAULT_QUESTIONS;
    try {
      questions = JSON.stringify(JSON.parse(questionsText), null, 2);
    } catch {
      // keep last valid sample when the textarea is mid-edit
    }
    return [
      `curl -X POST ${origin || "http://localhost:20128"}/v1/systemone \\`,
      `  -H "Authorization: Bearer $NINE_ROUTER_API_KEY" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '${JSON.stringify(
        {
          model: model || "oc/jev-1.13-free",
          state,
          questions: JSON.parse(questions),
        },
        null,
        2
      ).replaceAll("'", "'\\''")}'`,
    ].join("\n");
  }, [model, state, questionsText, origin]);

  const handleProbe = async () => {
    setError("");
    setResult(null);

    if (!model) {
      setError("Pick a System One model first.");
      return;
    }

    let questions;
    try {
      questions = JSON.parse(questionsText);
    } catch (err) {
      setError(`Questions is not valid JSON: ${err.message}`);
      return;
    }

    let assets;
    if (assetsText.trim()) {
      try {
        assets = JSON.parse(assetsText);
      } catch (err) {
        setError(`Assets is not valid JSON: ${err.message}`);
        return;
      }
    }

    setRunning(true);
    try {
      const res = await fetch("/api/systemone/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, state, questions, ...(assets ? { assets } : {}) }),
      });
      const data = await res.json();
      setResult(data);
      if (!res.ok) {
        setError(data?.error || `Probe failed (HTTP ${res.status})`);
      }
    } catch (err) {
      setError(`Probe failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="System One"
        subtitle="Decision endpoint for Jev / Drex / v1m models: send a state plus typed questions, get calibrated answers."
        icon="psychology"
        action={
          <Badge variant="primary" size="md" dot>
            POST /v1/systemone
          </Badge>
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <span className="font-mono text-xs px-2 py-1 rounded bg-surface-2 text-text-main">
            POST {origin || "http://localhost:20128"}/v1/systemone
          </span>
          <Button
            variant="ghost"
            size="xs"
            icon={copied === "endpoint" ? "check" : "content_copy"}
            onClick={() => copy(`${origin || "http://localhost:20128"}/v1/systemone`, "endpoint")}
          >
            {copied === "endpoint" ? "Copied" : "Copy URL"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Card
          title="Available lanes"
          subtitle="Providers that expose System One models"
          icon="hub"
        >
          <div className="flex flex-col gap-3">
            <div className="rounded-[10px] border border-brand-500/40 bg-brand-500/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-main">Auto</span>
                    <Badge variant="success" size="sm" dot>
                      dynamic
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Round-robin across every connected System One lane. Locked, rate-limited and
                    cooling-down accounts are skipped automatically, and lanes whose provider has
                    no available account move to the end.
                  </p>
                </div>
                {connectedLaneCount > 0 && (
                  <Badge size="sm">{connectedLaneCount} lane</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setModel("Auto")}
                  className={`font-mono text-[11px] px-2 py-1 rounded-[6px] border transition-colors cursor-pointer ${
                    model === "Auto"
                      ? "border-brand-500/50 bg-brand-500/10 text-brand-600 dark:text-brand-300"
                      : "border-border text-text-muted hover:text-text-main hover:bg-surface"
                  }`}
                  title="Round-robin every connected System One lane"
                >
                  Auto
                </button>
              </div>
            </div>
            {lanes.length === 0 && (
              <p className="text-sm text-text-muted">No System One lanes in the registry yet.</p>
            )}
            {lanes.map(({ provider, models }) => (
              <div
                key={provider.id}
                className="rounded-[10px] border border-border-subtle bg-surface-2/50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-main truncate">
                        {provider.name || provider.id}
                      </span>
                      <Badge variant={isConnected(provider.id) ? "success" : "default"} size="sm" dot>
                        {isConnected(provider.id) ? "connected" : "not connected"}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted font-mono mt-0.5">
                      {provider.alias || provider.id}
                    </p>
                  </div>
                  {models.length > 0 && (
                    <Badge size="sm">{models.length} model</Badge>
                  )}
                </div>

                {provider.systemoneConfig?.baseUrl && (
                  <p className="text-[11px] text-text-muted font-mono mt-2 break-all">
                    {provider.systemoneConfig.baseUrl}
                  </p>
                )}

                {provider.notice?.text && (
                  <p className="text-xs text-text-muted mt-2">{provider.notice.text}</p>
                )}

                {models.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModel(`${m.alias}/${m.id}`)}
                        className={`font-mono text-[11px] px-2 py-1 rounded-[6px] border transition-colors cursor-pointer ${
                          model === `${m.alias}/${m.id}`
                            ? "border-brand-500/50 bg-brand-500/10 text-brand-600 dark:text-brand-300"
                            : "border-border text-text-muted hover:text-text-main hover:bg-surface"
                        }`}
                        title={`Use ${m.alias}/${m.id}`}
                      >
                        {m.alias}/{m.id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Interactive probe" subtitle="Send a real request through the internal endpoint" icon="play_circle">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-main">Model</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowModelPicker(true)}
                  className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-[10px] bg-surface-2 border border-transparent hover:border-brand-500/40 transition-colors text-left cursor-pointer"
                >
                  <span className={`text-sm font-mono ${model ? "text-text-main" : "text-text-muted/70"}`}>
                    {model || "Select a System One model..."}
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-muted">expand_more</span>
                </button>
                <Button
                  variant={model === "Auto" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setModel("Auto")}
                  title="Round-robin every connected System One lane"
                >
                  Auto
                </Button>
                {model && (
                  <Button variant="ghost" size="sm" icon="close" onClick={() => setModel("")} aria-label="Clear model" />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-main">State</span>
              <textarea
                value={state}
                onChange={(e) => setState(e.target.value)}
                rows={3}
                className="w-full py-2.5 px-3 text-sm text-text-main bg-surface-2 rounded-[10px] border border-transparent placeholder-text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all resize-y font-mono"
                placeholder="Text / context to evaluate"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-main">Questions (JSON)</span>
                <span className="text-[11px] text-text-muted">
                  {QUESTION_TYPES.map((q) => q.type).join(" · ")}
                </span>
              </div>
              <textarea
                value={questionsText}
                onChange={(e) => setQuestionsText(e.target.value)}
                rows={9}
                spellCheck={false}
                className="w-full py-2.5 px-3 text-xs text-text-main bg-surface-2 rounded-[10px] border border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all resize-y font-mono"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {error}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button variant="primary" icon="bolt" loading={running} onClick={handleProbe} disabled={!model}>
                {running ? "Running..." : "Run probe"}
              </Button>
              <Button
                variant="ghost"
                icon={copied === "curl" ? "check" : "content_copy"}
                onClick={() => copy(requestCurl, "curl")}
              >
                {copied === "curl" ? "Copied" : "Copy cURL"}
              </Button>
            </div>

            {result && (
              <div className="rounded-[10px] border border-border-subtle bg-surface-2/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={result.ok ? "success" : "error"} size="sm" dot>
                    {result.ok ? "OK" : `HTTP ${result.status}`}
                  </Badge>
                  {typeof result.latencyMs === "number" && (
                    <Badge size="sm">{result.latencyMs} ms</Badge>
                  )}
                </div>
                <pre className="text-[11px] leading-relaxed text-text-main overflow-auto max-h-80 font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(result.data ?? result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title="Question types" subtitle="Question shapes accepted by System One lanes" icon="help">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUESTION_TYPES.map((q) => (
            <div key={q.type} className="rounded-[10px] border border-border-subtle bg-surface-2/50 p-3">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-brand-600 dark:text-brand-300">{q.type}</code>
                <span className="text-sm font-semibold text-text-main">{q.label}</span>
              </div>
              <p className="text-xs text-text-muted mt-1">{q.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-4">
          Images ride the top-level `assets` object: define each one once and reference its key in the text
          (`&quot;&lt;picture&gt;&quot;`). `drex-max` instead takes a top-level `images` array (PNG / JPEG / WebP, up to 8 per request).
        </p>
      </Card>

      <ModelSelectModal
        isOpen={showModelPicker}
        onClose={() => setShowModelPicker(false)}
        onSelect={(m) => {
          setModel(m?.value || "");
          setShowModelPicker(false);
        }}
        activeProviders={activeProviders}
        title="Select System One Model"
        kindFilter="systemone"
        addedModelValues={model ? [model] : []}
        closeOnSelect={true}
      />
    </div>
  );
}