"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/shared/components";
import Icon from "@/shared/components/Icon";

const PERIOD = "30d";
const TOP_N = 5;

const fmtRequests = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
};

const fmtCost = (n) =>
  `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n || 0)}`;

export default function TopApiKeyUsage() {
  const [byApiKey, setByApiKey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/usage/stats?period=${PERIOD}`, { cache: "no-store" });
        const data = res.ok ? await res.json() : {};
        setByApiKey(data.byApiKey || {});
      } catch (error) {
        console.log("Error fetching API key usage:", error);
        setByApiKey({});
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const rows = useMemo(() => {
    if (!byApiKey) return [];
    return Object.values(byApiKey)
      .filter((d) => (d.requests || 0) > 0)
      .sort((a, b) => (b.requests || 0) - (a.requests || 0))
      .slice(0, TOP_N);
  }, [byApiKey]);

  const total = useMemo(
    () => Object.values(byApiKey || {}).reduce((sum, d) => sum + (d.requests || 0), 0),
    [byApiKey]
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icon name="monitoring" className="text-primary-500" />
            Top Usage by API Key
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Requests and cost per key over the last 30 days.
          </p>
        </div>
        <span className="rounded-full border border-card-border px-2.5 py-1 text-xs text-text-secondary">
          {total} requests
        </span>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-text-secondary">Loading usage...</p>
      ) : !rows.length ? (
        <p className="mt-4 text-sm text-text-secondary">No API key usage yet.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="grid grid-cols-[minmax(0,1fr)_76px_88px] items-center gap-2 px-2 text-xs font-medium text-text-tertiary">
            <span>API Key</span>
            <span className="text-right">Request</span>
            <span className="text-right">Cost</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.apiKeyKey || row.keyName}
              className="relative overflow-hidden rounded-lg bg-white/5"
              title={row.apiKeyMasked || row.keyName}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary-500/15"
                style={{ width: `${total ? ((row.requests || 0) / total) * 100 : 0}%` }}
              />
              <div className="relative grid grid-cols-[minmax(0,1fr)_76px_88px] items-center gap-2 px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-white/10">
                    <Icon name="key" className="size-3 text-text-secondary" />
                  </span>
                  <span className="min-w-0 truncate text-xs font-medium text-text-primary">
                    {row.keyName || "Unnamed key"}
                  </span>
                  {row.apiKeyMasked && (
                    <span className="hidden shrink-0 font-mono text-[11px] text-text-tertiary sm:inline">
                      {row.apiKeyMasked}
                    </span>
                  )}
                </div>
                <span className="text-right text-xs font-medium tabular-nums text-text-primary">
                  {fmtRequests(row.requests)}
                </span>
                <span className="text-right text-xs font-medium tabular-nums text-text-primary">
                  {fmtCost(row.cost)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
