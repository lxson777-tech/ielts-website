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

/* ── Building the links, from the reports that now send them ───────────── */

/* WP22 built the receiving side of all four libraries and could not add the
   links INTO them, because a graded report is owned elsewhere. These are
   those links, as small pure functions so the rule behind each one has a
   test rather than living inside a template. Every href here is internal
   and unprefixed, the same convention the rest of the site follows; the
   caller applies withBase(). */

/** The model answer for one exact Writing prompt, framed as a comparison
    with the student's own attempt. Only ever built on a REPORT, which
    means an attempt has already happened; ModelAnswers.tsx checks that for
    itself anyway (see canLinkModelAnswer). */
export function modelAnswerHref(promptId: string): string {
  return `/writing/models?task=${encodeURIComponent(promptId)}&reason=after-writing-attempt`;
}

/** The band ladder, opened on one paper, one criterion and the band the
    student is at now. */
export function bandLadderHref(paper: 'writing' | 'speaking', criterion: string, from: number): string {
  return (
    `/learn/bands?paper=${paper}&criterion=${encodeURIComponent(criterion)}` +
    `&from=${Math.round(from)}&reason=after-speaking-result`
  );
}

/** One cue card in the bank, framed as the same family as the one just
    practised. */
export function cueCardHref(cardId: string): string {
  return `/speaking/cue-cards?card=${encodeURIComponent(cardId)}&reason=same-family`;
}

/** The criterion worth opening the band ladder on: the LOWEST one that is
 *  still below what this student needs.
 *
 *  Null when they have no required band (nothing to be below) or when
 *  every criterion already meets it, because "here is your weakest area"
 *  is a different and less useful claim than "here is the one holding you
 *  short of your target". Ties break on the order the criteria are given,
 *  which is the order the exam reports them, so the same result always
 *  produces the same link. */
export function lowestCriterionBelow(
  criteria: readonly { key: string; band: number }[],
  requiredBand: number | null,
): { key: string; band: number } | null {
  if (requiredBand === null || !Number.isFinite(requiredBand)) return null;
  let lowest: { key: string; band: number } | null = null;
  for (const entry of criteria) {
    if (!Number.isFinite(entry.band) || entry.band >= requiredBand) continue;
    if (!lowest || entry.band < lowest.band) lowest = { key: entry.key, band: entry.band };
  }
  return lowest;
}

/** The eight cue card families in src/data/cue-cards.ts. Repeated as plain
    strings rather than imported, because that file is 110 KB of model
    answers and the Speaking trainer must not carry it to build one link.
    tests/checkpoints-and-libraries.test.ts checks the two agree. */
export type CueCardFamilyKey = 'person' | 'place' | 'object' | 'event' | 'activity' | 'media' | 'plan' | 'skill';

/** One real card per family, so a link can be built without loading the
    bank. Chosen as the plainest example of each. The same test checks each
    id is a real card of that family, so a renamed card fails loudly here
    instead of producing a link to nothing. */
export const CUE_CARD_FAMILY_EXAMPLE: Record<CueCardFamilyKey, string> = {
  person: 'person-family-admire',
  place: 'place-relax',
  object: 'object-technology',
  event: 'event-celebration',
  activity: 'activity-hobby',
  media: 'media-book',
  plan: 'plan-near-future',
  skill: 'skill-useful',
};

/* What a Part 2 topic has to SAY for its family to be certain. Matched
   against the topic sentence in order, first hit wins, and a topic that
   matches nothing gets no link at all. Deliberately narrow: "a cue card
   like the one you just did" is only worth offering when it really is
   like it, and a wrong family would send a student to unrelated
   vocabulary. */
const FAMILY_PATTERNS: readonly [CueCardFamilyKey, RegExp][] = [
  ['skill', /\bskill\b/i],
  ['media', /\b(book|story|film|movie|tv programme|tv program|series|song|music event)\b/i],
  ['person', /\b(person|friend|child|someone|people you know|family member)\b/i],
  ['place', /\b(place|city|country|building|shopping centre|shopping center|town)\b/i],
  ['object', /\b(technology|app|thing you bought|something you bought|object|possession)\b/i],
  ['event', /\b(occasion|festival|event|celebration|journey|trip|time when|time you)\b/i],
  ['activity', /\b(hobby|activity|sport|game)\b/i],
  ['plan', /\b(plan|would like to (work|try|take|visit|own|learn))\b/i],
];

/** The cue card family a Part 2 topic plainly belongs to, or null.
 *
 *  Never guessed. A topic whose wording does not clearly name a family
 *  returns null and the report simply offers no cue card, which is better
 *  than sending somebody to a card about a person after they spoke about
 *  a place. */
export function cueCardFamilyOf(topic: string): CueCardFamilyKey | null {
  for (const [family, pattern] of FAMILY_PATTERNS) {
    if (pattern.test(topic)) return family;
  }
  return null;
}
