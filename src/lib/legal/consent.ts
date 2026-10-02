/* Consent to the processing of personal data, asked at sign-up (2 October
   2026; docs/legal/BUILD-PLAN-2026-10-02.md, Builder C).

   Kazakh Personal Data Law (No. 94-V) Art. 7 and 8 p.4: consent must be
   provable and must say who processes the data (name and IIN), what data,
   why, which third parties receive it, that it goes abroad, how long the
   consent lasts and how to withdraw it. Everything a student reads about
   that is built here, from facts, so the wording cannot drift from the
   build it is shown on:

   - WHO comes only from src/lib/operator.ts (legalDetail). In the gated
     build a missing detail shows its placeholder ("[full registered
     name]") so Alex sees where it goes; on the open build (the live site)
     the sentence simply leaves the name out. Never type a name here.
   - THIRD PARTIES AND COUNTRIES are the plan's list: Supabase (EU or US),
     OpenAI (US), Cloudflare (worldwide), GitHub Pages (US), and the payment
     company (Kazakhstan) only where access is sold.
   - HOW TO WITHDRAW names only the routes this build really has: account
     deletion where it is switched on, the support form where it is.

   PROOF. The tick is stored with the account, in the sign-in's own user
   metadata (no database change needed): { consent_version, consent_at }.
   Email sign-up sends it with the sign-up call; Google sign-in keeps it in
   this tab's sessionStorage across the redirect and writes it once the
   student is back (src/lib/legal/consent-store.ts). A parent's declaration
   for a student under 18 goes beside it as parent_consent_version and
   parent_consent_at.

   No browser and no Supabase client here, so the rules are unit-tested
   (tests/legal-consent.test.ts). Every sentence is wrapped in nt() so the
   coverage test demands its Russian (src/lib/i18n/dict/ru/c-consent.ts). */

import { nt } from '../i18n/translate';
import { LEGAL, legalDetail, type LegalDetails } from '../operator';

/** The version of the wording below. Change it whenever the wording changes
    in substance: every account is then asked again on its next profile
    save, because only the current version counts (hasCurrentConsent). The
    privacy notice shows the same version and date. */
export const CONSENT_VERSION = '2026-10-02';

/** The sentence beside the tick box. */
export const CONSENT_SENTENCE = nt(
  'I agree to my personal data being processed as described here, including its transfer to services outside Kazakhstan.',
);

/** The parent or guardian's declaration on the profile form, for a student
    under 18. The gated build sells access, and a purchase by a 14 to 17
    year old needs a parent's agreement too (Civil Code Art. 22). */
export function parentDeclaration(paid: boolean): string {
  return paid
    ? nt('My parent or guardian agrees to me using this site, to my personal data being processed as the privacy notice describes, and to any purchase of access I make.')
    : nt('My parent or guardian agrees to me using this site and to my personal data being processed as the privacy notice describes.');
}

export interface ConsentOptions {
  /** True only in the gated build: show placeholders for missing seller details. */
  drafts: boolean;
  /** True where access is sold (the gated build). */
  paid: boolean;
  /** True where "Delete my account" exists on this build. */
  deletion: boolean;
  /** True where the support form can send on this build. */
  support: boolean;
  /** The seller details; the real ones unless a test passes its own. */
  facts?: LegalDetails;
}

/** One sentence, still in English, with the values for its placeholders. */
export interface ConsentLine {
  text: string;
  vars?: Record<string, string>;
}

export interface ConsentPoint {
  heading: string;
  lines: ConsentLine[];
}

/** The full consent wording for this build, in reading order. */
export function consentPoints(options: ConsentOptions): ConsentPoint[] {
  const facts = options.facts ?? LEGAL;
  const name = legalDetail('fullName', options.drafts, facts);
  const iin = legalDetail('iin', options.drafts, facts);

  const who: ConsentLine =
    name && iin
      ? { text: nt('Your data is processed by {name} (IIN {iin}), who runs IELTS is EZ.'), vars: { name: name.text, iin: iin.text } }
      : name
        ? { text: nt('Your data is processed by {name}, who runs IELTS is EZ.'), vars: { name: name.text } }
        : { text: nt('Your data is processed by the person who runs IELTS is EZ.') };

  const data: ConsentLine[] = [
    { text: nt('Your email address, and your name if you sign in with Google.') },
    {
      text: nt(
        'Your profile: first and last name, date of birth, phone, city, school, university or job, and how you found us. For a student under 18, a parent or guardian’s name and phone.',
      ),
    },
    { text: nt('Your study: lessons completed, answers, test results, your study plan, saved words and notes.') },
    { text: nt('The essays you send for AI feedback, and the feedback. Speaking recordings are sent for marking, and only the results are kept.') },
    { text: nt('Your conversations with Mr EZ, and the messages you send us.') },
  ];
  if (options.paid) {
    data.push({
      text: nt('If you buy access: the plan, the amount, the date, the payment status and the receipt number. Card details go to the payment company, never to us.'),
    });
  }

  const purposes: ConsentLine[] = [
    { text: nt('To run your account and keep your work on every device.') },
    { text: nt('To give you the course, mark your essays and Speaking with AI, and run Mr EZ and the live examiner.') },
    { text: nt('To answer your messages and contact you about your studies or your account.') },
    { text: nt('To keep the site secure and prevent misuse.') },
  ];
  if (options.paid) purposes.push({ text: nt('To sell access and keep the sales records the law requires.') });

  const recipients: ConsentLine[] = [
    { text: nt('Supabase stores your account and your data (servers in the European Union or the United States).') },
    { text: nt('OpenAI marks essays and Speaking and runs Mr EZ and the live examiner (United States).') },
    { text: nt('Cloudflare runs the site’s background services and its security check (servers around the world).') },
    { text: nt('GitHub Pages delivers the site’s pages to your browser (United States).') },
  ];
  if (options.paid) recipients.push({ text: nt('The payment company handles payments (Kazakhstan).') });
  recipients.push(
    { text: nt('So your data is transferred outside Kazakhstan, and by agreeing you consent to that transfer.') },
    { text: nt('Nothing about you is made public.') },
  );

  const withdraw: ConsentLine[] = [];
  if (options.deletion) {
    withdraw.push({ text: nt('You can withdraw your consent at any time by deleting your account: Account, then Profile, then Delete account. Everything is removed at once.') });
    if (options.support) withdraw.push({ text: nt('You can also ask us to do it through the support form.') });
  } else if (options.support) {
    withdraw.push({ text: nt('You can withdraw your consent at any time by asking us, through the support form, to close your account.') });
  } else {
    withdraw.push({ text: nt('You can withdraw your consent at any time by asking us to close your account.') });
  }
  withdraw.push({ text: nt('The site cannot keep an account without this data, so withdrawing consent closes the account.') });
  if (options.paid) {
    withdraw.push({ text: nt('A record of each payment is kept without your name or email for 5 years, because tax law requires sales records.') });
  }

  return [
    { heading: nt('Who processes your data'), lines: [who] },
    { heading: nt('What data'), lines: data },
    { heading: nt('Why'), lines: purposes },
    { heading: nt('Who else receives it, and where'), lines: recipients },
    { heading: nt('How long your consent lasts'), lines: [{ text: nt('While your account is open: until you withdraw it or delete your account.') }] },
    { heading: nt('How to withdraw it'), lines: withdraw },
  ];
}

/* ── The record kept with the account ─────────────────────────────────── */

export interface ConsentRecord {
  consent_version: string;
  consent_at: string;
}

export interface ParentConsentRecord {
  parent_consent_version: string;
  parent_consent_at: string;
}

export function consentRecord(now: Date): ConsentRecord {
  return { consent_version: CONSENT_VERSION, consent_at: now.toISOString() };
}

export function parentConsentRecord(now: Date): ParentConsentRecord {
  return { parent_consent_version: CONSENT_VERSION, parent_consent_at: now.toISOString() };
}

function field(meta: unknown, key: string): unknown {
  return meta && typeof meta === 'object' ? (meta as Record<string, unknown>)[key] : undefined;
}

const isTime = (value: unknown): boolean => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/** True when the account's metadata holds consent to the CURRENT wording. */
export function hasCurrentConsent(meta: unknown): boolean {
  return field(meta, 'consent_version') === CONSENT_VERSION && isTime(field(meta, 'consent_at'));
}

/** True when the account's metadata holds a parent's declaration to the
    CURRENT wording. */
export function hasCurrentParentConsent(meta: unknown): boolean {
  return field(meta, 'parent_consent_version') === CONSENT_VERSION && isTime(field(meta, 'parent_consent_at'));
}

/** How long a tick given before the Google redirect still counts once the
    student is back. Long enough for a slow Google sign-in, short enough
    that a tab left open for a day does not carry it to someone else. */
export const PENDING_CONSENT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

/** A pending consent read back from sessionStorage, or null when there is
    none, it is malformed, it is for an older wording, or it is too old. */
export function parsePendingConsent(raw: string | null, now: Date): ConsentRecord | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (field(value, 'consent_version') !== CONSENT_VERSION) return null;
  const at = field(value, 'consent_at');
  if (typeof at !== 'string') return null;
  const time = Date.parse(at);
  if (Number.isNaN(time)) return null;
  const age = now.getTime() - time;
  if (age < -60_000 || age > PENDING_CONSENT_MAX_AGE_MS) return null;
  return { consent_version: CONSENT_VERSION, consent_at: new Date(time).toISOString() };
}
