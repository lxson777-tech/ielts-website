/* Small date-key helpers shared by the study-plan schedule and the streak
   tracker. Dates are always a plain "local" YYYY-MM-DD string, the day a
   student would recognise on their own calendar, never a UTC ISO timestamp:
   `new Date().toISOString().slice(0, 10)` can land on the wrong day for
   anyone west of UTC in the evening. Always construct Date objects at local
   midnight (`T00:00:00`, no `Z`) so DST transitions never shift the day. */

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): string {
  return toLocalDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toLocalDateKey(d);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000);
}

export function isWeekday(key: string): boolean {
  const day = parseDateKey(key).getDay();
  return day >= 1 && day <= 5;
}
