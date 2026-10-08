/* The topic page's lower groups (src/lib/vocab-home.ts): blanking a
   collocation's bold key word, choosing its options, marking topic words
   inside phrases, and the text a Copy button puts on the clipboard. Run
   against the real 36 lessons as well as small hand-made cases. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { VOCABULARY_PARTS } from '../src/data/vocabulary.ts';
import { buildVocabTopicData, type VocabTopicData } from '../src/lib/vocab-review.ts';
import {
  collocationOptions,
  highlightTerms,
  inlineHtmlToText,
  parseCollocation,
  phraseForCopy,
  termVariants,
  topicWordRows,
} from '../src/lib/vocab-home.ts';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const TOPICS: VocabTopicData[] = VOCABULARY_PARTS.map((part) =>
  buildVocabTopicData(fs.readFileSync(path.join(REPO, 'src/content/lesson-bodies', `vocabulary-${part.slug}.html`), 'utf8'), part.slug, part.title),
);
const collocations = (tp: VocabTopicData) => tp.categories.find((c) => /collocation/i.test(c.heading))?.items ?? [];

/* ── Blanking the bold word ──────────────────────────────────────── */

test('the bold key word becomes the blank, the rest of the phrase stays', () => {
  assert.deepEqual(parseCollocation('<strong>tackle</strong> climate change / environmental problems'), {
    before: '',
    answer: 'tackle',
    after: ' climate change / environmental problems',
  });
  assert.deepEqual(parseCollocation('a <strong>pressing</strong> environmental concern'), {
    before: 'a ',
    answer: 'pressing',
    after: ' environmental concern',
  });
});

test('two bold words joined by a slash are one answer', () => {
  assert.deepEqual(parseCollocation('<strong>cut</strong> / <strong>curb</strong> carbon emissions'), {
    before: '',
    answer: 'cut / curb',
    after: ' carbon emissions',
  });
  assert.equal(parseCollocation('<b>keep</b> / <b>stay</b> fit')!.answer, 'keep / stay');
});

test('bold words further apart blank only the first', () => {
  assert.deepEqual(parseCollocation('<strong>become</strong> obsolete / <strong>render</strong> something obsolete'), {
    before: '',
    answer: 'become',
    after: ' obsolete / render something obsolete',
  });
});

test('no bold word means no blank, and entities are decoded', () => {
  assert.equal(parseCollocation('raise awareness about issues'), null);
  assert.equal(parseCollocation('<strong></strong> nothing'), null);
  assert.deepEqual(parseCollocation('<strong>R&amp;D</strong> spending'), { before: '', answer: 'R&D', after: ' spending' });
  assert.equal(inlineHtmlToText('<em>a</em>&nbsp;&quot;b&quot;'), 'a "b"');
});

test('a phrase that is bold from end to end has nothing to fill in, so it stays plain', () => {
  assert.equal(parseCollocation('<strong>make a good impression</strong>'), null);
  assert.equal(parseCollocation('<b>cut</b> / <b>curb</b>'), null);
});

test('real collocations: nearly all become a blank with words around it, the rest stay plain', () => {
  let total = 0;
  let gaps = 0;
  for (const tp of TOPICS) {
    for (const html of collocations(tp)) {
      total++;
      const gap = parseCollocation(html);
      if (!gap) {
        assert.ok(!inlineHtmlToText(html.replace(/<(strong|b)>[\s\S]*?<\/\1>/g, '')).replace(/[\s/]/g, ''), `${tp.slug}: ${html} has words outside its bold part but no blank`);
        continue;
      }
      gaps++;
      assert.ok(gap.answer.length > 0, `${tp.slug}: empty answer in ${html}`);
      assert.ok((gap.before + gap.after).trim().length > 0, `${tp.slug}: nothing around the blank in ${html}`);
    }
  }
  assert.ok(total > 200 && gaps / total > 0.9, `${gaps} of ${total} real collocations have a blank`);
});

/* ── Options ─────────────────────────────────────────────────────── */

test('options hold the right answer plus two distinct others, the same every time', () => {
  const answers = ['tackle', 'combat', 'mitigate', 'preserve', 'raise awareness', 'pressing', 'cut / curb'];
  for (let i = 0; i < answers.length; i++) {
    const a = collocationOptions(answers, i, 'environment');
    const b = collocationOptions(answers, i, 'environment');
    assert.deepEqual(a, b, 'deterministic for the same topic and item');
    assert.equal(a.length, 3);
    assert.ok(a.includes(answers[i]!), 'contains the right answer');
    assert.equal(new Set(a.map((s) => s.toLowerCase())).size, 3, 'never two identical options');
  }
});

test('repeated answers in a topic never appear twice among the options', () => {
  const answers = ['make', 'Make', 'do', 'make', 'take'];
  for (let i = 0; i < answers.length; i++) {
    const opts = collocationOptions(answers, i, 'x');
    assert.equal(new Set(opts.map((s) => s.toLowerCase())).size, opts.length, opts.join(','));
  }
  assert.deepEqual(collocationOptions(['only'], 0, 'x'), ['only'], 'a lone phrase gets no invented distractors');
  assert.deepEqual(collocationOptions([], 0, 'x'), []);
});

test('the right answer does not always sit in the same place', () => {
  const answers = ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8', 'i9'];
  const positions = new Set(answers.map((ans, i) => collocationOptions(answers, i, 'topic').indexOf(ans)));
  assert.ok(positions.size >= 2, 'positions vary across items');
});

test('every real topic gets three distinct options for every collocation', () => {
  for (const tp of TOPICS) {
    const answers = collocations(tp).flatMap((h) => parseCollocation(h)?.answer ?? []);
    answers.forEach((ans, i) => {
      const opts = collocationOptions(answers, i, tp.slug);
      assert.equal(opts.length, 3, `${tp.slug} #${i}`);
      assert.equal(new Set(opts.map((s) => s.toLowerCase())).size, 3, `${tp.slug} #${i}: ${opts.join(', ')}`);
      assert.ok(opts.includes(ans));
    });
  }
});

/* ── Highlighting ────────────────────────────────────────────────── */

const joinHits = (segs: { text: string; hit: boolean }[]) => segs.filter((s) => s.hit).map((s) => s.text);

test('highlighting matches whole words only, any case, with a plural ending', () => {
  assert.deepEqual(joinHits(highlightTerms('Artificial art galleries and the Arts', ['art'])), ['art', 'Arts']);
  assert.deepEqual(joinHits(highlightTerms('Deforestation threatens biodiversity.', ['deforestation', 'forest'])), ['Deforestation']);
  assert.deepEqual(joinHits(highlightTerms('a cartoon', ['car'])), []);
});

test('a longer phrase wins over a word inside it, and the text is kept whole', () => {
  const text = 'Reduce your carbon footprint and carbon emissions.';
  const segs = highlightTerms(text, ['carbon', 'carbon footprint']);
  assert.deepEqual(joinHits(segs), ['carbon footprint', 'carbon']);
  assert.equal(segs.map((s) => s.text).join(''), text);
  assert.deepEqual(highlightTerms('', ['x']), []);
  assert.deepEqual(highlightTerms('plain', []), [{ text: 'plain', hit: false }]);
});

test('terms come in every spelling a table cell teaches', () => {
  assert.deepEqual(termVariants('literacy / numeracy').sort(), ['literacy', 'numeracy']);
  assert.deepEqual(termVariants('artificial intelligence (AI)').sort(), ['AI', 'artificial intelligence']);
});

test('real phrases mark at least some of their own topic words', () => {
  let marked = 0;
  for (const tp of TOPICS) {
    const terms = topicWordRows(tp).flatMap((w) => termVariants(w.word));
    for (const c of tp.categories) {
      if (!c.items || !/phrase/i.test(c.heading)) continue;
      for (const html of c.items) if (highlightTerms(inlineHtmlToText(html), terms).some((s) => s.hit)) marked++;
    }
  }
  assert.ok(marked >= 20, `only ${marked} real phrases show a topic word`);
});

/* ── Copy text ───────────────────────────────────────────────────── */

test('the copied phrase loses its quote marks and leaves a trailing "..." open', () => {
  assert.equal(phraseForCopy('"Technology has fundamentally transformed the way we…"'), 'Technology has fundamentally transformed the way we ');
  assert.equal(phraseForCopy('“The costs cannot be ignored.”'), 'The costs cannot be ignored.');
  assert.equal(phraseForCopy('"It is vital to act..."'), 'It is vital to act ');
});
