/* "Assessments left": the account's AI assessments, as the server counted
   them (src/lib/trial/status.ts, assessmentBalance).

   Shows only what is true and useful (review of 1 October 2026, P2-6): this
   30-day period's counts while paid access runs, and NOTHING otherwise (no
   access, ended access, a trial), where any number would mislead. The open
   site has no trial client, so this renders nothing there.

   The counts follow the server: the Writing and Speaking screens ask it
   again after every graded essay or recording, and this re-renders. */

import { useT } from '../../lib/i18n/react';
import { useTrial } from '../../lib/trial/react';
import { PAID_ALLOWANCE, assessmentBalance } from '../../lib/trial/status';
import { periodDate } from './assessment-refusal';
import './assessment.css';

export default function AssessmentBalance() {
  const trial = useTrial(30_000);
  const { t, locale } = useT();
  if (trial.phase !== 'ready') return null;
  const view = assessmentBalance(trial.status, trial.now);
  /* Paid access only (Alex, 1 October 2026: the free trial is being
     replaced, so its states are not shown here). */
  if (view.kind !== 'paid') return null;

  const rows: { label: string; left: number; total: number }[] = [
    /* Paper names stay English in both languages (docs/I18N-GUIDE.md). */
    { label: 'Writing', left: view.writing, total: PAID_ALLOWANCE.writing },
    { label: t('Recorded Speaking'), left: view.speaking, total: PAID_ALLOWANCE.speaking },
    { label: t('Live interviews'), left: view.live, total: PAID_ALLOWANCE.live },
    { label: t('Full mock exams'), left: view.mock, total: PAID_ALLOWANCE.mock },
  ];
  return (
    <aside className="assessment-balance" aria-live="polite" data-assessment-balance="paid">
      <b>{t('Assessments left in this 30-day period')}</b>
      <ul>
        {rows.map((row) => (
          <li key={row.label} className={row.left === 0 ? 'is-empty' : undefined}>
            <span>{row.label}</span>
            <span className="assessment-balance-count">{t('{left} of {total}', { left: row.left, total: row.total })}</span>
          </li>
        ))}
      </ul>
      {view.nextPeriodStartsAt ? (
        <p>{t('Your next 30-day period starts on {date}.', { date: periodDate(view.nextPeriodStartsAt, locale) })}</p>
      ) : view.periodEndsAt ? (
        <p>{t('This period ends on {date}. Unused assessments do not carry over.', { date: periodDate(view.periodEndsAt, locale) })}</p>
      ) : null}
    </aside>
  );
}
