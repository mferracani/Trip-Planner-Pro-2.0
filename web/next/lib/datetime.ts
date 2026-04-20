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

export function minutesBetween(a: Timestamp, b: Timestamp): number {
  const ms = b.toMillis() - a.toMillis();
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
