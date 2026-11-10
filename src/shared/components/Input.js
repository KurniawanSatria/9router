"use client";

import { cnx } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

export default function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  hint,
  icon,
  disabled = false,
  required = false,
  className,
  inputClassName,
  ...props
}) {
  return (
    <div className={cnx("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-text-primary">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-tertiary">
            <Icon name={icon} className="size-5" />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cnx(
            "h-10 w-full rounded-lg border border-input-border bg-card-background px-3 text-sm text-text-primary outline-none",
            "placeholder:text-input-placeholder-text",
            "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
            "transition-all duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed",
            "text-[16px] sm:text-sm",
            icon && "pl-10",
            error && "border-error-500 focus:border-error-500 focus:ring-error-500/20",
            inputClassName
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-error-500 flex items-center gap-1">
          <Icon name="error" className="size-3.5" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-text-tertiary">{hint}</p>
      )}
    </div>
  );
}
