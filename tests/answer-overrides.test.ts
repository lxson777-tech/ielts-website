/* Re-import safety: every correction to the publisher's answer key that the
   data carries is recorded in the importers' override tables
   (tools/import_listening.py and tools/import_reading.py ANSWER_OVERRIDES,
   and the Reading GROUP_OVERRIDES option lists), and every recorded entry
   still matches the data file exactly. Otherwise a re-import would quietly
   bring a publisher mistake back, or an override would quietly stop
   protecting anything.

   The check itself is tools/check_answer_overrides.py (the importers are
   Python, so their tables are read by Python). It needs Python with the
   importers' two libraries (bs4, requests), the same setup the importers
   need; on a machine without them this test is skipped, not failed. The
   stronger form, which rebuilds every key from the cached publisher pages,
   is `python tools/check_answer_overrides.py --source-cache .tmp`.

   Run on its own with:
     node --import ./tests/ts-extension-loader.mjs --test tests/answer-overrides.test.ts */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function python(): string | null {
  for (const candidate of ['python', 'python3']) {
    const probe = spawnSync(candidate, ['-c', 'import bs4, requests'], { cwd: root, encoding: 'utf8' });
    if (probe.status === 0) return candidate;
  }
  return null;
}

const py = python();

test('every recorded answer-key override matches the current data files', { skip: py ? false : 'Python with bs4 and requests is not available' }, () => {
  const run = spawnSync(py!, ['tools/check_answer_overrides.py'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, / 0 problem\(s\)/);
});
