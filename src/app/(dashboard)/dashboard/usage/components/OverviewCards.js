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

const pctChange = (cur, prev) =>
  prev > 0 && Number.isFinite(cur) ? ((cur - prev) / prev) * 100 : null;

const STATS = [
  { key: "totalRequests", label: "Total Requests", icon: "rocket_launch", iconClass: "text-primary-500" },
  { key: "totalPromptTokens", label: "Input Tokens", icon: "input", iconClass: "text-info-500" },
  { key: "totalCachedTokens", label: "Cached Tokens", icon: "database", iconClass: "text-success-500" },
  { key: "avgLatency", label: "Avg. Response Time", icon: "clock_three", iconClass: "text-warning-500" },
  { key: "successRate", label: "Success Rate", icon: "check_circle", iconClass: "text-success-500" },
];

function Delta({ value }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className={cnx("font-medium", up ? "text-success-500" : "text-error-500")}>
      {up ? "+" : ""}{value.toFixed(1)}% {up ? "↑" : "↓"}
    </span>
  );
}

Delta.propTypes = {
  value: PropTypes.number,
};

export default function OverviewCards({ stats }) {
  const latency = stats.latency || {};
  const success = stats.success || {};
  const previous = stats.previous || {};

  const values = {
    totalRequests: {
      value: fmtCompact(stats.totalRequests),
      delta: pctChange(stats.totalRequests || 0, previous.totalRequests || 0),
    },
    totalPromptTokens: {
      value: fmtCompact(stats.totalPromptTokens),
      delta: pctChange(stats.totalPromptTokens || 0, previous.totalPromptTokens || 0),
    },
    totalCachedTokens: { value: fmtCompact(stats.totalCachedTokens), delta: null },
    avgLatency: {
      value: fmtLatency(latency.avgMs),
      delta: pctChange(latency.avgMs, latency.prevAvgMs),
    },
    successRate: {
      value: success.rate == null ? "—" : `${success.rate.toFixed(1)}%`,
      delta: success.rate != null && success.prevRate != null ? success.rate - success.prevRate : null,
    },
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
      {STATS.map(({ key, label, icon, iconClass }) => (
        <Card key={key} className="border-0 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-text-secondary">{label}</span>
            <Icon name={icon} className={cnx(" size-4.5 ", iconClass)} />
          </div>

          <div className="mt-4 truncate text-2xl leading-8 font-semibold tabular-nums text-text-primary" title={values[key].value}>
            {values[key].value}
          </div>

          {values[key].delta != null && (
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <Delta value={values[key].delta} />
              <span className="text-text-tertiary">vs previous period</span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
