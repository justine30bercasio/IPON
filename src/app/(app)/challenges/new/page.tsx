import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { NewChallengeForm } from "@/components/challenge/new-challenge-form";

export default async function NewChallengePage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/challenges");

  return <NewChallengeForm />;
}