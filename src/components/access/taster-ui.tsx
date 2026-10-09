/* The pieces that offer a free account its free AI tries (Alex, 10 October
   2026), shared by Today, a lesson's last card, the Mr EZ panel and the
   essay and Speaking try pages. GATED BUILD ONLY: every piece reads the
   account's tier, which is 'open' on the open site, and then draws nothing.

   What is offered, and when, is decided by ../../lib/access/taster-offers.ts
   (pure, tested). This file draws it:
   - useTaster: the account's tier and the server's try counts, and whether a
     timed task is running on the page (no offer is ever drawn then);
   - TutorCounter: the small quiet "Free tries: 7 of 10 left";
   - TasterTodayCard: the three tries on a free account's Today;
   - TasterAfterCard: the short card right after a try has been used.

   The server counts every try (the database reserves it before the model is
   called). What is drawn here is only ever the last answer it gave. */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { currentRoute } from '../../lib/auth/next';
import { initialTrialView, serverNow, subscribeTrialView, trialView } from '../../lib/trial/client';
import { browserTier } from '../../lib/access/tier';
import { openUpgrade } from '../../lib/access/upgrade';
import { openMrEz } from '../../lib/access/taster-events';
import { TASTER_FEATURES, TASTER_LIMITS, tasterLeft, type TasterFeature, type TasterStatus } from '../../lib/access/taster';
import {
  TASTER_ROUTES,
  TASTER_ROW_BUTTON,
  TASTER_ROW_DETAIL,
  TASTER_ROW_TITLE,
  TUTOR_COUNTER,
  afterUseLine,
  anyTasterOffered,
  offerTaster,
  paidFeatureOfTaster,
  tasterSpent,
} from '../../lib/access/taster-offers';
import { PITCH_PRICE_LINE, pitchPlan, pitchPrice } from '../../lib/access/upgrade-pitch';
import { TRIAL_RECORDED_TOPIC } from '../../lib/trial/recorded-topic';
import { ensureAccessStyles } from './access-styles';

/** True while a timed paper or an exam-conditions essay is running on this
    page (`body[data-exam-running]`, set by the testers). */
export function useExamRunning(): boolean {
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const read = () => setRunning(document.body.dataset.examRunning === 'true');
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-exam-running'] });
    return () => observer.disconnect();
  }, []);
  return running;
}

export interface TasterView {
  tier: ReturnType<typeof browserTier>;
  taster: TasterStatus | null;
  underExam: boolean;
  /** Whether this try should be offered on this screen right now. */
  offered: (feature: TasterFeature) => boolean;
  left: (feature: TasterFeature) => number;
}

/** The account's tier and free-try counts. During hydration this is the
    build's own view (checking), so it matches the static HTML. */
export function useTaster(): TasterView {
  const view = useSyncExternalStore(subscribeTrialView, trialView, initialTrialView);
  const underExam = useExamRunning();
  const tier = browserTier(view, serverNow());
  const taster = view.status?.taster ?? null;
  return {
    tier,
    taster,
    underExam,
    offered: (feature) => offerTaster(tier, taster, feature, underExam),
    left: (feature) => tasterLeft(taster, feature),
  };
}

/** The quiet counter by Mr EZ's buttons: "Free tries: 7 of 10 left". Nothing
    unless this account has free questions left. */
export function TutorCounter({ className = '' }: { className?: string }) {
  const { t } = useT();
  const taster = useTaster();
  if (!taster.offered('tutor')) return null;
  /* Only now: the open site draws nothing here, so it gets no styles. */
  ensureAccessStyles();
  return (
    <p className={`taster-counter ${className}`.trim()} data-taster-counter="tutor" role="status">
      {t(TUTOR_COUNTER, { left: taster.left('tutor'), total: TASTER_LIMITS.tutor })}
    </p>
  );
}

/** Where a try is used: a page for the essay and Speaking checks, Mr EZ's
    own panel for the questions. */
function TasterAction({ feature, label }: { feature: TasterFeature; label: string }) {
  if (feature === 'tutor') {
    return (
      <button type="button" className="trial-btn trial-primary" onClick={() => openMrEz()} data-taster-use={feature}>
        {label}
      </button>
    );
  }
  return (
    <a className="trial-btn trial-primary" href={withBase(TASTER_ROUTES[feature])} data-taster-use={feature}>
      {label}
    </a>
  );
}

/** "Your free AI tries" on a free account's Today. Shown while any try is
    left; once every one is used the caller shows the plain pitch instead. */
export function TasterTodayCard() {
  const { t, tn, locale } = useT();
  const taster = useTaster();
  if (!anyTasterOffered(taster.tier, taster.taster, taster.underExam)) return null;
  ensureAccessStyles();
  const plan = pitchPlan();
  return (
    <aside className="trial-ui taster-card" aria-labelledby="taster-today-title" data-taster-today>
      <span className="upgrade-eyebrow">{t('Your free AI tries')}</span>
      <h2 id="taster-today-title">{t('Try the AI before you decide.')}</h2>
      <p className="taster-lead">{t('Your account includes a few free tries of the AI tutor and examiner. Every lesson stays free either way.')}</p>
      <ul className="taster-rows">
        {TASTER_FEATURES.filter((f) => TASTER_LIMITS[f] > 0).map((feature) => {
          const left = taster.left(feature);
          const spent = tasterSpent(taster.taster, feature);
          return (
            <li key={feature} className={spent ? 'is-spent' : undefined} data-taster-row={feature}>
              <span className="taster-row-text">
                <b>{t(TASTER_ROW_TITLE[feature])}</b>
                <span>{t(TASTER_ROW_DETAIL[feature])}</span>
              </span>
              {left > 0 ? (
                <span className="taster-row-action">
                  <small>{tn(left, { one: '{n} free try left', other: '{n} free tries left' })}</small>
                  <TasterAction feature={feature} label={t(TASTER_ROW_BUTTON[feature])} />
                </span>
              ) : (
                <span className="taster-row-action">
                  <small>{t('All used')}</small>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="taster-foot">
        <button type="button" className="taster-link" onClick={() => openUpgrade('plan-practice', { from: currentRoute() })} data-taster-pitch-open>
          {t('See what practice and guidance adds')}
        </button>
        <small>{t(PITCH_PRICE_LINE, { price: pitchPrice(plan.amount, locale), days: plan.days })}</small>
      </p>
    </aside>
  );
}

/** The start of the free Speaking check: what it is, one button. Once the
    try is used (here or on another device) it says so instead and gives the
    way forward. Drawn inside the Speaking tester's own start card. */
export function TasterSpeakingStart({ onStart, disabled }: { onStart: () => void; disabled?: boolean }) {
  ensureAccessStyles();
  const { t, tn } = useT();
  const taster = useTaster();
  const can = taster.offered('speaking');
  return (
    <div className="trial-ui taster-speaking-start" data-taster-speaking-start>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">{t('Your free Speaking check')}</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">{t('Answer a few questions out loud.')}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted sm:text-[0.95rem]">
        {tn(TRIAL_RECORDED_TOPIC.questions.length, {
          one: 'You will be asked {n} short question about learning something new. Record your answer with your microphone, and an AI examiner marks it on the four official IELTS Speaking criteria.',
          other:
            'You will be asked {n} short questions about learning something new. Record each answer with your microphone, and an AI examiner marks them on the four official IELTS Speaking criteria.',
        })}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {can ? (
          <button type="button" className="trial-btn trial-primary" disabled={disabled} onClick={onStart} data-taster-start="speaking">
            {t('Start my free Speaking check')}
          </button>
        ) : (
          <>
            <p className="w-full text-sm text-ink-muted">{t('You have used your free Speaking check.')}</p>
            <button
              type="button"
              className="trial-btn trial-primary"
              onClick={() => openUpgrade('speaking', { from: currentRoute(), reason: 'taster-used' })}
            >
              {t('See what practice and guidance adds')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** A quiet line under a wrong answer in a lesson's own quiz: "Not sure why?
    Ask Mr EZ (free try)". It opens his panel with the question in the
    message box and sends nothing; the student's own send spends the try. */
export function AskMrEzFree({ question, answer }: { question: string; answer: string }) {
  const { t } = useT();
  const taster = useTaster();
  if (!taster.offered('tutor')) return null;
  ensureAccessStyles();
  return (
    <p className="taster-ask" data-taster-ask>
      <button
        type="button"
        className="taster-link"
        onClick={() =>
          openMrEz({
            prompt: t('Why is the answer “{answer}”? The question was: {question}', {
              answer: answer.slice(0, 80),
              question: question.slice(0, 220),
            }),
          })
        }
      >
        {t('Not sure why? Ask Mr EZ (free try)')}
      </button>
    </p>
  );
}

/** The short card right after a free try has been used. Shown only once the
    server's own count says that kind is used up, and never on an account
    that does not get tries. */
export function TasterAfterCard({ feature }: { feature: TasterFeature }) {
  const { t, locale } = useT();
  const taster = useTaster();
  const eligible = taster.tier === 'free' || taster.tier === 'paid-ended';
  if (!eligible || !tasterSpent(taster.taster, feature) || taster.underExam) return null;
  ensureAccessStyles();
  const line = afterUseLine(feature);
  const plan = pitchPlan();
  return (
    <aside className="trial-ui taster-card taster-after" aria-live="polite" data-taster-after={feature}>
      <p className="taster-after-line">{t(line.text, line.vars)}</p>
      <p className="taster-foot">
        <button
          type="button"
          className="trial-btn trial-primary"
          onClick={() => openUpgrade(paidFeatureOfTaster(feature), { from: currentRoute() })}
          data-taster-after-open
        >
          {t('See what practice and guidance adds')}
        </button>
        <small>{t(PITCH_PRICE_LINE, { price: pitchPrice(plan.amount, locale), days: plan.days })}</small>
      </p>
    </aside>
  );
}
