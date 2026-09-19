export const MAX_CENTS = 1_000_000_000;

const AMOUNT_RE = /^\d{1,7}(\.\d{1,2})?$/;

export function toCents(value: unknown): number | null {
  const raw = String(value ?? "")
    .trim()
    .replace(/,/g, "");
  if (!raw || !AMOUNT_RE.test(raw)) return null;
  const [intPart, fracPart = ""] = raw.split(".");
  const cents =
    parseInt(intPart, 10) * 100 +
    parseInt((fracPart + "00").slice(0, 2), 10);
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) {
    return null;
  }
  return cents;
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatCents(cents: number): string {
  return `₱${fromCents(cents).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCentsShort(cents: number): string {
  const value = fromCents(Math.abs(cents));
  if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₱${Math.round(value / 1000)}k`;
  return `₱${value.toFixed(0)}`;
}