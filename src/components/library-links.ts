/* Deep-linking into the supporting libraries (model answers, cue cards, the
 * band ladder, saved lessons and notes) from wherever a session step, a
 * graded result or a saved lesson decides one exact item is worth opening.
 *
 * Each of the four pages parses its OWN item identity from its own natural
 * query param (ModelAnswers already reads `?task=<promptId>`, CueCardBank
 * reads `?card=<id>`, and so on). That part stays page-specific, because
 * "which item" means something different on each page. What is shared, and
 * lives here, is the SMALL, FIXED vocabulary of *why* a link points here,
 * so every page shows a consistent, curated, bilingual sentence instead of
 * whatever free text a future caller happens to pass. A caller that has not
 * been built yet (the Writing report, the Speaking result, a lesson's save
 * button) sends `?reason=<one of these keys>`; an unrecognised or missing
 * key just means plain, unexplained browsing, which stays available either
 * way.
 *
 * THE ONE RULE THAT MUST HOLD ON THE RECEIVING END, NOT JUST THE SENDING END
 * "A full model solution is offered only after the student's own attempt"
 * (lead decision, 19 September 2026). A caller could pass
 * `reason=after-writing-attempt` without it being true, so ModelAnswers.tsx
 * does not trust the query string alone: it checks the student's own
 * recorded attempts on that exact prompt (getWritingAttempts) and only
 * honours the reason, and records the modest "studied after an attempt"
 * evidence, when canLinkModelAnswer says there really was one. Independent
 * browsing of the same model is unaffected either way. */

export type LibraryReasonKey =
  | 'after-writing-attempt'
  | 'after-speaking-result'
  | 'same-family'
  | 'saved-block'
  | 'from-session';

/** Plain English literals, translated at the point each page renders them
    (the same choice session.ts makes for SESSION_SENTENCES and
    checkpoints.ts makes for CHECKPOINT_REASON_SENTENCES): this file has no
    say in which language that is. */
export const LIBRARY_REASON_SENTENCES: Record<LibraryReasonKey, string> = {
  'after-writing-attempt':
    'Compare this with what you just wrote. Notice what the model states in its first two sentences that yours does not yet.',
  'after-speaking-result':
    'This is close to the band your result pointed to. Notice how it handles the same part of the task.',
  'same-family':
    'From the same family as the card you just practised, so the vocabulary you just used still applies.',
  'saved-block': 'The exact part of the lesson you saved.',
  'from-session': 'Sent here for a reason: read the note above before you move on.',
};

const KNOWN_REASONS = new Set<string>(Object.keys(LIBRARY_REASON_SENTENCES));

/** Reads `?reason=` from a location.search string (or any query string) and
    returns it only when it is one of the known keys, so a stray or stale
    value never renders a sentence that does not exist. */
export function parseLibraryReason(search: string): LibraryReasonKey | null {
  const value = new URLSearchParams(search).get('reason');
  return value && KNOWN_REASONS.has(value) ? (value as LibraryReasonKey) : null;
}

/** The rule described in the file header, as one small testable predicate:
    a model answer may carry the "compare with your own attempt" framing,
    and the modest evidence that goes with it, only once the student has a
    real recorded attempt on this exact prompt. */
export function canLinkModelAnswer(hasAttempted: boolean): boolean {
  return hasAttempted === true;
}
