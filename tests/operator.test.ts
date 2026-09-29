/* The operator's name and contact live in ONE place, src/lib/operator.ts,
 * and only Alex fills them in. These tests keep it that way:
 *   - nothing is set while `published` is false (so a half-filled value can
 *     never leak onto a page), and `published` needs a name;
 *   - publishedOperator() hides everything until published;
 *   - nothing else under src/ hard-codes a way to contact someone (an email
 *     address, a mailto:/tel: link, a messenger or social link).
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/operator.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPERATOR, publishedOperator } from '../src/lib/operator.ts';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

test('operator facts: nothing is filled in while unpublished, and published needs a name', () => {
  if (!OPERATOR.published) {
    assert.equal(OPERATOR.name, null, 'src/lib/operator.ts: name must stay null until Alex publishes it (published: true)');
    assert.equal(OPERATOR.contact, null, 'src/lib/operator.ts: contact must stay null until Alex publishes it (published: true)');
    assert.equal(publishedOperator(), null);
  } else {
    assert.ok(OPERATOR.name && OPERATOR.name.trim().length > 1, 'published: true needs the name students should see');
    assert.ok(publishedOperator());
  }
});

test('publishedOperator shows nothing until published, and links a contact only when it is an email or a phone', () => {
  assert.equal(publishedOperator({ name: 'Someone', contact: 'x@example.test', published: false }), null);
  assert.equal(publishedOperator({ name: '  ', contact: null, published: true }), null);
  assert.deepEqual(publishedOperator({ name: 'Sample Operator', contact: null, published: true }), {
    name: 'Sample Operator',
    contact: null,
    contactHref: null,
  });
  assert.equal(publishedOperator({ name: 'S', contact: 'help@example.test', published: true })?.contactHref, 'mailto:help@example.test');
  assert.equal(publishedOperator({ name: 'S', contact: '+7 700 000 00 00', published: true })?.contactHref, 'tel:+77000000000');
  assert.equal(publishedOperator({ name: 'S', contact: 'our office', published: true })?.contactHref, null);
});

/* ── No hard-coded contact anywhere else ───────────────────────────────── */

/** Exam material and teaching content legitimately contain made-up names,
    phone numbers and addresses (a listening form, an essay about Instagram).
    Those are not contacts for this site. */
const SKIP_DIRS = [path.join(SRC, 'data'), path.join(SRC, 'content')];
const EXTENSIONS = new Set(['.ts', '.tsx', '.astro', '.js', '.mjs', '.html', '.css']);
/** Domains that can never reach anybody (RFC 2606 and RFC 6761), plus the
    one worked example in a code comment. */
const HARMLESS_EMAIL = /@(example\.(test|com|org|net)|x\.com)$/i;

const CONTACT_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'a mailto: link to a fixed address', re: /mailto:[A-Za-z0-9._%+-]/g },
  { name: 'a tel: link to a fixed number', re: /tel:\+?[0-9]/g },
  { name: 'a messenger link', re: /\b(t\.me|wa\.me|api\.whatsapp\.com|telegram\.me|vk\.com)\/[A-Za-z0-9_]/gi },
  { name: 'a social profile link', re: /\b(instagram\.com|facebook\.com|tiktok\.com)\/[A-Za-z0-9_.@]/gi },
];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (SKIP_DIRS.some((skip) => full === skip)) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(name))) out.push(full);
  }
  return out;
}

test('no contact detail is hard-coded under src/ outside src/lib/operator.ts', () => {
  const problems: string[] = [];
  for (const file of walk(SRC)) {
    if (file === path.join(SRC, 'lib', 'operator.ts')) continue;
    const text = readFileSync(file, 'utf8');
    const rel = path.relative(SRC, file);
    for (const { name, re } of CONTACT_PATTERNS) {
      for (const m of text.matchAll(re)) problems.push(`${rel}: ${name} (${m[0]})`);
    }
    for (const m of text.matchAll(EMAIL)) {
      if (!HARMLESS_EMAIL.test(m[0])) problems.push(`${rel}: an email address (${m[0]})`);
    }
  }
  assert.deepEqual(
    problems,
    [],
    'Contacts belong in src/lib/operator.ts, filled in by Alex only. Found:\n' + problems.join('\n'),
  );
});
