"use client";

import { useMemo } from "react";
import PropTypes from "prop-types";
import { Card } from "@/shared/tailgrids/core/card";
import { prettyModel } from "@/shared/utils/modelName";
import ModelIcon from "@/shared/components/ModelIcon";

const fmtRequests = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
};

const fmtCost = (n) =>
  `$${new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n || 0)}`;

export default function TopUsage({ byModel }) {
  const rows = useMemo(() => {
    if (!byModel) return [];
    return Object.values(byModel)
      .filter((d) => (d.requests || 0) > 0)
      .sort((a, b) => (b.requests || 0) - (a.requests || 0))
      .slice(0, 5);
  }, [byModel]);

  return (
    <Card className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold text-text-primary">Top Usage</span>
      </div>

      {!rows.length ? (
        <div className="flex min-h-[160px] items-center justify-center text-sm text-text-secondary">No model usage yet</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[minmax(0,1fr)_76px_88px] items-center gap-2 px-1 text-xs font-medium text-text-tertiary">
            <span>Model</span>
            <span className="text-right">Request</span>
            <span className="text-right">Cost</span>
          </div>
          {rows.map((row, i) => (
            <div key={`${row.rawModel}-${row.provider}-${i}`} className="grid grid-cols-[minmax(0,1fr)_76px_88px] items-center gap-2">
              <div
                className={`flex w-fit max-w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 ${i === 0 ? "bg-white/10" : "bg-white/5"}`}
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <ModelIcon modelId={row.rawModel} size={12} />
                </span>
                <span className="min-w-0 truncate text-xs font-medium text-text-primary" title={row.rawModel}>
                  {prettyModel(row.rawModel)}
                </span>
              </div>
              <span className="text-right text-xs font-medium tabular-nums text-text-primary">{fmtRequests(row.requests)}</span>
              <span className="text-right text-xs font-medium tabular-nums text-text-primary">{fmtCost(row.cost)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

TopUsage.propTypes = {
  byModel: PropTypes.object,
};
