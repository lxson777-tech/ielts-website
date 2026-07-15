/* Writing checker sidebar: a tabbed coach instead of one accordion that dumps
   the whole structure guide as a wall of text. Plan is an interactive
   paragraph checklist, Language groups the functional phrases as chips,
   Vocabulary surfaces the prompt's topic-specific suggestedVocab as
   tap-to-reveal cards, Avoid keeps the common-mistakes chips. Mount with a
   `key={prompt.id}` from the caller so switching tasks resets all local UI
   state (active tab, checked/expanded rows, revealed cards) for free. */

import { useState } from 'react';
import type { EssayPrompt } from '../lib/writing/schema';
import { WRITING_STRUCTURES, PROMPT_VARIANT_STRUCTURE } from '../data/writing-structures';
import Tabs, { type TabDef } from './Tabs';

const TABS: TabDef[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'language', label: 'Language' },
  { id: 'vocab', label: 'Vocabulary' },
  { id: 'avoid', label: 'Avoid' },
];

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function WritingCoachPanel({ prompt }: { prompt: EssayPrompt }) {
  const structureKey = PROMPT_VARIANT_STRUCTURE[prompt.variant];
  const guide = structureKey ? WRITING_STRUCTURES[structureKey] : null;

  const [active, setActive] = useState('plan');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  if (!guide) return null;

  function copyPhrase(phrase: string) {
    navigator.clipboard
      .writeText(phrase)
      .then(() => {
        setCopied(phrase);
        setTimeout(() => setCopied((c) => (c === phrase ? null : c)), 1200);
      })
      .catch(() => {
        /* clipboard permission denied — nothing to fall back to */
      });
  }

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <h3 className="font-display text-sm font-bold">Writing coach: {guide.label}</h3>
      <Tabs tabs={TABS} active={active} onChange={setActive} className="mt-3" />

      {active === 'plan' && (
        <div id="tabpanel-plan" role="tabpanel" aria-labelledby="tab-plan" className="mt-4">
          {guide.notes && guide.notes.length > 0 && (
            <div className="mb-3 rounded-lg bg-brand-tint/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">What to look for</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
                {guide.notes.map((n) => (
                  <li key={n} className="flex gap-2">
                    <span aria-hidden="true">·</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-2">
            {guide.paragraphs.map((p) => {
              const isChecked = checked.has(p.name);
              const isOpen = expanded.has(p.name);
              return (
                <div key={p.name} className="rounded-lg border border-border">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => setChecked((s) => toggle(s, p.name))}
                      className="h-4 w-4 shrink-0 rounded border-border text-brand focus:ring-brand"
                      aria-label={`Mark "${p.name}" done`}
                    />
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => toggle(s, p.name))}
                      aria-expanded={isOpen}
                      className="flex flex-1 items-center justify-between gap-2 text-left text-sm font-semibold"
                    >
                      <span className={isChecked ? 'text-ink-muted line-through' : ''}>{p.name}</span>
                      <span aria-hidden="true" className="shrink-0 text-ink-muted">
                        {isOpen ? '▾' : '▸'}
                      </span>
                    </button>
                  </div>
                  <div className={`grid-reveal px-3 ${isOpen ? 'is-open' : ''}`}>
                    <div className="min-h-0 overflow-hidden pb-3 text-sm text-ink-muted">{p.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {active === 'language' && (
        <div id="tabpanel-language" role="tabpanel" aria-labelledby="tab-language" className="mt-4 space-y-3">
          {guide.language.map((row) => (
            <div key={row.job}>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{row.job}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {row.phrases.split(' / ').map((phrase) => (
                  <span key={phrase} className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand">
                    {phrase.trim()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {active === 'vocab' && (
        <div id="tabpanel-vocab" role="tabpanel" aria-labelledby="tab-vocab" className="mt-4 grid items-start gap-2.5 sm:grid-cols-2">
          {prompt.suggestedVocab.map((v) => {
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
                  <div className="min-h-0 overflow-hidden pt-2">
                    <p className="text-sm text-ink-muted">{v.meaning}</p>
                    <div className="mt-1.5 flex items-start justify-between gap-2 border-l-2 border-[var(--color-vocabulary)]/40 pl-2.5">
                      <p className="text-sm italic text-ink-muted">{v.example}</p>
                      <button
                        type="button"
                        onClick={() => copyPhrase(v.phrase)}
                        title="Copy phrase"
                        aria-label={`Copy "${v.phrase}"`}
                        className="shrink-0 rounded p-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                      >
                        {copied === v.phrase ? '✓' : '⧉'}
                      </button>
                    </div>
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
