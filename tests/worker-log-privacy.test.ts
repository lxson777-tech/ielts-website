/* Nothing personal reaches the Workers' logs (4 October 2026).

   Workers Logs is switched on for every Worker (the observability block in
   each workers/<name>/wrangler.jsonc), so whatever a Worker passes to
   console.* is kept by Cloudflare for a few days. This test reads every
   console call in every Worker AND in every file of src/ a Worker bundles
   (followed through the imports, type-only imports skipped), and fails by
   file and line if a call's arguments name a request body, an essay, a
   transcript, audio, a token, a key or contact details.

   It reads the code, not the running Worker: a variable named `body`
   being logged is the mistake, whatever it holds on the day. String
   literals are not checked (a fixed sentence such as "account out of
   credits" says nothing about a student); the expressions inside a
   template literal are. Error messages (err.message) are allowed, as the
   brief allows short error messages; generic failures log the error class
   instead (errorName in src/lib/observability/request-log.ts). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** A logged expression whose FIRST name is one of these is refused. */
const FORBIDDEN_ROOTS = new Set([
  'body', 'bodyText', 'rawBody', 'requestBody', 'payload', 'raw', 'data', 'parsed', 'json',
  'request', 'req', 'headers',
  'essay', 'transcript', 'transcriptText', 'turns', 'text', 'userText', 'systemText', 'instructions', 'prompt',
  'answer', 'answers', 'reply', 'message', 'messages', 'content', 'audio', 'audioBase64', 'clip', 'clips', 'sdp',
  'token', 'accessToken', 'apiKey', 'secret', 'password',
  'email', 'phone', 'name', 'firstName', 'lastName', 'profile', 'user',
]);
/** A logged expression with ANY part matching this is refused, wherever it
    sits in the chain (env.OPENAI_API_KEY, body.essay, opts.accessToken). */
const FORBIDDEN_PART = /(api_?key|secret|token|password|service_?role|authorization|essay|transcript|email|phone|birth|sdp|audio|prompt|answer)/i;

export interface Finding {
  file: string;
  line: number;
  call: string;
  reason: string;
}

/** Replaces the inside of every string literal with spaces (keeping the
    `${...}` expressions of template literals), and drops comments. */
export function stripLiterals(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    const next = src[i + 1];
    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      out += ch;
      i++;
      while (i < src.length && src[i] !== ch) {
        if (src[i] === '\\') {
          out += '  ';
          i += 2;
          continue;
        }
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += ch;
      i++;
      continue;
    }
    if (ch === '`') {
      out += ch;
      i++;
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\') {
          out += '  ';
          i += 2;
          continue;
        }
        if (src[i] === '$' && src[i + 1] === '{') {
          let depth = 1;
          out += '${';
          i += 2;
          while (i < src.length && depth > 0) {
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            if (depth > 0) out += src[i];
            i++;
          }
          out += '}';
          continue;
        }
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '`';
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** Every console.* call in a source text and what it logs that it should not. */
export function scanSource(file: string, src: string): Finding[] {
  const clean = stripLiterals(src);
  const findings: Finding[] = [];
  const re = /\bconsole\s*\.\s*(log|error|warn|info|debug)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(clean))) {
    let depth = 1;
    let j = match.index + match[0].length;
    const start = j;
    while (j < clean.length && depth > 0) {
      if (clean[j] === '(') depth++;
      else if (clean[j] === ')') depth--;
      j++;
    }
    const args = clean.slice(start, j - 1);
    const line = clean.slice(0, match.index).split('\n').length;
    const call = src.split('\n')[line - 1]!.trim();
    /* Object keys (`{ status: x }`) are labels, not values: drop `name:`. */
    const expressions = args.replace(/([A-Za-z_$][\w$]*)\s*:(?!:)/g, ' ');
    const chains = expressions.match(/\.\.\.\s*[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*/g) ?? [];
    for (const raw of chains) {
      const chain = raw.replace(/\s+/g, '').replace(/^\.\.\./, '');
      const parts = chain.split(/\??\./);
      const root = parts[0]!;
      if (FORBIDDEN_ROOTS.has(root)) {
        findings.push({ file, line, call, reason: `logs \`${chain}\`` });
        break;
      }
      const bad = parts.find((p) => FORBIDDEN_PART.test(p));
      if (bad) {
        findings.push({ file, line, call, reason: `logs \`${chain}\` (${bad})` });
        break;
      }
    }
  }
  return findings;
}

/** The local files a Worker bundles: its entry and every relative import,
    followed transitively, type-only imports skipped. */
export function bundledFiles(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    const importRe = /^\s*(import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"](\.{1,2}\/[^'"]+)['"]/gm;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(src))) {
      if (m[2]) continue; // import type / export type
      const target = resolveImport(dirname(file), m[3]!);
      if (target) queue.push(target);
    }
  }
  return [...seen];
}

function resolveImport(from: string, spec: string): string | null {
  const base = resolve(from, spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile() && /\.(ts|tsx)$/.test(candidate)) return candidate;
  }
  return null;
}

function workerEntries(): string[] {
  const dir = join(ROOT, 'workers');
  return readdirSync(dir)
    .map((name) => join(dir, name, 'src', 'index.ts'))
    .filter((p) => existsSync(p));
}

test('the scanner catches what it is meant to catch', () => {
  const bad = [
    'console.log(body);',
    "console.error('OpenAI failed', resp.status, bodyText.slice(0, 300));",
    'console.log(`essay: ${essay}`);',
    'console.log(env.OPENAI_API_KEY);',
    "console.error('auth', env.SUPABASE_SERVICE_ROLE_KEY);",
    'console.log(transcript.map((t) => t.text));',
    'console.log(request);',
    'console.info({ status: 200, ...payload });',
    "console.warn('user', opts.accessToken);",
    "console.log('x', parsed.value.email);",
  ];
  for (const line of bad) assert.equal(scanSource('sample.ts', line).length, 1, `not caught: ${line}`);
  const fine = [
    "console.error('mr-ez: unexpected failure', errorName(err));",
    "console.log('[grade-essay] openai evidence lengths', lengths);",
    'console.error(`mr-ez: test data ${testId} came back ${resp.status}`);',
    "console.error('live-examiner: failed to close reservation', id);",
    "console.error('OpenAI transcription fetch failed:', err instanceof Error ? `${err.name}: ${err.message}` : String(err));",
    "console.error(`live-examiner: missing required config: ${missing.join(', ')}`);",
    "console.log({ event: 'request', status: 200, ms: 12 });",
    "console.error('an essay text and a token are words in a sentence, not values');",
  ];
  for (const line of fine) assert.deepEqual(scanSource('sample.ts', line), [], `wrongly refused: ${line}`);
});

test('no Worker, and no shared file a Worker bundles, logs a body, an essay, a transcript, audio or a token', () => {
  const entries = workerEntries();
  assert.ok(entries.length >= 7, `expected every Worker, found ${entries.length}`);
  const files = new Set<string>();
  for (const entry of entries) for (const f of bundledFiles(entry)) files.add(f);
  /* The connection report's module and the log helper are bundled by the
     live examiner and every Worker; make sure the walk really reached src/. */
  const rel = [...files].map((f) => relative(ROOT, f).replace(/\\/g, '/'));
  assert.ok(rel.includes('src/lib/observability/request-log.ts'), 'the walk did not reach the shared log helper');
  assert.ok(rel.includes('src/lib/speaking/live/connection-report.ts'), 'the walk did not reach the connection report');
  assert.ok(rel.includes('src/lib/trial/gate.ts'), 'the walk did not reach the shared gate');
  const findings = [...files].flatMap((f) => scanSource(relative(ROOT, f), readFileSync(f, 'utf8')));
  assert.deepEqual(
    findings.map((f) => `${f.file}:${f.line} ${f.reason}: ${f.call}`),
    [],
    'a Worker logs something personal; log a short code, a length or a count instead',
  );
});

test('the log helper never reads a request or response body', () => {
  const src = stripLiterals(readFileSync(join(ROOT, 'src/lib/observability/request-log.ts'), 'utf8'));
  assert.doesNotMatch(src, /\.(text|json|arrayBuffer|formData|blob)\s*\(/, 'request-log.ts must not read a body');
  assert.doesNotMatch(src, /\.body\b/, 'request-log.ts must not touch a body');
  assert.doesNotMatch(src, /headers\s*\.\s*get/, 'request-log.ts must not read headers');
});

test('every Worker has Workers Logs on, with every request kept', () => {
  for (const entry of workerEntries()) {
    const config = readFileSync(join(dirname(dirname(entry)), 'wrangler.jsonc'), 'utf8');
    assert.match(
      config,
      /"observability"\s*:\s*\{\s*"enabled"\s*:\s*true\s*,\s*"head_sampling_rate"\s*:\s*1\s*\}/,
      `${relative(ROOT, entry)}: wrangler.jsonc needs "observability": { "enabled": true, "head_sampling_rate": 1 }`,
    );
  }
});

test('every Worker deploys the logged handler', () => {
  for (const entry of workerEntries()) {
    const src = readFileSync(entry, 'utf8');
    const tail = src.slice(src.lastIndexOf('export default'));
    assert.match(tail, /createLoggedHandler|loggedHandler/, `${relative(ROOT, entry)}: export default must use the logged handler`);
  }
});
