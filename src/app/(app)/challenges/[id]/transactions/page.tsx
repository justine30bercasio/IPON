import { notFound } from "next/navigation";
import { getChallengeContext } from "@/lib/challenge-context";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { TransactionsTable, type TxView } from "@/components/transaction-table";
import { ChallengeTabs } from "@/components/challenge/challenge-tabs";
import { AddHulogButton } from "@/components/dashboard/add-hulog-button";

export default async function ChallengeTransactionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getChallengeContext(id);
  if (!ctx) notFound();
  const { challenge, user, isAdmin } = ctx;

  const transparent = challenge.visibility === "TRANSPARENT";
  const membership = await prisma.challengeMember.findUnique({
    where: { challengeId_userId: { challengeId: challenge.id, userId: user.id } },
  });

  if (!isAdmin && !membership) notFound();

  const where: Record<string, unknown> = { challengeId: challenge.id, status: { not: "VOIDED" } };
  if (!isAdmin && !transparent) {
    where.memberId = membership!.id;
  }

  const txs = await prisma.hulogTransaction.findMany({
    where,
    include: {
      member: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });

  const items: TxView[] = txs.map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    transactionDate: tx.transactionDate.toISOString(),
    collectionPeriod: tx.collectionPeriod,
    paymentMethod: tx.paymentMethod,
    status: tx.status,
    note: tx.note,
    memberName: tx.member.user.name,
    memberUserId: tx.member.userId,
  }));

  const activeMembers = await prisma.challengeMember.findMany({
    where: { challengeId: challenge.id, status: "ACTIVE" },
    select: { id: true, user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hulog History"
        subtitle={`All recorded contributions${transparent ? " — this challenge is transparent to members" : !isAdmin ? " — only your own contributions are visible here" : ""}`}
        actions={
          <AddHulogButton
            challenges={[
              {
                id: challenge.id,
                name: challenge.name,
                members: activeMembers.map((m) => ({ id: m.id, name: m.user.name })),
              },
            ]}
            initialChallengeId={challenge.id}
            isAdmin={isAdmin}
          />
        }
      />
      <ChallengeTabs challengeId={challenge.id} isAdmin={isAdmin} />

      <Card>
        <CardHeader
          title={isAdmin ? "All transactions" : "Your transactions"}
          subtitle={
            isAdmin
              ? "Confirm pending hulog from this page."
              : "Single transactions that are still waiting for confirmation."
          }
        />
        <CardContent>
          <TransactionsTable
            items={items}
            admin={isAdmin}
            showMember={isAdmin || transparent}
          />
        </CardContent>
      </Card>
    </div>
  );
}