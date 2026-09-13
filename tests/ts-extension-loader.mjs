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
 * style hooks; the two implementations must stay in sync. */
import { registerHooks } from 'node:module';

function isExtensionlessRelativeImport(specifier) {
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
  const hasExtension = /\.[a-z0-9]+$/i.test(specifier);
  return isRelative && !hasExtension;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (error?.code === 'ERR_MODULE_NOT_FOUND' && isExtensionlessRelativeImport(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && isExtensionlessRelativeImport(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw error;
  }
}
