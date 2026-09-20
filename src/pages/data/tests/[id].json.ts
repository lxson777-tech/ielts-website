/* Publishes one compact JSON file per practice test, e.g.
   /data/tests/reading-full-001.json, built statically alongside the rest of
   the site.

   Why this exists: the Mr EZ tutor Worker explains a student's wrong
   answers, which means it needs each question's prompt, key, explanation
   and evidence. `src/data/tests` (the full passages, transcripts and every
   distractor option) is 3.9 MB, far too large for a Cloudflare Worker to
   bundle, so instead of importing it directly the Worker fetches the small
   per-test file this route emits at build time. Publishing it exposes
   nothing new: every one of these answers already ships to every browser
   inside the test pages themselves (see src/pages/tests/[id].astro).

   This is the ONLY file in the repo allowed to import src/data/tests for
   this purpose — src/lib/tutor/test-items.ts (which does the actual
   shaping) deliberately cannot, because it is also imported by the Worker
   build and must stay free of the 3.9 MB dataset. */

import type { APIRoute, GetStaticPaths } from 'astro';
import { ALL_TESTS } from '../../../data/tests';
import { toSiteTest } from '../../../lib/tutor/test-items';

export const getStaticPaths: GetStaticPaths = () => {
  return ALL_TESTS.map((test) => ({ params: { id: test.id }, props: { test } }));
};

export const GET: APIRoute = ({ props }) => {
  const { test } = props;
  return new Response(JSON.stringify(toSiteTest(test)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
