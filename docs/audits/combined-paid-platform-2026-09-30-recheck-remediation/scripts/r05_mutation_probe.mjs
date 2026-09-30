/* R05: does the translation guard now catch an English interface paragraph
   in the Russian vocabulary lesson?

   Everything happens in memory: the lesson file on disk is never written.
   Three cases against the REAL checker (tools/lesson-ru-lib.mjs, the code
   tests/lesson-bodies-ru.test.ts runs):
     1. the lesson as it is today                              -> must pass
     2. the re-audit's mutation: an English interface paragraph
        APPENDED to the Russian lesson body                    -> must fail
     3. the original leftover: the explanatory note put back in
        English in place of its Russian translation            -> must fail
     4. case 3 with the Russian note restored                  -> must pass

   Run: node docs/audits/combined-paid-platform-2026-09-30-recheck-remediation/scripts/r05_mutation_probe.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readEnglish, readRussian, validateLessonBody } from '../../../../tools/lesson-ru-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'evidence', 'r05');
fs.mkdirSync(out, { recursive: true });

const english = readEnglish('vocabulary');
const russian = readRussian('vocabulary');
const before = fs.readFileSync(path.join(here, '..', '..', '..', '..', 'src', 'content', 'lesson-bodies', 'ru', 'vocabulary.html'), 'utf8');

const NOTE = /<div class="note-box">[\s\S]*?<\/div>/;
const enNote = NOTE.exec(english)[0];
const ruNote = NOTE.exec(russian)[0];

const APPENDED =
  '\n<p>Essay prompts, cue cards and Part 3 discussions circle the same themes year after year. ' +
  'Each topic teaches twenty words: ten to start with, then ten more once those feel comfortable.</p>\n';

const cases = [
  { name: '1. the Russian lesson as it is today', russian, expectOk: true },
  { name: '2. an English interface paragraph appended (the re-audit\'s mutation)', russian: russian + APPENDED, expectOk: false, mustMention: 'Essay prompts, cue cards and Part 3 discussions' },
  { name: '3. the explanatory note put back in English', russian: russian.replace(ruNote, enNote), expectOk: false, mustMention: 'The 36 topics below cover' },
  { name: '4. the Russian note restored', russian: russian.replace(ruNote, enNote).replace(enNote, ruNote), expectOk: true },
];

const results = cases.map((c) => {
  const r = validateLessonBody({ slug: 'vocabulary', english, russian: c.russian });
  const named = !c.mustMention || r.problems.some((p) => p.includes('is entirely in English') && p.includes(c.mustMention));
  return { case: c.name, checkerSaysOk: r.ok, expectedOk: c.expectOk, asExpected: r.ok === c.expectOk && named, problems: r.problems.map((p) => p.slice(0, 260)) };
});

const after = fs.readFileSync(path.join(here, '..', '..', '..', '..', 'src', 'content', 'lesson-bodies', 'ru', 'vocabulary.html'), 'utf8');
const report = { fileOnDiskUnchanged: before === after, allAsExpected: results.every((r) => r.asExpected), results };
fs.writeFileSync(path.join(out, 'mutation-probe.json'), JSON.stringify(report, null, 1) + '\n');

for (const r of results) {
  console.log(`${r.asExpected ? 'PASS' : 'FAIL'}  ${r.case}: checker ${r.checkerSaysOk ? 'passed it' : 'failed it'} (expected ${r.expectedOk ? 'pass' : 'fail'})`);
  for (const p of r.problems.slice(0, 2)) console.log(`        ${p}`);
}
console.log(`file on disk unchanged: ${report.fileOnDiskUnchanged}`);
process.exit(report.allAsExpected && report.fileOnDiskUnchanged ? 0 : 1);
