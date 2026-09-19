"use client";

import * as React from "react";
import { useActionState } from "react";
import { UserCog } from "lucide-react";
import { createOrgAdminAction, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false, error: "" };

export function CreateOrgAdminForm({ orgId }: { orgId: string }) {
  const bound = React.useMemo(() => createOrgAdminAction.bind(null, orgId), [orgId]);
  const [state, formAction, pending] = useActionState(bound, initial);

  React.useEffect(() => {
    if (state.ok) {
      toast("success", state.message ?? "Admin created.");
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={state.ok ? undefined : undefined}>
          <Input name="name" placeholder="e.g. Maria Santos" required minLength={2} autoFocus />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" placeholder="maria@org.com" required />
        </Field>
      </div>
      <Field label="Temporary password" hint="They can change it later from their profile.">
        <Input name="password" type="password" placeholder="Min 6 characters" required minLength={6} />
      </Field>
      <Button type="submit" variant="secondary" loading={pending} className="self-start">
        <UserCog className="h-4 w-4" />
        Create organization admin
      </Button>
    </form>
  );
}