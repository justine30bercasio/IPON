import type { Challenge, ChallengeSchedule, Frequency } from "@prisma/client";
import { startOfWeek } from "date-fns";

export type ScheduleWithChallenge = ChallengeSchedule & {
  challenge: Pick<Challenge, "startDate">;
};

export function determinePeriod(
  frequency: Frequency,
  date: Date | string
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  switch (frequency) {
    case "WEEKLY": {
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      })} – ${end.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }
    case "BIWEEKLY": {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const day = start.getDay() === 0 ? 6 : start.getDay() - 1;
      const monday = new Date(start);
      monday.setDate(start.getDate() - day);
      const end = new Date(monday);
      end.setDate(monday.getDate() + 13);
      if (d > end) {
        monday.setDate(end.getDate() + 1);
      }
      return `${monday.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
      })} – ${new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 13).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }
    case "MONTHLY":
    case "TWICE_MONTHLY":
    case "CUSTOM":
    default:
      return d.toLocaleDateString("en-PH", {
        month: "long",
        year: "numeric",
      });
  }
}

export interface ScheduleRule {
  frequency: Frequency;
  dayOfMonth?: number | null;
  secondDayOfMonth?: number | null;
  dayOfWeek?: number | null;
  customDates?: string[] | null;
}

export function isCollectionDate(schedule: ScheduleRule, date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;

  switch (schedule.frequency) {
    case "MONTHLY":
      return schedule.dayOfMonth != null && d.getDate() === schedule.dayOfMonth;
    case "TWICE_MONTHLY":
      return (
        (schedule.dayOfMonth != null && d.getDate() === schedule.dayOfMonth) ||
        (schedule.secondDayOfMonth != null && d.getDate() === schedule.secondDayOfMonth)
      );
    case "WEEKLY":
      return schedule.dayOfWeek != null && d.getDay() === schedule.dayOfWeek;
    case "BIWEEKLY": {
      const custom = parseCustomDates(schedule.customDates);
      if (custom.length > 0) return custom.includes(dayKey(d));
      return true;
    }
    case "CUSTOM":
    default: {
      const custom = parseCustomDates(schedule.customDates);
      return custom.includes(dayKey(d));
    }
  }
}

export function parseCustomDates(
  value?: string[] | unknown
): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function collectionDatesInMonth(
  schedule: ScheduleRule,
  year: number,
  monthIndex: number
): Date[] {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    if (isCollectionDate(schedule, d)) dates.push(d);
  }
  return dates;
}

export function describeSchedule(schedule: ScheduleRule): string {
  const days: number[] = [];
  if (schedule.frequency === "MONTHLY") {
    if (schedule.dayOfMonth != null) days.push(schedule.dayOfMonth);
    if (days.length === 0) return "Monthly";
    return `Every ${days.map(ordinal).join(" and ")}`;
  }
  if (schedule.frequency === "TWICE_MONTHLY") {
    if (schedule.dayOfMonth != null) days.push(schedule.dayOfMonth);
    if (schedule.secondDayOfMonth != null) days.push(schedule.secondDayOfMonth);
    if (days.length === 0) return "Twice a month";
    return `Every ${days.map(ordinal).join(" and ")}`;
  }
  if (schedule.frequency === "WEEKLY") {
    const name =
      schedule.dayOfWeek != null
        ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][schedule.dayOfWeek]
        : "week";
    return `Every ${name}`;
  }
  if (schedule.frequency === "BIWEEKLY") {
    return "Every 2 weeks";
  }
  const custom = parseCustomDates(schedule.customDates);
  if (custom.length > 0) {
    return `Custom · ${custom.map(prettyCustom).join(", ")}`;
  }
  return "Custom schedule";
}

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function prettyCustom(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

export function todayIsoKey(): string {
  const d = new Date();
  return dayKey(d);
}

export function isCollectionSoon(schedule: ScheduleRule, date = new Date()): boolean {
  for (let i = 1; i <= 7; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() + i);
    if (isCollectionDate(schedule, d)) return true;
  }
  return false;
}