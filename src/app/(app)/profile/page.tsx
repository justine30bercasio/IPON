import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForms } from "@/components/profile-forms";

export default async function ProfilePage() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile & Settings"
        subtitle="Manage your account details and password."
      />
      <ProfileForms
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone ?? null,
          role: user.role,
        }}
      />
    </div>
  );
}