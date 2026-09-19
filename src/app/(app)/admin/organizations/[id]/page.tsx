import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Trophy, ArrowRight, Building2, ShieldCheck, UserCog } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { RenameOrgForm } from "@/components/admin/rename-org-form";
import { CreateOrgAdminForm } from "@/components/admin/create-org-admin-form";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, createdAt: true },
  });
  if (!org) notFound();

  const orgUsers = await prisma.user.findMany({
    where: { orgId: org.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      memberships: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const challenges = await prisma.challenge.findMany({
    where: { orgId: org.id, status: { not: "ARCHIVED" } },
    select: {
      id: true,
      name: true,
      status: true,
      members: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const challengeIds = challenges.map((c) => c.id);

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
  const totalByChallenge = new Map(totalAgg.map((r) => [r.challengeId, r._sum?.amount ?? 0]));
  const monthByChallenge = new Map(monthAgg.map((r) => [r.challengeId, r._sum?.amount ?? 0]));

  const orgTotal = [...totalByChallenge.values()].reduce((s, v) => s + v, 0);
  const orgMonth = [...monthByChallenge.values()].reduce((s, v) => s + v, 0);
  const orgMembers = new Set(challenges.flatMap((c) => c.members.map((m) => m.id))).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        subtitle={
          <>
            /{org.slug} · created {org.createdAt.toLocaleDateString("en-PH")}
          </>
        }
        actions={
          <Link
            href="/admin"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink-soft shadow-soft transition-colors hover:text-brand-700"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            All organizations
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft/60">Users</p>
          <p className="mt-1.5 text-2xl font-extrabold text-ink">{orgUsers.length}</p>
        </div>
        <div className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft/60">Challenges</p>
          <p className="mt-1.5 text-2xl font-extrabold text-ink">{challenges.length}</p>
        </div>
        <div className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft/60">Challenged members</p>
          <p className="mt-1.5 text-2xl font-extrabold text-brand-700">{orgMembers}</p>
        </div>
        <div className="rounded-2xl border border-line/70 bg-white p-5 shadow-soft">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft/60">Total collected</p>
          <p className="mt-1.5 text-2xl font-extrabold text-ink">{money(orgTotal)}</p>
          <p className="mt-1 text-xs font-semibold text-brand-600">{money(orgMonth)} this month</p>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Users"
          subtitle={`${orgUsers.length} account${orgUsers.length === 1 ? "" : "s"} in this organization`}
        />
        <CardContent className="p-0">
          {orgUsers.length === 0 ? (
            <div className="p-6">
              <EmptyState emoji="👤" title="No users yet" description="Members will appear here once added." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line/70 bg-mist/60 text-[11px] uppercase tracking-wider text-ink-soft/60">
                    <th className="px-5 py-3 font-bold">Member</th>
                    <th className="px-5 py-3 font-bold">Role</th>
                    <th className="px-5 py-3 font-bold">Email</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 text-right font-bold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {orgUsers.map((u) => (
                    <tr key={u.id} className="border-b border-line/40 last:border-0 hover:bg-mist/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size="sm" />
                          <span className="font-bold text-ink">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.role === "SUPER_ADMIN" ? (
                          <Badge tone="primary">Super Admin</Badge>
                        ) : u.role === "ADMIN" ? (
                          <Badge tone="info">Admin</Badge>
                        ) : (
                          <Badge tone="neutral">Member</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-ink-soft">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={u.isActive ? "success" : "danger"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold text-ink-soft/70">
                        {u.createdAt.toLocaleDateString("en-PH")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Challenges"
          subtitle={`${challenges.length} active challenge${challenges.length === 1 ? "" : "s"}`}
        />
        <CardContent className="flex flex-col gap-2.5">
          {challenges.length === 0 ? (
            <EmptyState
              emoji="🏆"
              title="No challenges yet"
              description="Challenges created in this organization will appear here."
            />
          ) : (
            challenges.map((c) => (
              <Link
                key={c.id}
                href={`/challenges/${c.id}`}
                className="group flex items-center gap-3.5 rounded-2xl border border-line/70 bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Trophy className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{c.name}</p>
                  <p className="text-xs font-semibold text-ink-soft/60">
                    {c.members.length} member{c.members.length === 1 ? "" : "s"} · {money(totalByChallenge.get(c.id) ?? 0)} total
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={c.status === "ACTIVE" ? "success" : "pending"}>{c.status.toLowerCase()}</Badge>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-soft/50">
                    {money(monthByChallenge.get(c.id) ?? 0)} this mo
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-soft/40 transition-all group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Create organization admin"
            subtitle="Provision the first admin for this organization. They can then add members and challenges."
            action={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <UserCog className="h-4 w-4" />
              </span>
            }
          />
          <CardContent>
            <CreateOrgAdminForm orgId={org.id} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader
            title="Rename organization"
            subtitle="Display name shown to everyone in this organization."
            action={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Building2 className="h-4 w-4" />
              </span>
            }
          />
          <CardContent>
            <RenameOrgForm orgId={org.id} currentName={org.name} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader
            title="Isolation"
            subtitle="How this organization is protected."
            action={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <ShieldCheck className="h-4 w-4" />
              </span>
            }
          />
          <CardContent>
            <ul className="space-y-2 text-sm text-ink-soft">
              <li>
                • Users and challenges belong to <span className="font-bold text-ink">{org.name}</span>.
              </li>
              <li>
                • Members of another organization can never see this organization&apos;s challenges or
                finances.
              </li>
              <li>• Only You as Super Admin can view across organizations.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}