"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  Save,
  KeyRound,
  ShieldCheck,
  Camera,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  updateProfileAction,
  changePasswordAction,
  type ActionResult,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false, error: "" };

export function ProfileForms({ user }: {
  user: { id: string; name: string; email: string; phone: string | null; role: string };
}) {
  const router = useRouter();
  const [name, setName] = React.useState(user.name);
  const [phone, setPhone] = React.useState(user.phone ?? "");

  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, initial);
  const [pwState, pwAction, pwPending] = useActionState(changePasswordAction, initial);
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  React.useEffect(() => {
    if (profileState.ok) {
      toast("success", "Profile saved", profileState.message);
      router.refresh();
    } else if (profileState.error) {
      toast("error", "Couldn't save", profileState.error);
    }
  }, [profileState, router]);

  React.useEffect(() => {
    if (pwState.ok) {
      toast("success", "Password changed", pwState.message);
      router.refresh();
    }
  }, [pwState, router]);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="flex flex-col gap-5">
        <Card className="p-5">
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="relative">
              <Avatar name={user.name} size="xl" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white">
                <Camera className="h-3.5 w-3.5" />
              </span>
            </div>
            <div className="text-center">
              <p className="text-base font-extrabold text-ink">{user.name}</p>
              <p className="text-sm text-ink-soft/80">{user.email}</p>
            </div>
            <Badge tone={user.role === "ADMIN" ? "primary" : "neutral"}>
              {user.role === "ADMIN" ? "Admin" : "Member"}
            </Badge>
          </div>
          <div className="mt-4 flex flex-col gap-1.5 text-xs text-ink-soft/60">
            <p className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
              {user.role === "ADMIN"
                ? "Full access to every challenge."
                : "Member access to your challenges."}
            </p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-5 lg:col-span-2">
        <Card>
          <CardHeader title="Profile" subtitle="How your name shows up across challenges." />
          <CardContent>
            <form action={profileAction} className="flex flex-col gap-4">
              <Field label="Full Name">
                <Input name="name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email" hint="Contact the organizer if you need to change this.">
                <Input name="email" value={user.email} disabled className="disabled:cursor-not-allowed disabled:text-ink-soft/50" />
              </Field>
              <Field label="Phone">
                <Input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9xx xxx xxxx" />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" loading={profilePending}>
                  <Save className="h-4 w-4" /> Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Change password"
            subtitle="Use a strong, unique password you don't reuse elsewhere."
          />
          <CardContent>
            <form action={pwAction} className="flex flex-col gap-4">
              <Field label="Current Password">
                <div className="relative">
                  <Input name="currentPassword" type={showCurrent ? "text" : "password"} placeholder="••••••••" className="pr-11" />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((s) => !s)}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft/60 hover:bg-mist hover:text-ink"
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New Password" hint="At least 8 characters with letters & numbers.">
                  <div className="relative">
                    <Input name="newPassword" type={showNew ? "text" : "password"} placeholder="New password" className="pr-11" />
                    <button
                      type="button"
                      onClick={() => setShowNew((s) => !s)}
                      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft/60 hover:bg-mist hover:text-ink"
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm New Password">
                  <div className="relative">
                    <Input name="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="Repeat it" className="pr-11" />
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
              </div>
              {!pwState.ok && pwState.error && (
                <p className="text-xs font-medium text-rose-600">{pwState.error}</p>
              )}
              <div className="flex justify-end">
                <Button type="submit" loading={pwPending} variant="secondary">
                  <KeyRound className="h-4 w-4" /> Update password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}