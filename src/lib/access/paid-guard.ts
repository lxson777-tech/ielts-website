/* Every paid entry point, for an account without practice and guidance,
   opens the upgrade pop-up instead of going anywhere (the free-account
   model, docs/paid-access/FREE-ACCOUNT-MODEL.md).

   BROWSER ONLY, and only installed by the GATED build (UpgradeDialog, which
   BaseLayout mounts there). One click listener on the document, in the
   capture phase so it runs before any island's or page script's own
   handler, decides for:
   - a link to a paid page (./paid-routes.ts), wherever it is on the site:
     the Tests catalogue, a Today card, a lesson's "try the trainer" link;
   - any element marked data-paid-feature="<feature>": a start button, the
     Mr EZ launcher, a lesson help button.
   A paid or complimentary account passes straight through. While the
   account is still being checked the click waits for the answer, then
   either continues or opens the pop-up. A server that could not be reached
   lets the click through: the page itself then says so plainly.

   It also keeps two kinds of copy in step with the account:
   [data-access-copy="paid"] shows for practice and guidance only, and
   [data-access-copy="free"] for everyone else (the build's default, so
   nothing paid flashes before the account is known).

   Nothing here is an access control: the content gate and the Workers
   refuse for themselves. */

import { openUpgrade } from './upgrade';
import { cleanRoute, paidFeatureForRoute } from './paid-routes';
import { PAID_FEATURES, type PaidFeature } from './model';
import { currentTier, opensEverything, settledTier, type BrowserTier } from './tier';
import { onTrialChange } from '../trial/client';
import { currentRoute } from '../auth/next';

export const PAID_FEATURE_ATTR = 'data-paid-feature';
/** Set on a click this guard replays after the account answered, so the
    replay is not stopped again. */
const REPLAY_FLAG = '__paidGuardReplay';

function asFeature(value: string | undefined | null): PaidFeature | null {
  return value && (PAID_FEATURES as readonly string[]).includes(value) ? (value as PaidFeature) : null;
}

/** The paid feature a click on `target` reaches for, and the element that
    carries it, or null for a free click. */
export function paidTargetOf(target: EventTarget | null, base: string): { el: HTMLElement; feature: PaidFeature } | null {
  if (!(target instanceof Element)) return null;
  const marked = target.closest<HTMLElement>(`[${PAID_FEATURE_ATTR}]`);
  if (marked) {
    const feature = asFeature(marked.getAttribute(PAID_FEATURE_ATTR));
    if (feature) return { el: marked, feature };
  }
  const link = target.closest<HTMLAnchorElement>('a[href]');
  if (!link || link.target === '_blank' || link.hasAttribute('download')) return null;
  let url: URL;
  try {
    url = new URL(link.href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const feature = paidFeatureForRoute(cleanRoute(url.pathname, base));
  return feature ? { el: link, feature } : null;
}

function replay(el: HTMLElement): void {
  if (el instanceof HTMLAnchorElement) {
    window.location.href = el.href;
    return;
  }
  (el as unknown as Record<string, unknown>)[REPLAY_FLAG] = true;
  try {
    el.click();
  } finally {
    delete (el as unknown as Record<string, unknown>)[REPLAY_FLAG];
  }
}

function decide(tier: BrowserTier, el: HTMLElement, feature: PaidFeature): void {
  if (opensEverything(tier) || tier === 'error' || tier === 'checking') {
    replay(el);
    return;
  }
  openUpgrade(feature, { from: currentRoute() });
}

let installed = false;

/** Shows and hides the account-dependent copy. */
export function syncAccessCopy(tier: BrowserTier = currentTier()): void {
  if (typeof document === 'undefined') return;
  const paid = opensEverything(tier);
  document.body.dataset.accessTier = tier;
  document.querySelectorAll<HTMLElement>('[data-access-copy]').forEach((el) => {
    const want = el.dataset.accessCopy;
    if (want === 'paid') el.hidden = !paid;
    else if (want === 'free') el.hidden = paid;
  });
}

export function installPaidGuard(base: string): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'click',
    (event) => {
      if (event.defaultPrevented) return;
      if (event instanceof MouseEvent && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
        /* A new-tab click on a paid link opens the page itself, which shows
           its own calm locked view. */
        return;
      }
      const hit = paidTargetOf(event.target, base);
      if (!hit) return;
      if ((hit.el as unknown as Record<string, unknown>)[REPLAY_FLAG]) return;
      const tier = currentTier();
      if (opensEverything(tier) || tier === 'error') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (tier === 'checking') {
        void settledTier().then((settled) => decide(settled, hit.el, hit.feature));
        return;
      }
      openUpgrade(hit.feature, { from: currentRoute() });
    },
    true,
  );
  onTrialChange(() => syncAccessCopy());
  document.addEventListener('astro:page-load', () => syncAccessCopy());
}
