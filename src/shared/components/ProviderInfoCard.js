"use client";

import { Card } from "@/shared/tailgrids/core/card";
import Icon from "@/shared/components/Icon";

// Only show fields user actually cares about
const FIELD_SCHEMA = {
  mode:             { label: "Mode",       format: (v) => v },
  defaultModel:     { label: "Model",      format: (v) => v, mono: true },
  baseUrl:          { label: "Endpoint",   format: (v) => v, isLink: true, mono: true },
  costPerQuery:     { label: "Cost / call", format: (v) => v === 0 ? "Free" : `$${v.toFixed(4)}` },
  pricingUrl:       { label: "Pricing",    format: () => "View pricing", isLink: true },
  freeTier:         { label: "Free tier",  format: (v) => v },
  freeMonthlyQuota: { label: "Free quota", format: (v) => v === 0 ? "—" : v >= 999999 ? "Unlimited" : `${v.toLocaleString()} / mo` },
  searchTypes:      { label: "Types",      format: (v) => v.join(", ") },
  formats:          { label: "Formats",    format: (v) => v.join(", ") },
  maxMaxResults:    { label: "Max results", format: (v) => v },
  maxCharacters:    { label: "Max chars",  format: (v) => v.toLocaleString() },
};

export default function ProviderInfoCard({ config, provider, title = "Provider Info" }) {
  if (!config) return null;

  const rows = Object.entries(FIELD_SCHEMA)
    .filter(([key]) => config[key] !== undefined && config[key] !== null && config[key] !== "")
    .map(([key, schema]) => ({
      key,
      label: schema.label,
      value: schema.format(config[key]),
      isLink: schema.isLink,
      mono: schema.mono,
      raw: config[key],
    }));

  const signupUrl = provider?.notice?.apiKeyUrl || provider?.website;
  const noticeText = provider?.notice?.text;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {signupUrl && (
          <a
            href={signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600"
          >
            <Icon name="open_in_new" className="size-3.5" />
            Get API Key
          </a>
        )}
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.key} className="flex min-w-0 items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-text-tertiary">{r.label}</span>
            {r.isLink ? (
              <a
                href={r.raw}
                target="_blank"
                rel="noopener noreferrer"
                className={`truncate text-sm text-primary-500 hover:underline ${r.mono ? "font-mono" : ""}`}
              >
                {r.value}
              </a>
            ) : (
              <span className={`truncate text-sm text-text-primary ${r.mono ? "font-mono" : ""}`}>
                {r.value}
              </span>
            )}
          </div>
        ))}
        {noticeText && (
          <div className="flex min-w-0 items-start gap-3 sm:col-span-2">
            <span className="mt-0.5 w-28 shrink-0 text-xs text-text-tertiary">Notice</span>
            <span className="text-sm leading-relaxed text-text-secondary">{noticeText}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
