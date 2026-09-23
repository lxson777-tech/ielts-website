import { useEffect, useMemo, useState } from 'react';
import { LESSONS, SKILLS, type Skill } from '../data/lessons';
import { withBase } from '../lib/url';
import { isLessonComplete } from '../lib/progress';
import { buildCourse } from '../lib/course';
import { useT } from '../lib/i18n/react';

function updateSkillInUrl(skill: string) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (skill === 'all') url.searchParams.delete('skill');
  else url.searchParams.set('skill', skill);
  window.history.replaceState(window.history.state, '', url);
}

const BOILERPLATE_DESCRIPTION = (skillLabel: string) => `Build your ${skillLabel.toLowerCase()} skills with this focused lesson.`;

export default function LessonLibrary() {
  const { t, tn } = useT();
  // Always start at 'all' on both server and client render so hydration matches
  // (this page is statically rendered, so the ?skill= query can only be read after
  // mount). The URL filter is applied in the effect below.
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  // Same "ready until mounted" pattern as Course.tsx: isLessonComplete() reads
  // localStorage, which the server can never see, so rendering it on the very
  // first client pass (before mount) would disagree with the server-rendered
  // markup and trigger a hydration mismatch. Completion ticks appear the
  // instant after mount instead, once client and server have already agreed.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const skill = new URLSearchParams(window.location.search).get('skill');
    if (skill && (skill === 'all' || SKILLS.some((s) => s.id === skill))) setFilter(skill);
  }, []);
  const selectFilter = (skill: string) => {
    setFilter(skill);
    updateSkillInUrl(skill);
  };
  const entries = useMemo(() => [
    ...LESSONS.map((lesson) => ({ ...lesson, key: lesson.slug, href: `/lessons/${lesson.slug}`, description: lesson.description, overview: true, moduleLabel: null as string | null, skillLabel: null as string | null, blurb: null as string | null })),
    ...buildCourse().flatMap((module) => module.lessons.map((lesson) => ({
      ...lesson,
      // Real blurb from the registry (reading.ts, listening.ts, ...); only
      // fall back to the generic line when a part genuinely has none.
      description: lesson.blurb || BOILERPLATE_DESCRIPTION(lesson.skillLabel),
      overview: false,
      moduleLabel: module.name,
    }))),
  ], []);
  const visible = useMemo(() => entries.filter((lesson) => (filter === 'all' || lesson.skill === filter) && `${lesson.title} ${lesson.description}`.toLowerCase().includes(query.toLowerCase())), [entries, filter, query]);
  return <div className="library-space">
    <div className="library-heading"><div><h1>{t('Learn at your pace.')}</h1><p>{t('Choose a skill, open a lesson, and mark it complete when you are ready to move on.')}</p></div><div className="library-count"><strong>{visible.length}</strong><span>{tn(visible.length, { one: 'lesson shown', other: 'lessons shown' })}</span></div></div>
    <div className="library-controls"><label className="sr-only" htmlFor="lesson-search">{t('Search lessons')}</label><input id="lesson-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search lessons')} /> <div className="library-filters" role="group" aria-label={t('Filter lessons')}><button aria-pressed={filter === 'all'} className={filter === 'all' ? 'is-selected' : ''} onClick={() => selectFilter('all')}>{t('All')}</button>{SKILLS.map((skill) => <button key={skill.id} aria-pressed={filter === skill.id} className={filter === skill.id ? 'is-selected' : ''} onClick={() => selectFilter(skill.id as Skill)}>{t(skill.label)}</button>)}</div></div>
    <div className="library-grid">{visible.map((lesson) => { const complete = mounted && isLessonComplete(lesson.key); const skillLabel = SKILLS.find((skill) => skill.id === lesson.skill)?.label; return <a className={`library-card skill-${lesson.skill}`} key={lesson.key} href={withBase(lesson.href)}><div className="library-card-top"><span>{skillLabel ? t(skillLabel) : ''}{lesson.overview ? ` · ${t('Overview')}` : ''}</span>{complete && <span className="library-complete">✓ {t('Complete', undefined, 'status')}</span>}</div>{lesson.moduleLabel && <span className="library-card-module">{t(lesson.moduleLabel)}</span>}<h2>{t(lesson.title)}</h2><p>{lesson.overview ? t(lesson.description) : lesson.blurb ? t(lesson.blurb) : t('Build your {skill} skills with this focused lesson.', { skill: (skillLabel ? t(skillLabel) : lesson.skillLabel ?? '').toLowerCase() })}</p><div className="library-card-link"><span>{t('Open lesson')}</span>{typeof lesson.minutes === 'number' && <span className="library-card-minutes">{t('{n} min', { n: lesson.minutes })}</span>}</div></a>; })}</div>
    {visible.length === 0 && <p className="library-empty">{t('No lessons match that search yet. Try another skill or phrase.')}</p>}
  </div>;
}
