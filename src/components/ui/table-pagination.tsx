"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2">
      <p className="text-xs font-medium text-ink-soft/70">
        Showing <span className="font-bold text-ink">{from}–{to}</span> of{" "}
        <span className="font-bold text-ink">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition-colors hover:bg-mist hover:text-ink disabled:opacity-40 disabled:hover:bg-white"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, idx) => {
          const prev = pages[idx - 1];
          const gap = prev ? p - prev > 1 : false;
          return (
            <React.Fragment key={p}>
              {gap && <span className="px-0.5 text-xs text-ink-soft/50">…</span>}
              <button
                onClick={() => onPage(p)}
                className={`h-8 min-w-8 rounded-lg px-1.5 text-xs font-bold transition-colors ${
                  p === page
                    ? "bg-brand-600 text-white shadow-soft"
                    : "border border-line bg-white text-ink-soft hover:bg-mist hover:text-ink"
                }`}
              >
                {p}
              </button>
            </React.Fragment>
          );
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition-colors hover:bg-mist hover:text-ink disabled:opacity-40 disabled:hover:bg-white"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}