"use client";

import { useState, useEffect, useRef } from "react";
import Select from "@/shared/components/Select";
import { FREE_PROVIDERS, AI_PROVIDERS } from "@/shared/constants/providers";
import { prettyModel } from "@/shared/utils/modelName";

// Keep providers without serviceKinds (default LLM) or with "llm" in serviceKinds
function isLLMProvider(id) {
  const p = AI_PROVIDERS[id];
  if (!p?.serviceKinds) return true;
  return p.serviceKinds.includes("llm");
}
import Badge from "./Badge";
import Card from "./Card";
import OverviewCards from "@/app/(dashboard)/dashboard/usage/components/OverviewCards";
import dynamic from "next/dynamic";
import Icon from "@/shared/components/Icon";
import ModelIcon from "@/shared/components/ModelIcon";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
// Lazy-load: keeps @xyflow/react and recharts out of the initial bundle
const ProviderTopology = dynamic(() => import("@/app/(dashboard)/dashboard/usage/components/ProviderTopology"), { ssr: false });
const UsageChart = dynamic(() => import("@/app/(dashboard)/dashboard/usage/components/UsageChart"), { ssr: false });
const TopUsage = dynamic(() => import("@/app/(dashboard)/dashboard/usage/components/TopUsage"), { ssr: false });

function timeAgo(timestamp) {
  const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Auto-update time display every second without re-rendering parent
function TimeAgo({ timestamp }) {
  const [, setTick] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return <>{timeAgo(timestamp)}</>;
}

function ModelName({ modelId }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <ModelIcon modelId={modelId} size={14} />
      <span className="min-w-0 truncate">{prettyModel(modelId)}</span>
    </span>
  );
}

function RecentRequests({ requests = [] }) {
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden rounded-xl border-[0.5px] border-card-border bg-card-background p-5" padding="none">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 py-2 shrink-0">
        <span className="text-base font-semibold text-text-primary">Recent Requests</span>
        {requests.length > 0 && (
          <span className="rounded-full bg-background-soft-50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-text-tertiary">
            {requests.length}
          </span>
        )}
      </div>

      {!requests.length ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">No requests yet.</div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[minmax(0,1fr)_80px_56px] items-center gap-2 px-1 text-xs font-medium text-text-tertiary">
              <span>Model</span>
              <span className="text-right whitespace-nowrap">In / Out</span>
              <span className="text-right whitespace-nowrap">When</span>
            </div>
            {requests.slice(0, 5).map((r, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_80px_56px] items-center gap-2">
                <div className="flex min-w-0 items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 transition-colors hover:bg-white/10">
                  <ModelIcon modelId={r.model} size={14} />
                  <span className="truncate text-xs font-medium text-text-secondary" title={r.model}>{prettyModel(r.model)}</span>
                </div>
                <span className="text-right text-xs whitespace-nowrap">
                  <span className="text-primary-500">{fmt(r.promptTokens)}↑</span>
                  {" "}
                  <span className="text-success-500">{fmt(r.completionTokens)}↓</span>
                </span>
                <span className="text-right text-xs text-text-tertiary whitespace-nowrap"><TimeAgo timestamp={r.timestamp} /></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
  { value: "all", label: "All" },
];

export default function UsageStats({ period: periodProp, setPeriod: setPeriodProp, hidePeriodSelector = false } = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [providers, setProviders] = useState([]);
  const [periodLocal, setPeriodLocal] = useState("today");
  const isInitialLoad = useRef(true);
  const hasLoadedStats = useRef(false);
  const period = periodProp ?? periodLocal;
  const setPeriod = setPeriodProp ?? setPeriodLocal;

  // Fetch connected providers once, deduplicate by provider type
  // Always include noAuth free providers (e.g. opencode) regardless of connections
  useEffect(() => {
    Promise.all([
      fetch("/api/providers").then((r) => r.ok ? r.json() : null),
      fetch("/api/provider-nodes").then((r) => r.ok ? r.json() : null),
    ])
      .then(([d, nodesData]) => {
        // Build node name lookup for custom providers
        const nodeNameMap = {};
        for (const node of (nodesData?.nodes || [])) {
          nodeNameMap[node.id] = node.name;
        }
        const seen = new Set();
        const unique = (d?.connections || []).filter((c) => {
          if (c.isActive === false) return false;
          if (!isLLMProvider(c.provider)) return false;
          if (AI_PROVIDERS[c.provider]?.hidden) return false;
          if (seen.has(c.provider)) return false;
          seen.add(c.provider);
          return true;
        }).map((c) => ({
          ...c,
          nodeName: nodeNameMap[c.provider] || null,
        }));
        const noAuthProviders = Object.values(FREE_PROVIDERS)
          .filter((p) => p.noAuth && !p.hidden && !seen.has(p.id) && isLLMProvider(p.id))
          .map((p) => ({ provider: p.id, name: p.name }));
        setProviders([...unique, ...noAuthProviders]);
      })
      .catch(() => {});
  }, []);

  // Fetch filtered stats via REST when period changes
  useEffect(() => {
    // First load: show full spinner; subsequent: show subtle fetching indicator
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      setLoading(true);
    } else {
      setFetching(true);
    }

    fetch(`/api/usage/stats?period=${period}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          hasLoadedStats.current = true;
          setStats((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setFetching(false);
      });
  }, [period]);

  // SSE connection - real-time stats for the selected period
  useEffect(() => {
    const es = new EventSource(`/api/usage/stream?period=${period}`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setStats((prev) => ({ ...prev, ...data }));
        if (hasLoadedStats.current) setLoading(false);
      } catch (err) {
        console.error("[SSE CLIENT] parse error:", err);
      }
    };

    es.onerror = () => setLoading(false);

    return () => es.close();
  }, [period]);

  if (!stats && !loading) return <div className="text-text-secondary">Failed to load usage statistics.</div>;

  const spinner = (
    <div className="flex items-center justify-center py-12 text-text-secondary">
      <Icon name="progress_activity" className="size-8 animate-spin" />
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Period selector (hidden when controlled by parent) */}
      {!hidePeriodSelector && (
        <div className="flex w-full items-center gap-2 sm:w-auto sm:self-end">
          <Select
            size="sm"
            value={period}
            onChange={setPeriod}
            options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
            ariaLabel="Usage period"
            disabled={fetching}
            className="w-full sm:w-auto"
            buttonClassName="min-w-[120px]"
          />
          {fetching && (
            <Icon name="progress_activity" className="size-4 text-text-tertiary animate-spin" />
          )}
        </div>
      )}

      {/* Overview cards */}
      {loading ? spinner : <OverviewCards stats={stats} />}

      {/* Provider topology + Recent Requests / Top Usage */}
      {loading ? spinner : (
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(360px,0.9fr)]">
          <ProviderTopology
            providers={providers}
            activeRequests={stats.activeRequests || []}
            lastProvider={stats.recentRequests?.[0]?.provider || ""}
            errorProvider={stats.errorProvider || ""}
          />
          <div className="flex min-w-0 flex-col gap-3">
            <RecentRequests requests={stats.recentRequests || []} />
            {stats.byModel && <TopUsage byModel={stats.byModel} />}
            <UsageChart period={period} />
          </div>
        </div>
      )}

    </div>
  );
}
