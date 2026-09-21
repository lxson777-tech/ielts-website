/* Explain, Hint and Example at the exact teaching point.
 *
 * WHAT TRAVELS
 * References only: which lesson, which block inside it, which item the
 * student is on, what they put, and what Mr EZ has already said. The
 * lesson's words and the question's accepted answer are fetched by the
 * Worker from the site's own published data (see the note at the top of
 * src/lib/tutor/client.ts). The block text below is used for ONE thing, on
 * this side: the deterministic answer when there is no tutor.
 *
 * WHAT COMES BACK, AND WHAT IS DONE WITH IT
 * Read `kind` on the REPLY, never the one that was asked for: an
 * explanation before the student has attempted anything comes back as a
 * hint. Write `assistanceAfter` into the item, so a correct answer after
 * help is assisted for good. And say plainly where the words came from: a
 * simulated reply is never shown as a live one, and when the tutor cannot
 * be reached the student gets the lesson's own sentence about exactly this,
 * labelled as such, rather than an apology.
 *
 * NEVER DURING A TIMED ASSESSMENT
 * The controls are not rendered in a check or an exam, `place.underExam`
 * closes the same door at the Worker, and this module refuses too. A hidden
 * button is not a boundary, so there are three.
 *
 * No JSX: this file is imported by tests and by a plain DOM script as well
 * as by React. See the header of ./focused-exercise.ts.
 */

import { askLessonHelp, TutorClientError, isTutorConfigured, tutorUnavailableReason } from '../../lib/tutor/client';
import type { LessonHelpItemRef } from '../../lib/tutor/schema';
import type { LessonHelpKind, LearningAiVersions } from '../../lib/learning/contracts/ai';
import type { AssistanceLevel } from '../../lib/learning/contracts/evidence';
import {
  assistanceAfterHelp,
  effectiveHelpKind,
  fallbackLessonHelp,
  type LessonHelpPromptInput,
} from '../../lib/learning/ai-prompt';
import type { Locale } from '../../lib/i18n/locale';

/* ── Asking ──────────────────────────────────────────────────────────────── */

export interface HelpAskInput {
  kind: LessonHelpKind;
  /** The lesson page this teaching point belongs to. */
  lessonKey: string;
  /** The derived block id stamped on the rendered section. */
  blockId: string;
  lessonTitle?: string;
  /** The block's own heading and text, read off the page. Used only for the
      deterministic answer below; the Worker fetches its own copy. */
  blockHeading: string;
  blockText: string;
  /** The check item the student is on, when they are on one. */
  item?: LessonHelpItemRef;
  /** The question's own wording, for the deterministic answer. */
  question?: string;
  /** The question's published explanation, for the deterministic answer
      once the student has actually had a go. */
  officialExplanation?: string;
  /** Whether they have attempted this item yet. Decided by the surface from
      what it recorded, never by the student and never by the model. */
  attempted: boolean;
  previousHints: readonly string[];
  assistanceSoFar: AssistanceLevel;
  versions: LearningAiVersions;
  sessionId?: string;
  locale: Locale;
  /** True while a timed check is running. Help is refused outright. */
  underAssessment?: boolean;
}

/** Where the words came from. The interface must show all three
    differently: `simulated` is never presented as a real reply, and
    `offline` says the tutor could not be reached. */
export type HelpSource = 'live' | 'simulated' | 'offline';

export interface HelpResult {
  text: string;
  /** The kind actually given, which is not always the kind asked for. */
  kind: LessonHelpKind;
  /** The level this item is now at. Written into the evidence. */
  assistanceAfter: AssistanceLevel;
  revealedAnswer: boolean;
  source: HelpSource;
  /** One plain sentence on why there is no live reply, when there is not. */
  unavailableReason?: string;
  /** True when help was refused because a timed check is running. */
  blocked?: boolean;
}

/** The sentence shown with a reply, so its standing is never in doubt. */
export const HELP_SOURCE_NOTE: Readonly<Record<HelpSource, string>> = {
  live: '',
  simulated: 'Simulated, not a real Mr EZ reply.',
  offline: "Mr EZ could not be reached, so this is the lesson's own answer.",
};

export const HELP_BLOCKED_TEXT =
  'Help is switched off while a check is running. That is what makes the result mean something. It comes back the moment you finish.';

/** The lesson's own answer, with no model involved.
 *
 *  Not a placeholder: the sentence in this block that actually decides the
 *  question, chosen by word overlap, plus the published explanation once
 *  the student has had a go. It is what a signed-out student and an AI
 *  outage both get. */
export function offlineHelp(input: HelpAskInput, reason?: string): HelpResult {
  const prompt: LessonHelpPromptInput = {
    kind: input.kind,
    lessonTitle: input.lessonTitle,
    blockHeading: input.blockHeading,
    blockText: input.blockText,
    question: input.question,
    officialExplanation: input.officialExplanation,
    given: input.item?.given ?? '',
    previousHints: input.previousHints,
    attempted: input.attempted,
    locale: input.locale,
  };
  const kind = effectiveHelpKind(input.kind, input.attempted);
  const { text, revealedAnswer } = fallbackLessonHelp(prompt);
  return {
    text,
    kind,
    assistanceAfter: assistanceAfterHelp(kind, input.assistanceSoFar, revealedAnswer),
    revealedAnswer,
    source: 'offline',
    unavailableReason: reason ?? tutorUnavailableReason() ?? undefined,
  };
}

/** Ask Mr EZ, and fall back to the lesson itself when he cannot answer.
 *
 *  Only ever called from a student pressing something: never on render,
 *  never on a timer, never on navigation. */
export async function requestLessonHelp(input: HelpAskInput): Promise<HelpResult> {
  if (input.underAssessment) {
    return {
      text: HELP_BLOCKED_TEXT,
      kind: input.kind,
      assistanceAfter: input.assistanceSoFar,
      revealedAnswer: false,
      source: 'offline',
      blocked: true,
    };
  }

  if (!isTutorConfigured()) return offlineHelp(input);

  try {
    const reply = await askLessonHelp({
      kind: input.kind,
      lessonKey: input.lessonKey,
      blockId: input.blockId,
      item: input.item,
      previousHints: input.previousHints.slice(-4),
      assistanceSoFar: input.assistanceSoFar,
      versions: input.versions,
      sessionId: input.sessionId,
      locale: input.locale,
    });
    /* The reply's own kind, not the one that was asked for, and the level
       worked out here from what was actually given. */
    const kind = reply.kind ?? input.kind;
    return {
      text: reply.text,
      kind,
      assistanceAfter:
        reply.assistanceAfter ?? assistanceAfterHelp(kind, input.assistanceSoFar, reply.revealedAnswer),
      revealedAnswer: Boolean(reply.revealedAnswer),
      source: reply.live ? 'live' : 'simulated',
    };
  } catch (error) {
    const reason = error instanceof TutorClientError ? error.message : undefined;
    return offlineHelp(input, reason);
  }
}
