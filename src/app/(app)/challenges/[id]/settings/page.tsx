import { notFound } from "next/navigation";
import { getChallengeContext } from "@/lib/challenge-context";
import { PageHeader } from "@/components/layout/page-header";
import { ChallengeTabs } from "@/components/challenge/challenge-tabs";
import { ChallengeSettings, type ChallengeShape } from "@/components/challenge/challenge-settings";

export default async function ChallengeSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getChallengeContext(id);
  if (!ctx) notFound();
  const { challenge, isAdmin } = ctx;
  if (!isAdmin) notFound();

  const shape: ChallengeShape = {
    ...challenge,
    endDate: challenge.endDate?.toISOString().slice(0, 10) ?? null,
    createdAt: challenge.createdAt.toISOString(),
    schedules: challenge.schedules.map((s) => ({
      frequency: s.frequency as ChallengeShape["schedules"][number]["frequency"],
      dayOfMonth: s.dayOfMonth,
      secondDayOfMonth: s.secondDayOfMonth,
      dayOfWeek: s.dayOfWeek,
      customDates: s.customDates as string[] | null,
    })),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage how this challenge runs, looks, and shares info."
      />
      <ChallengeTabs challengeId={challenge.id} isAdmin={isAdmin} />
      <ChallengeSettings challenge={shape} />
    </div>
  );
}