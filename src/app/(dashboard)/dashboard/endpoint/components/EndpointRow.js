"use client";

import { Input } from "@/shared/components";
import { cnx } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

/** Reusable endpoint row component */
export default function EndpointRow({ label, url, copyId, copied, onCopy, badge, actions }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cnx(
        "shrink-0 min-w-[88px] rounded-full px-2 py-0.5 text-center font-mono text-[11px] font-medium",
        badge === "CF" || badge === "TS" ? "bg-primary-500/10 text-primary-500" : "bg-background-gray-primary text-text-tertiary"
      )}>{label}</span>
      <Input value={url} readOnly className="flex-1 font-mono text-sm" />
      <button
        onClick={() => onCopy(url, copyId)}
        className="shrink-0 rounded-lg p-2 text-text-tertiary transition-colors hover:bg-background-gray-primary hover:text-primary-500"
      >
        <Icon name={copied === copyId ? "check" : "content_copy"} className="size-4.5" />
      </button>
      {actions}
    </div>
  );
}
