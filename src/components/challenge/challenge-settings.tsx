"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  CalendarOff,
  Plus,
  AlertTriangle,
  Save,
  Users,
  Eye,
  EyeOff,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import {
  updateChallengeSettingsAction,
  updateScheduleAction,
  deleteChallengeAction,
  type ActionResult,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { describeSchedule } from "@/lib/period";

type Frequency = "MONTHLY" | "WEEKLY" | "BIWEEKLY" | "TWICE_MONTHLY" | "CUSTOM" | "FLEXIBLE";

export interface ChallengeShape {
  id: string;
  name: string;
  description: string | null;
  endDate: string | null;
  status: string;
  visibility: string;
  leaderboardEnabled: boolean;
  allowMemberHulog: boolean;
  createdAt: string;
  schedules: {
    frequency: string;
    dayOfMonth: number | null;
    secondDayOfMonth: number | null;
    dayOfWeek: number | null;
    customDates: string[] | null;
  }[];
}

export function ChallengeSettings({ challenge }: { challenge: ChallengeShape }) {
  const router = useRouter();
  const schedule = challenge.schedules[0];

  const [name, setName] = React.useState(challenge.name);
  const [description, setDescription] = React.useState(challenge.description ?? "");
  const [endDate, setEndDate] = React.useState(challenge.endDate ?? "");
  const [status, setStatus] = React.useState(challenge.status);
  const [visibility, setVisibility] = React.useState(challenge.visibility);
  const [leaderboard, setLeaderboard] = React.useState(challenge.leaderboardEnabled);
  const [allowMember, setAllowMember] = React.useState(challenge.allowMemberHulog);

  const [frequency, setFrequency] = React.useState<Frequency>(schedule?.frequency as Frequency ?? "MONTHLY");
  const [dayOfMonth, setDayOfMonth] = React.useState(String(schedule?.dayOfMonth ?? 15));
  const [secondDay, setSecondDay] = React.useState(String(schedule?.secondDayOfMonth ?? 30));
  const [dayOfWeek, setDayOfWeek] = React.useState(String(schedule?.dayOfWeek ?? 5));
  const [customDates, setCustomDates] = React.useState(
    (schedule?.customDates ?? []).join("\n")
  );

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [savingInfo, setSavingInfo] = React.useState(false);
  const [savingSchedule, setSavingSchedule] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const dateDays = Array.from({ length: 31 }, (_, i) => i + 1);

  const saveInfo = async () => {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", description);
    fd.set("endDate", endDate);
    fd.set("status", status);
    fd.set("visibility", visibility);
    fd.set("leaderboardEnabled", leaderboard ? "on" : "off");
    fd.set("allowMemberHulog", allowMember ? "on" : "off");
    setSavingInfo(true);
    const res = await updateChallengeSettingsAction(challenge.id, null, fd);
    setSavingInfo(false);
    handleRes(res, "Challenge settings updated");
  };

  const saveSchedule = async () => {
    const fd = new FormData();
    fd.set("frequency", frequency);
    fd.set("dayOfMonth", dayOfMonth);
    fd.set("secondDayOfMonth", secondDay);
    fd.set("dayOfWeek", dayOfWeek);
    fd.set("customDates", customDates.replace(/\s*,\s*|\n+/g, ",").replace(/^,|,$/g, ""));
    setSavingSchedule(true);
    const res = await updateScheduleAction(challenge.id, null, fd);
    setSavingSchedule(false);
    handleRes(res, "Schedule updated");
  };

  const handleRes = (res: ActionResult, successMessage: string) => {
    if (res.ok) {
      toast("success", successMessage);
      router.refresh();
    } else {
      toast("error", "Something went wrong", res.error);
    }
  };

  const visibilityOptions = [
    { value: "PRIVATE", title: "Private", icon: EyeOff, hint: "Members only see their own amounts." },
    { value: "GROUP_TOTALS", title: "Group Totals", icon: Users, hint: "Members see totals, not each other's amounts." },
    { value: "TRANSPARENT", title: "Transparent", icon: Eye, hint: "Members can see everyone's contributions." },
  ];

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader title="Challenge details" subtitle="Basic information and status" />
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Challenge Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </Field>
          <Field label="End Date" hint="Optional — leave empty for an ongoing challenge.">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <Button onClick={saveInfo} loading={savingInfo}>
              <Save className="h-4 w-4" /> Save details
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Contribution schedule"
          subtitle={`Currently: ${describeSchedule({ ...schedule, frequency: schedule.frequency as Frequency })}`}
        />
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {([
              ["MONTHLY", "Monthly", CalendarDays],
              ["TWICE_MONTHLY", "Twice a Month", CalendarRange],
              ["WEEKLY", "Weekly", CalendarDays],
              ["BIWEEKLY", "Every 2 Weeks", CalendarRange],
              ["CUSTOM", "Custom", Plus],
              ["FLEXIBLE", "Any Day", CalendarOff],
            ] as [Frequency, string, React.ElementType][]).map(([value, label, Icon]) => {
              const checked = frequency === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFrequency(value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                    checked ? "border-brand-400 bg-brand-50" : "border-line bg-white hover:border-brand-200"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${checked ? "text-brand-600" : "text-ink-soft/60"}`} />
                  <span className={`text-[11px] font-bold ${checked ? "text-brand-700" : "text-ink-soft"}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {frequency === "MONTHLY" && (
            <Field label="Collection day">
              <Select value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)}>
                {dateDays.map((d) => (
                  <option key={d} value={d}>Every {d}th of the month</option>
                ))}
              </Select>
            </Field>
          )}
          {frequency === "TWICE_MONTHLY" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First collection day">
                <Select value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)}>
                  {dateDays.map((d) => (
                    <option key={d} value={d}>Every {d}th</option>
                  ))}
                </Select>
              </Field>
              <Field label="Second collection day">
                <Select value={secondDay} onChange={(e) => setSecondDay(e.target.value)}>
                  {dateDays.map((d) => (
                    <option key={d} value={d}>Every {d}th</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          {frequency === "WEEKLY" && (
            <Field label="Collection day">
              <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(
                  (day, i) => (
                    <option key={day} value={i}>Every {day}</option>
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
            <Field label="Collection dates" hint="One date per line, format YYYY-MM-DD.">
              <Textarea
                value={customDates}
                onChange={(e) => setCustomDates(e.target.value)}
                rows={3}
                placeholder={"2026-09-15\n2026-09-30\n2026-10-15"}
              />
            </Field>
          )}
          {frequency === "FLEXIBLE" && (
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
              No fixed collection date — members can hulog on any day of the challenge.
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={saveSchedule} loading={savingSchedule} variant="secondary">
              <Save className="h-4 w-4" /> Save schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Privacy & visibility"
          subtitle="Financial information is sensitive. Choose carefully."
        />
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-2">
            {visibilityOptions.map((opt) => {
              const checked = visibility === opt.value;
              const Icon = opt.icon;
              return (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition-all ${
                    checked ? "border-brand-400 bg-brand-50" : "border-line bg-white hover:border-brand-200"
                  }`}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    checked={checked}
                    onChange={() => setVisibility(opt.value)}
                    className="sr-only"
                  />
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${checked ? "bg-brand-600 text-white" : "bg-mist text-ink-soft"}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="flex-1">
                    <span className={`block text-sm font-bold ${checked ? "text-brand-800" : "text-ink"}`}>{opt.title}</span>
                    <span className="block text-xs text-ink-soft/70">{opt.hint}</span>
                  </span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${checked ? "border-brand-600" : "border-line"}`}>
                    {checked && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
                  </span>
                </label>
              );
            })}
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-3.5 transition-colors hover:border-brand-200">
            <input
              type="checkbox"
              checked={leaderboard}
              onChange={(e) => setLeaderboard(e.target.checked)}
              className="h-4 w-4 rounded accent-brand-600"
            />
            <Trophy className="h-4.5 w-4.5 text-ink-soft/60" />
            <span className="flex-1">
              <span className="block text-sm font-bold text-ink">Enable leaderboard</span>
              <span className="block text-xs text-ink-soft/70">Show a ranked view of member contributions.</span>
            </span>
            <Badge tone={leaderboard ? "success" : "neutral"}>{leaderboard ? "On" : "Off"}</Badge>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-3.5 transition-colors hover:border-brand-200">
            <input
              type="checkbox"
              checked={allowMember}
              onChange={(e) => setAllowMember(e.target.checked)}
              className="h-4 w-4 rounded accent-brand-600"
            />
            <ShieldCheck className="h-4.5 w-4.5 text-ink-soft/60" />
            <span className="flex-1">
              <span className="block text-sm font-bold text-ink">Members can record hulog</span>
              <span className="block text-xs text-ink-soft/70">
                Turn off to make the organizer the only one who records contributions.
              </span>
            </span>
            <Badge tone={allowMember ? "success" : "neutral"}>{allowMember ? "On" : "Off"}</Badge>
          </label>

          <div className="flex justify-end">
            <Button onClick={saveInfo} loading={savingInfo} variant="secondary">
              <Save className="h-4 w-4" /> Save privacy settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-200">
        <CardHeader
          title="Danger zone"
          subtitle="Permanently delete this challenge and all its hulog records."
          action={<span className="text-rose-500"><AlertTriangle className="h-5 w-5" /></span>}
        />
        <CardContent>
          <Button
            variant="danger"
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
          >
            Delete challenge
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          setDeleting(true);
          const res = await deleteChallengeAction(challenge.id);
          setDeleting(false);
          if (res.ok) {
            toast("success", "Challenge deleted");
            router.push("/challenges");
          } else {
            toast("error", "Couldn't delete", res.error);
            setDeleteOpen(false);
          }
        }}
        title="Delete this challenge?"
        description={`“${challenge.name}” and every hulog record in it will be permanently removed. This can't be undone.`}
        confirmLabel="Delete forever"
        danger
        loading={deleting}
      />
    </div>
  );
}