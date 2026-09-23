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
   the server would not independently verify. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { withBase } from '../../lib/url';
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
import { BOUNDARY_EXPLANATION, BOUNDARY_PLACEHOLDER, chatBlocked } from './mrez-boundary';
import { ACCESS_MODE } from '../../lib/trial/mode';
import { TRIAL_OFFER, isTrialLesson, isTrialSection, lessonSection, type TrialSection } from '../../lib/trial/offer';
import { refreshTrial } from '../../lib/trial/client';
import { useTrial } from '../../lib/trial/react';
import { tutorAllowance } from '../../lib/trial/status';

const SECTION_LABEL: Record<TrialSection, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

/** In a trial build, what a question on this page is ABOUT, as the
    reference the Worker charges it to: the trial lesson open on the page,
    the section chosen on the trial page (sent as that section's trial
    lesson), or the Writing test's page. Null when the page is about none of
    them. The Worker works the section out again from this reference and
    refuses anything outside the trial, so nothing here is trusted. */
function trialPlace(place: TutorPlace): { place: TutorPlace; section: TrialSection } | null {
  if (place.lessonKey && isTrialLesson(place.lessonKey)) {
    return { place, section: lessonSection(place.lessonKey)! };
  }
  const chosen = typeof document !== 'undefined' ? document.body.dataset.trialSection : undefined;
  if (isTrialSection(chosen)) {
    return { place: { ...place, lessonKey: TRIAL_OFFER[chosen].lessonKey }, section: chosen };
  }
  if (place.route?.startsWith('/writing/checker')) {
    return { place: { ...place, testId: TRIAL_OFFER.writing.testId }, section: 'writing' };
  }
  return null;
}
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
  const trial = useTrial();
  const trialMode = ACCESS_MODE === 'trial';
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

  const configured = isTutorConfigured();
  const unavailableReason = tutorUnavailableReason();

  // Restore the conversation: this session's copy immediately, then the
  // durable copy if it has more in it.
  useEffect(() => {
    setState(loadConversation());
    setPlace(readPlace());
    void getTutorConfig().then((c) => setModel(c ? (c.live ? c.model : 'simulated') : null));
    return onAuthChange((user) => setSignedIn(Boolean(user)));
  }, []);

  useEffect(() => {
    if (!signedIn || restored) return;
    setRestored(true);
    void restoreLatestConversation().then((remote) => {
      if (!remote) return;
      setState((current) => (remote.turns.length > current.turns.length ? remote : current));
    });
  }, [signedIn, restored]);

  useEffect(() => {
    if (state.turns.length || state.conversationId) saveConversation(state);
  }, [state]);

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

  /* The trial (a trial build only): which section a question here is
     charged to, and what is left of it. Worked out for the screen; the
     Worker decides again, and a refusal it sends uses nothing. */
  const trialScope = trialMode ? trialPlace(place) : null;
  const trialAllowance =
    trialMode && trialScope && trial.status ? tutorAllowance(trial.status, trialScope.section, trial.now) : null;
  const trialStop: string | null = !trialMode
    ? null
    : trial.phase === 'signed-out' || trial.phase === 'checking'
      ? null
      : !trial.status || trial.status.state === 'none'
        ? 'no-trial'
        : trialAllowance?.state === 'ended' || (trial.status.state === 'ended' && !trialAllowance)
          ? 'ended'
          : !trialScope
            ? 'no-section'
            : trialAllowance?.state === 'exhausted'
              ? 'exhausted'
              : null;

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
      /* Nothing is sent that the trial would refuse: it would use nothing,
         but it would still be a pointless wait for the student. */
      if (trialStop) return;
      const scoped = trialMode ? trialPlace(readPlace()) : null;

      const key = idempotencyKey ?? newIdempotencyKey();
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
          place: scoped?.place ?? readPlace(),
          idempotencyKey: key,
        });
        pendingRef.current = null;
        if (trialMode) void refreshTrial();
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
        const clientError = err instanceof TutorClientError ? err : null;
        // A trial refusal means the server's count moved on elsewhere.
        if (trialMode && clientError?.code.startsWith('trial-')) void refreshTrial();
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
        setBusy(false);
      }
    },
    [busy, state.conversationId, t, trialStop, trialMode],
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
        onClick={() => setOpen((v) => !v)}
      >
        {/* The same mood whether the drawer is open or shut: see mrez-mood.ts. */}
        <MrEzAvatar mood={mood} size={42} />
        <span className="mrez-launcher-label">
          {open ? t('Close Mr EZ') : t('Ask Mr EZ')}
          <small>
            {trialScope && trialAllowance
              ? trialAllowance.state === 'ended'
                ? `${SECTION_LABEL[trialScope.section]} · ${t('Trial ended')}`
                : `${SECTION_LABEL[trialScope.section]} · ${tn(trialAllowance.remaining, { one: '{n} message left', other: '{n} messages left' })}`
              : t('Your AI tutor')}
          </small>
        </span>
      </button>

      <div
        id="mrez-panel"
        className={`mrez-panel${open ? ' is-open' : ''}`}
        role="dialog"
        aria-label={t('Mr EZ, your IELTS tutor')}
        aria-modal="false"
        hidden={!open}
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
            <p className="mrez-note">{unavailableReason} {t('Your next step on the dashboard still works, it just comes with a plain explanation instead of his.')}</p>
          )}

          {/* The trial's allowance, above the conversation, so the student
              knows what a question costs before asking it. */}
          {configured && trialMode && !blocked && (trialStop || trialAllowance) && (
            <div className="mrez-trial-note" role="status">
              {trialStop === 'no-trial' ? (
                <>
                  {t('Start your free trial to talk to Mr EZ.')} <a href={withBase('/trial')}>{t('Start my free trial')}</a>
                </>
              ) : trialStop === 'ended' ? (
                <>
                  {t('Your trial has ended, so Mr EZ cannot reply to new questions.')} <a href={withBase('/plans')}>{t('View plans')}</a>
                </>
              ) : trialStop === 'no-section' ? (
                t('During your trial, Mr EZ answers questions about one section at a time. Open a trial lesson, or choose a section on your trial page.')
              ) : trialStop === 'exhausted' && trialScope ? (
                <>
                  {t('You have used your five messages for {section}. The other sections have their own.', { section: SECTION_LABEL[trialScope.section] })}{' '}
                  <a href={withBase('/plans')}>{t('See full access')}</a>
                </>
              ) : trialScope && trialAllowance ? (
                t('{section}: {left} of {limit} messages left. Only answered messages count.', {
                  section: SECTION_LABEL[trialScope.section],
                  left: trialAllowance.remaining,
                  limit: trialAllowance.limit,
                })
              ) : null}
            </div>
          )}

          {configured && signedIn === false && !blocked && (
            <p className="mrez-note">
              {t("Sign in and Mr EZ can see your own results. He never reads anyone else's, which is exactly why he needs to know who you are.")}{' '}
              <a href={withBase('/account')}>{t('Sign in')}</a>
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
              {error.code === 'sign-in-required' && <a href={withBase('/account')}>{t('Sign in')}</a>}
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
