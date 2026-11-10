"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/shared/tailgrids/core/card";
import Select from "@/shared/components/Select";

const fmtTokens = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n || 0);
};

const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;
const fmtRequests = (n) => String(n || 0);

const VIEW_MODES = [
  { value: "tokens", label: "Tokens" },
  { value: "requests", label: "Requests" },
  { value: "cost", label: "Cost" },
];

const VIEW_CONFIG = {
  tokens:   { dataKey: "tokens",   color: "var(--chart-tokens)",   formatter: fmtTokens,   label: "Tokens" },
  requests: { dataKey: "requests", color: "var(--chart-requests)", formatter: fmtRequests, label: "Requests" },
  cost:     { dataKey: "cost",     color: "var(--chart-cost)",     formatter: fmtCost,     label: "Cost" },
};

export default function UsageChart({ period = "7d" }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("tokens");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usage/chart?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch chart data:", e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    queueMicrotask(fetchData);
  }, [fetchData]);

  const chartData = useMemo(() => {
    if (period !== "7d") return data;
    return data.map((d, i) => ({
      ...d,
      dayLabel: new Date(Date.now() - (data.length - 1 - i) * 86400000).toLocaleDateString("en-US", { weekday: "short" }),
    }));
  }, [data, period]);

  const cfg = VIEW_CONFIG[viewMode];
  const hasData = chartData.some((d) => (d[cfg.dataKey] || 0) > 0);

  return (
    <Card className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold text-text-primary">
          {period === "7d" ? "Weekly AI Activity" : "Usage Activity"}
        </span>
        <Select
          size="sm"
          value={viewMode}
          onChange={setViewMode}
          options={VIEW_MODES}
          ariaLabel="Chart metric"
          buttonClassName="min-w-[110px]"
        />
      </div>

      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center text-sm text-text-secondary">Loading...</div>
      ) : !hasData ? (
        <div className="flex min-h-[180px] items-center justify-center text-sm text-text-secondary">No data for this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} vertical={false} />
            <XAxis
              dataKey={period === "7d" ? "dayLabel" : "label"}
              tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.5 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "currentColor", fillOpacity: 0.5 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={cfg.formatter}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "currentColor", fillOpacity: 0.04 }}
              contentStyle={{
                backgroundColor: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value) => [cfg.formatter(value), cfg.label]}
            />
            <Bar dataKey={cfg.dataKey} fill={cfg.color} fillOpacity={0.85} radius={[5, 5, 0, 0]} activeBar={false} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

UsageChart.propTypes = {
  period: PropTypes.string,
};
