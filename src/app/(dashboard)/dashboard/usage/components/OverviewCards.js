"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

const STATS = [
  { key: "totalRequests", label: "Requests", icon: "bolt", tone: "text-text-main" },
  { key: "totalPromptTokens", label: "Input tokens", icon: "login", tone: "text-text-main" },
  { key: "totalCachedTokens", label: "Cached", icon: "cached", tone: "text-text-muted" },
  { key: "totalCompletionTokens", label: "Output tokens", icon: "logout", tone: "text-text-main" },
];

export default function OverviewCards({ stats }) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {STATS.map(({ key, label, icon, tone }) => (
        <Card key={key} padding="none" className="flex min-w-0 flex-col gap-2 p-4">
          <span className="truncate text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</span>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="material-symbols-outlined shrink-0 text-[16px] leading-none text-text-muted">{icon}</span>
            <span
              className={`truncate text-2xl font-semibold leading-none tabular-nums tracking-tight ${tone}`}
              title={fmt(stats[key])}
            >
              {fmt(stats[key])}
            </span>
          </div>
        </Card>
      ))}

      <Card padding="none" className="col-span-2 flex min-w-0 flex-col gap-2 p-4 md:col-span-1">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-text-muted">Est. cost</span>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="material-symbols-outlined shrink-0 text-[16px] leading-none text-text-muted">payments</span>
          <span
            className="truncate text-2xl font-semibold leading-none tabular-nums tracking-tight text-text-main"
            title={fmtCost(stats.totalCost)}
          >
            {fmtCost(stats.totalCost)}
          </span>
        </div>
        <span className="truncate text-[10px] leading-none text-text-subtle">Estimated, not billed</span>
      </Card>
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
