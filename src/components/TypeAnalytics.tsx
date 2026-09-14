import { useEffect, useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { getTypeStats, onProgressChange, type TypeStat } from '../lib/progress';
import type { QuestionType } from '../lib/tests/schema';
import { drillTypes } from '../lib/tests/drills';
import { readingLessonSlug } from '../data/reading-strategies';
import { listeningLessonSlug } from '../data/listening-strategies';
import { withBase } from '../lib/url';

/* Friendly labels for the schema's QuestionType keys. Exported so other
   views (e.g. the Listening Trainer hub, which lists which question types
   each drill contains) can reuse the same wording instead of duplicating it. */
export const LABELS: Record<string, string> = {
  'paragraph-matching': 'Matching Information',
  'sentence-completion': 'Sentence Completion',
  tfng: 'True / False / Not Given',
  'yes-no-notgiven': 'Yes / No / Not Given',
  'multiple-choice': 'Multiple Choice',
  'matching-headings': 'Matching Headings',
  'matching-features': 'Matching Features',
  'sentence-endings': 'Sentence Endings',
  categorisation: 'Categorisation',
  'multiple-answer': 'Multiple Answer',
  'diagram-labelling': 'Diagram Labelling',
  'table-completion': 'Table Completion',
};

function tone(pct: number): { bar: string; text: string } {
  if (pct >= 75) return { bar: 'bg-success', text: 'text-success' };
  if (pct >= 50) return { bar: 'bg-warning', text: 'text-warning' };
  return { bar: 'bg-error', text: 'text-error' };
}

/** Base-prefixed URL for the lesson that teaches a question type, or
    undefined if this skill has no lesson covering it (only possible for a
    handful of listening types with no dedicated lesson, see
    listening-strategies.ts). */
function lessonHref(skill: 'reading' | 'listening', type: QuestionType): string | undefined {
  const slug = skill === 'listening' ? listeningLessonSlug(type) : readingLessonSlug(type);
  return slug ? withBase(`/lessons/${skill}/${slug}`) : undefined;
}

/** Base-prefixed URL to the trainer hub, filtered to drills that contain this
    question type (the hub reads `?type=` client-side, see
    src/pages/trainers/{reading,listening}/index.astro). */
function practiseHref(skill: 'reading' | 'listening', type: QuestionType): string {
  return withBase(`/trainers/${skill}?type=${encodeURIComponent(type)}`);
}

export default function TypeAnalytics({ skill = 'reading' }: { skill?: 'reading' | 'listening' }) {
  const [stats, setStats] = useState<TypeStat[] | null>(null);

  useEffect(() => {
    setStats(getTypeStats(skill));
    return onProgressChange(() => setStats(getTypeStats(skill)));
  }, [skill]);

  if (stats === null) return null; // pre-hydration
  if (stats.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface-alt p-6 text-center text-sm text-ink-muted">
        Finish a {skill} test and you'll see your accuracy broken down by question type here, so you know exactly what to practise next.
      </div>
    );
  }

  // Weakest first: that's the whole point of the panel.
  const rows = stats
    .map((s) => ({ ...s, pct: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => a.pct - b.pct);

  const weakest = rows[0]!;
  const weakestLessonHref = lessonHref(skill, weakest.type as QuestionType);
  const practisable = drillTypes(skill);

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-sm text-ink-muted">
        Across every {skill} test you've taken. Your weakest type so far is{' '}
        <strong className="text-ink">{LABELS[weakest.type] ?? weakest.type}</strong>.{' '}
        {weakestLessonHref ? (
          <a href={weakestLessonHref} className="font-semibold text-brand hover:underline">
            Start there
          </a>
        ) : (
          'Start there.'
        )}
      </p>
      <MotionConfig reducedMotion="user">
        <ul className="mt-4 space-y-3">
          {rows.map((r, i) => {
            const t = tone(r.pct);
            const type = r.type as QuestionType;
            const href = lessonHref(skill, type);
            const canPractise = practisable.has(type);
            return (
              <li key={r.type}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">{LABELS[r.type] ?? r.type}</span>
                  <span className={`shrink-0 font-bold ${t.text}`}>
                    {r.pct}% <span className="font-normal text-ink-muted">({r.correct}/{r.total})</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-alt">
                  <motion.div
                    className={`h-full rounded-full ${t.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${r.pct}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                  />
                </div>
                {(href || canPractise) && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                    {href && (
                      <a href={href} className="text-brand hover:underline">
                        Review the lesson →
                      </a>
                    )}
                    {canPractise && (
                      <a href={practiseHref(skill, type)} className="text-brand hover:underline">
                        Practise this type →
                      </a>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </MotionConfig>
    </div>
  );
}
