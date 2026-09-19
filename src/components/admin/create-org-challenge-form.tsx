"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import {
  createOrgChallengeAction,
  type ActionResult,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

const initial: ActionResult = { ok: false, error: "" };

const frequencies = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "TWICE_MONTHLY", label: "Twice a month" },
  { value: "WEEKLY", label: "Weekly" },
] as const;

const days: number[] = [];
for (let d = 1; d <= 31; d++) days.push(d);

function todayValue(): string {
  return new Date().toISOString().split("T")[0];
}

export function CreateOrgChallengeForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [frequency, setFrequency] = React.useState<string>("MONTHLY");
  const bound = React.useMemo(() => createOrgChallengeAction.bind(null, orgId), [orgId]);
  const [state, formAction, pending] = useActionState(bound, initial);

  React.useEffect(() => {
    if (state.ok) {
      toast("success", state.message ?? "Challenge created.");
      router.refresh();
    } else if (state.error) {
      toast("error", state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Challenge name" error={state.ok ? undefined : state.error}>
        <Input name="name" placeholder="e.g. Coworker IPON 2026" required minLength={3} />
      </Field>
      <Field label="Description" hint="Optional — what you're saving for.">
        <Input name="description" placeholder="Our monthly savings challenge." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date">
          <Input name="startDate" type="date" defaultValue={todayValue()} />
        </Field>
        <Field label="End date" hint="Optional">
          <Input name="endDate" type="date" />
        </Field>
      </div>
      <Field label="Collection schedule">
        <Select name="frequency" defaultValue="MONTHLY" onChange={(e) => setFrequency(e.target.value)}>
          {frequencies.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </Field>
      {frequency === "MONTHLY" && (
        <Field label="Collection day" hint="Members can hulog on this day every month.">
          <Select name="dayOfMonth" defaultValue="15">
            {days.map((d) => (
              <option key={d} value={d}>
                Every {d}th of the month
              </option>
            ))}
          </Select>
        </Field>
      )}
      {frequency === "TWICE_MONTHLY" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First collection day">
            <Select name="dayOfMonth" defaultValue="15">
              {days.map((d) => (
                <option key={d} value={d}>
                  Every {d}th
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Second collection day">
            <Select name="secondDayOfMonth" defaultValue="30">
              {days.filter((d) => d !== 15).map((d) => (
                <option key={d} value={d}>
                  Every {d}th
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      {frequency === "WEEKLY" && (
        <Field label="Collection day">
          <Select name="dayOfWeek" defaultValue={5}>
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
              (day, i) => (
                <option key={day} value={i}>
                  Every {day}
                </option>
              )
            )}
          </Select>
        </Field>
      )}
      <Button type="submit" variant="secondary" loading={pending} className="self-start">
        <Trophy className="h-4 w-4" />
        Create challenge
      </Button>
    </form>
  );
}