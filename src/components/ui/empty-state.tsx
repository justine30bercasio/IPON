import * as React from "react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  emoji,
  title,
  description,
  action,
  actionLabel,
  className = "",
}: {
  emoji: string;
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-14 text-center ${className}`}
    >
      <div className="animate-pop text-5xl">{emoji}</div>
      <div>
        <h3 className="text-base font-bold text-ink">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft/80">
            {description}
          </p>
        )}
      </div>
      {action && actionLabel && (
        <Button onClick={action} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20">
      <div className="relative">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200" />
        <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-t-4 border-brand-600" />
      </div>
      <p className="text-sm font-medium text-ink-soft/70">{label}</p>
    </div>
  );
}