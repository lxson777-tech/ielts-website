/* What the upgrade pop-up says paying adds, and what it costs.

   PURE, and never re-typed: the counts are the allowance one 30-day
   purchase includes (PAID_ALLOWANCE in src/lib/trial/status.ts, held to the
   sales copy by tests/assessment-refusal.test.ts), and the price and length
   are the plan on sale (AVAILABLE_PAID_PLANS in ./plans.ts, held to the
   database by tests/paid-sql.test.ts). Change a number there and the pop-up
   follows.

   English source text marked with nt(); the dialog shows it through t() with
   the numbers as variables, so the Russian lives once in the dictionary
   (src/lib/i18n/dict/ru/p-free.ts). */

import { nt } from '../i18n/translate';
import type { Locale } from '../i18n/locale';
import { AVAILABLE_PAID_PLANS } from './plans';
import { PAID_ALLOWANCE } from '../trial/status';

export interface PitchLine {
  text: string;
  vars?: Record<string, number>;
}

/** The five things paying adds, in the order the pop-up lists them. */
export function upgradePitch(): PitchLine[] {
  return [
    { text: nt('The full practice library, and timed tests with band estimates') },
    {
      text: nt('{essays} essay checks and {speaking} recorded Speaking checks'),
      vars: { essays: PAID_ALLOWANCE.writing, speaking: PAID_ALLOWANCE.speaking },
    },
    {
      text: nt('{live} live interviews, {mock} mock exams and the placement test'),
      vars: { live: PAID_ALLOWANCE.live, mock: PAID_ALLOWANCE.mock },
    },
    { text: nt('Mr EZ guidance on everything you study') },
    { text: nt('Your personal study plan, with practice every day') },
  ];
}

/** The plan the pop-up names: the one on sale. */
export function pitchPlan(): { amount: number; days: number } {
  const plan = AVAILABLE_PAID_PLANS[0]!;
  return { amount: plan.amount, days: plan.days };
}

/** "12,990 KZT" in English, "12 990 ₸" in Russian. */
export function pitchPrice(amount: number, locale: Locale): string {
  const number = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 0 }).format(amount);
  return locale === 'ru' ? `${number} ₸` : `${number} KZT`;
}

/** The price sentence, with {price} and {days} filled by the dialog. */
export const PITCH_PRICE_LINE = nt('{price} for {days} days. No automatic renewal.');
