/* The band ladder at /learn/bands: what every band needs, for each Writing and
   Speaking criterion, browsable before a student has ever been graded.

   Everything here comes from src/data/band-guides.ts, which is a plain-language
   rephrasing of the official public band descriptors (quoted verbatim inside
   the two grader Workers). Nothing is invented here, and nothing is a band
   score for the student: this is the ladder, the band report says where they
   are standing on it.

   Deliberately one step at a time rather than a wall of five: a student who
   wants the whole ladder can open the steps below the one they picked. */

import { useState } from 'react';
import { WRITING_BAND_GUIDES, SPEAKING_BAND_GUIDES, type BandStepGuide } from '../data/band-guides';
import { CRITERIA } from '../lib/writing/schema';
import { SPEAKING_CRITERIA } from '../lib/speaking/schema';
import Tabs, { type TabDef } from './Tabs';
import { useT } from '../lib/i18n/react';

/* step.whatChanges / doThis / stopThis / example.why / practice / task1Note
   come from src/data/band-guides.ts, a plain-language rephrasing of the
   official band descriptors. They are marked with nt() there and translated
   here through the lazily loaded "band-guides" dictionary part, so a student
   who never opens this page never downloads it.

   example.before and example.after stay English on purpose: they are the
   sentences a student writes, and the whole point of the pair is to see the
   difference between them. PAPERS, WRITING_TABS and SPEAKING_TABS are the
   protected paper names and the four assessment criteria names, which always
   stay English, so they are deliberately not wrapped either. */

type Paper = 'writing' | 'speaking';

const PAPERS: TabDef[] = [
  { id: 'writing', label: 'Writing' },
  { id: 'speaking', label: 'Speaking' },
];

/* Task 1 is marked on Task Achievement and Task 2 on Task Response. The guides
   follow the Task 2 scale and flag the Task 1 difference in task1Note, so the
   label names both rather than pretending there is only one. */
const WRITING_TABS: TabDef[] = CRITERIA.map((c) => ({
  id: c.key,
  label: c.task1Label ? `${c.label} / ${c.task1Label}` : c.label,
}));

const SPEAKING_TABS: TabDef[] = SPEAKING_CRITERIA.map((c) => ({ id: c.key, label: c.label }));

function guidesFor(paper: Paper, criterion: string): BandStepGuide[] {
  const bank = paper === 'writing' ? WRITING_BAND_GUIDES : SPEAKING_BAND_GUIDES;
  return (bank as Record<string, BandStepGuide[]>)[criterion] ?? [];
}

function StepCard({ step, open }: { step: BandStepGuide; open: boolean }) {
  const { t } = useT('band-guides');
  return (
    <details open={open} className="group rounded-card border border-border bg-surface shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-base font-bold">
          {t('Band {from} to band {to}', { from: step.from, to: step.to })}
        </span>
        <span
          className="inline-block text-xs text-ink-muted transition-transform duration-200 group-open:rotate-90"
          aria-hidden="true"
        >
          ▶
        </span>
      </summary>

      <div className="space-y-4 border-t border-border px-5 py-4 text-sm leading-relaxed text-ink-muted">
        <p>{t(step.whatChanges)}</p>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink">{t('Do this')}</p>
          <ul className="mt-1.5 space-y-1.5">
            {step.doThis.map((d) => (
              <li key={d} className="flex gap-2">
                <span aria-hidden="true" className="text-success">
                  ✓
                </span>
                <span>{t(d)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink">{t('Stop this')}</p>
          <ul className="mt-1.5 space-y-1.5">
            {step.stopThis.map((s) => (
              <li key={s} className="flex gap-2">
                <span aria-hidden="true" className="text-error">
                  ✕
                </span>
                <span>{t(s)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-surface-alt p-3">
          <p className="italic">&ldquo;{step.example.before}&rdquo;</p>
          <p className="mt-2 text-success">{step.example.after}</p>
          <p className="mt-2 text-xs">{t(step.example.why)}</p>
        </div>

        <p className="rounded-lg bg-brand-tint/60 px-3 py-2.5 text-ink">
          <span className="font-bold">{t('Practice today.')} </span>
          {t(step.practice)}
        </p>

        {step.task1Note && (
          <p className="rounded-lg bg-warning-tint px-3 py-2.5">
            <span className="font-bold text-ink">{t('Task 1 is different.')} </span>
            {t(step.task1Note)}
          </p>
        )}
      </div>
    </details>
  );
}

export default function BandLadder() {
  // Asked for here too, not only in StepCard, so the fetch starts with the
  // page rather than with the first card that happens to render.
  const { t } = useT('band-guides');
  const [paper, setPaper] = useState<Paper>('writing');
  const [writingCriterion, setWritingCriterion] = useState<string>(CRITERIA[0]!.key);
  const [speakingCriterion, setSpeakingCriterion] = useState<string>(SPEAKING_CRITERIA[0]!.key);
  /* Which step opens first. Not a score and not a guess about the student:
     they say where they are, and the ladder opens at that rung. */
  const [from, setFrom] = useState(6);

  const criterion = paper === 'writing' ? writingCriterion : speakingCriterion;
  const steps = guidesFor(paper, criterion);

  return (
    <div className="space-y-5">
      <Tabs tabs={PAPERS} active={paper} onChange={(id) => setPaper(id as Paper)} />

      <Tabs
        tabs={paper === 'writing' ? WRITING_TABS : SPEAKING_TABS}
        active={criterion}
        onChange={paper === 'writing' ? setWritingCriterion : setSpeakingCriterion}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-muted">{t('Where are you now?')}</span>
        {[4, 5, 6, 7, 8].map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setFrom(b)}
            aria-pressed={from === b}
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
              from === b
                ? 'bg-brand text-white'
                : 'border border-border bg-surface text-ink-muted hover:border-brand hover:text-brand'
            }`}
          >
            {t('Band {n}', { n: b })}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <StepCard key={`${paper}-${criterion}-${step.from}`} step={step} open={step.from === from} />
        ))}
      </div>

      <p className="rounded-card border border-border bg-surface-alt px-4 py-3 text-xs text-ink-muted">
        {t('Every band on this page is the official public band descriptor for that criterion, put into plain words. In Writing and Speaking the examiner gives a whole band for each of the four criteria, and the band for the paper is the average of those four, reported in whole and half bands.')}
      </p>
    </div>
  );
}
