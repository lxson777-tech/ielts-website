/* The printable progress report at /report: one page a student (or their
   teacher) can save as a PDF, pulling together the study plan, lessons
   completed, test history, the four skill trends, the four-question detail
   per paper, and the daily streak. Reads the same localStorage stores as
   the rest of the account pages (progress.ts, study-plan.ts, plan/
   streak.ts) plus the one evidence policy (src/lib/learning/policy.ts) for
   everything about certainty, gaps and what changed, and nothing here is
   stored separately except the optional name field, which is cosmetic only
   and kept in its own small key so it never touches the shared progress
   shape.

   WP23, 2026-09-22: the old "weakest / strongest question types" section
   (raw lifetime correct/total off src/lib/progress.ts's getTypeStats, a
   third counting method with no certainty gating of its own) is gone. Its
   job is now done honestly by the "What each paper tells us" section below,
   which reads the same policy the skill-trend panels above it do. See
   architecture section 1.3 for the audit finding this responds to. */

import { useEffect, useState } from 'react';
import {
  getProgress,
  getAttempts,
  getWritingAttempts,
  getSpeakingAttempts,
  getBestBand,
  getBestWritingBand,
  getBestSpeakingBand,
  getActivity,
} from '../lib/progress';
import { loadStudyPlan, daysUntilTest, skillTargetFor, type PlanSkill, type SavedPlan } from '../lib/study-plan';
import { getStreak } from '../lib/plan/streak';
import { buildCourse } from '../lib/course';
import type { Skill } from '../data/lessons';
import WeeklyReview from './tutor/WeeklyReview';
import { useT, type Translator } from '../lib/i18n/react';
import { nt } from '../lib/i18n/translate';
import { ensurePlan, readLearnerRecord, getCurrentSession } from '../lib/learning';
import { evaluateEvidence } from '../lib/learning/policy';
import { PAPERS } from '../lib/learning/contracts/catalog';
import type { IgnoredReason } from '../lib/learning/contracts/policy';
import {
  skillTrendPanels,
  paperNarratives,
  recentIndependentEvidence,
  statedMistakeReasons,
  IGNORED_REASONS,
  type NarrativeLine,
} from './reportTrends';
import SkillTrendGrid from './SkillTrendGrid';
import '../styles/learning-progress.css';

const NAME_KEY = 'ielts.report.name.v1';

function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(name: string): void {
  try {
    if (name.trim()) localStorage.setItem(NAME_KEY, name);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    // ignore — the name is a nice-to-have on the printout, never fatal
  }
}

// Reading/Listening/Writing/Speaking are the protected paper names (never
// translated, per docs/I18N-GUIDE.md), so only the 'vocabulary' entry is
// marked for translation.
const SKILL_LABEL: Record<Skill, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
  vocabulary: nt('Vocabulary'),
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ProgressReport() {
  const { t, tn } = useT();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    setMounted(true);
    setName(loadName());
  }, []);

  if (!mounted) return null;

  const progress = getProgress();
  const plan: SavedPlan | null = loadStudyPlan();
  const days = plan ? daysUntilTest(plan.testDate) : null;
  const streak = getStreak(plan);
  const activity = getActivity();
  const totalMinutes = Object.values(activity).reduce((sum, d) => sum + d.minutes, 0);

  const modules = buildCourse();
  const allCourseLessons = modules.flatMap((m) => m.lessons);
  const skills: Skill[] = ['reading', 'listening', 'writing', 'speaking', 'vocabulary'];
  const lessonsBySkill = skills.map((skill) => {
    const lessons = allCourseLessons.filter((l) => l.skill === skill);
    const done = lessons.filter((l) => l.key in progress.lessons).length;
    return { skill, done, total: lessons.length };
  });

  const readingBest = getBestBand(undefined, 'reading');
  const listeningBest = getBestBand(undefined, 'listening');
  const readingAttempts = getAttempts().filter((a) => a.attempt.kind !== 'drill' && (a.attempt.skill ?? 'reading') === 'reading');
  const listeningAttempts = getAttempts().filter((a) => a.attempt.kind !== 'drill' && a.attempt.skill === 'listening');
  const writingAttempts = getWritingAttempts();
  const speakingAttempts = getSpeakingAttempts();
  const writingBest = getBestWritingBand();
  const speakingBest = getBestSpeakingBand();

  const testRows: {
    skill: string;
    key: PlanSkill;
    best: number | null;
    latest: number | null;
    count: number;
  }[] = [
    { skill: 'Reading', key: 'reading', best: readingBest?.band ?? null, latest: readingAttempts.at(-1)?.attempt.band ?? null, count: readingAttempts.length },
    { skill: 'Listening', key: 'listening', best: listeningBest?.band ?? null, latest: listeningAttempts.at(-1)?.attempt.band ?? null, count: listeningAttempts.length },
    { skill: 'Writing', key: 'writing', best: writingBest, latest: writingAttempts.at(-1)?.attempt.overallBand ?? null, count: writingAttempts.length },
    { skill: 'Speaking', key: 'speaking', best: speakingBest, latest: speakingAttempts.at(-1)?.overallBand ?? null, count: speakingAttempts.length },
  ];

  // Four separate skill estimates from the one evidence policy, never
  // joined into a single line across papers (see reportTrends.ts).
  // ensurePlan() is safe on every render: with a plan already stored for
  // today it only reads it, and the same call is how every other surface
  // reaches the student's real goals.
  const learningPlan = ensurePlan();
  const learnerRecord = readLearnerRecord();
  const policy = evaluateEvidence({ record: learnerRecord, goals: learningPlan.goals, now: new Date().toISOString() });
  const skillPanels = skillTrendPanels(policy);

  // The four questions per paper (what improved, what is uncertain, what is
  // next, what changed and why): brief section 9. `session` is the one
  // shared next step every other surface reads, never a second opinion
  // built here.
  const session = getCurrentSession();
  const narratives = paperNarratives(policy, learningPlan, session);

  // Teacher-review evidence: goals, recent independent evidence, the
  // student's own stated reasons, flagged scopes, and recent plan changes.
  // Everything here is the student's own data, read locally, never sent
  // anywhere (deliverable 5). It is part of the same printable page, so no
  // separate export mechanism is needed.
  const recentEvidence = recentIndependentEvidence(learnerRecord, 10);
  const mistakes = statedMistakeReasons(learnerRecord, 6);
  const recentPlanChanges = [...learningPlan.history].slice(-5).reverse();

  return (
    <div className="space-y-10">
      <div className="report-print-hide flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-sm">
          <label htmlFor="report-name" className="text-xs font-bold uppercase tracking-wide text-ink-muted">
            {t('Student name (optional)')}
          </label>
          <input
            id="report-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              saveName(e.target.value);
            }}
            placeholder={t('Add a name for the printout')}
            className="mt-1.5 w-full rounded-button border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="shrink-0 rounded-button bg-brand px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-brand-hover"
        >
          {t('Print or save as PDF')}
        </button>
      </div>

      {/* ── Print header: only visible on the printed page, see the @media print rule ── */}
      <div className="report-print-only hidden">
        <h1 className="font-display text-2xl font-extrabold">{name ? t("{name}'s progress report", { name }) : t('Progress report')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('Generated {date} · IELTS is EZ', { date: fmtDate(new Date().toISOString()) })}</p>
      </div>

      <WeeklyReview />

      {/* ── Plan summary ── */}
      <section>
        <h2 className="font-display text-lg font-bold">{t('Study plan')}</h2>
        {plan ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-card border border-border bg-surface p-4">
              <p className="text-xs text-ink-muted">{t('Target band')}</p>
              <p className="mt-1 font-display text-xl font-extrabold">{plan.targetBand}</p>
            </div>
            <div className="rounded-card border border-border bg-surface p-4">
              <p className="text-xs text-ink-muted">{t('Test date')}</p>
              <p className="mt-1 font-display text-xl font-extrabold">{plan.testDate || t('Not set')}</p>
            </div>
            <div className="rounded-card border border-border bg-surface p-4">
              <p className="text-xs text-ink-muted">{t('Days to go')}</p>
              <p className="mt-1 font-display text-xl font-extrabold">
                {days ?? <span className="text-sm font-normal text-ink-muted">{t('not yet')}</span>}
              </p>
            </div>
            <div className="rounded-card border border-border bg-surface p-4">
              <p className="text-xs text-ink-muted">{t('Started')}</p>
              <p className="mt-1 font-display text-xl font-extrabold">{plan.startDate ?? plan.createdAt.slice(0, 10)}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">{t('No study plan set up yet.')}</p>
        )}
      </section>

      {/* ── Streak and study time ── */}
      <section>
        <h2 className="font-display text-lg font-bold">{t('Consistency')}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-surface p-4">
            <p className="text-xs text-ink-muted">{t('Current streak')}</p>
            <p className="mt-1 font-display text-xl font-extrabold">
              {tn(streak, { one: '{n} day', other: '{n} days' })}
            </p>
          </div>
          <div className="rounded-card border border-border bg-surface p-4">
            {/* Each lesson and test carries a fixed estimated allowance
                (12/40/10 minutes in src/lib/progress.ts), never a measured
                time-on-page, so this is labelled as an estimate rather than
                as logged, measured time. */}
            <p className="text-xs text-ink-muted">{t('Estimated study time')}</p>
            <p className="mt-1 font-display text-xl font-extrabold">
              {t('{hours}h {minutes}m', { hours: Math.round(totalMinutes / 60), minutes: totalMinutes % 60 })}
            </p>
          </div>
        </div>
      </section>

      {/* ── Lessons completed per skill ── */}
      <section>
        <h2 className="font-display text-lg font-bold">{t('Lessons completed')}</h2>
        <div className="mt-3 overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 font-semibold">{t('Skill')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('Completed')}</th>
              </tr>
            </thead>
            <tbody>
              {lessonsBySkill.map((row) => (
                <tr key={row.skill} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium">{row.skill === 'vocabulary' ? t(SKILL_LABEL[row.skill]) : SKILL_LABEL[row.skill]}</td>
                  <td className="px-4 py-2.5">
                    {t('{done} / {total}', { done: row.done, total: row.total })}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border bg-surface-alt font-semibold">
                <td className="px-4 py-2.5">{t('Total')}</td>
                <td className="px-4 py-2.5">
                  {t('{done} / {total}', {
                    done: lessonsBySkill.reduce((n, r) => n + r.done, 0),
                    total: lessonsBySkill.reduce((n, r) => n + r.total, 0),
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Tests taken per skill ── */}
      <section>
        <h2 className="font-display text-lg font-bold">{t('Test results')}</h2>
        <div className="mt-3 overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 font-semibold">{t('Skill')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('Attempts')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('Best band')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('Latest band')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('Aiming at')}</th>
              </tr>
            </thead>
            <tbody>
              {testRows.map((row) => {
                /* The band this paper has to reach: the student's own minimum
                   when they set one in the course settings, otherwise their
                   overall target. Compared against the best band, because that
                   is what shows whether the paper is within reach. */
                const target = skillTargetFor(plan, row.key);
                const targetBand = target ? Number(target) : null;
                const short = targetBand !== null && row.best !== null ? Math.round((targetBand - row.best) * 10) / 10 : null;
                return (
                  <tr key={row.skill} className="border-t border-border">
                    <td className="px-4 py-2.5 font-medium">{row.skill}</td>
                    <td className="px-4 py-2.5">{row.count}</td>
                    <td className="px-4 py-2.5">{row.best?.toFixed(1) ?? <span className="text-ink-muted">{t('not yet')}</span>}</td>
                    <td className="px-4 py-2.5">{row.latest?.toFixed(1) ?? <span className="text-ink-muted">{t('not yet')}</span>}</td>
                    <td className="px-4 py-2.5">
                      {targetBand === null ? (
                        <span className="text-ink-muted">{t('no target')}</span>
                      ) : (
                        <>
                          <span className="font-medium">{targetBand.toFixed(1)}</span>
                          {short !== null && (
                            <span className={short <= 0 ? 'text-success' : 'text-ink-muted'}>
                              {short <= 0 ? t(' · reached') : t(' · {n} to go', { n: short.toFixed(1) })}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {plan?.skillTargets && (
          <p className="mt-2 text-xs text-ink-muted">
            {t('Your own minimum per paper is shown where you set one, otherwise your overall target of Band {band}. Change these in Course settings.', { band: plan.targetBand })}
          </p>
        )}
      </section>

      {/* ── Skill trends: four separate estimates, never joined into one
          line. See reportTrends.ts for why. ── */}
      <section>
        <h2 className="font-display text-lg font-bold">{t('Skill trends')}</h2>
        <div className="mt-3">
          <SkillTrendGrid panels={skillPanels} />
        </div>
      </section>

      {/* The four questions, per paper: what improved, what remains
          uncertain, what to work on next, and what changed in the schedule
          and why (brief section 9). Open by default so the page stays
          readable, and open in print. */}
      <section>
        <h2 className="font-display text-lg font-bold">{t('What each paper tells us')}</h2>
        <div className="mt-3 space-y-3">
          {narratives.map((narrative) => (
            <PaperDetail key={narrative.paper} narrative={narrative} t={t} />
          ))}
        </div>
      </section>

      {/* Teacher-review summary: everything a teacher would need to help,
          generated locally from the student's own data, never sent
          anywhere. Part of the same printable page (deliverable 5), so
          "Print or save as PDF" above already exports it. */}
      <TeacherReviewSummary
        t={t}
        tn={tn}
        goals={learningPlan.goals}
        policy={policy}
        recentEvidence={recentEvidence}
        mistakes={mistakes}
        planChanges={recentPlanChanges}
      />
    </div>
  );
}

/* One paper's four-question detail. */

function Line({ line, t }: { line: NarrativeLine; t: Translator['t'] }) {
  return <li>{t(line.template, line.vars)}</li>;
}

function PaperDetail({ narrative, t }: { narrative: ReturnType<typeof paperNarratives>[number]; t: Translator['t'] }) {
  return (
    <details className="report-detail rounded-card border border-border bg-surface p-4" open>
      <summary className="report-detail-summary font-display text-sm font-bold">
        {SKILL_LABEL[narrative.paper]}
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="report-detail-heading">{t('What improved')}</p>
          {narrative.improved.length > 0 ? (
            <ul className="report-detail-list">
              {narrative.improved.map((line_, i) => (
                <Line key={i} line={line_} t={t} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{t('Nothing to report yet from independent evidence alone.')}</p>
          )}
        </div>
        <div>
          <p className="report-detail-heading">{t('What remains uncertain')}</p>
          {narrative.uncertain.length > 0 ? (
            <ul className="report-detail-list">
              {narrative.uncertain.map((line_, i) => (
                <Line key={i} line={line_} t={t} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{t('Nothing flagged as uncertain right now.')}</p>
          )}
        </div>
        <div>
          <p className="report-detail-heading">{t('What to work on next')}</p>
          <p className="text-sm">{t(narrative.nextStep.template, narrative.nextStep.vars)}</p>
        </div>
        <div>
          <p className="report-detail-heading">{t('What changed in the schedule, and why')}</p>
          {narrative.scheduleChanges.length > 0 ? (
            <ul className="report-detail-list">
              {narrative.scheduleChanges.map((summary, i) => (
                // The planner's own sentence, quoted verbatim, never
                // translated (the same rule session.objective and
                // session.reason already follow everywhere on this site).
                <li key={i}>&ldquo;{summary}&rdquo;</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{t('No change to the schedule for this paper recently.')}</p>
          )}
        </div>
      </div>
    </details>
  );
}

/* Teacher-review summary. */

function GoalLine({ t, paper, band, status }: { t: Translator['t']; paper: string; band: number; status: string }) {
  return (
    <li>
      {t('{paper}: band {band} ({status})', { paper, band, status: t(status) })}
    </li>
  );
}

/** One `tn()` call per reason, literal, so the coverage scanner finds each
    counted phrase (the same discipline SkillTrendGrid.tsx already follows
    for freshness; see IGNORED_REASONS's doc comment in reportTrends.ts). */
function IgnoredReasonLine({ reason, count, tn }: { reason: IgnoredReason; count: number; tn: Translator['tn'] }) {
  switch (reason) {
    case 'blank':
      return <li>{tn(count, { one: '{n} submission was left blank, so it was not counted.', other: '{n} submissions were left blank, so they were not counted.' })}</li>;
    case 'abandoned':
      return <li>{tn(count, { one: '{n} attempt was abandoned partway through, so it was not counted.', other: '{n} attempts were abandoned partway through, so they were not counted.' })}</li>;
    case 'repeat-of-seen-material':
      return <li>{tn(count, { one: '{n} attempt was a repeat of material you had already seen, so it is not counted as new proof.', other: '{n} attempts were repeats of material you had already seen, so they are not counted as new proof.' })}</li>;
    case 'stub-graded':
      return <li>{tn(count, { one: '{n} result came from a stand-in grader, not the real one, so it was not counted.', other: '{n} results came from a stand-in grader, not the real one, so they were not counted.' })}</li>;
    case 'simulated':
      return <li>{tn(count, { one: '{n} result was simulated for testing, so it was not counted.', other: '{n} results were simulated for testing, so they were not counted.' })}</li>;
    case 'superseded':
      return <li>{tn(count, { one: '{n} result was replaced by a later, corrected one, so the earlier one was not counted.', other: '{n} results were replaced by later, corrected ones, so the earlier ones were not counted.' })}</li>;
    case 'stale-content-version':
      return <li>{tn(count, { one: '{n} result was about an older version of the material, so it was not counted.', other: '{n} results were about an older version of the material, so they were not counted.' })}</li>;
    case 'self-reported-claim':
      return <li>{tn(count, { one: '{n} score was told to us by you rather than measured here, so it is kept separate.', other: '{n} scores were told to us by you rather than measured here, so they are kept separate.' })}</li>;
    case 'older-than-window':
      return <li>{tn(count, { one: '{n} result is old enough that it no longer counts as current.', other: '{n} results are old enough that they no longer count as current.' })}</li>;
    default:
      return null;
  }
}

interface TeacherReviewSummaryProps {
  t: Translator['t'];
  tn: Translator['tn'];
  goals: ReturnType<typeof ensurePlan>['goals'];
  policy: ReturnType<typeof evaluateEvidence>;
  recentEvidence: ReturnType<typeof recentIndependentEvidence>;
  mistakes: ReturnType<typeof statedMistakeReasons>;
  planChanges: ReturnType<typeof ensurePlan>['history'];
}

function TeacherReviewSummary({ t, tn, goals, policy, recentEvidence, mistakes, planChanges }: TeacherReviewSummaryProps) {
  const ignoredByReason = new Map(policy.ignored.map((entry) => [entry.reason, entry.count]));

  return (
    <section>
      <h2 className="font-display text-lg font-bold">{t('Teacher review summary')}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {t('Generated locally from your own data and never sent anywhere. Print or save this whole page as a PDF to share it.')}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink-muted">{t('Goals')}</h3>
          <ul className="report-detail-list mt-2">
            {goals.overallTarget && (
              <GoalLine t={t} paper={t('Overall')} band={goals.overallTarget.band} status={goals.overallTarget.status === 'confirmed' ? nt('confirmed') : nt('provisional')} />
            )}
            {PAPERS.map((paper) => {
              const minimum = goals.perPaperMinimums[paper];
              if (!minimum) return null;
              return (
                <GoalLine
                  key={paper}
                  t={t}
                  paper={SKILL_LABEL[paper]}
                  band={minimum.band}
                  status={minimum.status === 'confirmed' ? nt('confirmed') : nt('provisional')}
                />
              );
            })}
            {!goals.overallTarget && Object.keys(goals.perPaperMinimums).length === 0 && (
              <li className="text-ink-muted">{t('No goal set yet.')}</li>
            )}
          </ul>
          {goals.selfReported.length > 0 && (
            <>
              <h4 className="mt-3 text-xs font-bold uppercase tracking-wide text-ink-muted">{t('Self-reported scores')}</h4>
              <ul className="report-detail-list mt-1">
                {goals.selfReported.map((score, i) => (
                  <li key={i}>
                    {score.paper
                      ? t('{paper}: band {band}, taken {date}', { paper: SKILL_LABEL[score.paper], band: score.band, date: fmtDate(score.takenOn) })
                      : t('Overall: band {band}, taken {date}', { band: score.band, date: fmtDate(score.takenOn) })}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink-muted">{t('Flagged for a teacher')}</h3>
          {policy.needsTeacherInput.length > 0 ? (
            <ul className="report-detail-list mt-2">
              {policy.needsTeacherInput.map((entry) => (
                <li key={entry.scopeKey}>
                  {t('{scope}: no improvement after {n} attempts in a row', {
                    scope: entry.scopeKey.split(':').slice(1).join(' ').replace(/-/g, ' '),
                    n: entry.consecutiveUnimprovedAttempts,
                  })}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">{t('Nothing currently flagged.')}</p>
          )}

          {policy.ignored.length > 0 && (
            <>
              <h4 className="mt-3 text-xs font-bold uppercase tracking-wide text-ink-muted">{t('How much was not counted, and why')}</h4>
              <ul className="report-detail-list mt-1">
                {IGNORED_REASONS.filter((reason) => (ignoredByReason.get(reason) ?? 0) > 0).map((reason) => (
                  <IgnoredReasonLine key={reason} reason={reason} count={ignoredByReason.get(reason) ?? 0} tn={tn} />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink-muted">{t('Recent independent evidence')}</h3>
        {recentEvidence.length > 0 ? (
          <ul className="report-detail-list mt-2">
            {recentEvidence.map((item, i) => (
              <li key={i}>
                {fmtDate(item.at)} · {SKILL_LABEL[item.paper]}
                {item.subskillLabel ? ` · ${item.subskillLabel}` : ''} · {t(item.summary.template, item.summary.vars)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">{t('No independent evidence recorded yet.')}</p>
        )}
      </div>

      {mistakes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink-muted">{t('The student\'s own account of mistakes')}</h3>
          <p className="mt-1 text-xs text-ink-muted">{t('In the student\'s own words. Never a finding on its own, always tentative.')}</p>
          <ul className="report-detail-list mt-2">
            {mistakes.map((item, i) => (
              <li key={i}>
                {fmtDate(item.at)} · {SKILL_LABEL[item.paper]}
                {item.subskillLabel ? ` · ${item.subskillLabel}` : ''} · {item.reasonId}
                {item.note ? `: "${item.note}"` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink-muted">{t('Recent plan changes')}</h3>
        {planChanges.length > 0 ? (
          <ul className="report-detail-list mt-2">
            {planChanges.map((change, i) => (
              <li key={i}>
                {fmtDate(change.at)} · &ldquo;{change.summary}&rdquo;
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">{t('No plan changes recorded yet.')}</p>
        )}
      </div>
    </section>
  );
}
