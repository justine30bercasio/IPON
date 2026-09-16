import { NextResponse } from "next/server";
import { resetPassword, validateNewPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  if (password !== confirm) {
    return NextResponse.json(
      { ok: false, error: "Passwords don't match." },
      { status: 400 }
    );
  }
  const pwCheck = validateNewPassword(password);
  if (pwCheck) {
    return NextResponse.json({ ok: false, error: pwCheck }, { status: 400 });
  }

  const res = await resetPassword(token, password);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, user: res.user });
}