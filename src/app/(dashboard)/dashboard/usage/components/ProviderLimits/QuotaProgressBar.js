"use client";

import { cn } from "@/shared/utils/cn";
import { formatResetTime } from "./utils";

// Calculate color based on remaining percentage
const getColorClasses = (remainingPercentage) => {
  if (remainingPercentage > 70) {
    return {
      text: "text-success-500",
      bg: "bg-success-500"
    };
  }

  if (remainingPercentage >= 30) {
    return {
      text: "text-warning-500",
      bg: "bg-warning-500"
    };
  }

  // 0-29% including 0% (out of quota) - show red
  return {
    text: "text-error-500",
    bg: "bg-error-500"
  };
};

// Format reset time display
const formatResetTimeDisplay = (resetTime) => {
  if (!resetTime) return null;
  
  try {
    const resetDate = new Date(resetTime);
    const now = new Date();
    const isToday = resetDate.toDateString() === now.toDateString();
    const isTomorrow = resetDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    
    const timeStr = resetDate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    
    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    
    return resetDate.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
};

export default function QuotaProgressBar({
  percentage = 0,
  label = "",
  used = 0,
  total = 0,
  unlimited = false,
  resetTime = null,
  recurring = true,
}) {
  const colors = getColorClasses(percentage);
  const countdown = formatResetTime(resetTime);
  const resetDisplay = formatResetTimeDisplay(resetTime);

  // recurring defaults true. One-shot packs (e.g. CodeBuddy CN bonus packs)
  // set recurring:false: resetTime is a hard expiry, so word it as "expires".
  const resetWord = recurring ? "Reset" : "Expires";

  // percentage is already remaining percentage (from ProviderLimitCard)
  const remaining = percentage;
  
  return (
    <div className="space-y-2">
      {/* Label and percentage */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-text-primary">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            {remaining > 70 && (
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${colors.bg}`} />
            )}
            <span className={`relative inline-flex size-1.5 rounded-full ${colors.bg}`} />
          </span>
          <span className={cn("font-medium", colors.text)}>
            {remaining}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {!unlimited && (
        <div className="h-2 rounded-full overflow-hidden bg-primary-500/10">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300"
            style={{ width: `${Math.min(remaining, 100)}%` }}
          />
        </div>
      )}

      {/* Usage details and countdown */}
      <div className="flex items-center justify-between text-xs text-text-tertiary">
        <span>
          {used.toLocaleString()} / {total.toLocaleString()} requests
        </span>
        {countdown !== "-" && (
          <div className="flex items-center gap-1">
            <span>•</span>
            <span className="font-medium">{resetWord} in {countdown}</span>
          </div>
        )}
      </div>

      {/* Reset time display */}
      {resetDisplay && (
        <div className="text-xs text-text-tertiary">
          {resetWord} at {resetDisplay}
        </div>
      )}
    </div>
  );
}
