"use client";

import * as React from "react";
import {
  Search,
  MoreHorizontal,
  CheckCheck,
  Ban,
  Pencil,
  FilterX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { humanize } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { TablePagination } from "@/components/ui/table-pagination";
import { StatusBadge, PaymentChip, statusLabel, WithdrawalChip } from "@/components/transaction-card";
import { money, formatDate } from "@/lib/format";
import { fromCents } from "@/lib/money";
import {
  confirmTransactionAction,
  voidTransactionAction,
  editTransactionAction,
  type ActionResult,
} from "@/lib/actions";
import type { PaymentMethod, TransactionStatus } from "@prisma/client";

export interface TxView {
  id: string;
  amount: number;
  transactionDate: string;
  collectionPeriod: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  note: string | null;
  memberName?: string;
  memberUserId?: string;
}

export function TransactionsTable({
  items,
  admin,
  showMember = false,
}: {
  items: TxView[];
  admin: boolean;
  showMember?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [month, setMonth] = React.useState("");
  const [method, setMethod] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [target, setTarget] = React.useState<TxView | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const [voiding, setVoiding] = React.useState(false);
  const [editing, setEditing] = React.useState<TxView | null>(null);
  const [busy, setBusy] = React.useState(false);

  const months = React.useMemo(() => {
    const set = new Set(items.map((i) => i.collectionPeriod));
    return Array.from(set).sort((a, b) => (a > b ? -1 : 1));
  }, [items]);

  const filtered = React.useMemo(() => {
    return items.filter((i) => {
      if (q) {
        const needle = q.toLowerCase();
        const hay =
          `${money(i.amount)} ${i.collectionPeriod} ${i.memberName ?? ""} ${i.note ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (month && i.collectionPeriod !== month) return false;
      if (method && i.paymentMethod !== method) return false;
      if (status && i.status !== status) return false;
      return true;
    });
  }, [items, q, month, method, status]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const clearFilters =
    q || month || method || status;

  const run = async (fn: () => Promise<ActionResult>, message: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast("success", message);
      router.refresh();
    } else {
      toast("error", "Something went wrong", res.error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
          <input
            value={q}
            onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
            placeholder="Search by amount, period, member…"
            className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink shadow-soft outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink shadow-soft outline-none focus:border-brand-400"
          >
            <option value="">All periods</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink shadow-soft outline-none focus:border-brand-400"
          >
            <option value="">All methods</option>
            {(["CASH", "GCASH", "BANK_TRANSFER", "OTHER"] as const).map((m) => (
              <option key={m} value={m}>
                {humanize(m)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm font-medium text-ink shadow-soft outline-none focus:border-brand-400"
          >
            <option value="">All statuses</option>
            {(["CONFIRMED", "PENDING", "VOIDED"] as const).map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
          {clearFilters && (
            <button
              onClick={() => {
                setQ("");
                setMonth("");
                setMethod("");
                setStatus("");
                setPage(1);
              }}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist"
            >
              <FilterX className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          emoji="🪙"
          title="No hulog yet"
          description="Your first contribution will appear here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="No matches"
          description="Try adjusting your search or filters."
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-line/70 bg-white shadow-soft md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line/70 bg-mist/60 text-[11px] uppercase tracking-wider text-ink-soft/70">
                  {showMember && <th className="px-5 py-3 font-bold">Member</th>}
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold">Period</th>
                  <th className="px-5 py-3 text-right font-bold">Amount</th>
                  <th className="px-5 py-3 font-bold">Payment Method</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  {admin && <th className="px-5 py-3 text-right font-bold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paged.map((i) => (
                  <tr key={i.id} className="border-b border-line/40 transition-colors last:border-0 hover:bg-brand-50/30">
                    {showMember && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={i.memberName ?? "?"} size="sm" />
                          <span className="font-semibold text-ink">{i.memberName}</span>
                        </div>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-ink-soft">
                      {formatDate(i.transactionDate)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink">
                      {i.collectionPeriod}
                    </td>
                    <td
                      className={`whitespace-nowrap px-5 py-3.5 text-right text-base font-extrabold tracking-tight ${
                        i.amount < 0 ? "text-rose-600" : "text-ink"
                      }`}
                    >
                      {i.amount < 0 ? `−${money(-i.amount)}` : money(i.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <PaymentChip method={i.paymentMethod} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {i.amount < 0 && <WithdrawalChip />}
                        <StatusBadge status={i.status} />
                      </div>
                    </td>
                    {admin && (
                      <td className="px-5 py-3.5 text-right">
                        <RowActions
                          tx={i}
                          onConfirm={() => {
                            setTarget(i);
                            setConfirm(true);
                          }}
                          onVoid={() => {
                            setTarget(i);
                            setVoiding(true);
                          }}
                          onEdit={() => setEditing(i)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {paged.map((i) => (
              <MobileRow
                key={i.id}
                tx={i}
                showMember={showMember}
                admin={admin}
                onConfirm={() => {
                  setTarget(i);
                  setConfirm(true);
                }}
                onVoid={() => {
                  setTarget(i);
                  setVoiding(true);
                }}
                onEdit={() => setEditing(i)}
              />
            ))}
          </div>

          <TablePagination
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={confirm && !!target}
        onClose={() => {
          setConfirm(false);
          setTarget(null);
        }}
        onConfirm={() => {
          if (!target) return;
          setConfirm(false);
          run(
            () => confirmTransactionAction(target.id),
            `${money(target.amount)} hulog confirmed`
          );
          setTarget(null);
        }}
        title="Confirm this hulog?"
        description={`This marks the ${money(target?.amount)} hulog as confirmed.`}
        confirmLabel="Confirm hulog"
        loading={busy}
      />

      <ConfirmDialog
        open={voiding && !!target}
        onClose={() => {
          setVoiding(false);
          setTarget(null);
        }}
        onConfirm={() => {
          if (!target) return;
          setVoiding(false);
          run(() => voidTransactionAction(target.id), "Transaction voided");
          setTarget(null);
        }}
        title="Void this transaction?"
        description="Voiding removes it from collection totals. This can't be undone."
        confirmLabel="Void transaction"
        danger
        loading={busy}
      />

      <EditTxModal
        key={editing?.id ?? "none"}
        tx={editing}
        onClose={() => setEditing(null)}
        onSaved={(message) => {
          setEditing(null);
          toast("success", "Transaction updated", message);
          router.refresh();
        }}
      />
    </div>
  );
}

function RowActions({
  tx,
  onConfirm,
  onVoid,
  onEdit,
}: {
  tx: TxView;
  onConfirm: () => void;
  onVoid: () => void;
  onEdit: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink"
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift">
            <MenuItem
              icon={Pencil}
              label="Edit"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            />
            {tx.status === "PENDING" && (
              <MenuItem
                icon={CheckCheck}
                label="Confirm"
                tone="brand"
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
              />
            )}
            {tx.status !== "VOIDED" && (
              <MenuItem
                icon={Ban}
                label="Void"
                tone="danger"
                onClick={() => {
                  setOpen(false);
                  onVoid();
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "brand";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold transition-colors ${
        tone === "danger"
          ? "text-rose-600 hover:bg-rose-50"
          : tone === "brand"
            ? "text-brand-700 hover:bg-brand-50"
            : "text-ink-soft hover:bg-mist"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function MobileRow({
  tx,
  showMember,
  admin,
  onConfirm,
  onVoid,
  onEdit,
}: {
  tx: TxView;
  showMember: boolean;
  admin: boolean;
  onConfirm: () => void;
  onVoid: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line/70 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showMember && (
            <div className="mb-1 flex items-center gap-2">
              <Avatar name={tx.memberName ?? "?"} size="xs" />
              <span className="text-[13px] font-bold text-ink">{tx.memberName}</span>
            </div>
          )}
          <p
            className={`text-xl font-extrabold tracking-tight ${
              tx.amount < 0 ? "text-rose-600" : "text-ink"
            }`}
          >
            {tx.amount < 0 ? `−${money(-tx.amount)}` : money(tx.amount)}
          </p>
          <p className="text-xs font-semibold text-ink-soft">{tx.collectionPeriod}</p>
          <p className="mt-0.5 text-xs text-ink-soft/70">{formatDate(tx.transactionDate)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {tx.amount < 0 && <WithdrawalChip />}
          <StatusBadge status={tx.status} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <PaymentChip method={tx.paymentMethod} />
        {admin && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mist"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {tx.status === "PENDING" && (
              <button
                onClick={onConfirm}
                className="flex h-8 items-center justify-center gap-1 rounded-full bg-brand-50 px-2.5 text-xs font-bold text-brand-700 hover:bg-brand-100"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Confirm
              </button>
            )}
            {tx.status !== "VOIDED" && (
              <button
                onClick={onVoid}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-rose-50 hover:text-rose-600"
                aria-label="Void"
              >
                <Ban className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditTxModal({
  tx,
  onClose,
  onSaved,
}: {
  tx: TxView | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [amount, setAmount] = React.useState(() => (tx ? String(fromCents(tx.amount)) : ""));
  const [date, setDate] = React.useState(() => tx?.transactionDate.slice(0, 10) ?? "");
  const [method, setMethod] = React.useState<PaymentMethod>(() => tx?.paymentMethod ?? "CASH");
  const [note, setNote] = React.useState(() => tx?.note ?? "");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  if (tx === null) return null;

  const save = async () => {
    const fd = new FormData();
    fd.set("amount", amount);
    fd.set("date", date);
    fd.set("paymentMethod", method);
    fd.set("note", note);
    setSaving(true);
    const res = await editTransactionAction(tx.id, null, fd);
    setSaving(false);
    if (res.ok) onSaved(res.message ?? "");
    else setError(res.error);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit hulog"
      description="Adjust this transaction. Any amount is valid."
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-mist disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-ink">Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm font-bold text-ink outline-none focus:border-brand-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-400"
            >
              {(["CASH", "GCASH", "BANK_TRANSFER", "OTHER"] as const).map((m) => (
                <option key={m} value={m}>
                  {humanize(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-ink">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink outline-none focus:border-brand-400"
          />
        </div>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}