import Link from "next/link";
import {
  Users,
  Wallet,
  Receipt,
  CalendarDays,
  ArrowRight,
  Trophy,
  Coins,
  Shield,
  Settings,
} from "lucide-react";
import { getChallengeContext, canSeeTotals, canSeeMemberAmounts, canSeeLeaderboard } from "@/lib/challenge-context";
import { getChallengeMonthlySeries, getMemberAggregates, getChallengeTotals } from "@/lib/queries";
import { money, formatDate } from "@/lib/format";
import { describeSchedule } from "@/lib/period";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthlyBarChart } from "@/components/charts";
import { SimpleTxTable } from "@/components/simple-tx-table";
import { ChallengeTabs } from "@/components/challenge/challenge-tabs";
import { AddHulogButton } from "@/components/dashboard/add-hulog-button";
import { notFound } from "next/navigation";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getChallengeContext(id);
  if (!ctx) notFound();
  const { challenge, isAdmin, user, isMember, memberStatus } = ctx;

  const totals = await getChallengeTotals(challenge.id);
  const monthly = await getChallengeMonthlySeries(challenge.id, 8);
  const memberAggs = await getMemberAggregates(challenge.id);
  const activeMembers = memberAggs.filter((m) => m.status === "ACTIVE");

  const fundamentals = [
    { label: "Members", icon: Users, tone: "plain" as const },
    { label: "Total Collected", icon: Wallet, tone: "brand" as const },
    { label: "This Month", icon: CalendarDays, tone: "plain" as const },
    { label: "Transactions", icon: Receipt, tone: "plain" as const },
  ];

  const showTotals = canSeeTotals(user.role, challenge.visibility);
  const showMemberAmounts = canSeeMemberAmounts(user.role, challenge.visibility);
  const showLeaderboard = canSeeLeaderboard(
    user.role,
    challenge.visibility,
    challenge.leaderboardEnabled
  );

  const myMembership = isMember
    ? memberAggs.find((m) => m.userId === user.id)
    : undefined;

  const ranked = [...activeMembers].sort((a, b) => b.total - a.total);

  const recentTx = await (async () => {
    const { prisma } = await import("@/lib/prisma");
    return prisma.hulogTransaction.findMany({
      where: { challengeId: challenge.id, status: { not: "VOIDED" } },
      include: { member: { select: { userId: true, user: { select: { name: true } } } } },
      orderBy: { transactionDate: "desc" },
      take: 6,
    });
  })();

  const showOtherTx = isAdmin || showMemberAmounts;
  const visibleRecentTx = showOtherTx
    ? recentTx
    : recentTx.filter((tx) => tx.member.userId === user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
<span className="flex items-center gap-2.5">
            <Coins className="h-6 w-6 text-brand-700" /> {challenge.name}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge tone={challenge.status === "ACTIVE" ? "success" : "pending"} dot>
              {challenge.status}
            </Badge>
            <span className="text-ink-soft/70">
              {describeSchedule(challenge.schedules[0])} · since {formatDate(challenge.startDate)}
              {challenge.endDate ? ` · until ${formatDate(challenge.endDate)}` : ""}
            </span>
          </span>
        }
        actions={
          challenge.status === "ACTIVE" && isMember ? (
            <AddHulogButton
              challenges={[
                {
                  id: challenge.id,
                  name: challenge.name,
                  members: activeMembers.map((m) => ({ id: m.memberId, name: m.name })),
                },
              ]}
              initialChallengeId={challenge.id}
              isAdmin={isAdmin}
            />
          ) : undefined
        }
      />

      <ChallengeTabs challengeId={challenge.id} isAdmin={isAdmin} />

      {challenge.description && (
        <p className="-mt-2 max-w-2xl text-sm text-ink-soft/80">{challenge.description}</p>
      )}

      {isAdmin && !isMember && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          You&apos;re the organizer of this challenge. You can manage members and records below.
        </div>
      )}

      {isMember && memberStatus !== "ACTIVE" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Your membership in this challenge is currently inactive. Please ask the organizer if you
          have questions.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label={fundamentals[0].label} value={activeMembers.length} icon={Users} tone="amber" />
        <StatCard
          label={fundamentals[1].label}
          value={showTotals || isAdmin ? money(totals.total) : "—"}
          icon={Wallet}
          tone="brand"
        />
        <StatCard
          label={fundamentals[2].label}
          value={showTotals || isAdmin ? money(totals.thisMonth) : "—"}
          icon={CalendarDays}
        />
        <StatCard label={fundamentals[3].label} value={totals.count} icon={Receipt} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Current Collection"
            subtitle="Total hulog per month"
            action={
              showTotals || isAdmin ? (
                <Link
                  href={`/challenges/${challenge.id}/calendar`}
                  className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800"
                >
                  Calendar <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : undefined
            }
          />
          <CardContent>
            {totals.count > 0 && (showTotals || isAdmin) ? (
              <MonthlyBarChart data={monthly} className="h-56" />
            ) : (
              <EmptyState
                emoji="🪙"
                title="No hulog yet"
                description={
                  isAdmin
                    ? "Record the first contribution to kick off the chart."
                    : "Contributions will appear here once members start hulog."
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={showLeaderboard ? "Member Contributions" : "My Progress"}
            subtitle={showLeaderboard ? "Ranked by total hulog" : "Your contributions in this challenge"}
            action={
              showLeaderboard && (
                <Trophy className="h-5 w-5 text-amber-500" />
              )
            }
          />
          <CardContent>
            {showLeaderboard ? (
              <LeaderboardList
                ranked={ranked.map((m) => ({ id: m.userId, name: m.name, total: m.total, status: m.status }))}
                showAmounts={showMemberAmounts || isAdmin}
                highlightUserId={user.id}
              />
            ) : myMembership ? (
              <div className="space-y-3">
                <StatCard label="Your Total" value={money(myMembership.total)} icon={Wallet} tone="brand" />
                <StatCard label="Your Transactions" value={myMembership.count} icon={Receipt} />
              </div>
            ) : (
              <EmptyState
                emoji="👥"
                title="You're not a member"
                description="Ask the organizer to add you to this challenge."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Latest Hulog"
          subtitle={
            isAdmin || showMemberAmounts
              ? "Most recent contributions in this challenge"
              : "Your most recent contributions in this challenge"
          }
          action={
            <Link
              href={`/challenges/${challenge.id}/transactions`}
              className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:text-brand-800"
            >
              Full history <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <CardContent>
          {visibleRecentTx.length === 0 ? (
            <EmptyState
              emoji="🪙"
              title="No hulog yet"
              description="Your first contribution will appear here."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line/70 bg-white shadow-soft">
              <SimpleTxTable
                items={visibleRecentTx.map((tx) => ({
                  id: tx.id,
                  amount: tx.amount,
                  transactionDate: tx.transactionDate.toISOString(),
                  collectionPeriod: `${tx.collectionPeriod} · ${tx.member.user.name}`,
                  paymentMethod: tx.paymentMethod,
                  status: tx.status,
                  memberName: isAdmin || showMemberAmounts ? tx.member.user.name : null,
                }))}
                showMember={isAdmin || showMemberAmounts}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {(isAdmin || !isMember) && (
        <div className="rounded-2xl border border-line/70 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-3 text-sm text-ink-soft">
            <Shield className="h-4 w-4 text-brand-600" />
            <span>
              Visibility: <span className="font-bold text-ink">{challenge.visibility}</span>
              {challenge.leaderboardEnabled && (
                <>
                  {" · "}Leaderboard <span className="font-bold text-ink">on</span>
                </>
              )}
            </span>
            {isAdmin && (
              <Link
                href={`/challenges/${challenge.id}/settings`}
                className="ml-auto flex items-center gap-1.5 font-bold text-brand-700 hover:text-brand-800"
              >
                <Settings className="h-4 w-4" /> Manage privacy
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardList({
  ranked,
  showAmounts,
  highlightUserId,
}: {
  ranked: { id: string; name: string; total: number; status: string }[];
  showAmounts: boolean;
  highlightUserId: string;
}) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <>
      {ranked.length === 0 && (
        <EmptyState emoji="👥" title="No members yet" description="Add members to see the rankings." />
      )}
      {ranked.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line/70">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line/70 bg-mist/60 text-[11px] uppercase tracking-wider text-ink-soft/60">
                  <th className="px-3 py-2.5 text-center font-bold">Rank</th>
                  <th className="px-3 py-2.5 font-bold">Member</th>
                  <th className="px-3 py-2.5 text-right font-bold">Total Hulog</th>
                </tr>
              </thead>
              <tbody>
                {ranked.slice(0, 8).map((m, i) => (
                  <tr
                    key={m.id}
                    className={`border-b border-line/40 last:border-0 ${
                      m.id === highlightUserId ? "bg-brand-50" : "hover:bg-mist/40"
                    }`}
                  >
                    <td className="px-3 py-2.5 text-center text-sm font-bold text-ink-soft/60">
                      {medals[i] ?? i + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} size="sm" />
                        <span className="truncate text-sm font-bold text-ink">
                          {m.name}
                          {m.id === highlightUserId && (
                            <span className="ml-1.5 text-[10px] font-bold uppercase text-brand-600">
                              you
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-extrabold text-ink">
                      {showAmounts ? money(m.total) : "•••"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}