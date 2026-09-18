"use client";

import * as React from "react";
import { useActionState } from "react";
import { renameOrganizationAction, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false, error: "" };

export function RenameOrgForm({ orgId, currentName }: { orgId: string; currentName: string }) {
  const bound = React.useMemo(() => renameOrganizationAction.bind(null, orgId), [orgId]);
  const [state, formAction, pending] = useActionState(bound, initial);

  React.useEffect(() => {
    if (state.ok) {
      toast("success", state.message ?? "Organization renamed.");
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Organization name" error={state.ok ? undefined : state.error}>
        <Input name="name" defaultValue={currentName} required minLength={3} />
      </Field>
      <Button type="submit" variant="secondary" loading={pending} className="self-start">
        Save name
      </Button>
    </form>
  );
}