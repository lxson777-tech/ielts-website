/* "You did some work on this device before you signed in. Would you like it?"
 *
 * WHY THIS EXISTS
 * Work done signed out belongs to the device, not to an account, and it is
 * kept under `anon:<deviceId>` where no account can read it. That is what
 * stops a second student on a shared browser quietly inheriting the first
 * one's essays and goal (finding 1 of the 22 September 2026 review). It also
 * means there has to be ONE honest way for the person who actually did that
 * work to take it with them, and this is it: they are shown what is there,
 * in plain counts, and they choose.
 *
 * ONE DECISION COVERS EVERYTHING. The learner record and the four older
 * stores (attempts, essays and their marked reports, speaking results, the
 * study plan, vocabulary, saved lessons and notes) move together, because to
 * a student this is one thing. Saying no leaves all of it exactly where it
 * is, for them to come back to; nothing is ever deleted either way.
 *
 * IT ASKS ONCE AND THEN GETS OUT OF THE WAY. The answer is remembered on the
 * device, so a student is not nagged, and no other account is offered that
 * work afterwards. Nothing here judges, scores or uploads: claiming writes
 * to this browser, and the ordinary sync sends it afterwards.
 */

import { useEffect, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import {
  claimAnonymousWork,
  declineAnonymousWork,
  describeAnonymousWork,
} from '../../lib/learning/store.browser';
import type { AnonymousWorkOffer } from '../../lib/learning/contracts/sync';

type Answer = 'asking' | 'claimed' | 'declined';

export interface AnonymousWorkClaimProps {
  /** Bumped by the account widget once sign-in has finished and the stores
      have moved to the new student. Looking before that would read the
      previous owner's view of the device. */
  token: number;
}

export default function AnonymousWorkClaim({ token }: AnonymousWorkClaimProps) {
  const { t, tn } = useT();
  const [offer, setOffer] = useState<AnonymousWorkOffer | null>(null);
  const [answer, setAnswer] = useState<Answer>('asking');

  useEffect(() => {
    if (token === 0) {
      setOffer(null);
      return;
    }
    setAnswer('asking');
    try {
      setOffer(describeAnonymousWork());
    } catch {
      /* A store that cannot be read is not something to interrupt a sign-in
         over. Nothing is offered, and nothing is lost: the work stays. */
      setOffer(null);
    }
  }, [token]);

  if (!offer) return null;

  const legacy = offer.summary.legacy;
  /* Only what is actually there. A list of zeroes is noise, and a count the
     student cannot recognise is worse than no count. */
  const lines: string[] = [];
  if (offer.summary.lessonsStudied > 0) {
    lines.push(
      tn(offer.summary.lessonsStudied, { one: '{n} lesson studied', other: '{n} lessons studied' }, {
        n: offer.summary.lessonsStudied,
      }),
    );
  }
  if (offer.summary.attempts > 0) {
    lines.push(
      tn(offer.summary.attempts, { one: '{n} practice attempt', other: '{n} practice attempts' }, {
        n: offer.summary.attempts,
      }),
    );
  }
  if (legacy && legacy.testAttempts > 0) {
    lines.push(
      tn(legacy.testAttempts, { one: '{n} test attempt', other: '{n} test attempts' }, { n: legacy.testAttempts }),
    );
  }
  if (legacy && legacy.essays > 0) {
    lines.push(tn(legacy.essays, { one: '{n} marked essay', other: '{n} marked essays' }, { n: legacy.essays }));
  }
  if (legacy && legacy.speakingResults > 0) {
    lines.push(
      tn(legacy.speakingResults, { one: '{n} speaking result', other: '{n} speaking results' }, {
        n: legacy.speakingResults,
      }),
    );
  }
  if (legacy && legacy.vocabularyWords > 0) {
    lines.push(
      tn(legacy.vocabularyWords, { one: '{n} vocabulary word', other: '{n} vocabulary words' }, {
        n: legacy.vocabularyWords,
      }),
    );
  }
  const saved = (legacy?.savedLessons ?? 0) + (legacy?.notes ?? 0);
  if (saved > 0) {
    lines.push(tn(saved, { one: '{n} saved lesson or note', other: '{n} saved lessons and notes' }, { n: saved }));
  }
  if (offer.summary.hasPlan) lines.push(t('Your target band and exam date'));

  const close = () => setOffer(null);

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-4 sm:justify-end sm:px-6">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-card-hover transition-all duration-200">
        {answer === 'asking' ? (
          <div className="px-5 py-4">
            <p className="font-display text-sm font-bold">{t('Work saved on this device')}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              {t('You were signed out when you did this. Add it to your account, or leave it here on this device.')}
            </p>
            {lines.length > 0 && (
              <ul className="mt-3 space-y-1">
                {lines.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-ink">
                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    claimAnonymousWork();
                  } catch {
                    /* Nothing moved. The work is still on this device and
                       the student can be asked again next time. */
                  }
                  setAnswer('claimed');
                }}
                className="flex-1 rounded-full bg-brand px-4 py-2 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5"
              >
                {t('Add to my account')}
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    declineAnonymousWork();
                  } catch {
                    /* Same: the work stays exactly where it is. */
                  }
                  setAnswer('declined');
                }}
                className="flex-1 rounded-full bg-surface-alt px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-brand-tint hover:text-brand"
              >
                {t('Leave it here')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <p className="text-xs text-ink-muted">
              {answer === 'claimed' ? t('Added to your account.') : t('Left on this device.')}
            </p>
            <button
              type="button"
              onClick={close}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-tint"
            >
              {t('Close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
