"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";

export interface DataRow {
  id: string;
  cells: React.ReactNode;
  searchText: string;
}

export function DataTable({
  head,
  rows,
  searchPlaceholder = "Search…",
  pageSize = 10,
  emptyEmoji = "🔍",
  emptyTitle = "Nothing here",
  emptyDescription,
  className = "",
}: {
  head: React.ReactNode;
  rows: DataRow[];
  searchPlaceholder?: string;
  pageSize?: number;
  emptyEmoji?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.searchText.toLowerCase().includes(needle));
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (rows.length === 0) {
    return (
      <EmptyState emoji={emptyEmoji} title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/40" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink shadow-soft outline-none transition-all focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10"
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-line/70 bg-white shadow-soft">
        <div className={`overflow-x-auto ${className}`}>
          <table className="w-full text-left text-sm">
            <thead>{head}</thead>
            <tbody>{pageRows.map((r) => r.cells)}</tbody>
          </table>
        </div>
      </div>
      <TablePagination
        page={safePage}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={pageSize}
        onPage={setPage}
      />
    </div>
  );
}