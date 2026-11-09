"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);

const fmtCompact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v));
};

const STATS = [
  { key: "totalRequests", label: "Total Requests", tone: "text-text-main" },
  { key: "totalPromptTokens", label: "Total Input Tokens", tone: "text-primary" },
  { key: "totalCachedTokens", label: "Cached Tokens", tone: "text-info" },
];

export default function OverviewCards({ stats }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
      {STATS.map(({ key, label, tone }) => (
        <Card key={key} padding="none" className="flex min-w-0 flex-col gap-3 p-5">
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">{label}</span>
          <span
            className={`truncate text-[28px] font-bold leading-none tabular-nums tracking-tight ${tone}`}
            title={fmt(stats[key])}
          >
            {fmtCompact(stats[key])}
          </span>
        </Card>
      ))}
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
