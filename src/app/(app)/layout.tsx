import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveMemberOptions } from "@/lib/queries";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [
        {
          members: {
            some: { userId: user.id, status: "ACTIVE" },
          },
        },
        { createdById: user.id },
      ],
      status: { not: "ARCHIVED" },
    },
    select: { id: true, name: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const memberOptions = await getActiveMemberOptions(challenges.map((c) => c.id));

  const unread = await prisma.notification.count({
    where: { userId: user.id, read: false },
  });

  return (
    <AppShell
      user={{ id: user.id, name: user.name, role: user.role, email: user.email }}
      challenges={challenges.map((c) => ({
        ...c,
        members: memberOptions[c.id] ?? [],
      }))}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}