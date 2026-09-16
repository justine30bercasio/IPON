"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { moneyShort, money } from "@/lib/format";

export interface ChartPoint {
  key: string;
  month: string;
  total: number;
  count?: number;
  contributors?: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-lift">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-soft/60">
        {p.month}
      </p>
      <p className="text-lg font-extrabold text-ink">{money(p.total)}</p>
      {typeof p.count === "number" && (
        <p className="text-xs font-medium text-ink-soft/80">
          {p.count} transaction{p.count === 1 ? "" : "s"}
          {typeof p.contributors === "number" &&
            ` · ${p.contributors} contributor${p.contributors === 1 ? "" : "s"}`}
        </p>
      )}
    </div>
  );
}

export function MonthlyBarChart({
  data,
  className = "h-64",
}: {
  data: ChartPoint[];
  className?: string;
}) {
  const colors = ["#10b981", "#34d399", "#a7f3d0", "#059669", "#6ee7b7", "#10b981"];
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 0, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e6ebe9" strokeDasharray="4 8" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#3f4d47", fontSize: 12, fontWeight: 700 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => moneyShort(v)}
            tick={{ fill: "#3f4d47", fontSize: 11, fontWeight: 600 }}
            width={56}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(16,185,129,0.06)" }} />
          <Bar
            dataKey="total"
            radius={[8, 8, 0, 0]}
            maxBarSize={44}
            animationDuration={700}
            animationEasing="ease-out"
          >
            {data.map((entry, i) => (
              <Cell key={entry.key} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MiniSparkline({ data }: { data: { month: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={56}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="#10b981" maxBarSize={16} />
        <Tooltip cursor={{ fill: "transparent" }} content={<ChartTooltip />} />
      </BarChart>
    </ResponsiveContainer>
  );
}