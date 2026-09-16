import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon = Wallet,
  delta,
  deltaDirection = "up",
  hint,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  icon?: React.ElementType;
  delta?: string;
  deltaDirection?: "up" | "down";
  hint?: string;
  tone?: "plain" | "brand" | "amber";
}) {

  return (
    <Card className="group relative overflow-hidden p-5 transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[11px] font-bold uppercase tracking-wider ${
              tone === "brand" ? "text-white/70" : "text-ink-soft/60"
            }`}
          >
            {label}
          </p>
          <p
            className={`mt-1.5 truncate text-2xl font-extrabold tracking-tight ${
              tone === "brand" ? "text-white" : "text-ink"
            }`}
          >
            {value}
          </p>
          {(delta || hint) && (
            <div className="mt-2 flex items-center gap-1.5">
              {delta &&
                (deltaDirection === "up" ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                ))}
              {delta && (
                <span
                  className={`text-xs font-semibold ${
                    tone === "brand" ? "text-white/70" : "text-ink-soft/70"
                  }`}
                >
                  {delta}
                </span>
              )}
              {hint && (
                <span
                  className={`text-xs ${
                    tone === "brand" ? "text-white/60" : "text-ink-soft/50"
                  }`}
                >
                  {hint}
                </span>
              )}
            </div>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            tone === "brand" ? "bg-white/15" : tone === "amber" ? "bg-amber-500/20" : "bg-brand-50"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}