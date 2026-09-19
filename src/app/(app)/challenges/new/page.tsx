import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewChallengeForm } from "@/components/challenge/new-challenge-form";

export default async function NewChallengePage() {
  const user = await requireUser();
  if (user.role === "MEMBER") redirect("/challenges");

  const orgs =
    user.role === "SUPER_ADMIN"
      ? (await prisma.organization.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })).map((o) => ({ id: o.id, name: o.name }))
      : [];

  return <NewChallengeForm orgs={orgs} currentOrgId={user.orgId} />;
}