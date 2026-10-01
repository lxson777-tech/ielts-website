/* /placement: the one-sitting placement test.
 *
 * Four parts in a fixed order, each on its own clock, about forty minutes in
 * all (src/data/placement.ts): one Listening part and one Reading passage on
 * the existing test player, one Writing Task 1 marked by the existing essay
 * grader, and a short Speaking Part 1 interview with the existing live
 * examiner. Taken ONCE per account; the results stay here afterwards.
 *
 * WHAT DECIDES WHICH SCREEN SHOWS
 *   signed out                     an invitation to sign in (the learning
 *                                  record and the graders are per account)
 *   a sitting under way here       the part it is on, with the stepper
 *   the record holds a placement   the results (on any device)
 *   the material cannot be found   a calm "not available" (the trial build
 *                                  swaps the big data modules for empty
 *                                  stand-ins; the page never crashes on it)
 *   otherwise                      the introduction and one Start button
 *
 * WHOSE PLACEMENT: ./placement-owner.ts. The sitting is bound to the student
 * on the page when it opens, handed over (kept for them, cleared from the
 * screen, one calm line) when the account changes, and every press is
 * claimed first.
 *
 * AFTER THE LAST PART the plan is rebuilt from the new evidence
 * (onEvidenceRecorded, the one place allowed to replan on new evidence)
 * before the results read a single estimate.
 *
 * TRIAL BUILD NOTE: the page is structured so one BaseLayout prop can lock
 * it (src/pages/placement.astro); nothing here depends on the trial.
 */

import { useEffect, useRef, useState } from 'react';
import type { PracticeTest } from '../../lib/tests/schema';
import type { EssayPrompt } from '../../lib/writing/schema';
import type { Part1Topic } from '../../lib/speaking/schema';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { isAuthConfigured } from '../../lib/auth/supabase';
import { currentOwner, deviceStorage, onOwnerChange, sameOwner } from '../../lib/store-owner';
import {
  ensureLearningWired,
  onEvidenceRecorded,
  onLearnerRecordChange,
  readLearnerRecord,
} from '../../lib/learning';
import { PLACEMENT, PLACEMENT_TOTAL_MINUTES } from '../../data/placement';
import {
  currentPlacementPart,
  reconcilePlacementFromRecord,
  type PlacementPart,
} from '../../lib/placement/state';
import { placementTaken } from '../../lib/placement/results';
import type { ExerciseRefusal } from '../learning/exercise-owner';
import TestPlayer from '../TestPlayer';
import { signInHref } from '../../lib/auth/profile';
import {
  PLACEMENT_OWNER_CHANGED_NOTE,
  beginPlacementFor,
  claimPlacementPress,
  openPlacement,
  type OpenedPlacement,
} from './placement-owner';
import { PART_NAME, PartBrief, PlacementFrame, PlacementStepper } from './PlacementFrame';
import PlacementWriting from './PlacementWriting';
import PlacementSpeaking from './PlacementSpeaking';
import PlacementResults from './PlacementResults';
import { placementScreen } from './placement-screen';
import AllowanceNote from '../access/AllowanceNote';
import '../../styles/placement.css';

ensureLearningWired();

/** The material, resolved from the real data by the page. Null for anything
    the data does not have (see the trial build note above). */
export interface PlacementMaterialProps {
  listening: PracticeTest | null;
  reading: PracticeTest | null;
  writing: EssayPrompt | null;
  speaking: Part1Topic | null;
}

export default function Placement({ material }: { material: PlacementMaterialProps }) {
  const { t } = useT();
  const [opened, setOpened] = useState<OpenedPlacement | null>(null);
  const [taken, setTaken] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  /** A paper the student pressed Start on in this page's life. A paper
      already under way is shown straight away without it. */
  const [playing, setPlaying] = useState<'listening' | 'reading' | null>(null);
  /** This sitting was changed in another tab (a paper handed in there, or a
      newer sitting started): this tab stops rather than write over it. */
  const [lostElsewhere, setLostElsewhere] = useState(false);
  /** A press from a tab that missed an account change: nothing of the work
      stays on screen until the tab hears who is here. */
  const [heldBack, setHeldBack] = useState(false);
  const [replanned, setReplanned] = useState(false);
  const openedRef = useRef<OpenedPlacement | null>(null);

  /** Read this student's placement again: their resume state (settling any
      grade that arrived while somebody else was on the page) and whether
      the record already holds a placement. */
  function load(): OpenedPlacement {
    const storage = deviceStorage();
    const next = openPlacement(storage);
    const record = readLearnerRecord();
    const state = next.state ? reconcilePlacementFromRecord(storage, next.state, record.events) : null;
    const value = { session: next.session, state };
    openedRef.current = value;
    setOpened(value);
    setTaken(placementTaken(record));
    return value;
  }

  useEffect(() => {
    load();
    /* The account on the page changed: hand over. The outgoing student's
       sitting is already in their own resume state, exactly as it was;
       everything of it leaves the screen, and the incoming student sees
       their own placement, with one calm line. The same student being told
       their stores changed (the anonymous-work claim) hands nothing over. */
    const offOwner = onOwnerChange(() => {
      const held = openedRef.current;
      if (held && sameOwner(currentOwner(), held.session.owner)) {
        load();
        return;
      }
      setPlaying(null);
      setLostElsewhere(false);
      setHeldBack(false);
      setReplanned(false);
      load();
      if (held && held.session.owner.kind === 'user') setNote(PLACEMENT_OWNER_CHANGED_NOTE);
    });
    const offRecord = onLearnerRecordChange(() => {
      const held = openedRef.current;
      if (held && !sameOwner(currentOwner(), held.session.owner)) return;
      load();
    });
    return () => {
      offOwner();
      offRecord();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = opened?.state ?? null;
  const part: PlacementPart | 'done' | null = state ? currentPlacementPart(state) : null;
  const signedIn = opened?.session.owner.kind === 'user';
  const materialMissing = !material.listening || !material.reading || !material.writing || !material.speaking;

  const screen = placementScreen({ opened: opened !== null, signedIn, state, taken, materialMissing });
  const paperUnderWay: 'listening' | 'reading' | null =
    (part === 'listening' || part === 'reading') && state?.legs[part] && !state.legs[part]!.handedIn ? part : null;
  const paperOnScreen = playing ?? paperUnderWay;

  /* Before the results read a single estimate, the plan is rebuilt from the
     new evidence. onEvidenceRecorded replans only when what is known
     actually changed, so a later visit to the results replans nothing. */
  useEffect(() => {
    if (screen !== 'results' || replanned) return;
    try {
      onEvidenceRecorded();
    } catch {
      /* A plan that cannot be rebuilt must not take the results down: they
         are read from the record either way. */
    }
    setReplanned(true);
  }, [screen, replanned]);

  /* A paper found under way (a reload, or coming back later) is held on
     screen the same way a freshly started one is, so its own hand-in does
     not take it away before its score card has been read. */
  useEffect(() => {
    if (paperUnderWay && playing === null) setPlaying(paperUnderWay);
  }, [paperUnderWay, playing]);

  function refused(refusal: ExerciseRefusal) {
    setNote(PLACEMENT_OWNER_CHANGED_NOTE);
    if (refusal === 'owner-changed') {
      setPlaying(null);
      load();
    } else {
      setHeldBack(true);
    }
  }

  function startSitting() {
    const held = openedRef.current;
    if (!held) return;
    const claim = claimPlacementPress(held.session);
    if ('refused' in claim) {
      refused(claim.refused);
      return;
    }
    claim.binding.cancel();
    beginPlacementFor(deviceStorage(), held.session, new Date().toISOString());
    setNote(null);
    load();
  }

  function startPaper(paper: 'listening' | 'reading') {
    const held = openedRef.current;
    if (!held) return;
    const claim = claimPlacementPress(held.session);
    if ('refused' in claim) {
      refused(claim.refused);
      return;
    }
    claim.binding.cancel();
    setPlaying(paper);
  }

  function paperDone() {
    setPlaying(null);
    load();
  }

  if (screen === 'loading') return <div className="placement" aria-busy="true" />;

  if (heldBack || lostElsewhere) {
    return (
      <PlacementFrame>
        <section className="pl-card pl-enter" role="status">
          <p className="pl-kicker">{t('Placement test')}</p>
          <h1 className="pl-title">{t('This placement test is paused here')}</h1>
          <p className="pl-lead">
            {heldBack
              ? t(PLACEMENT_OWNER_CHANGED_NOTE)
              : t('This placement test carried on in another tab, so this tab stopped rather than write over it.')}
          </p>
          <div className="pl-actions">
            <button type="button" className="pl-primary" onClick={() => window.location.reload()}>
              {t('Reload this page')}
            </button>
          </div>
        </section>
      </PlacementFrame>
    );
  }

  /* A Listening or Reading paper under way: the test player takes the whole
     screen, exactly as it does for a paper opened on its own. It stays on
     screen after the hand-in, until the student presses Continue on its
     score card (onFinish), even though the sitting has already moved on to
     the next part underneath: the hand-in settles the part the moment it is
     accepted, so a reload at that point opens the next part's brief. */
  if (screen === 'part' && state && opened && paperOnScreen) {
    const test = paperOnScreen === 'listening' ? material.listening : material.reading;
    const leg = state.legs[paperOnScreen];
    const ours = !leg || leg.testId === test?.id;
    if (test && ours) {
      const part = paperOnScreen;
      return (
        <div className={`placement placement-paper skill-${part}`}>
          <TestPlayer
            key={`${state.sittingId}:${test.id}`}
            test={test}
            hubUrl={withBase('/placement')}
            attemptKind="drill"
            onFinish={paperDone}
            placementSitting={{ owner: opened.session.namespace, sittingId: state.sittingId }}
            onSittingLost={() => setLostElsewhere(true)}
          />
        </div>
      );
    }
  }

  return (
    <PlacementFrame>
      {note && (
        <p className="pl-status" role="status">
          {t(note)}
        </p>
      )}

      {screen === 'signed-out' && (
        <section className="pl-card pl-enter" aria-labelledby="pl-heading">
          <p className="pl-kicker">{t('Placement test')}</p>
          <h1 id="pl-heading" className="pl-title">
            {t('Sign in to take the placement test')}
          </h1>
          <p className="pl-lead">
            {isAuthConfigured()
              ? t('The placement test saves its results to your account and uses the AI examiner, so it needs you to be signed in. It takes about {n} minutes, once.', {
                  n: PLACEMENT_TOTAL_MINUTES,
                })
              : t('Accounts are not set up on this site, so the placement test cannot be taken here.')}
          </p>
          {isAuthConfigured() && (
            <div className="pl-actions">
              <a className="pl-primary" href={signInHref('/placement')}>
                {t('Sign in')}
              </a>
              <a className="pl-secondary" href={withBase('/dashboard')}>
                {t('Not now')}
              </a>
            </div>
          )}
        </section>
      )}

      {screen === 'unavailable' && (
        <section className="pl-card pl-enter" role="status">
          <p className="pl-kicker">{t('Placement test')}</p>
          <h1 className="pl-title">{t('The placement test is not available here')}</h1>
          <p className="pl-lead">
            {t('Its material is not part of this version of the site. Your plan still starts with short samples of each paper, so nothing is missing from your study.')}
          </p>
          <div className="pl-actions">
            <a className="pl-primary" href={withBase('/dashboard')}>
              {t('Back to Today')}
            </a>
          </div>
        </section>
      )}

      {screen === 'intro' && (
        <section className="pl-card pl-enter" aria-labelledby="pl-heading">
          <p className="pl-kicker">{t('Placement test')}</p>
          <h1 id="pl-heading" className="pl-title">
            {t('Find your starting point')}
          </h1>
          <p className="pl-lead">
            {t('One sitting of about {n} minutes, taken once. It shows your plan where you are in all four papers, so your study time goes where it helps most.', {
              n: PLACEMENT_TOTAL_MINUTES,
            })}
          </p>
          <ul className="pl-parts">
            <IntroPart part="listening" what={t('One part of a real recording, 10 questions, played once.')} minutes={PLACEMENT.listening.minutes} />
            <IntroPart part="reading" what={t('One passage from a real Academic paper, 13 questions.')} minutes={PLACEMENT.reading.minutes} />
            <IntroPart part="writing" what={t('One Task 1 report of at least 150 words, marked by the AI examiner.')} minutes={PLACEMENT.writing.minutes} />
            <IntroPart part="speaking" what={t('A short Part 1 interview with the AI examiner.')} minutes={PLACEMENT.speaking.minutes} />
          </ul>
          <p className="pl-note">
            {t('The result is an estimate from one sitting, not a band score. You can stop between parts and come back later on this device; once a part has started, its clock keeps running.')}
          </p>
          <AllowanceNote use="placement" />
          <div className="pl-actions">
            <button type="button" className="pl-primary" onClick={startSitting}>
              {t('Start the placement test')}
            </button>
            <a className="pl-secondary" href={withBase('/dashboard')}>
              {t('Not now')}
            </a>
          </div>
        </section>
      )}

      {screen === 'part' && state && opened && part && part !== 'done' && (
        <>
          <PlacementStepper state={state} />
          {part === 'listening' && (
            <PartBrief
              part="listening"
              index={0}
              lead={t('One part of a real IELTS recording with 10 questions. It plays once, as in the exam, so read the first questions while it starts and answer as you listen.')}
              facts={[t('{n} min', { n: PLACEMENT.listening.minutes }), t('Plays once'), t('Headphones help')]}
              action={
                <button type="button" className="pl-primary" onClick={() => startPaper('listening')}>
                  {t('Start Listening')}
                </button>
              }
            />
          )}
          {part === 'reading' && (
            <PartBrief
              part="reading"
              index={1}
              lead={t('One passage from a real Academic Reading paper, with 13 questions of three kinds.')}
              facts={[t('{n} min', { n: PLACEMENT.reading.minutes }), t('13 questions')]}
              note={t('The exam allows about 20 minutes a passage. Here you have {n}, a brisk but realistic pace.', {
                n: PLACEMENT.reading.minutes,
              })}
              action={
                <button type="button" className="pl-primary" onClick={() => startPaper('reading')}>
                  {t('Start Reading')}
                </button>
              }
            />
          )}
          {part === 'writing' && material.writing && (
            <PlacementWriting
              key={`${opened.session.namespace}:${state.sittingId}`}
              prompt={material.writing}
              session={opened.session}
              state={state}
              onChanged={load}
              onRefused={refused}
            />
          )}
          {part === 'speaking' && material.speaking && (
            <PlacementSpeaking
              key={`${opened.session.namespace}:${state.sittingId}`}
              topic={material.speaking}
              session={opened.session}
              state={state}
              onChanged={load}
              onRefused={refused}
            />
          )}
        </>
      )}

      {screen === 'results' && replanned && <PlacementResults outcomes={state?.outcomes} />}
    </PlacementFrame>
  );
}

function IntroPart({ part, what, minutes }: { part: PlacementPart; what: string; minutes: number }) {
  const { t } = useT();
  return (
    <li className={`pl-part pl-skill-${part}`}>
      <span className="pl-part-dot" aria-hidden="true" />
      <span>
        <span className="pl-part-name">{PART_NAME[part]}</span>
        <span className="pl-part-what">{what}</span>
      </span>
      <span className="pl-part-min">{t('{n} min', { n: minutes })}</span>
    </li>
  );
}
