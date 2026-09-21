/* Writing checker sidebar: a tabbed coach instead of one accordion that dumps
   the whole structure guide as a wall of text. "This question" is a plan
   specific to the exact prompt the student is answering (src/data/writing-plans.ts,
   generated per-question by tools/generate_writing_plans.py) — it is the
   default tab whenever a plan exists for this prompt. Structure is the old
   generic Plan tab (per essay TYPE, not per question), Language groups the
   functional phrases as chips, Vocabulary surfaces the prompt's topic-specific
   suggestedVocab as tap-to-reveal cards, Avoid keeps the common-mistakes chips.
   Mount with a `key={prompt.id}` from the caller so switching tasks resets all
   local UI state (active tab, checked/expanded rows, revealed cards) for free. */

import { useState } from 'react';
import type { EssayPrompt } from '../lib/writing/schema';
import { WRITING_STRUCTURES, PROMPT_VARIANT_STRUCTURE } from '../data/writing-structures';
import { getWritingPlan } from '../data/writing-plans';
import { useT } from '../lib/i18n/react';
import Tabs, { type TabDef } from './Tabs';

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function WritingCoachPanel({ prompt }: { prompt: EssayPrompt }) {
  // 'structures' is a lazily loaded dictionary part: only the writing
  // trainer shows this guidance, so it stays out of the chunk every Russian
  // page downloads. See src/lib/i18n/dict/parts.ts.
  const { t, tn } = useT('structures');
  const TABS: TabDef[] = [
    { id: 'question', label: t('This question') },
    { id: 'structure', label: t('Structure') },
    { id: 'language', label: t('Language') },
    { id: 'vocab', label: t('Vocabulary') },
    { id: 'avoid', label: t('Avoid') },
  ];
  const structureKey = PROMPT_VARIANT_STRUCTURE[prompt.variant];
  const guide = structureKey ? WRITING_STRUCTURES[structureKey] : null;
  const plan = getWritingPlan(prompt.id);

  const [active, setActive] = useState(plan ? 'question' : 'structure');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [planChecked, setPlanChecked] = useState<Set<string>>(new Set());
  const [planExpanded, setPlanExpanded] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [planVocabRevealed, setPlanVocabRevealed] = useState<Set<string>>(new Set());
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
      <h3 className="font-display text-sm font-bold">{t('Writing coach: {structure}', { structure: t(guide.label) })}</h3>
      <Tabs tabs={TABS} active={active} onChange={setActive} className="mt-3" />

      {active === 'question' && !plan && (
        <div id="tabpanel-question" role="tabpanel" aria-labelledby="tab-question" className="mt-4 rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-ink-muted">
          {t('A plan for this question is coming.')}
        </div>
      )}

      {active === 'question' && plan && (
        <div id="tabpanel-question" role="tabpanel" aria-labelledby="tab-question" className="mt-4 space-y-3">
          <div className="rounded-lg bg-brand-tint/60 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">{plan.questionType}</p>
            <p className="mt-1 text-sm text-ink-muted">{plan.whatItAsks}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              {plan.task === 'task1' ? t('Key features') : t('Key points')}
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
              {plan.keyPoints.map((k, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>

          {plan.task === 'task1' && plan.overviewHints && plan.overviewHints.length > 0 && (
            <div className="rounded-lg border border-border bg-surface-alt/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t('Build your overview')}</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
                {plan.overviewHints.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true">{i + 1}.</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-muted">
                {t('Write it yourself first. The AI feedback will tell you whether your overview covers the main features.')}
              </p>
            </div>
          )}

          {plan.task === 'task2' && plan.position && (
            <div className="rounded-lg border border-border bg-surface-alt/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t('Suggested position')}</p>
              <p className="mt-1 text-sm text-ink">{plan.position}</p>
            </div>
          )}

          <div className="space-y-2">
            {plan.paragraphs.map((p) => {
              const isChecked = planChecked.has(p.label);
              const isOpen = planExpanded.has(p.label);
              return (
                <div key={p.label} className="rounded-lg border border-border">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => setPlanChecked((s) => toggle(s, p.label))}
                      className="h-4 w-4 shrink-0 rounded border-border text-brand focus:ring-brand"
                      aria-label={t('Mark "{label}" done', { label: p.label })}
                    />
                    <button
                      type="button"
                      onClick={() => setPlanExpanded((s) => toggle(s, p.label))}
                      aria-expanded={isOpen}
                      className="flex flex-1 items-center justify-between gap-2 text-left text-sm font-semibold"
                    >
                      <span className={isChecked ? 'text-ink-muted line-through' : ''}>{p.label}</span>
                      <span aria-hidden="true" className="shrink-0 text-ink-muted">
                        {isOpen ? '▾' : '▸'}
                      </span>
                    </button>
                  </div>
                  {/* The clip wrapper must stay padding-free: padding on it sets a
                      floor on the collapsed 0fr track and leaks clipped text. */}
                  <div className={`grid-reveal ${isOpen ? 'is-open' : ''}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="space-y-2 px-3 pb-3 pl-9">
                        <p className="text-sm text-ink-muted">{p.goal}</p>
                        <ul className="space-y-1 text-sm text-ink-muted">
                          {p.tips.map((tip, i) => (
                            <li key={i} className="flex gap-2">
                              <span aria-hidden="true">·</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="rounded border-l-2 border-brand/40 bg-brand-tint/40 px-2 py-1.5 font-mono text-xs italic text-ink-muted">
                          {p.starter}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {plan.vocabulary.length > 0 && (
            <button
              type="button"
              onClick={() => setActive('vocab')}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--color-vocabulary)]/25 bg-[var(--color-vocabulary-tint)]/60 px-3 py-2 text-left"
            >
              <span className="text-sm font-bold text-[var(--color-vocabulary)]">
                {tn(plan.vocabulary.length, { one: '{n} phrase for this question', other: '{n} phrases for this question' })}
              </span>
              <span className="text-xs font-semibold text-ink-muted">{t('Vocabulary tab')} &rsaquo;</span>
            </button>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t('Pitfalls on this question')}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {plan.pitfalls.map((m, i) => (
                <span key={i} className="rounded-full bg-error-tint px-2.5 py-0.5 text-xs font-semibold text-error">
                  ⚠ {m}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-ink-muted">
            <span className="font-bold uppercase tracking-wider">{t('Timing.')} </span>
            {plan.timing}
          </p>
        </div>
      )}

      {active === 'structure' && (
        <div id="tabpanel-structure" role="tabpanel" aria-labelledby="tab-structure" className="mt-4">
          {guide.notes && guide.notes.length > 0 && (
            <div className="mb-3 rounded-lg bg-brand-tint/60 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('What to look for')}</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink-muted">
                {guide.notes.map((n) => (
                  <li key={n} className="flex gap-2">
                    <span aria-hidden="true">·</span>
                    <span>{t(n)}</span>
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
                      aria-label={t('Mark "{label}" done', { label: t(p.name) })}
                    />
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => toggle(s, p.name))}
                      aria-expanded={isOpen}
                      className="flex flex-1 items-center justify-between gap-2 text-left text-sm font-semibold"
                    >
                      <span className={isChecked ? 'text-ink-muted line-through' : ''}>{t(p.name)}</span>
                      <span aria-hidden="true" className="shrink-0 text-ink-muted">
                        {isOpen ? '▾' : '▸'}
                      </span>
                    </button>
                  </div>
                  {/* The clip wrapper must stay padding-free: padding on it sets a
                      floor on the collapsed 0fr track and leaks clipped text. */}
                  <div className={`grid-reveal ${isOpen ? 'is-open' : ''}`}>
                    <div className="min-h-0 overflow-hidden">
                      <p className="px-3 pb-3 pl-9 text-sm text-ink-muted">{t(p.description)}</p>
                    </div>
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
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t(row.job)}</p>
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

      {/* The 60 imported exam tasks carry no hand-written suggestedVocab, so the
          tab used to be empty on every real question. Their per-question plan
          does have topic phrases, so show those instead of an apology. */}
      {active === 'vocab' && prompt.suggestedVocab.length === 0 && plan && plan.vocabulary.length > 0 && (
        <div id="tabpanel-vocab" role="tabpanel" aria-labelledby="tab-vocab" className="mt-4">
          <p className="text-sm text-ink-muted">{t('Phrases chosen for this exact question. Tap one to see when to use it.')}</p>
          <div className="mt-2.5 grid items-start gap-2.5 sm:grid-cols-2">
            {plan.vocabulary.map((v) => {
              const isOpen = planVocabRevealed.has(v.phrase);
              return (
                <div
                  key={v.phrase}
                  className="rounded-lg border border-[var(--color-vocabulary)]/25 bg-[var(--color-vocabulary-tint)]/60 p-3"
                >
                  <button
                    type="button"
                    onClick={() => setPlanVocabRevealed((s) => toggle(s, v.phrase))}
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
                      <div className="flex items-start justify-between gap-2 pt-2">
                        <p className="text-sm text-ink-muted">{v.use}</p>
                        <button
                          type="button"
                          onClick={() => copyPhrase(v.phrase)}
                          title={t('Copy phrase')}
                          aria-label={t('Copy "{phrase}"', { phrase: v.phrase })}
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
        </div>
      )}

      {active === 'vocab' && prompt.suggestedVocab.length === 0 && (!plan || plan.vocabulary.length === 0) && (
        <div id="tabpanel-vocab" role="tabpanel" aria-labelledby="tab-vocab" className="mt-4 rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-ink-muted">
          {t('No topic vocabulary for this task yet.')}
        </div>
      )}

      {active === 'vocab' && prompt.suggestedVocab.length > 0 && (
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
                  <div className="min-h-0 overflow-hidden">
                    <p className="pt-2 text-sm text-ink-muted">{v.meaning}</p>
                    <div className="mt-1.5 flex items-start justify-between gap-2 border-l-2 border-[var(--color-vocabulary)]/40 pl-2.5">
                      <p className="text-sm italic text-ink-muted">{v.example}</p>
                      <button
                        type="button"
                        onClick={() => copyPhrase(v.phrase)}
                        title={t('Copy phrase')}
                        aria-label={t('Copy "{phrase}"', { phrase: v.phrase })}
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
              ⚠ {t(m)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
