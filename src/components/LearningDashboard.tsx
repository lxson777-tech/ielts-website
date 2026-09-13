import { useEffect, useMemo, useState } from 'react';
import { SKILLS } from '../data/lessons';
import { withBase } from '../lib/url';
import { getProgress, onProgressChange, type ProgressV1 } from '../lib/progress';
import { loadStudyPlan } from '../lib/study-plan';
import { buildCourse } from '../lib/course';

export default function LearningDashboard() {
  const course = useMemo(() => buildCourse().flatMap((module) => module.lessons), []);
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    setProgress(getProgress());
    const savedPlan = loadStudyPlan();
    const homepageBand = window.localStorage.getItem('ielts.ez.targetBand');
    setTarget(savedPlan?.targetBand ?? homepageBand ?? null);
    return onProgressChange(() => setProgress(getProgress()));
  }, []);
  const done = progress ? course.filter((lesson) => progress.lessons[lesson.key]).length : 0;
  const next = useMemo(() => course.find((lesson) => !progress?.lessons[lesson.key]) ?? course[0]!, [course, progress]);
  const tests = progress ? Object.values(progress.tests).reduce((sum, attempts) => sum + attempts.length, 0) : 0;
  const writing = progress ? Object.values(progress.writing).reduce((sum, attempts) => sum + attempts.length, 0) : 0;
  const speaking = progress?.speaking.length ?? 0;

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

      <section className="dashboard-next" aria-labelledby="next-heading">
        <div className="dashboard-next-copy">
          <span className="dashboard-kicker">Next lesson</span>
          <h2 id="next-heading">{next.title}</h2>
          <p>{next.skillLabel} lesson {next.position} of {course.length}, designed to move you one clear step closer to your target.</p>
          <a className="text-link" href={withBase(next.href)}>{done ? 'Continue this lesson' : 'Start your first lesson'} <span aria-hidden="true">→</span></a>
        </div>
        <div className="dashboard-target"><span>Target band</span><strong>{target ? target : 'Set yours'}</strong><a href={withBase('/start')}>{target ? 'Change plan' : 'Create a plan'} <span aria-hidden="true">↗</span></a></div>
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

      <section aria-labelledby="skills-heading">
        <div className="dashboard-section-heading"><div><p className="platform-eyebrow">Build range</p><h2 id="skills-heading">All five skills</h2></div><a className="text-link" href={withBase('/learn')}>Browse lessons <span aria-hidden="true">→</span></a></div>
        <div className="dashboard-skill-grid">
          {SKILLS.map((skill) => { const count = course.filter((lesson) => lesson.skill === skill.id).length; const finished = course.filter((lesson) => lesson.skill === skill.id && progress?.lessons[lesson.key]).length; return <a key={skill.id} className={`dashboard-skill dashboard-skill-${skill.id}`} href={withBase(`/learn?skill=${skill.id}`)}><span className="dashboard-skill-mark" aria-hidden="true" /> <span><strong>{skill.label}</strong><small>{finished} of {count} lessons complete</small></span><span className="dashboard-arrow" aria-hidden="true">→</span></a>; })}
        </div>
      </section>
    </div>
  );
}
