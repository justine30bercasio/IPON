import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import type { User } from "@prisma/client";

const COOKIE_NAME = "ipon_session";
const devSecret = process.env.AUTH_SECRET ?? "ipon-challenge-local-secret";
if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET must be set in production.");
}
const secret = new TextEncoder().encode(devSecret);

export type SessionUser = Pick<
  User,
  "id" | "email" | "username" | "name" | "role" | "isActive"
>;

export async function encrypt(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function decrypt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  remember: boolean = true
): Promise<void> {
  const token = await encrypt({ userId });
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function sessionCookieHeader(
  userId: string,
  remember: boolean = true
): Promise<string> {
  const token = await encrypt({ userId });
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  const secure = process.env.NODE_ENV === "production";
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  return `ipon_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Expires=${expires}${secure ? "; Secure" : ""}`;
}

export async function clearSessionCookieHeader(): Promise<string> {
  return "ipon_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await decrypt(token);
  if (!payload?.userId || typeof payload.userId !== "string") return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
    },
  });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new AuthError("Not signed in");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("Admin access required");
  return user;
}

export class AuthError extends Error {}

export function validateNewPassword(password: string): string | null {
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string };

export async function loginUser(
  emailOrUsername: string,
  password: string,
  remember: boolean = true
): Promise<AuthResult> {
  const handle = emailOrUsername.trim().toLowerCase();
  const allowed = await rateLimit(`login:${handle}`, 5);
  if (!allowed) {
    return { ok: false, error: "Too many login attempts. Try again in 15 minutes." };
  }
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: handle }, { username: emailOrUsername.trim() }],
    },
  });
  if (!user) return { ok: false, error: "Invalid email/username or password." };
  if (!user.isActive) return { ok: false, error: "This account has been deactivated." };
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { ok: false, error: "Invalid email/username or password." };
  await createSession(user.id, remember);
  return {
    ok: true,
    user: { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role, isActive: user.isActive },
  };
}

export async function registerUser(data: {
  name: string;
  email: string;
  username: string;
  password: string;
}): Promise<AuthResult> {
  const email = data.email.trim().toLowerCase();
  const username = data.username.trim().toLowerCase();
  const allowed = await rateLimit(`register:${email}`, 3);
  if (!allowed) {
    return { ok: false, error: "Too many sign-up attempts for that email. Try again in 15 minutes." };
  }
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return { ok: false, error: "An account with that email or username already exists." };
  }
  const passwordHash = await hashPassword(data.password);
  try {
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        username,
        passwordHash,
      },
    });
    await createSession(user.id);
    return {
      ok: true,
      user: { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role, isActive: user.isActive },
    };
  } catch (err) {
    if (isPrismaUniqueError(err)) {
      return { ok: false, error: "An account with that email or username already exists." };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export type ResetRequestResult =
  | { status: "created"; devCode?: string }
  | { status: "rate-limited" };

export async function requestPasswordReset(email: string): Promise<ResetRequestResult> {
  const allowed = await rateLimit(`reset-req:${email.trim().toLowerCase()}`, 3);
  if (!allowed) return { status: "rate-limited" };
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return { status: "created" };
  const token = randomBytes(6).toString("hex").toUpperCase();
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const preview =
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_RESET_CODE_DEBUG === "true";
  return { status: "created", devCode: preview ? token : undefined };
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthResult> {
  const passwordError = validateNewPassword(newPassword);
  if (passwordError) return { ok: false, error: passwordError };
  const allowed = await rateLimit(`reset:${token.trim().toUpperCase()}`, 5);
  if (!allowed) {
    return { ok: false, error: "Too many attempts with that code. Try again in 15 minutes." };
  }
  const reset = await prisma.passwordReset.findUnique({ where: { token: token.trim().toUpperCase() } });
  if (!reset || reset.used || reset.expiresAt < new Date()) {
    return { ok: false, error: "That reset code is invalid or has expired." };
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } }),
  ]);
  await destroySession();
  const user = await prisma.user.findUnique({ where: { id: reset.userId } });
  if (!user) return { ok: false, error: "User not found." };
  await createSession(user.id);
  return {
    ok: true,
    user: { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role, isActive: user.isActive },
  };
}