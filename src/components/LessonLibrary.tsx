import { useMemo, useState } from 'react';
import { LESSONS, SKILLS, type Skill } from '../data/lessons';
import { withBase } from '../lib/url';
import { isLessonComplete } from '../lib/progress';
import { buildCourse } from '../lib/course';

export default function LessonLibrary() {
  const initial = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('skill') ?? 'all' : 'all';
  const [filter, setFilter] = useState<string>(initial);
  const [query, setQuery] = useState('');
  const entries = useMemo(() => [
    ...LESSONS.map((lesson) => ({ ...lesson, key: lesson.slug, href: `/lessons/${lesson.slug}`, description: lesson.description, overview: true })),
    ...buildCourse().flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, description: `Build your ${lesson.skillLabel.toLowerCase()} skills with this focused lesson.`, overview: false }))),
  ], []);
  const visible = useMemo(() => entries.filter((lesson) => (filter === 'all' || lesson.skill === filter) && `${lesson.title} ${lesson.description}`.toLowerCase().includes(query.toLowerCase())), [entries, filter, query]);
  return <div className="library-space">
    <div className="library-heading"><div><p className="platform-eyebrow">Lesson library</p><h1>Learn at your pace.</h1><p>Choose a skill, open a lesson, and mark it complete when you are ready to move on.</p></div><div className="library-count"><strong>{visible.length}</strong><span>lessons shown</span></div></div>
    <div className="library-controls"><label className="sr-only" htmlFor="lesson-search">Search lessons</label><input id="lesson-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search lessons" /> <div className="library-filters" role="group" aria-label="Filter lessons"><button className={filter === 'all' ? 'is-selected' : ''} onClick={() => setFilter('all')}>All</button>{SKILLS.map((skill) => <button key={skill.id} className={filter === skill.id ? 'is-selected' : ''} onClick={() => setFilter(skill.id as Skill)}>{skill.label}</button>)}</div></div>
    <div className="library-grid">{visible.map((lesson) => { const complete = isLessonComplete(lesson.key); return <a className={`library-card skill-${lesson.skill}`} key={lesson.key} href={withBase(lesson.href)}><div className="library-card-top"><span>{SKILLS.find((skill) => skill.id === lesson.skill)?.label}{lesson.overview ? ' · Overview' : ''}</span>{complete && <span className="library-complete">✓ Complete</span>}</div><h2>{lesson.title}</h2><p>{lesson.description}</p><span className="library-card-link">Open lesson <span aria-hidden="true">→</span></span></a>; })}</div>
    {visible.length === 0 && <p className="library-empty">No lessons match that search yet. Try another skill or phrase.</p>}
  </div>;
}
