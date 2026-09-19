"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { adminAddOrgMembersAction, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false, error: "" };

export function AddOrgMembersForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const bound = React.useMemo(() => adminAddOrgMembersAction.bind(null, orgId), [orgId]);
  const [state, formAction, pending] = useActionState(bound, initial);

  React.useEffect(() => {
    if (state.ok) {
      toast("success", state.message ?? "Members created.");
      router.refresh();
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        label="Members"
        hint="One per line: email, Full Name. New accounts get a temporary password shown after adding."
        error={state.ok ? undefined : state.error}
      >
        <Textarea
          name="members"
          rows={5}
          placeholder={"jane.doe@gmail.com, Jane Doe\njohn.cruz@gmail.com, John Cruz"}
        />
      </Field>
      <Button type="submit" variant="secondary" loading={pending} className="self-start">
        <Users className="h-4 w-4" />
        Add members
      </Button>
    </form>
  );
}