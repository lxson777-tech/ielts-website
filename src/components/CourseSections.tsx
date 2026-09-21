/* The Course tab's "By section" view: every lesson grouped by skill instead
   of the guided stage order Course.tsx walks. Same lessons, same completion
   source (progress.lessons via isLessonDone), just grouped the way a student
   who wants to browse one paper at a time would expect.

   Deliberately has no account gate — CourseGate renders this above the gate,
   since every lesson is open to everyone regardless of the guided path being
   account-locked. See buildSections() in src/lib/course.ts for the grouping.

   Each section is a plain button + conditional list rather than a native
   <details>: React's controlled `open` prop on <details> throws on its own
   toggle event in this app's React version (a long-standing React bug, not
   anything specific to this component), so a small boolean per section is
   both simpler and the one that actually works. */

import { useEffect, useState } from 'react';
import { withBase } from '../lib/url';
import { getProgress, onProgressChange, type ProgressV1 } from '../lib/progress';
import { buildSections, isLessonDone } from '../lib/course';
import { useT } from '../lib/i18n/react';

const SECTIONS = buildSections();

// Below this width, opening every section at once is more scrolling than a
// phone screen should ask for, so only the first one starts open.
const PHONE_QUERY = '(max-width: 760px)';

export default function CourseSections() {
  const { t, tn } = useT();
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [mounted, setMounted] = useState(false);
  // Starts with every section open: that is correct for desktop and, more
  // importantly, matches what the server rendered, so hydration never has to
  // reconcile a mismatch. The effect below narrows it to "first section only"
  // once it can actually check the viewport.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SECTIONS.map((s) => [s.skill, true])),
  );

  useEffect(() => {
    setProgress(getProgress());
    setMounted(true);
    const off = onProgressChange(() => setProgress(getProgress()));
    if (window.matchMedia(PHONE_QUERY).matches) {
      setOpenSections(Object.fromEntries(SECTIONS.map((s, i) => [s.skill, i === 0])));
    }
    return off;
  }, []);

  function toggleSection(skill: string) {
    setOpenSections((prev) => ({ ...prev, [skill]: !prev[skill] }));
  }

  const prog = progress ?? getProgress();

  return (
    <div className="course-sections mx-auto max-w-2xl space-y-4">
      {SECTIONS.map((section) => {
        const doneCount = section.lessons.filter((l) => isLessonDone(prog, l.key)).length;
        const isOpen = openSections[section.skill] ?? true;
        const panelId = `course-section-${section.skill}`;
        return (
          <div key={section.skill} className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <button
              type="button"
              onClick={() => toggleSection(section.skill)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="min-w-0">
                <span className="font-display text-lg font-bold">{t(section.label)}</span>
                <span className="mt-1 block text-sm text-ink-muted">{t(section.blurb)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="text-xs font-semibold text-ink-muted">
                  {mounted
                    ? t('{done} of {total} done', { done: doneCount, total: section.lessons.length })
                    : tn(section.lessons.length, { one: '{n} lesson', other: '{n} lessons' })}
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            {isOpen && (
              <ul id={panelId} className="mt-4 space-y-1">
                {section.lessons.map((lesson) => {
                  const done = mounted && isLessonDone(prog, lesson.key);
                  return (
                    <li key={lesson.key}>
                      <a
                        href={withBase(lesson.href)}
                        className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-alt"
                      >
                        <span
                          aria-hidden="true"
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold transition-colors duration-[240ms] ${
                            done ? 'bg-success text-white' : 'border border-border text-ink-muted'
                          }`}
                        >
                          {done ? (
                            <svg className="tick-svg" viewBox="0 0 24 24">
                              <polyline points="4,12.6 9.6,18.2 20,6.4" pathLength={1} />
                            </svg>
                          ) : (
                            lesson.position
                          )}
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-sm ${
                            done ? 'text-ink-muted line-through' : 'text-ink group-hover:text-brand'
                          }`}
                        >
                          {t(lesson.title)}
                        </span>
                        {typeof lesson.minutes === 'number' && (
                          <span className="shrink-0 text-[0.7rem] font-semibold text-ink-muted">
                            {t('{n} min', { n: lesson.minutes })}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
