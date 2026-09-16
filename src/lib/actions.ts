"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  requireUser,
  destroySession,
  hashPassword,
  validateNewPassword,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  requireAdmin,
} from "@/lib/auth";
import { determinePeriod } from "@/lib/period";
import type {
  PaymentMethod,
  Frequency,
  Visibility,
  ChallengeStatus,
  TransactionStatus,
  Challenge,
} from "@prisma/client";

function revalidateAll() {
  revalidatePath("/", "layout");
}

const methods: PaymentMethod[] = ["CASH", "GCASH", "BANK_TRANSFER", "OTHER"];

function parseMethod(value: unknown): PaymentMethod {
  return methods.includes(value as PaymentMethod) ? (value as PaymentMethod) : "CASH";
}

function quantizeAmount(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
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

export type ActionResult =
  | { ok: true; message?: string }
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
  const token = await requestPasswordReset(email);
  return {
    ok: true,
    message:
      token === "reset-needed"
        ? "If that account exists, a reset request was created."
        : token,
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
  if (user.role !== "ADMIN") {
    return { ok: false, error: "Only organizers can create challenges." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) return { ok: false, error: "Challenge name must be at least 3 characters." };

  const description = String(formData.get("description") ?? "").trim() || null;
  const startDate = parseDate(formData.get("startDate"));
  const endRaw = formData.get("endDate");
  const endDate = endRaw && String(endRaw).trim() ? parseDate(endRaw) : null;
  const frequency = String(formData.get("frequency") ?? "") as Frequency;
  const validity: Frequency[] = ["MONTHLY", "WEEKLY", "BIWEEKLY", "TWICE_MONTHLY", "CUSTOM"];
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
  await prisma.activityLog.create({
    data: {
      challengeId: challenge.id,
      userId: user.id,
      type: "challenge",
      message: `${user.name} created the challenge`,
    },
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
  const challenge = await getOrCreateChallengeForAdmin(user.id, challengeId);
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

  await prisma.challenge.update({
    where: { id: challenge.id },
    data: {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      endDate: formData.get("endDate") ? parseDate(formData.get("endDate")) : challenge.endDate,
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
  const challenge = await getOrCreateChallengeForAdmin(user.id, challengeId);
  if (!challenge) return { ok: false, error: "Challenge not found." };

  const frequency = String(formData.get("frequency") ?? "") as Frequency;
  const validity: Frequency[] = ["MONTHLY", "WEEKLY", "BIWEEKLY", "TWICE_MONTHLY", "CUSTOM"];
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
  const challenge = await getOrCreateChallengeForAdmin(user.id, challengeId);
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
  if (challenge.status !== "ACTIVE") {
    return { ok: false, error: "This challenge is not currently active." };
  }
  if (!challenge.allowMemberHulog && user.role !== "ADMIN") {
    return { ok: false, error: "Member hulog recording is disabled by the organizer." };
  }

  const isAdmin = user.role === "ADMIN";
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
  if (membership.status !== "ACTIVE" && user.role !== "ADMIN") {
    return { ok: false, error: "Your membership is inactive." };
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

  await prisma.activityLog.create({
    data: {
      challengeId: challenge.id,
      userId: user.id,
      type: "hulog",
      message:
        kind === "withdraw"
          ? `${user.name} recorded a ₱${amount.toLocaleString("en-PH")} withdrawal`
          : `${user.name} added a ₱${amount.toLocaleString("en-PH")} hulog`,
      metadata: { amount: signedAmount, transactionId: tx.id, status, kind },
    },
  });

  if (isAdmin) {
    await prisma.notification.create({
      data: {
        userId: membership.userId,
        challengeId: challenge.id,
        type: "success",
        title:
          kind === "withdraw"
            ? `Your ₱${amount.toLocaleString("en-PH")} withdrawal was confirmed`
            : `Your ₱${amount.toLocaleString("en-PH")} hulog was confirmed`,
        body:
          kind === "withdraw"
            ? `${user.name} recorded your withdrawal for ${period}.`
            : `${user.name} recorded your hulog for ${period}.`,
        link: "/hulog",
      },
    });
  } else {
    await createAdminNotification(
      challenge,
      user.name,
      `₱${amount.toLocaleString("en-PH")} hulog awaiting confirmation`,
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
  if (user.role !== "ADMIN") return { ok: false, error: "Admin access required." };
  const kind = String(formData.get("kind") ?? "").trim() === "withdraw" ? "withdraw" : "hulog";
  const amount = quantizeAmount(formData.get("amount"));
  if (amount === null) return { ok: false, error: "Enter an amount greater than zero." };
  const signedAmount = kind === "withdraw" ? -amount : amount;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { schedules: true },
  });
  if (!challenge) return { ok: false, error: "Challenge not found." };
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
  await prisma.activityLog.create({
    data: {
      challengeId: challenge.id,
      userId: user.id,
      type: "hulog",
      message:
        kind === "withdraw"
          ? `${user.name} recorded a ₱${amount.toLocaleString("en-PH")} withdrawal${
              memberUser && memberUser.id !== user.id ? ` for ${memberUser.name}` : ""
            }`
          : `${user.name} recorded a ₱${amount.toLocaleString("en-PH")} hulog${
              memberUser && memberUser.id !== user.id ? ` for ${memberUser.name}` : ""
            }`,
      metadata: { amount: signedAmount, transactionId: tx.id, kind },
    },
  });
  if (memberUser && memberUser.id !== user.id) {
    await prisma.notification.create({
      data: {
        userId: memberUser.id,
        challengeId: challenge.id,
        type: "success",
        title:
          kind === "withdraw"
            ? `Your ₱${amount.toLocaleString("en-PH")} withdrawal was confirmed`
            : `Your ₱${amount.toLocaleString("en-PH")} hulog was confirmed`,
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
  if (user.role !== "ADMIN") return { ok: false, error: "Admin access required." };

  const tx = await prisma.hulogTransaction.findUnique({
    where: { id: transactionId },
    include: { member: true, challenge: true },
  });
  if (!tx) return { ok: false, error: "Transaction not found." };

  await prisma.hulogTransaction.update({
    where: { id: tx.id },
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
        title: `Your ₱${tx.amount.toLocaleString("en-PH")} hulog was confirmed`,
        body: `Confirmed by ${user.name} for ${tx.collectionPeriod}.`,
        link: "/hulog",
      },
    });
  }
  revalidateAll();
  return { ok: true, message: "Hulog confirmed." };
}

export async function voidTransactionAction(
  transactionId: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, error: "Admin access required." };
  const tx = await prisma.hulogTransaction.findUnique({ where: { id: transactionId } });
  if (!tx) return { ok: false, error: "Transaction not found." };

  await prisma.hulogTransaction.update({
    where: { id: tx.id },
    data: { status: "VOIDED", confirmedByUserId: user.id, confirmedAt: new Date() },
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
  if (user.role !== "ADMIN" && tx.member.userId !== user.id) {
    return { ok: false, error: "You can only edit your own transactions." };
  }
  if (tx.status === "VOIDED") return { ok: false, error: "Voided transactions can't be edited." };

  const date = parseDate(formData.get("date"));
  const schedule = tx.challenge.schedules[0];
  const period = determinePeriod(schedule?.frequency ?? "MONTHLY", date);

  const updated = await prisma.hulogTransaction.update({
    where: { id: tx.id },
    data: {
      amount,
      transactionDate: date,
      collectionPeriod: period,
      paymentMethod: parseMethod(formData.get("paymentMethod")),
      note: String(formData.get("note") ?? "").trim() || null,
      status: user.role === "ADMIN" ? "CONFIRMED" : "PENDING",
    },
  });
  if (updated.status === "CONFIRMED" && !updated.confirmedByUserId && user.role === "ADMIN") {
    await prisma.hulogTransaction.update({
      where: { id: tx.id },
      data: { confirmedByUserId: user.id, confirmedAt: new Date() },
    });
  }
  revalidateAll();
  return { ok: true, message: "Transaction updated." };
}

export async function addMembersAction(
  challengeId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const challenge = await getOrCreateChallengeForAdmin(user.id, challengeId);
  if (!challenge) return { ok: false, error: "Challenge not found." };

  const raw = String(formData.get("members") ?? "");
  const names = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) return { ok: false, error: "Enter at least one member." };

  let created = 0;
  let errors = 0;

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
    if (!memberUser) {
      const existing = await prisma.user.findUnique({
        where: { username: baseUsername },
        select: { id: true },
      });
      const username = existing
        ? `${baseUsername}-${Math.random().toString(36).slice(2, 6)}`
        : baseUsername;
      memberUser = await prisma.user.create({
        data: {
          email,
          username,
          name: memberName,
          passwordHash: await hashPassword("ipon12345"),
          role: "MEMBER",
          isActive: true,
        },
      });
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
      await prisma.activityLog.create({
        data: {
          challengeId: challenge.id,
          userId: user.id,
          type: "member",
          message: `${memberUser.name} joined the challenge`,
        },
      });
      created++;
    }
  }

  revalidateAll();
  if (errors > 0 && created === 0) {
    return { ok: false, error: `${errors} invalid email address(es).` };
  }
  return {
    ok: true,
    message: `${created} member${created === 1 ? "" : "s"} added${errors ? `, ${errors} skipped` : ""}.`,
  };
}

export async function adminAddMembersAction(
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const raw = String(formData.get("members") ?? "");
  const names = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  if (names.length === 0) return { ok: false, error: "Enter at least one member." };

  let created = 0;
  let errors = 0;

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
    await prisma.user.create({
      data: {
        email,
        username,
        name: memberName,
        passwordHash: await hashPassword("ipon12345"),
        role: "MEMBER",
        isActive: true,
      },
    });
    created++;
  }

  revalidateAll();
  if (errors > 0 && created === 0) {
    return { ok: false, error: `${errors} invalid or already-registered email address(es).` };
  }
  return {
    ok: true,
    message: `${created} member${created === 1 ? "" : "s"} created${errors ? `, ${errors} skipped` : ""}. Default password: ipon12345.`,
  };
}

export async function toggleMemberStatusAction(
  memberId: string
): Promise<ActionResult> {
  const user = await requireUser();
  const member = await prisma.challengeMember.findUnique({ where: { id: memberId } });
  if (!member) return { ok: false, error: "Member not found." };
  const challenge = await getOrCreateChallengeForAdmin(user.id, member.challengeId);
  if (!challenge) return { ok: false, error: "Not authorized." };
  if (member.isAdmin) return { ok: false, error: "The organizer can't be deactivated." };

  const newStatus = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.challengeMember.update({
    where: { id: member.id },
    data: { status: newStatus },
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
  const challenge = await getOrCreateChallengeForAdmin(user.id, member.challengeId);
  if (!challenge) return { ok: false, error: "Not authorized." };
  if (member.isAdmin) return { ok: false, error: "The organizer can't be removed." };

  await prisma.hulogTransaction.deleteMany({ where: { memberId: member.id } });
  await prisma.challengeMember.delete({ where: { id: member.id } });
  await prisma.activityLog.create({
    data: {
      challengeId: challenge.id,
      userId: user.id,
      type: "member",
      message: `${member.user.name} was removed from the challenge`,
    },
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

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });
  return { ok: true, message: "Password updated." };
}

export async function resetUserPasswordAction(
  memberId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, error: "Admin access required." };
  const dbUser = await prisma.user.findUnique({ where: { id: memberId } });
  if (!dbUser) return { ok: false, error: "User not found." };
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  await prisma.user.update({
    where: { id: memberId },
    data: { passwordHash: await hashPassword(password) },
  });
  return { ok: true, message: `Password reset for ${dbUser.name}.` };
}

export async function updateMemberProfileAction(
  memberId: string,
  prev: unknown,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, error: "Admin access required." };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "Name must be at least 2 characters." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Invalid email." };
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const dbUser = await prisma.user.findUnique({ where: { id: memberId } });
  if (!dbUser) return { ok: false, error: "User not found." };

  await prisma.$transaction(async (tx) => {
    try {
      await tx.user.update({ where: { id: memberId }, data: { name, email, phone } });
    } catch {
      throw new Error("That email is already in use.");
    }
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

async function getOrCreateChallengeForAdmin(
  userId: string,
  challengeId: string
): Promise<Challenge | null> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { members: { where: { userId, isAdmin: true } } },
  });
  if (!challenge) return null;
  if (challenge.createdById !== userId && challenge.members.length === 0) return null;
  return challenge;
}