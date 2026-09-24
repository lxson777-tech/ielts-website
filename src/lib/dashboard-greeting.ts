/* The one line at the top of /dashboard: "Good morning." or, once the
   student has filled in their profile, "Good morning, Aigerim."

   Pure and browser-free so it is unit tested without React
   (tests/greeting.test.ts). It only CHOOSES the English key; the dashboard
   translates it with t(key, { name }), so the name itself is never run
   through the dictionary and reads exactly as the student typed it.

   Every key is written inside nt() so the coverage test in
   tests/i18n.test.ts extracts it and checks that the Russian exists and
   keeps the {name} placeholder. Chosen dynamically, they would otherwise be
   invisible to it. */

import { nt } from './i18n/translate';

const PLAIN = {
  unknown: nt('Welcome back.'),
  morning: nt('Good morning.'),
  afternoon: nt('Good afternoon.'),
  evening: nt('Good evening.'),
} as const;

const NAMED = {
  unknown: nt('Welcome back, {name}.'),
  morning: nt('Good morning, {name}.'),
  afternoon: nt('Good afternoon, {name}.'),
  evening: nt('Good evening, {name}.'),
} as const;

type Moment = keyof typeof PLAIN;

function momentOf(hour: number | null): Moment {
  if (hour === null || !Number.isFinite(hour)) return 'unknown';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** The English key for the greeting. `hour` is the student's local hour, or
    null before the page knows it (the server render, where "Welcome back"
    is the honest default). `firstName` is the signed-in student's own first
    name, or null when signed out or not filled in yet, which keeps the
    wording exactly as it was before profiles existed. */
export function greetingKey(hour: number | null, firstName: string | null | undefined): string {
  const moment = momentOf(hour);
  const name = firstName?.trim();
  return name ? NAMED[moment] : PLAIN[moment];
}
