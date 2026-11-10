"use client";

import PropTypes from "prop-types";
import { Card } from "@/shared/tailgrids/core/card";
import { cnx } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

const fmtCompact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
};

const fmtLatency = (ms) => {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
};

const STATS = [
  { key: "totalRequests", label: "Total Requests", icon: "rocket_launch", iconClass: "text-primary-500" },
  { key: "totalPromptTokens", label: "Input Tokens", icon: "input", iconClass: "text-info-500" },
  { key: "totalCachedTokens", label: "Cached Tokens", icon: "database", iconClass: "text-success-500" },
  { key: "avgLatency", label: "Avg. Response Time", icon: "clock_three", iconClass: "text-warning-500" },
  { key: "successRate", label: "Success Rate", icon: "check_circle", iconClass: "text-success-500" },
];

export default function OverviewCards({ stats }) {
  const latency = stats.latency || {};
  const success = stats.success || {};

  const values = {
    totalRequests: fmtCompact(stats.totalRequests),
    totalPromptTokens: fmtCompact(stats.totalPromptTokens),
    totalCachedTokens: fmtCompact(stats.totalCachedTokens),
    avgLatency: fmtLatency(latency.avgMs),
    successRate: success.rate == null ? "—" : `${success.rate.toFixed(1)}%`,
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
      {STATS.map(({ key, label, icon, iconClass }) => (
        <Card key={key} className="border-0 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-text-secondary">{label}</span>
            <Icon name={icon} className={cnx(" size-4.5 ", iconClass)} />
          </div>

          <div className="mt-4 truncate text-2xl leading-8 font-semibold tabular-nums text-text-primary" title={values[key]}>
            {values[key]}
          </div>
        </Card>
      ))}
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
