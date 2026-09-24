/* The report screen shared by every AI-graded skill checker: band header,
   per-criterion cards with a "next band" tip, and strengths/improvements.
   Extracted from WritingTester so Writing and Speaking (and any future
   skill) render results identically instead of drifting apart. Skill-specific
   blocks (Writing's mechanics/moments, Speaking's acoustic stats/moments)
   render via `children`, slotted between the criteria grid and the
   strengths/improvements cards.

   Two layers of "reach the next band" advice sit inside each criterion card:
   `nextBand` is the AI examiner's dynamic read of this specific piece of
   work (a gap sentence plus 2-3 actions, some quoting the student's own
   words); `guide` is the static step-by-step playbook for that band
   transition (src/data/band-guides.ts), shown collapsed underneath. The
   dynamic advice speaks to this attempt, the static guide is the general
   method behind it. */

import { motion, MotionConfig } from 'framer-motion';
import type { NextBandAdvice } from '../lib/grading/next-band';
import type { BandStepGuide } from '../data/band-guides';
import { withBase } from '../lib/url';
import { useT } from '../lib/i18n/react';

export interface BandReportCriterion {
  key: string;
  label: string;
  band: number;
  comment: string;
  tip?: string;
  /** the AI examiner's specific advice for this attempt */
  nextBand?: NextBandAdvice;
  /** the static playbook for this band transition, picked via guideFor() */
  guide?: BandStepGuide;
}

export interface BandReportProps {
  /** shown next to the AI/sample badge, e.g. the prompt title or topic */
  title: string;
  overallBand: number;
  live: boolean;
  /** shown only when `live` is false, explaining what the sample grader can't do */
  offlineWarning: string;
  criteria: BandReportCriterion[];
  strengths: string[];
  improvements: string[];
  /** 3 to 5 numbered priority steps; when present, replaces the "Improve next" card */
  actionPlan?: string[];
  children?: React.ReactNode;
}

export default function BandReport({
  title,
  overallBand,
  live,
  offlineWarning,
  criteria,
  strengths,
  improvements,
  actionPlan,
  children,
}: BandReportProps) {
  // 'band-guides' is the lazily loaded dictionary part holding the band
  // playbooks (src/lib/i18n/dict/parts.ts). example.before / example.after
  // stay English: they are the sentences the student writes.
  const { t } = useT('band-guides');
  return (
    <>
      <div className="rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          {live ? `✨ ${t('AI-assessed')}` : t('Sample assessment (offline)')} · {title}
        </p>
        <p className="band-score-pop mt-2 font-display text-5xl font-extrabold text-brand">{overallBand.toFixed(1)}</p>
        <p className="mt-1 text-sm text-ink-muted">{t('Estimated overall band')}</p>
        {!live && (
          <p className="mx-auto mt-3 max-w-md rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
            ⚠ {offlineWarning}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ListCard title={`✓ ${t('Strengths')}`} items={strengths} tone="success" />
        {actionPlan && actionPlan.length > 0 ? (
          <ActionPlanCard steps={actionPlan} />
        ) : (
          <ListCard title={t('Improve next')} items={improvements} tone="brand" />
        )}
      </div>


      <MotionConfig reducedMotion="user">
        <motion.div
          className="grid gap-4 sm:grid-cols-2 sm:items-start"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
        >
          {criteria.map((c) => {
            const targetBand = c.nextBand?.target ?? Math.min(9, c.band + 1);
            return (
              <motion.div
                key={c.key}
                className="flex flex-col rounded-card border border-border bg-surface p-4 shadow-card"
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{c.label}</span>
                  <span className="rounded-full bg-brand-tint px-2.5 py-0.5 font-display text-sm font-extrabold text-brand">
                    {c.band.toFixed(1)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">{c.comment}</p>

                {(c.tip || c.nextBand) && (
                  <details className="criterion-advice space-y-3 pt-3"><summary>{t('How to improve this criterion')}</summary>
                    {c.tip && (
                      <p>
                        <span className="block rounded-lg bg-brand-tint/60 px-2.5 py-1.5 text-xs text-ink">
                          <strong className="text-brand">{t('Band {band}:', { band: targetBand })}</strong> {c.tip}
                        </span>
                      </p>
                    )}

                    {c.nextBand && (
                      <div className="rounded-lg border border-border bg-surface-alt/60 p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-brand">
                          {t('Reach band {band}', { band: c.nextBand.target })}
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{c.nextBand.gap}</p>

                        <ol className="mt-2.5 space-y-2.5">
                          {c.nextBand.actions.map((a, i) => (
                            <li key={i} className="text-xs leading-relaxed">
                              <span className="flex gap-1.5">
                                <span className="shrink-0 font-display font-bold text-brand">{i + 1}.</span>
                                <span className="text-ink">{a.do}</span>
                              </span>
                              {a.from && (
                                <span className="mt-1 block pl-[1.15rem] italic text-ink-muted">
                                  &ldquo;{a.from}&rdquo;
                                </span>
                              )}
                              {a.to && (
                                <span className="ml-[1.15rem] mt-1 block rounded bg-success-tint px-2 py-1 text-success">
                                  {a.to}
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>

                        {c.guide && (
                          <details className="group mt-3 border-t border-border pt-2.5">
                            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-brand [&::-webkit-details-marker]:hidden">
                              {t('Full guide: band {from} to {to}', { from: c.guide.from, to: c.guide.to })}
                              <span
                                className="inline-block text-[0.6rem] transition-transform duration-200 group-open:rotate-90"
                                aria-hidden="true"
                              >
                                ▶
                              </span>
                            </summary>
                            <div className="mt-2.5 space-y-3 text-xs leading-relaxed text-ink-muted">
                              <p>{t(c.guide.whatChanges)}</p>

                              <div>
                                <p className="font-semibold text-ink">{t('Do this')}</p>
                                <ul className="mt-1 space-y-1">
                                  {c.guide.doThis.map((d) => (
                                    <li key={d} className="flex gap-1.5">
                                      <span aria-hidden="true">·</span>
                                      <span>{t(d)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <p className="font-semibold text-ink">{t('Stop this')}</p>
                                <ul className="mt-1 space-y-1">
                                  {c.guide.stopThis.map((s) => (
                                    <li key={s} className="flex gap-1.5">
                                      <span aria-hidden="true">·</span>
                                      <span>{t(s)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="rounded-lg border border-border bg-surface p-2.5">
                                <p className="italic">&ldquo;{c.guide.example.before}&rdquo;</p>
                                <p className="mt-1.5 text-success">{c.guide.example.after}</p>
                                <p className="mt-1.5">{t(c.guide.example.why)}</p>
                              </div>

                              <p>
                                <span className="font-semibold text-ink">{t('Practice today:')} </span>
                                {t(c.guide.practice)}
                              </p>

                              {c.guide.task1Note && <p className="italic">{t(c.guide.task1Note)}</p>}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </details>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </MotionConfig>

      {children}


      {/* The report says which rung the student is on. The ladder itself, every
          band for every criterion, lives on one browsable page. */}
      <a
        href={withBase('/learn/bands')}
        className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-5 py-4 text-sm shadow-card transition-colors hover:border-brand"
      >
        <span>
          <span className="font-display font-bold text-ink">{t('What each band needs')}</span>
          <span className="mt-0.5 block text-ink-muted">
            {t('The official descriptors for every criterion, in plain words.')}
          </span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-brand">
          →
        </span>
      </a>
    </>
  );
}

function ActionPlanCard({ steps }: { steps: string[] }) {
  const { t } = useT();
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className="font-display font-bold text-brand">↗ {t('Your action plan')}</h3>
      <ol className="mt-2.5 space-y-2.5 text-sm text-ink-muted">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-tint font-display text-xs font-extrabold text-brand">
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ListCard({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'brand' }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h3 className={`font-display font-bold ${tone === 'success' ? 'text-success' : 'text-brand'}`}>{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
        {items.map((s) => (
          <li key={s} className="flex gap-2">
            <span aria-hidden="true">·</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
