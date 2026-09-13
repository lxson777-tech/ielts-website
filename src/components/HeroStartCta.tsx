/* The homepage's primary CTA. The course behind /start is an
   account-only feature (CourseGate enforces it on the page itself), so
   this button is the front door: signed out, it opens the create-account
   window and only continues to /start once the student is actually signed
   in; dismissing the window stays on the homepage. Signed in (or when
   accounts aren't configured, where the gate lets everyone through) it's a
   plain link. Renders as that link during SSR/pre-hydration too — the gate
   on /start catches anyone who gets through before hydration. Styles mirror
   Button.astro's gradient/lg variant so it's visually identical to the
   Astro button it replaced. */

import { useEffect, useRef, useState } from 'react';
import { withBase } from '../lib/url';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAuthChange } from '../lib/auth/session';
import AuthModal from './AuthModal';

export default function HeroStartCta() {
  const [signedIn, setSignedIn] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // Ref mirror of modalOpen for the auth subscription's closure: when the
  // student signs in *inside* the window we opened, continue to /start.
  const modalOpenRef = useRef(false);
  const startHref = withBase('/start');

  useEffect(() => {
    if (!isAuthConfigured()) return;
    return onAuthChange((u) => {
      setSignedIn(!!u);
      if (u && modalOpenRef.current) window.location.href = startHref;
    });
  }, []);

  function setModal(open: boolean) {
    modalOpenRef.current = open;
    setModalOpen(open);
  }

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!isAuthConfigured() || signedIn) return; // let the link navigate
    e.preventDefault();
    setModal(true);
  }

  return (
    <>
      <a
        href={startHref}
        onClick={onClick}
        className="inline-flex items-center justify-center gap-2 rounded-button bg-linear-to-r from-brand to-speaking px-7 py-3 font-display text-base font-semibold text-white shadow-card transition-[color,background-color,border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:from-brand-hover hover:shadow-[0_12px_28px_-8px_var(--color-brand)] active:scale-[0.96]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
        Start my IELTS preparation
      </a>

      {modalOpen && <AuthModal initialMode="signup" onClose={() => setModal(false)} />}
    </>
  );
}
