import { notFound } from "next/navigation";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  Users,
  Wallet,
  Receipt,
} from "lucide-react";
import { getChallengeContext, canSeeTotals } from "@/lib/challenge-context";
import { prisma } from "@/lib/prisma";
import { getMemberAggregates, getChallengeMonthlySeries } from "@/lib/queries";
import { money, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ChallengeTabs } from "@/components/challenge/challenge-tabs";
import { MonthlyBarChart } from "@/components/charts";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ChallengeReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getChallengeContext(id);
  if (!ctx) notFound();
  const { challenge, user, isAdmin, isMember } = ctx;
  if (!isAdmin && !isMember) notFound();

  const allTx = await prisma.hulogTransaction.findMany({
    where: { challengeId: challenge.id, status: { not: "VOIDED" } },
    include: { member: { include: { user: { select: { name: true } } } } },
    orderBy: { transactionDate: "asc" },
  });

  const total = allTx.reduce((s, t) => s + t.amount, 0);
  const avg = allTx.length ? total / allTx.length : 0;
  const memberCount = new Set(allTx.map((t) => t.memberId)).size;
  const monthly = await getChallengeMonthlySeries(challenge.id, 8);
  const memberAggs = await getMemberAggregates(challenge.id);

  const monthlyReport = new Map<string, { count: number; total: number; contributors: Set<string> }>();
  for (const tx of allTx) {
    const bucket = monthlyReport.get(tx.collectionPeriod) ?? {
      count: 0,
      total: 0,
      contributors: new Set<string>(),
    };
    bucket.count++;
    bucket.total += tx.amount;
    bucket.contributors.add(tx.memberId);
    monthlyReport.set(tx.collectionPeriod, bucket);
  }

  const monthSorted = Array.from(monthlyReport.entries()).sort((a, b) => (a[0] > b[0] ? -1 : 1));

  const showTotals = canSeeTotals(user.role, challenge.visibility);
  const canExport = isAdmin && allTx.length > 0;

  const exportBase = `/api/challenges/${challenge.id}/export`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle={isAdmin ? "Collection insights for this challenge." : "Group collection insights."}
        actions={
          canExport ? (
            <div className="flex gap-2">
              <a
                href={`${exportBase}?format=csv`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink shadow-soft transition-colors hover:bg-mist"
              >
                <FileDown className="h-4 w-4 text-brand-600" /> CSV
              </a>
              <a
                href={`${exportBase}?format=xlsx`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink shadow-soft transition-colors hover:bg-mist"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
              </a>
              <a
                href={`${exportBase}?format=pdf`}
                target="_blank"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink shadow-soft transition-colors hover:bg-mist"
              >
                <FileText className="h-4 w-4 text-rose-600" /> PDF
              </a>
            </div>
          ) : undefined
        }
      />
      <ChallengeTabs challengeId={challenge.id} isAdmin={isAdmin} />

      {isAdmin ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard label="Total Collected" value={money(total)} icon={Wallet} tone="brand" />
          <StatCard label="Transactions" value={allTx.length} icon={Receipt} />
          <StatCard label="Active Contributors" value={memberAggs.filter((m) => m.total > 0).length} icon={Users} tone="amber" />
          <StatCard label="Average Transaction" value={money(avg)} icon={Receipt} hint="per hulog" />
        </div>
      ) : (
        showTotals && monthsInTotal(monthSorted) > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard label="Total Collected" value={money(total)} icon={Wallet} tone="brand" />
            <StatCard label="Transactions" value={allTx.length} icon={Receipt} />
            <StatCard label="Contributors" value={memberCount} icon={Users} />
            <StatCard label="Average Transaction" value={money(avg)} icon={Receipt} />
          </div>
        )
      )}

      <Card>
        <CardHeader
          title="Overall Collection"
          subtitle="Monthly totals for this challenge"
        />
        <CardContent>
          {isAdmin || showTotals ? (
            monthly.some((m) => m.total > 0) ? (
              <MonthlyBarChart data={monthly} className="h-64" />
            ) : (
              <EmptyState emoji="📊" title="No data yet" description="Once hulog comes in, charts fill up here." />
            )
          ) : (
            <EmptyState emoji="🔒" title="Totals are private" description="The organizer keeps amounts private in this challenge." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Member Report"
            subtitle={isAdmin ? "Per-member totals" : "Contribution summary"}
          />
          <CardContent>
            <div className="flex flex-col gap-1.5">
              {memberAggs.length === 0 && (
                <EmptyState emoji="👥" title="No members yet" />
              )}
              {memberAggs
                .filter((m) => isAdmin || m.userId === user.id || challenge.visibility === "TRANSPARENT")
                .sort((a, b) => b.total - a.total)
                .map((m) => (
                  <div
                    key={m.memberId}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-mist"
                  >
                    <Avatar name={m.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{m.name}</p>
                      <p className="text-xs text-ink-soft/70">
                        {m.count} tx · last {m.lastHulog ? formatDate(m.lastHulog) : "—"}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-brand-700">
                      {isAdmin || challenge.visibility !== "PRIVATE" ? money(m.total) : "•••"}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Monthly Report"
            subtitle="Group collections by period"
          />
          <CardContent>
            {isAdmin || showTotals ? (
              monthSorted.length === 0 ? (
                <EmptyState emoji="📅" title="No periods yet" />
              ) : (
                <div className="overflow-hidden rounded-xl border border-line/70">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line/70 bg-mist/60 text-[11px] uppercase tracking-wider text-ink-soft/60">
                        <th className="px-4 py-2.5 text-left font-bold">Month</th>
                        <th className="px-4 py-2.5 text-right font-bold">Hulog</th>
                        <th className="px-4 py-2.5 text-right font-bold">Collected</th>
                        <th className="px-4 py-2.5 text-right font-bold">Contributors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthSorted.map(([period, b]) => (
                        <tr key={period} className="border-b border-line/40 last:border-0">
                          <td className="px-4 py-2.5 font-bold text-ink">{period}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-ink-soft">{b.count}</td>
                          <td className="px-4 py-2.5 text-right font-extrabold text-brand-700">{money(b.total)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-ink-soft">{b.contributors.size}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <EmptyState emoji="🔒" title="Totals are private" description="The organizer keeps amounts private in this challenge." />
            )}
          </CardContent>
        </Card>
      </div>

      {canExport && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-900">Export reports</p>
              <p className="text-xs text-brand-800/70">
                Download the full hulog history as CSV, Excel, or a printable PDF.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function monthsInTotal(map: [string, { total: number }][]): number {
  return map.reduce((s, [, b]) => s + b.total, 0);
}