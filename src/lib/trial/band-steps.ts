/* The band guide steps a trial student's own grade earns, and nothing more.

   Alex, 24 September 2026: lock the remaining study material in the trial,
   including the band guides (the step-by-step "from band 6 to band 7"
   playbooks on /learn/bands). A trial build's browser no longer carries
   them (the light module in src/lib/trial/light/band-guides.ts), so the
   band report under a trial grade gets its steps from the grader instead:
   one step per criterion, the one that matches the band the student was
   given, in the student's language. A student who wants the whole ladder
   would have to be graded at every band of every criterion.

   Server side only: imported by workers/grade-essay and
   workers/grade-speaking, which already hold the official descriptors. */

import { SPEAKING_BAND_GUIDES, WRITING_BAND_GUIDES, guideFor, type BandStepGuide } from '../../data/band-guides';
import { strings as RU_GUIDES } from '../i18n/dict/ru/parts/band-guides';

export type BandStepLocale = 'en' | 'ru';

export function readBandStepLocale(value: unknown): BandStepLocale {
  return value === 'ru' ? 'ru' : 'en';
}

/** A guide step with its advice in Russian. The example sentences stay
    English, exactly as the band report shows them on the open site. */
function inRussian(step: BandStepGuide): BandStepGuide {
  const ru = (text: string) => RU_GUIDES[text] ?? text;
  return {
    ...step,
    whatChanges: ru(step.whatChanges),
    doThis: step.doThis.map(ru),
    stopThis: step.stopThis.map(ru),
    example: { ...step.example, why: ru(step.example.why) },
    practice: ru(step.practice),
    ...(step.task1Note ? { task1Note: ru(step.task1Note) } : {}),
  };
}

/** One guide step per graded criterion, for the band given. Criteria the
    guides do not cover, or bands that are not numbers, are left out. */
export function bandStepsFor(
  skill: 'writing' | 'speaking',
  bands: Record<string, unknown>,
  locale: BandStepLocale,
): Record<string, BandStepGuide> {
  const guides = (skill === 'writing' ? WRITING_BAND_GUIDES : SPEAKING_BAND_GUIDES) as Record<string, BandStepGuide[]>;
  const out: Record<string, BandStepGuide> = {};
  for (const [key, band] of Object.entries(bands)) {
    const ladder = guides[key];
    if (!ladder || typeof band !== 'number' || !Number.isFinite(band)) continue;
    const step = guideFor(ladder, band);
    if (step) out[key] = locale === 'ru' ? inRussian(step) : step;
  }
  return out;
}
