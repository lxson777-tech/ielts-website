/* /dashboard. Reads top to bottom as: a quiet greeting with the streak on
   the same line, the day's plan as the hero, one row of three cards worth
   acting on, and a compact five-skill progress row. Everything that used to
   be a second copy of the same number (stat tiles, a separate streak strip,
   a "next lesson" hero duplicating the plan) is gone, and the library links
   moved into the header's avatar menu. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { SKILLS } from '../data/lessons';
import { withBase } from '../lib/url';
import { getProgress, getTypeStats, onProgressChange, type ProgressV1 } from '../lib/progress';
import { buildCourse, courseStatus } from '../lib/course';
import { loadOrCreateStudyPlan } from '../lib/plan/schedule';
import { onStudyPlanChange } from '../lib/study-plan';
import { getVocabSummary, type VocabSummary } from '../lib/vocab-review';
import { VOCABULARY_PARTS } from '../data/vocabulary';
import { getStreak, getTodayGoalProgress } from '../lib/plan/streak';
import { LABELS, practiseHref } from './TypeAnalytics';
import PlanToday from './plan/PlanToday';
import MrEzWelcome from './tutor/MrEzWelcome';

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
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** The question type the student gets wrong most often, across both scored
    skills. Needs a few questions of evidence before it is worth naming. */
function weakestType(): { label: string; href: string; percent: number } | null {
  let worst: { type: string; skill: 'reading' | 'listening'; percent: number } | null = null;
  for (const skill of ['reading', 'listening'] as const) {
    for (const stat of getTypeStats(skill)) {
      if (stat.total < 4) continue;
      const percent = Math.round((stat.correct / stat.total) * 100);
      if (!worst || percent < worst.percent) worst = { type: stat.type, skill, percent };
    }
  }
  if (!worst) return null;
  return {
    label: LABELS[worst.type] ?? worst.type,
    href: practiseHref(worst.skill, worst.type as never),
    percent: worst.percent,
  };
}

export default function LearningDashboard() {
  const MODULES = useMemo(() => buildCourse(), []);
  const course = useMemo(() => MODULES.flatMap((module) => module.lessons), [MODULES]);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  /* Null while nothing has been read yet, and null again when the only plan
     we have is the one the app fabricated on first visit. A guessed band
     shown as "Your goal" reads as a commitment the student never made, and
     it directly contradicts Mr EZ asking them for one three inches above. */
  const [targetBand, setTargetBand] = useState<string | null>(null);
  const [targetIsGuess, setTargetIsGuess] = useState(false);
  const [vocab, setVocab] = useState<VocabSummary | null>(null);
  const [streak, setStreak] = useState(0);
  const [goal, setGoal] = useState<{ minutes: number; goal: number } | null>(null);
  const [weak, setWeak] = useState<ReturnType<typeof weakestType>>(null);
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
      setGoal(getTodayGoalProgress(plan));
      setWeak(weakestType());
    };
    setHour(new Date().getHours());
    read();
    // Both stores, not just progress: saving a target band from Mr EZ's
    // welcome must update "Your goal" and the day's plan immediately, without
    // a reload.
    const offProgress = onProgressChange(read);
    const offPlan = onStudyPlanChange(read);
    return () => {
      offProgress();
      offPlan();
    };
  }, []);

  // Reviewing words and taking drills happen on other pages; refresh on
  // return so the cards do not show a stale count.
  useEffect(() => {
    const refresh = () => {
      setVocab(getVocabSummary());
      setProgress(getProgress());
      setWeak(weakestType());
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  // The single source of truth for "what's next": the same courseStatus()
  // call Course.tsx uses for its own Continue button, so the two can never
  // disagree on which lesson comes next.
  const status = useMemo(() => (progress ? courseStatus(MODULES, progress) : null), [MODULES, progress]);
  const vocabDue = vocab?.due ?? 0;
  const shownStreak = useCountUp(streak);

  return (
    <div className="dash">
      <div className="dash-welcome"><h1 className="dash-greeting">
        {hour === null ? 'Welcome back.' : `${greeting(hour)}.`}<span className="dash-welcome-sub">A little practice. A step closer.</span>
      </h1>
        <div className="dash-daily-status">
          <span className="dash-streak"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M13 3c1 5-5 6-3 10 1-1 2-2 2-4 4 3 6 5 6 8a6 6 0 0 1-12 0c0-4 2-7 7-14Z"/></svg>{shownStreak} day streak</span>
          {goal && <span>{goal.minutes} / {goal.goal} min today</span>}
        </div>
      </div>

      <MrEzWelcome />

      <div className="dash-workspace">
      <PlanToday />

      <aside className="dash-side" aria-label="Your study overview">
      <div className="dash-target"><span>Your goal</span><strong>{targetBand && !targetIsGuess ? `Band ${targetBand}` : 'Not set yet'}</strong><a href={withBase('/start')}>{targetIsGuess ? 'Set your target band' : 'Adjust your study plan'} <span aria-hidden="true">↗</span></a></div>
      <div className="dash-cards">
        {status?.next ? (
          <a className="dash-card" href={withBase(status.next.href)}>
            <span className="dash-card-label">Your course</span>
            <strong className="dash-card-title">{status.doneLessons} of {status.totalLessons} lessons complete</strong>
            <span className="dash-card-meta">
              Next in course: {status.next.title}
            </span>
          </a>
        ) : (
          <a className="dash-card" href={withBase('/start')}>
            <span className="dash-card-label">Your course</span>
            <strong className="dash-card-title">Course complete</strong>
            <span className="dash-card-meta">
              {status ? `${status.doneLessons} of ${status.totalLessons} lessons done` : ''}
            </span>
          </a>
        )}

        <a className="dash-card" href={weak ? weak.href : withBase('/tests')}>
          <span className="dash-card-label">Weakest area</span>
          <strong className="dash-card-title">{weak ? weak.label : 'Find your starting point'}</strong>
          <span className="dash-card-meta">
            {weak ? `${weak.percent}% correct, practise this type` : 'Take a test and we will find it'}
          </span>
        </a>

        <a className="dash-card" href={withBase('/review')}>
          <span className="dash-card-label">Vocabulary</span>
          <strong className="dash-card-title">
            {VOCABULARY_PARTS.length} topics, {vocab?.total ?? 0} words
          </strong>
          {vocabDue > 0 && <span className="dash-card-due">{vocabDue} due for flashcard practice</span>}
          <span className="dash-card-meta">Browse topics</span>
        </a>
      </div>

      </aside></div>

      <section className="dash-skills" aria-labelledby="dash-skills-heading">
        <h2 id="dash-skills-heading" className="dash-skills-heading">
          Your learning library
        </h2>
        <div className="dash-skills-row" data-stagger>
          {SKILLS.map((skill) => {
            const total = course.filter((lesson) => lesson.skill === skill.id).length;
            const finished = course.filter(
              (lesson) => lesson.skill === skill.id && progress?.lessons[lesson.key],
            ).length;
            const percent = total ? Math.round((finished / total) * 100) : 0;
            return (
              <a
                key={skill.id}
                className={`dash-skill skill-${skill.id}`}
                href={withBase(`/learn?skill=${skill.id}`)}
                aria-label={`${skill.label}, ${finished} of ${total} lessons complete`}
              >
                <span className="dash-skill-name">{skill.label}<span aria-hidden="true">↗</span></span>
                <span className="dash-skill-track">
                  <span className="dash-skill-fill bar-fill" style={{ width: `${percent}%` }} />
                </span>
                <span className="dash-skill-count">
                  {finished} / {total} lessons
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
