/* The at-a-glance tiles at the top of /account's "Saved and results":
   lessons done and the best band in Reading, Writing and Speaking. The
   detailed per-skill history below this (ScoreHistory / WritingHistory /
   SpeakingHistory / TypeAnalytics) already exists elsewhere — this is the
   "everything in one place" view the site was missing, built from the exact
   same localStorage/synced data those already read. */

import { useEffect, useState } from 'react';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAuthChange } from '../lib/auth/session';
import {
  getBestBand,
  getBestWritingBand,
  getBestSpeakingBand,
  getProgress,
} from '../lib/progress';
import { onStudyPlanChange } from '../lib/study-plan';
import { buildCourse, courseStatus, type CourseStatus } from '../lib/course';
import { ensureLearningWired } from '../lib/learning';
import { useT } from '../lib/i18n/react';

const MODULES = buildCourse();

// /account can be the only page load that ever touches the learning layer
// for a given visit, so this island wires it itself (see the identical note
// in AccountMenu.tsx). Without this, course.session below would fall back
// to the library position instead of the student's real plan.
ensureLearningWired();

interface Stats {
  readingBand: string | null;
  writingBand: number | null;
  speakingBand: number | null;
  /** Course completion, derived from progress.lessons rather than stored, so
      this can never disagree with the course page itself. */
  course: CourseStatus;
}

function readStats(): Stats {
  return {
    readingBand: getBestBand()?.bandLabel ?? null,
    writingBand: getBestWritingBand(),
    speakingBand: getBestSpeakingBand(),
    course: courseStatus(MODULES, getProgress()),
  };
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 text-center shadow-card">
      <p className="font-display text-2xl font-extrabold" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-ink-muted">{label}</p>
    </div>
  );
}

export default function AccountOverview() {
  const { t } = useT();
  const [authReady, setAuthReady] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setStats(readStats());
    const refresh = () => setStats(readStats());
    // progress.ts doesn't export a subscribe hook that fires cross-tab, but
    // a focus refresh covers a synced-in-another-tab pull.
    window.addEventListener('focus', refresh);
    const offPlan = onStudyPlanChange(refresh);

    if (isAuthConfigured()) {
      const unsub = onAuthChange(() => {
        setAuthReady(true);
        refresh(); // a just-completed sync may have changed these
      });
      return () => {
        window.removeEventListener('focus', refresh);
        offPlan();
        unsub();
      };
    }
    setAuthReady(true);
    return () => {
      window.removeEventListener('focus', refresh);
      offPlan();
    };
  }, []);

  if (!stats || !authReady) return null; // pre-hydration

  const course = stats.course;

  /* Four tiles and nothing else (1 October 2026). Who is signed in is in the
     header menu and the Profile category; the next step is Today's job. */
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label={t('Lessons done (of {total})', { total: course.totalLessons })} value={String(course.doneLessons)} />
      <StatTile label={t('Best {skill} band', { skill: 'reading' })} value={stats.readingBand ?? '-'} accent="var(--color-reading)" />
      <StatTile label={t('Best {skill} band', { skill: 'writing' })} value={stats.writingBand?.toFixed(1) ?? '-'} accent="var(--color-writing)" />
      <StatTile label={t('Best {skill} band', { skill: 'speaking' })} value={stats.speakingBand?.toFixed(1) ?? '-'} accent="var(--color-speaking)" />
    </div>
  );
}
