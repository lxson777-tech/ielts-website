import { useEffect, useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { getTypeStats, onProgressChange, type TypeStat } from '../lib/progress';
import type { QuestionType } from '../lib/tests/schema';
import { drillTypes } from '../lib/tests/drills';
import { QUESTION_TYPE_LABEL, lessonPath, practisePath } from '../lib/tests/question-types';
import { withBase } from '../lib/url';
import { useT } from '../lib/i18n/react';

/* Labels and links now live in src/lib/tests/question-types.ts, a plain
   module the Mr EZ tutor Worker can import too (a Worker cannot import this
   React component). Re-exported here so every existing call site keeps
   working against the same single source of truth. */
export const LABELS = QUESTION_TYPE_LABEL;

function tone(pct: number): { bar: string; text: string } {
  if (pct >= 75) return { bar: 'bg-success', text: 'text-success' };
  if (pct >= 50) return { bar: 'bg-warning', text: 'text-warning' };
  return { bar: 'bg-error', text: 'text-error' };
}

/** Base-prefixed URL for the lesson that teaches a question type, or
    undefined if this skill has no lesson covering it. */
export function lessonHref(skill: 'reading' | 'listening', type: QuestionType): string | undefined {
  const path = lessonPath(skill, type);
  return path ? withBase(path) : undefined;
}

/** Base-prefixed URL to the trainer hub, filtered to drills that contain this
    question type. */
export function practiseHref(skill: 'reading' | 'listening', type: QuestionType): string {
  return withBase(practisePath(skill, type));
}

export default function TypeAnalytics({ skill = 'reading' }: { skill?: 'reading' | 'listening' }) {
  const { t } = useT();
  const [stats, setStats] = useState<TypeStat[] | null>(null);

  useEffect(() => {
    setStats(getTypeStats(skill));
    return onProgressChange(() => setStats(getTypeStats(skill)));
  }, [skill]);

  if (stats === null) return null; // pre-hydration
  if (stats.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface-alt p-6 text-center text-sm text-ink-muted">
        {t("Finish a {skill} test and you'll see your accuracy broken down by question type here, so you know exactly what to practise next.", { skill })}
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

  // "Across every {skill} test... weakest type so far is {label}." has bold
  // on the (untranslated, protected) question-type label in the middle.
  // t() with no vars leaves the {label} marker in place, so it can be split
  // by hand and the label re-inserted with its <strong>, the same technique
  // as CurrentLevel.tsx's band-range sentence.
  const introParts = t("Across every {skill} test you've taken. Your weakest type so far is {label}.", {
    skill,
  }).split(/(\{label\})/);

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-sm text-ink-muted">
        {introParts.map((part, i) =>
          part === '{label}' ? (
            <strong key={i} className="text-ink">
              {LABELS[weakest.type] ?? weakest.type}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}{' '}
        {weakestLessonHref ? (
          <a href={weakestLessonHref} className="font-semibold text-brand hover:underline">
            {t('Start there')}
          </a>
        ) : (
          t('Start there.')
        )}
      </p>
      <MotionConfig reducedMotion="user">
        <ul className="mt-4 space-y-3">
          {rows.map((r, i) => {
            const rowTone = tone(r.pct);
            const type = r.type as QuestionType;
            const href = lessonHref(skill, type);
            const canPractise = practisable.has(type);
            return (
              <li key={r.type}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold">{LABELS[r.type] ?? r.type}</span>
                  <span className={`shrink-0 font-bold ${rowTone.text}`}>
                    {r.pct}% <span className="font-normal text-ink-muted">({r.correct}/{r.total})</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-alt">
                  <motion.div
                    className={`h-full rounded-full ${rowTone.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${r.pct}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
                  />
                </div>
                {(href || canPractise) && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                    {href && (
                      <a href={href} className="text-brand hover:underline">
                        {t('Review the lesson')}
                      </a>
                    )}
                    {canPractise && (
                      <a href={practiseHref(skill, type)} className="text-brand hover:underline">
                        {t('Practise this type')}
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
