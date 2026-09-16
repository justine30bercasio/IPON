"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/transaction-card";
import { money } from "@/lib/format";
import type { PaymentMethod, TransactionStatus } from "@prisma/client";

export interface CalendarTx {
  id: string;
  amount: number;
  member: string;
  memberId: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
}

export interface CalendarDayData {
  dateKey: string;
  day: number;
  total: number;
  count: number;
  contributors: number;
  isCollection: boolean;
  txs: CalendarTx[];
}

export function ContributionCalendar({
  months,
  mode,
}: {
  months: Record<string, CalendarDayData[]>;
  mode: "full" | "totals" | "count";
}) {
  const [yearMonth, setYearMonth] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selected, setSelected] = React.useState<string | null>(null);

  const parts = yearMonth.split("-").map(Number);
  const year = parts[0];
  const monthIdx = parts[1] - 1;

  const days = months[yearMonth] ?? [];
  const byKey = new Map(days.map((d) => [d.dateKey, d]));

  const first = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIdx, d));

  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const select = (key: string) => {
    setSelected((s) => (s === key ? null : key));
  };

  const move = (dir: number) => {
    const d = new Date(year, monthIdx + dir, 1);
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelected(null);
  };

  const selDay = selected ? byKey.get(selected) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="rounded-2xl border border-line/70 bg-white p-4 shadow-soft lg:col-span-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold tracking-tight text-ink">
            {new Date(year, monthIdx, 1).toLocaleDateString("en-PH", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => move(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mist"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const d = new Date();
                setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                setSelected(null);
              }}
              className="h-9 rounded-full px-3 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50"
            >
              Today
            </button>
            <button
              onClick={() => move(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mist"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="pb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft/50">
              {d}
            </div>
          ))}
          {cells.map((cell, i) =>
            cell === null ? (
              <div key={`e${i}`} />
            ) : (
              <DayCell
                key={cell.getTime()}
                date={cell}
                data={byKey.get(dayKey(cell))}
                selected={selected === dayKey(cell)}
                isToday={dayKey(cell) === todayKey()}
                onSelect={select}
              />
            )
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line/60 pt-3 text-xs text-ink-soft/70">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-brand-100" />
            Collection day
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-100 ring-2 ring-brand-200/60" />
            Has hulog
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-amber-900">T</span>
            Today
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft lg:col-span-2">
        {selDay ? (
          <DayDetail day={selDay} mode={mode} onDeselect={() => setSelected(null)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
              <CalendarDays className="h-7 w-7 text-brand-600" />
            </div>
            <p className="text-sm font-bold text-ink">Tap a collection day</p>
            <p className="max-w-52 text-xs text-ink-soft/70">
              See who hulog today and how much the group collected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function DayCell({
  date,
  data,
  selected,
  isToday,
  onSelect,
}: {
  date: Date;
  data?: CalendarDayData;
  selected: boolean;
  isToday: boolean;
  onSelect: (key: string) => void;
}) {
  const key = dayKey(date);
  const isCollection = data?.isCollection ?? false;
  const hasHulog = data && data.count > 0;

  return (
    <button
      onClick={() => onSelect(key)}
      className={`group relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all md:aspect-[auto] md:min-h-14 ${
        selected
          ? "bg-brand-600 text-white shadow-glow"
          : isCollection
            ? hasHulog
              ? "bg-brand-100 text-brand-900 ring-1 ring-brand-300 hover:bg-brand-200"
              : "text-brand-700 ring-1 ring-brand-300 hover:bg-brand-50"
            : hasHulog
              ? "bg-mist text-ink hover:bg-brand-50"
              : "text-ink-soft/60 hover:bg-mist"
      }`}
    >
      <span style={{ opacity: isToday && !selected ? 1 : undefined }}>
        {isToday && !selected ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-amber-900">
            {date.getDate()}
          </span>
        ) : (
          date.getDate()
        )}
      </span>
      {(isCollection || hasHulog) && (
        <span
          className={`absolute bottom-1 flex gap-0.5 ${
            selected ? "opacity-100" : "opacity-80 group-hover:opacity-100"
          }`}
        >
          {isCollection && <span className={`h-1 w-1 rounded-full ${selected ? "bg-white" : "bg-brand-500"}`} />}
          {hasHulog && !isCollection && (
            <span className={`h-1 w-1 rounded-full ${selected ? "bg-white/70" : "bg-amber-400"}`} />
          )}
        </span>
      )}
    </button>
  );
}

function DayDetail({
  day,
  mode,
  onDeselect,
}: {
  day: CalendarDayData;
  mode: "full" | "totals" | "count";
  onDeselect: () => void;
}) {
  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-ink">
          {new Date(day.dateKey + "T12:00:00").toLocaleDateString("en-PH", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>
        <button onClick={onDeselect} className="text-xs font-bold text-ink-soft/70 hover:text-ink">
          Close
        </button>
      </div>

      {day.isCollection && (
        <Badge tone="primary" className="mt-1.5">
          Collection day
        </Badge>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {mode !== "count" && (
          <div className="rounded-xl bg-brand-50 px-3.5 py-3">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-700/70">
              <Wallet className="h-3 w-3" /> Total
            </p>
            <p className="mt-0.5 text-xl font-extrabold text-brand-800">{money(day.total)}</p>
          </div>
        )}
        <div className="rounded-xl bg-mist px-3.5 py-3">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft/50">
            <Users className="h-3 w-3" /> Contributors
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-ink">{day.contributors}</p>
        </div>
        <div className="rounded-xl bg-mist px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/50">Hulog</p>
          <p className="mt-0.5 text-xl font-extrabold text-ink">{day.count}</p>
        </div>
        {mode === "count" && day.isCollection && (
          <div className="rounded-xl bg-mist px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/50">Amounts</p>
            <p className="mt-0.5 text-xs font-bold text-ink-soft/60">Private</p>
          </div>
        )}
      </div>

      {daysEqual(new Date(day.dateKey + "T12:00:00"), new Date()) && (
        <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-xs font-semibold text-brand-800">
          Collection day is today — add your hulog!
        </div>
      )}

      {mode === "count" ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft/50">
            Daily activity
          </p>
          <div className="flex flex-col gap-2">
            {day.txs.length === 0 && (
              <p className="text-sm text-ink-soft/70">No contributions recorded this day.</p>
            )}
            {day.txs.map((tx) => (
              <div key={tx.id} className="flex items-center gap-2.5 rounded-xl border border-line/60 px-3 py-2">
                <Avatar name={tx.member} size="xs" />
                <span className="flex-1 truncate text-sm font-semibold text-ink">{tx.member}</span>
                <span className="text-xs font-bold text-ink-soft/60">hulog ✓</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft/50">
            Transactions
          </p>
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1 no-scrollbar">
            {day.txs.length === 0 && (
              <p className="text-sm text-ink-soft/70">No contributions recorded this day.</p>
            )}
            {day.txs.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 rounded-xl border border-line/60 px-3 py-2.5">
                <Avatar name={tx.member} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{tx.member}</p>
                  <p className="text-[11px] text-ink-soft/70">{tx.paymentMethod.replace("_", " ")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-ink">{money(tx.amount)}</p>
                  <StatusBadge status={tx.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function daysEqual(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}