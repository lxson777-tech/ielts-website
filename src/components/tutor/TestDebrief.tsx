/* "Go through my mistakes with Mr EZ."

   Sits on the review screen of a finished paper, above the list of
   questions. It exists for the one thing the per-question notes underneath
   it cannot do: read the wrong answers AS A SET and say what they have in
   common. Every question already carries a written explanation of the
   correct answer, and that explanation is already on screen a few
   centimetres below this card, so repeating it here would be noise.

   What travels: the test id, the ids of the questions that went wrong, and
   what the student put. Never a question, never a passage, never an answer
   key. The Worker fetches the paper itself by id and looks each question up,
   which is why a client cannot feed the model a made-up question.

   It is a button, never automatic. Each press spends one of the student's
   daily tutor turns, and nobody wants a lecture to start on its own the
   moment a paper is marked.

   Visibility is decided by the caller (TestPlayer) for the things only it
   knows: the paper is submitted, this is not a mock exam leg and not a
   retake in progress. What this component decides for itself is whether
   there is a tutor at all, whether anything actually went wrong, and
   whether the student is signed in. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PracticeTest } from '../../lib/tests/schema';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import { onAuthChange } from '../../lib/auth/session';
import MrEzAvatar from './MrEzAvatar';
import { askTutor, isTutorConfigured, newIdempotencyKey, TutorClientError } from '../../lib/tutor/client';
import { isPublishedTestId, sourceTestId } from '../../lib/tutor/test-items';
import { wrongItems } from '../../lib/tutor/wrong-items';
import type { TutorErrorCode, TutorRecommendation } from '../../lib/tutor/schema';
import '../../styles/mr-ez-debrief.css';

export interface TestDebriefProps {
  test: PracticeTest;
  /** Exactly what the student had entered when they submitted. */
  answers: Record<string, string>;
  /** The ids that EARNED a mark, straight from scoredQuestionIds(). */
  correctIds: ReadonlySet<string>;
  /** How many questions the score was out of. */
  scoredTotal: number;
}

export default function TestDebrief({ test, answers, correctIds, scoredTotal }: TestDebriefProps) {
  const { t, tn } = useT();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<TutorRecommendation | null>(null);
  const [live, setLive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; code: TutorErrorCode } | null>(null);

  /* One key for this attempt. A second press, or a retry after a timeout,
     replays the first answer instead of buying a second one. A fresh attempt
     or a retake mounts a fresh card, and so gets a fresh key. */
  const keyRef = useRef(newIdempotencyKey());

  useEffect(() => onAuthChange((user) => setSignedIn(Boolean(user))), []);

  const items = useMemo(() => wrongItems(test, answers, correctIds), [test, answers, correctIds]);

  const configured = isTutorConfigured();
  /* A retake's synthetic id has no published paper behind it, so the Worker
     could not look the questions up even if we asked. Checked here rather
     than trusted to the caller, because a card that offers a button which
     can only fail is worse than no card. */
  const answerable = isPublishedTestId(sourceTestId(test.id));

  async function ask() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const reply = await askTutor({
        task: 'debrief',
        review: { testId: test.id, items },
        idempotencyKey: keyRef.current,
      });
      setText(reply.text);
      setRecommendation(reply.recommendation ?? null);
      setLive(reply.live);
    } catch (err) {
      setError(
        err instanceof TutorClientError
          ? { message: err.message, code: err.code }
          : { message: t('Mr EZ could not go through these just now.'), code: 'unavailable' },
      );
    } finally {
      setBusy(false);
    }
  }

  // Nothing to add: no tutor on this build, nothing went wrong, or this
  // paper is not one he can look up. The written explanations below are
  // already there, so an apology card would only be clutter.
  if (!configured || !answerable || items.length === 0) return null;

  // Auth state is still unknown on the first paint. Render nothing rather
  // than flash a sign-in line at a student who is already signed in.
  if (signedIn === null) return null;

  if (!signedIn) {
    return (
      <p className="mrez-debrief-signin">
        {t('Sign in and Mr EZ can go through your mistakes with you.')}{' '}
        <a href={withBase('/account')}>{t('Sign in')}</a>
      </p>
    );
  }

  const missed = items.length;

  return (
    <section className="mrez-debrief" aria-label={t('Go through your mistakes with Mr EZ')}>
      {!text && (
        <div className="mrez-debrief-cta">
          <MrEzAvatar mood={busy ? 'thinking' : 'idle'} size={34} />
          <div className="mrez-debrief-body">
            <p className="mrez-debrief-lead">
              {tn(missed, {
                one: 'You missed {missed} of {total}. Want to see what they have in common?',
                other: 'You missed {missed} of {total}. Want to see what they have in common?',
              }, { missed, total: scoredTotal })}
            </p>
            <button type="button" className="mrez-debrief-button" onClick={() => void ask()} disabled={busy}>
              {busy ? t('Mr EZ is reading them…') : t('Go through my mistakes with Mr EZ')}
            </button>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {text && (
          <div className="mrez-debrief-answer">
            <div className="mrez-debrief-head">
              <MrEzAvatar mood="explaining" size={30} />
              <strong>Mr EZ</strong>
              {!live && <span className="mrez-sim-badge">{t('Simulated, not a real AI reply')}</span>}
            </div>
            {text.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            {recommendation && (
              <a className="mrez-rec" href={withBase(recommendation.href)}>
                <span className="mrez-rec-label">{recommendation.label}</span>
                <span className="mrez-rec-reason">{recommendation.reason}</span>
              </a>
            )}
            <p className="mrez-debrief-note">
              {t('He read the marking that was already done. Nothing was re-scored.')}
            </p>
          </div>
        )}

        {error && (
          <div className="mrez-error" role="status">
            <p>{error.message}</p>
            {error.code !== 'limit-reached' && (
              <button type="button" onClick={() => void ask()} disabled={busy}>
                {t('Try again')}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
