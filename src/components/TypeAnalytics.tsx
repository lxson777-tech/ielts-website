import { useEffect, useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { getTypeStats, type TypeStat } from '../lib/progress';

/* Friendly labels for the schema's QuestionType keys. */
const LABELS: Record<string, string> = {
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
};

function tone(pct: number): { bar: string; text: string } {
  if (pct >= 75) return { bar: 'bg-success', text: 'text-success' };
  if (pct >= 50) return { bar: 'bg-warning', text: 'text-warning' };
  return { bar: 'bg-error', text: 'text-error' };
}

export default function TypeAnalytics() {
  const [stats, setStats] = useState<TypeStat[] | null>(null);

  useEffect(() => {
    setStats(getTypeStats());
  }, []);

  if (stats === null) return null; // pre-hydration
  if (stats.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface-alt p-6 text-center text-sm text-ink-muted">
        Finish a test and you'll see your accuracy broken down by question type here — so you know exactly what to drill next.
      </div>
    );
  }

  // Weakest first: that's the whole point of the panel.
  const rows = stats
    .map((s) => ({ ...s, pct: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => a.pct - b.pct);

  const weakest = rows[0]!;

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-sm text-ink-muted">
        Across every test you've taken. Your weakest type so far is{' '}
        <strong className="text-ink">{LABELS[weakest.type] ?? weakest.type}</strong> — start there.
      </p>
      <MotionConfig reducedMotion="user">
        <ul className="mt-4 space-y-3">
          {rows.map((r, i) => {
            const t = tone(r.pct);
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
              </li>
            );
          })}
        </ul>
      </MotionConfig>
    </div>
  );
}
