import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, PaymentChip, WithdrawalChip } from "@/components/transaction-card";
import { money, formatDate } from "@/lib/format";
import type { PaymentMethod, TransactionStatus } from "@prisma/client";

export interface SimpleTx {
  id: string;
  amount: number;
  transactionDate: string;
  collectionPeriod: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  memberName?: string | null;
}

export function SimpleTxTable({
  items,
  showMember = false,
  emptyTitle = "No hulog yet",
  emptyDescription = "Transactions will appear here.",
}: {
  items: SimpleTx[];
  showMember?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (items.length === 0) {
    return (
      <EmptyState emoji="🪙" title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line/70 bg-mist/60 text-[11px] uppercase tracking-wider text-ink-soft/70">
              {showMember && <th className="px-4 py-3 font-bold">Member</th>}
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Period</th>
              <th className="px-4 py-3 text-right font-bold">Amount</th>
              <th className="px-4 py-3 font-bold">Payment Method</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr
                key={i.id}
                className="border-b border-line/40 transition-colors last:border-0 hover:bg-brand-50/30"
              >
                {showMember && (
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={i.memberName ?? "?"} size="sm" />
                      <span className="font-semibold text-ink">{i.memberName}</span>
                    </div>
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3.5 font-medium text-ink-soft">
                  {formatDate(i.transactionDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-ink">
                  {i.collectionPeriod}
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-3.5 text-right text-base font-extrabold tracking-tight ${
                    i.amount < 0 ? "text-rose-600" : "text-ink"
                  }`}
                >
                  {i.amount < 0 ? `−${money(-i.amount)}` : money(i.amount)}
                </td>
                <td className="px-4 py-3.5">
                  <PaymentChip method={i.paymentMethod} />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {i.amount < 0 && <WithdrawalChip />}
                    <StatusBadge status={i.status} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2.5 md:hidden">
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center gap-3 rounded-2xl border border-line/70 bg-white p-3.5 shadow-soft"
          >
            {showMember && (
              <Avatar name={i.memberName ?? "?"} size="sm" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={`text-base font-extrabold tracking-tight ${
                    i.amount < 0 ? "text-rose-600" : "text-ink"
                  }`}
                >
                  {i.amount < 0 ? `−${money(-i.amount)}` : money(i.amount)}
                </p>
                <div className="flex items-center gap-1.5">
                  {i.amount < 0 && <WithdrawalChip />}
                  <StatusBadge status={i.status} />
                </div>
              </div>
              <p className="truncate text-[13px] font-semibold text-ink-soft">
                {showMember && i.memberName ? `${i.memberName} · ` : ""}
                {i.collectionPeriod}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-soft/70">
                <span>{formatDate(i.transactionDate)}</span>
                <span className="text-line">•</span>
                <PaymentChip method={i.paymentMethod} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}