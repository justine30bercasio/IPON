import * as React from "react";

export function Card({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-line/70 bg-white shadow-soft ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = "",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 px-5 pb-1 pt-5 sm:px-6 sm:pt-6 ${className}`}
    >
      <div className="min-w-0">
        {title && (
          <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
        )}
        {subtitle && <p className="mt-0.5 text-sm text-ink-soft/80">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 pb-5 pt-4 sm:px-6 sm:pb-6 ${className}`} {...props}>
      {children}
    </div>
  );
}