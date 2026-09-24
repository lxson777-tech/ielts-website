/* Publishes the generated learning index at /data/learning-index.json,
   built statically alongside the rest of the site, exactly like the
   per-test files next door (src/pages/data/tests/[id].json.ts).

   Why publish it at all when the site already imports it directly: the Mr
   EZ Worker needs the same picture of what exists, and a Cloudflare Worker
   has a hard bundle limit. Today the index is small enough to bundle; the
   day it is not, the Worker fetches this URL instead and nothing else has
   to change. Publishing exposes nothing new either way. The file is ids,
   counts and durations, with no passage, transcript, question, option or
   answer anywhere in it.

   The file's bytes are served exactly as committed, `?raw` rather than a
   parsed-and-restringified JSON import, so what a reader downloads is what
   tools/generate-learning-index.mjs wrote and tests/learning-index.test.ts
   checked. Astro applies the site's base for us: this route lands at
   /ielts-website/data/learning-index.json on GitHub Pages, which is why
   LEARNING_INDEX_PATH is stored WITHOUT the prefix and callers put it back
   with withBase(), the same convention every other internal path follows. */

import type { APIRoute } from 'astro';
import rawIndex from '../../data/generated/learning-index.json?raw';
import { isTrialBuild } from '../../lib/trial/mode';
import { trialLearningIndex } from '../../lib/trial/trim-index';

/* A trial build publishes the trimmed copy (no exercise objectives, no
   cue-card headlines, no Writing question titles): src/lib/trial/trim-index.ts. */
export const GET: APIRoute = () =>
  new Response(isTrialBuild() ? JSON.stringify(trialLearningIndex(JSON.parse(rawIndex))) : rawIndex, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
