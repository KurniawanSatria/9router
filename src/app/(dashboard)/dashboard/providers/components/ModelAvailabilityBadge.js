"use client";

/**
 * ModelAvailabilityBadge — compact inline status indicator
 *
 * Shows green when all models are operational, or amber/red when there are
 * issues, with a hover popover for details and cooldown clearing.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/shared/components";
import { useNotificationStore } from "@/store/notificationStore";
import Icon from "@/shared/components/Icon";

const STATUS_CONFIG = {
  available: { icon: "check_circle", className: "text-success-500", label: "Available" },
  cooldown: { icon: "schedule", className: "text-warning-500", label: "Cooldown" },
  unavailable: { icon: "error", className: "text-error-500", label: "Unavailable" },
  unknown: { icon: "help", className: "text-text-tertiary", label: "Unknown" },
};

export default function ModelAvailabilityBadge() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [clearing, setClearing] = useState(null);
  const ref = useRef(null);
  const notify = useNotificationStore();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/models/availability");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent fail — will retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(fetchStatus);
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setExpanded(false);
    };
    if (expanded) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  const handleClearCooldown = async (provider, model) => {
    setClearing(`${provider}:${model}`);
    try {
      const res = await fetch("/api/models/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearCooldown", provider, model }),
      });
      if (res.ok) {
        notify.success(`Cooldown cleared for ${model}`);
        await fetchStatus();
      } else {
        notify.error("Failed to clear cooldown");
      }
    } catch {
      notify.error("Failed to clear cooldown");
    } finally {
      setClearing(null);
    }
  };

  if (loading) return null;

  const models = data?.models || [];
  const unavailableCount = data?.unavailableCount || models.filter((m) => m.status !== "available").length;
  const isHealthy = unavailableCount === 0;

  // Group unhealthy models by provider
  const byProvider = {};
  models.forEach((m) => {
    if (m.status === "available") return;
    const key = m.provider || "unknown";
    if (!byProvider[key]) byProvider[key] = [];
    byProvider[key].push(m);
  });

  return (
    <div className="relative" ref={ref}>
      {/* <button
        onClick={() => setExpanded(!expanded)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          isHealthy
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/15"
            : "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/15"
        }`}
      >
        <Icon name={isHealthy ? "verified" : "warning"} className="size-3.5" />
        {isHealthy
          ? "All models operational"
          : `${unavailableCount} model${unavailableCount !== 1 ? "s" : ""} with issues`}
      </button> */}

      {expanded && (
        <div className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-card-border bg-card-background shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon name={isHealthy ? "verified" : "warning"} className={` size-4 ${isHealthy ? "text-success-500" : "text-warning-500"}`} />
              <span className="text-sm font-semibold text-text-primary">Model Status</span>
            </div>
            <button
              onClick={fetchStatus}
              className="rounded-lg p-1 text-text-tertiary transition-colors hover:bg-background-gray-primary hover:text-text-primary"
              title="Refresh"
            >
              <Icon name="refresh" className="size-3.5" />
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto px-4 py-3">
            {isHealthy ? (
              <p className="py-2 text-center text-sm text-text-secondary">
                All models are responding normally.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {Object.entries(byProvider).map(([provider, provModels]) => (
                  <div key={provider}>
                    <p className="mb-1.5 text-xs font-semibold capitalize text-text-primary">{provider}</p>
                    <div className="flex flex-col gap-1">
                      {provModels.map((m) => {
                        const status = STATUS_CONFIG[m.status] || STATUS_CONFIG.unknown;
                        const isClearing = clearing === `${m.provider}:${m.model}`;
                        return (
                          <div
                            key={`${m.provider}-${m.model}`}
                            className="flex items-center justify-between rounded-lg bg-background-gray-primary px-2.5 py-1.5"
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              <Icon name={status.icon} className={` size-3.5 shrink-0 ${status.className}`} />
                              <span className="truncate font-mono text-xs text-text-primary">{m.model}</span>
                            </div>
                            {m.status === "cooldown" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleClearCooldown(m.provider, m.model)}
                                disabled={isClearing}
                                className="ml-2 px-1.5! py-0.5! text-[10px]"
                              >
                                {isClearing ? "..." : "Clear"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
