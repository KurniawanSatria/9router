"use client";

import { cn } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

// Spinner loading
export function Spinner({ size = "md", className }) {
  const sizes = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
    xl: "size-12",
  };

  return (
    <Icon name="progress_activity" className={cn(
 " animate-spin text-brand-500",
 sizes[size],
 className
 )} />
  );
}

// Full page loading
export function PageLoading({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <Spinner size="xl" />
      <p className="mt-4 text-text-secondary">{message}</p>
    </div>
  );
}

// Skeleton loading
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-background-soft-50",
        className
      )}
      {...props}
    />
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="p-5 rounded-xl border-[0.5px] border-card-border bg-card-background">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-10 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export default function Loading({ type = "spinner", ...props }) {
  switch (type) {
    case "page":
      return <PageLoading {...props} />;
    case "skeleton":
      return <Skeleton {...props} />;
    case "card":
      return <CardSkeleton {...props} />;
    default:
      return <Spinner {...props} />;
  }
}
