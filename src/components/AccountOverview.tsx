/* Top-of-page summary for /account: who you are (or aren't) signed in as,
   four at-a-glance stat tiles, and a compact study-plan progress card. The
   detailed per-skill history below this (ScoreHistory / WritingHistory /
   SpeakingHistory / TypeAnalytics) already exists elsewhere — this is the
   "everything in one place" view the site was missing, built from the exact
   same localStorage/synced data those already read. */

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { withBase } from '../lib/url';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAuthChange } from '../lib/auth/session';
import {
  completedLessonCount,
  getBestBand,
  getBestWritingBand,
  getBestSpeakingBand,
} from '../lib/progress';
import { loadStudyPlan, onStudyPlanChange, daysUntilTest, buildStudyPlanStages, type SavedPlan } from '../lib/study-plan';
import { LESSONS } from '../data/lessons';

interface Stats {
  lessonsDone: number;
  readingBand: string | null;
  writingBand: number | null;
  speakingBand: number | null;
}

function readStats(): Stats {
  return {
    lessonsDone: completedLessonCount(),
    readingBand: getBestBand()?.bandLabel ?? null,
    writingBand: getBestWritingBand(),
    speakingBand: getBestSpeakingBand(),
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
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [plan, setPlan] = useState<SavedPlan | null>(null);

  useEffect(() => {
    setStats(readStats());
    setPlan(loadStudyPlan());
    const offProgress = () => setStats(readStats());
    // progress.ts doesn't export a subscribe hook that fires cross-tab, but
    // onStudyPlanChange + a focus refresh covers a synced-in-another-tab pull.
    window.addEventListener('focus', offProgress);
    const offPlan = onStudyPlanChange(() => setPlan(loadStudyPlan()));

    if (isAuthConfigured()) {
      const unsub = onAuthChange((u) => {
        setUser(u);
        setAuthReady(true);
        setStats(readStats()); // a just-completed sync may have changed these
        setPlan(loadStudyPlan());
      });
      return () => {
        window.removeEventListener('focus', offProgress);
        offPlan();
        unsub();
      };
    }
    setAuthReady(true);
    return () => {
      window.removeEventListener('focus', offProgress);
      offPlan();
    };
  }, []);

  if (!stats || !authReady) return null; // pre-hydration

  const days = plan ? daysUntilTest(plan.testDate) : null;
  const totalSteps = plan ? buildStudyPlanStages(days).reduce((n, s) => n + s.steps.length, 0) : 0;
  const planPct = plan && totalSteps ? Math.round((plan.done.length / totalSteps) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Who you are ── */}
      {isAuthConfigured() && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-bold text-white">
                  {(user.email ?? '?').charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold">{user.email}</p>
                  <p className="text-xs text-success">Synced across your devices</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              Saved on this device only.{' '}
              <span className="font-semibold text-brand">Log in</span> (top of the page) to sync across devices.
            </p>
          )}
        </div>
      )}

      {/* ── At a glance ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={`Lessons done (of ${LESSONS.length})`} value={String(stats.lessonsDone)} />
        <StatTile label="Best reading band" value={stats.readingBand ?? '-'} accent="var(--color-reading)" />
        <StatTile label="Best writing band" value={stats.writingBand?.toFixed(1) ?? '-'} accent="var(--color-writing)" />
        <StatTile label="Best speaking band" value={stats.speakingBand?.toFixed(1) ?? '-'} accent="var(--color-speaking)" />
      </div>

      {/* ── Study plan summary ── */}
      {plan ? (
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display font-bold">
                Study plan · Band {plan.targetBand}
                {days !== null && (
                  <span className="ml-2 font-normal text-ink-muted">
                    {days} day{days === 1 ? '' : 's'} to go
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {plan.done.length} of {totalSteps} steps done
              </p>
            </div>
            <a
              href={withBase('/start')}
              className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
            >
              View plan
            </a>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-alt">
            <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${planPct}%` }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-border bg-surface-alt p-5">
          <p className="text-sm text-ink-muted">You haven't built a study plan yet.</p>
          <a
            href={withBase('/start')}
            className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Build my plan
          </a>
        </div>
      )}
    </div>
  );
}
