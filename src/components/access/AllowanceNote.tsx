/* One plain line BEFORE a placement test or a mock exam starts: what it
   uses and what remains (Alex's decision of 1 October 2026, review P1-6).

   The placement test is taken once per account and a full mock exam is one
   of 2 per 30-day purchase; NEITHER uses the 2 live interviews. The server
   enforces this (Builder M); these lines only say it, from the server's own
   counts. Placement essays are marked as one of the 12 essay assessments
   (the review's direction: keep counting them, and say so before starting).
   Mock exam essays are not graded inside the mock; checked afterwards in the
   Writing Checker they are ordinary essays and use the 12 too.

   Gated build with running paid access only (both pages are paid-only
   there). The open site and any other state render nothing. */

import { useT } from '../../lib/i18n/react';
import { useTrial } from '../../lib/trial/react';
import { isTrialBuild } from '../../lib/trial/mode';
import { PAID_ALLOWANCE, assessmentBalance, type AssessmentBalanceView } from '../../lib/trial/status';
import { withBase } from '../../lib/url';
import { periodDate } from './assessment-refusal';
import './assessment.css';

export type AllowanceUse =
  /** The placement test's intro screen. */
  | 'placement'
  /** The placement test's Writing brief. */
  | 'placement-writing'
  /** The placement test's Speaking brief. */
  | 'placement-speaking'
  /** Mock Exam Day's start screen. */
  | 'mock'
  /** The mock's Speaking brief, the moment a mock is counted. */
  | 'mock-speaking';

type PaidView = Extract<AssessmentBalanceView, { kind: 'paid' }>;

/** The paid balance on a gated build, or null when there is none to show. */
export function usePaidBalance(): PaidView | null {
  const trial = useTrial(30_000);
  if (!isTrialBuild() || trial.phase !== 'ready') return null;
  const view = assessmentBalance(trial.status, trial.now);
  return view.kind === 'paid' ? view : null;
}

/** Whether the mock's Speaking interview can start, by the server's counts:
    false only when the server says both mocks of this period are used. */
export function mockSpeakingAllowed(balance: PaidView | null): boolean {
  return !balance || balance.mock > 0;
}

export default function AllowanceNote({ use }: { use: AllowanceUse }) {
  const { t, locale } = useT();
  const balance = usePaidBalance();
  if (!balance) return null;
  const essays = { n: balance.writing, total: PAID_ALLOWANCE.writing };
  const live = { n: balance.live, total: PAID_ALLOWANCE.live };

  let text = '';
  let empty = false;
  switch (use) {
    case 'placement':
      if (balance.placementTaken) {
        empty = true;
        text = t('The placement test is taken once per account, and this account has already taken it. Your plan already uses that result.');
        break;
      }
      text = [
        t('The placement test is taken once per account.'),
        t('Its Speaking interview does not use your live interviews ({n} of {total} left).', live),
        t('Its Writing report is marked as one of your essay assessments ({n} of {total} left in this 30-day period).', essays),
      ].join(' ');
      break;
    case 'placement-writing':
      empty = balance.writing === 0;
      text = empty
        ? t('You have used all {n} essay assessments in this 30-day period, so this report cannot be marked now. You can carry on without marking.', {
            n: PAID_ALLOWANCE.writing,
          })
        : t('Marking this report uses one of your essay assessments ({n} of {total} left in this 30-day period).', essays);
      break;
    case 'placement-speaking':
      text = t('This interview is part of your once-per-account placement test. It does not use your live interviews ({n} of {total} left).', live);
      break;
    case 'mock':
      empty = balance.mock === 0;
      text = [
        t('Full mock exams: {n} of {total} left in this 30-day period. Its Speaking interview does not use your live interviews.', {
          n: balance.mock,
          total: PAID_ALLOWANCE.mock,
        }),
        t('Writing is not graded during the mock. Essays you check afterwards in the Writing Checker use your essay assessments ({n} of {total} left).', essays),
      ].join(' ');
      break;
    case 'mock-speaking':
      empty = balance.mock === 0;
      text = empty
        ? [
            t('You have used both full mock exams in this 30-day period, so this Speaking interview cannot start. You can skip Speaking and keep your other papers.'),
            balance.nextPeriodStartsAt
              ? t('Your next 30-day period starts on {date}.', { date: periodDate(balance.nextPeriodStartsAt, locale) })
              : '',
          ]
            .filter(Boolean)
            .join(' ')
        : t('This interview counts as one of your {total} full mock exams for this 30-day period ({n} left). It does not use your live interviews.', {
            n: balance.mock,
            total: PAID_ALLOWANCE.mock,
          });
      break;
  }
  return (
    <p className={`allowance-note${empty ? ' is-empty' : ''}`} data-allowance-note={use} role="note">
      {text}
      {empty && use !== 'placement' && (
        <>
          {' '}
          <a href={withBase('/plans')}>{t('See plans and what is included')}</a>
        </>
      )}
    </p>
  );
}
