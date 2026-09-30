/* /support: "Report a problem / ask a person" (Builder E, 29 September 2026).

   The one route to a human that needs no published contact. Works signed
   in (the request carries the account, and the answer goes to its email)
   and signed out (the visitor gives an email, or nobody could answer).
   Messages are stored by supabase/migrations/2026-09-30-support.sql, which
   repeats every rule here, and Alex reads them in /admin.

   The two ways in are different on purpose (re-audit R01, 30 September
   2026). Signed in, the request goes to the database as the student.
   Signed out, it goes to the support Worker (PUBLIC_SUPPORT_URL), which
   limits each sender by where the request really came from and, when the
   bot check is switched on (PUBLIC_TURNSTILE_SITE_KEY), verifies it on the
   server. With no Worker configured the signed-out form says so and points
   at signing in: it never pretends to send and never falls back to the
   database, which refuses anonymous callers anyway.

   Opened from a link with ?reason=<screen>&from=<route> (SupportLink), the
   form pre-selects a sensible topic and remembers where the student was.
   If Alex has published a direct contact (src/lib/operator.ts), it is shown
   underneath as a second way in; until then nothing is. */

import { useEffect, useId, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isAuthConfigured } from '../../lib/auth/supabase';
import { onAccountChange } from '../../lib/auth/lifecycle';
import { signInHref } from '../../lib/auth/profile';
import { currentRoute, hrefFor } from '../../lib/auth/next';
import { publishedOperator } from '../../lib/operator';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import { nt } from '../../lib/i18n/translate';
import {
  SUPPORT_LIMITS,
  SUPPORT_TOPICS,
  parseFrom,
  parseReason,
  sendSupportRequest,
  sendVisitorSupportRequest,
  topicForReason,
  validateSupport,
  visitorSupportEnabled,
  type SupportErrors,
  type SupportReason,
  type SupportSendFailure,
  type SupportTopic,
} from '../../lib/support';
import { Field, describedBy } from '../auth/fields';
import { AuthShell } from '../auth/shell';
import Turnstile, { captchaEnabled } from '../auth/Turnstile';
import './support.css';

const TOPIC_LABELS: Record<SupportTopic, string> = {
  problem: nt('Something is not working'),
  question: nt('A question about studying'),
  account: nt('My account, trial or access'),
  other: nt('Something else'),
};

/** A line naming where the student came from, when a link said so. */
const REASON_NOTES: Partial<Record<SupportReason, string>> = {
  'mr-ez': nt('You came here because Mr EZ could not answer. Tell us what you asked and what happened.'),
  grader: nt('You came here because your work could not be graded. Your essay or recording is not lost; tell us what happened.'),
  'trial-ended': nt('You came here from the end of your trial.'),
  locked: nt('You came here from a page that is not included in your access.'),
  plans: nt('You came here from the plans page.'),
};

type Status = 'idle' | 'sending' | 'sent';

export default function SupportForm() {
  const { t, locale } = useT();
  const formId = useId();
  const [user, setUser] = useState<User | null>(null);
  const [known, setKnown] = useState(false);
  const [reason, setReason] = useState<SupportReason | null>(null);
  const [from, setFrom] = useState('');
  const [topic, setTopic] = useState<SupportTopic | ''>('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState<SupportErrors>({});
  const [failure, setFailure] = useState<SupportSendFailure | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [sentTo, setSentTo] = useState<string | null>(null);
  // The bot check's one-time answer, signed out only (see Turnstile.tsx).
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const headingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = parseReason(params.get('reason'));
    setReason(r);
    setFrom(parseFrom(params.get('from')));
    const suggested = topicForReason(r);
    if (suggested) setTopic(suggested);
    return onAccountChange((state) => {
      setUser(state.user);
      setKnown(state.known);
    });
  }, []);

  useEffect(() => {
    if (status === 'sent') headingRef.current?.focus();
  }, [status]);

  const operator = publishedOperator();
  const direct = operator?.contact ? (
    <p className="support-direct">
      {t('You can also write to us directly:')}{' '}
      {operator.contactHref ? <a href={operator.contactHref}>{operator.contact}</a> : <strong>{operator.contact}</strong>}
    </p>
  ) : null;

  if (!isAuthConfigured()) {
    return (
      <AuthShell eyebrow={t('Support')} title={t('Ask a person')} lede={t('The support form is not available on this version of the site.')}>
        {direct}
        <a className="auth-button is-secondary" href={withBase('/help')} style={{ marginTop: 28 }}>
          {t('Read the help page')}
        </a>
      </AuthShell>
    );
  }
  if (!known) return <div className="auth-spinner" aria-hidden="true" />;

  const signedIn = !!user;
  const backHref = from ? hrefFor(from) : withBase('/dashboard');

  // Signed out, with no support Worker on this build: say so. No form that
  // cannot send, no pretend success, no quiet call to the database.
  if (!signedIn && !visitorSupportEnabled()) {
    return (
      <AuthShell
        eyebrow={t('Support')}
        title={t('Ask a person')}
        lede={t('Messages from signed-out visitors are not switched on here. Sign in and you can write to a person from your account.')}
      >
        <div className="auth-actions" data-testid="support-visitor-off" style={{ marginTop: 28 }}>
          <a className="auth-button" href={signInHref(currentRoute())}>
            {t('Sign in')}
          </a>
          <a className="auth-button is-secondary" href={withBase('/help')}>
            {t('Read the help page')}
          </a>
        </div>
        {direct}
      </AuthShell>
    );
  }
  const needsCaptcha = !signedIn && captchaEnabled() && !captcha;

  if (status === 'sent') {
    return (
      <AuthShell eyebrow={t('Support')} title={t('Thank you, your message is on its way')}>
        <div className="support-sent" ref={headingRef} tabIndex={-1} role="status">
          <span className="support-sent-mark" aria-hidden="true">
            <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m5 10.5 3.2 3L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="auth-lede" style={{ margin: 0 }}>
            {sentTo
              ? t('A person will read it and reply by email to {email}.', { email: sentTo })
              : t('A person will read it and reply by email.')}
          </p>
          <div className="auth-actions">
            <a className="auth-button" href={backHref}>
              {from ? t('Back to where I was') : t('Go to Today')}
            </a>
            <a className="auth-button is-secondary" href={withBase('/help')}>
              {t('Read the help page')}
            </a>
          </div>
        </div>
      </AuthShell>
    );
  }

  const err = (field: keyof SupportErrors): string | null => {
    const code = errors[field];
    if (!code) return null;
    if (field === 'topic') return t('Please choose one.');
    if (field === 'email') return code === 'required' ? t('Please give an email address so we can answer you.') : t('Please enter a valid email address.');
    if (code === 'required') return t('Please write your message.');
    if (code === 'tooShort') return t('Please write a little more, at least {min} characters.', { min: SUPPORT_LIMITS.messageMin });
    return t('Please keep it under {max} characters.', { max: SUPPORT_LIMITS.messageMax });
  };

  const failureSentence = (f: SupportSendFailure): string => {
    switch (f) {
      case 'rate-limited':
        return t('You have sent several messages today. We will read them all; please wait until tomorrow before sending more.');
      case 'source-limited':
        return t('You have sent several messages in the last hour. We will read them all; please wait an hour before sending more.');
      case 'busy':
        return t('Many messages are arriving right now. Please try again in an hour.');
      case 'challenge-failed':
        return t('The security check did not pass. Please complete it again and send your message once more; nothing you wrote is lost.');
      case 'visitor-off':
        return t('Messages from signed-out visitors are not switched on here. Sign in to send your message.');
      case 'email-required':
      case 'email-invalid':
        return t('Please check the email address.');
      case 'message-length':
        return t('Please check the length of your message.');
      case 'not-configured':
        return t('The support form is not available on this version of the site.');
      default:
        return t('Your message could not be sent. Please check your connection and try again; nothing you wrote is lost.');
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFailure(null);
    const check = validateSupport({ topic, message, email }, signedIn);
    if (!check.ok) {
      setErrors(check.errors);
      const first = check.errors.topic ? `support-topic-${SUPPORT_TOPICS[0]}` : check.errors.message ? 'support-message' : 'support-email';
      document.getElementById(first)?.focus();
      return;
    }
    setErrors({});
    // A filled hidden field means a script, not a person: pretend it worked.
    if (trap) {
      setStatus('sent');
      return;
    }
    setStatus('sending');
    const common = { topic: topic as SupportTopic, message, context: reason, page: from, locale: locale === 'ru' ? ('ru' as const) : ('en' as const) };
    const result = signedIn
      ? await sendSupportRequest({ ...common, email: null })
      : await sendVisitorSupportRequest({ ...common, email, challengeToken: captcha });
    // The bot check's answer works once, whether the attempt worked or not.
    if (!signedIn && captchaEnabled()) setCaptchaReset((n) => n + 1);
    if (!result.ok) {
      setStatus('idle');
      setFailure(result.reason);
      return;
    }
    setSentTo(signedIn ? (user?.email ?? null) : email.trim());
    setStatus('sent');
  }

  const length = message.trim().length;
  const note = reason ? REASON_NOTES[reason] : undefined;

  return (
    <AuthShell
      eyebrow={t('Support')}
      title={t('Ask a person')}
      lede={t('Something not working, or a question the help page does not answer? Write it here. A person reads every message and replies by email.')}
      wide
    >
      {note && <p className="support-context">{t(note)}</p>}

      <form className="auth-form" onSubmit={onSubmit} noValidate aria-describedby={`${formId}-privacy`}>
        <fieldset className="auth-field" style={{ border: 0, margin: 0, padding: 0 }} aria-describedby={errors.topic ? 'support-topic-error' : undefined}>
          <legend className="auth-label" style={{ marginBottom: 7 }}>
            {t('What is it about?')}
          </legend>
          <div className="auth-choices">
            {SUPPORT_TOPICS.map((key) => (
              <label key={key} className="auth-choice">
                <input
                  id={`support-topic-${key}`}
                  type="radio"
                  name="support-topic"
                  value={key}
                  checked={topic === key}
                  onChange={() => {
                    setTopic(key);
                    if (errors.topic) setErrors((x) => ({ ...x, topic: undefined }));
                  }}
                />
                {t(TOPIC_LABELS[key])}
              </label>
            ))}
          </div>
          {err('topic') && (
            <p className="auth-field-error" id="support-topic-error" role="alert" style={{ marginTop: 7 }}>
              {err('topic')}
            </p>
          )}
        </fieldset>

        <Field id="support-message" label={t('Your message')} error={err('message')}>
          <textarea
            id="support-message"
            className="auth-input support-textarea"
            value={message}
            rows={6}
            maxLength={SUPPORT_LIMITS.messageMax + 200}
            aria-invalid={errors.message ? 'true' : undefined}
            aria-describedby={[describedBy('support-message', err('message')), 'support-message-count'].filter(Boolean).join(' ')}
            placeholder={t('What happened, and on which page? The more detail, the faster we can help.')}
            onChange={(e) => {
              setMessage(e.target.value);
              if (errors.message) setErrors((x) => ({ ...x, message: undefined }));
            }}
          />
          <p id="support-message-count" className={`support-count${length > SUPPORT_LIMITS.messageMax ? ' is-over' : ''}`}>
            {t('{count} of {max} characters', { count: length, max: SUPPORT_LIMITS.messageMax })}
          </p>
        </Field>

        {signedIn ? (
          <p className="support-reply-to">
            {t('We will reply to the email on your account:')} <strong>{user?.email}</strong>
          </p>
        ) : (
          <>
            <Field
              id="support-email"
              label={t('Your email')}
              error={err('email')}
              hint={t('You are not signed in, so we need an address to answer you.')}
            >
              <input
                id="support-email"
                className="auth-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={SUPPORT_LIMITS.emailMax}
                value={email}
                aria-invalid={errors.email ? 'true' : undefined}
                aria-describedby={describedBy('support-email', err('email'), t('You are not signed in, so we need an address to answer you.'))}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
                }}
              />
            </Field>
            <p className="support-reply-to">
              {t('Have an account? Signing in first tells us which account this is about.')}{' '}
              <a className="auth-link" href={signInHref(currentRoute())}>
                {t('Sign in')}
              </a>
            </p>
          </>
        )}

        {/* Hidden from people; a form-filling script fills it in. */}
        <div className="support-trap" aria-hidden="true">
          <input id="support-website" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>

        {!signedIn && <Turnstile onToken={setCaptcha} resetSignal={captchaReset} />}

        {failure && (
          <p className="auth-alert" role="alert">
            {failureSentence(failure)}
          </p>
        )}

        <div className="auth-actions">
          <button type="submit" className="auth-button" disabled={status === 'sending' || needsCaptcha}>
            {status === 'sending' ? t('Sending…') : t('Send to a person')}
          </button>
        </div>

        <p className="auth-hint" id={`${formId}-privacy`}>
          {t('Only the person who runs the site reads these messages.')}{' '}
          <a className="auth-link is-small" href={withBase('/privacy')}>
            {t('How we handle your information')}
          </a>
        </p>
      </form>
      {direct}
    </AuthShell>
  );
}
