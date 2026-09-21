/* The rules a translated lesson body has to obey, in one place.
 *
 * A lesson body (src/content/lesson-bodies/<slug>.html) is a fragment of
 * teaching HTML that ships inline on the English page. Its Russian twin
 * lives at src/content/lesson-bodies/ru/<slug>.html and is swapped in at
 * runtime by src/lib/i18n/lesson-body.ts, which simply sets innerHTML.
 * Nothing at runtime checks that the two files match. That is what this
 * module is for: everything a translator could get wrong that a machine
 * can see, a machine sees here, before it reaches a student.
 *
 * It is plain Node with no dependencies, so both tools/lesson-ru.mjs and
 * tests/lesson-bodies-ru.test.ts run exactly the same code. If you change
 * a rule, you change it once.
 *
 * The rules, in the order they are reported:
 *   1. the first line is the source hash, and it matches the English file
 *      as it stands today (so an English edit marks its translation stale);
 *   2. the tag sequence, and every attribute that is not human-readable
 *      text, is identical (same tags, same order, same ids, classes and
 *      links, so the page's scripts and styles still find what they need);
 *   3. HTML comments survive in the same order with the same text (the
 *      "<!-- lesson-cards -->" marker is load-bearing: the swapper cuts
 *      the file on it);
 *   4. there is Cyrillic in the file at all (nobody shipped the English
 *      back to us by accident);
 *   5. no em dash and no en dash (the house rule, shared with the
 *      interface dictionary's coverage test);
 *   6. every "&" is a well-formed entity;
 *   7. the text inside the frozen regions listed in FROZEN_CLASSES, and
 *      the English columns of a vocabulary table, is unchanged. That is
 *      the exam material: passages, recordings, cue cards, model answers
 *      and the words being taught. Translating it destroys the exercise.
 *
 * What it deliberately does NOT check is whether the Russian is any good,
 * or whether a mixed English-and-explanation paragraph was split in the
 * right place. Those are in docs/LESSON-TRANSLATION-BRIEF.md for the
 * human (or the model) doing the writing.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const EN_DIR = path.join(REPO_ROOT, 'src', 'content', 'lesson-bodies');
export const RU_DIR = path.join(EN_DIR, 'ru');

/** The first line every translated file must carry, e.g.
    <!-- i18n-source-sha256: 3f2a... --> */
export const HASH_COMMENT_RE = /^<!--\s*i18n-source-sha256:\s*([0-9a-f]{64})\s*-->$/;

/** Elements that never have a closing tag. */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Attributes that hold text a reader sees, so Russian is allowed and
    expected. Every OTHER attribute must survive untouched, including
    class, id, style, href, src and any data-*. */
export const TEXT_ATTRS = new Set(['title', 'alt', 'aria-label', 'placeholder', 'aria-description']);

/** Blocks that are exam material from end to end, identified by a class
    on the element. Everything inside one, including its small English
    labels, stays exactly as the English has it.

      passage-box           a reading extract, or an example exam question
      type-example-question a question stem quoted from a recording or paper
      cue-card              a Speaking Part 2 cue card, printed rubric and all
      speaking-answer       a model spoken answer

    Keep this in step with the STAYS ENGLISH section of
    docs/LESSON-TRANSLATION-BRIEF.md. */
export const FROZEN_CLASSES = ['passage-box', 'type-example-question', 'cue-card', 'speaking-answer'];

/** The header of the first column of a vocabulary table. A table whose
    first header cell reads exactly this is a word list: its headword and
    example columns are English, only the Meaning column is translated. */
export const VOCAB_TABLE_FIRST_HEADER = 'Word / Phrase';

/** The one column of a vocabulary table that IS translated. */
export const VOCAB_MEANING_HEADER = 'Meaning';

/* ------------------------------------------------------------------ */
/* Reading files and hashing                                           */
/* ------------------------------------------------------------------ */

/** Windows checkouts store these files with CRLF, Linux with LF, and the
    hash has to agree on both. Strip a byte-order mark too, so a file an
    editor "helpfully" saved as UTF-8-with-BOM hashes the same. */
export function normaliseText(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** The identity of an English lesson body: sha256 over its normalised
    content. A translated file records this, and `check` recomputes it, so
    editing the English marks every translation of it stale. */
export function hashSource(englishText) {
  return crypto.createHash('sha256').update(normaliseText(englishText), 'utf8').digest('hex');
}

export function englishPath(slug) {
  return path.join(EN_DIR, `${slug}.html`);
}

export function russianPath(slug) {
  return path.join(RU_DIR, `${slug}.html`);
}

/** Every English slug in the repo, sorted. The `ru` folder is a directory,
    not a lesson, so it falls out of the .html filter on its own. */
export function englishSlugs() {
  return fs
    .readdirSync(EN_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => e.name.replace(/\.html$/, ''))
    .sort();
}

/** Every slug that has a Russian file. Empty list if nobody has started. */
export function russianSlugs() {
  if (!fs.existsSync(RU_DIR)) return [];
  return fs
    .readdirSync(RU_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.html'))
    .map((e) => e.name.replace(/\.html$/, ''))
    .sort();
}

export function readEnglish(slug) {
  return fs.readFileSync(englishPath(slug), 'utf8');
}

export function readRussian(slug) {
  return fs.readFileSync(russianPath(slug), 'utf8');
}

/* ------------------------------------------------------------------ */
/* A small, tolerant tokenizer                                         */
/* ------------------------------------------------------------------ */

/* These fragments are hand-written HTML with no scripts, no styles and no
   exotic syntax, so a scanner over "<...>" is enough and is far easier to
   reason about (and to report errors from) than a real parser. Anything it
   does not recognise as a tag is treated as text, which is the safe
   direction: a stray "<" in prose can never be mistaken for structure. */

const ATTR_RE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function parseAttributes(source) {
  const attrs = [];
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(source)) !== null) {
    const name = m[1];
    if (name === '/') continue;
    const value = m[2] ?? m[3] ?? m[4] ?? null;
    attrs.push({ name: name.toLowerCase(), value });
  }
  return attrs;
}

/**
 * Split a fragment into tokens: text, comment, open tag, close tag.
 *
 * Every non-text token also carries `si`, its position in the structure
 * sequence. Two files whose structure sequences match can therefore be
 * lined up element by element just by that number.
 */
export function tokenize(html) {
  const tokens = [];
  let i = 0;
  let si = 0;

  const lineAt = (offset) => {
    let line = 1;
    for (let k = 0; k < offset; k++) if (html.charCodeAt(k) === 10) line++;
    return line;
  };

  const pushText = (text) => {
    if (text.length > 0) tokens.push({ kind: 'text', text });
  };

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      pushText(html.slice(i));
      break;
    }

    // "<" followed by something that cannot start a tag is just prose.
    const next = html[lt + 1];
    const startsTag = next === '!' || next === '/' || (next !== undefined && /[a-zA-Z]/.test(next));
    if (!startsTag) {
      pushText(html.slice(i, lt + 1));
      i = lt + 1;
      continue;
    }

    if (lt > i) pushText(html.slice(i, lt));

    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      if (end === -1) {
        // Unterminated comment: the rest of the file is one comment. Say so
        // rather than silently swallowing it as text.
        tokens.push({
          kind: 'comment', text: html.slice(lt + 4), raw: html.slice(lt),
          unterminated: true, si: si++, line: lineAt(lt),
        });
        break;
      }
      tokens.push({
        kind: 'comment', text: html.slice(lt + 4, end), raw: html.slice(lt, end + 3),
        si: si++, line: lineAt(lt),
      });
      i = end + 3;
      continue;
    }

    // Find the ">" that closes this tag, skipping any inside a quoted value.
    let j = lt + 1;
    let quote = null;
    while (j < html.length) {
      const ch = html[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        break;
      }
      j++;
    }
    if (j >= html.length) {
      pushText(html.slice(lt));
      break;
    }

    const raw = html.slice(lt, j + 1);
    const inner = html.slice(lt + 1, j);

    if (inner.startsWith('/')) {
      const name = inner.slice(1).trim().toLowerCase();
      tokens.push({ kind: 'close', name, raw, si: si++, line: lineAt(lt) });
    } else if (inner.startsWith('!')) {
      // <!DOCTYPE ...> and friends. Not expected in a fragment, but compared
      // like any other structural token if one turns up.
      tokens.push({ kind: 'decl', name: inner.toLowerCase(), raw, si: si++, line: lineAt(lt) });
    } else {
      const selfClosing = inner.trimEnd().endsWith('/');
      const body = selfClosing ? inner.trimEnd().slice(0, -1) : inner;
      const space = body.search(/\s/);
      const name = (space === -1 ? body : body.slice(0, space)).toLowerCase();
      const attrs = space === -1 ? [] : parseAttributes(body.slice(space));
      tokens.push({
        kind: 'open', name, attrs, selfClosing, raw, si: si++, line: lineAt(lt),
        void: VOID_TAGS.has(name) || selfClosing,
      });
    }
    i = j + 1;
  }

  return tokens;
}

/** The structural spine: every token that is not text, in order. */
export function structure(tokens) {
  return tokens.filter((tk) => tk.kind !== 'text');
}

/**
 * For every open tag, the structure index of its matching close tag (or
 * its own index for a void element). Tolerant: a close tag that matches
 * nothing on the stack is ignored rather than throwing, because a
 * mismatched tag sequence is reported as its own problem anyway.
 */
export function closeIndex(tokens) {
  const structural = structure(tokens);
  const ends = new Map();
  const stack = [];
  for (const tk of structural) {
    if (tk.kind === 'open') {
      if (tk.void) ends.set(tk.si, tk.si);
      else stack.push(tk);
    } else if (tk.kind === 'close') {
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].name === tk.name) {
          ends.set(stack[k].si, tk.si);
          stack.length = k;
          break;
        }
      }
    }
  }
  // Anything left open runs to the end of the file.
  const last = structural.length > 0 ? structural[structural.length - 1].si : 0;
  for (const tk of stack) if (!ends.has(tk.si)) ends.set(tk.si, last);
  return ends;
}

/* ------------------------------------------------------------------ */
/* Reading text back out                                               */
/* ------------------------------------------------------------------ */

/** Indentation is not content. Comparing collapsed text means a
    translator who re-indents a block is not punished for it, while a
    translated word still fails. */
export function collapse(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/** Every text token between two structure positions, in order, with the
    empty ones dropped. `from` is the open tag's si and `to` its close. */
export function textNodesBetween(tokens, from, to) {
  const out = [];
  let inside = false;
  for (const tk of tokens) {
    if (tk.kind === 'text') {
      if (inside) {
        const value = collapse(tk.text);
        if (value) out.push(value);
      }
      continue;
    }
    if (tk.si === from) { inside = true; continue; }
    if (tk.si === to) { inside = false; }
  }
  return out;
}

function attrValue(token, name) {
  if (token.kind !== 'open') return null;
  const found = token.attrs.find((a) => a.name === name);
  return found ? found.value : null;
}

function hasClass(token, className) {
  const value = attrValue(token, 'class');
  if (!value) return false;
  return value.split(/\s+/).includes(className);
}

/** A short, readable rendering of a tag for an error message. */
export function describe(token) {
  if (!token) return '(nothing: the file ends here)';
  if (token.kind === 'text') return `text ${JSON.stringify(collapse(token.text).slice(0, 60))}`;
  const raw = token.raw ?? '';
  return raw.length > 90 ? `${raw.slice(0, 87)}...` : raw;
}

/* ------------------------------------------------------------------ */
/* The rules                                                           */
/* ------------------------------------------------------------------ */

function checkHashLine(russianText, englishText, problems) {
  const firstBreak = russianText.indexOf('\n');
  const firstLine = firstBreak === -1 ? russianText : russianText.slice(0, firstBreak);
  const expected = hashSource(englishText);
  const match = HASH_COMMENT_RE.exec(firstLine.trim());

  if (!match) {
    problems.push(
      `line 1: the first line must be exactly "<!-- i18n-source-sha256: ${expected} -->". ` +
        `It reads ${JSON.stringify(firstLine.slice(0, 90))}.`,
    );
    // There is no usable hash line, so the rest of the file starts at line 1.
    return { body: russianText, bodyStartLine: 1, stale: false };
  }

  let stale = false;
  if (match[1] !== expected) {
    stale = true;
    problems.push(
      'line 1: stale translation. The English lesson has changed since this was written. ' +
        `The file records ${match[1]}, the English file hashes to ${expected}. ` +
        'Re-read the English, bring the Russian up to date, then put the new hash on line 1.',
    );
  }
  const body = firstBreak === -1 ? '' : russianText.slice(firstBreak + 1);
  return { body, bodyStartLine: 2, stale };
}

function checkStructure(enTokens, ruTokens, problems, bodyStartLine) {
  const en = structure(enTokens);
  const ru = structure(ruTokens);
  const shared = Math.min(en.length, ru.length);
  let reported = 0;

  for (let k = 0; k < shared; k++) {
    if (reported >= 12) break;
    const a = en[k];
    const b = ru[k];

    if (a.kind !== b.kind || a.name !== b.name) {
      problems.push(
        `tag ${k} of the sequence (Russian line ${b.line + bodyStartLine - 1}): ` +
          `English has ${describe(a)}, Russian has ${describe(b)}.`,
      );
      reported++;
      // Past the first divergence every later index is off by one, so the
      // rest of the list would be noise. One clear message is more useful.
      return;
    }

    if (a.kind === 'comment') {
      if (a.text.trim() !== b.text.trim()) {
        problems.push(
          `comment ${k} of the sequence (Russian line ${b.line + bodyStartLine - 1}): ` +
            `English comment is <!--${a.text}-->, Russian has <!--${b.text}-->. ` +
            'Comments are markers the code reads; copy them across unchanged.',
        );
        reported++;
      }
      continue;
    }

    if (a.kind !== 'open') continue;

    const aNames = a.attrs.map((x) => x.name);
    const bNames = b.attrs.map((x) => x.name);
    if (aNames.join(' ') !== bNames.join(' ')) {
      problems.push(
        `tag ${k} of the sequence (Russian line ${b.line + bodyStartLine - 1}): ` +
          `attributes differ. English ${describe(a)} has [${aNames.join(', ')}], ` +
          `Russian ${describe(b)} has [${bNames.join(', ')}].`,
      );
      reported++;
      continue;
    }

    for (let n = 0; n < a.attrs.length; n++) {
      if (TEXT_ATTRS.has(a.attrs[n].name)) continue;
      if (a.attrs[n].value !== b.attrs[n].value) {
        problems.push(
          `tag ${k} of the sequence (Russian line ${b.line + bodyStartLine - 1}): ` +
            `the "${a.attrs[n].name}" attribute must not change. ` +
            `English has ${JSON.stringify(a.attrs[n].value)}, ` +
            `Russian has ${JSON.stringify(b.attrs[n].value)}. ` +
            `English tag: ${describe(a)}`,
        );
        reported++;
        break;
      }
    }
  }

  if (en.length !== ru.length && reported === 0) {
    const longer = en.length > ru.length ? 'English' : 'Russian';
    const extra = (longer === 'English' ? en : ru)[shared];
    problems.push(
      `the files have different numbers of tags: English ${en.length}, Russian ${ru.length}. ` +
        `The first tag with no counterpart is in the ${longer}: ${describe(extra)}` +
        (longer === 'Russian' ? ` (Russian line ${extra.line + bodyStartLine - 1})` : ''),
    );
  }
}

function checkCyrillic(body, problems) {
  if (!/[\u0400-\u04FF]/.test(body)) {
    problems.push(
      'there is no Cyrillic anywhere in this file. It looks like the English was copied ' +
        'without being translated.',
    );
  }
}

function checkDashes(body, problems, bodyStartLine) {
  const lines = body.split('\n');
  /* Written as escapes on purpose: nobody should be able to copy a real
     dash out of the file that forbids them. */
  const names = {
    '\u2012': 'figure dash', '\u2013': 'en dash',
    '\u2014': 'em dash', '\u2015': 'horizontal bar',
  };
  let reported = 0;
  lines.forEach((line, n) => {
    if (reported >= 6) return;
    const found = line.match(/[\u2012-\u2015]/g);
    if (!found) return;
    const which = [...new Set(found)].map((c) => names[c]).join(' and ');
    problems.push(
      `line ${n + bodyStartLine}: contains an ${which}. Dashes of this kind are not used ` +
        'anywhere on this site. Use a comma, a full stop, a colon or brackets, or rewrite ' +
        `the sentence. The line reads: ${JSON.stringify(collapse(line).slice(0, 90))}`,
    );
    reported++;
  });
}

function checkEntities(body, problems, bodyStartLine) {
  const lines = body.split('\n');
  let reported = 0;
  lines.forEach((line, n) => {
    if (reported >= 6) return;
    const re = /&(?!#\d+;|#[xX][0-9a-fA-F]+;|[a-zA-Z][a-zA-Z0-9]*;)/g;
    if (re.test(line)) {
      problems.push(
        `line ${n + bodyStartLine}: a bare "&". Write "&amp;" instead, and keep entities such ` +
          `as &nbsp; and &#10003; exactly as the English has them. The line reads: ` +
          JSON.stringify(collapse(line).slice(0, 90)),
      );
      reported++;
    }
  });
}

/** Every frozen region in the English file, as {si, end, label}. */
function frozenRegions(enTokens) {
  const ends = closeIndex(enTokens);
  const regions = [];
  for (const tk of structure(enTokens)) {
    if (tk.kind !== 'open') continue;
    const label = FROZEN_CLASSES.find((c) => hasClass(tk, c));
    const answer = attrValue(tk, 'data-answer');
    if (label) {
      regions.push({ si: tk.si, end: ends.get(tk.si) ?? tk.si, label: `.${label}`, token: tk });
    } else if (answer !== null) {
      regions.push({ si: tk.si, end: ends.get(tk.si) ?? tk.si, label: 'a [data-answer] item', token: tk });
    }
  }
  return regions;
}

function checkFrozenRegions(enTokens, ruTokens, problems, bodyStartLine) {
  let reported = 0;
  for (const region of frozenRegions(enTokens)) {
    if (reported >= 8) break;
    const en = textNodesBetween(enTokens, region.si, region.end);
    const ru = textNodesBetween(ruTokens, region.si, region.end);
    if (en.join(' ') === ru.join(' ')) continue;

    const at = en.findIndex((value, n) => ru[n] !== value);
    const ruToken = structure(ruTokens).find((tk) => tk.si === region.si);
    problems.push(
      `${region.label} at Russian line ${ruToken ? ruToken.line + bodyStartLine - 1 : '?'} ` +
        `(${describe(region.token)}) is exam material and must stay word for word in English. ` +
        `English: ${JSON.stringify((en[at] ?? '(nothing)').slice(0, 110))}. ` +
        `Russian: ${JSON.stringify((ru[at] ?? '(nothing)').slice(0, 110))}.`,
    );
    reported++;
  }
}

/** Cells of one row, as {si, end} pairs, for `td` and `th` alike. */
function rowCells(tokens, rowSi, rowEnd, ends) {
  const cells = [];
  for (const tk of structure(tokens)) {
    if (tk.si <= rowSi || tk.si >= rowEnd) continue;
    if (tk.kind !== 'open') continue;
    if (tk.name !== 'td' && tk.name !== 'th') continue;
    // Only this row's own cells, not a nested table's.
    if (cells.some((c) => tk.si < c.end)) continue;
    cells.push({ si: tk.si, end: ends.get(tk.si) ?? tk.si });
  }
  return cells;
}

function tableRows(tokens, tableSi, tableEnd, ends) {
  const rows = [];
  for (const tk of structure(tokens)) {
    if (tk.si <= tableSi || tk.si >= tableEnd) continue;
    if (tk.kind !== 'open' || tk.name !== 'tr') continue;
    rows.push({ si: tk.si, end: ends.get(tk.si) ?? tk.si });
  }
  return rows;
}

/**
 * Vocabulary tables. Identified in the ENGLISH file by their first header
 * cell, then enforced by position, so the Russian is free to translate the
 * headers themselves. Every column except "Meaning" is the thing being
 * taught (the word, and the example sentence showing it in use) and stays
 * English.
 */
function checkVocabTables(enTokens, ruTokens, problems, bodyStartLine) {
  const ends = closeIndex(enTokens);
  let reported = 0;

  for (const tk of structure(enTokens)) {
    if (reported >= 8) break;
    if (tk.kind !== 'open' || tk.name !== 'table') continue;
    const tableEnd = ends.get(tk.si) ?? tk.si;
    const rows = tableRows(enTokens, tk.si, tableEnd, ends);
    if (rows.length === 0) continue;

    const headerCells = rowCells(enTokens, rows[0].si, rows[0].end, ends);
    const headers = headerCells.map((c) => textNodesBetween(enTokens, c.si, c.end).join(' '));
    if (headers[0] !== VOCAB_TABLE_FIRST_HEADER) continue;

    const englishColumns = headers
      .map((h, n) => (h === VOCAB_MEANING_HEADER ? -1 : n))
      .filter((n) => n >= 0);

    for (const row of rows.slice(1)) {
      if (reported >= 8) break;
      const cells = rowCells(enTokens, row.si, row.end, ends);
      for (const column of englishColumns) {
        const cell = cells[column];
        if (!cell) continue;
        const en = textNodesBetween(enTokens, cell.si, cell.end).join(' ');
        const ru = textNodesBetween(ruTokens, cell.si, cell.end).join(' ');
        if (en === ru) continue;
        const ruToken = structure(ruTokens).find((x) => x.si === cell.si);
        problems.push(
          `vocabulary table, column ${column + 1} ("${headers[column]}") at Russian line ` +
            `${ruToken ? ruToken.line + bodyStartLine - 1 : '?'}: this column is the English ` +
            'being taught and stays exactly as written. Only the "Meaning" column is ' +
            `translated. English: ${JSON.stringify(en.slice(0, 110))}. ` +
            `Russian: ${JSON.stringify(ru.slice(0, 110))}.`,
        );
        reported++;
        break;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* The one entry point                                                 */
/* ------------------------------------------------------------------ */

/**
 * Check one translated lesson body against its English source.
 *
 * Both arguments are the raw file contents. Returns
 * `{ slug, ok, stale, problems }`, where every problem is a full sentence
 * naming where it is and what to do about it. No exceptions, no printing:
 * the CLI and the test format the same list their own way.
 */
export function validateLessonBody({ slug, english, russian }) {
  const problems = [];

  if (russian.startsWith('\uFEFF')) {
    problems.push(
      'the file starts with a byte-order mark. Save it as UTF-8 without a BOM: the runtime ' +
        'drops the whole fragment into the page as-is and the mark shows up as stray characters.',
    );
  }

  const enText = normaliseText(english);
  const ruText = normaliseText(russian);

  const { body, bodyStartLine } = checkHashLine(ruText, english, problems);

  checkCyrillic(body, problems);
  checkDashes(body, problems, bodyStartLine);
  checkEntities(body, problems, bodyStartLine);

  const enTokens = tokenize(enText);
  const ruTokens = tokenize(body);

  const before = problems.length;
  checkStructure(enTokens, ruTokens, problems, bodyStartLine);

  // The text checks line the two files up by structure index, so they only
  // mean anything once the structures agree.
  if (problems.length === before) {
    checkFrozenRegions(enTokens, ruTokens, problems, bodyStartLine);
    checkVocabTables(enTokens, ruTokens, problems, bodyStartLine);
  } else {
    problems.push(
      'the checks on exam material (passages, cue cards, vocabulary columns) were skipped, ' +
        'because they line the two files up tag by tag and the tags do not match yet. ' +
        'Fix the structure above and run the check again.',
    );
  }

  const stale = problems.some((p) => p.includes('stale translation'));
  return { slug, ok: problems.length === 0, stale, problems };
}

/** Read both files off disk and check them. */
export function checkSlug(slug) {
  if (!fs.existsSync(englishPath(slug))) {
    return {
      slug, ok: false, stale: false,
      problems: [`there is no English lesson called "${slug}" in src/content/lesson-bodies/.`],
    };
  }
  if (!fs.existsSync(russianPath(slug))) {
    return {
      slug, ok: false, stale: false,
      problems: [`there is no translation at src/content/lesson-bodies/ru/${slug}.html yet.`],
    };
  }
  return validateLessonBody({ slug, english: readEnglish(slug), russian: readRussian(slug) });
}

/** One line per English lesson: translated, missing, or stale. */
export function statusReport() {
  const translated = new Set(russianSlugs());
  return englishSlugs().map((slug) => {
    const english = readEnglish(slug);
    const bytes = Buffer.byteLength(normaliseText(english), 'utf8');
    if (!translated.has(slug)) return { slug, state: 'missing', bytes };
    const russian = readRussian(slug);
    const match = HASH_COMMENT_RE.exec(normaliseText(russian).split('\n')[0].trim());
    if (!match || match[1] !== hashSource(english)) return { slug, state: 'stale', bytes };
    return { slug, state: 'translated', bytes };
  });
}
