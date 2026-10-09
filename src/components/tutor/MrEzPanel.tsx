/* The Mr EZ conversation panel: a launcher that stays out of the way, and a
   drawer that opens beside the page (or over it, on a phone).

   Three things here are deliberate rather than incidental.

   IT DOES NOT INTERRUPT. There is no pop-up, no "psst, need help?", no timed
   nudge. The launcher sits still until the student presses it. A tutor who
   taps you on the shoulder every two minutes is not patient, whatever his
   prompt says.

   IT SURVIVES NAVIGATION. The workspace navigates client-side and this island
   carries transition:persist, so walking from the dashboard to a lesson keeps
   the same React tree and the same open conversation. sessionStorage backs
   that up for a hard reload, and the durable copy in Supabase is read back
   when a signed-in student returns later.

   IT KNOWS WHERE YOU ARE, CHEAPLY. The current lesson comes off a data
   attribute the layout already writes, and a running timed assessment sets
   another. No polling, no extra request, and nothing sent to the model that
   the server would not independently verify.

   IT IS ONE STUDENT'S CONVERSATION (follow-up to Codex R2E-02). Surviving
   navigation also meant surviving an account change: after A signed out and
   B signed in, here or in another tab, the panel went on showing A's
   conversation to B, and a reply still on its way for A landed in it. Now
   the conversation on screen belongs to the owner it was loaded for, is
   saved under that owner only, and is swapped for the new owner's the
   moment the owner changes, taking A's draft, pending retry and error with
   it. The tutor client drops a reply that comes back for A after that
   (src/lib/tutor/review-owner.ts); `epochRef` below is the panel's own
   second line, so nothing that returns for a previous owner, reply or
   failure, is shown or saved. */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { withBase } from '../../lib/url';
import { signInHref } from '../../lib/auth/profile';
import { currentRoute } from '../../lib/auth/next';
import SupportLink from '../support/SupportLink'; // [E trust]
import { useT, type Translator } from '../../lib/i18n/react';
import MrEzAvatar from './MrEzAvatar';
import {
  askTutor,
  getTutorConfig,
  isTutorConfigured,
  newIdempotencyKey,
  tutorUnavailableReason,
  TutorClientError,
} from '../../lib/tutor/client';
import {
  EMPTY_CONVERSATION,
  loadConversation,
  restoreLatestConversation,
  saveConversation,
  type ChatTurn,
  type ConversationState,
} from '../../lib/tutor/conversation';
import { MAX_MESSAGE_CHARS, type TutorMood, type TutorPlace } from '../../lib/tutor/schema';
import { onAuthChange } from '../../lib/auth/session';
import { bindToCurrentOwner, currentOwner, onOwnerChange, sameOwner } from '../../lib/store-owner';
import type { CacheOwner } from '../../lib/learning/contracts/sync';
import { BOUNDARY_EXPLANATION, BOUNDARY_PLACEHOLDER, chatBlocked } from './mrez-boundary';
import { ACCESS_MODE } from '../../lib/trial/mode';
import { useAccessTier } from '../../lib/access/tier';
import { openUpgrade, PAID_REQUIRED_CODE } from '../../lib/access/upgrade';
import { onOpenMrEz } from '../../lib/access/taster-events';
import { offerTaster, tasterSpent } from '../../lib/access/taster-offers';
import { TasterAfterCard, TutorCounter } from '../access/taster-ui';
import { initialTrialView, refreshTrial, subscribeTrialView, trialView } from '../../lib/trial/client';
import { selectTutorMood } from './mrez-mood';

/** Where the student is, read off the DOM the layout already labelled. */
function readPlace(): TutorPlace {
  if (typeof document === 'undefined') return {};
  const body = document.body;
  const place: TutorPlace = {};
  const lessonKey = body.dataset.lessonKey;
  if (lessonKey) place.lessonKey = lessonKey;
  const route = body.dataset.route;
  if (route) place.route = route;
  // Set by TestPlayer, MockExam and the exam-conditions writing checker while
  // a timer is actually running. When it is on, Mr EZ becomes an invigilator.
  if (body.dataset.examRunning === 'true') place.underExam = true;
  return place;
}

function suggestionsFor(place: TutorPlace, t: Translator['t']): string[] {
  // The exam-time case is handled entirely by the caller (see `blocked` in
  // MrEzPanel below): no suggestion is offered at all while the boundary is
  // up, rather than two that would silently do nothing if pressed.
  if (place.lessonKey) {
    return [
      t('Explain this lesson in simpler words'),
      t('What is the most common mistake here?'),
      t('How is this tested in the exam?'),
    ];
  }
  return [
    t('What should I practise next?'),
    t('How am I doing against my target band?'),
    t('What does Task Response actually mean?'),
  ];
}

export default function MrEzPanel() {
  const { t, tn } = useT();
  /* The gated build (the free-account model, 1 October 2026): Mr EZ comes
     with practice and guidance. The launcher carries data-paid-feature, so
     for a free account the click guard opens the upgrade pop-up instead of
     the panel (src/lib/access/paid-guard.ts); if the panel is open anyway
     it says so and sends nothing. The Worker refuses for itself
     (`paid-required`). Paid and complimentary access: no change. */
  const tier = useAccessTier();
  /* Free AI tries (10 October 2026): a free account with free questions left
     talks to Mr EZ instead, with a quiet counter. The database counts every
     question; when none is left (or the server refuses `taster-used`) this
     is the upgrade behaviour above again. */
  const tasterStatus = useSyncExternalStore(subscribeTrialView, trialView, initialTrialView).status?.taster ?? null;
  const freeTries = ACCESS_MODE === 'trial' && offerTaster(tier, tasterStatus, 'tutor');
  const needsUpgrade = ACCESS_MODE === 'trial' && (tier === 'free' || tier === 'paid-ended') && !freeTries;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ConversationState>(EMPTY_CONVERSATION);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [place, setPlace] = useState<TutorPlace>({});
  const [restored, setRestored] = useState(false);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  /** The message currently being retried, so a retry re-uses one key and
      cannot be charged twice. */
  const pendingRef = useRef<{ text: string; key: string } | null>(null);
  /** Whose conversation is on screen. State, so each save names the owner
      of the conversation it saves; mirrored in a ref for the owner
      listener. Null until mounted. */
  const [conversationOwner, setConversationOwner] = useState<CacheOwner | null>(null);
  const ownerRef = useRef<CacheOwner | null>(null);
  /** Bumped on every owner change. A send remembers the value it started
      under and lets nothing that comes back later through if it moved. */
  const epochRef = useRef(0);

  const configured = isTutorConfigured();
  const unavailableReason = tutorUnavailableReason(t);

  // Restore the conversation: this session's copy immediately, then the
  // durable copy if it has more in it.
  useEffect(() => {
    const owner = currentOwner();
    ownerRef.current = owner;
    setConversationOwner(owner);
    setState(loadConversation(owner));
    setPlace(readPlace());
    void getTutorConfig().then((c) => setModel(c ? (c.live ? c.model : 'simulated') : null));
    return onAuthChange((user) => setSignedIn(Boolean(user)));
  }, []);

  // Somebody else is using this browser now: their conversation, not the
  // last student's. Everything of the last student's goes: the turns, the
  // draft, the retry, the error, the "thinking" dots. An announcement for
  // the SAME owner (the anonymous-work claim) changes nothing here.
  useEffect(
    () =>
      onOwnerChange(() => {
        const now = currentOwner();
        if (ownerRef.current && sameOwner(ownerRef.current, now)) return;
        ownerRef.current = now;
        epochRef.current += 1;
        pendingRef.current = null;
        setConversationOwner(now);
        setState(loadConversation(now));
        setRestored(false);
        setError(null);
        setBusy(false);
        setDraft('');
      }),
    [],
  );

  useEffect(() => {
    if (!signedIn || restored) return;
    setRestored(true);
    // For the student on the page now, and kept only if they still are
    // when it arrives (the same rule as a tutor reply).
    const binding = bindToCurrentOwner();
    void restoreLatestConversation(binding.owner)
      .then((remote) => {
        if (!remote || !binding.current()) return;
        setState((current) => (remote.turns.length > current.turns.length ? remote : current));
      })
      .finally(() => binding.cancel());
  }, [signedIn, restored]);

  useEffect(() => {
    if (conversationOwner && (state.turns.length || state.conversationId)) saveConversation(state, conversationOwner);
  }, [state, conversationOwner]);

  // The route and the lesson change under a client-side navigation without
  // this island remounting, which is the whole point of persisting it.
  useEffect(() => {
    const sync = () => setPlace(readPlace());
    document.addEventListener('astro:page-load', sync);
    return () => document.removeEventListener('astro:page-load', sync);
  }, []);

  // A timed full paper ends, or an independent check is submitted, on the
  // SAME page: no navigation fires, so astro:page-load above never runs.
  // Without this, the panel would keep saying "invigilating" through the
  // whole review screen that follows, which is exactly the "help is
  // available again after submission" case the boundary has to get right.
  // Watching the one attribute every exam surface writes is cheaper than
  // polling and needs no cooperation from those screens beyond what they
  // already do.
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => setPlace(readPlace()));
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-exam-running', 'data-trial-section'] });
    return () => observer.disconnect();
  }, []);

  // Opened from somewhere else on the page (Today, a lesson's last card, a
  // wrong answer in a lesson quiz). It may pre-fill the message box, never
  // send it: a free question is only spent by the student's own send.
  useEffect(
    () =>
      onOpenMrEz((request) => {
        setOpen(true);
        if (request.prompt) setDraft(request.prompt.slice(0, MAX_MESSAGE_CHARS));
      }),
    [],
  );

  // Escape closes, and focus goes back where it came from.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state.turns.length, busy]);

  /** True while a timed paper, the mock or an independent check is running.
      Read before the mood below, because a tutor who is deliberately saying
      nothing must not wear a face that says he is explaining something. */
  const blocked = chatBlocked(place);

  const trialStop: string | null = needsUpgrade ? PAID_REQUIRED_CODE : null;

  /* One mood for the launcher AND the panel header, decided from facts
     about the tutor only (see mrez-mood.ts). It deliberately knows nothing
     about `open`: opening the drawer used to flip the launcher to
     "explaining" even on a build with no tutor at all, which is item 9 of
     the 2026-09-22 audit. */
  const mood: TutorMood = useMemo(() => {
    const last = [...state.turns].reverse().find((t) => t.role === 'tutor');
    return selectTutorMood({
      configured,
      signedIn,
      busy,
      failed: Boolean(error),
      blocked,
      lastReplyMood: last?.mood ?? null,
    });
  }, [busy, error, configured, signedIn, blocked, state.turns]);

  const send = useCallback(
    async (text: string, idempotencyKey?: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      // The client-side half of the assessment boundary: place is re-read
      // fresh rather than trusted from the closure, because a message can be
      // queued (Enter, then a slow render) right as a timer ends or starts.
      // No network call happens at all here; the Worker's own refusal
      // (HELP_BLOCKED_MODES) is the real boundary and stays in place
      // independently of this check.
      if (chatBlocked(readPlace())) return;
      /* Nothing is sent that the Worker would refuse: a free account is
         shown what practice and guidance adds instead. */
      if (trialStop) {
        openUpgrade('tutor', { from: currentRoute() });
        return;
      }

      const key = idempotencyKey ?? newIdempotencyKey();
      const epoch = epochRef.current;
      pendingRef.current = { text: trimmed, key };
      setError(null);
      setBusy(true);
      setDraft('');

      const studentTurn: ChatTurn = {
        id: `local-${key}`,
        role: 'student',
        text: trimmed,
        at: new Date().toISOString(),
      };
      setState((s) => ({ ...s, turns: [...s.turns.filter((t) => !t.failed), studentTurn] }));

      try {
        const reply = await askTutor({
          task: 'chat',
          message: trimmed,
          conversationId: state.conversationId ?? undefined,
          place: readPlace(),
          idempotencyKey: key,
        });
        // The client only hands a reply back while the student who asked
        // is still the one on the page; this is the panel keeping the same
        // promise on its own account.
        if (epochRef.current !== epoch) return;
        pendingRef.current = null;
        /* A free question was just spent: ask the server how many are left,
           so the counter (and, after the last, the upgrade card) is true. */
        if (ACCESS_MODE === 'trial') void refreshTrial();
        setState((s) => ({
          conversationId: reply.conversationId || s.conversationId,
          turns: [
            ...s.turns,
            {
              id: `reply-${key}`,
              role: 'tutor',
              text: reply.text,
              at: new Date().toISOString(),
              recommendation: reply.recommendation ?? null,
              mood: reply.mood,
              live: reply.live,
            },
          ],
        }));
      } catch (err) {
        // Whatever comes back for a student who has since left (a dropped
        // reply, a refusal, a failure) is theirs, and the panel is somebody
        // else's now: nothing to show.
        if (epochRef.current !== epoch) return;
        const clientError = err instanceof TutorClientError ? err : null;
        /* The Worker's own refusal for an account without practice and
           guidance: the pop-up explains, nothing was used. */
        if (clientError?.code === PAID_REQUIRED_CODE) openUpgrade('tutor', { from: currentRoute() });
        /* The free questions are used up (HTTP 402 taster-used): say so
           in the pop-up, and re-read the counts so the panel stops offering
           them. */
        if (clientError?.code === 'taster-used') {
          openUpgrade('tutor', { from: currentRoute(), reason: 'taster-used' });
          void refreshTrial();
        }
        setError({
          code: clientError?.code ?? 'unavailable',
          message: clientError?.message ?? t('Something went wrong. Try again in a moment.'),
        });
        // Mark the student's turn as failed so the retry button replaces it
        // rather than stacking a second copy of the same question.
        setState((s) => ({
          ...s,
          turns: s.turns.map((t) => (t.id === studentTurn.id ? { ...t, failed: true } : t)),
        }));
      } finally {
        // The new owner's panel may be busy with a message of its own.
        if (epochRef.current === epoch) setBusy(false);
      }
    },
    [busy, state.conversationId, t, trialStop],
  );

  const retry = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    void send(pending.text, pending.key);
  }, [send]);

  const suggestions = blocked || trialStop ? [] : suggestionsFor(place, t);
  const composerLocked = Boolean(trialStop);
  const remaining = MAX_MESSAGE_CHARS - draft.length;

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="mrez-launcher"
        aria-expanded={open}
        aria-controls="mrez-panel"
        data-paid-feature={ACCESS_MODE === 'trial' && !freeTries ? 'tutor' : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {/* The same mood whether the drawer is open or shut: see mrez-mood.ts. */}
        <MrEzAvatar mood={mood} size={42} />
        <span className="mrez-launcher-label">
          {open ? t('Close Mr EZ') : t('Ask Mr EZ')}
          <small>{t('Your AI tutor')}</small>
        </span>
      </button>

      <div
        id="mrez-panel"
        className={`mrez-panel${open ? ' is-open' : ''}`}
        role="dialog"
        aria-label={t('Mr EZ, your IELTS tutor')}
        aria-modal="false"
        hidden={!open}
        inert={!open}
      >
        <header className="mrez-head">
          <MrEzAvatar mood={mood} size={52} />
          <div className="mrez-head-text">
            <strong>Mr EZ</strong>
            {/* Never "Your personal AI tutor" on a build that has none: the
                header used to say it even with no Worker wired up, beside an
                avatar that (item 9) had just flipped to "explaining". The
                existing short string is reused rather than a new one added;
                the fuller reason is already in the log below. */}
            <span>
              {blocked
                ? t('Invigilating: no answers until the timer stops')
                : !configured
                  ? t('Mr EZ is not available on this build')
                  : model === 'simulated'
                    ? t('Simulated tutor (no AI is being called)')
                    : t('Your personal AI tutor')}
            </span>
          </div>
          <button type="button" className="mrez-close" onClick={() => { setOpen(false); launcherRef.current?.focus(); }}>
            <span className="sr-only">{t('Close Mr EZ')}</span>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="mrez-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions text">
          {state.turns.length === 0 && !blocked && (
            /* The panel's own opening. All three lines were raw JSX text
               with no translation call around them, so a Russian student
               opened Mr EZ and read three English lines. The wordmark
               "IELTS is EZ" is deliberately not among them: it stays
               English wherever it appears, and so does IELTS. */
            <div className="mrez-intro">
              <span className="mrez-intro-eyebrow">{t('A little guidance. A lot of progress.')}</span>
              <h2>{t('Let’s figure it out together.')}</h2>
              <p>{t('Understand a tricky question, learn from your results, or find your next step.')}</p>
              {/* AI Law Art. 21: said plainly, not only in the header. */}
              <p data-testid="mrez-ai-label">{t('Mr EZ is an AI tutor, not a real person.')}</p>
            </div>
          )}
          {/* The boundary notice: shown above everything else while a timed
              paper, the mock or an independent check is running, whether or
              not there is an older conversation underneath it, so the panel
              always says why it has gone quiet rather than just looking
              broken. Help picks back up the moment the flag clears. */}
          {blocked && (
            <div className="mrez-note" role="status">
              <p>{t(BOUNDARY_EXPLANATION)}</p>
            </div>
          )}
          {!configured && (
            <div className="mrez-note">
              <p>{unavailableReason} {t('Your next step on the dashboard still works, it just comes with a plain explanation instead of his.')}</p>
              <SupportLink reason="mr-ez" />{/* [E trust] */}
            </div>
          )}

          {/* A free account (the gated build): what Mr EZ comes with, and
              the way to see it, above the conversation. */}
          {/* Free AI tries (10 October 2026): the quiet counter while free
              questions are left, and the short upgrade card once the last
              one has been used. */}
          {configured && freeTries && !blocked && <TutorCounter />}
          {configured && needsUpgrade && !blocked && tasterSpent(tasterStatus, 'tutor') && <TasterAfterCard feature="tutor" />}
          {configured && needsUpgrade && !blocked && !tasterSpent(tasterStatus, 'tutor') && (
            <div className="mrez-trial-note" role="status" data-mrez-paid-note>
              {t('Mr EZ, your personal tutor, comes with practice and guidance.')}{' '}
              <button type="button" className="mrez-note-link" onClick={() => openUpgrade('tutor', { from: currentRoute() })}>
                {t('See what practice and guidance adds')}
              </button>
            </div>
          )}

          {configured && signedIn === false && !blocked && (
            <p className="mrez-note">
              {t("Sign in and Mr EZ can see your own results. He never reads anyone else's, which is exactly why he needs to know who you are.")}{' '}
              <a href={withBase('/sign-in')} onClick={(e) => { e.currentTarget.href = signInHref(currentRoute()); }}>{t('Sign in')}</a>
            </p>
          )}

          {state.turns.length === 0 && configured && signedIn !== false && !blocked && (
            <div className="mrez-empty">
              <p>{t('Where shall we start? During practice, I guide you without giving away the answer.')}</p>
              <ul className="mrez-suggestions">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => void send(s)} disabled={busy}>
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.turns.map((turn) => (
            <article key={turn.id} className={`mrez-turn is-${turn.role}${turn.failed ? ' is-failed' : ''}`}>
              {turn.role === 'tutor' && <MrEzAvatar mood={turn.mood ?? 'explaining'} size={26} />}
              <div className="mrez-bubble">
                {turn.live === false && <span className="mrez-sim-badge">{t('Simulated, not a real AI reply')}</span>}
                {turn.text.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
                {turn.recommendation && (
                  <a className="mrez-rec" href={withBase(turn.recommendation.href)}>
                    {/* Lesson titles arrive English from the Worker and are
                        translated here; anything else passes through. */}
                    <span className="mrez-rec-label">{t(turn.recommendation.label)}</span>
                    <span className="mrez-rec-reason">{turn.recommendation.reason}</span>
                  </a>
                )}
              </div>
            </article>
          ))}

          {busy && (
            <article className="mrez-turn is-tutor">
              <MrEzAvatar mood="thinking" size={26} />
              <div className="mrez-bubble mrez-typing" aria-label={t('Mr EZ is thinking')}>
                <span /><span /><span />
              </div>
            </article>
          )}

          {error && (
            <div className="mrez-error" role="status">
              <p>{error.message}</p>
              {(error.code === 'unavailable' || error.code === 'busy') && pendingRef.current && (
                <button type="button" onClick={retry} disabled={busy}>{t('Try again')}</button>
              )}
              {error.code === 'sign-in-required' && <a href={withBase('/sign-in')} onClick={(e) => { e.currentTarget.href = signInHref(currentRoute()); }}>{t('Sign in')}</a>}
              {error.code !== 'sign-in-required' && <SupportLink reason="mr-ez" />}{/* [E trust] */}
            </div>
          )}
        </div>

        <form
          className="mrez-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
        >
          <label className="sr-only" htmlFor="mrez-input">{t('Your message to Mr EZ')}</label>
          <textarea
            id="mrez-input"
            ref={inputRef}
            value={draft}
            rows={1}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder={
              blocked
                ? t(BOUNDARY_PLACEHOLDER)
                : configured
                  ? t('Ask Mr EZ…')
                  : t('Mr EZ is not available on this build')
            }
            disabled={!configured || busy || signedIn === false || blocked || composerLocked}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
          />
          <button
            type="submit"
            className="mrez-send"
            disabled={!configured || busy || !draft.trim() || signedIn === false || blocked || composerLocked}
          >
            <span className="sr-only">{t('Send')}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
          {remaining < 200 && (
            <span className="mrez-count" aria-live="polite">
              {tn(remaining, { one: '{n} character left', other: '{n} characters left' })}
            </span>
          )}
        </form>
      </div>
    </>
  );
}
