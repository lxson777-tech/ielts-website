/* WP21, vocabulary integration.
 *
 * Two things this file exists to prove that nothing else in the repo
 * proves:
 *
 * 1. The real 36-topic, ~719-word deck actually loads, per topic, in the
 *    real Astro build path. tests/learning-index.test.ts already checks the
 *    generated index's word counts; this file checks vocab-review.ts's own
 *    card-building logic directly, by reading the 36 real lesson bodies off
 *    disk (fs.readFileSync, the ONE way to see the real-build deck under
 *    plain Node, since import.meta.glob does not exist here) and feeding
 *    them into buildCardSetFromFragments(), the pure function extracted
 *    from buildCardSet() for exactly this purpose. CARD_SET itself, the
 *    module-level export other files import, still falls back to the
 *    words.ts-only 146-word/14-topic deck under Node; that is correct for
 *    its callers and is left alone; this file does not assert against it.
 * 2. The three review modes (recognise, recall, use in a sentence) and the
 *    planner-facing pure functions behave exactly as vocab-review.ts's own
 *    doc comments say, with no browser: every function under test here
 *    takes its data as a plain argument and touches no global, which is
 *    what lets it run under node:test at all.
 *
 * rate() and recordReviewOutcome() themselves are browser-only (localStorage
 * behind loadStore()/saveStore(), guarded by `typeof window`). Under plain
 * Node, `window` does not exist, so every loadStore() call returns a fresh
 * empty store and nothing persists between calls, the same reason
 * tests/learning-index.test.ts's own note says "no DOM and no localStorage
 * shim anywhere in tests/". That is why the mode/scheduling BEHAVIOUR is
 * tested through the pure decision functions (chooseReviewMode,
 * outcomeGrade, isRecallSuccess, isWordKnown) rather than through rate()'s
 * storage side effect, and why rate() itself is only smoke-tested for its
 * one still-guaranteed contract: a fresh card's very first rating.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCardSetFromFragments,
  CARD_SET,
  checkRecallAnswer,
  checkSentenceUsage,
  chooseReviewMode,
  isRecallSuccess,
  isWordKnown,
  LOW_LEXICAL_RESOURCE_BAND,
  MIN_SENTENCE_WORDS,
  observedVocabProblems,
  outcomeGrade,
  rate,
  relevantVocabTopics,
  sentenceMentionsWord,
  vocabAssistanceLevel,
  vocabRecallDueSummary,
  wordsDueForRecall,
  type VocabCard,
  type VocabCardState,
  type VocabStoreV1,
} from '../src/lib/vocab-review.ts';
import { VOCABULARY_PARTS } from '../src/data/vocabulary.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const LESSON_BODIES_DIR = path.join(REPO_ROOT, 'src', 'content', 'lesson-bodies');

/** Every real vocabulary-<slug>.html fragment, read off disk once for the
    whole file, keyed the way import.meta.glob's eager result is keyed
    (buildCardSetFromFragments only cares that the key ENDS in
    vocabulary-<slug>.html, so a bare filename works as well as a full
    relative path). This is the real content Astro serves, not a fixture. */
function readRealFragments(): Record<string, string> {
  const fragments: Record<string, string> = {};
  for (const name of readdirSync(LESSON_BODIES_DIR)) {
    if (/^vocabulary-[a-z-]+\.html$/.test(name)) {
      fragments[name] = readFileSync(path.join(LESSON_BODIES_DIR, name), 'utf8');
    }
  }
  return fragments;
}

const REAL_CARD_SET: VocabCard[] = buildCardSetFromFragments(readRealFragments());

/* ------------------------------------------------------------------ */
/* 1. Loading: every one of the 36 topics, real counts                 */
/* ------------------------------------------------------------------ */

/** Exactly what the real Astro build produces today: 35 topics of 20 words
    plus Conjunctions at 18, merged with words.ts and deduplicated by word
    (case-insensitive, first copy wins: words.ts is read first, so a topic
    whose lesson repeats a words.ts entry ends up with fewer than 20, and a
    topic whose words.ts entries are NOT already in its lesson table ends up
    with more than 20). Pinned exactly, not just "at least 18", so a topic
    whose table silently stops parsing is caught immediately rather than
    merely warned about. */
const EXPECTED_TOPIC_CARD_COUNTS: Record<string, number> = {
  ageing: 20,
  ai: 18,
  animals: 20,
  arts: 20,
  books: 19,
  business: 20,
  childhood: 20,
  conjunctions: 18,
  crime: 20,
  education: 21,
  environment: 20,
  family: 20,
  fashion: 20,
  food: 20,
  government: 20,
  health: 21,
  housing: 20,
  language: 20,
  leisure: 20,
  media: 20,
  money: 20,
  'music-film': 20,
  people: 20,
  places: 20,
  science: 20,
  'social-media': 20,
  society: 21,
  sport: 20,
  success: 20,
  technology: 21,
  traditions: 20,
  transport: 20,
  travel: 20,
  volunteering: 20,
  weather: 20,
  work: 20,
};

test('the vocabulary library really is 36 topics, and the real build reads a lesson body for each one', () => {
  const files = readdirSync(LESSON_BODIES_DIR).filter((f) => /^vocabulary-[a-z-]+\.html$/.test(f));
  assert.equal(files.length, 36, 'expected 36 vocabulary-<slug>.html lesson bodies on disk');
  assert.equal(VOCABULARY_PARTS.length, 36, 'VOCABULARY_PARTS should list the same 36 topics');
  assert.deepEqual(
    files.map((f) => f.replace(/^vocabulary-/, '').replace(/\.html$/, '')).sort(),
    VOCABULARY_PARTS.map((p) => p.slug).sort(),
    'every lesson body has a matching VOCABULARY_PARTS entry, and vice versa',
  );
});

test('every one of the 36 topics contributes cards to the real-build review deck (per-topic counts)', () => {
  const byTopicTitle = new Map<string, number>();
  for (const card of REAL_CARD_SET) byTopicTitle.set(card.topic, (byTopicTitle.get(card.topic) ?? 0) + 1);

  const actual: Record<string, number> = {};
  const zeroTopics: string[] = [];
  for (const part of VOCABULARY_PARTS) {
    const count = byTopicTitle.get(part.title) ?? 0;
    actual[part.slug] = count;
    if (count === 0) zeroTopics.push(part.slug);
  }

  assert.deepEqual(zeroTopics, [], `these topics contributed zero cards to the review deck: ${zeroTopics.join(', ')}`);
  assert.deepEqual(actual, EXPECTED_TOPIC_CARD_COUNTS, 'per-topic card counts in the real-build deck');
});

test('the real-build deck totals 719 cards, well above the 146 plain Node alone would see', () => {
  assert.equal(REAL_CARD_SET.length, 719);
  // CARD_SET is the module's own export, built without disk fragments under
  // Node (see the file header). Confirms the two are genuinely different
  // code paths, not the same number by coincidence.
  assert.equal(CARD_SET.length, 146);
  assert.ok(REAL_CARD_SET.length > CARD_SET.length);
});

test('the newer expanded topics (added this week) are not somehow thinner than the original ones', () => {
  // The ten, then twelve, topics added most recently are exactly the ones
  // with no words.ts entries of their own (WORDS_TOPIC_TO_SLUG only maps
  // the original 14), so every one of their cards comes from the lesson
  // body alone: 20 words, or one or two fewer when a word happens to spell
  // the same as an entry under a DIFFERENT words.ts topic (global,
  // cross-topic dedup by spelling; "books" loses one this way today). If
  // the newer markup ever stopped matching the table-row parser, one of
  // these would fall well below that, which is what this checks for.
  const newerTopicSlugs = VOCABULARY_PARTS.map((p) => p.slug).filter(
    (slug) => !['ai', 'conjunctions', 'crime', 'education', 'environment', 'family', 'government', 'health', 'housing', 'social-media', 'society', 'technology', 'travel', 'work'].includes(slug),
  );
  assert.equal(newerTopicSlugs.length, 22, 'expected 22 topics with no words.ts entries of their own');
  for (const slug of newerTopicSlugs) {
    assert.ok(
      EXPECTED_TOPIC_CARD_COUNTS[slug]! >= 18,
      `${slug}: expected close to the lesson's own 20 words, got ${EXPECTED_TOPIC_CARD_COUNTS[slug]}`,
    );
  }
});

/* ------------------------------------------------------------------ */
/* 2. Mode selection and "known"                                       */
/* ------------------------------------------------------------------ */

function freshCardState(overrides: Partial<VocabCardState> = {}): VocabCardState {
  return {
    ease: 2.5,
    interval: 0,
    due: '2026-09-22',
    reps: 0,
    lapses: 0,
    introducedDate: '2026-09-22',
    ...overrides,
  };
}

test('a never-reviewed word, and a lapsed word reset to reps 0, both go to recognise', () => {
  assert.equal(chooseReviewMode(undefined), 'recognise');
  assert.equal(chooseReviewMode(freshCardState({ reps: 0 })), 'recognise');
  assert.equal(chooseReviewMode(freshCardState({ reps: 0, lapses: 3 })), 'recognise');
});

test('once reviewed but not yet known, mode alternates between recall and use', () => {
  assert.equal(chooseReviewMode(freshCardState({ reps: 1 })), 'recall');
  assert.equal(chooseReviewMode(freshCardState({ reps: 2 })), 'use');
  assert.equal(chooseReviewMode(freshCardState({ reps: 3 })), 'recall');
});

test('once known (two separate successful recall days), mode is mostly recall with use every third pass', () => {
  const known = freshCardState({ reps: 3, recallSuccessDates: ['2026-09-01', '2026-09-10'] });
  assert.equal(chooseReviewMode({ ...known, reps: 3 }), 'use'); // 3 % 3 === 0
  assert.equal(chooseReviewMode({ ...known, reps: 4 }), 'recall');
  assert.equal(chooseReviewMode({ ...known, reps: 5 }), 'recall');
  assert.equal(chooseReviewMode({ ...known, reps: 6 }), 'use');
});

test('recognition alone never marks a word known, no matter how many times', () => {
  assert.equal(isWordKnown(freshCardState({ reps: 5, recallSuccessDates: [] })), false);
  assert.equal(isRecallSuccess('recognise', true, false), false, 'a correct RECOGNISE outcome is never a recall success');
});

test('use in a sentence never marks a word known either, even when correct and unassisted', () => {
  assert.equal(isRecallSuccess('use', true, false), false);
});

test('a single successful recall is not enough; two separate days are', () => {
  assert.equal(isWordKnown(freshCardState({ recallSuccessDates: ['2026-09-10'] })), false);
  assert.equal(isWordKnown(freshCardState({ recallSuccessDates: ['2026-09-10', '2026-09-10'] })), false, 'the same day twice is one day');
  assert.equal(isWordKnown(freshCardState({ recallSuccessDates: ['2026-09-10', '2026-09-17'] })), true);
});

test('a stored card state written before recallSuccessDates existed still loads and behaves sensibly', () => {
  // The exact shape ielts.vocab.v1 held before this package: no
  // recallSuccessDates field at all, not even an empty array.
  const legacy = { ease: 2.6, interval: 6, due: '2026-09-25', reps: 2, lapses: 0, introducedDate: '2026-09-01' } as VocabCardState;
  assert.equal(isWordKnown(legacy), false);
  assert.doesNotThrow(() => chooseReviewMode(legacy));
  assert.equal(chooseReviewMode(legacy), 'use'); // reps 2, not known
});

/* ------------------------------------------------------------------ */
/* 3. Recall mode: lenient check, and a revealed answer is assisted    */
/* ------------------------------------------------------------------ */

test('recall is checked leniently for case and surrounding/repeated whitespace', () => {
  assert.equal(checkRecallAnswer('Biodiversity', 'biodiversity'), true);
  assert.equal(checkRecallAnswer('  biodiversity  ', 'biodiversity'), true);
  assert.equal(checkRecallAnswer('carbon   footprint', 'carbon footprint'), true);
});

test('typed answers are never auto-corrected: a near-miss spelling is wrong, not fixed', () => {
  assert.equal(checkRecallAnswer('biodiversty', 'biodiversity'), false);
  assert.equal(checkRecallAnswer('carbon foot print', 'carbon footprint'), false);
});

test('a revealed answer is assisted', () => {
  assert.equal(vocabAssistanceLevel(true), 'answer-shown');
  assert.equal(vocabAssistanceLevel(false), 'none');
});

test('outcomeGrade: only an unassisted correct answer is good, everything else sends the card back', () => {
  assert.equal(outcomeGrade(true, false), 'good');
  assert.equal(outcomeGrade(false, false), 'again');
  assert.equal(outcomeGrade(true, true), 'again', 'assisted correctness is still assisted, never a clean pass');
  assert.equal(outcomeGrade(false, true), 'again');
});

test('a recall success requires recall direction, correct, and unassisted, all three', () => {
  assert.equal(isRecallSuccess('recall', true, false), true);
  assert.equal(isRecallSuccess('recall', true, true), false, 'revealed, so not a success even though "correct" was not lied about');
  assert.equal(isRecallSuccess('recall', false, false), false);
});

/* ------------------------------------------------------------------ */
/* 4. Use in a sentence: the mechanical floor                          */
/* ------------------------------------------------------------------ */

test('a sentence that uses the exact word, at a sensible length, passes', () => {
  const result = checkSentenceUsage('Deforestation is destroying the rainforest at an alarming rate.', 'deforestation');
  assert.equal(result.mentionsWord, true);
  assert.equal(result.longEnough, true);
  assert.equal(result.passes, true);
});

test('a simple inflected form of the word still counts as using it', () => {
  assert.equal(sentenceMentionsWord('Many people are working from home now.', 'work'), true);
  assert.equal(sentenceMentionsWord('The students are learning quickly.', 'learn'), true);
  // Deliberately modest, not a real lemmatiser: it strips common endings by
  // simple suffix removal, which the doc comment on looseStem() names as
  // the limit. A word whose own base form happens to end in one of those
  // same endings (an -er verb like "endanger", stripped as if it were the
  // comparative suffix) can miss a genuine inflection. That is the
  // documented trade-off, not a regression to chase here.
});

test('a sentence that never uses the word at all fails the mechanical check', () => {
  const result = checkSentenceUsage('This is a perfectly long sentence about something else entirely.', 'biodiversity');
  assert.equal(result.mentionsWord, false);
  assert.equal(result.passes, false);
});

test('a sentence under the minimum length fails, even if it uses the word', () => {
  const result = checkSentenceUsage('Pollution bad.', 'pollution');
  assert.equal(result.mentionsWord, true);
  assert.equal(result.longEnough, false);
  assert.equal(result.passes, false);
  assert.ok(MIN_SENTENCE_WORDS >= 4);
});

test('a multi-word term must appear as the phrase, not just its separate parts scattered around', () => {
  assert.equal(sentenceMentionsWord('My carbon footprint has gone down this year.', 'carbon footprint'), true);
  assert.equal(
    sentenceMentionsWord('The footprint in the sand was carbon dated by scientists.', 'carbon footprint'),
    false,
  );
});

/* ------------------------------------------------------------------ */
/* 5. Planner-facing pure functions: due selection, relevance, problems */
/* ------------------------------------------------------------------ */

function makeStore(cards: Record<string, VocabCardState>): VocabStoreV1 {
  return { version: 1, settings: { newPerDay: 10 }, cards };
}

const PLANNER_FIXTURE_CARDS: VocabCard[] = [
  { word: 'alpha', definition: 'a', example: '', topic: 'Topic A' },
  { word: 'beta', definition: 'b', example: '', topic: 'Topic A' },
  { word: 'gamma', definition: 'g', example: '', topic: 'Topic B' },
  { word: 'delta', definition: 'd', example: '', topic: 'Topic B' },
];

test('wordsDueForRecall: due, already-introduced words only, and is deterministic for a fixed date', () => {
  const today = '2026-09-22';
  const store = makeStore({
    // never reviewed: excluded, this is recognise territory
    alpha: freshCardState({ due: '2026-09-20', reps: 0 }),
    // reviewed, due today: included
    beta: freshCardState({ due: today, reps: 2 }),
    // reviewed, overdue: included
    gamma: freshCardState({ due: '2026-09-10', reps: 1 }),
    // reviewed, due in the future: excluded
    delta: freshCardState({ due: '2026-10-01', reps: 4 }),
  });

  const due = wordsDueForRecall(PLANNER_FIXTURE_CARDS, store, today);
  assert.deepEqual(
    due.map((w) => w.word).sort(),
    ['beta', 'gamma'],
  );
  for (const w of due) assert.ok(w.mode === 'recall' || w.mode === 'use');

  // Same inputs, same date: same result, every time.
  const again = wordsDueForRecall(PLANNER_FIXTURE_CARDS, store, today);
  assert.deepEqual(due, again);
});

test('vocabRecallDueSummary: count and per-topic breakdown agree with wordsDueForRecall', () => {
  const today = '2026-09-22';
  const store = makeStore({
    alpha: freshCardState({ due: today, reps: 1 }),
    beta: freshCardState({ due: today, reps: 1 }),
    gamma: freshCardState({ due: today, reps: 1 }),
  });
  const summary = vocabRecallDueSummary(PLANNER_FIXTURE_CARDS, store, today);
  assert.equal(summary.count, 3);
  assert.deepEqual(summary.byTopic, { 'Topic A': 2, 'Topic B': 1 });
});

/* Two real prompts from the live imported pool (src/data/writing-prompts.ts
   -> src/data/writing-prompts-imported.ts), picked because
   relevantVocabTopics() names exactly one clear top topic for each, run
   against the real 36-topic deck (REAL_CARD_SET, not the Node-limited
   CARD_SET) so the result matches what a student would actually see. */
test('topic relevance picks the expected topic for a real environment-themed prompt', () => {
  const prompt = WRITING_PROMPTS.find((p) => p.id === 'pte-wt-127-task2');
  assert.ok(prompt, 'fixture prompt pte-wt-127-task2 should exist in the imported pool');
  const text = `${prompt!.title} ${prompt!.promptHtml}`;
  assert.match(text, /environmental/i, 'sanity: the fixture prompt should still say "environmental"');

  const result = relevantVocabTopics(text, REAL_CARD_SET);
  assert.ok(result.length > 0, 'expected at least one relevant topic');
  assert.equal(result[0]!.slug, 'environment');
});

test('topic relevance picks the expected topic for a real work/employment-themed prompt', () => {
  const prompt = WRITING_PROMPTS.find((p) => p.id === 'pte-wt-104-task2');
  assert.ok(prompt, 'fixture prompt pte-wt-104-task2 should exist in the imported pool');
  const text = `${prompt!.title} ${prompt!.promptHtml}`;
  assert.match(text, /self-employed/i, 'sanity: the fixture prompt should still be about self-employment');

  const result = relevantVocabTopics(text, REAL_CARD_SET);
  assert.ok(result.length > 0, 'expected at least one relevant topic');
  assert.equal(result[0]!.slug, 'work');
});

test('observedVocabProblems: a word failed twice is flagged, a word failed once is not', () => {
  const store = makeStore({
    alpha: freshCardState({ lapses: 2 }),
    beta: freshCardState({ lapses: 1 }),
    gamma: freshCardState({ lapses: 0 }),
  });
  const problems = observedVocabProblems(store, PLANNER_FIXTURE_CARDS);
  assert.deepEqual(
    problems.filter((p) => p.reason === 'repeated-recall-failure').map((p) => p.word),
    ['alpha'],
  );
});

test('observedVocabProblems: a low recent Lexical Resource average is flagged, read-only, never invented', () => {
  const store = makeStore({});
  const noSignal = observedVocabProblems(store, PLANNER_FIXTURE_CARDS, []);
  assert.deepEqual(noSignal, [], 'no bands supplied: no opinion offered');

  const low = observedVocabProblems(store, PLANNER_FIXTURE_CARDS, [5, 5, 4.5]);
  assert.ok(low.some((p) => p.reason === 'low-lexical-resource'));

  const healthy = observedVocabProblems(store, PLANNER_FIXTURE_CARDS, [7, 7.5, 7]);
  assert.ok(!healthy.some((p) => p.reason === 'low-lexical-resource'));

  assert.ok(LOW_LEXICAL_RESOURCE_BAND > 0 && LOW_LEXICAL_RESOURCE_BAND < 9, 'a plausible IELTS band threshold');
});

/* ------------------------------------------------------------------ */
/* 6. rate() still behaves for a fresh card (unchanged scheduling)     */
/* ------------------------------------------------------------------ */

test('rate() still returns a sensible fresh-card state for a real word, additively (return value, not void)', () => {
  const word = CARD_SET[0]!.word; // any real word from the Node-visible deck
  const state = rate(word, 'good');
  assert.ok(state, 'rate() should return the new state for a known word');
  assert.equal(state!.reps, 1);
  assert.equal(state!.interval, 1, "SM-2's own rule: first 'good' rating is a 1-day interval");
  assert.equal(state!.lapses, 0);
});

test('rate() returns undefined for a word that is not in the deck, and never throws', () => {
  assert.equal(rate('not a real vocabulary word at all', 'good'), undefined);
});
