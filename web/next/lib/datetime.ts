import { DateTime } from "luxon";
import { Timestamp } from "firebase/firestore";

// Common IANA timezones for the picker
export const COMMON_TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Santiago",
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Berlin",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Australia/Sydney",
  "UTC",
];

// Converts "YYYY-MM-DDTHH:mm" local + IANA zone to a Firestore Timestamp (UTC).
export function localToUtcTimestamp(localTime: string, timezone: string): Timestamp | null {
  if (!localTime || !timezone) return null;
  const dt = DateTime.fromISO(localTime, { zone: timezone });
  if (!dt.isValid) return null;
  return Timestamp.fromDate(dt.toUTC().toJSDate());
}

// Firestore timestamps inside array fields can come back as plain {seconds, nanoseconds}
// objects instead of proper Timestamp instances. This helper normalizes either form.
export function normalizeTimestamp(t: unknown): Timestamp | null {
  if (!t || typeof t !== "object") return null;
  if (typeof (t as Timestamp).toMillis === "function") return t as Timestamp;
  const obj = t as Record<string, unknown>;
  const s = (obj.seconds ?? obj._seconds) as number | undefined;
  const ns = (obj.nanoseconds ?? obj._nanoseconds) as number | undefined;
  if (typeof s === "number") return new Timestamp(s, ns ?? 0);
  return null;
}

export function minutesBetween(a: unknown, b: unknown): number {
  const ta = normalizeTimestamp(a);
  const tb = normalizeTimestamp(b);
  if (!ta || !tb) return 0;
  const ms = tb.toMillis() - ta.toMillis();
  return Math.max(0, Math.round(ms / 60000));
}

// Guess browser timezone; fallback to Buenos Aires
export function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Argentina/Buenos_Aires";
  } catch {
    return "America/Argentina/Buenos_Aires";
  }
}
