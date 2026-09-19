import { redirect } from "next/navigation";
import { getSession, isOrgAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveMemberOptions } from "@/lib/queries";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const admin = isOrgAdmin(user);
  const challenges = await prisma.challenge.findMany({
    where: {
      status: { not: "ARCHIVED" },
      ...(user.role === "SUPER_ADMIN"
        ? {}
        : {
            orgId: user.orgId,
            OR: [
              { createdById: user.id },
              {
                members: {
                  some: { userId: user.id, status: "ACTIVE" },
                },
              },
              ...(admin ? [{ status: { not: "ARCHIVED" as const } }] : []),
            ],
          }),
    },
    select: { id: true, name: true, status: true, org: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { id: true, name: true },
  });

  const memberOptions = await getActiveMemberOptions(challenges.map((c) => c.id));

  const unread = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return (
    <AppShell
      user={{ id: user.id, name: user.name, role: user.role, email: user.email }}
      orgName={org?.name ?? ""}
      challenges={challenges.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        orgName: c.org.name,
        members: memberOptions[c.id] ?? [],
      }))}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}