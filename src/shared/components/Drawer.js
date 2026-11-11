"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = "md",
  className
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const widths = {
    sm: "w-[400px]",
    md: "w-[500px]",
    lg: "w-[600px]",
    xl: "w-[800px]",
    full: "w-full",
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const target = panel?.querySelector("button") || panel;
    target?.focus();
    return () => previouslyFocused?.focus?.();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm fade-in cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
        "absolute right-0 top-0 h-full bg-card-background flex flex-col",
        "shadow-[var(--shadow-elev)]",
        "slide-in-right",
        "rounded-l-xl border-l-[0.5px] border-card-border",
        widths[width] || widths.md,
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-card-border shrink-0">
          <div className="flex items-center gap-3">
            {title && (
              <h2 id={titleId} className="text-base font-semibold text-text-primary">{title}</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background-gray-primary hover:text-text-primary"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
