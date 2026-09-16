import Link from "next/link";
import { Plus, Users, Wallet, CalendarDays, ArrowRight, Coins } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { describeSchedule } from "@/lib/period";

export default async function ChallengesPage() {
  const user = await getSession();
  if (!user) return null;

  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [{ members: { some: { userId: user.id } } }, { createdById: user.id }],
      status: { not: "ARCHIVED" },
    },
    include: {
      members: { where: { status: "ACTIVE" } },
      transactions: {
        where: { status: { not: "VOIDED" } },
        select: { amount: true, transactionDate: true },
      },
      schedules: true,
      _count: {
        select: { transactions: { where: { status: { not: "VOIDED" } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Challenges"
        subtitle="Every savings pot you're saving into."
        actions={
          user.role === "ADMIN" ? (
            <Link
              href="/challenges/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              New Challenge
            </Link>
          ) : undefined
        }
      />

      {challenges.length === 0 ? (
        <Card>
          <EmptyState
            emoji="👥"
            title="No challenges yet"
            description={
              user.role === "ADMIN"
                ? "Start by creating your first IPON challenge."
                : "Ask your organizer to add you to a challenge."
            }
            actionLabel={user.role === "ADMIN" ? "Create a challenge" : undefined}
            action={undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map((c) => {
            const total = c.transactions.reduce((s, t) => s + t.amount, 0);
            const thisMonth = c.transactions
              .filter((t) => t.transactionDate >= monthStart)
              .reduce((s, t) => s + t.amount, 0);
            return (
              <Link
                key={c.id}
                href={`/challenges/${c.id}`}
                className="group animate-fade-up overflow-hidden rounded-2xl border border-line/70 bg-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 to-emerald-400" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                        <Coins className="h-6 w-6" />
                      </span>
                      <div>
                        <h2 className="text-base font-extrabold tracking-tight text-ink">
                          {c.name}
                        </h2>
                        <p className="text-xs font-medium text-ink-soft/70">
                          {describeSchedule({
                            ...c.schedules[0],
                            customDates: (c.schedules[0]?.customDates ?? []) as string[] | null,
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge tone={c.status === "ACTIVE" ? "success" : "pending"}>
                      {c.status === "ACTIVE" ? "Active" : c.status.toLowerCase()}
                    </Badge>
                  </div>

                  {c.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-ink-soft/80">
                      {c.description}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-mist px-3 py-2.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft/50">
                        <Users className="h-3 w-3" /> Members
                      </p>
                      <p className="mt-0.5 text-lg font-extrabold text-ink">
                        {c.members.length}
                      </p>
                    </div>
                    <div className="rounded-xl bg-mist px-3 py-2.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft/50">
                        <Wallet className="h-3 w-3" /> This Month
                      </p>
                      <p className="mt-0.5 truncate text-lg font-extrabold text-brand-700">
                        {money(thisMonth)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-mist px-3 py-2.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft/50">
                        <CalendarDays className="h-3 w-3" /> Total
                      </p>
                      <p className="mt-0.5 truncate text-lg font-extrabold text-ink">
                        {money(total)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-soft/60">
                      {c._count.transactions} hulog transaction{c._count.transactions === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-brand-700 group-hover:gap-2 transition-all">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}