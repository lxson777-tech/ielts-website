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

import { useEffect, useState } from 'react';
import { withBase } from '../../../lib/url';
import { useT } from '../../../lib/i18n/react';
import { onAuthChange } from '../../../lib/auth/session';
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
import {
  PAPER_LABEL,
  SHORT_DAY_MINUTES,
  STEP_ROLE_LABEL,
  daysUntil,
  humaniseSubskill,
  isSessionFinished,
  mainAction,
  selectTodayScreen,
  stepStatus,
} from './todayViewModel';
import '../../../styles/learning-today.css';

ensureLearningWired();

const ALL_PAPERS: readonly Paper[] = ['reading', 'listening', 'writing', 'speaking'];

export default function TodaySession() {
  const { t } = useT();
  const [session, setSession] = useState<SharedSessionView | null>(null);
  const [plan, setPlan] = useState<PersonalPlanV1 | null>(null);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [intakeDeferred, setIntakeDeferred] = useState(false);
  const [storageProblem, setStorageProblem] = useState<string | null>(null);

  const refresh = () => {
    try {
      const view = getCurrentSession();
      setSession(view);
      setPlan(readPersonalPlan());
    } catch {
      // A plan that cannot be built must not take the page down with it.
      setSession(null);
      setPlan(null);
    }
    const planStatus = planStoreStatus();
    const learnerStatus = learnerStoreStatus();
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
    const offAuth = onAuthChange((user) => setSignedIn(Boolean(user)));
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
  });

  return (
    <div className="today">
      {storageProblem && (
        <p className="today-storage-note" role="status">
          {storageProblem}
        </p>
      )}

      {screen === 'intake' && (
        <section className="today-card today-intake" aria-labelledby="today-heading">
          <h2 id="today-heading" className="today-intake-heading">
            {t("Let's set your goal")}
          </h2>
          <p className="today-intake-sub">
            {t('One short question set makes every suggestion here specific to you instead of generic.')}
          </p>
          <Intake variant="first-visit" onDone={refresh} onDefer={() => setIntakeDeferred(true)} />
        </section>
      )}

      {screen === 'date-passed' && <DatePassedCard session={session} />}

      {screen === 'finished' && <FinishedCard session={session} plan={plan} />}

      {screen === 'active' && (
        <ActiveSessionCard session={session} plan={plan} signedIn={signedIn} onRefresh={refresh} />
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
      {session.scopeNote && <p className="today-scope-note">{session.scopeNote}</p>}
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
}: {
  session: SharedSessionView;
  plan: PersonalPlanV1 | null;
  signedIn: boolean | null;
  onRefresh: () => void;
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
        <h2 id="today-heading" className="today-objective">
          {session.objective}
        </h2>
      </header>

      <MrEzVoice session={session} signedIn={signedIn} />

      {session.scopeNote && <p className="today-scope-note">{session.scopeNote}</p>}

      <p className="today-budget">
        {t('About {n} minutes today.', { n: session.budgetMinutes })}
        {session.regularDailyMinutes !== session.budgetMinutes && (
          <span className="today-budget-note"> {t('Your regular day is {n} minutes.', { n: session.regularDailyMinutes })}</span>
        )}
      </p>

      <ol className="today-steps">
        {session.steps.map((step) => (
          <StepRow key={step.stepId} step={step} status={stepStatus(step, current?.stepId ?? null)} />
        ))}
      </ol>

      {current && (
        <a className="today-start" href={withBase(current.href ?? '/dashboard')} onClick={startClick}>
          {action === 'start' ? t('Start') : t('Continue')}
        </a>
      )}

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

      {showWhy && (
        <div className="today-why">
          <p>{session.reason}</p>
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

function StepRow({ step, status }: { step: SharedStepView; status: ReturnType<typeof stepStatus> }) {
  const { t } = useT();
  return (
    <li className={`today-step is-${status}`}>
      <span className="today-step-marker" aria-hidden="true">
        {status === 'done' ? (
          <svg className="tick-svg" viewBox="0 0 24 24">
            <polyline points="4,12.6 9.6,18.2 20,6.4" pathLength={1} />
          </svg>
        ) : status === 'skipped' ? (
          '—'
        ) : (
          ''
        )}
      </span>
      <span className="today-step-body">
        <span className="today-step-role">{t(STEP_ROLE_LABEL[step.role])}</span>
        <span className="today-step-purpose">{step.purpose || humaniseSubskill(step.subskill)}</span>
      </span>
      <span className="today-step-minutes">{t('{n} min', { n: step.minutes })}</span>
    </li>
  );
}
