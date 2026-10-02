/* The translatable-text extractor shared by the Russian coverage test
   (tests/i18n.test.ts) and the Kazakh one (tests/i18n-kk.test.ts). Moved
   here unchanged from tests/i18n.test.ts on 2 October 2026, so the two
   languages are measured by exactly the same rules. How it works is
   described in tests/i18n.test.ts, above the coverage test. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { messageKey } from '../src/lib/i18n/translate.ts';
import { partForSourceFile, type DictionaryPart } from '../src/lib/i18n/dict/parts.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const SRC_DIR = path.join(REPO_ROOT, 'src');

export const SKIP_DIRS = ['lib/i18n', 'data/tests', 'content'];
const EXTENSIONS = ['.ts', '.tsx', '.astro'];

export interface Extracted {
  /** The dictionary key (already including any context prefix). */
  key: string;
  /** The English text, for placeholder checks and messages. */
  text: string;
  /** Path relative to the repo root, for failure messages. */
  file: string;
  kind: 'string' | 'plural';
  /** The extra dictionary part this file's text belongs to, or null for the
      main dictionary. Decided by PART_SOURCES, never guessed at here. */
  part: DictionaryPart | null;
}

export function sourceFiles(): string[] {
  const entries = fs.readdirSync(SRC_DIR, { recursive: true, encoding: 'utf8' }) as string[];
  return entries
    .map((rel) => rel.split(path.sep).join('/'))
    .filter((rel) => EXTENSIONS.includes(path.extname(rel)))
    .filter((rel) => !SKIP_DIRS.some((dir) => rel === dir || rel.startsWith(`${dir}/`)))
    .filter((rel) => fs.statSync(path.join(SRC_DIR, rel)).isFile());
}

/** Is this index inside a `//` line comment or a `*`-continued block? */
function inComment(source: string, index: number): boolean {
  const lineStart = source.lastIndexOf('\n', index - 1) + 1;
  const before = source.slice(lineStart, index);
  const trimmed = before.trimStart();
  if (trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('//')) return true;
  // A `//` later on the same line, ignoring the `://` of a URL.
  const slashes = before.indexOf('//');
  return slashes > 0 && before[slashes - 1] !== ':';
}

/** Split a call's argument list at top-level commas, respecting nesting and
    quotes. `start` is the index just after the opening paren. Returns null
    if the call never closes (a truncated file). */
function readArguments(source: string, start: number): string[] | null {
  const args: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i]!;
    if (quote) {
      current += ch;
      if (ch === '\\') {
        current += source[i + 1] ?? '';
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    if (ch === ')' && depth === 0) {
      args.push(current);
      return args;
    }
    if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    if (ch === ',' && depth === 0) {
      args.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  return null;
}

/** The value of a plain quoted string literal, or null if the argument is
    anything else (template literal, variable, expression). */
function literal(arg: string | undefined): string | null {
  if (arg === undefined) return null;
  const text = arg.trim();
  const quote = text[0];
  if ((quote !== "'" && quote !== '"') || text.length < 2 || text[text.length - 1] !== quote) return null;
  let out = '';
  for (let i = 1; i < text.length - 1; i += 1) {
    const ch = text[i]!;
    if (ch === '\\') {
      const next = text[i + 1];
      out += next === 'n' ? '\n' : next === 't' ? '\t' : (next ?? '');
      i += 1;
      continue;
    }
    if (ch === quote) return null; // an unescaped quote: not a simple literal
    out += ch;
  }
  return out;
}

/** Every `name(...)` call whose name is not part of a longer identifier. */
function findCalls(source: string, name: string): string[][] {
  const out: string[][] = [];
  const pattern = new RegExp(`(^|[^A-Za-z0-9_$.])${name}\\s*\\(`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const callIndex = match.index + match[1]!.length;
    if (inComment(source, callIndex)) continue;
    const args = readArguments(source, match.index + match[0].length);
    if (args) out.push(args);
  }
  return out;
}

/* Opening tags, with attribute values that may contain quotes or a single
   level of Astro `{...}` expression. */
const OPEN_TAG = /<([A-Za-z][A-Za-z0-9:_-]*)((?:[^>"'{]|"[^"]*"|'[^']*'|\{[^{}]*\})*)>/g;
const HAS_I18N = /\bdata-i18n(?![\w-])/;

function attrValue(attrs: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(attrs);
  if (!match) return null;
  return match[2] ?? match[3] ?? null;
}

export function extractFromFile(rel: string): Extracted[] {
  const source = fs.readFileSync(path.join(SRC_DIR, rel), 'utf8');
  const file = `src/${rel}`;
  const part = partForSourceFile(rel);
  const found: Extracted[] = [];

  for (const fn of ['t', 'nt'] as const) {
    for (const args of findCalls(source, fn)) {
      const text = literal(args[0]);
      if (text === null || text === '') continue;
      const ctx = fn === 't' ? literal(args[2]) : null;
      found.push({ key: messageKey(text, ctx ?? undefined), text, file, kind: 'string', part });
    }
  }

  // tn(n, forms) in code, and ntn(n, forms): the same counted phrase kept as
  // data and rendered later (src/components/Count.astro, data-i18n-n).
  for (const args of [...findCalls(source, 'tn'), ...findCalls(source, 'ntn')]) {
    const forms = args[1];
    if (!forms) continue;
    const other = /\bother\s*:\s*('([^']*)'|"([^"]*)")/.exec(forms);
    const text = other?.[2] ?? other?.[3];
    if (!text) continue;
    found.push({ key: text, text, file, kind: 'plural', part });
  }

  if (rel.endsWith('.astro')) {
    OPEN_TAG.lastIndex = 0;
    let tag: RegExpExecArray | null;
    while ((tag = OPEN_TAG.exec(source))) {
      const attrs = tag[2] ?? '';
      const ctx = attrValue(attrs, 'data-i18n-ctx') ?? undefined;

      if (HAS_I18N.test(attrs)) {
        const after = source.slice(tag.index + tag[0].length);
        const inner = after.slice(0, after.indexOf('<'));
        const text = inner.trim();
        // `{tab.label}` and friends cannot be read statically; the English
        // literal is wrapped with nt() where it is actually written.
        if (text && !text.includes('{') && !text.includes('}')) {
          found.push({ key: messageKey(text, ctx), text, file, kind: 'string', part });
        }
      }

      const list = attrValue(attrs, 'data-i18n-attr');
      if (list) {
        for (const raw of list.split(',')) {
          const attr = raw.trim();
          if (!attr) continue;
          const value = attrValue(attrs, attr);
          if (!value) continue;
          const text = value.trim();
          if (!text || text.includes('{')) continue;
          found.push({ key: messageKey(text, ctx), text, file, kind: 'string', part });
        }
      }
    }
  }

  return found;
}

export function extractAll(): Extracted[] {
  return sourceFiles().flatMap(extractFromFile);
}

export function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
}

