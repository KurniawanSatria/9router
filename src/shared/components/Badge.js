"use client";

import { cnx } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

const variants = {
  default: "bg-background-soft-100 text-text-secondary",
  neutral: "bg-background-soft-100 text-text-secondary",
  primary: "bg-primary-500/10 text-primary-500",
  success: "bg-success-500/10 text-success-500",
  warning: "bg-warning-500/10 text-warning-500",
  error: "bg-error-500/10 text-error-500",
  info: "bg-info-500/10 text-info-500",
};

const sizes = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  className,
}) {
  return (
    <span
      className={cnx(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cnx(
            "size-1.5 rounded-full",
            variant === "success" && "bg-success-500",
            variant === "warning" && "bg-warning-500",
            variant === "error" && "bg-error-500",
            variant === "info" && "bg-info-500",
            variant === "primary" && "bg-primary-500",
            variant === "default" && "bg-text-tertiary"
          )}
        />
      )}
      {icon && <Icon name={icon} className="size-3.5" />}
      {children}
    </span>
  );
}
