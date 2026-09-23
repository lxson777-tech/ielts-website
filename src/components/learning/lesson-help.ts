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
 * WHOSE HELP IT IS (the follow-up to R2E-02, 23 September 2026)
 * Help belongs to the student who pressed the button. The tutor client
 * already drops a reply that comes back after the page changed hands, and
 * this module then falls back to the lesson's own answer, so SOMETHING
 * always comes back. Where it went was the screen's business, and the
 * screens handed it to whoever was on the page by then: shown to them, and
 * written into their help state. requestOwnedLessonHelp below is the one
 * way a screen asks now. It binds the request to the owner on the page at
 * the press, exactly as runOwnedGrade binds a grade (src/lib/store-owner.ts):
 * the help is KEPT for that owner through the screen's own explicit-owner
 * writer, SHOWN only while that owner has been on the page throughout, and
 * otherwise let go of.
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
import type { CacheOwner } from '../../lib/learning/contracts/sync';
import { runOwnedGrade, type OwnerBinding, type OwnerBindingState } from '../../lib/store-owner';

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

/* ── Whose help it is ────────────────────────────────────────────────────── */

/** What a screen does with the help it asked for, in the three situations
    it can arrive in. The runOwnedGrade contract, applied to help. */
export interface OwnedHelpSteps {
  /** Keep it for `owner`: the student on the page when the button was
      pressed, whoever is here by now. Runs once for every reply, including
      the lesson's own fallback. Write it through a writer that takes that
      owner, never through one that asks who is on the page. Optional: a
      surface that records no help leaves it out. */
  keep?(result: HelpResult, owner: CacheOwner): void;
  /** Show it: the student who asked has been the one on the page
      throughout. The only place a reply may be painted, or handed to a
      surface that records it against whoever is on the page. */
  show(result: HelpResult): void;
  /** The page changed hands while the help was on its way: show none of
      it and let go of what was on screen for that student. */
  hide?(result: HelpResult): void;
}

/** Ask for help for the student `binding` was made for (bindToCurrentOwner,
 *  at the press), keep it for them, and only then decide what the screen
 *  may do with it. Returns where the binding stood when the help arrived.
 *
 *  Never throws for a failed tutor: requestLessonHelp always answers, with
 *  the lesson's own sentence at worst, so there is always something to
 *  keep and nothing is ever silently dropped. */
export function requestOwnedLessonHelp(
  binding: OwnerBinding,
  input: HelpAskInput,
  steps: OwnedHelpSteps,
): Promise<OwnerBindingState> {
  return runOwnedGrade(binding, () => requestLessonHelp(input), {
    keep: (result, owner) => steps.keep?.(result, owner),
    show: (result) => steps.show(result),
    hide: (result) => steps.hide?.(result),
  });
}
