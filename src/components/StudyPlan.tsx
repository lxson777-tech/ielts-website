/* "Start Here" study-plan builder. The single most-requested thing from user
   testing across every preparation level: nervous beginners and last-minute
   crammers alike land on the site and don't know what to do first. This takes
   a target band and a test date, buckets the time left into an intensity tier,
   and lays out an ordered, checkable plan that links straight to the real
   features (tests, trainers, lessons). Progress is stored in localStorage so
   the plan persists and feels like something you work through, not a one-off. */

import { useEffect, useState } from 'react';
import { withBase } from '../lib/url';
import {
  loadStudyPlan,
  saveStudyPlan,
  onStudyPlanChange,
  daysUntilTest,
  planTierFor,
  buildStudyPlanStages,
  PLAN_TIER_LABEL,
  type SavedPlan,
} from '../lib/study-plan';

const TARGET_BANDS = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0'];

export default function StudyPlan() {
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [ready, setReady] = useState(false);
  // form state
  const [targetBand, setTargetBand] = useState('6.5');
  const [testDate, setTestDate] = useState('');

  useEffect(() => {
    const saved = loadStudyPlan();
    if (saved) {
      setPlan(saved);
      setTargetBand(saved.targetBand);
      setTestDate(saved.testDate);
    }
    setReady(true);
    // If a cloud sync (from another device) updates the plan while this is
    // open, pick it up rather than showing a stale local copy.
    return onStudyPlanChange(() => setPlan(loadStudyPlan()));
  }, []);

  if (!ready) return null; // avoid a hydration flash

  function createPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: SavedPlan = {
      targetBand,
      testDate,
      createdAt: new Date().toISOString(),
      done: [],
    };
    saveStudyPlan(next);
    setPlan(next);
  }

  function toggleStep(idx: number) {
    if (!plan) return;
    const done = plan.done.includes(idx) ? plan.done.filter((i) => i !== idx) : [...plan.done, idx];
    const next = { ...plan, done };
    saveStudyPlan(next);
    setPlan(next);
  }

  function startOver() {
    setPlan(null);
  }

  /* ── Form ── */
  if (!plan) {
    return (
      <form
        onSubmit={createPlan}
        className="mx-auto max-w-xl rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
      >
        <h2 className="font-display text-xl font-extrabold">Build your plan</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Two quick questions and we'll lay out exactly what to do, in order.
        </p>

        <label className="mt-6 block text-sm font-semibold" htmlFor="target-band">
          What band are you aiming for?
        </label>
        <select
          id="target-band"
          value={targetBand}
          onChange={(e) => setTargetBand(e.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 font-semibold focus:border-brand focus:outline-none"
        >
          {TARGET_BANDS.map((b) => (
            <option key={b} value={b}>
              Band {b}
            </option>
          ))}
        </select>

        <label className="mt-5 block text-sm font-semibold" htmlFor="test-date">
          When is your test? <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="test-date"
          type="date"
          value={testDate}
          onChange={(e) => setTestDate(e.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 font-semibold focus:border-brand focus:outline-none"
        />
        <p className="mt-1.5 text-xs text-ink-muted">
          No date yet? Leave it blank for a steady foundation plan.
        </p>

        <button
          type="submit"
          className="mt-7 w-full rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-brand-hover"
        >
          Show my plan →
        </button>
      </form>
    );
  }

  /* ── Generated plan ── */
  const days = daysUntilTest(plan.testDate);
  const tier = planTierFor(days);
  const stages = buildStudyPlanStages(days);
  const totalSteps = stages.reduce((n, s) => n + s.steps.length, 0);
  const doneCount = plan.done.length;
  const pct = totalSteps ? Math.round((doneCount / totalSteps) * 100) : 0;

  let flatIndex = -1; // running index across all stages, matching how done[] is keyed

  return (
    <div className="mx-auto max-w-2xl">
      {/* summary header */}
      <div className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand">
            {PLAN_TIER_LABEL[tier]}
          </span>
          <span className="text-sm text-ink-muted">
            Target <strong className="text-ink">Band {plan.targetBand}</strong>
            {days !== null && (
              <>
                {' '}· <strong className="text-ink">{days}</strong> day{days === 1 ? '' : 's'} to go
              </>
            )}
          </span>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span>
              {doneCount} of {totalSteps} steps done
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* stages */}
      <div className="mt-6 space-y-6">
        {stages.map((stage) => (
          <section key={stage.title} className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <h3 className="font-display text-lg font-bold">{stage.title}</h3>
            <p className="mt-1 text-sm text-ink-muted">{stage.blurb}</p>
            <ul className="mt-4 space-y-2.5">
              {stage.steps.map((step) => {
                flatIndex += 1;
                const idx = flatIndex;
                const checked = plan.done.includes(idx);
                return (
                  <li key={idx} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStep(idx)}
                      aria-label={`Mark step complete: ${step.label}`}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
                    />
                    <span className={`text-sm ${checked ? 'text-ink-muted line-through' : 'text-ink'}`}>
                      {step.label}
                      {step.href && (
                        <>
                          {' '}
                          <a
                            href={withBase(step.href)}
                            className="font-semibold text-brand hover:underline"
                          >
                            Open →
                          </a>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">Your plan and progress are saved on this device.</p>
        <button
          type="button"
          onClick={startOver}
          className="text-xs font-semibold text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          Start over / change answers
        </button>
      </div>
    </div>
  );
}
