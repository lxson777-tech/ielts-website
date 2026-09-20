/* Applies the Mr EZ tables to the live Supabase project.
 *
 * Only the mr_ez_* section of supabase/schema.sql, never the whole file, so
 * the existing user_state and live_examiner_sessions policies are not dropped
 * and recreated as a side effect of adding a feature. Every statement in that
 * section is `if not exists` or scoped to a table that does not exist yet.
 *
 * The section is cut out of supabase/schema.sql AT RUN TIME, from the banner
 * containing "Mr EZ, the AI tutor" to the end of the file. It used to read a
 * one-off copy someone had extracted into .tmp/, which meant the tool could
 * happily apply a version of the schema that no longer matched the file in the
 * repository, and nothing would say so. The checked-in schema is the only
 * source of truth now, so this cannot drift from it.
 *
 * Before anything is sent, the extract is checked to touch nothing but
 * mr_ez_* objects (see assertOnlyMrEz). That property is what makes this tool
 * safe to run against a live project at all, so it is enforced rather than
 * merely described.
 *
 * Reads SUPABASE_ACCESS_TOKEN out of the repo's gitignored .env itself: the
 * value is used for the Authorization header only and is never printed.
 *
 * Usage:
 *   node tools/apply-mr-ez-schema.mjs --check    read-only, shows what exists
 *   node tools/apply-mr-ez-schema.mjs --apply    runs the DDL
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_REF = 'nbeyxwjvytrqtzzeilev';
const APPLY = process.argv.includes('--apply');

/* ── The DDL, cut out of the checked-in schema ──────────────────────────── */

const SECTION_BANNER = 'Mr EZ, the AI tutor';

/** Everything from the Mr EZ banner in supabase/schema.sql to the end of the
    file. The section is last on purpose: new tutor tables are appended to it,
    so "to the end" needs no second marker to keep in step. */
function readMrEzSection() {
  const path = resolve(REPO, 'supabase/schema.sql');
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const banner = lines.findIndex((line) => line.includes(SECTION_BANNER));
  if (banner < 0) {
    throw new Error(`supabase/schema.sql has no section banner containing "${SECTION_BANNER}"`);
  }
  // Include the horizontal rule above the banner when there is one, purely so
  // the extract reads like the section it came from.
  const start = banner > 0 && /^--\s*[─-╿=-]{4,}\s*$/.test(lines[banner - 1].trim()) ? banner - 1 : banner;
  return lines.slice(start).join('\n');
}

/** Refuse to send anything that would touch an object outside the mr_ez_*
    family. This is the safety property the whole tool rests on: it may create
    the tutor's tables on a live project, and it may not so much as drop a
    policy belonging to user_state or live_examiner_sessions.

    Two checks, because "only mr_ez_" is not quite the whole truth. The tutor's
    triggers EXECUTE public.touch_user_state_updated_at, which is shared with
    user_state — referencing it is fine, redefining or dropping it is not, so
    the function is allowed by name and any create/alter/drop of a function is
    refused outright. */
const SHARED_FUNCTIONS = new Set(['touch_user_state_updated_at']);

function assertOnlyMrEz(ddl) {
  if (/\b(create|alter|drop)\s+(or\s+replace\s+)?function\b/i.test(ddl)) {
    throw new Error('refusing: the Mr EZ section contains a function definition, which is shared with other tables');
  }
  const named = [...new Set([...ddl.matchAll(/public\.([A-Za-z0-9_]+)/g)].map((m) => m[1].toLowerCase()))];
  const foreign = named.filter((name) => !name.startsWith('mr_ez_') && !SHARED_FUNCTIONS.has(name));
  if (foreign.length) {
    throw new Error(`refusing: the Mr EZ section names non-tutor objects: ${foreign.join(', ')}`);
  }
  return named;
}

function readToken() {
  for (const rel of ['.env', '../../../.env']) {
    const path = resolve(REPO, rel);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = /^\s*SUPABASE_ACCESS_TOKEN\s*=\s*"?([^"\s]+)"?\s*$/.exec(line);
      if (m && m[1] && m[1].length > 20) {
        console.log('token loaded from ' + rel + ' (value not shown)');
        return m[1];
      }
    }
  }
  throw new Error('No SUPABASE_ACCESS_TOKEN found in .env');
}

/* Extracted and checked before the token is even read, so a schema file that
   has drifted out of shape fails immediately and without a credential in
   memory. */
const ddl = readMrEzSection();
const ddlObjects = assertOnlyMrEz(ddl);
console.log(`Mr EZ section: ${ddl.length} characters, touching only ${ddlObjects.join(', ')}`);

const token = readToken();

async function query(sql) {
  const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${text.slice(0, 500)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const LIST_TABLES = `
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;`;

const LIST_POLICIES = `
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;`;

console.log('\n=== tables in public BEFORE ===');
for (const row of await query(LIST_TABLES)) console.log('  ' + row.table_name);

if (!APPLY) {
  console.log('\n=== policies BEFORE ===');
  for (const row of await query(LIST_POLICIES)) {
    console.log('  ' + row.tablename.padEnd(24) + row.cmd.padEnd(8) + row.policyname);
  }
  console.log('\n(read-only check. Re-run with --apply to create the tutor tables.)');
  process.exit(0);
}

console.log('\n=== applying ' + ddl.length + ' characters of DDL from supabase/schema.sql ===');
await query(ddl);
console.log('applied without error');

console.log('\n=== tables in public AFTER ===');
for (const row of await query(LIST_TABLES)) console.log('  ' + row.table_name);

console.log('\n=== Mr EZ policies ===');
for (const row of await query(LIST_POLICIES)) {
  if (row.tablename.startsWith('mr_ez')) {
    console.log('  ' + row.tablename.padEnd(24) + row.cmd.padEnd(8) + row.policyname);
  }
}

console.log('\n=== the column-scoped grant (students may blank `reply`, nothing else) ===');
const grants = await query(`
select table_name, column_name, privilege_type, grantee
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'mr_ez_turns' and grantee = 'authenticated'
order by column_name, privilege_type;`);
for (const g of grants) {
  console.log('  ' + g.column_name.padEnd(22) + g.privilege_type.padEnd(10) + g.grantee);
}
