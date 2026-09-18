import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Challenge, Frequency } from "@prisma/client";

export interface ChallengeContext {
  challenge: Challenge & {
    schedules: {
      id: string;
      frequency: Frequency;
      dayOfMonth: number | null;
      secondDayOfMonth: number | null;
      dayOfWeek: number | null;
      customDates: string[] | null;
    }[];
  };
  user: { id: string; name: string; role: string };
  membershipId: string | null;
  isMember: boolean;
  isAdmin: boolean;
  memberStatus: string | null;
}

export async function getChallengeContext(
  challengeId: string
): Promise<ChallengeContext | null> {
  const user = await getSession();
  if (!user) return null;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { schedules: true },
  });
  if (!challenge) return null;
  if (
    user.role !== "SUPER_ADMIN" &&
    (!user.orgId || challenge.orgId !== user.orgId)
  ) {
    return null;
  }

  const membership = await prisma.challengeMember.findUnique({
    where: { challengeId_userId: { challengeId, userId: user.id } },
  });

  const isAdmin =
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    challenge.createdById === user.id ||
    (membership?.isAdmin ?? false);

  return {
    challenge: {
      ...challenge,
      schedules: challenge.schedules.map((s) => ({
        ...s,
        customDates: s.customDates as string[] | null,
      })),
    } as ChallengeContext["challenge"],
    user: { id: user.id, name: user.name, role: user.role },
    membershipId: membership?.id ?? null,
    isMember: !!membership,
    isAdmin,
    memberStatus: membership?.status ?? null,
  };
}

export function canSeeTotals(role: string, visibility: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" || visibility === "GROUP_TOTALS" || visibility === "TRANSPARENT";
}

export function canSeeMemberAmounts(role: string, visibility: string): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" || visibility === "TRANSPARENT";
}

export function canSeeLeaderboard(role: string, visibility: string, leaderboardEnabled: boolean): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" || (leaderboardEnabled && visibility !== "PRIVATE");
}