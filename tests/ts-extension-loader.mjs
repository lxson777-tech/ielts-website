/** Let Node's focused tests load the same extensionless TypeScript imports
 * that Astro resolves during the application build.
 *
 * Node 22.15+ / 24 resolve most import specifiers through a synchronous,
 * same-thread fast path (`ModuleLoader.resolveSync`) instead of the async
 * `--experimental-loader` `resolve` hook below. Transitive extensionless
 * imports (a file our test doesn't import directly, only something it
 * imports does) hit that sync path and never reach the async hook at all,
 * so they fail with ERR_MODULE_NOT_FOUND even though this file is loaded.
 * `module.registerHooks` (stable in 22.15+/24) registers a synchronous,
 * in-thread hook that the sync path actually calls, so we register the same
 * fallback logic there. The async `resolve` export below is kept too, for
 * older Node versions or tools that only support `--experimental-loader`
 * style hooks; the two implementations must stay in sync.
 *
 * A second, related gap (found 2026-09 wiring up the study-plan schedule,
 * which imports `src/data/tests` — a directory — the same way Astro/Vite
 * happily resolve it): Node has no automatic directory→index resolution for
 * ESM, so that specifier fails with ERR_UNSUPPORTED_DIR_IMPORT rather than
 * ERR_MODULE_NOT_FOUND, and it isn't fixed by appending `.ts` to the
 * directory name. Try `<specifier>/index.ts` for that case (and, for
 * robustness, as a second attempt after the `.ts` suffix on the
 * not-found case too — cheap, and covers a directory import that a bundler
 * step happened to shadow with a same-named file). */
import { registerHooks } from 'node:module';

function isExtensionlessRelativeImport(specifier) {
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
  const hasExtension = /\.[a-z0-9]+$/i.test(specifier);
  return isRelative && !hasExtension;
}

function candidateSpecifiers(specifier) {
  if (!isExtensionlessRelativeImport(specifier)) return [];
  return [`${specifier}.ts`, `${specifier}/index.ts`];
}

function resolveWithFallback(specifier, context, nextResolve) {
  try {
    return nextResolve(specifier, context);
  } catch (error) {
    const retryable = error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'ERR_UNSUPPORTED_DIR_IMPORT';
    if (!retryable) throw error;
    for (const candidate of candidateSpecifiers(specifier)) {
      try {
        return nextResolve(candidate, context);
      } catch {
        // try the next candidate before giving up
      }
    }
    throw error;
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    return resolveWithFallback(specifier, context, nextResolve);
  },
});

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const retryable = error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'ERR_UNSUPPORTED_DIR_IMPORT';
    if (!retryable) throw error;
    for (const candidate of candidateSpecifiers(specifier)) {
      try {
        return await nextResolve(candidate, context);
      } catch {
        // try the next candidate before giving up
      }
    }
    throw error;
  }
}
