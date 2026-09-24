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
  getBestBand,
  getBestWritingBand,
  getBestSpeakingBand,
  getProgress,
} from '../lib/progress';
import { loadStudyPlan, onStudyPlanChange, daysUntilTest, confirmedTargetBand, type SavedPlan } from '../lib/study-plan';
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
  const { t, tn } = useT();
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
  const course = stats.course;

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
                  <p className="text-xs text-success">{t('Synced across your devices')}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              {/* {loginLink} is left literal by t() with no vars, so it can be
                  split by hand and the bold "Log in" re-inserted in place,
                  wherever the translation puts it. */}
              {t('Saved on this device only. {loginLink} (top of the page) to sync across devices.')
                .split(/(\{loginLink\})/)
                .map((part, i) =>
                  part === '{loginLink}' ? (
                    <span key={i} className="font-semibold text-brand">
                      {t('Log in')}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
            </p>
          )}
        </div>
      )}

      {/* ── At a glance ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t('Lessons done (of {total})', { total: course.totalLessons })} value={String(course.doneLessons)} />
        <StatTile label={t('Best {skill} band', { skill: 'reading' })} value={stats.readingBand ?? '-'} accent="var(--color-reading)" />
        <StatTile label={t('Best {skill} band', { skill: 'writing' })} value={stats.writingBand?.toFixed(1) ?? '-'} accent="var(--color-writing)" />
        <StatTile label={t('Best {skill} band', { skill: 'speaking' })} value={stats.speakingBand?.toFixed(1) ?? '-'} accent="var(--color-speaking)" />
      </div>

      {/* ── Course summary ──
          The headline sentence is the shared session's own objective and
          reason: the exact same next step Today, the account menu and Mr EZ
          show, not a library position worked out again here. `done of total
          lessons` stays as a studied count, kept visibly apart from that
          objective rather than folded into one number. */}
      {plan ? (
        <div className="rounded-card border border-border bg-surface p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display font-bold">
                {confirmedTargetBand(plan) ? t('Course · Band {band}', { band: confirmedTargetBand(plan)! }) : t('Not set yet')}
                {days !== null && (
                  <span className="ml-2 font-normal text-ink-muted">
                    {tn(days, { one: '{n} day to go', other: '{n} days to go' })}
                  </span>
                )}
              </p>
              {course.session && (
                <p className="mt-1 text-xs text-ink-muted">{course.session.objective}</p>
              )}
              <p className="mt-1 text-[0.7rem] text-ink-muted">
                {t('{done} of {total} lessons studied', { done: course.doneLessons, total: course.totalLessons })}
              </p>
            </div>
            <a
              href={withBase(course.session?.current?.href ?? '/start')}
              className="shrink-0 rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
            >
              {course.session?.current || course.next ? t('Continue') : t('View course')}
            </a>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-alt">
            <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${course.percent}%` }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-border bg-surface-alt p-5">
          <p className="text-sm text-ink-muted">
            {course.doneLessons > 0
              ? tn(course.doneLessons, {
                  one: 'You have completed {n} lesson. Set a target band to build your plan.',
                  other: 'You have completed {n} lessons. Set a target band to build your plan.',
                })
              : t("You haven't started the course yet.")}
          </p>
          <a
            href={withBase('/start')}
            className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            {course.doneLessons > 0 ? t('Set your target') : t('Start the course')}
          </a>
        </div>
      )}
    </div>
  );
}
