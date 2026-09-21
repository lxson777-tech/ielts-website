#!/usr/bin/env node
/* The translator's command line for lesson bodies.
 *
 *   node tools/lesson-ru.mjs hash <slug>     the line to put at the top of a translation
 *   node tools/lesson-ru.mjs check <slug>    is this translation correct?
 *   node tools/lesson-ru.mjs check --all     ... every translation that exists
 *   node tools/lesson-ru.mjs status          what is translated, missing or stale
 *
 * `check` exits 1 if anything is wrong, so it works in a script or a hook.
 * The rules themselves live in tools/lesson-ru-lib.mjs, which the test
 * suite imports, so the command line and CI can never drift apart.
 *
 * The instructions this enforces are docs/LESSON-TRANSLATION-BRIEF.md.
 */

import fs from 'node:fs';
import {
  checkSlug,
  englishPath,
  englishSlugs,
  hashSource,
  readEnglish,
  russianSlugs,
  statusReport,
} from './lesson-ru-lib.mjs';

const USAGE = `Usage:
  node tools/lesson-ru.mjs hash <slug>
  node tools/lesson-ru.mjs check <slug> | --all
  node tools/lesson-ru.mjs status

  <slug> is a file name without ".html", e.g. reading-tfng.`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printResult(result) {
  if (result.ok) {
    console.log(`ok   ${result.slug}`);
    return true;
  }
  console.log(`FAIL ${result.slug}`);
  for (const problem of result.problems) {
    console.log(`  - ${problem}`);
  }
  console.log('');
  return false;
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case 'hash': {
    const slug = rest[0];
    if (!slug) fail(USAGE);
    if (!fs.existsSync(englishPath(slug))) {
      fail(`No English lesson called "${slug}". Run "node tools/lesson-ru.mjs status" for the list.`);
    }
    console.log(hashSource(readEnglish(slug)));
    break;
  }

  case 'check': {
    const target = rest[0];
    if (!target) fail(USAGE);

    const slugs = target === '--all' ? russianSlugs() : [target];
    if (target === '--all' && slugs.length === 0) {
      console.log('Nothing to check: src/content/lesson-bodies/ru/ has no files yet.');
      break;
    }

    let allOk = true;
    for (const slug of slugs) {
      if (!printResult(checkSlug(slug))) allOk = false;
    }
    if (slugs.length > 1) {
      const bad = slugs.length - slugs.filter((s) => checkSlug(s).ok).length;
      console.log(`${slugs.length} checked, ${bad} with problems.`);
    }
    if (!allOk) process.exit(1);
    break;
  }

  case 'status': {
    const rows = statusReport();
    const width = Math.max(...rows.map((r) => r.slug.length));
    const counts = { translated: 0, missing: 0, stale: 0 };
    for (const row of rows) {
      counts[row.state]++;
      console.log(`${row.slug.padEnd(width)}  ${row.state.padEnd(10)}  ${row.bytes} bytes`);
    }
    console.log('');
    console.log(
      `${rows.length} lessons: ${counts.translated} translated, ` +
        `${counts.stale} stale, ${counts.missing} not started.`,
    );
    break;
  }

  default:
    fail(USAGE);
}
