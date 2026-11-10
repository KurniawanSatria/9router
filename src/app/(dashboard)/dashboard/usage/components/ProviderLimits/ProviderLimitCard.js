"use client";

import { useState } from "react";
import Card from "@/shared/components/Card";
import ProviderIcon from "@/shared/components/ProviderIcon";
import Badge from "@/shared/components/Badge";
import QuotaProgressBar from "./QuotaProgressBar";
import { calculatePercentage } from "./utils";
import Icon from "@/shared/components/Icon";

const planVariants = {
  free: "default",
  pro: "primary",
  ultra: "success",
  enterprise: "info",
};

export default function ProviderLimitCard({
  provider,
  name,
  plan,
  quotas = [],
  message = null,
  loading = false,
  error = null,
  onRefresh,
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Get provider info from config
  const getProviderColor = () => {
    const colors = {
      github: "#000000",
      antigravity: "#4285F4",
      codex: "#10A37F",
      kiro: "#FF9900",
      qoder: "#EC4899",
      "qoder-cn": "#EC4899",
      claude: "#D97757",
    };
    return colors[provider?.toLowerCase()] || "#6B7280";
  };

  const providerColor = getProviderColor();
  const planVariant = planVariants[plan?.toLowerCase()] || "default";

  return (
    <Card padding="none" className="flex flex-col gap-4 rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Provider Logo */}
          <div
            className="size-10 rounded-lg flex items-center justify-center p-1.5"
            style={{ backgroundColor: `${providerColor}15` }}
          >
            <ProviderIcon
              src={`/providers/${provider}.png`}
              alt={provider || "Provider"}
              size={40}
              className="object-contain rounded-lg"
              fallbackText={provider?.slice(0, 2).toUpperCase() || "PR"}
              fallbackColor={providerColor}
            />
          </div>

          <div>
            <h3 className="text-base font-semibold text-text-primary">
              {name || provider}
            </h3>
            {plan && (
              <Badge
                variant={planVariants[plan?.toLowerCase()] || "default"}
                size="xs"
              >
                {plan}
              </Badge>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="p-2 rounded-lg hover:bg-background-gray-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh quota"
        >
          <Icon name="refresh" className={` size-5 text-text-secondary ${
              refreshing || loading ? "animate-spin" : ""
            }`} />
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-background-gray-primary rounded animate-pulse" />
            <div className="h-2 bg-background-gray-primary rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-background-gray-primary rounded animate-pulse" />
            <div className="h-2 bg-background-gray-primary rounded animate-pulse" />
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-4 rounded-lg bg-error-500/10 border border-error-500/20">
          <div className="flex items-start gap-2">
            <Icon name="error" className="text-error-500 size-5" />
            <p className="text-sm text-error-500">{error}</p>
          </div>
        </div>
      )}

      {/* Info Message (for providers without API) */}
      {!loading && !error && message && (
        <div className="p-4 rounded-lg bg-info-500/10 border border-info-500/20">
          <div className="flex items-start gap-2">
            <Icon name="info" className="text-info-500 size-5" />
            <p className="text-sm text-info-500">
              {message}
            </p>
          </div>
        </div>
      )}

      {/* Quota Progress Bars */}
      {!loading && !error && !message && quotas?.length > 0 && (
        <div className="space-y-4">
          {quotas.map((quota, index) => {
            // For Antigravity, use remainingPercentage if available, otherwise calculate
            const percentage =
              quota.remainingPercentage !== undefined
                ? Math.round(((quota.total - quota.used) / quota.total) * 100)
                : calculatePercentage(quota.used, quota.total);
            const unlimited = quota.total === 0 || quota.total === null;

            return (
              <QuotaProgressBar
                key={`${quota.name}-${index}`}
                label={quota.name}
                used={quota.used}
                total={quota.total}
                percentage={percentage}
                unlimited={unlimited}
                resetTime={quota.resetAt}
                recurring={quota.recurring !== false}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !message && quotas?.length === 0 && (
        <div className="text-center py-8 text-text-tertiary">
          <Icon name="data_usage" className="size-12 opacity-20 mx-auto" />
          <p className="text-sm mt-2">No quota data available</p>
        </div>
      )}
    </Card>
  );
}
