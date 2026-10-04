/* "What this looks like when it is done well": a real Band 8 model answer
   inside the lesson that teaches its question type.

   A student reads the opinion essay lesson and then, on the same page, reads
   an opinion essay that earns Band 8, with the examiner's reason for each
   criterion. The models are the same ones as /writing/models
   (src/data/model-answers.ts), picked by the prompt's variant, so nothing is
   written twice and the lesson cannot drift from the bank.

   Deliberately collapsed by default. The lesson's job is to teach the method
   first; the example is there for the student who wants to see it land, and
   for the one who comes back to the lesson after writing their own.

   The GATED build (the free-account model, Alex, 1 October 2026) carries no
   model answers in the page: each writing lesson's one worked example is
   part of the lesson, so it comes through the content door for any
   signed-in account (GET example/writing-<lesson>, Builder G's door: the
   prompt and its Band 8 model, charts inline). There is no
   "Another example" (the model bank comes with practice and guidance), and
   the links to the trainer and the bank open the upgrade pop-up for a free
   account (src/lib/access/paid-guard.ts). */

import { useEffect, useState } from 'react';
import { contentIsGated, fetchGated } from '../lib/trial/content';
import { useTrial } from '../lib/trial/react';
import { browserTier, readsLessons } from '../lib/access/tier';
import type { EssayPrompt } from '../lib/writing/schema';
import { WRITING_PROMPTS } from '../data/writing-prompts';
import { getModelAnswers, type ModelAnswer } from '../data/model-answers';
import { countWords } from '../lib/writing/mechanics';
import { withBase } from '../lib/url';
import { useT } from '../lib/i18n/react';
import PromptWithCharts from './PromptWithCharts';
import ZoomableChart from './ZoomableChart';

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

/** Where a writing lesson's worked example is asked for through the content
    door (Builder G, free-account model): opened for any signed-in account
    with a profile, as part of the lesson. */
export const LESSON_EXAMPLE_PATH = (lesson: string): string => `example/writing-${lesson}`;

/** `available` is false when the build has no worked example for this
    lesson (decided at build time on the lesson page), so the gated page does
    not ask the content door for one that does not exist. */
export default function LessonModelExample({ lesson, available = true }: { lesson: string; available?: boolean }) {
  if (!available) return null;
  return contentIsGated() ? <GatedLessonModel lesson={lesson} /> : <OpenLessonModel lesson={lesson} />;
}

function OpenLessonModel({ lesson }: { lesson: string }) {
  const variants = LESSON_VARIANTS[lesson] ?? [];
  const examples = WRITING_PROMPTS.filter((p) => variants.includes(p.variant))
    .map((p) => ({ prompt: p, model: getModelAnswers(p.id)[0] }))
    .filter((x): x is { prompt: (typeof WRITING_PROMPTS)[number]; model: ModelAnswer } => Boolean(x.model));
  const [index, setIndex] = useState(0);
  if (examples.length === 0) return null;
  const { prompt, model } = examples[Math.min(index, examples.length - 1)]!;
  return (
    <ModelView
      prompt={prompt}
      model={model}
      onAnother={examples.length > 1 ? () => setIndex((i) => (i + 1) % examples.length) : undefined}
      links
    />
  );
}

/** The lesson's one worked example, through the content door, for any
    signed-in account. Nothing at all for a visitor (the page shows the
    lesson's invitation) or when it cannot be fetched: the lesson itself is
    unaffected. */
function GatedLessonModel({ lesson }: { lesson: string }) {
  const trial = useTrial();
  const open = readsLessons(browserTier(trial, trial.now));
  const [example, setExample] = useState<{ key: string; prompt: EssayPrompt; model: ModelAnswer } | null>(null);
  const key = open && LESSON_VARIANTS[lesson] ? `${trial.userId}:${lesson}` : null;

  useEffect(() => {
    if (!key || example?.key === key) return;
    let live = true;
    void fetchGated(LESSON_EXAMPLE_PATH(lesson)).then((result) => {
      if (!live || !result.ok) return;
      try {
        const parsed = JSON.parse(result.text) as { prompt: EssayPrompt; model: ModelAnswer };
        if (parsed?.prompt?.promptHtml && Array.isArray(parsed?.model?.text)) setExample({ key, ...parsed });
      } catch {
        /* nothing shown: the lesson itself is unaffected */
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key || example?.key !== key) return null;
  return <ModelView prompt={example.prompt} model={example.model} links />;
}

function ModelView({
  prompt,
  model,
  onAnother,
  links,
}: {
  prompt: EssayPrompt;
  model: ModelAnswer;
  /** Shows "Another example"; absent when there is only one. */
  onAnother?: () => void;
  /** The links to the trainer and the model bank (not in a trial). */
  links: boolean;
}) {
  const { t, tn } = useT();
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-10 rounded-card border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-bold">{t('What a Band 8 answer looks like')}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {t("A real exam task of this type, answered at Band 8, with the examiner's reasons.")}
          </p>
        </div>
        {onAnother && (
          <button
            type="button"
            onClick={() => {
              onAnother();
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
        <PromptWithCharts as="div" className="lesson-model-prompt mt-1.5 text-sm leading-relaxed" html={prompt.promptHtml} />
        {prompt.imageUrl && <ZoomableChart src={prompt.imageUrl.startsWith('data:') ? prompt.imageUrl : withBase(prompt.imageUrl)} alt={t('Writing task chart')} />}

        {!open ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-button bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              {t('Show the Band 8 answer')}
            </button>
            {links && (
              <a
                href={withBase(`/trainers/writing?task=${encodeURIComponent(prompt.id)}`)}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {t('Or write this one yourself first')}
              </a>
            )}
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

            {links && <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
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
            </div>}
          </>
        )}
      </div>
    </section>
  );
}
