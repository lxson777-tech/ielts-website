/* The trial's view of the course library, built at page-build time.

   Every lesson in a section stays listed with its real title (the handoff:
   locked rows keep their title and a short reason). Only the section's one
   introductory lesson opens during the trial. Built from the same course
   registry the Course page uses, so a lesson added there appears here too,
   locked, without anyone touching this file.

   Used by .astro pages, which pass the result to the trial islands as
   props, so the browser never has to load the registries itself. */

import { buildSections } from '../course';
import { TRIAL_OFFER, TRIAL_SECTIONS, type TrialSection } from './offer';

export interface TrialLibraryLesson {
  key: string;
  title: string;
  blurb: string;
  href: string;
  minutes?: number;
}

export interface TrialLibrarySection {
  section: TrialSection;
  /** The paper's name. English in every language, like the exam paper. */
  label: string;
  /** The one lesson the trial opens. */
  lesson: TrialLibraryLesson;
  /** Every other lesson in the section, in course order, locked. */
  others: { key: string; title: string; href: string }[];
  test: { id: string; title: string; href: string; enabled: boolean };
}

const LABEL: Record<TrialSection, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

/** `testTitle` names a practice paper by id; the page supplies it from the
    test registry, which only pages may import. */
export function trialLibrary(testTitle: (id: string) => string | undefined): TrialLibrarySection[] {
  const sections = buildSections();
  return TRIAL_SECTIONS.map((section) => {
    const offer = TRIAL_OFFER[section];
    const lessons = sections.find((s) => s.skill === section)?.lessons ?? [];
    const lesson = lessons.find((l) => l.key === offer.lessonKey);
    if (!lesson) throw new Error(`Trial lesson ${offer.lessonKey} is not in the course.`);
    if (lesson.href !== offer.lessonHref) {
      throw new Error(`Trial lesson ${offer.lessonKey} moved to ${lesson.href}; update TRIAL_OFFER.`);
    }
    return {
      section,
      label: LABEL[section],
      lesson: { key: lesson.key, title: lesson.title, blurb: lesson.blurb, href: lesson.href, minutes: lesson.minutes },
      others: lessons.filter((l) => l.key !== offer.lessonKey).map((l) => ({ key: l.key, title: l.title, href: l.href })),
      test: {
        id: offer.testId,
        title:
          testTitle(offer.testId) ??
          (section === 'writing' ? 'Writing Checker' : section === 'speaking' ? 'Speaking test' : offer.testId),
        href: offer.testHref,
        enabled: offer.testEnabled,
      },
    };
  });
}
