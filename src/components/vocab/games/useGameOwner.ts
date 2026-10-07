/* Whose game is on screen, the same rule as the practice round
   (src/components/vocab-round-owner.ts and ../../learning/exercise-owner.ts).

   A game belongs to the student on the page when it STARTS. Every answer is
   claimed at the click and written under that student; a click from a tab
   that missed an account change is refused and writes nothing. When the
   page changes hands (a sign-out, a sign-in, or a switch in another tab)
   the game goes back to its start screen with the calm line the other
   exercises use: every answer already given was written under its own
   student, so nothing is lost and nothing of theirs stays on screen. */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CacheOwner } from '../../../lib/learning/contracts/sync';
import { currentOwner, onOwnerChange } from '../../../lib/store-owner';
import {
  EXERCISE_OWNER_CHANGED_NOTE,
  claimExerciseCheck,
  exerciseIsCurrent,
  openExerciseSession,
  type ExerciseSession,
} from '../../learning/exercise-owner';

export interface GameOwner {
  /** Bind a new game to the student on the page now. */
  open: () => ExerciseSession;
  /** Run `write` for this game's student, if the click is still theirs.
      False (and the game handed back to its start) when it is not. */
  claim: (write: (owner: CacheOwner) => void) => boolean;
  /** The game's student while they are still the one on the page. */
  ownerNow: () => CacheOwner | null;
  /** The calm line after a hand-over, or null. */
  note: string | null;
  clearNote: () => void;
  /** Signed in right now (for the gentle sign-in line). */
  signedIn: boolean;
}

export function useGameOwner(onHandOver: () => void): GameOwner {
  const sessionRef = useRef<ExerciseSession | null>(null);
  const handOverRef = useRef(onHandOver);
  handOverRef.current = onHandOver;
  const [note, setNote] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  const handOver = useCallback(() => {
    sessionRef.current = null;
    setNote(EXERCISE_OWNER_CHANGED_NOTE);
    handOverRef.current();
  }, []);

  const open = useCallback(() => {
    const session = openExerciseSession();
    sessionRef.current = session;
    setSignedIn(session.owner.kind === 'user');
    return session;
  }, []);

  const claim = useCallback(
    (write: (owner: CacheOwner) => void) => {
      const claimed = claimExerciseCheck(sessionRef.current);
      if ('refused' in claimed) {
        handOver();
        return false;
      }
      try {
        write(claimed.binding.owner);
      } finally {
        claimed.binding.cancel();
      }
      return true;
    },
    [handOver],
  );

  const ownerNow = useCallback(() => {
    const session = sessionRef.current;
    return session && exerciseIsCurrent(session) ? session.owner : null;
  }, []);

  useEffect(() => {
    setSignedIn(currentOwner().kind === 'user');
    const stop = onOwnerChange(() => {
      setSignedIn(currentOwner().kind === 'user');
      const session = sessionRef.current;
      if (session && !exerciseIsCurrent(session)) handOver();
    });
    return () => {
      stop();
    };
  }, [handOver]);

  return { open, claim, ownerNow, note, clearNote: () => setNote(null), signedIn };
}
