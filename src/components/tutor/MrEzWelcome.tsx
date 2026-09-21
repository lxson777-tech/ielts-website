/* Mr EZ's voice, INSIDE the Today session card, since 2026-09-22.
   Not a separate welcome card any more: Today's own reason line is what he
   explains. This component owns only the wording; the activity, the link
   and the minutes all stay the deterministic session's, so nothing the
   model writes can point anywhere real evidence did not already choose.

   THREE PASSES, SAME ORDER AS BEFORE
   1. The deterministic reason (`session.reason`) is shown immediately. No
      network, no spinner where the words should be.
   2. Signed in, with a tutor configured, his own wording replaces it when it
      arrives.
   3. Unreachable, unconfigured or signed out: the plain version stands, and
      nothing visibly fails.

   STALE REPLIES ARE DISCARDED, NOT SHOWN
   A reply is asked for against one exact session (its id and its plan
   revision). By the time it lands the student may have finished a step, or
   the plan may have replanned — either bumps the revision, or changes the
   session id. `sessionRef` always holds the latest session prop, so the
   promise callback can compare "what I asked about" with "what is current"
   and drop an answer that no longer describes the session on screen. */

import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import MrEzAvatar from './MrEzAvatar';
import { askTutor, isTutorConfigured, TutorClientError } from '../../lib/tutor/client';
import type { TutorMood } from '../../lib/tutor/schema';
import type { SharedSessionView } from '../../lib/learning';

export interface MrEzVoiceProps {
  session: SharedSessionView;
  /** Null while auth has not resolved yet, same convention as the rest of
      the tutor surfaces. */
  signedIn: boolean | null;
}

interface TutorView {
  sessionId: string;
  planRevision: number;
  text: string;
  mood: TutorMood;
  live: boolean;
}

export default function MrEzWelcome({ session, signedIn }: MrEzVoiceProps) {
  const { t } = useT();
  const [tutor, setTutor] = useState<TutorView | null>(null);
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Session|revision pairs already asked about, successfully or not, so a
      re-render does not fire the same request twice. */
  const askedRef = useRef(new Set<string>());
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    askedRef.current.clear();
    setNotice(null);
    setTutor(null);
  }, [signedIn]);

  const askKey = `${session.sessionId}|${session.planRevision}`;

  useEffect(() => {
    // Never ask Mr EZ to explain a guessed plan: Intake owns that screen,
    // and a confirmed goal is what makes his wording specific rather than
    // generic in the first place (mirrors the old needsGoal gate).
    if (!session.confirmed) return;
    if (!isTutorConfigured() || !signedIn) return;
    if (tutor && tutor.sessionId === session.sessionId && tutor.planRevision === session.planRevision) return;
    if (askedRef.current.has(askKey)) return;

    askedRef.current.add(askKey);
    const askedSessionId = session.sessionId;
    const askedRevision = session.planRevision;
    let cancelled = false;
    setAsking(true);

    void askTutor({ task: 'welcome' })
      .then((reply) => {
        if (cancelled) return;
        const now = sessionRef.current;
        // Stale by the time it landed: the student moved on. Drop it rather
        // than show wording about a session that is no longer current.
        if (now.sessionId !== askedSessionId || now.planRevision !== askedRevision) return;
        setTutor({ sessionId: askedSessionId, planRevision: askedRevision, text: reply.text, mood: reply.mood, live: reply.live });
      })
      .catch((err) => {
        if (cancelled) return;
        // Silent by design for the ordinary failures: the plain reason on
        // screen is already correct. Only a spent daily limit is worth a
        // word, because it explains why he has gone quiet.
        if (err instanceof TutorClientError && (err.code === 'limit-reached' || err.code === 'site-limit-reached')) {
          setNotice(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setAsking(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askKey, session.confirmed, signedIn]);

  const fresh = tutor && tutor.sessionId === session.sessionId && tutor.planRevision === session.planRevision ? tutor : null;
  const text = fresh?.text ?? session.reason;
  const mood: TutorMood = asking ? 'thinking' : fresh?.mood ?? 'idle';

  return (
    <div className="today-voice">
      <MrEzAvatar mood={mood} size={44} label="Mr EZ" />
      <div className="today-voice-body">
        <p className="today-voice-name">
          Mr EZ
          {fresh && !fresh.live && <span className="mrez-sim-badge">{t('Simulated, not a real AI reply')}</span>}
        </p>
        <p className="today-voice-text">{text}</p>
        {notice && <p className="today-voice-note">{notice}</p>}
      </div>
    </div>
  );
}
