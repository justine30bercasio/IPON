import Link from "next/link";
import { Coins, Wallet, CalendarDays, Layers, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPersonalStats, getActiveMemberOptions } from "@/lib/queries";
import { greeting, money, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TransactionCard } from "@/components/transaction-card";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthlyBarChart } from "@/components/charts";
import { AddHulogButton } from "@/components/dashboard/add-hulog-button";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;

  const stats = await getPersonalStats(user.id);
  const role = user.role;

  const myChallenges = await prisma.challenge.findMany({
    where: {
      OR: [{ members: { some: { userId: user.id, status: "ACTIVE" } } }, { createdById: user.id }],
      status: "ACTIVE",
    },
    include: {
      members: { where: { userId: user.id } },
      transactions: {
        where: { status: { not: "VOIDED" } },
        select: { amount: true, transactionDate: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const memberOptions = await getActiveMemberOptions(myChallenges.map((c) => c.id));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const recent = await prisma.hulogTransaction.findMany({
    where: {
      member: { userId: user.id },
      status: { not: "VOIDED" },
      challenge: { status: { not: "ARCHIVED" } },
    },
    include: { challenge: { select: { name: true } } },
    orderBy: { transactionDate: "desc" },
    take: 5,
  });

  const globalSeries = await getChallengeMonthlySeriesForUser(user.id, role);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            {greeting()},{" "}
            <span className="text-brand-600">{user.name.split(" ")[0]}</span> 👋
          </>
        }
        subtitle={
          role === "ADMIN"
            ? "Your savings and what's happening across your challenges."
            : "Here's where all your hulog comes together."
        }
        actions={
          <AddHulogButton challenges={strip(myChallenges, memberOptions)} isAdmin={role === "ADMIN"} />
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Total Hulog" value={money(stats.total)} icon={Wallet} tone="brand" hint="all time" />
        <StatCard label="This Month" value={money(stats.thisMonth)} icon={CalendarDays} hint={monthName()} />
        <StatCard label="Hulog" value={`${stats.count}`} icon={Layers} hint="transactions" />
        <StatCard
          label="Latest Hulog"
          value={stats.latest ? money(stats.latest.amount) : "—"}
icon={Coins}
          hint={stats.latest ? formatDate(stats.latest.date) : "no hulog yet"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Your monthly hulog"
            subtitle="Total recorded per month across your challenges"
          />
          <CardContent>
            {stats.monthly.some((m) => m.total > 0) ? (
              <MonthlyBarChart
                data={stats.monthly}
                className="h-56"
              />
            ) : (
              <EmptyState
                emoji="🪙"
                title="No hulog yet"
                description="Once you record your first hulog, it shows up right here."
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Your challenges"
            action={
              <Link
                href="/challenges"
                className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <CardContent>
            {myChallenges.length === 0 ? (
              <EmptyState
                emoji="👥"
                title="No challenges yet"
                description={
                  role === "ADMIN"
                    ? "Create your first IPON challenge."
                    : "Ask an organizer to add you to a challenge."
                }
              />
            ) : (
              <div className="flex flex-col gap-2.5">
                {myChallenges.slice(0, 4).map((c) => {
                  const total = c.transactions.reduce((s, t) => s + t.amount, 0);
                  const thisMonth = c.transactions
                    .filter((t) => t.transactionDate >= monthStart)
                    .reduce((s, t) => s + t.amount, 0);
                  return (
                    <Link
                      key={c.id}
                      href={`/challenges/${c.id}`}
                      className="group flex items-center gap-3.5 rounded-2xl border border-line/70 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Coins className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{c.name}</p>
                        <p className="text-xs font-semibold text-brand-600">
                          {money(thisMonth)}{" "}
                          <span className="font-medium text-ink-soft/60">this month</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-ink">{money(total)}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft/50">
                          total
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {role === "ADMIN" && (
        <AdminOverview userId={user.id} series={globalSeries} />
      )}

      <Card>
        <CardHeader
          title="Recent Hulog"
          subtitle="Your latest contributions"
          action={
            <Link
              href="/hulog"
              className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800"
            >
              View history <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              emoji="🪙"
              title="No hulog yet"
              description="Your first contribution will appear here."
            />
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2">
              {recent.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  amount={tx.amount}
                  date={tx.transactionDate.toISOString()}
                  period={`${tx.collectionPeriod} · ${tx.challenge.name}`}
                  method={tx.paymentMethod}
                  status={tx.status}
                  note={tx.note}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function monthName(): string {
  return new Date().toLocaleDateString("en-PH", { month: "long" });
}

function strip(
  challenges: { id: string; name: string }[],
  memberOptions: Record<string, { id: string; name: string }[]>
) {
  return challenges.map((c) => ({
    id: c.id,
    name: c.name,
    members: memberOptions[c.id] ?? [],
  }));
}

type SeriesPoint = {
  key: string;
  month: string;
  total: number;
  count: number;
  contributors: number;
};

async function AdminOverview({
  userId,
  series,
}: {
  userId: string;
  series: SeriesPoint[];
}) {
  const challenges = await prisma.challenge.findMany({
    where: { createdById: userId },
    include: {
      members: true,
      transactions: {
        where: { status: { not: "VOIDED" } },
        select: { amount: true, transactionDate: true, status: true },
      },
    },
  });

  const members = new Set<string>();
  let total = 0;
  let count = 0;
  let thisMonth = 0;
  let pendingCount = 0;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  for (const c of challenges) {
    c.members.forEach((m) => members.add(m.userId));
    for (const t of c.transactions) {
      total += t.amount;
      count++;
      if (t.transactionDate >= monthStart) thisMonth += t.amount;
    }
  }
  pendingCount = await prisma.hulogTransaction.count({
    where: {
      challenge: { createdById: userId },
      status: "PENDING",
    },
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Members" value={members.size} icon={Layers} hint="across challenges" tone="amber" />
        <StatCard label="Total Collected" value={money(total)} icon={Wallet} tone="brand" />
        <StatCard label="This Month" value={money(thisMonth)} icon={CalendarDays} />
        <StatCard label="Transactions" value={count} icon={Wallet} />
      </div>

      <Card>
        <CardHeader
          title="Current Collection"
          subtitle="Total hulog per month across your challenges"
          action={
            pendingCount > 0 ? (
              <Link href="/hulog">
                <Badge tone="pending" dot>
                  {pendingCount} to confirm
                </Badge>
              </Link>
            ) : undefined
          }
        />
        <CardContent>
          {total > 0 ? (
            <MonthlyBarChart data={series} className="h-60" />
          ) : (
            <EmptyState
              emoji="💰"
              title="No collections yet"
              description="Record the first hulog to start the chart."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}

async function getChallengeMonthlySeriesForUser(userId: string, role: string) {
  const challenges = await prisma.challenge.findMany({
    where:
      role === "ADMIN"
        ? { createdById: userId }
        : { members: { some: { userId, status: "ACTIVE" } } },
    select: { id: true },
  });
  const ids = challenges.map((c) => c.id);
  if (ids.length === 0) return [];

  const start = new Date();
  start.setMonth(start.getMonth() - 7);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const txs = await prisma.hulogTransaction.findMany({
    where: {
      challengeId: { in: ids },
      status: { not: "VOIDED" },
      transactionDate: { gte: start },
    },
    select: { amount: true, transactionDate: true, memberId: true },
  });

  const byMonth = new Map<string, { total: number; count: number; members: Set<string> }>();
  for (const tx of txs) {
    const d = tx.transactionDate;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key) ?? { total: 0, count: 0, members: new Set<string>() };
    bucket.total += tx.amount;
    bucket.count++;
    bucket.members.add(tx.memberId);
    byMonth.set(key, bucket);
  }

  const points: SeriesPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key);
    points.push({
      key,
      month: d.toLocaleDateString("en-PH", { month: "short" }),
      total: bucket?.total ?? 0,
      count: bucket?.count ?? 0,
      contributors: bucket?.members.size ?? 0,
    });
  }
  return points;
}