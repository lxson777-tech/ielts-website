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
   answered. Keyed by the exact thing that was asked AND by whose review it
   was asked on (sixth Codex round, R2E-02), held for the life of the page
   only: a reply bought by one student is never shown to another, even on
   the same paper with the same answer in the same open page.

   WHOSE REVIEW (R2E-02). The review this sits on belongs to the student who
   sat the paper, and so does every press. The request carries that student
   (`owner`) and is refused, sending nothing, when somebody else is using
   this browser, before any token is fetched (src/lib/tutor/review-owner.ts).
   The button itself goes as soon as the account changes, and the refusal
   is handed to the review (`onOwnerChanged`), which leaves the screen. */

import { useEffect, useRef, useState } from 'react';
import { onAuthChange } from '../../lib/auth/session';
import { useT } from '../../lib/i18n/react';
import MrEzAvatar from './MrEzAvatar';
import { askTutor, isTutorConfigured, newIdempotencyKey, TutorClientError } from '../../lib/tutor/client';
import {
  TutorOwnerChangedError,
  whyWrongCache,
  type ReviewOwnerChange,
} from '../../lib/tutor/review-owner';
import { currentOwner, onOwnerChange, ownerNamespace } from '../../lib/store-owner';
import { isPublishedTestId, sourceTestId } from '../../lib/tutor/test-items';
import type { TutorErrorCode } from '../../lib/tutor/schema';
import '../../styles/mr-ez-debrief.css';

/** Whose review + test id + question id + what was put. Same four things
    means the same question on the same student's review, so the same key
    and the same answer come back. */
const asked = whyWrongCache(newIdempotencyKey);

export interface AskWhyWrongProps {
  /** The paper's own id, sent as it is: the Worker normalises a drill id
      back to the paper it was lifted from. */
  testId: string;
  questionId: string;
  /** Exactly what the student entered. An empty string means they left it
      blank, which Mr EZ is written to treat as its own kind of mistake. */
  given: string;
  /** Whose review this is: the student who sat the paper, as
      src/lib/store-owner.ts spells an owner ('u:<id>'). Every press is bound
      to them (R2E-02). */
  owner: string;
  /** A press was refused because the review belongs to somebody other than
      the account this browser would have sent it as. The review leaves the
      screen. */
  onOwnerChanged?: (now: ReviewOwnerChange) => void;
}

export default function AskWhyWrong({ testId, questionId, given, owner, onOwnerChanged }: AskWhyWrongProps) {
  const { t } = useT();
  const cellRef = useRef(asked.slot(owner, testId, questionId, given));
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [text, setText] = useState<string | null>(cellRef.current.text);
  const [live, setLive] = useState(cellRef.current.live);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; code: TutorErrorCode } | null>(null);
  /* Whether the review's own student is the one using this browser, read
     now and again on every account change. */
  const [ownersTurn, setOwnersTurn] = useState(() => ownerNamespace(currentOwner()) === owner);

  useEffect(() => onAuthChange((user) => setSignedIn(Boolean(user))), []);
  useEffect(() => {
    setOwnersTurn(ownerNamespace(currentOwner()) === owner);
    return onOwnerChange(() => setOwnersTurn(ownerNamespace(currentOwner()) === owner));
  }, [owner]);

  async function ask() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const reply = await askTutor(
        {
          task: 'item',
          review: { testId, items: [{ questionId, given }] },
          idempotencyKey: cellRef.current.idempotencyKey,
        },
        { owner },
      );
      cellRef.current.text = reply.text;
      cellRef.current.live = reply.live;
      setText(reply.text);
      setLive(reply.live);
    } catch (err) {
      if (err instanceof TutorOwnerChangedError) {
        /* Refused before sending: not an error to show on a review that is
           about to leave the screen. A reply dropped after sending (`sent`)
           came back once the account had already changed, and the review
           has already reacted to that change on its own: it is not told
           again, so a student who came back finds their review, and can ask
           again under the same repeat-send key. */
        if (!err.sent) onOwnerChanged?.(err.now);
        return;
      }
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
  /* Somebody else's browser now: none of this review's tutor controls, and
     none of the replies it already bought, stay on screen (R2E-02). */
  if (!ownersTurn) return null;

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
