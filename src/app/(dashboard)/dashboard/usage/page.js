"use client";

import { Suspense, useState } from "react";
import { CardSkeleton } from "@/shared/components";
import Select from "@/shared/components/Select";
import UsageStats from "@/shared/components/UsageStats";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
  { value: "all", label: "All" },
];

export default function UsagePage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <UsageContent />
    </Suspense>
  );
}

function UsageContent() {
  const [period, setPeriod] = useState("today");

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Select
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          size="sm"
          ariaLabel="Usage period"
          className="w-full sm:w-auto"
          buttonClassName="min-w-[120px]"
        />
      </div>

      <Suspense fallback={<CardSkeleton />}>
        <UsageStats period={period} setPeriod={setPeriod} hidePeriodSelector />
      </Suspense>
    </div>
  );
}
