"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Mail, KeyRound, RotateCcw, Eye, EyeOff } from "lucide-react";
import { forgotPasswordAction, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const initial: ActionResult = { ok: false, error: "" };

export default function ForgotPasswordPage() {
  const [requestState, requestAction, requestPending] = useActionState(
    forgotPasswordAction,
    initial
  );
  const [resetError, setResetError] = React.useState("");
  const [resetBusy, setResetBusy] = React.useState(false);
  const [showPw, setShowPw] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const resetFormRef = React.useRef<HTMLFormElement>(null);
  const router = useRouter();

  React.useEffect(() => {
    const form = resetFormRef.current;
    if (!form) return;
    const onSubmit = async (e: SubmitEvent) => {
      e.preventDefault();
      setResetBusy(true);
      setResetError("");
      try {
        const res = await fetch("/api/auth/reset", { method: "POST", cache: "no-store", body: new FormData(form) });
        const data = await res.json().catch(() => null);
        if (!data?.ok) {
          setResetError(data?.error ?? "Reset failed. Please try again.");
          return;
        }
        router.push("/dashboard");
      } catch {
        setResetError("Something went wrong. Please try again.");
      } finally {
        setResetBusy(false);
      }
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [requestState.ok, router]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) setResetError(err);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const showReset = !!requestState.ok;
  const code = requestState.ok ? requestState.code ?? "" : "";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/logo.png" alt="IPON" width={500} height={500} className="h-20 w-20 rounded-2xl bg-white object-contain shadow-glow" />
          <div>
            <p className="text-xl font-extrabold tracking-tight text-ink">
              {showReset ? "Enter your reset code" : "Reset your password"}
            </p>
            <p className="text-sm text-ink-soft/80">
              {showReset
                ? "Use the code below, then set a new password."
                : "Enter your account email to get started."}
            </p>
          </div>
        </div>

        {!showReset ? (
          <form action={requestAction} className="animate-fade-up flex flex-col gap-4">
            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                <Input name="email" type="email" placeholder="you@example.com" className="pl-10" autoFocus />
              </div>
            </Field>

            {!requestState.ok && requestState.error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                {requestState.error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={requestPending}
              className="mt-1"
            >
              Send reset code
            </Button>
          </form>
        ) : (
          <form ref={resetFormRef} action="/api/auth/reset" method="POST" className="animate-fade-up flex flex-col gap-4">
            {code ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700/70">
                  Your reset code · valid 15 minutes
                </p>
                <p className="mt-1 font-mono text-2xl font-extrabold tracking-[0.25em] text-brand-700">
                  {code}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-center text-sm font-medium text-brand-700">
                {requestState.message}
              </div>
            )}

            <Field label="Reset code">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                <Input
                  name="token"
                  defaultValue={code}
                  placeholder="XXXXXX"
                  className="pl-10 font-mono uppercase tracking-widest"
                  autoFocus
                />
              </div>
            </Field>
            <Field label="New password" hint="At least 6 characters.">
              <div className="relative">
                <Input name="password" type={showPw ? "text" : "password"} placeholder="••••••••" className="pr-11" />
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
            <Field label="Confirm new password">
              <div className="relative">
                <Input name="confirm" type={showConfirm ? "text" : "password"} placeholder="••••••••" className="pr-11" />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft/60 hover:bg-mist hover:text-ink"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            {resetError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                {resetError}
              </div>
            )}

            <Button type="submit" size="lg" loading={resetBusy} className="mt-1">
              <RotateCcw className="h-4 w-4" />
              Reset password
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-ink-soft/80">
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}