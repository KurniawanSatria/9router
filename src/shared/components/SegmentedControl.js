"use client";

import { cn } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  className,
}) {
  const sizes = {
    sm: "h-8 text-xs",
    md: "h-10 text-sm",
    lg: "h-11 text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center p-0.5 rounded-lg overflow-x-auto",
        "bg-background-gray-primary border border-card-border",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 px-4 rounded-lg font-medium transition-all",
            sizes[size],
            value === option.value
              ? "bg-card-background text-text-primary shadow-xs"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {option.icon && (
            <Icon name={option.icon} className="size-4 mr-1.5" />
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
