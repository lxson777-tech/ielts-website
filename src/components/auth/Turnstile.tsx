/* The bot check on sign-up, sign-in and "forgot password": Cloudflare
   Turnstile, decided by Alex on 24 September 2026.

   Switched on by one public setting, PUBLIC_TURNSTILE_SITE_KEY. When it is
   unset (local development, every worktree, the test harness) this renders
   nothing, loads nothing and the forms send no token, so everything works
   exactly as it did before the check existed. When it is set, Cloudflare's
   script is fetched the first time an auth form opens (never on any other
   page), the widget renders, and its one-time answer is handed to the form,
   which passes it to Supabase as `captchaToken`.

   Supabase refuses sign-up, sign-in and password-reset requests without a
   valid token once "captcha protection" is switched on in its dashboard,
   with this same site's secret key. That switch, and the Turnstile site in
   Cloudflare, are Alex's to set up; nothing here can do it.

   A token works once. The form asks for a fresh one after every attempt
   (bump `resetSignal`), whether the attempt worked or not. */

import { useEffect, useRef } from 'react';
import { useT } from '../../lib/i18n/react';

const SITE_KEY = (import.meta.env?.PUBLIC_TURNSTILE_SITE_KEY as string | undefined) || '';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** True when the bot check is switched on for this build. */
export function captchaEnabled(): boolean {
  return SITE_KEY.length > 0;
}

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      language?: string;
      theme?: 'light' | 'dark' | 'auto';
      size?: 'normal' | 'flexible' | 'compact';
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
    script.onerror = () => {
      loading = null;
      reject(new Error('turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export default function Turnstile({
  onToken,
  resetSignal = 0,
}: {
  /** The current one-time answer, or null while there is none. */
  onToken: (token: string | null) => void;
  /** Bump after every attempt to get a fresh answer. */
  resetSignal?: number;
}) {
  const { t, locale } = useT();
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const tokenCallback = useRef(onToken);
  tokenCallback.current = onToken;

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current) return;
        widget.current = api.render(box.current, {
          sitekey: SITE_KEY,
          callback: (token) => tokenCallback.current(token),
          'expired-callback': () => tokenCallback.current(null),
          'error-callback': () => tokenCallback.current(null),
          language: locale,
          theme: 'light',
          size: 'flexible',
        });
      })
      .catch(() => tokenCallback.current(null));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
    // Re-rendered for a language switch so the widget speaks the same language.
  }, [locale]);

  useEffect(() => {
    if (resetSignal === 0) return;
    tokenCallback.current(null);
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
  }, [resetSignal]);

  if (!SITE_KEY) return null;
  return <div ref={box} className="auth-captcha" aria-label={t('Security check')} />;
}
