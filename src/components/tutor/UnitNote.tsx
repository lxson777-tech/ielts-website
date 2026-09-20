/* Mr EZ's note inside a course unit card: a short "why this unit matters"
   line shown on the student's current unit, and a "you finished it" note
   right after they complete one. Rendered by Course.tsx between a unit's
   blurb and its lesson list.

   Same two-pass discipline as MrEzWelcome.tsx (read its header comment for
   the full reasoning this is copied from): the deterministic fallback text
   (unitFallbackText, from src/lib/tutor/units.ts) renders immediately from
   this device's own stored progress, and Mr EZ's own wording only replaces
   it once a request to the tutor Worker succeeds. Local and tutor state are
   kept separate and reconciled by fingerprint, and a fingerprint already
   asked about is never asked again.

   One thing this component has to be stricter about than the dashboard: the
   'intro' fingerprint (unitFingerprint in units.ts) deliberately leaves out
   how many lessons in the unit are done, so that ticking one off does not
   read as "something new to ask Mr EZ about". The tutor-asking effect below
   depends on the fingerprint STRING alone, never on the local view object,
   so a progress change that leaves the fingerprint unchanged can never fire
   a second request. */

import { useEffect, useRef, useState } from 'react';
import MrEzAvatar from './MrEzAvatar';
import { askTutor, isTutorConfigured } from '../../lib/tutor/client';
import { localInsights } from '../../lib/tutor/local';
import { readUnit, unitFallbackText, unitFingerprint, type UnitNoteKind } from '../../lib/tutor/units';
import type { TutorMood } from '../../lib/tutor/schema';
import { onAuthChange } from '../../lib/auth/session';
import { getProgress, onProgressChange } from '../../lib/progress';
import { loadStudyPlan, onStudyPlanChange } from '../../lib/study-plan';
import '../../styles/mr-ez-unit.css';

/** The non-AI view: the fallback text plus the fingerprint it was written
    against. Rebuilt whenever progress or the study plan changes. */
interface LocalView {
  fingerprint: string;
  text: string;
}

/** Mr EZ's own wording, tagged with the fingerprint it answers. */
interface TutorView {
  fingerprint: string;
  text: string;
  mood: TutorMood;
  live: boolean;
}

/** Everything that decides whether this unit gets a note at all, and what it
    says when it does. Returns null for every case Course.tsx's caller is
    told to render nothing for: no goal yet, no unit, nothing relevant for an
    intro, not actually finished for a wrap, or an empty fallback string. */
function buildLocalView(unitId: number, kind: UnitNoteKind): LocalView | null {
  const insights = localInsights();
  if (!insights.goals.targetBand || insights.goals.guessed) return null;

  const facts = readUnit(unitId, getProgress(), loadStudyPlan(), insights);
  if (!facts) return null;
  if (kind === 'intro' && facts.relevance.length === 0) return null;
  if (kind === 'wrap' && !facts.complete) return null;

  const text = unitFallbackText(facts, kind);
  if (!text) return null;

  return { fingerprint: unitFingerprint(facts, kind, insights.goals.targetBand), text };
}

export interface UnitNoteProps {
  unitId: number;
  kind: UnitNoteKind;
}

export default function UnitNote({ unitId, kind }: UnitNoteProps) {
  const [local, setLocal] = useState<LocalView | null>(null);
  const [tutor, setTutor] = useState<TutorView | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  /** Fingerprints already asked about, successfully or not, so a failed ask
      is not retried in a loop by the next store write. Cleared when the
      signed-in state changes, exactly as in MrEzWelcome.tsx. */
  const askedRef = useRef(new Set<string>());

  useEffect(() => {
    askedRef.current.clear();
  }, [signedIn]);

  // Everything is read after mount: these stores are localStorage-backed, so
  // a server render and the first client render must agree on "nothing yet".
  useEffect(() => {
    const refresh = () => setLocal(buildLocalView(unitId, kind));
    refresh();
    const offProgress = onProgressChange(refresh);
    const offPlan = onStudyPlanChange(refresh);
    const offAuth = onAuthChange((user) => setSignedIn(Boolean(user)));
    return () => {
      offProgress();
      offPlan();
      offAuth();
    };
  }, [unitId, kind]);

  const fingerprint = local?.fingerprint ?? null;

  // Mr EZ's own wording. Depends on the fingerprint STRING, not on `local`
  // itself — see the header comment on why that distinction matters here.
  useEffect(() => {
    if (!fingerprint || !isTutorConfigured() || !signedIn) return;
    if (tutor?.fingerprint === fingerprint) return;
    if (askedRef.current.has(fingerprint)) return;

    askedRef.current.add(fingerprint);
    let cancelled = false;
    setAsking(true);

    void askTutor({ task: 'unit', unit: { unitId, kind } })
      .then((reply) => {
        if (cancelled) return;
        setTutor({ fingerprint, text: reply.text, mood: reply.mood, live: reply.live });
      })
      .catch(() => {
        // Silent by design: the server refuses with a 400 when it has
        // nothing to add, and any other failure just leaves the already-
        // correct local text on screen.
      })
      .finally(() => {
        if (!cancelled) setAsking(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately
    // fingerprint-keyed, not local-keyed; see header comment.
  }, [fingerprint, signedIn]);

  if (!local) return null;

  const fresh = tutor && tutor.fingerprint === local.fingerprint ? tutor : null;
  const text = fresh?.text ?? local.text;
  const fromTutor = Boolean(fresh);
  const showSimBadge = fromTutor && !fresh?.live;

  const mood: TutorMood = asking
    ? 'thinking'
    : kind === 'wrap'
      ? fresh?.mood ?? 'encouraging'
      : fromTutor
        ? 'explaining'
        : 'idle';

  return (
    <div className={`mrez-unit-note is-${kind}`} role="note" aria-label="Mr EZ on this unit">
      <MrEzAvatar mood={mood} size={28} />
      <div className="mrez-unit-note-body">
        <span className="mrez-unit-note-label">
          Mr EZ
          {showSimBadge && <span className="mrez-sim-badge">Simulated, not a real AI reply</span>}
        </span>
        <p className="mrez-unit-note-text">{text}</p>
      </div>
    </div>
  );
}
