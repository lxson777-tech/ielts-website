/* Recompute the answer-key fingerprints in tests/listening-catalog.test.ts.
 *
 * That test hashes every listening answer key so a reformat of the question
 * paper can never quietly change what scores. When a key is changed ON PURPOSE
 * (a key that rejected what the recording actually says, for instance), the
 * fingerprints have to be updated with it, and the reason recorded in the
 * comment above the list.
 *
 * Run it only after deciding the key change is right:
 *     node --import ./tests/ts-extension-loader.mjs tools/refresh_listening_hashes.mjs
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { ALL_TESTS } from '../src/data/tests/index.ts';

const listening = ALL_TESTS.filter((t) => t.skill === 'listening');

const hashes = listening.map((t) => {
  const contract = t.parts
    .flatMap((p) => p.groups.flatMap((g) => g.questions))
    .map(({ id, answer, answerPairId, multiSelect }) => ({ id, answer, answerPairId, multiSelect }));
  return createHash('sha256').update(JSON.stringify(contract)).digest('hex');
});

const path = 'tests/listening-catalog.test.ts';
const source = readFileSync(path, 'utf8');
const start = source.indexOf('const importedListeningAnswerHashes = [');
const end = source.indexOf('];', start);
const block = source.slice(start, end);
const header = block.slice(0, block.indexOf('\n  \'') + 1);

const updated = `${header}${hashes.map((h) => `  '${h}',`).join('\n')}\n`;
writeFileSync(path, source.slice(0, start) + updated + source.slice(end), 'utf8');

console.log(`refreshed ${hashes.length} listening answer-key fingerprints`);
