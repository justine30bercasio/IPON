import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const emailOrUsername = String(form.get("emailOrUsername") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const remember = form.get("remember") === "on";
  if (!emailOrUsername || !password) {
    return NextResponse.json(
      { ok: false, error: "Enter your email/username and password." },
      { status: 400 }
    );
  }
  const res = await loginUser(emailOrUsername, password, remember);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 401 });
  }
  return NextResponse.json({ ok: true, user: res.user });
}