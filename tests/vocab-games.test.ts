/* The vocabulary games' rules (/review/games, 8 October 2026): which words
   a game plays with, Match scoring and best times, the sprint's score,
   streak and minute, and Spell it's check, hint and recording plan. Pure,
   with plain objects and a seeded random; no browser.

   Run on its own with:
     node --import ./tests/ts-extension-loader.mjs --test tests/vocab-games.test.ts */

import test from 'node:test';
import assert from 'node:assert/strict';

import type { VocabCard, VocabCardState } from '../src/lib/vocab-review.ts';
import {
  buildGameSet,
  canShareBoard,
  gameQuery,
  isSpellable,
  orderForGame,
  parseGameParams,
  pickMatchBoard,
  seededRandom,
  studiedTopicTitles,
  MATCH_PAIRS,
  SPELL_SET_SIZE,
} from '../src/lib/vocab-games/sets.ts';
import { matchFinished, matchRecording, newMatchBoard, pressTile, type MatchState } from '../src/lib/vocab-games/match.ts';
import { elapsedMs, formatClock, pauseClock, resumeClock, startClock } from '../src/lib/vocab-games/clock.ts';
import {
  SPRINT_MS,
  answerSprint,
  newSprint,
  showsFlame,
  sprintOver,
  sprintQuestion,
  sprintTimeLeft,
} from '../src/lib/vocab-games/sprint.ts';
import {
  checkSpelling,
  letterSlots,
  maxHints,
  newSpellQueue,
  nextHint,
  requeueForLater,
  spellOutcome,
  spellPrompt,
  spellRecordPlan,
  spellSummary,
} from '../src/lib/vocab-games/spell.ts';
import { emptyBests, mergeBests, parseBests, recordMatchTime, recordSprintScore } from '../src/lib/vocab-games/bests.ts';
import { VOCABULARY_PARTS } from '../src/data/vocabulary.ts';

/* ── A small deck ────────────────────────────────────────────────────── */

function card(word: string, topic: string, definition = `the meaning of ${word}`, example = `People often talk about ${word} these days.`): VocabCard {
  return { word, definition, example, topic };
}

const ENV = 'Environment & Ecology';
const EDU = 'Education & Learning';
const WORK = 'Work & Careers';

const DECK: VocabCard[] = [
  ...['pollution', 'renewable', 'emissions', 'habitat', 'drought', 'recycle', 'deforestation', 'biodiversity'].map((w) => card(w, ENV)),
  ...['curriculum', 'tuition', 'literacy', 'graduate', 'lecture', 'semester'].map((w) => card(w, EDU)),
  ...['promotion', 'salary', 'colleague', 'deadline', 'resign'].map((w) => card(w, WORK)),
];

function state(due: string, lapses = 0, reps = 1): VocabCardState {
  return { ease: 2.5, interval: 1, due, reps, lapses, introducedDate: '2026-10-01' };
}

const TODAY = '2026-10-08';

/* ── The link ────────────────────────────────────────────────────────── */

test('the link reads game and topic, and an unknown topic falls back to the mixed set', () => {
  const slugs = VOCABULARY_PARTS.map((p) => p.slug);
  assert.deepEqual(parseGameParams('?game=match&topic=environment', slugs), { game: 'match', topic: 'environment' });
  assert.deepEqual(parseGameParams('?game=sprint', slugs), { game: 'sprint', topic: null });
  assert.deepEqual(parseGameParams('?game=spell&topic=not-a-topic', slugs), { game: 'spell', topic: null });
  assert.deepEqual(parseGameParams('?game=chess&topic=work', slugs), { game: null, topic: 'work' });
  assert.deepEqual(parseGameParams('', slugs), { game: null, topic: null });
  assert.equal(gameQuery('match', 'ai'), '?game=match&topic=ai');
  assert.equal(gameQuery(null, null), '');
});

/* ── Which words ─────────────────────────────────────────────────────── */

test('with a topic: due words first (most missed at the front), then new, then the rest', () => {
  const states = {
    drought: state('2026-10-07', 1),
    habitat: state('2026-10-08', 3),
    recycle: state('2026-10-20'),
    salary: state('2026-10-01', 5), // another topic: never in an Environment set
  };
  const order = orderForGame({ cards: DECK, states, today: TODAY, topic: ENV }).map((c) => c.word);
  assert.deepEqual(order.slice(0, 2), ['habitat', 'drought'], 'due, most lapses first');
  assert.equal(order.at(-1), 'recycle', 'not due yet: last');
  assert.ok(order.every((w) => DECK.find((c) => c.word === w)!.topic === ENV));
  assert.equal(order.length, 8);
});

test('mixed: due words from every topic, then new words from studied topics, then any', () => {
  const states = {
    salary: state('2026-10-02', 2),
    curriculum: state('2026-10-08'),
    pollution: state('2026-11-01'),
  };
  const studied = new Set([ENV]);
  const order = orderForGame({ cards: DECK, states, today: TODAY, topic: null, studiedTopics: studied, random: seededRandom(7) });
  const words = order.map((c) => c.word);
  assert.deepEqual(words.slice(0, 2), ['salary', 'curriculum'], 'due first, across topics');
  const envNew = DECK.filter((c) => c.topic === ENV && !(c.word in states)).length;
  assert.ok(order.slice(2, 2 + envNew).every((c) => c.topic === ENV), 'then new words from the studied topic');
  assert.ok(order.slice(2 + envNew, -1).every((c) => c.topic !== ENV), 'then new words from anywhere else');
  assert.equal(words.at(-1), 'pollution', 'the rest last');
});

test('studied topics are the ones practised or whose lesson was marked studied', () => {
  const titles = studiedTopicTitles(DECK, { salary: state(TODAY) }, ['vocabulary-education', 'reading-tfng'], VOCABULARY_PARTS);
  assert.deepEqual([...titles].sort(), [EDU, WORK].sort());
});

test('a Match board never holds two words whose meanings could be swapped', () => {
  const a = card('furthermore', 'Conjunctions & Linking Words', 'adds a further point');
  const b = card('moreover', 'Conjunctions & Linking Words', 'adds another point');
  const c = card('however', 'Conjunctions & Linking Words', 'introduces a contrast');
  const d = card('whereas', 'Conjunctions & Linking Words', 'contrasts two facts, unlike however');
  const e = card('therefore', 'Conjunctions & Linking Words', 'introduces a contrast');
  assert.equal(canShareBoard(a, b), false, 'interchangeable linking words');
  assert.equal(canShareBoard(c, d), false, 'a meaning that names the other word');
  assert.equal(canShareBoard(c, e), false, 'the same meaning twice');
  assert.equal(canShareBoard(a, c), true);
  const board = pickMatchBoard([a, b, c, d, e], 6);
  assert.deepEqual(board.map((x) => x.word), ['furthermore', 'however']);
});

test('each game takes its own slice: six pairs, ten spellable words, a long sprint deck', () => {
  const big = [...DECK, card('tenant / landlord', WORK), card('artificial intelligence (AI)', WORK)];
  const input = { cards: big, states: {}, today: TODAY, topic: null, random: seededRandom(3) };
  assert.equal(buildGameSet('match', input).length, MATCH_PAIRS);
  const spell = buildGameSet('spell', input);
  assert.equal(spell.length, SPELL_SET_SIZE);
  assert.ok(spell.every(isSpellable));
  assert.equal(isSpellable(card('tenant / landlord', WORK)), false);
  assert.equal(isSpellable(card('artificial intelligence (AI)', WORK)), false);
  assert.equal(isSpellable(card('carbon footprint', ENV)), true);
  assert.equal(isSpellable(card('well-being', ENV)), true);
  assert.equal(buildGameSet('sprint', input).length, big.length);
  const topicOnly = buildGameSet('match', { ...input, topic: EDU });
  assert.ok(topicOnly.every((c) => c.topic === EDU) && topicOnly.length === 6);
});

/* ── Match pairs ─────────────────────────────────────────────────────── */

function board(): MatchState {
  return newMatchBoard(DECK.filter((c) => c.topic === EDU), seededRandom(11));
}

test('Match: a word then its meaning (or the other way round) settles the pair', () => {
  let s = board();
  let r = pressTile(s, 'w:tuition');
  assert.equal(r.event.kind, 'select');
  r = pressTile(r.state, 'm:tuition');
  assert.deepEqual(r.event, { kind: 'match', word: 'tuition', firstTry: true });
  s = r.state;
  r = pressTile(s, 'm:lecture');
  r = pressTile(r.state, 'w:lecture');
  assert.equal(r.event.kind, 'match');
  assert.deepEqual(r.state.done, ['tuition', 'lecture']);
  assert.equal(pressTile(r.state, 'w:tuition').event.kind, 'ignored', 'a done tile does nothing');
});

test('Match: a wrong pair is one mistake, notes the word once, and a re-tap clears the choice', () => {
  let r = pressTile(board(), 'w:literacy');
  r = pressTile(r.state, 'm:graduate');
  assert.equal(r.event.kind, 'miss');
  assert.equal(r.state.mistakes, 1);
  assert.deepEqual(r.state.missed, ['literacy']);
  assert.equal(r.state.selected, null);
  r = pressTile(r.state, 'm:semester');
  r = pressTile(r.state, 'w:literacy');
  assert.equal(r.state.mistakes, 2);
  assert.deepEqual(r.state.missed, ['literacy'], 'noted once');
  r = pressTile(r.state, 'w:graduate');
  r = pressTile(r.state, 'w:graduate');
  assert.equal(r.event.kind, 'deselect');
  r = pressTile(r.state, 'w:literacy');
  r = pressTile(r.state, 'w:curriculum');
  assert.equal(r.state.selected, 'w:curriculum', 'same side moves the choice');
});

test('Match: what is written to the record, and when the board is finished', () => {
  assert.deepEqual(matchRecording({ kind: 'match', word: 'a', firstTry: true }), { word: 'a', correct: true, retry: false });
  assert.deepEqual(matchRecording({ kind: 'match', word: 'a', firstTry: false }), { word: 'a', correct: true, retry: true });
  assert.deepEqual(matchRecording({ kind: 'miss', word: 'a', otherWord: 'b', first: true, tiles: ['w:a', 'm:b'] }), { word: 'a', correct: false, retry: false });
  assert.equal(matchRecording({ kind: 'miss', word: 'a', otherWord: 'b', first: false, tiles: ['w:a', 'm:b'] }), null, 'a second miss writes nothing more');
  assert.equal(matchRecording({ kind: 'select', tile: { id: 'w:a', side: 'word', word: 'a', text: 'a' } }), null);

  let s = board();
  for (const tile of s.words) {
    s = pressTile(s, tile.id).state;
    s = pressTile(s, `m:${tile.word}`).state;
  }
  assert.equal(matchFinished(s), true);
  assert.equal(s.mistakes, 0);
});

test('Match: the best time per topic, and the clock never counts a pause', () => {
  let bests = emptyBests();
  let r = recordMatchTime(bests, 'education', 42_300, 1, 'x');
  assert.equal(r.isBest, true);
  bests = r.bests;
  r = recordMatchTime(bests, 'education', 50_000, 0, 'y');
  assert.equal(r.isBest, false);
  assert.equal(r.previous?.ms, 42_300);
  r = recordMatchTime(bests, 'education', 42_300, 0, 'z');
  assert.equal(r.isBest, true, 'same time, fewer mistakes');
  assert.equal(recordMatchTime(bests, 'mixed', 60_000, 3, 'w').isBest, true, 'each topic has its own best');

  let clock = startClock(1_000);
  clock = pauseClock(clock, 11_000);
  assert.equal(elapsedMs(clock, 99_000), 10_000);
  clock = resumeClock(clock, 30_000);
  assert.equal(elapsedMs(clock, 32_500), 12_500);
  assert.equal(formatClock(42_350, true), '0:42.3');
  assert.equal(formatClock(65_000), '1:05');
});

/* ── 60-second sprint ────────────────────────────────────────────────── */

test('Sprint: +1 a right answer, a streak with a flame from three, reset by a miss', () => {
  let s = newSprint();
  for (const word of ['a', 'b', 'c']) s = answerSprint(s, word, word).state;
  assert.equal(s.score, 3);
  assert.equal(showsFlame(s.streak), true);
  const miss = answerSprint(s, 'd', 'x');
  assert.equal(miss.correct, false);
  assert.equal(miss.state.streak, 0);
  assert.equal(showsFlame(miss.state.streak), false);
  assert.equal(miss.state.bestStreak, 3);
  assert.deepEqual(miss.state.missed, ['d']);
  assert.equal(miss.state.score, 3);
});

test('Sprint: each word is written to the record once per sprint', () => {
  let s = newSprint();
  const first = answerSprint(s, 'habitat', 'habitat');
  assert.equal(first.record, true);
  s = first.state;
  const again = answerSprint(s, 'habitat', 'drought');
  assert.equal(again.record, false, 'met again later in the same minute');
  assert.deepEqual(again.state.missed, ['habitat'], 'but still listed as missed');
});

test('Sprint: the minute, and an endless deck that comes round again', () => {
  assert.equal(sprintTimeLeft(0), SPRINT_MS);
  assert.equal(sprintTimeLeft(59_950), 50);
  assert.equal(sprintOver(59_999), false);
  assert.equal(sprintOver(60_000), true);
  assert.equal(sprintTimeLeft(70_000), 0);

  const deck = DECK.filter((c) => c.topic === ENV);
  const pool = () => deck;
  const random = seededRandom(5);
  const seen: string[] = [];
  for (let i = 0; i < deck.length * 3; i++) {
    const q = sprintQuestion(deck, i, pool, random)!;
    assert.equal(q.options.length, 4);
    assert.ok(q.options.includes(q.card.word));
    seen.push(q.card.word);
  }
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1], 'never the same word twice in a row');
  assert.equal(new Set(seen.slice(0, deck.length)).size, deck.length, 'each lap shows every word');
  assert.equal(sprintQuestion([], 0, pool), null);
});

test('Sprint: the gap comes from the practice round builder, with the word in its sentence', () => {
  const c = card('recycle', ENV, 'to process used things so they can be used again', 'Most households now recycle glass and paper.');
  const q = sprintQuestion([c, ...DECK.filter((x) => x.topic === ENV && x.word !== 'recycle').slice(0, 3)], 0, () => DECK.filter((x) => x.topic === ENV), seededRandom(1))!;
  assert.equal(q.kind, 'gap');
  assert.equal(q.answerText, 'recycle');
  assert.equal(`${q.before}${q.answerText}${q.after}`, c.example);
});

test('Sprint best: higher wins, and a zero is never a best', () => {
  let r = recordSprintScore(emptyBests(), 'mixed', 0, 'a');
  assert.equal(r.isBest, false);
  r = recordSprintScore(r.bests, 'mixed', 12, 'b');
  assert.equal(r.isBest, true);
  assert.equal(recordSprintScore(r.bests, 'mixed', 12, 'c').isBest, false);
  assert.equal(recordSprintScore(r.bests, 'mixed', 13, 'c').isBest, true);
});

test('bests: two copies join to the better of each, and a damaged copy reads as empty', () => {
  const a = { version: 1 as const, match: { ai: { ms: 40_000, mistakes: 0, at: 'a' } }, sprint: { ai: { score: 9, at: 'a' } } };
  const b = { version: 1 as const, match: { ai: { ms: 38_000, mistakes: 2, at: 'b' }, work: { ms: 50_000, mistakes: 0, at: 'b' } }, sprint: { ai: { score: 7, at: 'b' } } };
  const joined = mergeBests(a, b);
  assert.equal(joined.match.ai!.ms, 38_000);
  assert.equal(joined.match.work!.ms, 50_000);
  assert.equal(joined.sprint.ai!.score, 9);
  assert.deepEqual(parseBests('{not json'), emptyBests());
  assert.deepEqual(parseBests(JSON.stringify({ version: 2 })), emptyBests());
  assert.deepEqual(parseBests(JSON.stringify(a)), a);
});

/* ── Spell it ────────────────────────────────────────────────────────── */

test('Spell: forgiving about case and spaces, exact about spelling', () => {
  assert.equal(checkSpelling('  Pollution ', 'pollution'), true);
  assert.equal(checkSpelling('carbon   footprint', 'carbon footprint'), true);
  assert.equal(checkSpelling('polution', 'pollution'), false);
  assert.equal(checkSpelling('pollutions', 'pollution'), false);
});

test('Spell: letter-count dashes, and a hint shows one letter at a time but never the last', () => {
  const slots = letterSlots('well-being', 0);
  assert.equal(slots.length, 10);
  assert.equal(slots.filter((s) => s.separator).length, 1);
  assert.ok(slots.filter((s) => !s.separator).every((s) => !s.shown));
  assert.deepEqual(
    letterSlots('carbon footprint', 2).filter((s) => s.shown && !s.separator).map((s) => s.char),
    ['c', 'a'],
  );
  assert.equal(maxHints('drought'), 6);
  let revealed = 0;
  for (let i = 0; i < 20; i++) revealed = nextHint('drought', revealed);
  assert.equal(revealed, 6);
});

test('Spell: the gapped sentence, when the word can be found in it', () => {
  const p = spellPrompt(card('recycle', ENV, 'x', 'We recycled every bottle.'))!;
  assert.equal(p.gap, 'recycled');
  assert.equal(spellPrompt(card('tenant / landlord', WORK)), null);
});

test('Spell: what each answer writes. Only unaided and right is a recall success', () => {
  assert.deepEqual(spellRecordPlan(true, false, false), {
    schedule: { kind: 'recall', correct: true, assisted: false },
    evidence: { correct: true, assistance: 'none' },
  });
  assert.deepEqual(spellRecordPlan(true, true, false), {
    schedule: { kind: 'recall', correct: true, assisted: true },
    evidence: { correct: true, assistance: 'hint' },
  });
  assert.deepEqual(spellRecordPlan(false, false, false).schedule, { kind: 'recall', correct: false, assisted: false });
  assert.deepEqual(spellRecordPlan(true, false, true), {
    schedule: { kind: 'rate', grade: 'hard' },
    evidence: { correct: true, assistance: 'answer-shown' },
  });
  assert.deepEqual(spellRecordPlan(false, true, true).schedule, { kind: 'none' });
  assert.equal(spellOutcome(true, false, false), 'spelt');
  assert.equal(spellOutcome(true, true, false), 'helped');
  assert.equal(spellOutcome(true, false, true), 'helped');
  assert.equal(spellOutcome(false, false, false), 'missed');
});

test('Spell: "Try again later" brings a word back once, and the summary counts its best go', () => {
  const queue = newSpellQueue(DECK.slice(0, 3));
  const later = requeueForLater(queue, queue[0]!);
  assert.equal(later.length, 4);
  assert.equal(later[3]!.retry, true);
  assert.equal(requeueForLater(later, later[3]!).length, 4, 'a second go does not come back again');
  const summary = spellSummary([
    { word: 'pollution', outcome: 'spelt', retry: false },
    { word: 'renewable', outcome: 'missed', retry: false },
    { word: 'renewable', outcome: 'helped', retry: true },
    { word: 'emissions', outcome: 'helped', retry: false },
  ]);
  assert.deepEqual(summary, { spelt: ['pollution'], practise: ['renewable', 'emissions'] });
});
