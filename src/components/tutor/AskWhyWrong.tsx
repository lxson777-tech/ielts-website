/* "Why was my answer wrong?"

   A quiet text button under one wrong question's official explanation. The
   explanation above it already says why the KEY is right; the one thing it
   cannot say is why the particular words THIS student wrote fail, because
   it was written long before they wrote them. That gap is the whole reason
   this button exists, and it is why it sends the student's own answer and
   nothing else.

   Each press spends one of the student's forty daily tutor turns, so it
   fires on a click and on nothing else: never on hover, never on render,
   never on the review list scrolling past.

   The little cache below is not an optimisation. Switching passages on the
   review screen unmounts these cards, and without it, coming back and
   pressing the button again would buy a second answer to a question already
   answered. Keyed by the exact thing that was asked, held for the life of
   the page only. */

import { useEffect, useRef, useState } from 'react';
import { onAuthChange } from '../../lib/auth/session';
import { useT } from '../../lib/i18n/react';
import MrEzAvatar from './MrEzAvatar';
import { askTutor, isTutorConfigured, newIdempotencyKey, TutorClientError } from '../../lib/tutor/client';
import { isPublishedTestId, sourceTestId } from '../../lib/tutor/test-items';
import type { TutorErrorCode } from '../../lib/tutor/schema';
import '../../styles/mr-ez-debrief.css';

interface Answered {
  idempotencyKey: string;
  text: string | null;
  live: boolean;
}

/** test id + question id + what was put. Same three things means the same
    question, so the same key and the same answer come back. */
const asked = new Map<string, Answered>();

function slot(testId: string, questionId: string, given: string): Answered {
  const cacheKey = `${testId}|${questionId}|${given}`;
  const existing = asked.get(cacheKey);
  if (existing) return existing;
  const fresh: Answered = { idempotencyKey: newIdempotencyKey(), text: null, live: true };
  asked.set(cacheKey, fresh);
  return fresh;
}

export interface AskWhyWrongProps {
  /** The paper's own id, sent as it is: the Worker normalises a drill id
      back to the paper it was lifted from. */
  testId: string;
  questionId: string;
  /** Exactly what the student entered. An empty string means they left it
      blank, which Mr EZ is written to treat as its own kind of mistake. */
  given: string;
}

export default function AskWhyWrong({ testId, questionId, given }: AskWhyWrongProps) {
  const { t } = useT();
  const cellRef = useRef(slot(testId, questionId, given));
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [text, setText] = useState<string | null>(cellRef.current.text);
  const [live, setLive] = useState(cellRef.current.live);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; code: TutorErrorCode } | null>(null);

  useEffect(() => onAuthChange((user) => setSignedIn(Boolean(user))), []);

  async function ask() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const reply = await askTutor({
        task: 'item',
        review: { testId, items: [{ questionId, given }] },
        idempotencyKey: cellRef.current.idempotencyKey,
      });
      cellRef.current.text = reply.text;
      cellRef.current.live = reply.live;
      setText(reply.text);
      setLive(reply.live);
    } catch (err) {
      setError(
        err instanceof TutorClientError
          ? { message: err.message, code: err.code }
          : { message: t('Mr EZ could not look at this one just now.'), code: 'unavailable' },
      );
    } finally {
      setBusy(false);
    }
  }

  // No sign-in line here: the debrief card at the top of the review screen
  // already carries that one, and a copy under every wrong question would
  // be nagging. The published-id check is the same one the card makes: a
  // paper the Worker cannot look up must not grow a button that can only
  // fail.
  if (!isTutorConfigured() || !signedIn) return null;
  if (!isPublishedTestId(sourceTestId(testId))) return null;

  return (
    <div className="mrez-why">
      {!text && (
        <button type="button" className="mrez-why-button" onClick={() => void ask()} disabled={busy}>
          {busy ? t('Mr EZ is looking at it…') : t('Why was my answer wrong?')}
        </button>
      )}

      <div aria-live="polite">
        {text && (
          <div className="mrez-why-answer">
            <div className="mrez-why-head">
              <MrEzAvatar mood="explaining" size={24} />
              <strong>Mr EZ</strong>
              {!live && <span className="mrez-sim-badge">{t('Simulated, not a real AI reply')}</span>}
            </div>
            {text.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        {error && (
          <div className="mrez-error mrez-why-error" role="status">
            <p>{error.message}</p>
            {error.code !== 'limit-reached' && (
              <button type="button" onClick={() => void ask()} disabled={busy}>
                {t('Try again')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
