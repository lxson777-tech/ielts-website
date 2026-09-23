/* /dashboard. Reads top to bottom as: a quiet greeting with the streak on
   the same line, the day's ONE session as the hero (src/components/learning/
   today/TodaySession.tsx, mounted through PlanToday.tsx), a quiet context
   column, and a compact five-skill progress row.

   Since 2026-09-22 this page no longer runs three competing "what's next"
   engines at once. The old "Your course" card (its own courseStatus() call)
   and the old "Weakest area" card (its own weakest-type scan) both named an
   activity that could disagree with the session Today was already showing,
   which was the audit's first reproduced finding. Today is now the only
   primary action on this page; the sidebar shows quiet context instead:
   the goal, focus areas by paper in words (never a second band guess) and
   the vocabulary shelf, none of which claim to be "what's next". */

import { useEffect, useMemo, useRef, useState } from 'react';
import { SKILLS } from '../data/lessons';
import { withBase } from '../lib/url';
import { getProgress, onProgressChange, type ProgressV1 } from '../lib/progress';
import { buildCourse } from '../lib/course';
import { loadOrCreateStudyPlan } from '../lib/plan/schedule';
import { onStudyPlanChange } from '../lib/study-plan';
import { CARD_SET, getVocabSummary, type VocabSummary } from '../lib/vocab-review';
import { VOCABULARY_PARTS } from '../data/vocabulary';
import { getStreak, getTodayGoalProgress } from '../lib/plan/streak';
import {
  ensureLearningWired,
  getCurrentSession,
  onLearnerRecordChange,
  onPersonalPlanChange,
  readPersonalPlan,
  type SharedSessionView,
} from '../lib/learning';
import { sessionMinutesSettled } from '../lib/learning/adapters';
import {
  FOCUS_CERTAINTY_LABEL,
  PAPER_LABEL,
  dailyMinutesGoal,
  focusAreas,
  type FocusAreaCertainty,
} from './learning/today/todayViewModel';
import PlanToday from './plan/PlanToday';
import { useT } from '../lib/i18n/react';
import '../styles/learning-today.css';

const ALL_PAPERS = ['reading', 'listening', 'writing', 'speaking'] as const;

ensureLearningWired();

/** Counts a number up from zero the first time it lands, then tracks it
    exactly. The streak is the one figure on this page worth a beat of
    attention, and a number that climbs reads as earned rather than
    printed. Skipped entirely under reduced motion. */
function useCountUp(target: number, duration = 600): number {
  const [shown, setShown] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || target <= 0) {
      setShown(target);
      return;
    }
    started.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(target);
      return;
    }
    const from = performance.now();
    let frame = requestAnimationFrame(function tick(now: number) {
      const t = Math.min((now - from) / duration, 1);
      setShown(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return shown;
}

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning.';
  if (hour < 18) return 'Good afternoon.';
  return 'Good evening.';
}

export default function LearningDashboard() {
  const { t, tn } = useT();
  const MODULES = useMemo(() => buildCourse(), []);
  const course = useMemo(() => MODULES.flatMap((module) => module.lessons), [MODULES]);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  /* Null while nothing has been read yet, and null again when the only plan
     we have is the one the app fabricated on first visit. A guessed band
     shown as "Your goal" reads as a commitment the student never made. */
  const [targetBand, setTargetBand] = useState<string | null>(null);
  const [targetIsGuess, setTargetIsGuess] = useState(false);
  const [vocab, setVocab] = useState<VocabSummary | null>(null);
  const [streak, setStreak] = useState(0);
  const [goal, setGoal] = useState<{ minutes: number; goal: number | null } | null>(null);
  const [focus, setFocus] = useState<FocusAreaCertainty[]>([]);
  const [hour, setHour] = useState<number | null>(null);

  // Everything is read after mount: the stores are localStorage-backed, so
  // the server render and the first client render must agree on "nothing
  // yet" or hydration mismatches. A plan always exists from the first visit
  // (loadOrCreateStudyPlan fabricates and persists a default one), so the
  // dashboard never has to fall back to a stripped-down "brand new" view.
  useEffect(() => {
    const read = () => {
      const plan = loadOrCreateStudyPlan();
      setProgress(getProgress());
      setTargetBand(plan.targetBand);
      setTargetIsGuess(Boolean(plan.defaulted));
      setVocab(getVocabSummary());
      setStreak(getStreak(plan));
      try {
        // The one shared session, not the old SavedPlan: its
        // regularDailyMinutesStatus is what tells the real "never
        // confirmed a daily time" case apart from a real 25 or 60, and
        // its budgetMinutes is already today's shorter figure on a
        // temporary short day (item 5, Today polish round). Reading it
        // here also ensures the plan exists before readPersonalPlan below.
        const session: SharedSessionView | null = getCurrentSession();
        const target = dailyMinutesGoal(session?.regularDailyMinutesStatus, session?.budgetMinutes ?? 0);
        /* The steps of today's session that are already finished are a real
           record of the day, and the old activity log does not know about
           them: a lesson marked studied used to leave this chip on
           "0 / 60 min today" over work the plan had ticked off. See
           sessionMinutesSettled. */
        setGoal(getTodayGoalProgress(target, new Date(), sessionMinutesSettled(session)));
        const personalPlan = readPersonalPlan();
        /* The shared session carries each paper's real certainty (one policy
           pass, done once in src/lib/learning); `diagnosticsOutstanding` is
           the fallback for a session built without one, and it can only
           ever tell unknown from known. */
        setFocus(focusAreas(ALL_PAPERS, personalPlan?.diagnosticsOutstanding ?? [], session?.certaintyByPaper));
      } catch {
        setGoal(getTodayGoalProgress(null));
        setFocus([]);
      }
    };
    setHour(new Date().getHours());
    read();
    // Both stores, not just progress: saving a target band updates "Your
    // goal" and the day's session immediately, without a reload.
    const offProgress = onProgressChange(read);
    const offPlan = onStudyPlanChange(read);
    const offRecord = onLearnerRecordChange(read);
    const offPersonalPlan = onPersonalPlanChange(read);
    return () => {
      offProgress();
      offPlan();
      offRecord();
      offPersonalPlan();
    };
  }, []);

  // Reviewing words happens on other pages; refresh on return so the
  // vocabulary card does not show a stale count.
  useEffect(() => {
    const refresh = () => {
      setVocab(getVocabSummary());
      setProgress(getProgress());
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const vocabDue = vocab?.due ?? 0;
  const shownStreak = useCountUp(streak);

  return (
    <div className="dash">
      <div className="dash-welcome"><h1 className="dash-greeting">
        {hour === null ? t('Welcome back.') : t(greeting(hour))}<span className="dash-welcome-sub">{t('A little practice. A step closer.')}</span>
      </h1>
        <div className="dash-daily-status">
          <span className="dash-streak"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M13 3c1 5-5 6-3 10 1-1 2-2 2-4 4 3 6 5 6 8a6 6 0 0 1-12 0c0-4 2-7 7-14Z"/></svg>{tn(shownStreak, { one: '{n} day streak', other: '{n} day streak' })}</span>
          {/* No minutes target at all while the daily time has never been
              confirmed (goal.goal is null): a brand-new student has not
              chosen one yet, and "0 / 25 min today" showed a number nobody
              picked. Once confirmed this is the student's own regular
              minutes, or today's shorter figure on a temporary short day
              (see streak.ts's getTodayGoalProgress and item 5's report). */}
          {goal && goal.goal !== null && (
            <span>{t('{minutes} / {goal} min today', { minutes: goal.minutes, goal: goal.goal })}</span>
          )}
        </div>
      </div>

      <div className="dash-workspace">
      <PlanToday />

      <aside className="dash-side" aria-label={t('Your study overview')}>
      <div className="dash-target"><span>{t('Your goal')}</span><strong>{targetBand && !targetIsGuess ? t('Band {band}', { band: targetBand }) : t('Not set yet')}</strong><a href={withBase('/start')}>{targetIsGuess ? t('Set your target band') : t('Adjust your study plan')} <span aria-hidden="true">↗</span></a></div>

      <div className="dash-focus" aria-label={t('Focus areas')}>
        <span className="dash-card-label">{t('Focus areas')}</span>
        <ul className="dash-focus-list">
          {focus.map((area) => (
            <li key={area.paper} className="dash-focus-item">
              <span className="dash-focus-paper">{t(PAPER_LABEL[area.paper])}</span>
              {/* The paper's real certainty, as one WORD, in the same
                  vocabulary /report uses (FOCUS_CERTAINTY_LABEL is the
                  report's own map, re-exported, so the two pages cannot
                  drift). It used to read "Has evidence recorded" for every
                  paper that was not outstanding, which is four identical
                  lines saying nothing. Never a number or a percentage, and
                  unknown reads as unknown rather than as a zero. */}
              <span className={`dash-focus-certainty is-${area.certainty}`}>
                {t(FOCUS_CERTAINTY_LABEL[area.certainty])}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="dash-cards">
        <a className="dash-card" href={withBase('/review')}>
          <span className="dash-card-label">{t('Vocabulary')}</span>
          {/* Item 8: this headline is the LIBRARY's own size (36 topics,
              CARD_SET.length words), a build-time constant that is the
              same for every student and never needs `vocab` state to have
              loaded, so it can never flash "0 words" while that state is
              still null. It used to read vocab?.total, which is the exact
              same constant once loaded (getVocabSummary returns
              CARD_SET.length as `total`), so this changes nothing once
              settled, only the brief null-state flicker before it did.
              A student's own progress (how many of those words they have
              actually started reviewing) is the separate line below,
              distinct on purpose from the library's fixed size. */}
          <strong className="dash-card-title">
            {tn(VOCABULARY_PARTS.length, { one: '{n} topic', other: '{n} topics' })}, {tn(CARD_SET.length, { one: '{n} word', other: '{n} words' })}
          </strong>
          {vocab && vocab.learned > 0 && (
            <span className="dash-card-due">
              {tn(vocab.learned, { one: '{n} reviewed so far', other: '{n} reviewed so far' })}
            </span>
          )}
          {vocabDue > 0 && <span className="dash-card-due">{tn(vocabDue, { one: '{n} word ready to practise', other: '{n} words ready to practise' })}</span>}
          <span className="dash-card-meta">{t('Browse topics')}</span>
        </a>
      </div>

      </aside></div>

      <section className="dash-skills" aria-labelledby="dash-skills-heading">
        <h2 id="dash-skills-heading" className="dash-skills-heading">
          {t('Your learning library')}
        </h2>
        <div className="dash-skills-row" data-stagger>
          {SKILLS.map((skill) => {
            const total = course.filter((lesson) => lesson.skill === skill.id).length;
            const finished = course.filter(
              (lesson) => lesson.skill === skill.id && progress?.lessons[lesson.key],
            ).length;
            const percent = total ? Math.round((finished / total) * 100) : 0;
            const skillLabel = t(skill.label);
            return (
              <a
                key={skill.id}
                className={`dash-skill skill-${skill.id}`}
                href={withBase(`/learn?skill=${skill.id}`)}
                aria-label={t('{skill}, {done} of {total} lessons complete', { skill: skillLabel, done: finished, total })}
              >
                <span className="dash-skill-name">{skillLabel}<span aria-hidden="true">↗</span></span>
                <span className="dash-skill-track">
                  <span className="dash-skill-fill bar-fill" style={{ width: `${percent}%` }} />
                </span>
                <span className="dash-skill-count">
                  {t('{done} / {total} lessons', { done: finished, total })}
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
