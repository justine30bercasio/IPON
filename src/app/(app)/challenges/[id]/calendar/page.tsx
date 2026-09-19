import { notFound } from "next/navigation";
import { getChallengeContext, canSeeTotals, canSeeMemberAmounts } from "@/lib/challenge-context";
import { prisma } from "@/lib/prisma";
import { isCollectionDate, type ScheduleRule } from "@/lib/period";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ChallengeTabs } from "@/components/challenge/challenge-tabs";
import {
  ContributionCalendar,
  type CalendarDayData,
} from "@/components/challenge/contribution-calendar";

export default async function ChallengeCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getChallengeContext(id);
  if (!ctx) notFound();
  const { challenge, user, isAdmin, isMember } = ctx;
  if (!isAdmin && !isMember) notFound();

  const schedule = challenge.schedules[0];
  const scheduleRule: ScheduleRule = {
    frequency: schedule?.frequency as ScheduleRule["frequency"],
    dayOfMonth: schedule?.dayOfMonth ?? null,
    secondDayOfMonth: schedule?.secondDayOfMonth ?? null,
    dayOfWeek: schedule?.dayOfWeek ?? null,
    customDates: (schedule?.customDates as string[] | null) ?? null,
  };

  const txs = await prisma.hulogTransaction.findMany({
    where: { challengeId: challenge.id, status: { not: "VOIDED" } },
    include: { member: { include: { user: { select: { id: true, name: true } } } } },
  });

  const mode = !isAdmin && !canSeeTotals(user.role, challenge.visibility) ? "count" : (canSeeMemberAmounts(user.role, challenge.visibility) || isAdmin) ? "full" : "totals";

  const shipTxList = mode === "full" || mode === "count";
  const allowDayTotal = mode === "full" || mode === "totals";

  const byDate = new Map<string, { rawTotal: number; txs: CalendarTx[] }>();
  for (const tx of txs) {
    const key = isoDayKey(tx.transactionDate);
    const bucket = byDate.get(key) ?? { rawTotal: 0, txs: [] };
    bucket.rawTotal += tx.amount;
    bucket.txs.push({
      id: tx.id,
      amount: mode === "full" ? tx.amount : 0,
      member: tx.member.user.name,
      memberId: tx.member.user.id,
      paymentMethod: tx.paymentMethod,
      status: tx.status,
    });
    byDate.set(key, bucket);
  }

  const months: Record<string, CalendarDayData[]> = {};
  for (const [key, bucket] of byDate) {
    const [y, m] = key.split("-").map(Number);
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    const arr = months[ym] ?? [];
    const date = new Date(y, m - 1, Number(key.split("-")[2]));
    arr.push({
      dateKey: key,
      day: Number(key.split("-")[2]),
      total: allowDayTotal ? bucket.rawTotal : 0,
      count: bucket.txs.length,
      contributors: new Set(bucket.txs.map((t) => t.memberId)).size,
      isCollection: isCollectionDate(scheduleRule, date),
      txs: shipTxList ? bucket.txs : [],
    });
    months[ym] = arr;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contribution Calendar"
        subtitle="Collection days and how the group is doing, day by day."
      />
      <ChallengeTabs challengeId={challenge.id} isAdmin={isAdmin} />

      <Card className="p-5 sm:p-6">
        <ContributionCalendar months={months} mode={mode} />
      </Card>
    </div>
  );
}

function isoDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface CalendarTx {
  id: string;
  amount: number;
  member: string;
  memberId: string;
  paymentMethod: import("@prisma/client").PaymentMethod;
  status: import("@prisma/client").TransactionStatus;
}