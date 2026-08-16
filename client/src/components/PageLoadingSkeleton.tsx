import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

type PageLoadingSkeletonProps = {
  variant?: "list" | "table" | "cards";
  rows?: number;
  className?: string;
};

export function PageLoadingSkeleton({
  variant = "list",
  rows = 5,
  className = "",
}: PageLoadingSkeletonProps) {
  return (
    <div
      className={`space-y-3 ${className}`}
      aria-busy="true"
      aria-live="polite"
      aria-label="A carregar dados"
    >
      <span className="sr-only">A carregar dados…</span>
      {variant === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: Math.min(rows, 6) }, (_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-card p-4 dark:border-slate-700">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="mt-3 h-8 w-3/5" />
              <Skeleton className="mt-4 h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : variant === "table" ? (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="hidden gap-4 md:grid md:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-4" />)}
          </div>
          <div className="space-y-3 md:mt-4">
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="min-w-0 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-card p-4 dark:border-slate-700">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="mt-3 h-4 w-4/5" />
              <Skeleton className="mt-2 h-3 w-3/5" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
