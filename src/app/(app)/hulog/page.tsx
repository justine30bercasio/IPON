import { Coins, Wallet, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPersonalStats, getActiveMemberOptions } from "@/lib/queries";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TransactionsTable } from "@/components/transaction-table";
import { AddHulogButton } from "@/components/dashboard/add-hulog-button";

export default async function HulogHistoryPage() {
  const user = await requireUser();
  const stats = await getPersonalStats(user.id);

  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [
        { createdById: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      schedules: true,
      members: { where: { userId: user.id }, select: { status: true, isAdmin: true } },
    },
  });

  const membershipMap = new Map(challenges.map((c) => [c.id, c.members[0]?.status ?? null]));
  const canHulog = challenges.filter(
    (c) =>
      c.status !== "ARCHIVED" &&
      c.status !== "COMPLETED" &&
      membershipMap.get(c.id) !== "INACTIVE"
  );

  const memberOptions = await getActiveMemberOptions(canHulog.map((c) => c.id));

  const txs = await prisma.hulogTransaction.findMany({
    where: { member: { userId: user.id }, status: { not: "VOIDED" } },
    include: { challenge: { select: { id: true, name: true } } },
    orderBy: { transactionDate: "desc" },
  });

  const items = txs.map((t) => ({
    id: t.id,
    amount: t.amount,
    transactionDate: t.transactionDate.toISOString(),
    collectionPeriod: t.collectionPeriod,
    paymentMethod: t.paymentMethod,
    status: t.status,
    note: t.note,
  }));

  const total = txs.reduce((s, t) => s + t.amount, 0);
  const byChallenge = new Map<string, number>();
  for (const t of txs) {
    byChallenge.set(t.challengeId, (byChallenge.get(t.challengeId) ?? 0) + t.amount);
  }
  const bestChallenge = [...byChallenge.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestName = bestChallenge ? challenges.find((c) => c.id === bestChallenge[0])?.name ?? "A challenge" : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Hulog History"
        subtitle="Every cent you've put in, across all challenges."
        actions={
          <AddHulogButton
            challenges={canHulog.map((c) => ({
              id: c.id,
              name: c.name,
              members: memberOptions[c.id] ?? [],
            }))}
            isAdmin={user.role === "ADMIN"}
            label="Add Hulog"
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Total Saved" value={money(stats.total)} icon={Wallet} tone="brand" />
        <StatCard label="Hulog Entries" value={stats.count} icon={Receipt} />
        <StatCard label="All-Time Total" value={money(total)} icon={Coins} tone="amber" />
        {bestName && (
          <StatCard
            label="Top Challenge"
            value={bestName}
            icon={Coins}
            hint={bestChallenge ? money(bestChallenge[1]) : ""}
          />
        )}
      </div>

      <Card className="p-5 sm:p-6">
        {items.length === 0 ? (
          <EmptyState
            emoji="🪙"
            title="No hulog yet"
            description="Record your first contribution to start your savings streak."
          />
        ) : (
          <TransactionsTable
            items={items.map((i) => ({ ...i, memberName: user.name, memberUserId: user.id }))}
            admin={false}
          />
        )}
      </Card>
    </div>
  );
}