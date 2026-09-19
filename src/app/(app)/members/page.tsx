import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { requireUser, isOrgAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { MembersManager } from "@/components/members-manager-global";
import { OrgSwitcher } from "@/components/admin/org-switcher";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const user = await requireUser();
  if (!isOrgAdmin(user)) redirect("/dashboard");

  const isSuper = user.role === "SUPER_ADMIN";
  const { org } = await searchParams;
  let orgId = user.orgId;

  let orgs: { id: string; name: string }[] = [];
  if (isSuper) {
    orgs = (await prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })).map((o) => ({ id: o.id, name: o.name }));
    if (org && orgs.some((o) => o.id === org)) orgId = org;
  }

  const users = await prisma.user.findMany({
    where: { orgId },
    include: { memberships: { include: { challenge: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  const members = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    challengeCount: u.memberships.length,
    challengeNames: u.memberships.map((p) => p.challenge.name),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Members" subtitle="Everyone registered in this organization." />
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3">
          <Users className="h-5 w-5 shrink-0 text-brand-600" />
          <p className="text-sm font-medium text-brand-900">
            {members.length} registered {members.length === 1 ? "member" : "members"} · admin-only
            view.
          </p>
        </div>
        {isSuper && (
          <div className="sm:ml-auto">
            <OrgSwitcher orgs={orgs} current={orgId} />
          </div>
        )}
      </div>
      <MembersManager members={members} currentUserId={user.id} orgId={orgId} />
    </div>
  );
}