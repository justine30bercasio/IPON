import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { MembersManager } from "@/components/members-manager-global";

export default async function MembersPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
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
      <PageHeader
        title="Members"
        subtitle="Everyone registered across the whole app."
      />
      <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3">
        <Users className="h-5 w-5 shrink-0 text-brand-600" />
        <p className="text-sm font-medium text-brand-900">
          {members.length} registered {members.length === 1 ? "member" : "members"} · admin-only
          view.
        </p>
      </div>
      <MembersManager members={members} currentUserId={user.id} />
    </div>
  );
}