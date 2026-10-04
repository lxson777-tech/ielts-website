/* Writing trainer sidebar: a tabbed coach beside the answer box.

   Question  the plan for the exact prompt (src/data/writing-plans.ts,
             generated per question by tools/generate_writing_plans.py);
             the default tab whenever a plan exists.
   Structure the generic shape for this essay TYPE.
   Phrases   topic phrases for this question, then the essay type's
             functional phrases. (Until 4 October 2026 these were two tabs,
             Language and Vocabulary; five tabs wrapped onto three rows in
             this narrow column, and both tabs hold phrases to reuse.)
   Avoid     the essay type's common mistakes.

   Both paragraph plans are a numbered path that follows the essay: the
   student never ticks anything. The rules for when a step is done live in
   src/lib/writing/paragraph-progress.ts. Every step's guidance is on show;
   only a per-question step's tips and sample opening sit behind one small
   disclosure, which opens by itself on the step being written.

   Mount with key={prompt.id} so switching tasks resets the tab and copy
   state. Nothing here is stored. */

import { useId, useMemo, useState } from 'react';
import type { EssayPrompt } from '../lib/writing/schema';
import { WRITING_STRUCTURES, PROMPT_VARIANT_STRUCTURE } from '../data/writing-structures';
import { getWritingPlan } from '../data/writing-plans';
import { stepProgress } from '../lib/writing/paragraph-progress';
import { useT } from '../lib/i18n/react';
import CoachTabs, { coachPanelId, coachTabId, type CoachTab } from './coach/CoachTabs';
import StepPath, { type PathStep } from './coach/StepPath';
import { AvoidIcon, CheckIcon, ChevronIcon, CopyIcon } from './coach/CoachIcons';
import '../styles/coach-panel.css';

export default function WritingCoachPanel({ prompt, essay = '' }: { prompt: EssayPrompt; essay?: string }) {
  // 'structures' is a lazily loaded dictionary part: only the writing
  // trainer shows this guidance, so it stays out of the chunk every Russian
  // page downloads. See src/lib/i18n/dict/parts.ts.
  const { t, tn } = useT('structures');
  const idBase = useId();
  const structureKey = PROMPT_VARIANT_STRUCTURE[prompt.variant];
  const guide = structureKey ? WRITING_STRUCTURES[structureKey] : null;
  const plan = getWritingPlan(prompt.id);

  const [active, setActive] = useState(plan ? 'question' : 'structure');
  const [copied, setCopied] = useState<string | null>(null);

  const planProgress = useMemo(() => (plan ? stepProgress(plan.paragraphs.map((p) => p.label), essay) : null), [plan, essay]);
  const guideProgress = useMemo(() => (guide ? stepProgress(guide.paragraphs.map((p) => p.name), essay) : null), [guide, essay]);

  if (!guide || !guideProgress) return null;

  const tabs: CoachTab[] = [
    { id: 'question', label: t('Question') },
    { id: 'structure', label: t('Structure') },
    { id: 'phrases', label: t('Phrases') },
    { id: 'avoid', label: t('Avoid', undefined, 'coach tab') },
  ];
  const panelProps = (id: string) => ({
    id: coachPanelId(idBase, id),
    role: 'tabpanel' as const,
    'aria-labelledby': coachTabId(idBase, id),
    tabIndex: 0,
    className: 'coach-tabpanel',
  });

  function copyPhrase(phrase: string) {
    navigator.clipboard
      .writeText(phrase)
      .then(() => {
        setCopied(phrase);
        setTimeout(() => setCopied((c) => (c === phrase ? null : c)), 1200);
      })
      .catch(() => {
        /* clipboard permission denied: nothing to fall back to */
      });
  }

  function copyButton(phrase: string) {
    return (
      <button
        type="button"
        onClick={() => copyPhrase(phrase)}
        title={t('Copy phrase')}
        aria-label={t('Copy "{phrase}"', { phrase })}
        className="coach-copy"
      >
        {copied === phrase ? <CheckIcon /> : <CopyIcon />}
      </button>
    );
  }

  function progressHead(headingId: string, heading: string, done: number, total: number) {
    return (
      <div className="coach-path-head">
        <h4 id={headingId} className="coach-heading">
          {heading}
        </h4>
        <span className="coach-path-count">{t('{done} of {total} done', { done, total })}</span>
      </div>
    );
  }

  const followNote = (
    <p className="coach-footnote">{t('Start each paragraph on a new line and the steps follow your writing. Nothing here is marked.')}</p>
  );

  const planSteps: PathStep[] = plan
    ? plan.paragraphs.map((p, i) => {
        const state = planProgress!.states[i];
        return {
          key: p.label,
          title: p.label,
          state,
          body: <p>{p.goal}</p>,
          more: {
            label: t('Tips and example'),
            open: state === 'now',
            content: (
              <>
                <ul className="coach-bullets">
                  {p.tips.map((tip, j) => (
                    <li key={j}>{tip}</li>
                  ))}
                </ul>
                <p className="coach-example" lang="en">
                  {p.starter}
                </p>
              </>
            ),
          },
        };
      })
    : [];

  const guideSteps: PathStep[] = guide.paragraphs.map((p, i) => ({
    key: p.name,
    title: t(p.name),
    state: guideProgress.states[i],
    body: <p>{t(p.description)}</p>,
  }));

  const hasPromptVocab = prompt.suggestedVocab.length > 0;
  const planVocab = !hasPromptVocab && plan ? plan.vocabulary : [];

  return (
    <div className="coach-panel" data-skill="writing">
      <h3 className="coach-title">{t('Writing coach: {structure}', { structure: t(guide.label) })}</h3>
      <CoachTabs tabs={tabs} active={active} onChange={setActive} idBase={idBase} label={t('Writing coach')} />

      {active === 'question' && !plan && (
        <div {...panelProps('question')}>
          <p className="coach-empty">{t('A plan for this question is coming.')}</p>
        </div>
      )}

      {active === 'question' && plan && (
        <div {...panelProps('question')}>
          <section className="coach-brief">
            <h4 className="coach-heading">{plan.questionType}</h4>
            <p>{plan.whatItAsks}</p>
          </section>

          {plan.task === 'task2' && plan.position && (
            <section className="coach-section">
              <h4 className="coach-heading">{t('Suggested position')}</h4>
              <p className="coach-text-ink">{plan.position}</p>
            </section>
          )}

          <section className="coach-section">
            {progressHead(`${idBase}-plan-path`, t('Paragraph plan'), planProgress!.done, planProgress!.states.filter((s) => s !== 'optional').length)}
            <StepPath steps={planSteps} labelledBy={`${idBase}-plan-path`} />
            {followNote}
          </section>

          <section className="coach-section">
            <h4 className="coach-heading">{plan.task === 'task1' ? t('Key features') : t('Key points')}</h4>
            <ul className="coach-bullets">
              {plan.keyPoints.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </section>

          {plan.task === 'task1' && plan.overviewHints && plan.overviewHints.length > 0 && (
            <section className="coach-section">
              <h4 className="coach-heading">{t('Build your overview')}</h4>
              <ol className="coach-numbered">
                {plan.overviewHints.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ol>
              <p className="coach-footnote">
                {t('Write it yourself first. The AI feedback will tell you whether your overview covers the main features.')}
              </p>
            </section>
          )}

          {plan.vocabulary.length > 0 && (
            <button type="button" onClick={() => setActive('phrases')} className="coach-jump">
              <span>{tn(plan.vocabulary.length, { one: '{n} phrase for this question', other: '{n} phrases for this question' })}</span>
              <ChevronIcon />
            </button>
          )}

          <section className="coach-section">
            <h4 className="coach-heading">{t('Pitfalls on this question')}</h4>
            <ul className="coach-avoid">
              {plan.pitfalls.map((m, i) => (
                <li key={i}>
                  <AvoidIcon />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="coach-footnote">
            <strong>{t('Timing.')} </strong>
            {plan.timing}
          </p>
        </div>
      )}

      {active === 'structure' && (
        <div {...panelProps('structure')}>
          <section className="coach-section coach-section-first">
            {progressHead(`${idBase}-guide-path`, t('Paragraph plan'), guideProgress.done, guideProgress.states.filter((s) => s !== 'optional').length)}
            <StepPath steps={guideSteps} labelledBy={`${idBase}-guide-path`} />
            {followNote}
          </section>
          {guide.notes && guide.notes.length > 0 && (
            <section className="coach-brief">
              <h4 className="coach-heading">{t('What to look for')}</h4>
              <ul className="coach-bullets">
                {guide.notes.map((n) => (
                  <li key={n}>{t(n)}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {active === 'phrases' && (
        <div {...panelProps('phrases')}>
          {/* The 60 imported exam tasks carry no hand-written suggestedVocab;
              their per-question plan has topic phrases, so those stand in. */}
          {(hasPromptVocab || planVocab.length > 0) && (
            <section className="coach-section coach-section-first">
              <h4 className="coach-heading">{t('For this question')}</h4>
              <ul className="coach-words">
                {hasPromptVocab
                  ? prompt.suggestedVocab.map((v) => (
                      <li key={v.phrase}>
                        <div>
                          <p className="coach-word" lang="en">
                            {v.phrase}
                          </p>
                          <p>{v.meaning}</p>
                          <p className="coach-word-example" lang="en">
                            {v.example}
                          </p>
                        </div>
                        {copyButton(v.phrase)}
                      </li>
                    ))
                  : planVocab.map((v) => (
                      <li key={v.phrase}>
                        <div>
                          <p className="coach-word" lang="en">
                            {v.phrase}
                          </p>
                          <p>{v.use}</p>
                        </div>
                        {copyButton(v.phrase)}
                      </li>
                    ))}
              </ul>
            </section>
          )}
          <section className={`coach-section ${hasPromptVocab || planVocab.length > 0 ? '' : 'coach-section-first'}`}>
            <h4 className="coach-heading">{t('Useful phrases')}</h4>
            <div className="coach-phrase-groups">
              {guide.language.map((row) => (
                <div key={row.job}>
                  <p className="coach-subheading">{t(row.job)}</p>
                  <ul className="coach-chips" lang="en">
                    {row.phrases.split(' / ').map((phrase) => (
                      <li key={phrase}>{phrase.trim()}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {active === 'avoid' && (
        <div {...panelProps('avoid')}>
          <ul className="coach-avoid coach-section-first">
            {guide.mistakes.map((m, i) => (
              <li key={i}>
                <AvoidIcon />
                <span>{t(m)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
