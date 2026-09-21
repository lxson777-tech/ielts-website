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
  if (place.underExam) return [t('How is this paper marked?'), t('How should I split my time?')];
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

  const mood: TutorMood = useMemo(() => {
    if (busy) return 'thinking';
    if (error || !configured) return 'unavailable';
    const last = [...state.turns].reverse().find((t) => t.role === 'tutor');
    return last?.mood ?? 'idle';
  }, [busy, error, configured, state.turns]);

  const send = useCallback(
    async (text: string, idempotencyKey?: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

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
          place: readPlace(),
          idempotencyKey: key,
        });
        pendingRef.current = null;
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
    [busy, state.conversationId, t],
  );

  const retry = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    void send(pending.text, pending.key);
  }, [send]);

  const suggestions = suggestionsFor(place, t);
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
        <MrEzAvatar mood={open ? 'explaining' : mood} size={30} />
        <span className="mrez-launcher-label">{open ? t('Close') : t('Ask Mr EZ')}</span>
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
          <MrEzAvatar mood={mood} size={38} />
          <div className="mrez-head-text">
            <strong>Mr EZ</strong>
            <span>
              {place.underExam
                ? t('Invigilating: no answers until the timer stops')
                : model === 'simulated'
                  ? t('Simulated tutor (no AI is being called)')
                  : t('Your IELTS tutor')}
            </span>
          </div>
          <button type="button" className="mrez-close" onClick={() => { setOpen(false); launcherRef.current?.focus(); }}>
            <span className="sr-only">{t('Close Mr EZ')}</span>
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="mrez-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions text">
          {!configured && (
            <p className="mrez-note">{unavailableReason} {t('Your next step on the dashboard still works, it just comes with a plain explanation instead of his.')}</p>
          )}

          {configured && signedIn === false && (
            <p className="mrez-note">
              {t("Sign in and Mr EZ can see your own results. He never reads anyone else's, which is exactly why he needs to know who you are.")}{' '}
              <a href={withBase('/account')}>{t('Sign in')}</a>
            </p>
          )}

          {state.turns.length === 0 && configured && signedIn !== false && (
            <div className="mrez-empty">
              <p>{t('Ask me anything about IELTS, this lesson, or what to do next. I will not hand you answers during practice, but I will show you how to get them.')}</p>
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
                    <span className="mrez-rec-label">{turn.recommendation.label}</span>
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
            placeholder={configured ? t('Ask Mr EZ…') : t('Mr EZ is not available on this build')}
            disabled={!configured || busy || signedIn === false}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
          />
          <button type="submit" className="mrez-send" disabled={!configured || busy || !draft.trim() || signedIn === false}>
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
