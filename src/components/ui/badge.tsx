import * as React from "react";

const badgeVariants = {
  success: "bg-brand-50 text-brand-700 border-brand-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  primary: "bg-brand-600 text-white border-transparent",
  info: "bg-sky-50 text-sky-700 border-sky-200",
} as const;

export type BadgeTone = keyof typeof badgeVariants;

export const statusTone: Record<string, BadgeTone> = {
  CONFIRMED: "success",
  PAID: "success",
  ACTIVE: "success",
  PENDING: "pending",
  VOIDED: "danger",
  INACTIVE: "neutral",
  PAUSED: "pending",
  COMPLETED: "primary",
  ARCHIVED: "neutral",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
  dot,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeVariants[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}