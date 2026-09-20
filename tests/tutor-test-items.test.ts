/* Coverage for src/lib/tutor/test-items.ts: the layer that turns a full
   PracticeTest into the small, publishable shape Mr EZ uses to explain a
   wrong answer. Two kinds of checks live here side by side: a hand-built
   fixture that pins down every prompt-building rule exactly, and a sweep
   over the REAL test bank (ALL_TESTS) that would catch a real data file
   breaking one of those rules or blowing the size budget. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  plainText,
  toSiteTest,
  sourceTestId,
  isPublishedTestId,
  isSiteTest,
  resolveItems,
  summariseByType,
  MAX_REVIEW_ITEMS,
  MAX_GIVEN_CHARS,
  type SiteTest,
  type SiteQuestion,
  type ResolvedItem,
} from '../src/lib/tutor/test-items.ts';
import type { PracticeTest } from '../src/lib/tests/schema.ts';
import { questionTypeLabel } from '../src/lib/tests/question-types.ts';
import { ALL_TESTS } from '../src/data/tests/index.ts';

/* ── plainText ──────────────────────────────────────────────────────────── */

test('plainText strips tags', () => {
  assert.equal(plainText('<b>Hello</b> <em>world</em>', 100), 'Hello world');
  assert.equal(plainText('<p>one</p><p>two</p>', 100), 'one two');
});

test('plainText decodes the common entities', () => {
  assert.equal(plainText('Tom &amp; Jerry', 100), 'Tom & Jerry');
  assert.equal(plainText('&lt;tag&gt; &quot;quoted&quot; &#39;it&#39;s&#39;', 100), '<tag> "quoted" \'it\'s\'');
  assert.equal(plainText('a&nbsp;&nbsp;b', 100), 'a b');
  assert.equal(plainText('&#65;&#x42;', 100), 'AB');
});

test('plainText never leaves a real en or em dash, entity or literal', () => {
  assert.equal(plainText('em&mdash;dash and en&ndash;dash', 100), 'em-dash and en-dash');
  assert.equal(plainText('em—dash and en–dash', 100), 'em-dash and en-dash');
});

test('plainText collapses whitespace and trims', () => {
  assert.equal(plainText('  a   b\n\nc\t d  ', 100), 'a b c d');
});

test('plainText caps length', () => {
  const long = 'x'.repeat(500);
  const capped = plainText(long, 50);
  assert.equal(capped.length, 50);
  assert.equal(capped, 'x'.repeat(50));
});

/* ── toSiteTest ─────────────────────────────────────────────────────────── */

/* Covers, in one small fixture: textHtml as the prompt, before/after
   concatenation, a missing prompt falling back to the group's title, a
   string[] answer joined with ' / ', a multiSelect answer, the group-level
   explanationHtml fallback when a question has no explanation of its own,
   and part numbering across two parts. */
const FIXTURE_TEST: PracticeTest = {
  id: 'fixture-001',
  skill: 'reading',
  title: 'Fixture Test',
  description: 'A small hand-built test, not real content.',
  durationMinutes: 10,
  parts: [
    {
      label: 'Passage 1',
      stimulus: {
        kind: 'passage',
        label: 'Reading Passage 1',
        title: 'Fixture Passage',
        instructionHtml: 'Read the passage.',
        paragraphs: [{ html: '<p>Once upon a time.</p>' }],
      },
      groups: [
        {
          title: 'Questions 1-2',
          type: 'tfng',
          instructionHtml: 'Say True or False.',
          questions: [
            {
              id: 'q1',
              textHtml: '<p>Is the sky <em>blue</em>?</p>',
              answer: 'True',
              explanation: 'Because science.',
              evidence: 'The sky appears blue due to Rayleigh scattering.',
            },
            {
              id: 'q2',
              before: 'The capital of France is',
              after: '.',
              answer: ['Paris', 'paris city'],
            },
          ],
        },
        {
          title: 'Questions 3',
          type: 'multiple-answer',
          instructionHtml: 'Choose two.',
          explanationHtml: '<p>Group-level note about <b>why</b>.</p>',
          questions: [
            {
              id: 'q3',
              answer: 'A, C',
              multiSelect: { correctValues: ['A', 'C'], selectCount: 2 },
            },
          ],
        },
      ],
    },
    {
      label: 'Passage 2',
      stimulus: {
        kind: 'passage',
        label: 'Reading Passage 2',
        title: 'Second Fixture Passage',
        instructionHtml: 'Read the passage.',
        paragraphs: [{ html: '<p>Another day.</p>' }],
      },
      groups: [
        {
          title: 'Question 4',
          type: 'multiple-choice',
          instructionHtml: 'Choose one.',
          questions: [{ id: 'q4', textHtml: 'Pick one', answer: 'B', options: ['A', 'B'] }],
        },
      ],
    },
  ],
};

test('toSiteTest: textHtml becomes the prompt', () => {
  const site = toSiteTest(FIXTURE_TEST);
  const q1 = site.questions.find((q) => q.id === 'q1')!;
  assert.equal(q1.prompt, 'Is the sky blue ?');
  assert.equal(q1.answer, 'True');
  assert.equal(q1.explanation, 'Because science.');
  assert.equal(q1.evidence, 'The sky appears blue due to Rayleigh scattering.');
  assert.equal(q1.type, 'tfng');
  assert.equal(q1.typeLabel, questionTypeLabel('tfng'));
  assert.equal(q1.part, 1);
});

test('toSiteTest: before/after builds the prompt, and a string[] answer is joined with " / "', () => {
  const site = toSiteTest(FIXTURE_TEST);
  const q2 = site.questions.find((q) => q.id === 'q2')!;
  assert.equal(q2.prompt, 'The capital of France is ____ .');
  assert.equal(q2.answer, 'Paris / paris city');
  // No question-level explanation and no group explanationHtml on this group.
  assert.equal(q2.explanation, '');
  assert.equal(q2.evidence, '');
});

test('toSiteTest: a missing prompt falls back to the group title, multiSelect answer is the correctValues, group explanationHtml fills in', () => {
  const site = toSiteTest(FIXTURE_TEST);
  const q3 = site.questions.find((q) => q.id === 'q3')!;
  assert.equal(q3.prompt, 'Questions 3');
  assert.equal(q3.answer, 'A / C');
  // Tag stripping replaces each tag with a space (same reason q1's "?" above
  // gets a leading space), so the closing </b> before the period leaves one.
  assert.equal(q3.explanation, 'Group-level note about why .');
});

test('toSiteTest: questions are numbered by part, in test order', () => {
  const site = toSiteTest(FIXTURE_TEST);
  assert.deepEqual(
    site.questions.map((q) => [q.id, q.part]),
    [
      ['q1', 1],
      ['q2', 1],
      ['q3', 1],
      ['q4', 2],
    ],
  );
});

test('toSiteTest: top-level id/skill/title pass through', () => {
  const site = toSiteTest(FIXTURE_TEST);
  assert.equal(site.id, 'fixture-001');
  assert.equal(site.skill, 'reading');
  assert.equal(site.title, 'Fixture Test');
});

/* ── toSiteTest / isSiteTest against the real test bank ───────────────────
   Not a sample: every published test, because a single oddly-authored
   question (an empty answer, a group with no fallback title, an oversized
   passage quote used as evidence) is exactly the kind of thing that only
   shows up in the real data, never in a fixture written to pass. */

const MAX_JSON_BYTES = 60 * 1024;

test('toSiteTest output is valid, complete and within budget for every real test', () => {
  let totalQuestions = 0;
  let withExplanation = 0;
  const emptyPromptById: string[] = [];
  const emptyAnswerById: string[] = [];

  for (const practiceTest of ALL_TESTS) {
    const site = toSiteTest(practiceTest);
    assert.ok(isSiteTest(site), `${practiceTest.id}: toSiteTest output failed isSiteTest`);

    const ids = site.questions.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length, `${practiceTest.id}: duplicate question ids`);

    for (const q of site.questions) {
      totalQuestions += 1;
      if (q.explanation !== '') withExplanation += 1;
      if (q.prompt === '') emptyPromptById.push(`${practiceTest.id}/${q.id}`);
      if (q.answer === '') emptyAnswerById.push(`${practiceTest.id}/${q.id}`);

      assert.ok(q.prompt.length <= 300, `${practiceTest.id}/${q.id}: prompt over 300 chars`);
      assert.ok(q.answer.length <= 120, `${practiceTest.id}/${q.id}: answer over 120 chars`);
      assert.ok(q.explanation.length <= 500, `${practiceTest.id}/${q.id}: explanation over 500 chars`);
      assert.ok(q.evidence.length <= 300, `${practiceTest.id}/${q.id}: evidence over 300 chars`);
    }

    const bytes = Buffer.byteLength(JSON.stringify(site), 'utf8');
    assert.ok(bytes < MAX_JSON_BYTES, `${practiceTest.id}: published JSON is ${bytes} bytes, over the ${MAX_JSON_BYTES} budget`);
  }

  assert.deepEqual(emptyPromptById, [], 'every question must have a non-empty prompt');
  assert.deepEqual(emptyAnswerById, [], 'every question must have a non-empty answer');

  const explanationRate = withExplanation / totalQuestions;
  assert.ok(
    explanationRate >= 0.95,
    `only ${(explanationRate * 100).toFixed(1)}% of ${totalQuestions} questions have an explanation (need >= 95%)`,
  );
});

/* ── sourceTestId / isPublishedTestId ──────────────────────────────────── */

test('sourceTestId strips a drill suffix, leaves everything else unchanged', () => {
  assert.equal(sourceTestId('reading-full-003-drill-p2'), 'reading-full-003');
  assert.equal(sourceTestId('listening-full-012-drill-p1'), 'listening-full-012');
  assert.equal(sourceTestId('reading-full-003'), 'reading-full-003');
  assert.equal(sourceTestId(''), '');
});

test('isPublishedTestId accepts only the real published shape', () => {
  assert.equal(isPublishedTestId('reading-full-001'), true);
  assert.equal(isPublishedTestId('listening-full-012'), true);
});

test('isPublishedTestId rejects path traversal, an under-padded number, an empty string and a slash', () => {
  assert.equal(isPublishedTestId('../etc/passwd'), false);
  assert.equal(isPublishedTestId('reading-full-1'), false);
  assert.equal(isPublishedTestId(''), false);
  assert.equal(isPublishedTestId('reading-full-001/extra'), false);
  assert.equal(isPublishedTestId('reading/full-001'), false);
});

/* ── isSiteTest ─────────────────────────────────────────────────────────── */

const VALID_SITE_QUESTION: SiteQuestion = {
  id: 'q1',
  part: 1,
  type: 'tfng',
  typeLabel: 'True / False / Not Given',
  prompt: 'Is the sky blue?',
  answer: 'True',
  explanation: 'Because science.',
  evidence: 'The sky is blue.',
};

const VALID_SITE_TEST: SiteTest = {
  id: 'reading-full-001',
  skill: 'reading',
  title: 'Fixture',
  questions: [VALID_SITE_QUESTION],
};

test('isSiteTest accepts a well-formed test', () => {
  assert.equal(isSiteTest(VALID_SITE_TEST), true);
  assert.equal(isSiteTest({ ...VALID_SITE_TEST, questions: [] }), true);
});

test('isSiteTest rejects null, arrays, a missing field, a wrong-typed field, and a non-object in questions', () => {
  assert.equal(isSiteTest(null), false);
  assert.equal(isSiteTest([VALID_SITE_TEST]), false);
  assert.equal(isSiteTest({ id: 'x', skill: 'reading', title: 't' }), false); // missing questions
  assert.equal(isSiteTest({ ...VALID_SITE_TEST, skill: 'writing' }), false); // wrong-typed/invalid field
  assert.equal(isSiteTest({ ...VALID_SITE_TEST, title: 5 }), false); // wrong-typed field
  assert.equal(isSiteTest({ ...VALID_SITE_TEST, questions: [null] }), false); // non-object in questions
  assert.equal(isSiteTest({ ...VALID_SITE_TEST, questions: [{ ...VALID_SITE_QUESTION, part: '1' }] }), false);
});

/* ── resolveItems ───────────────────────────────────────────────────────── */

function siteQuestion(id: string): SiteQuestion {
  return { ...VALID_SITE_QUESTION, id };
}

test('resolveItems drops unknown ids, de-duplicates keeping the first, caps and sanitises `given`, preserves test order', () => {
  const test5: SiteTest = {
    id: 'fixture-002',
    skill: 'reading',
    title: 'Fixture',
    questions: ['q1', 'q2', 'q3'].map(siteQuestion),
  };
  const resolved = resolveItems(test5, [
    { questionId: 'q3', given: 'second answer' },
    { questionId: 'does-not-exist', given: 'ignored' },
    { questionId: 'q1', given: 'a'.repeat(200) }, // longer than MAX_GIVEN_CHARS
    { questionId: 'q3', given: 'this duplicate must be dropped' },
    { questionId: 'q2', given: 'hi there' }, // control characters
  ]);

  // Order follows the TEST's question order (q1, q2, q3), not the input order.
  assert.deepEqual(resolved.map((r) => r.question.id), ['q1', 'q2', 'q3']);

  const byId = new Map(resolved.map((r) => [r.question.id, r.given]));
  assert.equal(byId.get('q1')!.length, MAX_GIVEN_CHARS);
  assert.equal(byId.get('q1'), 'a'.repeat(MAX_GIVEN_CHARS));
  assert.equal(byId.get('q3'), 'second answer'); // the first of the two q3 entries won
  assert.ok(!/[ -]/.test(byId.get('q2')!), 'control characters must be stripped from `given`');
});

test('resolveItems treats a blank given as blank, and caps the result at MAX_REVIEW_ITEMS', () => {
  const bigTest: SiteTest = {
    id: 'fixture-003',
    skill: 'reading',
    title: 'Fixture',
    questions: Array.from({ length: 45 }, (_, i) => siteQuestion(`q${i + 1}`)),
  };
  const items = bigTest.questions.map((q) => ({ questionId: q.id, given: '' }));
  const resolved = resolveItems(bigTest, items);

  assert.equal(resolved.length, MAX_REVIEW_ITEMS);
  assert.equal(resolved[0].question.id, 'q1');
  assert.equal(resolved[resolved.length - 1].question.id, `q${MAX_REVIEW_ITEMS}`);
  assert.equal(resolved[0].given, '');
});

/* ── summariseByType ────────────────────────────────────────────────────── */

test('summariseByType counts wrong answers per type, most wrong first', () => {
  function resolved(type: string, typeLabel: string): ResolvedItem {
    return { question: { ...VALID_SITE_QUESTION, type, typeLabel }, given: 'x' };
  }
  const items: ResolvedItem[] = [
    resolved('tfng', 'True / False / Not Given'),
    resolved('multiple-choice', 'Multiple Choice'),
    resolved('tfng', 'True / False / Not Given'),
    resolved('tfng', 'True / False / Not Given'),
    resolved('multiple-choice', 'Multiple Choice'),
  ];
  assert.deepEqual(summariseByType(items), [
    { type: 'tfng', typeLabel: 'True / False / Not Given', wrong: 3 },
    { type: 'multiple-choice', typeLabel: 'Multiple Choice', wrong: 2 },
  ]);
});

test('summariseByType returns an empty list for no wrong answers', () => {
  assert.deepEqual(summariseByType([]), []);
});
