/* Your route: the guided plan on /start.
   Since 2026-09-22 the guided list is the student's actual plan (Course.tsx
   architecture, WP8): the active session, the rolling schedule just ahead
   of it, the milestones further out, and a plain-language account of why
   the plan changed recently.

   NO SETTINGS FORM HERE ANY MORE (2026-09-22, follow-up). This file used to
   carry its own inline "Change" editor that wrote straight to the legacy
   SavedPlan store through saveStudyPlan, bypassing updateGoalsAndConstraints
   and unconditionally marking defaulted: false even when nothing had been
   confirmed. Once a student also touched the real settings surface
   (src/pages/plan-settings.astro, which now mounts <Intake variant=
   "settings">), the two would fight over the same student's plan. The whole
   form and its `settingsOnly` mode (once needed because plan-settings.astro
   used to mount this component directly) are gone. In their place: a quiet
   one-line summary read straight off the real plan, and a link to
   /plan-settings for anyone who wants to change it. Nothing in this file
   writes the old study plan store. */

import { useEffect, useState } from 'react';
import { withBase } from '../lib/url';
import { ensureLearningWired, getCurrentSession, onLearnerRecordChange, onPersonalPlanChange, readPersonalPlan } from '../lib/learning';
import type { PersonalPlanV1 } from '../lib/learning/contracts/plan';
import { useT } from '../lib/i18n/react';
import { planHistoryText } from '../lib/learning/plan-history';
import { daysUntil } from './learning/today/todayViewModel';
import ScopeNote from './learning/ScopeNote';
import TodaySession from './learning/today/TodaySession';
import WeekView from './plan/WeekView';
import '../styles/today-polish.css';

ensureLearningWired();

/** The quiet one-line summary: the confirmed goal and the daily time, read
    straight off the real plan. Honest when there is no confirmed goal yet
    or no exam date yet, rather than guessing at either. Pure enough to be
    a plain function (no hooks), but kept beside its one caller rather than
    in todayViewModel.ts: it composes whole translated sentences, which has
    to happen where `t`/`tn` are in scope. */
function routeSummaryText(
  plan: PersonalPlanV1,
  t: (key: string, vars?: Record<string, string | number>) => string,
  tn: (n: number, forms: { one: string; other: string }, vars?: Record<string, string | number>) => string,
): string {
  const target = plan.goals.overallTarget;
  const minutes = plan.constraints.regularDailyMinutes;
  if (!target || target.status !== 'confirmed') {
    return t('No confirmed goal yet, {minutes} min a day for now', { minutes });
  }
  const exam = plan.goals.examDate;
  const daysToExam = exam ? daysUntil(exam.date, plan.activeSession.date) : null;
  const pace =
    exam && daysToExam !== null && daysToExam >= 0
      ? tn(daysToExam, { one: '{n} day to go', other: '{n} days to go' })
      : t('no exam date yet');
  return t('Band {band} target, {pace}, {minutes} min a day', { band: target.band.toFixed(1), pace, minutes });
}

export default function Course() {
  const { t, tn, locale } = useT();
  const [personalPlan, setPersonalPlan] = useState<PersonalPlanV1 | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      try {
        getCurrentSession(); // ensures the plan exists before reading it raw
        setPersonalPlan(readPersonalPlan());
      } catch {
        setPersonalPlan(null);
      }
      setReady(true);
    };
    refresh();
    const offRecord = onLearnerRecordChange(refresh);
    const offPersonalPlan = onPersonalPlanChange(refresh);
    return () => {
      offRecord();
      offPersonalPlan();
    };
  }, []);

  if (!ready) return null; // avoid a hydration flash; a plan always builds once ready

  const milestones = personalPlan?.milestones ?? [];
  const recentChanges = [...(personalPlan?.history ?? [])].slice(-5).reverse();

  return (
    <div className="course-route mx-auto max-w-4xl">
      {personalPlan && (
        <div className="course-plan-summary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-ink-muted">{routeSummaryText(personalPlan, t, tn)}</span>
            <a
              href={withBase('/plan-settings')}
              className="shrink-0 rounded-button border border-border px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-surface-alt"
            >
              {t('Change')}
            </a>
          </div>
          {/* What will and will not fit, in the planner's own words. The
              same string Today shows, broken and collapsed the same way
              (see ScopeNote): one plan cannot read as two different plans
              on two pages. */}
          <ScopeNote note={personalPlan.scopeNote} className="mt-3 text-sm text-ink-muted" />
        </div>
      )}

      <div className="mt-6 space-y-6">
        <TodaySession />

        <WeekView />

        {milestones.length > 0 && (
          <section className="course-support-section">
            <h3 className="font-display text-lg font-bold">{t('Milestones ahead')}</h3>
            <ul className="mt-3 space-y-2.5">
              {milestones.map((milestone) => (
                <li key={milestone.id} className="flex items-start justify-between gap-3 text-sm">
                  <span
                    className={
                      milestone.state === 'dropped'
                        ? 'text-ink-muted line-through'
                        : milestone.state === 'met'
                          ? 'font-semibold text-success'
                          : 'text-ink'
                    }
                  >
                    {milestone.label}
                    {milestone.droppedReason && <span className="mt-0.5 block text-xs text-ink-muted">{milestone.droppedReason}</span>}
                  </span>
                  {milestone.targetDate && (
                    <span className="shrink-0 text-xs font-semibold text-ink-muted">{milestone.targetDate}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* A quiet, always-present way to reach the mock exam, the full tests
            hub and the progress report: the old stage-4 checklist named
            these directly, and losing that must not orphan the routes
            (brief acceptance scenario 14). Not a checklist, just links. */}
        <section className="course-support-section">
          <h3 className="font-display text-lg font-bold">{t('Exam practice')}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {t('Full timed papers and your record, whenever you want them, outside today\'s session.')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <a href={withBase('/tests/mock')} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-surface-alt">
              {t('Full mock exam')}
            </a>
            <a href={withBase('/tests')} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-surface-alt">
              {t('All practice tests')}
            </a>
            <a href={withBase('/report')} className="rounded-full border border-border px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-surface-alt">
              {t('Your progress report')}
            </a>
          </div>
        </section>

        {recentChanges.length > 0 && (
          <section className="course-support-section">
            <h3 className="font-display text-lg font-bold">{t('Why your plan changed recently')}</h3>
            <ul className="mt-3 space-y-3">
              {recentChanges.map((change) => (
                <li key={`${change.at}-${change.toRevision}`} className="text-sm">
                  <span className="text-ink">{planHistoryText(locale, change.summary)}</span>
                  <span className="ml-2 text-xs text-ink-muted">{change.at.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
