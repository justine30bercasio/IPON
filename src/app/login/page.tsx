"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { Eye, EyeOff, Mail, Lock, Sparkles } from "lucide-react";
import { loginAction, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false, error: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  const [showPw, setShowPw] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("loggedOut=1")) {
      toast("success", "Signed out", "See you soon!");
    }
  }, []);

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-emerald-900/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/15 p-1.5 ring-1 ring-white/20">
            <Image src="/logo.png" alt="IPON" width={1254} height={1254} className="h-full w-full object-contain" priority />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white">IPON</span>
        </div>

        <div className="relative">
          <div className="animate-pop flex justify-center">
            <div className="relative">
              <div className="flex h-48 w-48 items-center justify-center rounded-full bg-white/10 p-8 ring-1 ring-white/20 backdrop-blur-sm">
<Image src="/logo.png" alt="IPON" width={1254} height={1254} className="h-full w-full object-contain" priority />
              </div>
              <span className="absolute -right-6 top-4 animate-pop text-4xl">🪙</span>
              <span className="absolute -left-4 top-16 animate-fade-up text-3xl" style={{ animationDelay: "0.2s" }}>
                💰
              </span>
              <span className="absolute -right-2 bottom-2 animate-fade-up text-3xl" style={{ animationDelay: "0.4s" }}>
                ✨
              </span>
            </div>
          </div>
          <h1 className="mt-8 text-center text-4xl font-extrabold leading-tight tracking-tight text-white">
            Small hulog.
            <br />
            Big progress.
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-center text-white/75">
            A friendly way for coworkers and friends to build savings together —
            every contribution counts, however small.
          </p>
        </div>

        <div className="relative flex items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
          <div className="flex -space-x-2">
            {["Juan", "Maria", "Pedro"].map((n) => (
              <span
                key={n}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-700 ring-2 ring-brand-600"
              >
                {n[0]}
              </span>
            ))}
          </div>
          <p className="text-sm font-medium text-white/85">
            ₱12,450 hulog · 18 contributions this month 🎉
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <Image src="/logo.png" alt="IPON" width={1254} height={1254} className="h-14 w-14 rounded-2xl bg-white object-contain shadow-glow" />
            <div>
              <p className="text-xl font-extrabold tracking-tight text-ink">IPON</p>
              <p className="text-sm text-ink-soft/80">Small hulog. Big progress.</p>
            </div>
          </div>

          <div className="animate-fade-up">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Welcome back 👋</h2>
            <p className="mt-1 text-sm text-ink-soft/80">
              Sign in to check your hulog progress.
            </p>
          </div>

          <form action={formAction} className="mt-7 flex flex-col gap-4">
            <Field label="Email or Username">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                <Input
                  name="emailOrUsername"
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com"
                  className="pl-10"
                  autoFocus
                />
              </div>
            </Field>

            <Field label="Password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                <Input
                  name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 font-medium text-ink-soft">
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked
                  className="h-4 w-4 rounded border-line accent-brand-600"
                />
                Remember me
              </label>
              <Link
                href="/forgot-password"
                className="font-semibold text-brand-700 hover:text-brand-800"
              >
                Forgot password?
              </Link>
            </div>

            {!state.ok && state.error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                {state.error}
              </div>
            )}

            <Button type="submit" size="lg" loading={pending} className="mt-1">
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-ink-soft/80">
            New to IPON?{" "}
            <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-800">
              Create an account
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-line/70 bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <Sparkles className="h-4 w-4 text-brand-600" />
              Try the demo
            </div>
            <p className="mt-1 text-xs text-ink-soft/70">
              Organizer: <span className="font-semibold text-ink">admin@ipon.local</span>
              <br />
              Member: <span className="font-semibold text-ink">juan@ipon.local</span>
              <br />
              Password: <span className="font-semibold text-ink">ipon12345</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}