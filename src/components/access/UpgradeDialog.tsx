/* The upgrade pop-up (the free-account model, Alex, 1 October 2026;
   docs/paid-access/FREE-ACCOUNT-MODEL.md).

   One instance, mounted by BaseLayout in the GATED build only. It opens:
   - when an account without practice and guidance reaches for something
     paid: any island or page script calls openUpgrade(feature)
     (src/lib/access/upgrade.ts), and the click guard
     (src/lib/access/paid-guard.ts) does so for every paid link and button;
   - once per account, after a free student's FIRST finished lesson
     (src/lib/access/nudge.ts), never mid-lesson and never again after it.
   It is never shown to a paid or complimentary account.

   What it says comes from the shared contract: the feature's own reason
   (UPGRADE_REASON), what paying adds and the price (src/lib/access/
   upgrade-pitch.ts, read from the plan and allowance constants, never
   re-typed). It grants nothing: its one action is a link to /plans (or to
   sign-up, then /plans, for a visitor who is not signed in).

   Accessible: a named modal dialog (src/lib/a11y/modal-dialog.ts: focus
   moves in, Tab stays inside, Escape closes, the page behind is inert), and
   focus goes back to the control that opened it. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useModalDialog } from '../../lib/a11y/modal-dialog';
import { onUpgrade, UPGRADE_REASON, type UpgradeRequest } from '../../lib/access/upgrade';
import { installPaidGuard, syncAccessCopy } from '../../lib/access/paid-guard';
import { currentTier, opensEverything } from '../../lib/access/tier';
import { LESSON_FINISHED_EVENT, markNudgeShown, shouldNudge } from '../../lib/access/nudge';
import { PITCH_PRICE_LINE, pitchPlan, pitchPrice, upgradePitch } from '../../lib/access/upgrade-pitch';
import { trialView } from '../../lib/trial/client';
import { deviceStorage } from '../../lib/store-owner';
import { getProgress } from '../../lib/progress';
import { signUpHref } from '../../lib/auth/profile';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { ensureAccessStyles } from './access-styles';

/** How long after "studied" (or the last quiz check) the nudge waits, so
    the tick the student just pressed is seen first. */
const NUDGE_DELAY_MS = 900;

interface Open {
  request: UpgradeRequest;
  signedOut: boolean;
}

export default function UpgradeDialog() {
  ensureAccessStyles();
  const { t, locale } = useT();
  const [open, setOpen] = useState<Open | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const show = useCallback((request: UpgradeRequest) => {
    const tier = currentTier();
    /* Never for practice and guidance: a stray call opens nothing. */
    if (opensEverything(tier)) return;
    const active = document.activeElement;
    returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setOpen({ request, signedOut: tier === 'signed-out' });
  }, []);

  const close = useCallback(() => {
    setOpen(null);
    const target = returnFocus.current;
    returnFocus.current = null;
    if (target && target.isConnected) requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    installPaidGuard(import.meta.env.BASE_URL ?? '/');
    syncAccessCopy();
    const off = onUpgrade(show);

    let timer = 0;
    const onFinished = (event: Event) => {
      const finishedKey = (event as CustomEvent<string>).detail;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const view = trialView();
        const storage = deviceStorage();
        const underExam = document.body.dataset.examRunning === 'true';
        /* The account's synced lesson progress decides "first": any lesson
           finished before this one, on any device, means it is not. */
        const finishedBefore = Object.keys(getProgress().lessons).filter((key) => key !== finishedKey).length;
        if (!shouldNudge({ tier: currentTier(), userId: view.userId, storage, underExam, finishedBefore })) return;
        markNudgeShown(storage, view.userId!, new Date().toISOString());
        show({ feature: 'first-lesson' });
      }, NUDGE_DELAY_MS);
    };
    window.addEventListener(LESSON_FINISHED_EVENT, onFinished);
    return () => {
      off();
      window.removeEventListener(LESSON_FINISHED_EVENT, onFinished);
      window.clearTimeout(timer);
    };
  }, [show]);

  /* A page change (the client router) closes it. */
  useEffect(() => {
    if (!open) return;
    const onSwap = () => setOpen(null);
    document.addEventListener('astro:before-swap', onSwap);
    return () => document.removeEventListener('astro:before-swap', onSwap);
  }, [open]);

  /* The page behind does not scroll while it is open. */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
    };
  }, [open]);

  useModalDialog(panelRef, { open: open !== null, onEscape: close, initialFocus: primaryRef });

  if (!open) return null;

  const { request, signedOut } = open;
  const firstLesson = request.feature === 'first-lesson';
  const lead = firstLesson
    ? t('Lessons stay free. When you want to practise what you have learned, with feedback on your own work, this is what practice and guidance adds.')
    : t(UPGRADE_REASON[request.feature as Exclude<UpgradeRequest['feature'], 'first-lesson'>]);
  const heading = firstLesson ? t('You finished your first lesson') : t('Add practice and guidance');
  const plan = pitchPlan();
  const href = signedOut ? signUpHref('/plans') : withBase('/plans');

  return (
    <div className="trial-ui upgrade-layer" data-upgrade-dialog={request.feature}>
      <div className="upgrade-backdrop" aria-hidden="true" onClick={close} />
      <div
        ref={panelRef}
        className="upgrade-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        aria-describedby="upgrade-lead"
        tabIndex={-1}
      >
        <button type="button" className="upgrade-close" onClick={close} aria-label={t('Close')}>
          <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
        <span className="upgrade-eyebrow">{t('Practice and guidance')}</span>
        <h2 id="upgrade-title">{heading}</h2>
        <p id="upgrade-lead" className="upgrade-lead">
          {lead}
        </p>
        <ul className="upgrade-list">
          {upgradePitch().map((line) => (
            <li key={line.text}>
              <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 8.5l3 3 6-7" />
              </svg>
              <span>{t(line.text, line.vars)}</span>
            </li>
          ))}
        </ul>
        <p className="upgrade-price">
          {t(PITCH_PRICE_LINE, { price: pitchPrice(plan.amount, locale), days: plan.days })}
        </p>
        <div className="upgrade-actions">
          <a ref={primaryRef} className="trial-btn trial-primary" href={href} data-upgrade-primary>
            {t('Get practice and guidance')}
          </a>
          <button type="button" className="trial-btn upgrade-secondary" onClick={close} data-upgrade-dismiss>
            {t('Keep reading lessons')}
          </button>
        </div>
        {signedOut && <p className="upgrade-fine">{t('Create a free account first: every lesson is free with an account.')}</p>}
      </div>
    </div>
  );
}
