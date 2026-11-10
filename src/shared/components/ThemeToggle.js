"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/shared/hooks/useTheme";
import { ACCENT_SWATCHES, THEME_CONFIG } from "@/shared/constants/config";
import { cn } from "@/shared/utils/cn";

export default function ThemeToggle({ className, variant = "default" }) {
  const { accent, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const variants = {
    default: cn(
      "relative flex items-center justify-center size-10 rounded-full",
      "text-text-muted hover:text-text-main",
      "hover:bg-surface-2 transition-colors"
    ),
    card: cn(
      "relative flex items-center justify-center size-11 rounded-full",
      "bg-surface/60 hover:bg-surface",
      "border border-border",
      "backdrop-blur-md shadow-sm hover:shadow-[var(--shadow-warm)]",
      "text-text-muted hover:text-brand-500",
      "transition-all group"
    ),
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={variants[variant]}
        aria-label="Change accent color"
        aria-expanded={open}
        title="Accent color"
      >
        <span
          className={cn(
            "material-symbols-outlined text-[22px]",
            variant === "card" && "transition-transform duration-300 group-hover:rotate-12"
          )}
        >
          palette
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 right-1.5 size-2 rounded-full ring-2 ring-bg transition-colors duration-200"
          style={{ background: ACCENT_SWATCHES[accent] }}
        />
      </button>

      {open && (
        <div className="slide-in-top absolute right-0 top-full z-50 mt-2 w-44 origin-top-right rounded-xl border border-border bg-surface p-2 shadow-2xl">
          <p className="px-1.5 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Accent
          </p>
          <div className="grid grid-cols-2 gap-1">
            {THEME_CONFIG.accents.map((name) => (
              <button
                key={name}
                onClick={() => {
                  setAccent(name);
                  setOpen(false);
                }}
                aria-pressed={accent === name}
                className={cn(
                  "pressable flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs capitalize transition-colors",
                  accent === name
                    ? "bg-surface-2 text-text-main"
                    : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                )}
              >
                <span
                  className={cn(
                    "size-3.5 shrink-0 rounded-full ring-1 ring-black/20 transition-transform duration-200",
                    accent === name && "scale-110"
                  )}
                  style={{ background: ACCENT_SWATCHES[name] }}
                />
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
