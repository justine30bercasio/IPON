import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Users, Trophy, Wallet, ArrowRight, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateOrgForm } from "@/components/admin/create-org-form";

export default async function SuperAdminPage() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: { select: { users: true, challenges: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const challenges = await prisma.challenge.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, orgId: true },
  });
  const challengeIds = challenges.map((c) => c.id);
  const orgOf = new Map(challenges.map((c) => [c.id, c.orgId]));

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [totalAgg, monthAgg] = await Promise.all([
    prisma.hulogTransaction.groupBy({
      by: ["challengeId"],
      where: { challengeId: { in: challengeIds }, status: "CONFIRMED" },
      _sum: { amount: true },
    }),
    prisma.hulogTransaction.groupBy({
      by: ["challengeId"],
      where: {
        challengeId: { in: challengeIds },
        status: "CONFIRMED",
        transactionDate: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
  ]);

  const groupByOrg = (rows: { challengeId: string; _sum: { amount: number | null } | null }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const o = orgOf.get(r.challengeId);
      if (!o) continue;
      m.set(o, (m.get(o) ?? 0) + (r._sum?.amount ?? 0));
    }
    return m;
  };
  const totalByOrg = groupByOrg(totalAgg);
  const monthByOrg = groupByOrg(monthAgg);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin"
        subtitle="Every organization running on this IPON instance."
      />

      {orgs.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              emoji="🏢"
              title="No organizations yet"
              description="Create the first organization to get started."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orgs.map((org) => {
            const total = totalByOrg.get(org.id) ?? 0;
            const thisMonth = monthByOrg.get(org.id) ?? 0;
            return (
              <Link
                key={org.id}
                href={`/admin/organizations/${org.id}`}
                className="group animate-fade-up overflow-hidden rounded-2xl border border-line/70 bg-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 to-violet-400" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                        <Building2 className="h-6 w-6" />
                      </span>
                      <div>
                        <h2 className="text-base font-extrabold tracking-tight text-ink">
                          {org.name}
                        </h2>
                        <p className="text-xs font-medium text-ink-soft/70">
                          /{org.slug} · created {org.createdAt.toLocaleDateString("en-PH")}
                        </p>
                      </div>
                    </div>
                    <Badge tone="primary">{org._count.challenges} challenges</Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-mist px-3 py-2.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft/50">
                        <Users className="h-3 w-3" /> Users
                      </p>
                      <p className="mt-0.5 text-lg font-extrabold text-ink">{org._count.users}</p>
                    </div>
                    <div className="rounded-xl bg-mist px-3 py-2.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft/50">
                        <Wallet className="h-3 w-3" /> This month
                      </p>
                      <p className="mt-0.5 truncate text-lg font-extrabold text-brand-700">
                        {money(thisMonth)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-mist px-3 py-2.5">
                      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-soft/50">
                        <Trophy className="h-3 w-3" /> Total
                      </p>
                      <p className="mt-0.5 truncate text-lg font-extrabold text-ink">
                        {money(total)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-soft/60">
                      {org._count.users} account{org._count.users === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-brand-700 transition-all group-hover:gap-2">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader
          title="New organization"
          subtitle="Each organization keeps its users, challenges, and finances fully isolated."
          action={
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Plus className="h-4 w-4" />
            </span>
          }
        />
        <CardContent>
          <CreateOrgForm />
        </CardContent>
      </Card>
    </div>
  );
}