/* Speaking coach panel: the speaking twin of WritingCoachPanel, beside the
   recorded trainer, inside the live examiner's drill Tips drawer, and next
   to the classic examiner stage.

   Plan     the part's method (A.R.E. / PEEL / OREO) as a short numbered
            path, every stage's line and starter phrases on show, then how
            to answer this part. Speech is not tracked, so nothing is
            marked done and there is nothing to tick.
   Phrases  the current topic's words (when the prompt bank has them), then
            the functional phrases. (Until 4 October 2026 the topic words
            were their own Vocab tab of tap-to-reveal cards.)
   Avoid    the part's common mistakes.

   The props are unchanged (method, vocab), so LiveExaminer mounts it as
   before. Nothing here is stored. */

import { useId, useState } from 'react';
import type { StructureMethod } from '../data/speaking-structure-guides';
import { SPEAKING_STRUCTURE_GUIDES } from '../data/speaking-structure-guides';
import type { TopicVocab } from '../lib/speaking/schema';
import { useT } from '../lib/i18n/react';
import CoachTabs, { coachPanelId, coachTabId, type CoachTab } from './coach/CoachTabs';
import StepPath, { type PathStep } from './coach/StepPath';
import { AvoidIcon } from './coach/CoachIcons';
import '../styles/coach-panel.css';

export default function SpeakingCoachPanel({ method, vocab }: { method: StructureMethod; vocab?: TopicVocab[] }) {
  // 'structures' is a lazily loaded dictionary part: this guidance is only
  // shown on the speaking trainers, so it is not in the chunk every Russian
  // page downloads. See src/lib/i18n/dict/parts.ts.
  const { t } = useT('structures');
  const idBase = useId();
  const guide = SPEAKING_STRUCTURE_GUIDES[method];
  const hasVocab = !!vocab && vocab.length > 0;
  const tabs: CoachTab[] = [
    { id: 'plan', label: t('Plan') },
    { id: 'phrases', label: t('Phrases') },
    { id: 'avoid', label: t('Avoid', undefined, 'coach tab') },
  ];
  const [active, setActive] = useState('plan');

  const panelProps = (id: string) => ({
    id: coachPanelId(idBase, id),
    role: 'tabpanel' as const,
    'aria-labelledby': coachTabId(idBase, id),
    tabIndex: 0,
    className: 'coach-tabpanel',
  });

  // Stage names stay English: they spell the method out (A.R.E. is Answer,
  // Reason, Extend). The Russian description sits underneath.
  const steps: PathStep[] = guide.stages.map((stage) => ({
    key: stage.name,
    title: stage.name,
    meta: stage.timing ? t(stage.timing) : undefined,
    body: (
      <>
        <p>{t(stage.description)}</p>
        {stage.phrases.length > 0 && (
          <ul className="coach-chips coach-chips-quiet" lang="en">
            {stage.phrases.map((phrase) => (
              <li key={phrase}>{phrase}</li>
            ))}
          </ul>
        )}
      </>
    ),
  }));

  return (
    <div className="coach-panel" data-skill="speaking">
      <h3 className="coach-title">
        {t('Speaking coach: {structure}', { structure: t(guide.title) })}
        <span className="coach-title-meta">{guide.part}</span>
      </h3>
      <CoachTabs tabs={tabs} active={active} onChange={setActive} idBase={idBase} label={t('Speaking coach')} />

      {active === 'plan' && (
        <div {...panelProps('plan')}>
          <section className="coach-section coach-section-first">
            <h4 id={`${idBase}-path`} className="coach-heading">
              {t('Your answer, step by step')}
            </h4>
            <StepPath steps={steps} labelledBy={`${idBase}-path`} />
          </section>
          <section className="coach-brief">
            <h4 className="coach-heading">{t('How to answer')}</h4>
            <ul className="coach-bullets">
              {guide.notes.map((n) => (
                <li key={n}>{t(n)}</li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {active === 'phrases' && (
        <div {...panelProps('phrases')}>
          {hasVocab && (
            <section className="coach-section coach-section-first">
              <h4 className="coach-heading">{t('Topic words')}</h4>
              <ul className="coach-words">
                {vocab.map((v) => (
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
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className={`coach-section ${hasVocab ? '' : 'coach-section-first'}`}>
            <h4 className="coach-heading">{t('Useful phrases')}</h4>
            <div className="coach-phrase-groups">
              {guide.language.map((row) => (
                <div key={row.job}>
                  <p className="coach-subheading">{t(row.job)}</p>
                  <ul className="coach-chips" lang="en">
                    {row.phrases.map((phrase) => (
                      <li key={phrase}>{phrase}</li>
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
