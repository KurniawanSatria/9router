
"use client";

import Icon from "@/shared/components/Icon";

/** Inline tooltip, Claude Code CLI style */
export default function Tooltip({ text }) {
  return (
    <span className="relative group inline-flex items-center">
      <Icon name="help" className="size-3.5 text-text-tertiary cursor-help" />
      <span className="pointer-events-none absolute left-5 top-1/2 z-50 w-64 -translate-y-1/2 rounded-lg border border-card-border bg-card-background px-2.5 py-1.5 text-xs text-text-primary opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
