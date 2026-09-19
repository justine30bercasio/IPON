export const MANILA_TZ = "Asia/Manila";

const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

export function manilaNow(): Date {
  return new Date();
}

export function manilaParts(date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  let year = 0;
  let month = 0;
  let day = 0;
  for (const p of parts) {
    if (p.type === "year") year = Number(p.value);
    else if (p.type === "month") month = Number(p.value);
    else if (p.type === "day") day = Number(p.value);
  }
  return { year, month, day };
}

export function manilaTodayKey(date = new Date()): string {
  const { year, month, day } = manilaParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function manilaTodayIso(): Date {
  const { year, month, day } = manilaParts();
  return new Date(Date.UTC(year, month - 1, day) - PH_OFFSET_MS);
}

export function manilaMonthStart(offsetMonths = 0, date = new Date()): Date {
  const { year, month } = manilaParts(date);
  const shifted = new Date(Date.UTC(year, month - 1 + offsetMonths, 1));
  return new Date(shifted.getTime() - PH_OFFSET_MS);
}

export function manilaMonthKey(date = new Date()): string {
  const { year, month } = manilaParts(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function manilaMonthLabels(monthsCount: number): { year: number; monthIndex: number; key: string }[] {
  const { year, month } = manilaParts();
  const out: { year: number; monthIndex: number; key: string }[] = [];
  for (let i = 0; i < monthsCount; i++) {
    const idx = month - 1 - i;
    const y = year + Math.floor(idx / 12);
    const m = ((idx % 12) + 12) % 12;
    out.push({ year: y, monthIndex: m, key: `${y}-${String(m + 1).padStart(2, "0")}` });
  }
  return out.reverse();
}