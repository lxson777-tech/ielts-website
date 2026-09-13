/* Speaking coach panel: the speaking twin of WritingCoachPanel. Replaces the
   old one-line structure cheat-sheet accordion with a tabbed coach that stays
   on screen while the student answers. Plan is an interactive stage checklist
   (A.R.E. / PEEL / OREO with timings), Phrases groups functional language as
   chips, Vocab surfaces the current topic's vocabulary as tap-to-reveal
   cards, Avoid lists the part's common mistakes. Mount with a key that
   changes per attempt so checked/revealed state resets for free. */

import { useState } from 'react';
import type { StructureMethod } from '../data/speaking-structure-guides';
import { SPEAKING_STRUCTURE_GUIDES } from '../data/speaking-structure-guides';
import type { TopicVocab } from '../lib/speaking/schema';
import Tabs, { type TabDef } from './Tabs';

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function SpeakingCoachPanel({ method, vocab }: { method: StructureMethod; vocab?: TopicVocab[] }) {
  const guide = SPEAKING_STRUCTURE_GUIDES[method];
  const hasVocab = !!vocab && vocab.length > 0;
  const tabs: TabDef[] = [
    { id: 'plan', label: 'Plan' },
    { id: 'phrases', label: 'Phrases' },
    ...(hasVocab ? [{ id: 'vocab', label: 'Vocab' }] : []),
    { id: 'avoid', label: 'Avoid' },
  ];

  const [active, setActive] = useState('plan');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <h3 className="font-display text-sm font-bold">
        Speaking coach: {guide.title}
        <span className="ml-1.5 font-semibold text-ink-muted">· {guide.part}</span>
      </h3>
      <Tabs tabs={tabs} active={active} onChange={setActive} className="mt-3" />

      {active === 'plan' && (
        <div id="tabpanel-plan" role="tabpanel" aria-labelledby="tab-plan" className="mt-4">
          <div className="mb-3 rounded-lg bg-brand-tint/60 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">How to answer</p>
            <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
              {guide.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            {guide.stages.map((stage) => {
              const isChecked = checked.has(stage.name);
              const isOpen = expanded.has(stage.name);
              return (
                <div key={stage.name} className="rounded-lg border border-border">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => setChecked((s) => toggle(s, stage.name))}
                      className="h-4 w-4 shrink-0 rounded border-border text-brand focus:ring-brand"
                      aria-label={`Mark "${stage.name}" done`}
                    />
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => toggle(s, stage.name))}
                      aria-expanded={isOpen}
                      className="flex flex-1 items-center justify-between gap-2 text-left text-sm font-semibold"
                    >
                      <span className={isChecked ? 'text-ink-muted line-through' : ''}>
                        {stage.name}
                        {stage.timing && <span className="ml-1.5 font-normal text-ink-muted">({stage.timing})</span>}
                      </span>
                      <span aria-hidden="true" className="shrink-0 text-ink-muted">
                        {isOpen ? '▾' : '▸'}
                      </span>
                    </button>
                  </div>
                  {/* The clip wrapper must stay padding-free: padding on it sets a
                      floor on the collapsed 0fr track and leaks clipped text. */}
                  <div className={`grid-reveal ${isOpen ? 'is-open' : ''}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="px-3 pb-3 pl-9">
                        <p className="text-sm text-ink-muted">{stage.description}</p>
                        {stage.phrases.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {stage.phrases.map((phrase) => (
                              <span key={phrase} className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-semibold text-brand">
                                {phrase}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {active === 'phrases' && (
        <div id="tabpanel-phrases" role="tabpanel" aria-labelledby="tab-phrases" className="mt-4 space-y-3">
          {guide.language.map((row) => (
            <div key={row.job}>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{row.job}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {row.phrases.map((phrase) => (
                  <span key={phrase} className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand">
                    {phrase}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {active === 'vocab' && hasVocab && (
        <div id="tabpanel-vocab" role="tabpanel" aria-labelledby="tab-vocab" className="mt-4 space-y-2.5">
          <p className="text-xs text-ink-muted">Topic words to work into your answers. Tap to see what they mean.</p>
          {vocab.map((v) => {
            const isOpen = revealed.has(v.phrase);
            return (
              <div
                key={v.phrase}
                className="rounded-lg border border-[var(--color-vocabulary)]/25 bg-[var(--color-vocabulary-tint)]/60 p-3"
              >
                <button
                  type="button"
                  onClick={() => setRevealed((s) => toggle(s, v.phrase))}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-2 text-left text-sm font-bold text-[var(--color-vocabulary)]"
                >
                  <span>{v.phrase}</span>
                  <span aria-hidden="true" className="shrink-0">
                    {isOpen ? '▾' : '▸'}
                  </span>
                </button>
                <div className={`grid-reveal ${isOpen ? 'is-open' : ''}`}>
                  <div className="min-h-0 overflow-hidden">
                    <p className="pt-2 text-sm text-ink-muted">{v.meaning}</p>
                    <p className="mt-1.5 border-l-2 border-[var(--color-vocabulary)]/40 pl-2.5 text-sm italic text-ink-muted">
                      {v.example}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {active === 'avoid' && (
        <div id="tabpanel-avoid" role="tabpanel" aria-labelledby="tab-avoid" className="mt-4 flex flex-wrap gap-1.5">
          {guide.mistakes.map((m, i) => (
            <span key={i} className="rounded-full bg-error-tint px-2.5 py-0.5 text-xs font-semibold text-error">
              ⚠ {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
