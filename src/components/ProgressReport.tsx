/* The printable progress report at /report: one page a student (or their
   teacher) can save as a PDF, pulling together the study plan, lessons
   completed, test history, weakest/strongest question types, and the daily
   streak. Reads the same localStorage stores as the rest of the account
   pages (progress.ts, study-plan.ts, plan/streak.ts) — nothing here is
   stored separately except the optional name field, which is cosmetic only
   and kept in its own small key so it never touches the shared progress
   shape. */

import { useEffect, useState } from 'react';
import {
  getProgress,
  getAttempts,
  getWritingAttempts,
  getSpeakingAttempts,
  getBestBand,
  getBestWritingBand,
  getBestSpeakingBand,
  getTypeStats,
  getActivity,
} from '../lib/progress';
import { loadStudyPlan, daysUntilTest, skillTargetFor, type PlanSkill, type SavedPlan } from '../lib/study-plan';
import { getStreak } from '../lib/plan/streak';
import { buildCourse } from '../lib/course';
import { LABELS } from './TypeAnalytics';
import type { Skill } from '../data/lessons';
import WeeklyReview from './tutor/WeeklyReview';

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

const SKILL_LABEL: Record<Skill, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
  vocabulary: 'Vocabulary',
};

const SKILL_COLOR: Record<'reading' | 'listening' | 'writing' | 'speaking', string> = {
  reading: 'var(--color-reading)',
  listening: 'var(--color-listening)',
  writing: 'var(--color-writing)',
  speaking: 'var(--color-speaking)',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

interface TrendPoint {
  at: string;
  band: number;
  skill: 'reading' | 'listening' | 'writing' | 'speaking';
  label: string;
}

/** One combined chronological trend across every scored paper, so the
    report shows a single trajectory rather than four separate charts.
    Built by hand instead of reusing ScoreHistory's chart, which only reads
    one skill's reading/listening attempts internally and has no prop for
    handing it a mixed dataset. */
function BandTrend({ points }: { points: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;

  const W = 640;
  const H = 200;
  const PAD = { top: 16, right: 16, bottom: 24, left: 34 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const yMin = 3;
  const yMax = 9;

  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (band: number) =>
    PAD.top + innerH - ((Math.max(yMin, Math.min(yMax, band)) - yMin) / (yMax - yMin)) * innerH;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.band).toFixed(1)}`).join(' ');
  const gridBands = [4, 5, 6, 7, 8, 9];

  return (
    <figure className="mt-4 overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Band score across every scored attempt, oldest to newest" className="w-full max-w-2xl" onMouseLeave={() => setHover(null)}>
        {gridBands.map((b) => (
          <g key={b}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(b)} y2={y(b)} stroke="var(--color-border)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(b) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-muted)">
              {b}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="var(--color-brand,#e76f51)" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.band)} r="10" fill="transparent" onMouseEnter={() => setHover(i)} />
            <circle cx={x(i)} cy={y(p.band)} r="4" fill={SKILL_COLOR[p.skill]} stroke="var(--color-surface)" strokeWidth="2" pointerEvents="none" />
          </g>
        ))}
        {hover !== null && (
          <g pointerEvents="none">
            {(() => {
              const p = points[hover]!;
              const tx = Math.min(Math.max(x(hover), PAD.left + 66), W - PAD.right - 66);
              const ty = y(p.band);
              const above = ty > 60;
              return (
                <g transform={`translate(${tx},${above ? ty - 12 : ty + 12})`}>
                  <rect x="-66" y={above ? -34 : 0} width="132" height="34" rx="6" fill="var(--color-ink)" opacity="0.92" />
                  <text x="0" y={above ? -21 : 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
                    {p.label} · Band {p.band.toFixed(1)}
                  </text>
                  <text x="0" y={above ? -9 : 25} textAnchor="middle" fontSize="9" fill="#fff" opacity="0.75">
                    {fmtDate(p.at)}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
    </figure>
  );
}

export default function ProgressReport() {
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

  const trend: TrendPoint[] = [
    ...readingAttempts.map((a) => ({ at: a.attempt.at, band: a.attempt.band, skill: 'reading' as const, label: 'Reading' })),
    ...listeningAttempts.map((a) => ({ at: a.attempt.at, band: a.attempt.band, skill: 'listening' as const, label: 'Listening' })),
    ...writingAttempts.map((a) => ({ at: a.attempt.at, band: a.attempt.overallBand, skill: 'writing' as const, label: 'Writing' })),
    ...speakingAttempts.map((a) => ({ at: a.at, band: a.overallBand, skill: 'speaking' as const, label: 'Speaking' })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const typeStats = [
    ...getTypeStats('reading').map((t) => ({ ...t, skill: 'Reading' })),
    ...getTypeStats('listening').map((t) => ({ ...t, skill: 'Listening' })),
  ].filter((t) => t.total > 0);
  const withPct = typeStats.map((t) => ({ ...t, pct: Math.round((t.correct / t.total) * 100) }));
  const weakest = withPct.length ? withPct.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
  const strongest = withPct.length ? withPct.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;

  return (
    <div className="space-y-10">
      <div className="report-print-hide flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-sm">
          <label htmlFor="report-name" className="text-xs font-bold uppercase tracking-wide text-ink-muted">
            Student name (optional)
          </label>
          <input
            id="report-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              saveName(e.target.value);
            }}
            placeholder="Add a name for the printout"
            className="mt-1.5 w-full rounded-button border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="shrink-0 rounded-button bg-brand px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-brand-hover"
        >
          Print or save as PDF
        </button>
      </div>

      {/* ── Print header: only visible on the printed page, see the @media print rule ── */}
      <div className="report-print-only hidden">
        <h1 className="font-display text-2xl font-extrabold">{name ? `${name}'s progress report` : 'Progress report'}</h1>
        <p className="mt-1 text-sm text-ink-muted">Generated {fmtDate(new Date().toISOString())} · IELTS is EZ</p>
      </div>

      <WeeklyReview />

      {/* ── Plan summary ── */}
      <section>
        <h2 className="font-display text-lg font-bold">Study plan</h2>
        {plan ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-card border border-border bg-surface p-4">
              <p className="text-xs text-ink-muted">Target band</p>
              <p className="mt-1 font-display text-xl font-extrabold">{plan.targetBand}</p>
            </div>
            <div className="rounded-card border border-border bg-surface p-4">
              <p className="text-xs text-ink-muted">Test date</p>
              <p className="mt-1 font-display text-xl font-extrabold">{plan.testDate || 'Not set'}</p>
            </div>
            <div className="rounded-card border border-border bg-surface p-4">
              <p className="text-xs text-ink-muted">Days to go</p>
              <p className="mt-1 font-display text-xl font-extrabold">
                {days ?? <span className="text-sm font-normal text-ink-muted">not yet</span>}
              </p>
            </div>
            <div className="rounded-card border border-border bg-surface p-4">
              <p className="text-xs text-ink-muted">Started</p>
              <p className="mt-1 font-display text-xl font-extrabold">{plan.startDate ?? plan.createdAt.slice(0, 10)}</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">No study plan set up yet.</p>
        )}
      </section>

      {/* ── Streak and study time ── */}
      <section>
        <h2 className="font-display text-lg font-bold">Consistency</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-surface p-4">
            <p className="text-xs text-ink-muted">Current streak</p>
            <p className="mt-1 font-display text-xl font-extrabold">
              {streak} day{streak === 1 ? '' : 's'}
            </p>
          </div>
          <div className="rounded-card border border-border bg-surface p-4">
            <p className="text-xs text-ink-muted">Total study time logged</p>
            <p className="mt-1 font-display text-xl font-extrabold">
              {Math.round(totalMinutes / 60)}h {totalMinutes % 60}m
            </p>
          </div>
        </div>
      </section>

      {/* ── Lessons completed per skill ── */}
      <section>
        <h2 className="font-display text-lg font-bold">Lessons completed</h2>
        <div className="mt-3 overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 font-semibold">Skill</th>
                <th className="px-4 py-2.5 font-semibold">Completed</th>
              </tr>
            </thead>
            <tbody>
              {lessonsBySkill.map((row) => (
                <tr key={row.skill} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium">{SKILL_LABEL[row.skill]}</td>
                  <td className="px-4 py-2.5">
                    {row.done} / {row.total}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border bg-surface-alt font-semibold">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5">
                  {lessonsBySkill.reduce((n, r) => n + r.done, 0)} / {lessonsBySkill.reduce((n, r) => n + r.total, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Tests taken per skill ── */}
      <section>
        <h2 className="font-display text-lg font-bold">Test results</h2>
        <div className="mt-3 overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 font-semibold">Skill</th>
                <th className="px-4 py-2.5 font-semibold">Attempts</th>
                <th className="px-4 py-2.5 font-semibold">Best band</th>
                <th className="px-4 py-2.5 font-semibold">Latest band</th>
                <th className="px-4 py-2.5 font-semibold">Aiming at</th>
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
                    <td className="px-4 py-2.5">{row.best?.toFixed(1) ?? <span className="text-ink-muted">not yet</span>}</td>
                    <td className="px-4 py-2.5">{row.latest?.toFixed(1) ?? <span className="text-ink-muted">not yet</span>}</td>
                    <td className="px-4 py-2.5">
                      {targetBand === null ? (
                        <span className="text-ink-muted">no target</span>
                      ) : (
                        <>
                          <span className="font-medium">{targetBand.toFixed(1)}</span>
                          {short !== null && (
                            <span className={short <= 0 ? 'text-success' : 'text-ink-muted'}>
                              {short <= 0 ? ' · reached' : ` · ${short.toFixed(1)} to go`}
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
            Your own minimum per paper is shown where you set one, otherwise your overall target of Band{' '}
            {plan.targetBand}. Change these in Course settings.
          </p>
        )}
        {trend.length >= 2 ? (
          <BandTrend points={trend} />
        ) : (
          <p className="mt-3 text-sm text-ink-muted">Band trend appears once you have at least two scored attempts.</p>
        )}
      </section>

      {/* ── Weakest / strongest question types ── */}
      <section>
        <h2 className="font-display text-lg font-bold">Question types</h2>
        {weakest && strongest ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-error/40 bg-error-tint p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-error">Weakest</p>
              <p className="mt-1 font-display text-base font-bold">
                {LABELS[weakest.type] ?? weakest.type} ({weakest.skill})
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {weakest.correct} / {weakest.total} correct · {weakest.pct}%
              </p>
            </div>
            <div className="rounded-card border border-success/40 bg-success-tint p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-success">Strongest</p>
              <p className="mt-1 font-display text-base font-bold">
                {LABELS[strongest.type] ?? strongest.type} ({strongest.skill})
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {strongest.correct} / {strongest.total} correct · {strongest.pct}%
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">Take a Reading or Listening test to see your weak spots here.</p>
        )}
      </section>
    </div>
  );
}
