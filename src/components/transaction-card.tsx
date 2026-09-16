"use client";

import {
  Banknote,
  Smartphone,
  Landmark,
  Wallet,
  CheckCircle2,
  Clock,
  Ban,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/format";
import type { PaymentMethod, TransactionStatus } from "@prisma/client";

export const methodMeta: Record<
  PaymentMethod,
  { label: string; icon: React.ElementType }
> = {
  CASH: { label: "Cash", icon: Banknote },
  GCASH: { label: "GCash", icon: Smartphone },
  BANK_TRANSFER: { label: "Bank Transfer", icon: Landmark },
  OTHER: { label: "Other", icon: Wallet },
};

export function statusLabel(status: TransactionStatus): string {
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "PENDING") return "Pending";
  return "Voided";
}

export const statusIcons: Record<TransactionStatus, React.ElementType> = {
  CONFIRMED: CheckCircle2,
  PENDING: Clock,
  VOIDED: Ban,
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const tone =
    status === "CONFIRMED" ? "success" : status === "PENDING" ? "pending" : "danger";
  const Icon = statusIcons[status];
  return (
    <Badge tone={tone} dot>
      <Icon className="h-3 w-3" />
      {statusLabel(status)}
    </Badge>
  );
}

export function PaymentChip({ method }: { method: PaymentMethod }) {
  const meta = methodMeta[method];
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

export function TransactionCard({
  amount,
  date,
  period,
  method,
  status,
  note,
}: {
  amount: number;
  date: string;
  period: string;
  method: PaymentMethod;
  status: TransactionStatus;
  note?: string | null;
}) {
  const Icon = statusIcons[status];
  const tone =
    status === "CONFIRMED"
      ? "text-brand-600"
      : status === "PENDING"
        ? "text-amber-500"
        : "text-rose-500";
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line/70 bg-white p-4 shadow-soft transition-all hover:shadow-lift">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50">
        <Icon className={`h-5 w-5 ${tone}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-lg font-extrabold tracking-tight text-ink">
            {money(amount)}
          </p>
          <StatusBadge status={status} />
        </div>
        <p className="text-[13px] font-semibold text-ink-soft">{period}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-soft/70">
          <span>
            {new Date(date).toLocaleDateString("en-PH", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-line">•</span>
          <PaymentChip method={method} />
        </div>
        {note && (
          <p className="mt-1 truncate text-xs italic text-ink-soft/60">{note}</p>
        )}
      </div>
    </div>
  );
}