import { NextResponse } from "next/server";
import { registerUser, validateNewPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (name.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Enter your full name." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email address." },
      { status: 400 }
    );
  }
  if (username.length < 3) {
    return NextResponse.json(
      { ok: false, error: "Username must be at least 3 characters." },
      { status: 400 }
    );
  }
  const pwCheck = validateNewPassword(password);
  if (pwCheck) {
    return NextResponse.json({ ok: false, error: pwCheck }, { status: 400 });
  }

  const res = await registerUser({ name, email, username, password });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, user: res.user });
}