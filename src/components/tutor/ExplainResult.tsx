/* "Ask Mr EZ to explain this result."

   Sits under a band report. It never re-marks anything: the grading has
   already happened and already been paid for, and this sends a POINTER to
   the stored attempt (its kind and its timestamp), not the essay or the
   audio. The Worker looks that pointer up inside the student's own record,
   which is both the ownership check and the reason a second explanation
   costs one cheap tutor turn rather than another grading run.

   It is a button, not an automatic panel. Nobody wants an unsolicited
   lecture the moment their band appears. */

import { useRef, useState } from 'react';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import MrEzAvatar from './MrEzAvatar';
import { askTutor, isTutorConfigured, newIdempotencyKey, tutorUnavailableReason, TutorClientError } from '../../lib/tutor/client';
import type { TutorAttemptRef, TutorRecommendation } from '../../lib/tutor/schema';

export interface ExplainResultProps {
  attempt: TutorAttemptRef;
  /** Shown above the button, e.g. "estimated band 6.5". */
  summary?: string;
}

export default function ExplainResult({ attempt, summary }: ExplainResultProps) {
  const { t } = useT();
  const [text, setText] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<TutorRecommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  // One key per result, so pressing the button twice (or retrying after a
  // timeout) replays the first answer rather than buying a second one.
  const keyRef = useRef(newIdempotencyKey());

  const configured = isTutorConfigured();

  async function explain() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const reply = await askTutor({ task: 'explain', attempt, idempotencyKey: keyRef.current });
      setText(reply.text);
      setRecommendation(reply.recommendation ?? null);
      setLive(reply.live);
    } catch (err) {
      setError(err instanceof TutorClientError ? err.message : t('Mr EZ could not explain this just now.'));
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="mrez-explain is-off">
        <p>{tutorUnavailableReason()}</p>
      </div>
    );
  }

  return (
    <div className="mrez-explain">
      {!text && (
        <div className="mrez-explain-cta">
          <MrEzAvatar mood={busy ? 'thinking' : 'idle'} size={34} />
          <div>
            <p className="mrez-explain-lead">
              {summary ? `${summary}. ` : ''}{t('Want this explained, and one thing to work on next?')}
            </p>
            <button type="button" className="mrez-explain-button" onClick={() => void explain()} disabled={busy}>
              {busy ? t('Mr EZ is reading it…') : t('Ask Mr EZ to explain this result')}
            </button>
            <p className="mrez-explain-note">
              {t('He reads the marking that has already been done. Nothing is sent for marking again.')}
            </p>
          </div>
        </div>
      )}

      {text && (
        <div className="mrez-explain-answer">
          <div className="mrez-explain-head">
            <MrEzAvatar mood="explaining" size={30} />
            <strong>Mr EZ</strong>
            {!live && <span className="mrez-sim-badge">{t('Simulated, not a real AI reply')}</span>}
          </div>
          {text.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {recommendation && (
            <a className="mrez-rec" href={withBase(recommendation.href)}>
              {/* A lesson title arrives English from the Worker (course
                  titles live in the site dictionary, which it cannot read);
                  an already-translated label passes through unchanged. */}
              <span className="mrez-rec-label">{t(recommendation.label)}</span>
              <span className="mrez-rec-reason">{recommendation.reason}</span>
            </a>
          )}
          <p className="mrez-explain-note">
            {t("This band is an estimate from this platform's AI marking. It is not an official IELTS result.")}
          </p>
        </div>
      )}

      {error && (
        <div className="mrez-error" role="status">
          <p>{error}</p>
          <button type="button" onClick={() => void explain()} disabled={busy}>{t('Try again')}</button>
        </div>
      )}
    </div>
  );
}
