/* The trial student's Today page: time left, the four sections, and for the
   chosen section its one lesson, its one test and its Mr EZ allowance.

   Codex's approved layout (src/components/TrialPreview.tsx in the design
   checkout), built on the real platform: every number here is the server's
   (src/lib/trial/client.ts), every title is the real lesson's or test's, and
   the preview's sample time, simulated counters and review toolbar are gone.

   Also exported: SectionLibrary, the same rows, used by the Course and
   Lessons pages in a trial build so the whole library stays listed with
   locked rows rather than disappearing. */

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useT } from '../../lib/i18n/react';
import SupportLink from '../support/SupportLink'; // [E trust]
import { withBase } from '../../lib/url';
import { refreshTrial } from '../../lib/trial/client';
import type { TrialLibrarySection } from '../../lib/trial/library';
import { TRIAL_SECTIONS, type TrialSection } from '../../lib/trial/offer';
import { useTrial } from '../../lib/trial/react';
import {
  lessonAccess,
  msRemaining,
  remainingParts,
  stateAt,
  testAccess,
  tutorAllowance,
  type TrialStatus,
} from '../../lib/trial/status';
import TrialBlock, { accountBlock } from './TrialBlock';

type Translate = ReturnType<typeof useT>;

/** "2 days and 18 hours left", by the server's clock. */
export function timeLeftText(ms: number, { t, tn }: Translate): string {
  const { days, hours, minutes } = remainingParts(ms);
  const d = tn(days, { one: '{n} day', other: '{n} days' });
  const h = tn(hours, { one: '{n} hour', other: '{n} hours' });
  const m = tn(minutes, { one: '{n} minute', other: '{n} minutes' });
  if (days > 0) return t('{first} and {second} left', { first: d, second: h });
  if (hours > 0) return t('{first} and {second} left', { first: h, second: m });
  return t('{time} left', { time: m });
}

function LockIcon() {
  return (
    <svg className="trial-lock-icon" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2" y="5.2" width="8" height="5.6" rx="1.2" />
      <path d="M3.8 5.2V3.8a2.2 2.2 0 0 1 4.4 0v1.4" />
    </svg>
  );
}

/** The lesson, test and locked rows for one section. */
export function SectionLibrary({
  data,
  status,
  now,
  expanded = false,
}: {
  data: TrialLibrarySection;
  status: TrialStatus;
  now: number;
  expanded?: boolean;
}) {
  const i18n = useT();
  const { t, tn } = i18n;
  const lesson = lessonAccess(status, data.lesson.key, now);
  const test = testAccess(status, data.section, data.test.id, now);

  const testLine =
    test === 'available'
      ? t('One test included')
      : test === 'in-progress'
        ? t('You have started this test. It is still yours to finish.')
        : test === 'used'
          ? t('Your included test has been used')
          : test === 'unavailable'
            ? t('Not open yet: its length is still being decided')
            : t('Trial ended');

  return (
    <div className="trial-library">
      <div className="trial-row">
        <span>
          <b>{t(data.lesson.title)}</b>
          <small>{lesson === 'included' ? t('Included in your trial') : t('Trial ended')}</small>
        </span>
        {lesson === 'included' ? (
          <a className="trial-btn" href={withBase(data.lesson.href)}>
            {t('Open lesson')}
          </a>
        ) : (
          <a className="trial-btn" href={withBase('/plans')}>
            {t('View plans')}
          </a>
        )}
      </div>

      <div className="trial-row">
        <span>
          <b>{t(data.test.title)}</b>
          <small>{testLine}</small>
        </span>
        {test === 'available' || test === 'in-progress' ? (
          <a className="trial-btn" href={withBase(data.test.href)}>
            {test === 'available' ? t('Start test') : t('Continue test')}
          </a>
        ) : test === 'used' ? (
          <a className="trial-btn" href={withBase('/report')}>
            {t('See my results')}
          </a>
        ) : test === 'unavailable' ? (
          <span className="trial-btn" aria-disabled="true">
            {t('Not open yet')}
          </span>
        ) : (
          <a className="trial-btn" href={withBase('/plans')}>
            {t('View plans')}
          </a>
        )}
      </div>

      <div className="trial-row">
        <span>
          <b>{tn(data.others.length, { one: '{n} more guided lesson', other: '{n} more guided lessons' })}</b>
          <small>{t('Available with full access')}</small>
        </span>
        <a className="trial-btn" href={withBase('/plans')}>
          <LockIcon /> {t('View plans')}
        </a>
      </div>
      {data.others.length > 0 && (
        <details open={expanded}>
          <summary className="trial-fine" style={{ cursor: 'pointer', padding: '4px 0 10px' }}>
            {t('See what full access includes in {section}', { section: data.label })}
          </summary>
          <ul className="trial-locked-list">
            {data.others.map((o) => (
              <li key={o.key}>
                <LockIcon />
                <span>
                  {t(o.title)} <span className="sr-only">{t('Locked')}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Section tabs with the keyboard behaviour of a real tab list. */
export function SectionTabs({
  sections,
  selected,
  onSelect,
  idPrefix,
}: {
  sections: TrialLibrarySection[];
  selected: TrialSection;
  onSelect: (s: TrialSection) => void;
  idPrefix: string;
}) {
  const { t } = useT();
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const n = sections.length;
    const next =
      e.key === 'ArrowRight' ? (index + 1) % n : e.key === 'ArrowLeft' ? (index + n - 1) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(sections[next].section);
    document.getElementById(`${idPrefix}-tab-${sections[next].section}`)?.focus();
  }
  return (
    <div className="trial-tabs" role="tablist" aria-label={t('IELTS section')}>
      {sections.map((s, i) => (
        <button
          key={s.section}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${s.section}`}
          aria-selected={selected === s.section}
          aria-controls={`${idPrefix}-panel`}
          tabIndex={selected === s.section ? 0 : -1}
          onClick={() => onSelect(s.section)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** The trial state the account alone decides (signed out, checking, ...),
    worded for a page whose whole content is the trial. */
function TrialAccountState({ reason }: { reason: NonNullable<ReturnType<typeof accountBlock>> }) {
  return <TrialBlock reason={reason} title="Your 3-day trial" />;
}

/** Which tab opens first: the section the questionnaire suggested, else
    Reading, the first paper of the exam. */
function initialSection(status: TrialStatus | null): TrialSection {
  const suggested = status?.questionnaire?.skill;
  if (suggested) return suggested;
  return 'reading';
}

export default function TrialHome({ sections }: { sections: TrialLibrarySection[] }) {
  const i18n = useT();
  const { t } = i18n;
  const trial = useTrial(30_000);
  const [selected, setSelected] = useState<TrialSection | null>(null);
  const status = trial.status;
  const current = selected ?? initialSection(status);

  // Mr EZ reads the section the student has chosen here. A label for his
  // panel only: the Worker decides the section again from the lesson
  // reference the panel sends.
  useEffect(() => {
    document.body.dataset.trialSection = current;
    return () => {
      delete document.body.dataset.trialSection;
    };
  }, [current]);

  // A trial that ends while this page is open says so without a reload.
  const state = status ? stateAt(status, trial.now) : null;
  useEffect(() => {
    if (status?.state === 'active' && state === 'ended') void refreshTrial();
  }, [status?.state, state]);

  const data = useMemo(() => sections.find((s) => s.section === current) ?? sections[0], [sections, current]);

  const account = accountBlock(trial);
  if (trial.phase === 'off') return null;
  if (account) return <TrialAccountState reason={account} />;
  if (!status || !data) return null;

  const ended = state === 'ended';
  const remaining = msRemaining(status, trial.now);
  const allowance = tutorAllowance(status, current, trial.now);
  const test = testAccess(status, current, data.test.id, trial.now);
  const lesson = lessonAccess(status, data.lesson.key, trial.now);
  const q = status.questionnaire;

  const testValue =
    test === 'available'
      ? t('1 available')
      : test === 'in-progress'
        ? t('In progress')
        : test === 'used'
          ? t('Used')
          : test === 'unavailable'
            ? t('Not open yet')
            : t('Trial ended');

  return (
    <div className="trial-ui trial-home">
      <div className={`trial-status${ended ? ' is-ended' : ''}`} role="status" aria-live="polite">
        <div>
          <b>{ended ? t('Your trial has ended') : t('Your 3-day trial')}</b>
          <span>{ended ? t('New lessons, tests and Mr EZ replies are locked. Your results stay saved.') : timeLeftText(remaining, i18n)}</span>
        </div>
        <a className="trial-btn" href={withBase('/plans')}>
          {t('See full access')}
        </a>
      </div>
      {ended && <SupportLink reason="trial-ended" lead="hand" />}{/* [E trust] */}

      <h1>{t('A little practice. A clearer next step.')}</h1>
      <p className="trial-lead">{t('Your trial gives you a focused introduction to each part of IELTS.')}</p>

      {q && !ended && (
        <p className="trial-sug">
          <b>{t('Suggested from your answers')}</b>
          {t('Start with {section}, about {minutes} minutes a day, aiming for Band {band}. A starting point you chose, not a level test.', {
            section: sections.find((s) => s.section === q.skill)?.label ?? q.skill,
            minutes: q.time,
            band: q.band === '8' ? '8.0+' : Number(q.band).toFixed(1),
          })}
        </p>
      )}

      <SectionTabs sections={sections} selected={current} onSelect={setSelected} idPrefix="trial-home" />

      <section id="trial-home-panel" role="tabpanel" aria-labelledby={`trial-home-tab-${current}`}>
        <div className="trial-card trial-next">
          <div>
            <span className="trial-eyebrow">
              {data.label} · {t('Selected introduction')}
            </span>
            <h2>{t(data.lesson.title)}</h2>
            <p>{t(data.lesson.blurb)}</p>
            {lesson === 'included' ? (
              <a className="trial-btn trial-primary" href={withBase(data.lesson.href)}>
                {t('Open my first lesson')}
              </a>
            ) : (
              <a className="trial-btn trial-primary" href={withBase('/plans')}>
                {t('Explore full access')}
              </a>
            )}
          </div>
          <div className="trial-allowance">
            <h3>{t('Your {section} allowance', { section: data.label })}</h3>
            <dl>
              <div>
                <dt>{t('Trial test')}</dt>
                <dd className={test === 'available' || test === 'in-progress' ? undefined : 'is-muted'}>{testValue}</dd>
              </div>
              <div>
                <dt>{t('Mr EZ messages')}</dt>
                <dd className={allowance.state === 'available' ? undefined : 'is-muted'}>
                  {allowance.state === 'ended'
                    ? t('Trial ended')
                    : t('{left} of {limit} left', { left: allowance.remaining, limit: allowance.limit })}
                </dd>
              </div>
              <div>
                <dt>{t('Introductory lesson')}</dt>
                <dd className={lesson === 'included' ? undefined : 'is-muted'}>
                  {lesson === 'included' ? t('Included') : t('Locked')}
                </dd>
              </div>
            </dl>
            <small>{t('Each section has its own allowance. It does not reset each day.')}</small>
          </div>
        </div>

        <h2 className="sr-only">{t('Inside your course')}</h2>
        <SectionLibrary data={data} status={status} now={trial.now} />
      </section>
    </div>
  );
}

/** The Course and Lessons pages in a trial build: every section's library,
    with its one open lesson and the rest listed and locked. */
export function TrialLibraryPage({ sections }: { sections: TrialLibrarySection[] }) {
  const { t } = useT();
  const trial = useTrial();
  const [selected, setSelected] = useState<TrialSection>(TRIAL_SECTIONS[0]);
  const account = accountBlock(trial);
  if (trial.phase === 'off') return null;
  if (account) return <TrialAccountState reason={account} />;
  const status = trial.status;
  const data = sections.find((s) => s.section === selected) ?? sections[0];
  if (!status || !data) return null;
  return (
    <div className="trial-ui trial-home">
      <h1>{t('Inside your course')}</h1>
      <p className="trial-lead">
        {t('Your trial opens one introduction and one test in each section. Everything else stays listed, so you can see what full access adds.')}
      </p>
      <SectionTabs sections={sections} selected={selected} onSelect={setSelected} idPrefix="trial-library" />
      <section id="trial-library-panel" role="tabpanel" aria-labelledby={`trial-library-tab-${selected}`}>
        <SectionLibrary data={data} status={status} now={trial.now} expanded />
      </section>
    </div>
  );
}
