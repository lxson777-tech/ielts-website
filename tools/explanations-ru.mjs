#!/usr/bin/env node
/* The translator's command line for answer explanations.
 *
 *   node tools/explanations-ru.mjs status
 *       what is translated, partial, missing or stale, with character totals
 *
 *   node tools/explanations-ru.mjs template <test-id>
 *       the JSON skeleton to fill in, printed to the screen. Everything
 *       needed for one test is in it: each question as printed, its
 *       answer, the English note and the sha that pins it. Redirect it:
 *         node tools/explanations-ru.mjs template reading-full-002 > src/data/tests/ru/reading-full-002.json
 *
 *   node tools/explanations-ru.mjs check <test-id>
 *   node tools/explanations-ru.mjs check --all
 *       is this translation correct? Exits 1 if anything is wrong, so it
 *       works in a script or a hook.
 *
 * No flags are needed: the library registers Node's resolve hooks itself,
 * and Node strips the types out of the test files with no help.
 *
 * The rules live in tools/explanations-ru-lib.mjs, which
 * tests/explanations-ru.test.ts imports, so the command line and the test
 * suite can never drift apart. The instructions this enforces are
 * docs/EXPLANATION-TRANSLATION-BRIEF.md.
 */

import { allIds, buildTemplate, checkId, statusReport, translatedIds } from './explanations-ru-lib.mjs';

const USAGE = `Usage:
  node tools/explanations-ru.mjs status
  node tools/explanations-ru.mjs template <id>
  node tools/explanations-ru.mjs check <id> | --all

  <id> is a test file name without ".ts", e.g. reading-full-001, or a
  lesson-page exercise set, e.g. practice-reading-tfng.`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printResult(result) {
  const { counts } = result;
  const tally = `${counts.translated}/${counts.total} translated`;
  if (result.ok) {
    const note = counts.missing > 0 ? `${tally}, ${counts.missing} still in English` : tally;
    console.log(`ok   ${result.id}  (${note})`);
    return true;
  }
  console.log(`FAIL ${result.id}  (${tally})`);
  for (const problem of result.problems) console.log(`  - ${problem}`);
  console.log('');
  return false;
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case 'status': {
    const rows = await statusReport();
    const width = Math.max(...rows.map((r) => r.id.length));
    const counts = { translated: 0, partial: 0, missing: 0, stale: 0, broken: 0 };
    let charsLeft = 0;
    for (const row of rows) {
      counts[row.state] += 1;
      if (row.state === 'missing') charsLeft += row.chars;
      const flags = [
        `${String(row.done).padStart(2)}/${String(row.total).padStart(2)}`,
        row.stale > 0 ? `${row.stale} stale` : '',
        row.unknown > 0 ? `${row.unknown} unknown` : '',
      ]
        .filter(Boolean)
        .join('  ');
      console.log(`${row.id.padEnd(width)}  ${row.state.padEnd(10)}  ${flags.padEnd(22)}  ${row.chars} chars`);
    }
    console.log('');
    console.log(
      `${rows.length} tests: ${counts.translated} translated, ${counts.partial} partial, ` +
        `${counts.stale} with stale entries, ${counts.broken} broken, ${counts.missing} not started.`,
    );
    console.log(`${charsLeft} characters of English left to translate.`);
    break;
  }

  case 'template': {
    const id = rest[0];
    if (!id) fail(USAGE);
    let template;
    try {
      template = await buildTemplate(id);
    } catch (error) {
      fail(`${error.message}\nRun "node tools/explanations-ru.mjs status" for the list.`);
    }
    console.log(JSON.stringify(template, null, 2));
    break;
  }

  case 'check': {
    const target = rest[0];
    if (!target) fail(USAGE);

    const ids = target === '--all' ? translatedIds() : [target];
    if (target === '--all' && ids.length === 0) {
      console.log('Nothing to check: src/data/tests/ru/ has no files yet.');
      break;
    }

    const known = new Set(await allIds());
    for (const id of ids) {
      if (!known.has(id)) {
        fail(
          `"${id}" is not a test or a practice set. Run "node tools/explanations-ru.mjs status" ` +
            'for the list.',
        );
      }
    }

    let bad = 0;
    for (const id of ids) {
      if (!printResult(await checkId(id))) bad += 1;
    }
    if (ids.length > 1) console.log(`${ids.length} checked, ${bad} with problems.`);
    if (bad > 0) process.exit(1);
    break;
  }

  default:
    fail(USAGE);
}
