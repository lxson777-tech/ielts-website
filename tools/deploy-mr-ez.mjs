/* One command to put Mr EZ live. Run it from the repo root.
 *
 *   node tools/deploy-mr-ez.mjs
 *
 * Four steps, in the only order that never leaves a broken window:
 *
 *   1. Create the mr_ez_* tables in Supabase. Until they exist the Worker
 *      fails closed, so this goes first.
 *   2. Upload the Worker's two secrets and deploy it.
 *   3. Check the deployed Worker answers.
 *   4. Set the repo variable PUBLIC_MR_EZ_URL, so the next build of the site
 *      knows where to find him.
 *
 * Merging the pull request after step 4 is what actually publishes the site.
 *
 * SECRETS ARE NEVER PRINTED. The script reads them out of the gitignored .env
 * and workers/*.dev.vars you already have, pipes them straight into wrangler,
 * and never writes them anywhere new.
 *
 * Safe to re-run: every step is idempotent.
 *
 *   --skip-schema   database already done
 *   --skip-worker   Worker already deployed
 *   --skip-var      repo variable already set
 */

import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER_DIR = resolve(REPO, 'workers/mr-ez');
const skip = (name) => process.argv.includes(`--skip-${name}`);

function banner(text) {
  console.log('\n' + '='.repeat(72) + '\n' + text + '\n' + '='.repeat(72));
}

/** Pull one name out of the first gitignored file that has it. Returns the
    value for piping only; it is never logged. */
function readSecret(name, files) {
  for (const rel of files) {
    const path = resolve(REPO, rel);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = new RegExp(`^\\s*${name}\\s*=\\s*"?([^"\\s]+)"?\\s*$`).exec(line);
      if (m && m[1] && m[1].length > 20) {
        console.log(`  ${name}: found in ${rel} (value not shown)`);
        return m[1];
      }
    }
  }
  throw new Error(`Could not find ${name} in any of: ${files.join(', ')}`);
}

function run(cmd, args, { cwd = REPO, stdin = null } = {}) {
  return new Promise((done, fail) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32', stdio: ['pipe', 'inherit', 'inherit'] });
    if (stdin !== null) child.stdin.write(stdin);
    child.stdin.end();
    child.on('close', (code) => (code === 0 ? done() : fail(new Error(`${cmd} exited ${code}`))));
    child.on('error', fail);
  });
}

/* ── 1. Database ───────────────────────────────────────────────────────── */

if (!skip('schema')) {
  banner('1/4  Creating the mr_ez_* tables in Supabase');
  await run('node', ['tools/apply-mr-ez-schema.mjs', '--apply']);
} else {
  console.log('\n1/4  skipped (--skip-schema)');
}

/* ── 2. Worker ─────────────────────────────────────────────────────────── */

let workerUrl = process.env.MR_EZ_WORKER_URL || 'https://ielts-mr-ez.lxson777.workers.dev';

if (!skip('worker')) {
  banner('2/4  Uploading secrets and deploying the Worker');

  // Re-used from the Workers that already have them. Same OpenAI account, same
  // Supabase project: there is no second key to go and find.
  const openaiKey = readSecret('OPENAI_API_KEY', [
    'workers/mr-ez/.dev.vars',
    '../../../workers/mr-ez/.dev.vars',
    '../../../workers/grade-essay/.dev.vars',
    '../../../workers/grade-speaking/.dev.vars',
    '../../../workers/live-examiner/.dev.vars',
  ]);
  const serviceKey = readSecret('SUPABASE_SERVICE_ROLE_KEY', [
    'workers/mr-ez/.dev.vars',
    '../../../workers/mr-ez/.dev.vars',
    '../../../workers/live-examiner/.dev.vars',
  ]);

  console.log('\n  putting OPENAI_API_KEY ...');
  await run('npx', ['wrangler', 'secret', 'put', 'OPENAI_API_KEY'], { cwd: WORKER_DIR, stdin: openaiKey });
  console.log('  putting SUPABASE_SERVICE_ROLE_KEY ...');
  await run('npx', ['wrangler', 'secret', 'put', 'SUPABASE_SERVICE_ROLE_KEY'], { cwd: WORKER_DIR, stdin: serviceKey });

  console.log('\n  deploying ...');
  await run('npx', ['wrangler', 'deploy'], { cwd: WORKER_DIR });
} else {
  console.log('\n2/4  skipped (--skip-worker)');
}

/* ── 3. Does it answer? ────────────────────────────────────────────────── */

banner('3/4  Checking the deployed Worker');
console.log('  GET ' + workerUrl);
try {
  const resp = await fetch(workerUrl, { signal: AbortSignal.timeout(15000) });
  const body = await resp.json();
  console.log('  HTTP ' + resp.status + '  ' + JSON.stringify(body));
  if (!body.configured) {
    console.log('\n  WARNING: the Worker reports itself unconfigured. A secret is missing.');
    process.exit(1);
  }
  if (body.live !== true) {
    console.log('\n  WARNING: the Worker is not in live mode. Check TUTOR_SIMULATE in wrangler.jsonc.');
    process.exit(1);
  }
  console.log('  Worker is live on ' + body.model + ', ' + body.turnsPerDay + ' turns per student per day.');
} catch (err) {
  console.log('  could not reach it: ' + err.message);
  console.log('  If the deploy printed a different URL, re-run with:');
  console.log('    MR_EZ_WORKER_URL=<that url> node tools/deploy-mr-ez.mjs --skip-schema --skip-worker');
  process.exit(1);
}

/* ── 4. Tell the site where he lives ───────────────────────────────────── */

if (!skip('var')) {
  banner('4/4  Setting the repo variable PUBLIC_MR_EZ_URL');
  await run('gh', ['variable', 'set', 'PUBLIC_MR_EZ_URL', '--body', workerUrl]);
  console.log('  set to ' + workerUrl);
} else {
  console.log('\n4/4  skipped (--skip-var)');
}

banner('Done. Merge the pull request to publish the site.');
console.log(`
  https://github.com/lxson777-tech/ielts-website/pull/1

Merging pushes to main, which triggers .github/workflows/deploy.yml and
rebuilds the site with PUBLIC_MR_EZ_URL baked in. Until then the live site is
unchanged and Mr EZ simply is not there.
`);
