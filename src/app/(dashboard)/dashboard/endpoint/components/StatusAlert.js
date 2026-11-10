"use client";

import { cnx } from "@/shared/utils/cn";

const STATUS_TONES = {
  success: "bg-success-500/10 text-success-500",
  warning: "bg-warning-500/10 text-warning-500",
  info: "bg-info-500/10 text-info-500",
};

/** Reusable status alert */
export default function StatusAlert({ status, className = "" }) {
  const renderMessage = (msg) => {
    const parts = msg.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) =>
      /^https?:\/\//.test(part)
        ? <a key={i} href={part} target="_blank" rel="noreferrer" className="underline font-medium">{part}</a>
        : part
    );
  };

  return (
    <div className={cnx(
      "rounded-lg px-3 py-2 text-sm",
      STATUS_TONES[status.type] || "bg-error-500/10 text-error-500",
      className
    )}>
      {renderMessage(status.message)}
    </div>
  );
}
