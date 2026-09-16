"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { Eye, EyeOff, User, Mail, AtSign, Lock } from "lucide-react";
import { registerAction, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const initial: ActionResult = { ok: false, error: "" };

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initial);
  const [showPw, setShowPw] = React.useState(false);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/logo.png" alt="IPON" width={1254} height={1254} className="h-14 w-14 rounded-2xl bg-white object-contain shadow-glow" />
          <div>
            <p className="text-xl font-extrabold tracking-tight text-ink">Create your account</p>
            <p className="text-sm text-ink-soft/80">Start tracking your hulog today.</p>
          </div>
        </div>

        <form action={formAction} className="animate-fade-up flex flex-col gap-4">
          <Field label="Full Name">
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
              <Input name="name" placeholder="Juan Dela Cruz" className="pl-10" autoFocus />
            </div>
          </Field>
          <Field label="Email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
              <Input name="email" type="email" placeholder="you@example.com" className="pl-10" />
            </div>
          </Field>
          <Field label="Username">
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
              <Input name="username" placeholder="juan" className="pl-10" />
            </div>
          </Field>
          <Field label="Password" hint="At least 6 characters.">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
              <Input
                name="password"
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft/60 hover:bg-mist hover:text-ink"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          {!state.ok && state.error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" loading={pending} className="mt-1">
            Create account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-soft/80">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}