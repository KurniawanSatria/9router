"use client";

import { cnx } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

const variants = {
  primary: "bg-primary-500 text-primary-text hover:bg-primary-600",
  secondary: "border border-base-100 bg-background-100 text-text-primary hover:bg-background-soft-50",
  outline: "border border-base-100 text-text-primary hover:bg-background-soft-50",
  ghost: "text-text-secondary hover:bg-background-soft-50 hover:text-text-primary",
  danger: "bg-error-500 text-primary-text hover:bg-error-500/90",
  success: "bg-success-500 text-primary-text hover:bg-success-500/90",
};

const sizes = {
  xs: "h-6 px-2.5 text-[11px] rounded-lg gap-1.5",
  sm: "h-7 px-3 text-xs rounded-lg",
  md: "h-9 px-4 text-sm rounded-lg",
  lg: "h-11 px-6 text-sm rounded-lg",
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
      className={cnx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 ease-out cursor-pointer",
        "active:translate-y-px disabled:cursor-not-allowed disabled:bg-background-soft-200 disabled:text-text-tertiary",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Icon name="progress_activity" className={cnx(" animate-spin", size === "xs" ? "size-3.5" : "size-4.5")} />
      ) : icon ? (
        <Icon name={icon} className={cnx("", size === "xs" ? "size-3.5" : "size-4.5")} />
      ) : null}
      {children}
      {iconRight && !loading && (
        <Icon name={iconRight} className={cnx("", size === "xs" ? "size-3.5" : "size-4.5")} />
      )}
    </button>
  );
}
