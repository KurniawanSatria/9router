"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { cn } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

/**
 * Select — a real dropdown, not a native <select>.
 *
 * Native selects cannot be styled consistently across platforms (the popup is
 * drawn by the OS), so this renders a button plus a portal-positioned listbox.
 * Keyboard: Enter/Space/ArrowDown open, arrows move, Enter selects, Esc closes.
 */
export default function Select({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  label,
  hint,
  error,
  required = false,
  disabled = false,
  size = "md",
  align = "left",
  className,
  buttonClassName,
  ariaLabel,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rect, setRect] = useState(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const autoId = useId();
  const selectId = id || autoId;

  const sizes = {
    xs: "h-8 px-2 text-[11px] rounded-md gap-1",
    sm: "h-9 px-2.5 text-xs rounded-lg gap-1.5",
    md: "h-10 px-3 text-sm rounded-lg gap-2",
    lg: "h-11 px-4 text-sm rounded-lg gap-2",
  };

  const selected = options.find((o) => String(o.value) === String(value));
  const displayLabel = selected?.label ?? placeholder;

  const position = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const edge = 8;
    const maxListHeight = 288; // matches max-h-72
    // Space the list can use without spilling past the viewport, so it never
    // gets clipped (previously the popup always opened downward at its full
    // height and the bottom options were unreachable on short viewports).
    const spaceBelow = window.innerHeight - r.bottom - gap - edge;
    const spaceAbove = r.top - gap - edge;
    const placement = spaceBelow < maxListHeight && spaceAbove > spaceBelow ? "top" : "bottom";
    const available = placement === "top" ? spaceAbove : spaceBelow;
    setRect({
      top: r.bottom + gap,
      left: r.left,
      width: r.width,
      bottom: r.top,
      placement,
      maxHeight: Math.max(0, Math.min(maxListHeight, available)),
      gap,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    position();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => position();
    const onResize = () => position();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, position]);

  // Keep the keyboard-active option visible when the list is shorter than its content.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const listEl = listRef.current;
    const optionEl = listEl?.querySelectorAll('[role="option"]')?.[activeIndex];
    if (!listEl || !optionEl) return;
    const optTop = optionEl.offsetTop;
    const optBottom = optTop + optionEl.offsetHeight;
    if (optTop < listEl.scrollTop) listEl.scrollTop = optTop;
    else if (optBottom > listEl.scrollTop + listEl.clientHeight) {
      listEl.scrollTop = optBottom - listEl.clientHeight;
    }
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const commit = (opt) => {
    if (opt.disabled) return;
    onChange?.(opt.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const openList = () => {
    const i = options.findIndex((o) => String(o.value) === String(value));
    setActiveIndex(i >= 0 ? i : 0);
    setOpen(true);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) commit(opt);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const list = open && rect && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={listRef}
          id={`${selectId}-listbox`}
          role="listbox"
          aria-labelledby={selectId}
          className="fixed z-[100] max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-card-border bg-card-background p-1 shadow-lg animate-pop-in custom-scrollbar"
          style={{
            ...(rect.placement === "top"
              ? { bottom: Math.max(8, window.innerHeight - rect.bottom + rect.gap) }
              : { top: rect.top }),
            left: align === "right" ? undefined : rect.left,
            right: align === "right" ? Math.max(8, window.innerWidth - rect.left - rect.width) : undefined,
            minWidth: rect.width,
            maxWidth: 320,
            maxHeight: rect.maxHeight,
          }}
        >
          {options.map((opt, i) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(opt)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  isSelected
                    ? "bg-background-gray-primary font-medium text-text-primary"
                    : "text-text-secondary hover:bg-background-gray-primary hover:text-text-primary",
                  i === activeIndex && !isSelected && "bg-background-gray-primary/70"
                )}
              >
                {opt.icon && (
                  <Icon name={opt.icon} className="size-4" />
                )}
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {isSelected && (
                  <Icon name="check" className="size-[15px] text-primary" />
                )}
              </button>
            );
          })}
          {options.length === 0 && (
            <div className="px-2.5 py-2 text-xs text-text-tertiary">No options</div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-text-secondary">
          {label}
          {required && <span className="ml-1 text-error-500">*</span>}
        </label>
      )}

      <button
        ref={buttonRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${selectId}-listbox` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "inline-flex min-w-0 items-center justify-between border bg-card-background text-left transition-colors",
          "hover:border-brand-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-brand-500/50 ring-2 ring-brand-500/20",
          error ? "border-error-500/50" : "border-input-border",
          sizes[size],
          buttonClassName
        )}
      >
        <span className={cn("min-w-0 truncate", selected ? "text-text-primary" : "text-text-tertiary")}>
          {displayLabel}
        </span>
        <Icon name="expand_more" className={cn(
 " shrink-0 size-4 text-text-tertiary transition-transform duration-150",
 open && "rotate-180"
 )} />
      </button>

      {error && (
        <p className="flex items-center gap-1 text-xs text-error-500">
          <Icon name="error" className="size-[13px]" />
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}

      {list}
    </div>
  );
}

Select.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.string,
      disabled: PropTypes.bool,
    })
  ),
  placeholder: PropTypes.string,
  label: PropTypes.string,
  hint: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(["xs", "sm", "md", "lg"]),
  align: PropTypes.oneOf(["left", "right"]),
  className: PropTypes.string,
  buttonClassName: PropTypes.string,
  ariaLabel: PropTypes.string,
  id: PropTypes.string,
};
