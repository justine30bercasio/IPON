import { notFound } from "next/navigation";
import { getChallengeContext, canSeeMemberAmounts, canSeeTotals } from "@/lib/challenge-context";
import { getMemberAggregates } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ChallengeTabs } from "@/components/challenge/challenge-tabs";
import { MembersManager, type MemberRow } from "@/components/challenge/members-manager";

export default async function ChallengeMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getChallengeContext(id);
  if (!ctx) notFound();
  const { challenge, user, isAdmin, isMember } = ctx;
  if (!isAdmin && !isMember) notFound();

  const aggs = await getMemberAggregates(challenge.id);
  const showAmounts = canSeeMemberAmounts(user.role, challenge.visibility);
  const showTotals = canSeeTotals(user.role, challenge.visibility);

  const rows: MemberRow[] = aggs.map((a) => ({
    memberId: a.memberId,
    userId: a.userId,
    name: a.name,
    email: a.email,
    status: a.status,
    isAdmin: a.isAdmin,
    total: a.total,
    count: a.count,
    thisMonth: a.thisMonth,
    lastHulog: a.lastHulog,
    lastHulogAmount: a.lastHulogAmount,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Members · ${rows.length}`}
        subtitle={
          isAdmin
            ? "Manage who's in this challenge and their contribution totals."
            : showTotals
              ? "Everyone participating in this challenge."
              : "Your fellow members in this challenge."
        }
      />
      <ChallengeTabs challengeId={challenge.id} isAdmin={isAdmin} />

      <Card>
        <CardHeader
          title="Member management"
          subtitle={
            showAmounts
              ? "Contribution amounts are visible to all."
              : "Amounts are private — only you (the organizer) can see them."
          }
        />
        <CardContent>
          <MembersManager
            challengeId={challenge.id}
            members={rows}
            isAdmin={isAdmin}
            showAmounts={showAmounts || isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}