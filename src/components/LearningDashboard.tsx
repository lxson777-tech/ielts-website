import { useEffect, useMemo, useState } from 'react';
import { SKILLS } from '../data/lessons';
import { withBase } from '../lib/url';
import { getProgress, onProgressChange, type ProgressV1 } from '../lib/progress';
import { loadStudyPlan, daysUntilTest } from '../lib/study-plan';
import { buildCourse } from '../lib/course';
import { getVocabSummary, type VocabSummary } from '../lib/vocab-review';
import PlanToday from './plan/PlanToday';
import StreakBar from './plan/StreakBar';

export default function LearningDashboard() {
  const course = useMemo(() => buildCourse().flatMap((module) => module.lessons), []);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [daysToGo, setDaysToGo] = useState<number | null>(null);
  // Vocabulary summary lives in its own localStorage store (src/lib/vocab-
  // review.ts), so it's read separately from progress. Only set after
  // mount, same as everything else above, so the server-rendered and first
  // client render both show the same "loading" defaults and hydration
  // never mismatches.
  const [vocab, setVocab] = useState<VocabSummary | null>(null);
  useEffect(() => {
    setProgress(getProgress());
    const savedPlan = loadStudyPlan();
    const homepageBand = window.localStorage.getItem('ielts.ez.targetBand');
    setTarget(savedPlan?.targetBand ?? homepageBand ?? null);
    setDaysToGo(savedPlan?.testDate ? daysUntilTest(savedPlan.testDate) : null);
    setVocab(getVocabSummary());
    return onProgressChange(() => setProgress(getProgress()));
  }, []);

  // Reviewing vocabulary happens on a different page (/review); refresh on
  // return so the card doesn't keep showing a stale "due" count.
  useEffect(() => {
    const refresh = () => setVocab(getVocabSummary());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  const done = progress ? course.filter((lesson) => progress.lessons[lesson.key]).length : 0;
  const next = useMemo(() => course.find((lesson) => !progress?.lessons[lesson.key]) ?? course[0]!, [course, progress]);
  const tests = progress ? Object.values(progress.tests).reduce((sum, attempts) => sum + attempts.length, 0) : 0;
  const writing = progress ? Object.values(progress.writing).reduce((sum, attempts) => sum + attempts.length, 0) : 0;
  const speaking = progress?.speaking.length ?? 0;
  const vocabDue = vocab?.due ?? 0;
  const vocabNew = vocab?.newToday ?? 0;

  return (
    <div className="dashboard-space">
      <div className="dashboard-welcome">
        <div>
          <p className="platform-eyebrow">Your study space</p>
          <h1 className="dashboard-title">Keep your IELTS plan moving.</h1>
          <p className="dashboard-subtitle">Short lessons, focused practice, and a clear next step whenever you return.</p>
        </div>
        <a className="coral-button" href={withBase(next.href)}>Continue learning <span aria-hidden="true">→</span></a>
      </div>

      <PlanToday />
      <StreakBar />

      <section className="dashboard-next" aria-labelledby="next-heading">
        <div className="dashboard-next-copy">
          <span className="dashboard-kicker">Next lesson</span>
          <h2 id="next-heading">{next.title}</h2>
          <p>{next.skillLabel} lesson {next.position} of {course.length}, designed to move you one clear step closer to your target.</p>
          <a className="text-link" href={withBase(next.href)}>{done ? 'Continue this lesson' : 'Start your first lesson'} <span aria-hidden="true">→</span></a>
        </div>
        <div className="dashboard-target"><span>Target band</span><strong>{target ? target : 'Set yours'}</strong>{daysToGo !== null && <small>{daysToGo} day{daysToGo === 1 ? '' : 's'} to go</small>}<a href={withBase('/start')}>{target ? 'Change plan' : 'Create a plan'} <span aria-hidden="true">↗</span></a></div>
      </section>

      <section aria-labelledby="progress-heading">
        <div className="dashboard-section-heading"><div><p className="platform-eyebrow">Progress</p><h2 id="progress-heading">Your preparation at a glance</h2></div><a className="text-link" href={withBase('/account')}>View full history <span aria-hidden="true">→</span></a></div>
        <div className="dashboard-stat-grid">
          <div className="dashboard-stat dashboard-stat-primary"><span>Lessons complete</span><strong>{done}</strong><small>of {course.length} in your course</small></div>
          <div className="dashboard-stat"><span>Practice tests</span><strong>{tests}</strong><small>reading and listening attempts</small></div>
          <div className="dashboard-stat"><span>Writing attempts</span><strong>{writing}</strong><small>essays sent for feedback</small></div>
          <div className="dashboard-stat"><span>Speaking attempts</span><strong>{speaking}</strong><small>recorded sessions</small></div>
        </div>
      </section>

      <section aria-labelledby="vocab-heading" className="dashboard-vocab-section">
        <div className="dashboard-vocab">
          <div className="dashboard-vocab-copy">
            <p className="platform-eyebrow">Vocabulary</p>
            <h2 id="vocab-heading">
              {vocabDue > 0
                ? `${vocabDue} word${vocabDue === 1 ? '' : 's'} due today`
                : `All caught up, ${vocabNew} new word${vocabNew === 1 ? '' : 's'} ready`}
            </h2>
            <span>Spaced flashcards for every topic word in your course.</span>
          </div>
          <a className="coral-button" href={withBase('/review')}>
            Review <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="dashboard-library-row">
          <a href={withBase('/writing/models')}>Model answers <span aria-hidden="true">→</span></a>
          <a href={withBase('/speaking/cue-cards')}>Cue-card bank <span aria-hidden="true">→</span></a>
          <a href={withBase('/learn')}>Lessons <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <section aria-labelledby="skills-heading">
        <div className="dashboard-section-heading"><div><p className="platform-eyebrow">Build range</p><h2 id="skills-heading">All five skills</h2></div><a className="text-link" href={withBase('/learn')}>Browse lessons <span aria-hidden="true">→</span></a></div>
        <div className="dashboard-skill-grid">
          {SKILLS.map((skill) => { const count = course.filter((lesson) => lesson.skill === skill.id).length; const finished = course.filter((lesson) => lesson.skill === skill.id && progress?.lessons[lesson.key]).length; return <a key={skill.id} className={`dashboard-skill dashboard-skill-${skill.id}`} href={withBase(`/learn?skill=${skill.id}`)}><span className="dashboard-skill-mark" aria-hidden="true" /> <span><strong>{skill.label}</strong><small>{finished} of {count} lessons complete</small></span><span className="dashboard-arrow" aria-hidden="true">→</span></a>; })}
        </div>
      </section>
    </div>
  );
}
