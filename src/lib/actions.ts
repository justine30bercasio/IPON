"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  requireUser,
  destroySession,
  createSession,
  hashPassword,
  validateNewPassword,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  requireAdmin,
  isOrgAdmin,
  shouldBeSuperAdmin,
} from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { determinePeriod } from "@/lib/period";
import { toCents, formatCents } from "@/lib/money";
import type {
  PaymentMethod,
  Frequency,
  Visibility,
  ChallengeStatus,
  TransactionStatus,
  Challenge,
} from "@prisma/client";

function hasOrgAccess(user: SessionUser, orgId: string): boolean {
  return user.role === "SUPER_ADMIN" || user.orgId === orgId;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

const methods: PaymentMethod[] = ["CASH", "GCASH", "BANK_TRANSFER", "OTHER"];

function parseMethod(value: unknown): PaymentMethod {
  return methods.includes(value as PaymentMethod) ? (value as PaymentMethod) : "CASH";
}

function quantizeAmount(value: unknown): number | null {
  return toCents(value);
}

async function writeLog(opts: {
  orgId?: string | null;
  challengeId?: string | null;
  userId?: string | null;
  type: string;
  message: string;
  metadata?: Prisma.InputJsonValue | undefined;
}): Promise<void> {
  await prisma.activityLog.create({
    data: {
      orgId: opts.orgId ?? null,
      challengeId: opts.challengeId ?? null,
      userId: opts.userId ?? null,
      type: opts.type,
      message: opts.message,
      metadata: opts.metadata ?? Prisma.JsonNull,
    },
  });
}

function parseCustomDatesRaw(value: string): string[] {
  return value
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function randomPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export type ActionResult =
  | { ok: true; message?: string; code?: string }
  | { ok: false; error: string };

export async function logoutAction(): Promise<ActionResult> {
  await destroySession();
  return { ok: true, message: "Signed out" };
}

export async function loginAction(
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const emailOrUsername = String(formData.get("emailOrUsername") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!emailOrUsername || !password) {
    return { ok: false, error: "Enter your email/username and password." };
  }
  const remember = formData.get("remember") === "on";
  const res = await loginUser(emailOrUsername, password, remember);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, message: "Welcome back!" };
}

export async function registerAction(
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (name.length < 2) return { ok: false, error: "Enter your full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (username.length < 3) {
    return { ok: false, error: "Username must be at least 3 characters." };
  }
  const pwCheck = validateNewPassword(password);
  if (pwCheck) return { ok: false, error: pwCheck };
  const res = await registerUser({ name, email, username, password });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, message: "Account created!" };
}

export async function forgotPasswordAction(
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const res = await requestPasswordReset(email);
  if (res.status === "rate-limited") {
    return {
      ok: false,
      error: "Too many reset requests for that email. Try again in 15 minutes.",
    };
  }
  return {
    ok: true,
    message: "If an account exists for that email, a reset request was created.",
    code: res.devCode,
  };
}

export async function resetPasswordAction(
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) return { ok: false, error: "Passwords don't match." };
  const pwCheck = validateNewPassword(password);
  if (pwCheck) return { ok: false, error: pwCheck };
  const res = await resetPassword(token, password);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, message: "Password updated!" };
}

export async function createChallengeAction(
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isOrgAdmin(user)) {
    return { ok: false, error: "Only organizers can create challenges." };
  }

  let targetOrgId = user.orgId;
  if (user.role === "SUPER_ADMIN") {
    const rawOrg = String(formData.get("orgId") ?? "").trim();
    if (rawOrg) {
      const org = await prisma.organization.findUnique({ where: { id: rawOrg } });
      if (!org) return { ok: false, error: "Organization not found." };
      targetOrgId = org.id;
    }
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) return { ok: false, error: "Challenge name must be at least 3 characters." };

  const description = String(formData.get("description") ?? "").trim() || null;
  const startDate = parseDate(formData.get("startDate"));
  const endRaw = formData.get("endDate");
  const endDate = endRaw && String(endRaw).trim() ? parseDate(endRaw) : null;
  if (endDate && endDate <= startDate) {
    return { ok: false, error: "End date must be after the start date." };
  }
  const frequency = String(formData.get("frequency") ?? "") as Frequency;
  const validity: Frequency[] = ["MONTHLY", "WEEKLY", "BIWEEKLY", "TWICE_MONTHLY", "CUSTOM", "FLEXIBLE"];
  if (!validity.includes(frequency)) {
    return { ok: false, error: "Please pick a contribution schedule." };
  }

  const dayOfMonth = parseInt(String(formData.get("dayOfMonth") ?? "0"), 10);
  const secondDayOfMonth = parseInt(String(formData.get("secondDayOfMonth") ?? "0"), 10);
  const dayOfWeek = parseInt(String(formData.get("dayOfWeek") ?? "0"), 10);
  const customDatesRaw = String(formData.get("customDates") ?? "").trim();
  const customDates = parseCustomDatesRaw(customDatesRaw);

  if (frequency === "MONTHLY" && !(dayOfMonth >= 1 && dayOfMonth <= 31)) {
    return { ok: false, error: "Monthly schedule needs a day of the month (1–31)." };
  }
  if (frequency === "TWICE_MONTHLY" && !(dayOfMonth >= 1 && dayOfMonth <= 31)) {
    return { ok: false, error: "Twice-a-month schedule needs two days of the month." };
  }
  if (frequency === "CUSTOM" && customDates.length === 0) {
    return { ok: false, error: "Custom schedule needs at least one valid collection date (YYYY-MM-DD)." };
  }

  const visibilityRaw = String(formData.get("visibility") ?? "GROUP_TOTALS");
  const visibility = ["PRIVATE", "GROUP_TOTALS", "TRANSPARENT"].includes(visibilityRaw)
    ? (visibilityRaw as Visibility)
    : "GROUP_TOTALS";
  const leaderboardEnabled = formData.get("leaderboardEnabled") === "on";
  const allowMemberHulog = formData.get("allowMemberHulog") !== "off";

  const challenge = await prisma.challenge.create({
    data: {
      orgId: targetOrgId,
      name,
      description,
      startDate,
      endDate,
      createdById: user.id,
      visibility,
      leaderboardEnabled,
      allowMemberHulog,
      schedules: {
        create: {
          frequency,
          dayOfMonth: dayOfMonth >= 1 && dayOfMonth <= 31 ? dayOfMonth : null,
          secondDayOfMonth:
            frequency === "TWICE_MONTHLY" && secondDayOfMonth >= 1 && secondDayOfMonth <= 31
              ? secondDayOfMonth
              : null,
          dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : null,
          customDates:
            frequency === "CUSTOM"
              ? (customDates as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      },
    },
  });

  await prisma.challengeMember.create({
    data: { challengeId: challenge.id, userId: user.id, isAdmin: true },
  });
  await writeLog({
    orgId: challenge.orgId,
    challengeId: challenge.id,
    userId: user.id,
    type: "challenge",
    message: `${user.name} created the challenge`,
  });

  revalidateAll();
  return { ok: true, message: challenge.id };
}

export async function updateChallengeSettingsAction(
  challengeId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const challenge = await getOrCreateChallengeForAdmin(user, challengeId);
  if (!challenge) return { ok: false, error: "Challenge not found." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) return { ok: false, error: "Challenge name must be at least 3 characters." };

  const visibilityRaw = String(formData.get("visibility") ?? "GROUP_TOTALS");
  const visibility = ["PRIVATE", "GROUP_TOTALS", "TRANSPARENT"].includes(visibilityRaw)
    ? (visibilityRaw as Visibility)
    : "GROUP_TOTALS";
  const leaderboardEnabled = formData.get("leaderboardEnabled") === "on";
  const allowMemberHulog = formData.get("allowMemberHulog") !== "off";
  const statusRaw = String(formData.get("status") ?? "ACTIVE");
  const status = ["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"].includes(statusRaw)
    ? (statusRaw as ChallengeStatus)
    : "ACTIVE";

  const endRaw = String(formData.get("endDate") ?? "").trim();
  let endDate: Date | null = challenge.endDate;
  if (endRaw) {
    const parsedEnd = parseDate(endRaw);
    if (parsedEnd <= challenge.startDate) {
      return { ok: false, error: "End date must be after the start date." };
    }
    endDate = parsedEnd;
  } else {
    endDate = null;
  }

  await prisma.challenge.update({
    where: { id: challenge.id },
    data: {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      endDate,
      visibility,
      leaderboardEnabled,
      allowMemberHulog,
      status,
    },
  });

  revalidateAll();
  return { ok: true, message: "Challenge updated." };
}

export async function updateScheduleAction(
  challengeId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const challenge = await getOrCreateChallengeForAdmin(user, challengeId);
  if (!challenge) return { ok: false, error: "Challenge not found." };

  const frequency = String(formData.get("frequency") ?? "") as Frequency;
  const validity: Frequency[] = ["MONTHLY", "WEEKLY", "BIWEEKLY", "TWICE_MONTHLY", "CUSTOM", "FLEXIBLE"];
  if (!validity.includes(frequency)) return { ok: false, error: "Invalid schedule." };

  const dayOfMonth = parseInt(String(formData.get("dayOfMonth") ?? "0"), 10);
  const secondDayOfMonth = parseInt(String(formData.get("secondDayOfMonth") ?? "0"), 10);
  const dayOfWeek = parseInt(String(formData.get("dayOfWeek") ?? "0"), 10);
  const customDatesRaw = String(formData.get("customDates") ?? "").trim();
  const customDates = parseCustomDatesRaw(customDatesRaw);

  if (frequency === "MONTHLY" && !(dayOfMonth >= 1 && dayOfMonth <= 31)) {
    return { ok: false, error: "Monthly schedule needs a day of the month." };
  }
  if (frequency === "CUSTOM" && customDates.length === 0) {
    return { ok: false, error: "Custom schedule needs at least one valid date (YYYY-MM-DD)." };
  }

  const schedule = await prisma.challengeSchedule.findFirst({
    where: { challengeId: challenge.id },
  });
  const data = {
    frequency,
    dayOfMonth: dayOfMonth >= 1 && dayOfMonth <= 31 ? dayOfMonth : null,
    secondDayOfMonth:
      frequency === "TWICE_MONTHLY" && secondDayOfMonth >= 1 && secondDayOfMonth <= 31
        ? secondDayOfMonth
        : null,
    dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : null,
    customDates:
      frequency === "CUSTOM"
        ? (customDates as Prisma.InputJsonValue)
        : Prisma.JsonNull,
  };
  if (schedule) {
    await prisma.challengeSchedule.update({ where: { id: schedule.id }, data });
  } else {
    await prisma.challengeSchedule.create({ data: { challengeId: challenge.id, ...data } });
  }

  revalidateAll();
  return { ok: true, message: "Schedule updated." };
}

export async function deleteChallengeAction(
  challengeId: string
): Promise<ActionResult> {
  const user = await requireUser();
  const challenge = await getOrCreateChallengeForAdmin(user, challengeId);
  if (!challenge) return { ok: false, error: "Challenge not found." };

  await prisma.challenge.delete({ where: { id: challenge.id } });
  revalidateAll();
  return { ok: true };
}

export async function addHulogAction(
  challengeId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const kind = String(formData.get("kind") ?? "").trim() === "withdraw" ? "withdraw" : "hulog";
  const amount = quantizeAmount(formData.get("amount"));
  if (amount === null) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  const signedAmount = kind === "withdraw" ? -amount : amount;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { schedules: true },
  });
  if (!challenge) return { ok: false, error: "Challenge not found." };
  if (!hasOrgAccess(user, challenge.orgId)) {
    return { ok: false, error: "Not authorized." };
  }
  if (challenge.status !== "ACTIVE") {
    return { ok: false, error: "This challenge is not currently active." };
  }
  if (!challenge.allowMemberHulog && !isOrgAdmin(user)) {
    return { ok: false, error: "Member hulog recording is disabled by the organizer." };
  }

  const isAdmin = isOrgAdmin(user);
  if (kind === "withdraw" && !isAdmin) {
    return { ok: false, error: "Only organizers can record withdrawals." };
  }
  const directMemberId = String(formData.get("memberId") ?? "").trim();

  // Admins may record a hulog on behalf of any member of the challenge.
  // Everyone else is always attributed to their own membership.
  const membership = isAdmin && directMemberId
    ? await prisma.challengeMember.findUnique({
        where: { id: directMemberId },
      })
    : await prisma.challengeMember.findUnique({
        where: { challengeId_userId: { challengeId: challenge.id, userId: user.id } },
      });
  if (!membership || membership.challengeId !== challenge.id) {
    return { ok: false, error: "You're not a member of this challenge." };
  }
  if (membership.status !== "ACTIVE" && !isOrgAdmin(user)) {
    return { ok: false, error: "Your membership is inactive." };
  }

  const recent = await prisma.hulogTransaction.findFirst({
    where: {
      memberId: membership.id,
      amount: signedAmount,
      status: { not: "VOIDED" },
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (recent) {
    return {
      ok: false,
      error:
        kind === "withdraw"
          ? `A withdrawal of ${formatCents(amount)} was just recorded. Refresh the list first if it didn't show up, or record a different amount.`
          : `A hulog of ${formatCents(amount)} was just recorded. Refresh the list first if it didn't show up, or record a different amount.`,
    };
  }

  const date = parseDate(formData.get("date"));
  const schedule = challenge.schedules[0];
  const period = determinePeriod(schedule?.frequency ?? "MONTHLY", date);
  const status: TransactionStatus = isAdmin ? "CONFIRMED" : "PENDING";

  const tx = await prisma.hulogTransaction.create({
    data: {
      challengeId: challenge.id,
      memberId: membership.id,
      amount: signedAmount,
      transactionDate: date,
      collectionPeriod: period,
      paymentMethod: parseMethod(formData.get("paymentMethod")),
      status,
      note: String(formData.get("note") ?? "").trim() || null,
      createdByUserId: user.id,
      confirmedByUserId: isAdmin ? user.id : null,
      confirmedAt: isAdmin ? new Date() : null,
    },
  });

  const targetMember = await prisma.user.findUnique({ where: { id: membership.userId }, select: { id: true, name: true } });
  await writeLog({
    orgId: challenge.orgId,
    challengeId: challenge.id,
    userId: user.id,
    type: kind === "withdraw" ? "hulog_withdraw" : "hulog",
    message:
      kind === "withdraw"
        ? `${user.name} recorded a ${formatCents(amount)} withdrawal${
            targetMember && targetMember.id !== user.id ? ` for ${targetMember.name}` : ""
          }`
        : `${user.name} added a ${formatCents(amount)} hulog${
            targetMember && targetMember.id !== user.id ? ` for ${targetMember.name}` : ""
          }`,
    metadata: { amount: signedAmount, transactionId: tx.id, status, kind },
  });

  if (isAdmin) {
    await prisma.notification.create({
      data: {
        userId: membership.userId,
        challengeId: challenge.id,
        type: "success",
        title:
          kind === "withdraw"
            ? `Your ${formatCents(amount)} withdrawal was confirmed`
            : `Your ${formatCents(amount)} hulog was confirmed`,
        body:
          kind === "withdraw"
            ? `${user.name} recorded your withdrawal for ${period}.`
            : `${user.name} recorded your hulog for ${period}.`,
        link: "/hulog",
      },
    });
  } else {
    await prisma.notification.create({
      data: {
        userId: user.id,
        challengeId: challenge.id,
        type: "hulog",
        title: `Your ${formatCents(amount)} hulog was recorded`,
        body: `Submitted for ${period}. It will be counted once the organizer confirms it.`,
        link: "/hulog",
      },
    });
    await createAdminNotification(
      challenge,
      user.name,
      `${formatCents(amount)} hulog awaiting confirmation`,
      `${user.name} added a hulog on ${period}.`
    );
  }

  revalidateAll();
  return {
    ok: true,
    message: isAdmin
      ? kind === "withdraw"
        ? "Withdrawal recorded."
        : "Hulog recorded."
      : "Hulog submitted. Waiting for the organizer's confirmation.",
  };
}

export async function recordHulogForMemberAction(
  challengeId: string,
  memberId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isOrgAdmin(user)) return { ok: false, error: "Admin access required." };
  const kind = String(formData.get("kind") ?? "").trim() === "withdraw" ? "withdraw" : "hulog";
  const amount = quantizeAmount(formData.get("amount"));
  if (amount === null) return { ok: false, error: "Enter an amount greater than zero." };
  const signedAmount = kind === "withdraw" ? -amount : amount;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { schedules: true },
  });
  if (!challenge) return { ok: false, error: "Challenge not found." };
  if (!hasOrgAccess(user, challenge.orgId)) return { ok: false, error: "Not authorized." };
  const membership = await prisma.challengeMember.findUnique({ where: { id: memberId } });
  if (!membership || membership.challengeId !== challenge.id) {
    return { ok: false, error: "Member not found in this challenge." };
  }

  const date = parseDate(formData.get("date"));
  const schedule = challenge.schedules[0];
  const period = determinePeriod(schedule?.frequency ?? "MONTHLY", date);

  const tx = await prisma.hulogTransaction.create({
    data: {
      challengeId: challenge.id,
      memberId: membership.id,
      amount: signedAmount,
      transactionDate: date,
      collectionPeriod: period,
      paymentMethod: parseMethod(formData.get("paymentMethod")),
      status: "CONFIRMED",
      note: String(formData.get("note") ?? "").trim() || null,
      createdByUserId: user.id,
      confirmedByUserId: user.id,
      confirmedAt: new Date(),
    },
  });

  const memberUser = await prisma.user.findUnique({ where: { id: membership.userId } });
  await writeLog({
    orgId: challenge.orgId,
    challengeId: challenge.id,
    userId: user.id,
    type: kind === "withdraw" ? "hulog_withdraw" : "hulog",
    message:
      kind === "withdraw"
        ? `${user.name} recorded a ${formatCents(amount)} withdrawal${
            memberUser && memberUser.id !== user.id ? ` for ${memberUser.name}` : ""
          }`
        : `${user.name} recorded a ${formatCents(amount)} hulog${
            memberUser && memberUser.id !== user.id ? ` for ${memberUser.name}` : ""
          }`,
    metadata: { amount: signedAmount, transactionId: tx.id, kind },
  });
  if (memberUser && memberUser.id !== user.id) {
    await prisma.notification.create({
      data: {
        userId: memberUser.id,
        challengeId: challenge.id,
        type: "success",
        title:
          kind === "withdraw"
            ? `Your ${formatCents(amount)} withdrawal was confirmed`
            : `Your ${formatCents(amount)} hulog was confirmed`,
        body:
          kind === "withdraw"
            ? `${user.name} recorded your withdrawal for ${period}.`
            : `${user.name} recorded your hulog for ${period}.`,
        link: "/hulog",
      },
    });
  }

  revalidateAll();
  return { ok: true, message: kind === "withdraw" ? "Withdrawal recorded." : "Hulog recorded." };
}

export async function confirmTransactionAction(
  transactionId: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isOrgAdmin(user)) return { ok: false, error: "Admin access required." };

  const tx = await prisma.hulogTransaction.findUnique({
    where: { id: transactionId },
    include: { member: true, challenge: true },
  });
  if (!tx) return { ok: false, error: "Transaction not found." };
  if (!hasOrgAccess(user, tx.challenge.orgId)) return { ok: false, error: "Not authorized." };
  if (tx.status !== "PENDING") {
    return { ok: false, error: "Only pending hulog entries can be confirmed." };
  }

  await prisma.hulogTransaction.updateMany({
    where: { id: tx.id, status: "PENDING" },
    data: {
      status: "CONFIRMED",
      confirmedByUserId: user.id,
      confirmedAt: new Date(),
    },
  });
  const memberUser = await prisma.user.findUnique({ where: { id: tx.member.userId } });
  if (memberUser && memberUser.id !== user.id) {
    await prisma.notification.create({
      data: {
        userId: memberUser.id,
        challengeId: tx.challengeId,
        type: "success",
        title: `Your ${formatCents(Math.abs(tx.amount))} hulog was confirmed`,
        body: `Confirmed by ${user.name} for ${tx.collectionPeriod}.`,
        link: "/hulog",
      },
    });
  }
  await writeLog({
    orgId: tx.challenge.orgId,
    challengeId: tx.challengeId,
    userId: user.id,
    type: "hulog_confirmed",
    message: `${user.name} confirmed a ${formatCents(Math.abs(tx.amount))} hulog for ${tx.collectionPeriod}`,
    metadata: { transactionId: tx.id, memberId: tx.memberId },
  });
  revalidateAll();
  return { ok: true, message: "Hulog confirmed." };
}

export async function voidTransactionAction(
  transactionId: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isOrgAdmin(user)) return { ok: false, error: "Admin access required." };
  const tx = await prisma.hulogTransaction.findUnique({
    where: { id: transactionId },
    include: { member: { select: { userId: true } } },
  });
  if (!tx) return { ok: false, error: "Transaction not found." };
  const challenge = await prisma.challenge.findUnique({
    where: { id: tx.challengeId },
    select: { orgId: true },
  });
  if (!challenge || !hasOrgAccess(user, challenge.orgId)) {
    return { ok: false, error: "Not authorized." };
  }
  if (tx.status === "VOIDED") {
    return { ok: false, error: "This entry is already voided." };
  }

  await prisma.hulogTransaction.update({
    where: { id: tx.id },
    data: {
      status: "VOIDED",
      voidedByUserId: user.id,
      voidedAt: new Date(),
    },
  });
  if (tx.member.userId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: tx.member.userId,
        challengeId: tx.challengeId,
        type: "hulog",
        title: `Your ${formatCents(Math.abs(tx.amount))} hulog was voided`,
        body: `Voided by ${user.name}. This entry no longer counts toward your total.`,
        link: "/hulog",
      },
    });
  }
  await writeLog({
    orgId: challenge.orgId,
    challengeId: tx.challengeId,
    userId: user.id,
    type: "hulog_voided",
    message: `${user.name} voided a ${formatCents(Math.abs(tx.amount))} transaction`,
    metadata: { transactionId: tx.id, memberId: tx.member.userId },
  });
  revalidateAll();
  return { ok: true, message: "Transaction voided." };
}

export async function editTransactionAction(
  transactionId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const amount = quantizeAmount(formData.get("amount"));
  if (amount === null) return { ok: false, error: "Enter an amount greater than zero." };

  const tx = await prisma.hulogTransaction.findUnique({
    where: { id: transactionId },
    include: {
      challenge: { include: { schedules: true } },
      member: { select: { userId: true } },
    },
  });
  if (!tx) return { ok: false, error: "Transaction not found." };
  if (!hasOrgAccess(user, tx.challenge.orgId)) {
    return { ok: false, error: "Not authorized." };
  }
  if (!isOrgAdmin(user) && tx.member.userId !== user.id) {
    return { ok: false, error: "You can only edit your own transactions." };
  }
  if (tx.status === "VOIDED") return { ok: false, error: "Voided transactions can't be edited." };
  if (!isOrgAdmin(user) && tx.status === "CONFIRMED") {
    return {
      ok: false,
      error: "Confirmed hulog can only be adjusted by an organizer. Ask your organizer to fix it.",
    };
  }

  const date = parseDate(formData.get("date"));
  const schedule = tx.challenge.schedules[0];
  const period = determinePeriod(schedule?.frequency ?? "MONTHLY", date);
  const signedAmount = tx.amount < 0 ? -amount : amount;
  const newStatus: TransactionStatus = isOrgAdmin(user) ? "CONFIRMED" : "PENDING";

  const updated = await prisma.hulogTransaction.update({
    where: { id: tx.id },
    data: {
      amount: signedAmount,
      transactionDate: date,
      collectionPeriod: period,
      paymentMethod: parseMethod(formData.get("paymentMethod")),
      note: String(formData.get("note") ?? "").trim() || null,
      status: newStatus,
      confirmedByUserId: newStatus === "PENDING" ? null : undefined,
      confirmedAt: newStatus === "PENDING" ? null : undefined,
    },
  });
  if (newStatus === "CONFIRMED" && !updated.confirmedByUserId && isOrgAdmin(user)) {
    await prisma.hulogTransaction.update({
      where: { id: tx.id },
      data: { confirmedByUserId: user.id, confirmedAt: new Date() },
    });
  }
  if (!isOrgAdmin(user)) {
    await createAdminNotification(
      tx.challenge,
      user.name,
      `${formatCents(amount)} hulog awaiting confirmation`,
      `${user.name} edited a hulog on ${period}.`
    );
  }
  await writeLog({
    orgId: tx.challenge.orgId,
    challengeId: tx.challengeId,
    userId: user.id,
    type: "hulog_edited",
    message: `${user.name} updated a ${formatCents(amount)} hulog entry to status ${newStatus.toLowerCase()}`,
    metadata: { transactionId: tx.id, previousStatus: tx.status, amount: signedAmount },
  });
  revalidateAll();
  return { ok: true, message: "Transaction updated." };
}

export async function addMembersAction(
  challengeId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const challenge = await getOrCreateChallengeForAdmin(user, challengeId);
  if (!challenge) return { ok: false, error: "Challenge not found." };

  const raw = String(formData.get("members") ?? "");
  const names = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) return { ok: false, error: "Enter at least one member." };

  let created = 0;
  let errors = 0;
  const newAccounts: { email: string; password: string }[] = [];

  for (const line of names) {
    const parts = line.split(",").map((p) => p.trim());
    const email = (parts[0] ?? "").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors++;
      continue;
    }
    const memberName = parts[1] || email.split("@")[0];
    const baseUsername = email
      .split("@")[0]
      .replace(/[^a-z0-9_.-]/gi, "")
      .toLowerCase();
    let memberUser = await prisma.user.findUnique({ where: { email } });
    if (memberUser && memberUser.orgId !== challenge.orgId) {
      errors++;
      continue;
    }
    if (!memberUser) {
      const existing = await prisma.user.findUnique({
        where: { username: baseUsername },
        select: { id: true },
      });
      const username = existing
        ? `${baseUsername}-${Math.random().toString(36).slice(2, 6)}`
        : baseUsername;
      const password = randomPassword();
      memberUser = await prisma.user.create({
        data: {
          email,
          username,
          name: memberName,
          passwordHash: await hashPassword(password),
          role: "MEMBER",
          isActive: true,
          orgId: challenge.orgId,
          mustChangePassword: true,
        },
      });
      newAccounts.push({ email, password });
    }
    const exists = await prisma.challengeMember.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId: memberUser.id } },
    });
    if (!exists) {
      await prisma.challengeMember.create({
        data: { challengeId: challenge.id, userId: memberUser.id },
      });
      await prisma.notification.create({
        data: {
          userId: memberUser.id,
          challengeId: challenge.id,
          type: "member",
          title: "You were added to a challenge",
          body: `${user.name} added you to “${challenge.name}”.`,
          link: `/challenges/${challenge.id}`,
        },
      });
      await writeLog({
        orgId: challenge.orgId,
        challengeId: challenge.id,
        userId: user.id,
        type: "member",
        message: `${memberUser.name} joined the challenge`,
      });
      created++;
    }
  }

  revalidateAll();
  if (errors > 0 && created === 0) {
    return { ok: false, error: `${errors} invalid email address(es).` };
  }
  const passwordNote =
    newAccounts.length > 0
      ? ` New accounts (sign in with your email): ${newAccounts
          .map((a) => `${a.email} / ${a.password}`)
          .join(", ")}`
      : "";
  return {
    ok: true,
    message: `${created} member${created === 1 ? "" : "s"} added${errors ? `, ${errors} skipped` : ""}.${passwordNote}`,
  };
}

export async function adminAddMembersAction(
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAdmin();

  const rawOrg = String(formData.get("orgId") ?? "").trim();
  const targetOrgId = rawOrg && hasOrgAccess(user, rawOrg) ? rawOrg : user.orgId;

  const raw = String(formData.get("members") ?? "");
  const names = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) return { ok: false, error: "Enter at least one member." };

  let created = 0;
  let errors = 0;
  const newAccounts: { email: string; password: string }[] = [];

  for (const line of names) {
    const parts = line.split(",").map((p) => p.trim());
    const email = (parts[0] ?? "").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors++;
      continue;
    }
    const memberName = parts[1] || email.split("@")[0];
    const baseUsername = email
      .split("@")[0]
      .replace(/[^a-z0-9_.-]/gi, "")
      .toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      errors++;
      continue;
    }
    let username = baseUsername;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}-${suffix++}`;
    }
    const password = randomPassword();
    await prisma.user.create({
      data: {
        email,
        username,
        name: memberName,
        passwordHash: await hashPassword(password),
        role: "MEMBER",
        isActive: true,
        orgId: targetOrgId,
        mustChangePassword: true,
      },
    });
    newAccounts.push({ email, password });
    created++;
  }

  await writeLog({
    orgId: targetOrgId,
    userId: user.id,
    type: "member",
    message: `${user.name} created ${created} member account(s)`,
    metadata: { created },
  });

  revalidateAll();
  if (errors > 0 && created === 0) {
    return { ok: false, error: `${errors} invalid or already-registered email address(es).` };
  }
  const passwordNote =
    newAccounts.length > 0
      ? ` Sign in with your email. Temporary passwords: ${newAccounts
          .map((a) => `${a.email} / ${a.password}`)
          .join(", ")}`
      : "";
  return {
    ok: true,
    message: `${created} member${created === 1 ? "" : "s"} created${errors ? `, ${errors} skipped` : ""}.${passwordNote}`,
  };
}

export async function adminAddOrgMembersAction(
  orgId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Super admin access required." };
  }
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return { ok: false, error: "Organization not found." };

  const raw = String(formData.get("members") ?? "");
  const names = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) return { ok: false, error: "Enter at least one member." };

  let created = 0;
  let errors = 0;
  const newAccounts: { email: string; password: string }[] = [];

  for (const line of names) {
    const parts = line.split(",").map((p) => p.trim());
    const email = (parts[0] ?? "").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors++;
      continue;
    }
    const memberName = parts[1] || email.split("@")[0];
    const baseUsername = email
      .split("@")[0]
      .replace(/[^a-z0-9_.-]/gi, "")
      .toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      errors++;
      continue;
    }
    let username = baseUsername;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}-${suffix++}`;
    }
    const password = randomPassword();
    await prisma.user.create({
      data: {
        email,
        username,
        name: memberName,
        passwordHash: await hashPassword(password),
        role: "MEMBER",
        isActive: true,
        orgId: org.id,
        mustChangePassword: true,
      },
    });
    newAccounts.push({ email, password });
    created++;
  }

  await writeLog({
    orgId: org.id,
    userId: user.id,
    type: "member",
    message: `${user.name} created ${created} member account(s) in ${org.name}`,
    metadata: { created },
  });

  revalidateAll();
  if (errors > 0 && created === 0) {
    return { ok: false, error: `${errors} invalid or already-registered email address(es).` };
  }
  const passwordNote =
    newAccounts.length > 0
      ? ` Temporary passwords: ${newAccounts.map((a) => `${a.email} / ${a.password}`).join(", ")}`
      : "";
  return {
    ok: true,
    message: `${created} member${created === 1 ? "" : "s"} created in ${org.name}${errors ? `, ${errors} skipped` : ""}.${passwordNote}`,
  };
}

export async function createOrgChallengeAction(
  orgId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Super admin access required." };
  }
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return { ok: false, error: "Organization not found." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) return { ok: false, error: "Challenge name must be at least 3 characters." };
  const description = String(formData.get("description") ?? "").trim() || null;
  const startDate = parseDate(formData.get("startDate"));
  const endRaw = formData.get("endDate");
  const endDate = endRaw && String(endRaw).trim() ? parseDate(endRaw) : null;
  if (endDate && endDate <= startDate) {
    return { ok: false, error: "End date must be after the start date." };
  }
  const frequency = String(formData.get("frequency") ?? "MONTHLY") as Frequency;
  const validity: Frequency[] = ["MONTHLY", "WEEKLY", "BIWEEKLY", "TWICE_MONTHLY", "CUSTOM", "FLEXIBLE"];
  if (!validity.includes(frequency)) {
    return { ok: false, error: "Please pick a contribution schedule." };
  }
  const dayOfMonth = parseInt(String(formData.get("dayOfMonth") ?? "0"), 10);
  const secondDayOfMonth = parseInt(String(formData.get("secondDayOfMonth") ?? "0"), 10);
  const dayOfWeek = parseInt(String(formData.get("dayOfWeek") ?? "0"), 10);
  const customDatesRaw = String(formData.get("customDates") ?? "").trim();
  const customDates = parseCustomDatesRaw(customDatesRaw);
  if (frequency === "MONTHLY" && !(dayOfMonth >= 1 && dayOfMonth <= 31)) {
    return { ok: false, error: "Monthly schedule needs a day of the month (1–31)." };
  }
  if (frequency === "TWICE_MONTHLY" && !(dayOfMonth >= 1 && dayOfMonth <= 31)) {
    return { ok: false, error: "Twice-a-month schedule needs two days of the month." };
  }
  if (frequency === "CUSTOM" && customDates.length === 0) {
    return { ok: false, error: "Custom schedule needs at least one valid collection date (YYYY-MM-DD)." };
  }

  const visibilityRaw = String(formData.get("visibility") ?? "GROUP_TOTALS");
  const visibility = ["PRIVATE", "GROUP_TOTALS", "TRANSPARENT"].includes(visibilityRaw)
    ? (visibilityRaw as Visibility)
    : "GROUP_TOTALS";
  const leaderboardEnabled = formData.get("leaderboardEnabled") === "on";
  const allowMemberHulog = formData.get("allowMemberHulog") !== "off";

  const challenge = await prisma.challenge.create({
    data: {
      orgId: org.id,
      name,
      description,
      startDate,
      endDate,
      createdById: user.id,
      visibility,
      leaderboardEnabled,
      allowMemberHulog,
      schedules: {
        create: {
          frequency,
          dayOfMonth: dayOfMonth >= 1 && dayOfMonth <= 31 ? dayOfMonth : null,
          secondDayOfMonth:
            frequency === "TWICE_MONTHLY" && secondDayOfMonth >= 1 && secondDayOfMonth <= 31
              ? secondDayOfMonth
              : null,
          dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : null,
          customDates:
            frequency === "CUSTOM"
              ? (customDates as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      },
    },
  });

  await writeLog({
    orgId: org.id,
    challengeId: challenge.id,
    userId: user.id,
    type: "challenge",
    message: `Super admin created challenge "${challenge.name}" in ${org.name}`,
  });

  revalidateAll();
  return { ok: true, message: `Challenge "${challenge.name}" created in ${org.name}.` };
}

export async function toggleMemberStatusAction(
  memberId: string
): Promise<ActionResult> {
  const user = await requireUser();
  const member = await prisma.challengeMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { name: true } } },
  });
  if (!member) return { ok: false, error: "Member not found." };
  const challenge = await getOrCreateChallengeForAdmin(user, member.challengeId);
  if (!challenge) return { ok: false, error: "Not authorized." };
  if (member.isAdmin) return { ok: false, error: "The organizer can't be deactivated." };

  const newStatus = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.challengeMember.update({
    where: { id: member.id },
    data: { status: newStatus },
  });
  await writeLog({
    orgId: challenge.orgId,
    challengeId: challenge.id,
    userId: user.id,
    type: "member_status",
    message: `${user.name} ${newStatus === "ACTIVE" ? "reactivated" : "deactivated"} ${member.user?.name ?? "a member"}`,
  });
  revalidateAll();
  return {
    ok: true,
    message: newStatus === "ACTIVE" ? "Member reactivated." : "Member deactivated.",
  };
}

export async function removeMemberAction(memberId: string): Promise<ActionResult> {
  const user = await requireUser();
  const member = await prisma.challengeMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { name: true } } },
  });
  if (!member) return { ok: false, error: "Member not found." };
  const challenge = await getOrCreateChallengeForAdmin(user, member.challengeId);
  if (!challenge) return { ok: false, error: "Not authorized." };
  if (member.isAdmin) return { ok: false, error: "The organizer can't be removed." };

  const txCount = await prisma.hulogTransaction.count({
    where: { memberId: member.id },
  });
  if (txCount > 0) {
    return {
      ok: false,
      error: `${member.user.name} has ${txCount} recorded hulog entr${txCount === 1 ? "y" : "ies"}. Deactivate the member instead so their savings history is kept.`,
    };
  }

  await prisma.challengeMember.delete({ where: { id: member.id } });
  await writeLog({
    orgId: challenge.orgId,
    challengeId: challenge.id,
    userId: user.id,
    type: "member_removed",
    message: `${member.user.name} was removed from the challenge`,
  });
  revalidateAll();
  return { ok: true, message: `${member.user.name} removed from the challenge.` };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  revalidateAll();
  return { ok: true };
}

export async function updateProfileAction(
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
  const phone = String(formData.get("phone") ?? "").trim() || null;
  await prisma.user.update({
    where: { id: user.id },
    data: { name, phone },
  });
  revalidateAll();
  return { ok: true, message: "Profile updated." };
}

export async function changePasswordAction(
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { ok: false, error: "User not found." };

  const { compare } = await import("bcryptjs");
  const valid = await compare(current, dbUser.passwordHash);
  if (!valid) return { ok: false, error: "Current password is incorrect." };
  const check = validateNewPassword(next);
  if (check) return { ok: false, error: check };
  if (next !== confirm) return { ok: false, error: "Passwords don't match." };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(next),
      sessionVersion: { increment: 1 },
      mustChangePassword: false,
    },
  });
  await createSession(user.id, true, updated.sessionVersion);
  return { ok: true, message: "Password updated. Other devices were signed out." };
}

export async function resetUserPasswordAction(
  memberId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isOrgAdmin(user)) return { ok: false, error: "Admin access required." };
  const dbUser = await prisma.user.findUnique({ where: { id: memberId } });
  if (!dbUser) return { ok: false, error: "User not found." };
  if (dbUser.role === "SUPER_ADMIN") {
    return {
      ok: false,
      error: "Super admin accounts are managed by the platform owner.",
    };
  }
  if (!hasOrgAccess(user, dbUser.orgId)) return { ok: false, error: "Not authorized." };
  const password = String(formData.get("password") ?? "");
  const pwError = validateNewPassword(password);
  if (pwError) return { ok: false, error: pwError };
  await prisma.user.update({
    where: { id: memberId },
    data: {
      passwordHash: await hashPassword(password),
      sessionVersion: { increment: 1 },
      mustChangePassword: true,
    },
  });
  await writeLog({
    orgId: dbUser.orgId,
    userId: user.id,
    type: "user_password_reset",
    message: `${user.name} reset the password for ${dbUser.name}`,
    metadata: { targetUserId: memberId },
  });
  revalidateAll();
  return {
    ok: true,
    message: `Password reset for ${dbUser.name}. They'll be asked to set a new one on their next sign-in.`,
  };
}

export async function updateMemberProfileAction(
  memberId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isOrgAdmin(user)) return { ok: false, error: "Admin access required." };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Invalid email." };
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const dbUser = await prisma.user.findUnique({ where: { id: memberId } });
  if (!dbUser) return { ok: false, error: "User not found." };
  if (dbUser.role === "SUPER_ADMIN") {
    return {
      ok: false,
      error: "Super admin accounts are managed by the platform owner.",
    };
  }
  if (!hasOrgAccess(user, dbUser.orgId)) return { ok: false, error: "Not authorized." };
  if (shouldBeSuperAdmin({ email })) {
    return { ok: false, error: "That email is reserved for the platform owner." };
  }

  if (email !== dbUser.email) {
    const clash = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (clash) return { ok: false, error: "That email is already in use." };
  }

  await prisma.user.update({ where: { id: memberId }, data: { name, email, phone } });
  await writeLog({
    orgId: dbUser.orgId,
    userId: user.id,
    type: "user_profile",
    message: `${user.name} updated the profile of ${dbUser.name}`,
    metadata: { targetUserId: memberId },
  });
  revalidateAll();
  return { ok: true, message: "Member updated." };
}

async function createAdminNotification(
  challenge: Challenge,
  fromName: string,
  title: string,
  body: string
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: challenge.createdById,
      challengeId: challenge.id,
      type: "hulog",
      title,
      body: `${fromName} · ${body}`,
      link: `/challenges/${challenge.id}`,
    },
  });
}

export async function toggleUserRoleAction(userId: string): Promise<ActionResult> {
  const user = await requireAdmin();
  if (user.id === userId) return { ok: false, error: "You can't change your own role." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };
  if (!hasOrgAccess(user, target.orgId)) return { ok: false, error: "Not authorized." };
  if (target.role === "SUPER_ADMIN") {
    return { ok: false, error: "Super admin roles are managed by the platform owner." };
  }
  const next: "ADMIN" | "MEMBER" = target.role === "ADMIN" ? "MEMBER" : "ADMIN";
  await prisma.user.update({
    where: { id: userId },
    data: { role: next, sessionVersion: { increment: 1 } },
  });
  await writeLog({
    orgId: target.orgId,
    userId: user.id,
    type: "user_role",
    message: `${user.name} changed ${target.name}'s role to ${next}`,
    metadata: { targetUserId: userId, previousRole: target.role },
  });
  revalidateAll();
  return {
    ok: true,
    message:
      next === "ADMIN"
        ? `${target.name} is now an admin.`
        : `${target.name} is now a regular member.`,
  };
}

export async function toggleUserActiveAction(userId: string): Promise<ActionResult> {
  const user = await requireAdmin();
  if (user.id === userId) return { ok: false, error: "You can't deactivate your own account." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };
  if (!hasOrgAccess(user, target.orgId)) return { ok: false, error: "Not authorized." };
  if (target.role === "SUPER_ADMIN") {
    return { ok: false, error: "Super admin accounts cannot be deactivated." };
  }
  const next = !target.isActive;
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: next, sessionVersion: { increment: 1 } },
  });
  await writeLog({
    orgId: target.orgId,
    userId: user.id,
    type: "user_active",
    message: `${user.name} ${next ? "reactivated" : "deactivated"} ${target.name}`,
    metadata: { targetUserId: userId },
  });
  revalidateAll();
  return {
    ok: true,
    message: next
      ? `${target.name} is active again and can sign in.`
      : `${target.name} is now inactive and can no longer sign in.`,
  };
}

export async function deleteUserAction(userId: string): Promise<ActionResult> {
  const user = await requireAdmin();
  if (user.id === userId) return { ok: false, error: "You can't delete your own account." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };
  if (!hasOrgAccess(user, target.orgId)) return { ok: false, error: "Not authorized." };
  if (target.role === "SUPER_ADMIN") {
    return { ok: false, error: "Super admin accounts cannot be deleted." };
  }

  const createdCount = await prisma.challenge.count({ where: { createdById: userId } });
  if (createdCount > 0) {
    return {
      ok: false,
      error: `${target.name} created ${createdCount} challenge${createdCount === 1 ? "" : "s"}. Open that challenge's Settings to delete it first (it contains shared savings data).`,
    };
  }

  const memberRows = await prisma.challengeMember.findMany({
    where: { userId },
    select: { id: true },
  });
  const memberIds = memberRows.map((m) => m.id);
  const txCount =
    memberIds.length > 0
      ? await prisma.hulogTransaction.count({ where: { memberId: { in: memberIds } } })
      : 0;
  if (txCount > 0) {
    return {
      ok: false,
      error: `${target.name} has ${txCount} recorded savings entr${txCount === 1 ? "y" : "ies"} across challenges. Deactivate their account instead so the shared records stay intact.`,
    };
  }

  await prisma.$transaction([
    prisma.challengeMember.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.activityLog.deleteMany({ where: { userId } }),
    prisma.passwordReset.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  await writeLog({
    orgId: target.orgId,
    userId: user.id,
    type: "user_delete",
    message: `${user.name} permanently deleted ${target.name}'s account`,
    metadata: { targetUserId: userId },
  });
  revalidateAll();
  return { ok: true, message: `${target.name} was deleted permanently.` };
}

export async function createOrganizationAction(
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Super admin access required." };
  }
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) return { ok: false, error: "Organization name must be at least 3 characters." };
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length < 3) return { ok: false, error: "Slug must be at least 3 characters (letters, numbers, dashes)." };
  if (await prisma.organization.findUnique({ where: { slug } })) {
    return { ok: false, error: "That slug is already taken." };
  }
  const org = await prisma.organization.create({
    data: { name, slug },
  });
  await writeLog({
    orgId: org.id,
    userId: user.id,
    type: "org_create",
    message: `${user.name} created organization “${name}”`,
    metadata: { slug },
  });
  revalidateAll();
  return { ok: true, message: `Organization “${name}” created.` };
}

export async function renameOrganizationAction(
  orgId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Super admin access required." };
  }
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return { ok: false, error: "Organization not found." };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) return { ok: false, error: "Organization name must be at least 3 characters." };
  await prisma.organization.update({ where: { id: org.id }, data: { name } });
  await writeLog({
    orgId: org.id,
    userId: user.id,
    type: "org_rename",
    message: `${user.name} renamed organization “${org.name}” to “${name}”`,
  });
  revalidateAll();
  return { ok: true, message: "Organization renamed." };
}

export async function createOrgAdminAction(
  orgId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Super admin access required." };
  }
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return { ok: false, error: "Organization not found." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const password = String(formData.get("password") ?? "");
  const pwError = validateNewPassword(password);
  if (pwError) return { ok: false, error: pwError };

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username: email.split("@")[0] }] },
  });
  if (existing) return { ok: false, error: "An account with that email or username already exists." };

  const baseUsername = email
    .split("@")[0]
    .replace(/[^a-z0-9_.-]/gi, "")
    .toLowerCase();
  let username = baseUsername;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = `${baseUsername}-${suffix++}`;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      username,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      isActive: true,
      orgId: org.id,
    },
  });
  await writeLog({
    orgId: org.id,
    userId: user.id,
    type: "user_role",
    message: `${user.name} created org admin ${name} for ${org.name}`,
    metadata: { email },
  });
  revalidateAll();
  return {
    ok: true,
    message: `Admin ${name} created for ${org.name}. Sign in with ${email}.`,
  };
}

async function getOrCreateChallengeForAdmin(
  user: SessionUser,
  challengeId: string
): Promise<Challenge | null> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { members: { where: { userId: user.id, isAdmin: true } } },
  });
  if (!challenge) return null;
  if (user.role !== "SUPER_ADMIN" && challenge.orgId !== user.orgId) return null;
  if (isOrgAdmin(user)) return challenge;
  if (challenge.createdById !== user.id && challenge.members.length === 0) return null;
  return challenge;
}