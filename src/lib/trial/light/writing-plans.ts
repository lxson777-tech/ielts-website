/* Trial stand-in for src/data/writing-plans.ts (see ./README.md): the
   per-question essay plans and starter sentences of the writing coach, which
   the trial's Writing Checker never shows. A paid account's browser receives
   them through the gate (pack `writing-plans`, src/lib/trial/packs.ts). */

import type { WritingPlan } from '../../writing/plans';
import { packObject, packRecord, replaceRecord } from './fill';

export const WRITING_PLANS: Record<string, WritingPlan> = {};

export function getWritingPlan(promptId: string): WritingPlan | undefined {
  return WRITING_PLANS[promptId];
}

/** Paid access only: the pack `writing-plans` ({ WRITING_PLANS }). */
export function fillWritingPlans(data: unknown): void {
  const pack = packObject(data, ['WRITING_PLANS']);
  replaceRecord(WRITING_PLANS, packRecord<WritingPlan>(pack.WRITING_PLANS, 'WRITING_PLANS'));
}
