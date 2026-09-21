/* A style audit for the Russian answer explanations, separate from the
 * correctness checker (tools/explanations-ru.mjs check).
 *
 * The rule that an answer word stays in English produced a fair number of
 * half-English sentences: "студентка предпочитает trains автобусам". Correct,
 * but clumsy. House style is that an English word inside a Russian sentence is
 * always visibly a citation: in quotation marks, or in brackets after its
 * Russian meaning. This lists every note where a lowercase English word sits
 * bare in the sentence, so an editor can fix exactly those.
 *
 * Proper names (Capitalised), option letters, TRUE / FALSE / NOT GIVEN, and
 * anything already quoted or bracketed are not reported.
 *
 *   node tools/explanations-ru-style.mjs                 counts per test
 *   node tools/explanations-ru-style.mjs <id> [<id>...]  every offending note
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RU_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'tests', 'ru');

function withoutCitations(text) {
  return text
    .replace(/<[^>]+>/g, ' ')
    // An apostrophe INSIDE a word (don't, animal's, sisters' before a space is
    // rarer and not handled) is not a closing quotation mark. Without this,
    // a correctly quoted ‘they don’t agree’ was cut at "don" and the rest of
    // the quotation was reported as bare English.
    .replace(/(?<=[A-Za-z])[’'](?=[A-Za-z])/g, '')
    // Letters with diacritics are letters: "Häusler" is one name, not "H" + "usler".
    .replace(/[À-ɏ]/g, 'A')
    .replace(/[‘'][^‘’'\n]*[’']/g, ' ')
    .replace(/[“"«][^“”"«»\n]*[”"»]/g, ' ')
    .replace(/\([^)]*\)/g, ' ');
}

export function bareEnglish(text) {
  return withoutCitations(text).match(/(?<![A-Za-z])[a-z]{4,}(?: [a-z]{2,})*(?![A-Za-z])/g) ?? [];
}

const ids = process.argv.slice(2);
const files = ids.length ? ids.map((id) => `${id}.json`) : fs.readdirSync(RU_DIR).filter((f) => f.endsWith('.json'));

let total = 0;
for (const file of files) {
  const entries = JSON.parse(fs.readFileSync(path.join(RU_DIR, file), 'utf8')).entries;
  const hits = Object.entries(entries)
    .map(([key, entry]) => [key, bareEnglish(entry.ru), entry.ru])
    .filter(([, bare]) => bare.length);
  total += hits.length;
  if (!ids.length) {
    if (hits.length) console.log(`${String(hits.length).padStart(4)}  ${file.replace('.json', '')}`);
    continue;
  }
  console.log(`\n=== ${file.replace('.json', '')}: ${hits.length} note(s)`);
  for (const [key, bare, ru] of hits) console.log(`\n[${key}]  bare: ${bare.join(' | ')}\n${ru}`);
}
console.log(`\n${total} note(s) with a bare lowercase English word.`);
