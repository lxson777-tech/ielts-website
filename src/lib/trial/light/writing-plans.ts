/* Trial stand-in for src/data/writing-plans.ts (see ./README.md): the
   per-question essay plans and starter sentences of the writing coach, which
   the trial's Writing Checker never shows. */

import type { WritingPlan } from '../../writing/plans';

export const WRITING_PLANS: Record<string, WritingPlan> = {};

export function getWritingPlan(_promptId: string): WritingPlan | undefined {
  return undefined;
}
