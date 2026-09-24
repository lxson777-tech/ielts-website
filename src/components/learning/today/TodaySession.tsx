/* Today: ONE session block. Replaces the old separate "Your next step" card,
   the separate Mr EZ welcome card and the competing "Your course" /
   "Weakest area" cards on /dashboard (architecture section 7, WP8).

   Reads `getCurrentSession()` and nothing else decides what is next. This
   component never calls replan, never recomputes a session of its own, and
   never reacts to a route change or a late AI reply by picking something
   different. See src/lib/learning/index.ts's header for why that rule
   exists and what the five things are that may legitimately move the plan.

   Renders one of four screens (src/components/learning/today/
   todayViewModel.ts, selectTodayScreen): intake, date-passed, finished, or
   the ordinary four-question session card. A storage problem is shown as a
   small honest banner on top of whichever screen is showing, because "this
   is not saving on this device" is true regardless of what the plan says. */

import { useEffect, useRef, useState } from 'react';
import { withBase } from '../../../lib/url';
import { useT } from '../../../lib/i18n/react';
import { onAuthChange } from '../../../lib/auth/session';
import AnonymousWorkClaim from '../AnonymousWorkClaim';
import {
  acceptLongerCommitment,
  chooseLessTimeToday,
  chooseOtherSkill,
  deferDiagnostic,
  ensureLearningWired,
  markStepStarted,
  onLearnerRecordChange,
  onPersonalPlanChange,
  getCurrentSession,
  readPersonalPlan,
  type SharedSessionView,
  type SharedStepView,
} from '../../../lib/learning';
import { planStoreStatus, learnerStoreStatus } from '../../../lib/learning/store.browser';
import type { PersonalPlanV1 } from '../../../lib/learning/contracts/plan';
import type { Paper } from '../../../lib/learning/contracts/catalog';
import Intake from '../../plan/Intake';
import MrEzVoice from '../../tutor/MrEzWelcome';
import NextStepProposal from '../../tutor/NextStepProposal';
import {
  PAPER_LABEL,
  SHORT_DAY_MINUTES,
  STEP_ROLE_LABEL,
  daysUntil,
  humaniseSubskill,
  isSessionFinished,
  mainAction,
  selectTodayScreen,
  sessionKicker,
  stepForeignPaper,
  stepPurposeAddsSomething,
  stepStatus,
  stepTitleFor,
  whyThisView,
} from './todayViewModel';
import ScopeNote from '../ScopeNote';
import { clearIntakeDeferral, isDeferralActive, readIntakeDeferral, writeIntakeDeferral } from './intakeDeferral';
import '../../../styles/learning-today.css';

ensureLearningWired();

const ALL_PAPERS: readonly Paper[] = ['reading', 'listening', 'writing', 'speaking'];

export default function TodaySession() {
  const { t } = useT();
  const [session, setSession] = useState<SharedSessionView | null>(null);
  const [plan, setPlan] = useState<PersonalPlanV1 | null>(null);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  /** True while a deferral (this visit's or a recent one, read from
      storage) is currently covering the intake. Recomputed from storage on
      every refresh, so it is never out of sync with what was last written
      here or on another tab. */
  const [intakeDeferred, setIntakeDeferred] = useState(false);
  /** Sticky once the intake is first shown: only ever set back to false by
      the intake's own onDone/onDefer. See todayViewModel.ts's
      TodayScreenInput.intakeInProgress for why this exists: without it,
      the save inside the intake confirms the plan and unmounts the intake
      before its own "plan saved" screen can paint. */
  const [intakeInProgress, setIntakeInProgress] = useState(false);
  const [storageProblem, setStorageProblem] = useState<string | null>(null);
  /** Bumped once the learner store's owner has actually become this signed-in
      student (see the owner check inside refresh() below), the one moment
      the device can honestly be asked what work was done here before they
      signed in (same contract as AccountMenu.tsx's own claimToken, which
      still serves any page that renders Nav.astro). Today is the one surface
      every signed-in student reaches within one page load of signing in, on
      every app route, so mounting the offer here (rather than only in the
      workspace menu) is what makes it reachable at all: see
      src/components/AnonymousWorkClaim's header and the 22 September 2026
      finding that the old mount (AccountMenu, under Nav.astro) is dead code
      once every route uses the workspace shell instead. Zero means nobody is
      signed in, and nothing is offered. */
  const [claimToken, setClaimToken] = useState(0);
  /** Whether the last `refresh()` saw the learner store's owner as a signed-in
      user, so the bump above only fires on a real anonymous-to-user
      transition rather than once per refresh while already signed in. */
  const claimEligibleRef = useRef(false);
  /** Read by `refresh()`, which is defined once and called from several
      effects and handlers; a ref avoids every one of those needing to
      depend on `userId` (same pattern as MrEzWelcome.tsx's sessionRef). */
  const userIdRef = useRef<string | null>(null);

  const refresh = () => {
    let view: SharedSessionView | null = null;
    try {
      view = getCurrentSession();
      setSession(view);
      setPlan(readPersonalPlan());
    } catch {
      // A plan that cannot be built must not take the page down with it.
      setSession(null);
      setPlan(null);
    }
    if (view) {
      const deferredSince = readIntakeDeferral(userIdRef.current);
      const persistedDeferred = isDeferralActive(deferredSince, view.date);
      setIntakeDeferred(persistedDeferred);
      // Monotonic: only ever turns true here. Turning it false again is
      // the intake's own job (handleIntakeDone / handleIntakeDefer below),
      // never a side effect of the plan becoming confirmed mid-render.
      const localView = view;
      setIntakeInProgress((prev) => prev || (!localView.confirmed && !persistedDeferred));
    }
    const planStatus = planStoreStatus();
    const learnerStatus = learnerStoreStatus();
    // The claim is safe to ask about once the learner store's OWN owner has
    // actually become this signed-in student, not merely once sign-in has
    // started. That switch is driven by src/lib/auth/sync.ts's
    // startSyncForUser, called once, by WorkspaceMenu.tsx (or AccountMenu.tsx
    // on a page that still renders Nav.astro); a second, independent call
    // from here would race it (two concurrent pull/merge/push cycles for the
    // same student). onLearnerRecordChange below already fires the moment
    // that switch happens (learner store's setOwner() always notifies), so
    // reacting to the owner read here, rather than starting sync a second
    // time, gets the same guarantee for free.
    const signedInOwner = learnerStatus.owner.kind === 'user';
    if (signedInOwner && !claimEligibleRef.current) {
      claimEligibleRef.current = true;
      setClaimToken((n) => n + 1);
    } else if (!signedInOwner && claimEligibleRef.current) {
      claimEligibleRef.current = false;
      setClaimToken(0);
    }
    const problem = planStatus.problem ?? learnerStatus.problem ?? null;
    setStorageProblem(
      problem === 'quota'
        ? t('Your device storage is full, so today is not being saved here. Free up some space or sign in to keep it safe.')
        : problem === 'blocked'
          ? t('This browser is blocking local storage, so today is not being saved on this device. Private browsing does this.')
          : problem === 'unavailable'
            ? t('Nothing can be saved on this device right now.')
            : null,
    );
    setReady(true);
  };

  useEffect(() => {
    refresh();
    const offRecord = onLearnerRecordChange(refresh);
    const offPlan = onPersonalPlanChange(refresh);
    const offAuth = onAuthChange((user) => {
      setSignedIn(Boolean(user));
      userIdRef.current = user?.id ?? null;
      refresh(); // the deferral record is per owner; re-read it once auth resolves,
      // and it is refresh() above (via learnerStoreStatus().owner) that decides
      // whether the claim is eligible, not this callback firing.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      offRecord();
      offPlan();
      offAuth();
    };
  }, []);

  // Returning from a lesson, a drill or a test is a normal back-navigation
  // and may be served from the bfcache without remounting: re-read on focus
  // so the step list and the button reflect what was just finished.
  useEffect(() => {
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null; // avoid a hydration flash; a plan always builds once ready

  if (!session) {
    return (
      <section className="today today-broken" aria-live="polite">
        <p>{t('Today could not be worked out on this device right now. Reloading the page usually fixes this.')}</p>
      </section>
    );
  }

  const screen = selectTodayScreen({
    confirmed: session.confirmed,
    planStatus: session.planStatus,
    finished: isSessionFinished(session),
    intakeDeferred,
    intakeInProgress,
  });

  function finishIntake() {
    setIntakeInProgress(false);
  }

  function handleIntakeDone() {
    finishIntake();
    refresh();
  }

  function handleIntakeDefer() {
    // session is non-null here: the intake only renders once it is.
    writeIntakeDeferral(userIdRef.current, session!.date);
    finishIntake();
    refresh();
  }

  function reopenIntake() {
    clearIntakeDeferral(userIdRef.current);
    finishIntake(); // cleared defensively; refresh() below re-latches it true
    refresh();
  }

  return (
    <div className="today">
      {storageProblem && (
        <p className="today-storage-note" role="status">
          {storageProblem}
        </p>
      )}

      {/* A quiet card, never a page the student has to go find: the one
          explicit question of whether work done signed out on this device
          should join this account (see AnonymousWorkClaim's own header for
          the guarantees). Renders nothing signed out, nothing once this
          device has already been decided about, and nothing for a previous
          account's work. */}
      <AnonymousWorkClaim token={claimToken} variant="card" />

      {screen === 'intake' && (
        <section className="today-card today-intake" aria-labelledby="today-heading">
          <h2 id="today-heading" className="today-intake-heading">
            {t("Let's set your goal")}
          </h2>
          <p className="today-intake-sub">
            {t('A few choices to make your plan yours.')}
          </p>
          <Intake variant="first-visit" onDone={handleIntakeDone} onDefer={handleIntakeDefer} />
        </section>
      )}

      {screen === 'date-passed' && <DatePassedCard session={session} />}

      {screen === 'finished' && <FinishedCard session={session} plan={plan} />}

      {screen === 'active' && (
        <ActiveSessionCard session={session} plan={plan} signedIn={signedIn} onRefresh={refresh} onSetGoal={reopenIntake} />
      )}
    </div>
  );
}

/* ── Exam date has passed ─────────────────────────────────────────────────── */

function DatePassedCard({ session }: { session: SharedSessionView }) {
  const { t } = useT();
  return (
    <section className="today-card today-planning" aria-labelledby="today-heading">
      <h2 id="today-heading">{t('Your exam date has passed')}</h2>
      <p>
        {t(
          'Set a new exam date or a new goal and your study session will rebuild around it. This is never a sign you are finished.',
        )}
      </p>
      <a className="today-start" href={withBase('/plan-settings')}>
        {t('Set a new date or goal')}
      </a>
      <ScopeNote note={session.scopeNote} />
    </section>
  );
}

/* ── Every step of today's session is done or skipped ────────────────────── */

function FinishedCard({ session, plan }: { session: SharedSessionView; plan: PersonalPlanV1 | null }) {
  const { t } = useT();
  const done = session.steps.filter((step) => step.state === 'done');
  const outstanding = plan?.diagnosticsOutstanding ?? [];
  return (
    <section className="today-card today-finished" aria-labelledby="today-heading">
      <h2 id="today-heading">{t('Today, done')}</h2>
      <p className="today-finished-objective">{session.objective}</p>
      {done.length > 0 && (
        <ul className="today-finished-list">
          {done.map((step) => (
            <li key={step.stepId}>{t(STEP_ROLE_LABEL[step.role])}: {step.purpose}</li>
          ))}
        </ul>
      )}
      <p className="today-finished-uncertain">
        {t(
          'This showed guided and independent work on today\'s objective. It is not a band and it is not the whole picture, one session is one data point.',
        )}
      </p>
      {outstanding.length > 0 && (
        <p className="today-finished-uncertain">
          {t('Still unknown: {papers}.', { papers: outstanding.map((p) => t(PAPER_LABEL[p])).join(', ') })}
        </p>
      )}
      <p className="today-finished-next">{t('A new session is ready tomorrow, or whenever your plan next calls for one.')}</p>
    </section>
  );
}

/* ── The ordinary four-question session ───────────────────────────────────── */

function ActiveSessionCard({
  session,
  plan,
  signedIn,
  onRefresh,
  onSetGoal,
}: {
  session: SharedSessionView;
  plan: PersonalPlanV1 | null;
  signedIn: boolean | null;
  onRefresh: () => void;
  onSetGoal: () => void;
}) {
  const { t } = useT();
  const [showWhy, setShowWhy] = useState(false);
  const [showLessTime, setShowLessTime] = useState(false);
  const [showOtherSkill, setShowOtherSkill] = useState(false);

  const action = mainAction(session.steps);
  const current = session.current;
  const longerCommitment = plan?.alternatives.find((alt) => alt.kind === 'longer-commitment') ?? null;
  const outstanding = plan?.diagnosticsOutstanding ?? [];
  const daysToExam = session.examDate ? daysUntil(session.examDate, session.date) : null;
  const kicker = sessionKicker(session.paper, session.subskill);
  /* What "Why this" shows: the evidence standing behind the choice, with
     anything the card has already said above it dropped. The objective
     headline and the reason line are passed in as "already on screen"
     because the reason line IS what Mr EZ speaks at the top of this card
     whenever the tutor is unreachable (item 11d). */
  const why = whyThisView(plan?.activeSession.evidenceRefs, [session.reason, session.objective]);

  function startClick() {
    if (current) markStepStarted(current.stepId);
  }

  function pickLessTime(minutes: 15 | 25) {
    chooseLessTimeToday(minutes);
    setShowLessTime(false);
    onRefresh();
  }

  function pickOtherSkill(paper: Paper) {
    chooseOtherSkill(paper);
    setShowOtherSkill(false);
    onRefresh();
  }

  function acceptLonger() {
    if (!longerCommitment) return;
    const activityId = longerCommitment.sessionSketch.activityIds[0];
    if (!activityId) return;
    acceptLongerCommitment(activityId, longerCommitment.sessionSketch.minutes);
    onRefresh();
  }

  function skipDiagnostic(paper: Paper) {
    deferDiagnostic(paper);
    onRefresh();
  }

  return (
    <section className="today-card today-active" aria-labelledby="today-heading">
      <header className="today-head">
        {session.examDate && daysToExam !== null && daysToExam >= 0 && (
          <p className="today-countdown">
            {t('{n} days to your exam', { n: daysToExam })}
          </p>
        )}
        {kicker && (
          <p className="today-kicker">
            {t(PAPER_LABEL[kicker.paper])}
            {', '}
            {kicker.type}
          </p>
        )}
        <h2 id="today-heading" className="today-objective">
          {session.objective}
        </h2>
      </header>

      <p className="today-budget">
        {t('About {n} minutes today.', { n: session.budgetMinutes })}
        {session.regularDailyMinutes !== session.budgetMinutes && (
          <span className="today-budget-note"> {t('Your regular day is {n} minutes.', { n: session.regularDailyMinutes })}</span>
        )}
      </p>

      {current && (
        <a className="today-start" href={withBase(current.href ?? '/dashboard')} onClick={startClick}>
          {action === 'start' ? t('Start') : t('Continue')}
        </a>
      )}

      {!session.confirmed && (
        <p className="today-provisional-note">
          {t('Your plan is provisional until you set a goal.')}{' '}
          <button type="button" className="today-link-button" onClick={onSetGoal}>
            {t('Set your goal')}
          </button>
        </p>
      )}

      <MrEzVoice session={session} signedIn={signedIn} />

      <NextStepProposal session={session} signedIn={signedIn} />

      <ScopeNote note={session.scopeNote} />

      <details className="today-agenda-details">
        <summary>{t('Today’s activities')}</summary>
      <ol className="today-steps">
        {session.steps.map((step) => (
          <StepRow
            key={step.stepId}
            step={step}
            status={stepStatus(step, current?.stepId ?? null)}
            sessionPaper={session.paper}
          />
        ))}
      </ol>
      </details>



      {longerCommitment && (
        <div className="today-longer">
          <p>{longerCommitment.label}</p>
          <button type="button" className="today-longer-accept" onClick={acceptLonger}>
            {t('Give it the time it needs ({n} min)', { n: longerCommitment.sessionSketch.minutes })}
          </button>
        </div>
      )}

      {current?.role === 'assess' && current.paper && (
        <p className="today-diagnostic-note">
          {t('This is a short first look, not a full result.')}{' '}
          <button type="button" className="today-link-button" onClick={() => skipDiagnostic(current.paper as Paper)}>
            {t('Not now')}
          </button>
        </p>
      )}

      <div className="today-secondary">
        <button type="button" className="today-secondary-toggle" aria-expanded={showWhy} onClick={() => setShowWhy((v) => !v)}>
          {t('Why this')}
        </button>
        <button
          type="button"
          className="today-secondary-toggle"
          aria-expanded={showLessTime}
          onClick={() => setShowLessTime((v) => !v)}
        >
          {t('I have less time today')}
        </button>
        <button
          type="button"
          className="today-secondary-toggle"
          aria-expanded={showOtherSkill}
          onClick={() => setShowOtherSkill((v) => !v)}
        >
          {t('Choose another skill')}
        </button>
      </div>

      {/* Never the reason line again: that sentence is already the first
          thing in this card. This disclosure is the evidence behind the
          choice, then what is still unknown. Both halves are the planner's
          and the policy's own words, never a claim composed here. */}
      {showWhy && (
        <div className="today-why">
          {why.evidence.length > 0 && (
            <>
              <p className="today-why-label">
                {why.restsOnNothingRecorded ? t('No evidence behind this yet') : t('What this rests on')}
              </p>
              <ul className="today-why-evidence">
                {why.evidence.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
          <p className="today-why-label">{t('What is still unknown')}</p>
          <p className="today-why-uncertain">
            {outstanding.length > 0
              ? t('Not yet assessed: {papers}.', { papers: outstanding.map((p) => t(PAPER_LABEL[p])).join(', ') })
              : t('Every paper has at least a first look recorded.')}
          </p>
          {session.missedStudyDays > 0 && (
            <p className="today-why-uncertain">
              {t('{n} planned study days were missed recently; this session was rebuilt around that.', { n: session.missedStudyDays })}
            </p>
          )}
        </div>
      )}

      {showLessTime && (
        <div className="today-less-time">
          <p>{t('Your regular {n} minutes a day is unchanged. This only shortens today.', { n: session.regularDailyMinutes })}</p>
          <div className="today-less-time-choices">
            {SHORT_DAY_MINUTES.map((minutes) => (
              <button key={minutes} type="button" onClick={() => pickLessTime(minutes)}>
                {t('{n} min', { n: minutes })}
              </button>
            ))}
          </div>
        </div>
      )}

      {showOtherSkill && (
        <div className="today-other-skill">
          {ALL_PAPERS.filter((paper) => paper !== session.paper).map((paper) => (
            <button key={paper} type="button" onClick={() => pickOtherSkill(paper)}>
              {t(PAPER_LABEL[paper])}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** What to call a step when the catalogue has no real title for it yet
    (SharedStepView.title is null: every kind but a lesson or a lesson
    check today, see adapters.ts's catalogueStepTitle). Composed from
    fields the shared view already carries (kind, paper, subskill), so two
    different activities of the same kind and paper can still end up
    reading the same until the catalogue names them individually. This is
    a smaller version of the same gap `title` closes for lessons, reported
    to the lead rather than guessed at further here (see this package's
    report, item 2). The type half is never translated: see
    src/lib/i18n/dict/ru/parts/strategies.ts's header on why an exam
    question type's own name stays English. */
function fallbackStepTitle(t: ReturnType<typeof useT>['t'], step: SharedStepView): string {
  const paperLabel = step.paper ? t(PAPER_LABEL[step.paper]) : '';
  const type = humaniseSubskill(step.subskill, step.paper);
  switch (step.kind) {
    case 'drill':
      return paperLabel ? t('{paper} timed drill, {type}', { paper: paperLabel, type }) : t('Timed drill, {type}', { type });
    case 'full-test':
      return step.activityId === 'test:mock'
        ? t('Full mock test')
        : paperLabel
          ? t('{paper} timed test', { paper: paperLabel })
          : t('Timed test');
    case 'focused-exercise':
      return paperLabel
        ? t('{paper} focused practice, {type}', { paper: paperLabel, type })
        : t('Focused practice, {type}', { type });
    case 'graded-task':
      return paperLabel ? t('{paper} graded attempt', { paper: paperLabel }) : t('Graded attempt');
    case 'vocab-review':
      return t('Vocabulary review');
    case 'reference':
      return t('Reference, {type}', { type });
    case 'planning':
      return t('Plan settings');
    case 'lesson-check':
      return paperLabel ? t('{paper} quick check, {type}', { paper: paperLabel, type }) : t('Quick check, {type}', { type });
    default:
      return type || t('Practice');
  }
}

function StepRow({
  step,
  status,
  sessionPaper,
}: {
  step: SharedStepView;
  status: ReturnType<typeof stepStatus>;
  sessionPaper?: Paper;
}) {
  const { t } = useT();
  // step.title (when present) is a lesson title already registered with the
  // i18n system elsewhere, safe to translate; the composed fallback is
  // translated as it is built; step.purpose is the planner's own English
  // sentence and is never translated here, matching how it was already
  // shown before this change.
  const catalogueTitle = step.title ? t(step.title) : null;
  const fallback = fallbackStepTitle(t, step);
  const title = stepTitleFor({ title: catalogueTitle, purpose: step.purpose }, fallback);
  const showPurpose = stepPurposeAddsSomething(title, step.purpose);
  const foreignPaper = stepForeignPaper(step.paper, sessionPaper);
  return (
    <li className={`today-step is-${status}`}>
      <span className="today-step-marker" aria-hidden="true">
        {status === 'done' ? (
          <svg className="tick-svg" viewBox="0 0 24 24">
            <polyline points="4,12.6 9.6,18.2 20,6.4" pathLength={1} />
          </svg>
        ) : status === 'skipped' ? (
          /* A drawn line rather than a dash character: the house rule bans
             the em and en dashes this used to use, and an SVG scales with
             the marker instead of depending on a font. */
          <svg className="skip-svg" viewBox="0 0 24 24" aria-hidden="true">
            <line x1="6.5" y1="12" x2="17.5" y2="12" />
          </svg>
        ) : (
          ''
        )}
      </span>
      <span className="today-step-body">
        <span className="today-step-role">
          {t(STEP_ROLE_LABEL[step.role])}
          {foreignPaper && <span className="today-step-foreign-paper"> · {t(PAPER_LABEL[foreignPaper])}</span>}
        </span>
        <span className="today-step-title">{title}</span>
        {showPurpose && <span className="today-step-purpose">{step.purpose}</span>}
      </span>
      <span className="today-step-minutes">{t('{n} min', { n: step.minutes })}</span>
    </li>
  );
}
