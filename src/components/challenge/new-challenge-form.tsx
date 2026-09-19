"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  CalendarDays,
  CalendarRange,
  CalendarOff,
  Users,
  Eye,
  EyeOff,
  Trophy,
  Plus,
} from "lucide-react";
import { createChallengeAction, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";

const initial: ActionResult = { ok: false, error: "" };

type Frequency = "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "TWICE_MONTHLY" | "CUSTOM" | "FLEXIBLE";

const frequencies: { value: Frequency; label: string; icon: React.ElementType; hint: string }[] = [
  { value: "MONTHLY", label: "Monthly", icon: CalendarDays, hint: "e.g. every 15th" },
  { value: "TWICE_MONTHLY", label: "Twice a Month", icon: CalendarRange, hint: "e.g. 15th & 30th" },
  { value: "WEEKLY", label: "Weekly", icon: CalendarDays, hint: "e.g. every Friday" },
  { value: "BIWEEKLY", label: "Every 2 Weeks", icon: CalendarRange, hint: "every 14 days" },
  { value: "CUSTOM", label: "Custom", icon: Plus, hint: "pick your own dates" },
  { value: "FLEXIBLE", label: "Any Day", icon: CalendarOff, hint: "no fixed date — hulog anytime" },
];

const visibilityOptions = [
  {
    value: "PRIVATE",
    title: "Private",
    icon: EyeOff,
    hint: "Members only see their own amounts.",
  },
  {
    value: "GROUP_TOTALS",
    title: "Group Totals",
    icon: Users,
    hint: "Members see totals, not each other's amounts.",
  },
  {
    value: "TRANSPARENT",
    title: "Transparent",
    icon: Eye,
    hint: "Members can see everyone's contributions.",
  },
];

function todayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NewChallengeForm({
  orgs = [],
  currentOrgId = "",
}: {
  orgs?: { id: string; name: string }[];
  currentOrgId?: string;
}) {
  const router = useRouter();
  const [frequency, setFrequency] = React.useState<Frequency>("MONTHLY");
  const [visibility, setVisibility] = React.useState("GROUP_TOTALS");
  const [leaderboard, setLeaderboard] = React.useState(true);
  const [allowMember, setAllowMember] = React.useState(true);
  const [state, formAction, pending] = useActionState(createChallengeAction, initial);

  React.useEffect(() => {
    if (state.ok) {
      toast("success", "Challenge created! 🎉");
      router.replace(`/challenges/${state.message}`);
    }
  }, [state, router]);

  const days = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Create IPON Challenge"
        subtitle="Set up a group savings challenge. Members can hulog any amount."
      />

      <form action={formAction} className="space-y-5">
        <Card>
          <CardHeader title="Basic information" subtitle="What is this challenge about?" />
          <CardContent className="flex flex-col gap-4">
            {orgs.length > 0 && (
              <Field
                label="Organization"
                hint="Pick which organization this challenge belongs to."
              >
                <Select name="orgId" defaultValue={currentOrgId}>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Challenge Name">
              <Input name="name" placeholder="e.g. ICDeC Coworker IPON 2026" autoFocus />
            </Field>
            <Field label="Description" hint="Optional — tell members what you're saving for.">
              <Textarea name="description" placeholder="Our monthly coworker savings challenge." rows={3} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start Date">
                <Input name="startDate" type="date" defaultValue={todayValue()} />
              </Field>
              <Field label="End Date" hint="Optional">
                <Input name="endDate" type="date" />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Contribution schedule" subtitle="When are collection periods active?" />
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {frequencies.map((f) => {
                const isChecked = frequency === f.value;
                const Icon = f.icon;
                return (
                  <label
                    key={f.value}
                    className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                      isChecked
                        ? "border-brand-400 bg-brand-50 shadow-soft"
                        : "border-line bg-white hover:border-brand-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      value={f.value}
                      checked={isChecked}
                      onChange={() => setFrequency(f.value)}
                      className="sr-only"
                    />
                    <Icon className={`h-4.5 w-4.5 ${isChecked ? "text-brand-600" : "text-ink-soft/60"}`} />
                    <span className={`text-xs font-bold ${isChecked ? "text-brand-700" : "text-ink-soft"}`}>
                      {f.label}
                    </span>
                    <span className="text-[10px] leading-tight text-ink-soft/50">{f.hint}</span>
                  </label>
                );
              })}
            </div>

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

            {frequency === "BIWEEKLY" && (
              <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
                Collection periods repeat every 14 days from the challenge start date.
              </div>
            )}

            {frequency === "CUSTOM" && (
              <Field
                label="Collection dates"
                hint="One date per line, format YYYY-MM-DD. e.g. 2026-09-15"
              >
                <Textarea
                  name="customDates"
                  placeholder={"2026-09-15\n2026-09-30\n2026-10-15"}
                  rows={3}
                />
              </Field>
            )}

            {frequency === "FLEXIBLE" && (
              <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
                No fixed collection date — members can hulog on any day of the challenge.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Privacy & settings"
            subtitle="Decide what members can see."
          />
          <CardContent className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink">Financial visibility</p>
              <div className="grid gap-2">
                {visibilityOptions.map((opt) => {
                  const isChecked = visibility === opt.value;
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition-all ${
                        isChecked
                          ? "border-brand-400 bg-brand-50"
                          : "border-line bg-white hover:border-brand-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={opt.value}
                        checked={isChecked}
                        onChange={() => setVisibility(opt.value)}
                        className="sr-only"
                      />
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          isChecked ? "bg-brand-600 text-white" : "bg-mist text-ink-soft"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="flex-1">
                        <span className={`block text-sm font-bold ${isChecked ? "text-brand-800" : "text-ink"}`}>
                          {opt.title}
                        </span>
                        <span className="block text-xs text-ink-soft/70">{opt.hint}</span>
                      </span>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          isChecked ? "border-brand-600" : "border-line"
                        }`}
                      >
                        {isChecked && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-3.5 transition-colors hover:border-brand-200">
                <input
                  type="checkbox"
                  name="leaderboardEnabled"
                  checked={leaderboard}
                  onChange={(e) => setLeaderboard(e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-600"
                />
                <Trophy className="h-4.5 w-4.5 text-ink-soft/60" />
                <span className="flex-1">
                  <span className="block text-sm font-bold text-ink">Enable leaderboard</span>
                  <span className="block text-xs text-ink-soft/70">
                    Show a ranked view of member contributions.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-3.5 transition-colors hover:border-brand-200">
                <input
                  type="checkbox"
                  name="allowMemberHulog"
                  checked={allowMember}
                  onChange={(e) => setAllowMember(e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-600"
                />
                <Plus className="h-4.5 w-4.5 text-ink-soft/60" />
                <span className="flex-1">
                  <span className="block text-sm font-bold text-ink">Members can record hulog</span>
                  <span className="block text-xs text-ink-soft/70">
                    Turn off to make the organizer the only one who records contributions.
                  </span>
                </span>
              </label>
            </div>

            {!state.ok && state.error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
                {state.error}
              </div>
            )}

            <Button type="submit" size="lg" loading={pending} className="mt-2 w-full sm:w-auto sm:self-end">
              Create challenge
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}