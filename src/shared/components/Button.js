"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  primary: "bg-primary-solid hover:bg-primary-solid-hover text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(20,29,25,0.12)] disabled:bg-surface-3 disabled:text-text-muted",
  secondary: "bg-surface hover:bg-bg-alt text-text-main border border-border disabled:opacity-50",
  outline: "border border-border text-text-main hover:bg-surface hover:border-primary/50",
  ghost: "text-text-muted hover:bg-surface hover:text-text-main",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:bg-surface-3 disabled:text-text-muted",
  success: "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm disabled:bg-surface-3 disabled:text-text-muted",
};

const sizes = {
  xs: "h-6 px-2.5 text-[11px] rounded-[6px] gap-1.5",
  sm: "h-7 px-3 text-xs rounded-[7px]",
  md: "h-9 px-4 text-sm rounded-[8px]",
  lg: "h-11 px-6 text-sm rounded-[9px]",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 ease-out cursor-pointer",
        "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className={cn("material-symbols-outlined animate-spin", size === "xs" ? "text-[14px]" : "text-[18px]")}>progress_activity</span>
      ) : icon ? (
        <span className={cn("material-symbols-outlined", size === "xs" ? "text-[14px]" : "text-[18px]")}>{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className={cn("material-symbols-outlined", size === "xs" ? "text-[14px]" : "text-[18px]")}>{iconRight}</span>
      )}
    </button>
  );
}
