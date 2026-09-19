/* Applies the Mr EZ tables to the live Supabase project.
 *
 * Only the mr_ez_* section of supabase/schema.sql, never the whole file, so
 * the existing user_state and live_examiner_sessions policies are not dropped
 * and recreated as a side effect of adding a feature. Every statement in that
 * section is `if not exists` or scoped to a table that does not exist yet.
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

const ddl = readFileSync(resolve(REPO, '.tmp/mr-ez-tables.sql'), 'utf8');
console.log('\n=== applying ' + ddl.length + ' characters of DDL ===');
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
