/* The Kazakh dictionary: every Kazakh batch file merged into one object
   (Builder K, 2 October 2026).

   Kazakh is a PARTIAL language. The owner decided (2 October 2026) that
   Kazakh law needs the legal and buying pages in Kazakh, and the course
   itself stays English and Russian. So these files cover only those
   surfaces (the list the coverage test enforces is KK_SURFACES in
   tests/i18n-kk.test.ts), and src/lib/i18n/dict/index.ts lays this object
   ON TOP of the Russian dictionary: a string with a Kazakh entry shows in
   Kazakh, everything else in Russian.

   Same rules as dict/ru/index.ts: split by surface so a later batch never
   edits someone else's file; adding one is an import and an entry in
   BATCHES; two files that translate the same English key differently fail
   tests/i18n-kk.test.ts by name. Every line was written by Claude and is
   listed for a native speaker's check in docs/legal/KAZAKH-REVIEW.md. */

import * as offer from './offer';
import * as privacy from './privacy';
import * as consent from './consent';
import * as buying from './buying';
import * as auth from './auth';
import * as help from './help';

/** Every batch module, in merge order. The test imports this same list. */
export const BATCHES = [offer, privacy, consent, buying, auth, help];

export const strings: Record<string, string> = Object.assign({}, ...BATCHES.map((b) => b.strings));

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = Object.assign(
  {},
  ...BATCHES.map((b) => b.plurals),
);
