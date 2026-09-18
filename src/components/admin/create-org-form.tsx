"use client";

import * as React from "react";
import { useActionState } from "react";
import { Building2 } from "lucide-react";
import { createOrganizationAction, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false, error: "" };

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, initial);

  React.useEffect(() => {
    if (state.ok) {
      toast("success", state.message ?? "Organization created.");
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Organization name" hint='e.g. "Left Handed Club"' error={state.ok ? undefined : state.error}>
        <Input name="name" placeholder="Organization name" required minLength={3} />
      </Field>
      <Field
        label="Slug (short URL key)"
        hint="lowercase letters, numbers, and dashes — unique"
      >
        <Input name="slug" placeholder="e.g. left-handed-club" required minLength={3} />
      </Field>
      <Button type="submit" loading={pending} className="self-start">
        <Building2 className="h-4 w-4" />
        Create organization
      </Button>
    </form>
  );
}