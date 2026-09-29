/* The second half of the translation coverage check: text nobody marked.

   tests/i18n.test.ts checks that every string SOMEONE MARKED for translation
   (t(), tn(), nt(), ntn(), data-i18n) has Russian. It cannot see a string
   nobody marked, and the 29 September 2026 audit (F05) found exactly those in
   Russian mode: "40 complete exams in rotation, ..." and count badges like
   "{n} questions" written straight into .astro pages, "{n} drills" built with
   a template literal in a page's frontmatter, and "Topic Lists" passed as a
   plain prop to a component that renders it with data-i18n (the prop's
   English literal was never extracted, so its missing Russian went unnoticed).

   So this file reads the templates themselves, with the real Astro compiler
   and the real TypeScript parser rather than regular expressions, and fails
   on:

   1. English text in an .astro template whose element is not marked
      (data-i18n, a counted phrase, or the sales page's own data-sales).
   2. An English aria-label / alt / title / placeholder in an .astro template
      that data-i18n-attr does not cover.
   3. A plain string prop passed to a component that renders that prop with
      data-i18n, when the Russian dictionary has no entry for it.
   4. A count glued to an English word in a template literal
      (`${n} drills`), anywhere in src/pages or src/components. Counted
      phrases go through tn() / ntn(), never through concatenation.
   5. English JSX text in a React island that is not inside t().

   What may stay English is decided by the translation guide
   (docs/I18N-GUIDE.md, "What must never be translated"): the product name,
   IELTS, Mr EZ, the four paper names, Task / Part numbers, official question
   type and criterion names. Those are removed before a text is judged, so
   "Reading" alone passes and "{n} questions" does not.

   A file may be exempted only with a written reason in EXEMPT below. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@astrojs/compiler';
import ts from 'typescript';

import * as ruMerged from '../src/lib/i18n/dict/ru/index.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = path.join(REPO_ROOT, 'src');

/* Directories whose text is not interface copy handled by the dictionary. */
const SKIP_DIRS = ['lib/i18n', 'data/tests', 'content'];

/* Files allowed to keep English template text, each with the reason. Old-URL
   redirect stubs (a bare page with <meta http-equiv="refresh">) are exempt
   automatically: their only text is a fallback link shown for the instant
   before the browser moves on, and they load no translation runtime. */
const EXEMPT: Record<string, string> = {
  'components/admin/AdminPanel.tsx': 'staff-only page for Alex, deliberately English',
  'components/admin/SupportRequests.tsx': 'part of the staff-only admin page, deliberately English like AdminPanel',
};

function isRedirectStub(rel: string): boolean {
  if (!rel.endsWith('.astro')) return false;
  return /http-equiv=["']refresh["']/.test(fs.readFileSync(path.join(SRC_DIR, rel), 'utf8'));
}

function exempt(rel: string): boolean {
  return Boolean(EXEMPT[rel]) || isRedirectStub(rel);
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Decode HTML entities, so `&ldquo;` or `&rarr;` is judged as the character it is. */
function decode(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1]?.toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? ' ';
  });
}

/* English that stays English inside a Russian sentence (docs/I18N-GUIDE.md).
   Longest first, so "IELTS is EZ" goes before "IELTS". */
const KEEP_ENGLISH = [
  'IELTS is EZ',
  'IELTS',
  'Mr EZ',
  'Reading',
  'Listening',
  'Writing',
  'Speaking',
  'True / False / Not Given',
  'Yes / No / Not Given',
  'Matching Headings',
  'Matching Features',
  'Matching Information',
  'Sentence Completion',
  'Summary Completion',
  'Note Completion',
  'Table Completion',
  'Form Completion',
  'Short Answer',
  'Multiple Choice',
  'Diagram Labelling',
  'Map Labelling',
  'Task Achievement',
  'Task Response',
  'Coherence and Cohesion',
  'Lexical Resource',
  'Grammatical Range and Accuracy',
  'Fluency and Coherence',
  'Pronunciation',
  'Task',
  'Part',
  // A source's proper name (the Listening attribution on the Tests page).
  'PracticePTEOnline',
  // The wordmark is split across <span>IELTS</span><span>is</span><b>EZ</b>.
  'is',
  'EZ',
].sort((a, b) => b.length - a.length);

const KEEP_PATTERN = new RegExp(`(?<![A-Za-z])(?:${KEEP_ENGLISH.map((s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|')})(?![A-Za-z])`, 'g');

/** Does this text still hold English once the protected terms are removed? */
function hasEnglish(text: string): boolean {
  const rest = decode(text).replace(KEEP_PATTERN, ' ');
  return /[A-Za-z]{2,}/.test(rest);
}

function sourceFiles(ext: string[]): string[] {
  const entries = fs.readdirSync(SRC_DIR, { recursive: true, encoding: 'utf8' }) as string[];
  return entries
    .map((rel) => rel.split(path.sep).join('/'))
    .filter((rel) => ext.includes(path.extname(rel)))
    .filter((rel) => !SKIP_DIRS.some((dir) => rel === dir || rel.startsWith(`${dir}/`)))
    .filter((rel) => fs.statSync(path.join(SRC_DIR, rel)).isFile());
}

/* ------------------------------------------------------------------ */
/* Astro AST helpers                                                    */
/* ------------------------------------------------------------------ */

interface AstroAttr {
  kind: string;
  name: string;
  value: string;
}
interface AstroNode {
  type: string;
  name?: string;
  value?: string;
  attributes?: AstroAttr[];
  children?: AstroNode[];
  position?: { start: { line: number } };
}

const parsed = new Map<string, AstroNode>();

async function astroAst(rel: string): Promise<AstroNode> {
  let ast = parsed.get(rel);
  if (!ast) {
    const source = fs.readFileSync(path.join(SRC_DIR, rel), 'utf8');
    ast = (await parse(source, { position: true })).ast as unknown as AstroNode;
    parsed.set(rel, ast);
  }
  return ast;
}

function attr(node: AstroNode, name: string): AstroAttr | undefined {
  return node.attributes?.find((a) => a.name === name);
}

/** Is this element's own text handled by one of the translation markers? */
function marksText(node: AstroNode): boolean {
  return Boolean(
    attr(node, 'data-i18n') ||
      attr(node, 'data-i18n-n') ||
      attr(node, 'data-sales') ||
      // A trial hub control: src/lib/trial/hub.ts writes its label with t()
      // as soon as the page loads (the trial state decides which label).
      attr(node, 'data-trial-section'),
  );
}

function frontmatter(ast: AstroNode): string {
  const fm = ast.children?.find((c) => c.type === 'frontmatter');
  return fm?.value ?? '';
}

interface Finding {
  file: string;
  line: number;
  text: string;
}

/* <noscript> is here because no script can translate it: its line is for a
   visitor with JavaScript off, and it stays English. */
const NON_TEMPLATE = new Set(['script', 'style', 'noscript']);
const ACCESSIBLE_ATTRS = ['aria-label', 'alt', 'title', 'placeholder'];

/** Attribute names a data-i18n-attr or data-sales-attr list covers. */
function coveredAttrs(node: AstroNode): string[] {
  const i18n = (attr(node, 'data-i18n-attr')?.value ?? '').split(',').map((s) => s.trim());
  const sales = (attr(node, 'data-sales-attr')?.value ?? '').split(',').map((s) => s.split(':')[0]!.trim());
  return [...i18n, ...sales].filter(Boolean);
}

/** Walk an .astro AST and report unmarked English text and attributes. */
function unmarkedInAstro(rel: string, ast: AstroNode): { text: Finding[]; attrs: Finding[] } {
  const text: Finding[] = [];
  const attrs: Finding[] = [];
  const file = `src/${rel}`;
  const visit = (node: AstroNode, parent: AstroNode | null, line: number) => {
    const here = node.position?.start.line ?? line;
    if (node.type === 'element' && node.name && NON_TEMPLATE.has(node.name)) return;
    // An explicit lang declares the text's language on purpose (an English
    // essay sample, official criterion names, a language switch naming each
    // language in itself): correct for screen readers, and never translated.
    if ((node.type === 'element' || node.type === 'component') && attr(node, 'lang')?.kind === 'quoted') return;
    if (node.type === 'text') {
      // Text directly inside {...} is JavaScript, not template text.
      if (!parent || parent.type === 'expression' || parent.type === 'root') return;
      const value = (node.value ?? '').replace(/\s+/g, ' ').trim();
      if (value && hasEnglish(value) && !marksText(parent)) text.push({ file, line: here, text: value });
      return;
    }
    if ((node.type === 'element' || node.type === 'component') && node.attributes) {
      const covered = coveredAttrs(node);
      for (const a of node.attributes) {
        if (!ACCESSIBLE_ATTRS.includes(a.name) || a.kind !== 'quoted') continue;
        // A component's title/alt prop is not an HTML attribute; rule 3 checks props.
        if (node.type === 'component') continue;
        if (a.value && hasEnglish(a.value) && !covered.includes(a.name)) {
          attrs.push({ file, line: here, text: `${a.name}="${a.value}"` });
        }
      }
    }
    for (const child of node.children ?? []) visit(child, node, here);
  };
  visit(ast, null, 1);
  return { text, attrs };
}

/* ------------------------------------------------------------------ */
/* Rule 3: props that a component renders with data-i18n               */
/* ------------------------------------------------------------------ */

/** Names of props a component renders inside data-i18n or data-i18n-attr. */
function translatedProps(ast: AstroNode): Set<string> {
  const props = new Set<string>();
  const soleIdentifier = (node: AstroNode): string | null => {
    const kids = (node.children ?? []).filter((c) => !(c.type === 'text' && !(c.value ?? '').trim()));
    if (kids.length !== 1 || kids[0]!.type !== 'expression') return null;
    const code = (kids[0]!.children ?? []).map((c) => c.value ?? '').join('').trim();
    return /^[A-Za-z_$][\w$]*$/.test(code) ? code : null;
  };
  const visit = (node: AstroNode) => {
    if (node.type === 'element' && node.attributes) {
      if (attr(node, 'data-i18n')) {
        const id = soleIdentifier(node);
        if (id) props.add(id);
      }
      const list = attr(node, 'data-i18n-attr')?.value;
      if (list) {
        for (const name of list.split(',').map((s) => s.trim())) {
          const a = attr(node, name);
          if (a && a.kind === 'expression' && /^[A-Za-z_$][\w$]*$/.test(a.value.trim())) props.add(a.value.trim());
        }
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(ast);
  return props;
}

/** `import Name from './X.astro'` in a frontmatter, resolved to a src-relative path. */
function astroImports(rel: string, fm: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of fm.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+\.astro)['"]/g)) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[2]!));
    out.set(m[1]!, target);
  }
  return out;
}

interface PropUse {
  file: string;
  line: number;
  component: string;
  prop: string;
  text: string;
}

async function literalTranslatedProps(): Promise<PropUse[]> {
  const astroFiles = sourceFiles(['.astro']);
  const propsByComponent = new Map<string, Set<string>>();
  for (const rel of astroFiles) propsByComponent.set(rel, translatedProps(await astroAst(rel)));

  const uses: PropUse[] = [];
  for (const rel of astroFiles) {
    const ast = await astroAst(rel);
    const imports = astroImports(rel, frontmatter(ast));
    const visit = (node: AstroNode, line: number) => {
      const here = node.position?.start.line ?? line;
      if (node.type === 'component' && node.name && node.attributes) {
        const target = imports.get(node.name);
        const props = target ? propsByComponent.get(target) : undefined;
        if (props) {
          for (const a of node.attributes) {
            if (a.kind === 'quoted' && props.has(a.name) && a.value.trim()) {
              uses.push({ file: `src/${rel}`, line: here, component: node.name, prop: a.name, text: a.value.trim() });
            }
          }
        }
      }
      for (const child of node.children ?? []) visit(child, here);
    };
    visit(ast, 1);
  }
  return uses;
}

/* ------------------------------------------------------------------ */
/* Rule 4: counts glued to English words in template literals          */
/* ------------------------------------------------------------------ */

/** `${count} words` inside a template literal: a count built by concatenation.
    The expression must look like a number (a length, a count, a total, a
    duration), which keeps ids and class names in build-time error messages
    out of it. */
const GLUED_COUNT = /\$\{([^{}]+)\}\s+((?:Task|Part)\s+\d\s+)?([a-z]{3,})/g;
const COUNT_LIKE = /(\.length|\.size|count|Count|total|Total|minutes|Minutes|\bn\b)\s*$/;

function gluedCounts(): Finding[] {
  const found: Finding[] = [];
  for (const rel of sourceFiles(['.astro', '.ts', '.tsx'])) {
    if (!rel.startsWith('pages/') && !rel.startsWith('components/')) continue;
    if (exempt(rel)) continue;
    const source = fs.readFileSync(path.join(SRC_DIR, rel), 'utf8');
    for (const literal of source.matchAll(/`(?:[^`\\]|\\.)*`/g)) {
      const before = source.slice(Math.max(0, literal.index - 40), literal.index);
      // A build-time invariant (`throw new Error(...)`) is read by a builder,
      // and a page's meta description by a search engine, not a student.
      if (/Error\(\s*$|throw\s*$|description=\{\s*$/.test(before)) continue;
      for (const m of literal[0].matchAll(GLUED_COUNT)) {
        if (!COUNT_LIKE.test(m[1]!.trim())) continue;
        const line = source.slice(0, literal.index).split('\n').length;
        found.push({ file: `src/${rel}`, line, text: m[0] });
      }
    }
  }
  return found;
}

/* ------------------------------------------------------------------ */
/* Rule 5: JSX text in React islands                                   */
/* ------------------------------------------------------------------ */

function unwrappedJsxText(): Finding[] {
  const found: Finding[] = [];
  for (const rel of sourceFiles(['.tsx'])) {
    if (exempt(rel)) continue;
    const source = fs.readFileSync(path.join(SRC_DIR, rel), 'utf8');
    const sf = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node)) {
        const value = node.getText(sf).replace(/\s+/g, ' ').trim();
        if (value && hasEnglish(value)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          found.push({ file: `src/${rel}`, line, text: value });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return found;
}

const show = (items: Finding[]) => items.map((f) => `${f.file}:${f.line}  ${JSON.stringify(f.text)}`).join('\n  ');

/* ------------------------------------------------------------------ */
/* The tests                                                            */
/* ------------------------------------------------------------------ */

test('the protected-English filter keeps paper names and catches everything else', () => {
  assert.equal(hasEnglish('Reading'), false);
  assert.equal(hasEnglish('IELTS is EZ'), false);
  assert.equal(hasEnglish('Task 1 · Part 2'), false);
  assert.equal(hasEnglish('40 questions'), true);
  assert.equal(hasEnglish('Topic Lists'), true);
  assert.equal(hasEnglish('Сегодня тренируем Matching Headings в Reading'), false);
});

test('the checker catches the audit\'s own examples, and passes their fixes', async () => {
  // What src/pages/tests/index.astro looked like when the audit ran (F05).
  const before = `---\nconst n = 40;\n---\n<p class="x">\n  {n} complete exams in rotation, a different one every attempt until you've taken them all.\n</p>\n<span class="chip">{n} questions</span>\n<a aria-label="Account sections">x</a>`;
  const ast = (await parse(before, { position: true })).ast as unknown as AstroNode;
  const found = unmarkedInAstro('fixture.astro', ast);
  assert.equal(found.text.length, 2, `expected both count sentences, got ${JSON.stringify(found.text)}`);
  assert.equal(found.attrs.length, 1);

  const after = `---\nimport Count from './Count.astro';\n---\n<Count as="p" phrase={ntn(n, { one: '{n} exam', other: '{n} exams' })} />\n<span data-i18n>Start a test</span>\n<a aria-label="Account sections" data-i18n-attr="aria-label">x</a>\n<h3>Reading</h3>`;
  const fixed = unmarkedInAstro('fixture.astro', (await parse(after, { position: true })).ast as unknown as AstroNode);
  assert.deepEqual(fixed, { text: [], attrs: [] });

  // A count glued in a frontmatter template literal, as on the Practice page.
  assert.ok(GLUED_COUNT.test('`${ALL_DRILLS.length} drills`'));
  GLUED_COUNT.lastIndex = 0;
});

test('no English text in an .astro template is left unmarked', async () => {
  const problems: Finding[] = [];
  for (const rel of sourceFiles(['.astro'])) {
    if (exempt(rel)) continue;
    problems.push(...unmarkedInAstro(rel, await astroAst(rel)).text);
  }
  assert.deepEqual(
    problems.map((p) => `${p.file}:${p.line}`),
    [],
    `English text nobody marked for translation. Put data-i18n on the element that holds only the text, ` +
      `or render a count with <Count phrase={ntn(n, { one, other })} />:\n  ${show(problems)}`,
  );
});

test('no English aria-label, alt, title or placeholder in an .astro template is left unmarked', async () => {
  const problems: Finding[] = [];
  for (const rel of sourceFiles(['.astro'])) {
    if (exempt(rel)) continue;
    problems.push(...unmarkedInAstro(rel, await astroAst(rel)).attrs);
  }
  assert.deepEqual(
    problems.map((p) => `${p.file}:${p.line}`),
    [],
    `Add the attribute's name to data-i18n-attr on the same element:\n  ${show(problems)}`,
  );
});

test('a plain string passed to a component that translates that prop has Russian', async () => {
  const uses = await literalTranslatedProps();
  // A guard on the guard: the audit's own example must be found.
  assert.ok(
    uses.some((u) => u.component === 'PartGrid' && u.text === 'Topic Lists'),
    'the extractor should find PartGrid heading="Topic Lists" in src/pages/lessons/vocabulary.astro',
  );
  const missing = uses.filter((u) => !ruMerged.strings[u.text]);
  assert.deepEqual(
    missing.map((u) => `${u.file}:${u.line} <${u.component} ${u.prop}="${u.text}">`),
    [],
    'These props are rendered with data-i18n by their component, so they need Russian in the main dictionary.',
  );
});

test('no count is glued to an English word with a template literal', () => {
  const problems = gluedCounts();
  assert.deepEqual(
    problems.map((p) => `${p.file}:${p.line}`),
    [],
    `Build counted phrases with tn() in code or ntn() in data, never \`\${n} words\`:\n  ${show(problems)}`,
  );
});

test('no English JSX text in a React island is left outside t()', () => {
  const problems = unwrappedJsxText();
  assert.deepEqual(
    problems.map((p) => `${p.file}:${p.line}`),
    [],
    `Wrap it: {t('...')}:\n  ${show(problems)}`,
  );
});
