import { prisma } from "@/lib/prisma";
import type { TransactionStatus } from "@prisma/client";
import { MANILA_TZ, manilaMonthStart, manilaMonthKey } from "@/lib/manila";

export interface MonthlySeriesPoint {
  key: string;
  month: string;
  total: number;
  count: number;
  contributors: number;
}

export async function getChallengeMonthlySeries(
  challengeId: string,
  months = 8
): Promise<MonthlySeriesPoint[]> {
  const start = manilaMonthStart(-(months - 1));

  const txs = await prisma.hulogTransaction.findMany({
    where: {
      challengeId,
      status: "CONFIRMED",
      transactionDate: { gte: start },
    },
    select: { amount: true, transactionDate: true, memberId: true },
    orderBy: { transactionDate: "asc" },
  });

  const byMonth = new Map<string, { total: number; count: number; members: Set<string> }>();
  for (const tx of txs) {
    const key = manilaMonthKey(tx.transactionDate);
    const bucket = byMonth.get(key) ?? { total: 0, count: 0, members: new Set<string>() };
    bucket.total += tx.amount;
    bucket.count += 1;
    bucket.members.add(tx.memberId);
    byMonth.set(key, bucket);
  }

  const now = new Date();
  const points: MonthlySeriesPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const startOfMonth = manilaMonthStart(-i);
    const key = manilaMonthKey(startOfMonth);
    const bucket = byMonth.get(key);
    points.push({
      key,
      month: startOfMonth.toLocaleDateString("en-PH", { month: "short", timeZone: MANILA_TZ }),
      total: bucket?.total ?? 0,
      count: bucket?.count ?? 0,
      contributors: bucket?.members.size ?? 0,
    });
  }
  return points;
}

export interface MemberAggregate {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  status: string;
  isAdmin: boolean;
  total: number;
  count: number;
  thisMonth: number;
  lastHulog: string | null;
  lastHulogAmount: number | null;
}

export async function getMemberAggregates(
  challengeId: string
): Promise<MemberAggregate[]> {
  const members = await prisma.challengeMember.findMany({
    where: { challengeId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      transactions: {
        where: { status: "CONFIRMED" },
        select: { amount: true, transactionDate: true },
        orderBy: { transactionDate: "desc" },
      },
    },
  });

  const now = new Date();
  const monthStart = manilaMonthStart();

  return members.map((m) => {
    let total = 0;
    let count = 0;
    let thisMonth = 0;
    for (const tx of m.transactions) {
      total += tx.amount;
      count += 1;
      if (tx.transactionDate >= monthStart) thisMonth += tx.amount;
    }
    const last = m.transactions[0];
    return {
      memberId: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      status: m.status,
      isAdmin: m.isAdmin,
      total,
      count,
      thisMonth,
      lastHulog: last ? last.transactionDate.toISOString() : null,
      lastHulogAmount: last?.amount ?? null,
    };
  });
}

export async function getChallengeTotals(challengeId: string) {
  const txs = await prisma.hulogTransaction.findMany({
    where: { challengeId, status: "CONFIRMED" },
    select: { amount: true, transactionDate: true },
  });
  const total = txs.reduce((s, t) => s + t.amount, 0);
  const now = new Date();
  const monthStart = manilaMonthStart();
  const thisMonth = txs
    .filter((t) => t.transactionDate >= monthStart)
    .reduce((s, t) => s + t.amount, 0);
  return { total, count: txs.length, thisMonth };
}

export interface OrganizerOverview {
  total: number;
  count: number;
  thisMonth: number;
  members: number;
  pending: number;
}

export async function getOrganizerOverview(orgId?: string): Promise<OrganizerOverview> {
  const challenges = await prisma.challenge.findMany({
    where: { ...(orgId ? { orgId } : {}), status: { not: "ARCHIVED" } },
    include: {
      members: { select: { userId: true } },
      transactions: {
        where: { status: "CONFIRMED" },
        select: { amount: true, transactionDate: true },
      },
    },
  });

  const memberIds = new Set<string>();
  let total = 0;
  let count = 0;
  let thisMonth = 0;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  for (const c of challenges) {
    for (const m of c.members) memberIds.add(m.userId);
    for (const t of c.transactions) {
      total += t.amount;
      count += 1;
      if (t.transactionDate >= monthStart) thisMonth += t.amount;
    }
  }
  const pending = await prisma.hulogTransaction.count({
    where: { challenge: { ...(orgId ? { orgId } : {}), status: { not: "ARCHIVED" } }, status: "PENDING" },
  });
  return { total, count, thisMonth, members: memberIds.size, pending };
}

export interface PersonalStats {
  total: number;
  thisMonth: number;
  count: number;
  latest: {
    amount: number;
    date: string;
    period: string;
    challengeName: string;
    status: TransactionStatus;
  } | null;
  monthly: { key: string; month: string; total: number }[];
}

export async function getPersonalStats(userId: string): Promise<PersonalStats> {
  const memberships = await prisma.challengeMember.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true },
  });
  const memberIds = memberships.map((m) => m.id);
  if (memberIds.length === 0) {
    return { total: 0, thisMonth: 0, count: 0, latest: null, monthly: [] };
  }

  const txs = await prisma.hulogTransaction.findMany({
    where: {
      memberId: { in: memberIds },
      status: "CONFIRMED",
    },
    include: { challenge: { select: { name: true } } },
    orderBy: { transactionDate: "desc" },
  });

  const total = txs.reduce((s, t) => s + t.amount, 0);
  const now = new Date();
  const monthStart = manilaMonthStart();
  const thisMonth = txs
    .filter((t) => t.transactionDate >= monthStart)
    .reduce((s, t) => s + t.amount, 0);

  const byMonth = new Map<string, number>();
  for (const t of txs) {
    const key = manilaMonthKey(t.transactionDate);
    byMonth.set(key, (byMonth.get(key) ?? 0) + t.amount);
  }
  const monthly: PersonalStats["monthly"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = manilaMonthStart(-i);
    const key = manilaMonthKey(d);
    monthly.push({
      key,
      month: d.toLocaleDateString("en-PH", { month: "short" }),
      total: byMonth.get(key) ?? 0,
    });
  }

  const latest = txs[0];
  return {
    total,
    thisMonth,
    count: txs.length,
    latest: latest
      ? {
          amount: latest.amount,
          date: latest.transactionDate.toISOString(),
          period: latest.collectionPeriod,
          challengeName: latest.challenge.name,
          status: latest.status,
        }
      : null,
    monthly,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

export interface ChallengeMemberOption {
  id: string;
  name: string;
}

/** Active members keyed by challenge id, for the admin "record for member" picker. */
export async function getActiveMemberOptions(
  challengeIds: string[]
): Promise<Record<string, ChallengeMemberOption[]>> {
  if (challengeIds.length === 0) return {};
  const rows = await prisma.challengeMember.findMany({
    where: { challengeId: { in: challengeIds }, status: "ACTIVE" },
    select: { id: true, challengeId: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const map: Record<string, ChallengeMemberOption[]> = {};
  for (const r of rows) {
    (map[r.challengeId] ??= []).push({ id: r.id, name: r.user.name });
  }
  return map;
}