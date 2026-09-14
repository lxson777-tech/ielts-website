/* /dashboard. Reads top to bottom as: a quiet greeting with the streak on
   the same line, the day's plan as the hero, one row of three cards worth
   acting on, and a compact five-skill progress row. Everything that used to
   be a second copy of the same number (stat tiles, a separate streak strip,
   a "next lesson" hero duplicating the plan) is gone, and the library links
   moved into the header's avatar menu. */

import { useEffect, useMemo, useState } from 'react';
import { SKILLS } from '../data/lessons';
import { withBase } from '../lib/url';
import { getProgress, getTypeStats, onProgressChange, type ProgressV1 } from '../lib/progress';
import { loadStudyPlan } from '../lib/study-plan';
import { buildCourse } from '../lib/course';
import { getVocabSummary, type VocabSummary } from '../lib/vocab-review';
import { getStreak, getTodayGoalProgress } from '../lib/plan/streak';
import { LABELS, practiseHref } from './TypeAnalytics';
import PlanToday from './plan/PlanToday';

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
  const course = useMemo(() => buildCourse().flatMap((module) => module.lessons), []);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [vocab, setVocab] = useState<VocabSummary | null>(null);
  const [streak, setStreak] = useState(0);
  const [goal, setGoal] = useState<{ minutes: number; goal: number } | null>(null);
  const [weak, setWeak] = useState<ReturnType<typeof weakestType>>(null);
  const [hour, setHour] = useState<number | null>(null);

  // Everything is read after mount: the stores are localStorage-backed, so
  // the server render and the first client render must agree on "nothing
  // yet" or hydration mismatches.
  useEffect(() => {
    const read = () => {
      const plan = loadStudyPlan();
      setProgress(getProgress());
      setHasPlan(Boolean(plan));
      setVocab(getVocabSummary());
      setStreak(getStreak(plan));
      setGoal(getTodayGoalProgress(plan));
      setWeak(weakestType());
    };
    setHour(new Date().getHours());
    read();
    return onProgressChange(read);
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

  const done = progress ? course.filter((lesson) => progress.lessons[lesson.key]).length : 0;
  const next = useMemo(
    () => course.find((lesson) => !progress?.lessons[lesson.key]) ?? course[0]!,
    [course, progress],
  );
  const attempts = progress
    ? Object.values(progress.tests).reduce((sum, list) => sum + list.length, 0) +
      Object.values(progress.writing).reduce((sum, list) => sum + list.length, 0) +
      progress.speaking.length
    : 0;
  const vocabDue = vocab?.due ?? 0;
  const vocabNew = vocab?.newToday ?? 0;

  const isNew = progress !== null && !hasPlan && done === 0 && attempts === 0;

  return (
    <div className="dash">
      <p className="dash-greeting">
        {hour === null ? 'Welcome back.' : `${greeting(hour)}.`}
        {!isNew && goal && (
          <span>
            {' '}
            {streak} day streak, {goal.minutes} of {goal.goal} minutes today.
          </span>
        )}
      </p>

      <PlanToday />

      {!isNew && (
        <>
          <div className="dash-cards">
            <a className="dash-card" href={withBase(next.href)}>
              <span className="dash-card-label">Continue course</span>
              <strong className="dash-card-title">{next.title}</strong>
              <span className="dash-card-meta">
                {next.skillLabel}, {done} of {course.length} lessons done
              </span>
            </a>

            <a className="dash-card" href={weak ? weak.href : withBase('/tests')}>
              <span className="dash-card-label">Weakest area</span>
              <strong className="dash-card-title">{weak ? weak.label : 'Not enough practice yet'}</strong>
              <span className="dash-card-meta">
                {weak ? `${weak.percent}% correct, practise this type` : 'Take a test and we will find it'}
              </span>
            </a>

            <a className="dash-card" href={withBase('/review')}>
              <span className="dash-card-label">Words due</span>
              <strong className="dash-card-title">
                {vocabDue > 0 ? `${vocabDue} word${vocabDue === 1 ? '' : 's'}` : 'All caught up'}
              </strong>
              <span className="dash-card-meta">
                {vocabDue > 0
                  ? 'Flashcards from your course topics'
                  : `${vocabNew} new word${vocabNew === 1 ? '' : 's'} ready when you are`}
              </span>
            </a>
          </div>

          <section className="dash-skills" aria-labelledby="dash-skills-heading">
            <h2 id="dash-skills-heading" className="dash-skills-heading">
              Skills
            </h2>
            <div className="dash-skills-row">
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
                    <span className="dash-skill-name">{skill.label}</span>
                    <span className="dash-skill-track">
                      <span className="dash-skill-fill" style={{ width: `${percent}%` }} />
                    </span>
                    <span className="dash-skill-count">
                      {finished}/{total}
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
