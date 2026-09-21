/* "What this looks like when it is done well": a real Band 8 model answer
   inside the lesson that teaches its question type.

   A student reads the opinion essay lesson and then, on the same page, reads
   an opinion essay that earns Band 8, with the examiner's reason for each
   criterion. The models are the same ones as /writing/models
   (src/data/model-answers.ts), picked by the prompt's variant, so nothing is
   written twice and the lesson cannot drift from the bank.

   Deliberately collapsed by default. The lesson's job is to teach the method
   first; the example is there for the student who wants to see it land, and
   for the one who comes back to the lesson after writing their own. */

import { useState } from 'react';
import { WRITING_PROMPTS } from '../data/writing-prompts';
import { getModelAnswers, type ModelAnswer } from '../data/model-answers';
import { countWords } from '../lib/writing/mechanics';
import { withBase } from '../lib/url';
import { useT } from '../lib/i18n/react';
import Html from './Html';

/** Which prompt variants belong to each writing lesson. */
const LESSON_VARIANTS: Record<string, string[]> = {
  method: ['chart', 'table', 'combination', 'process', 'map'],
  charts: ['chart', 'table', 'combination'],
  process: ['process'],
  maps: ['map'],
  'task2-method': ['opinion', 'discussion', 'advantages-disadvantages', 'problem-solution', 'two-part'],
  opinion: ['opinion'],
  discussion: ['discussion'],
  advantages: ['advantages-disadvantages'],
  problem: ['problem-solution'],
  twopart: ['two-part'],
};

const CRITERION_LABEL: { key: keyof ModelAnswer['criteria']; label: string }[] = [
  { key: 'taskResponse', label: 'Task Response' },
  { key: 'taskAchievement', label: 'Task Achievement' },
  { key: 'coherence', label: 'Coherence and Cohesion' },
  { key: 'lexical', label: 'Lexical Resource' },
  { key: 'grammar', label: 'Grammatical Range and Accuracy' },
];

export default function LessonModelExample({ lesson }: { lesson: string }) {
  const { t, tn } = useT();
  const variants = LESSON_VARIANTS[lesson] ?? [];
  const examples = WRITING_PROMPTS.filter((p) => variants.includes(p.variant))
    .map((p) => ({ prompt: p, model: getModelAnswers(p.id)[0] }))
    .filter((x): x is { prompt: (typeof WRITING_PROMPTS)[number]; model: ModelAnswer } => Boolean(x.model));

  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  if (examples.length === 0) return null;
  const { prompt, model } = examples[Math.min(index, examples.length - 1)]!;

  return (
    <section className="mt-10 rounded-card border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-bold">{t('What a Band 8 answer looks like')}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {t("A real exam task of this type, answered at Band 8, with the examiner's reasons.")}
          </p>
        </div>
        {examples.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setIndex((i) => (i + 1) % examples.length);
              setOpen(true);
            }}
            className="shrink-0 rounded-button border border-border px-3.5 py-2 text-xs font-bold transition-colors hover:bg-surface-alt"
          >
            {t('Another example')}
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t('The task')}</p>
        <Html as="div" className="lesson-model-prompt mt-1.5 text-sm leading-relaxed" html={prompt.promptHtml} />

        {!open ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-button bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              {t('Show the Band 8 answer')}
            </button>
            <a
              href={withBase(`/trainers/writing?task=${encodeURIComponent(prompt.id)}`)}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {t('Or write this one yourself first')}
            </a>
          </div>
        ) : (
          <>
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {tn(countWords(model.text.join(' ')), { one: 'Band {band} answer · {n} word', other: 'Band {band} answer · {n} words' }, { band: model.band })}
              </p>
              <div className="mt-2 space-y-3 text-[0.95rem] leading-relaxed">
                {model.text.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {CRITERION_LABEL.filter((c) => model.criteria[c.key]).map((c) => (
                <div key={c.key} className="rounded-lg bg-surface-alt p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand">{c.label}</p>
                  <p className="mt-1 text-sm text-ink-muted">{model.criteria[c.key]}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <a
                href={withBase(`/trainers/writing?type=${prompt.task}`)}
                className="rounded-button bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                {t('Write one of these yourself')}
              </a>
              <a
                href={withBase(`/writing/models?task=${encodeURIComponent(prompt.id)}`)}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {t('Open it with the phrases highlighted')}
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
