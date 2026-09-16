import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForms } from "@/components/profile-forms";
import { SignOutButton } from "@/components/sign-out-button";
import { Card } from "@/components/ui/card";

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
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-bold text-ink">Sign out</p>
          <p className="text-xs text-ink-soft/70">
            End this session on this device. You can sign back in anytime.
          </p>
        </div>
        <SignOutButton variant="full" />
      </Card>
    </div>
  );
}