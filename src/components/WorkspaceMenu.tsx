import { AnimatePresence, motion } from 'framer-motion';
import { usePlatformReducedMotion } from './SmoothReveal';
/* The avatar button at the right of the workspace header, and the compact
   menu it opens: everything that used to live in the left sidebar but is not
   one of the five daily tabs.

   Auth plumbing is the same as AccountMenu's (which still serves the
   marketing nav), and since 23 September 2026 neither of them OWNS it. Both
   read src/lib/auth/lifecycle.ts, which the base layout starts on every
   route, so a page with no header on it (the full-screen test player, the
   drills, the mock exam) has the same data owner and the same sync as a page
   with one. This island now only shows who is signed in and opens AuthModal;
   starting and stopping the sync is the lifecycle's job. */

import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { withBase } from '../lib/url';
import { isAuthConfigured } from '../lib/auth/supabase';
import { signOut } from '../lib/auth/session';
import { onAccountChange, startAccountLifecycle } from '../lib/auth/lifecycle';
import { WORKSPACE_MENU } from '../lib/platform-nav';
import { isAdminCached } from '../lib/admin';
import { LOCALE_LABEL, SUPPORTED_LOCALES, switchLocale } from '../lib/i18n';
import { useT } from '../lib/i18n/react';
import AuthModal from './AuthModal';

/** Up to two letters from the email's local part, e.g. alex.p@x.com -> AP. */
function initialsFor(email: string | undefined): string {
  if (!email) return '';
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export default function WorkspaceMenu() {
  const reduceMotion = usePlatformReducedMotion();
  const { t, locale } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    /* Started here as well as from the base layout, so an island that
       hydrates before that script runs still gets it going. It is
       idempotent, so the second call does nothing. */
    startAccountLifecycle();
    return onAccountChange((account) => setUser(account.user));
  }, []);

  useEffect(() => {
    if (user) setModalOpen(false);
  }, [user]);

  /* The admin link is shown only to an account the database confirms as an
     admin (src/lib/admin.ts). Hiding it is a courtesy, not the lock: the
     admin page's data is refused server-side to everyone else. */
  const [isAdmin, setIsAdmin] = useState(false);
  const userId = user?.id ?? null;
  useEffect(() => {
    setIsAdmin(false);
    if (!userId) return;
    let cancelled = false;
    void isAdminCached(userId).then((ok) => {
      if (!cancelled) setIsAdmin(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initials = initialsFor(user?.email ?? undefined);
  const authAvailable = isAuthConfigured();

  // Each row in the open menu follows the one above it by 20ms. The count is
  // reset per render and handed out in JSX order, so the delays stay correct
  // however many groups (or the signed-in identity line) happen to be shown.
  let staggerIndex = 0;
  const step = () => staggerIndex++;

  return (
    <div className="ws-account" ref={wrapRef}>
      {/* The language switch, always on screen. It used to live only at the
          bottom of the account menu, behind an unlabelled person icon, which
          a student who reads no English would never open. Short codes
          rather than names so it stays small on a phone; the full names are
          the accessible labels and are never translated. */}
      <div className="ws-lang" role="group" aria-label={t('Language')}>
        {SUPPORTED_LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            className="ws-lang-option"
            lang={code}
            aria-pressed={code === locale}
            aria-label={LOCALE_LABEL[code]}
            title={LOCALE_LABEL[code]}
            onClick={() => {
              if (code !== locale) void switchLocale(code);
            }}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        type="button"
        ref={buttonRef}
        className="ws-avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? t('Close menu') : t('Open menu')}
        onClick={() => setOpen((o) => !o)}
      >
        {initials ? (
          <span className="ws-avatar-initials">{initials}</span>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 8a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <div inert={!open}>
      <AnimatePresence>
      {open && (
        <motion.div className="ws-menu" role="menu"
          initial={{ opacity: 0, y: -5, scale: .98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -3, scale: .99 }}
          transition={{ duration: reduceMotion ? 0 : .2 }}
          style={{ animation: "none" }}>
          {user?.email && (
            <p className="ws-menu-identity" style={{ '--i': step() } as React.CSSProperties}>
              <span>{t('Signed in as')}</span>
              <strong>{user.email}</strong>
            </p>
          )}
          {isAdmin && (
            <div className="ws-menu-group">
              <a
                role="menuitem"
                href={withBase('/admin')}
                style={{ '--i': step() } as React.CSSProperties}
                onClick={() => setOpen(false)}
              >
                {t('Admin panel')}
              </a>
            </div>
          )}
          {WORKSPACE_MENU.map((group, i) => (
            <div className="ws-menu-group" key={i}>
              {group.map((item) => (
                <a
                  key={item.href}
                  role="menuitem"
                  href={withBase(item.href)}
                  style={{ '--i': step() } as React.CSSProperties}
                  onClick={() => setOpen(false)}
                >
                  {t(item.label)}
                </a>
              ))}
            </div>
          ))}
          {authAvailable && (
            <div className="ws-menu-group">
              {user ? (
                <button
                  type="button"
                  role="menuitem"
                  style={{ '--i': step() } as React.CSSProperties}
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                >
                  {t('Sign out')}
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  style={{ '--i': step() } as React.CSSProperties}
                  onClick={() => {
                    setOpen(false);
                    setModalOpen(true);
                  }}
                >
                  {t('Sign in')}
                </button>
              )}
            </div>
          )}

          {/* The language switch. Two quiet options rather than a select, so
              the current choice is visible without opening anything, and each
              language is named in its own language (never translated). The
              menu deliberately stays open: the student sees the whole shell
              change under them, which is the confirmation that it worked. */}
          <div className="ws-menu-group">
            <p className="ws-menu-lang-label" style={{ '--i': step() } as React.CSSProperties}>
              {t('Language')}
            </p>
            <div className="ws-menu-langs" role="group" aria-label={t('Language')}>
              {SUPPORTED_LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="ws-menu-lang"
                  lang={code}
                  aria-pressed={code === locale}
                  style={{ '--i': step() } as React.CSSProperties}
                  onClick={() => {
                    void switchLocale(code);
                  }}
                >
                  {LOCALE_LABEL[code]}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
      </div>

      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
