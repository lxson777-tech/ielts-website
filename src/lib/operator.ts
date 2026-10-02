/* Who runs IELTS is EZ, and how to reach them directly. ONE place.

   ONLY ALEX FILLS THESE IN. Nobody else, human or agent, writes a name, an
   email, a phone number, an address or a social handle here, and nobody
   guesses one from git config, a migration, a Worker URL or anywhere else.

   As of 29 September 2026 Alex will run the site himself as a sole trader,
   and has asked for the name and the contact to stay unpublished for now.
   So every value is null and `published` is false, and every surface that
   reads this (the privacy and terms pages, the support page, the workspace
   footer) simply leaves the operator line out. No "TBD", no placeholder:
   a student sees nothing rather than something unfinished. Students can
   still reach a person through the support form (/support), which needs no
   published contact.

   To publish, Alex supplies the exact wording, and the change is:
     name: 'Exactly as it should appear',
     contact: 'an email address or phone number, exactly as it should appear',
     published: true,
   tests/operator.test.ts fails if a value is set while `published` is false,
   if `published` is true with no name, or if a contact is hard-coded
   anywhere else under src/. */

export interface OperatorFacts {
  /** The person or business responsible for the site, as students should see it. */
  name: string | null;
  /** One public way to reach them directly: an email address or a phone number. */
  contact: string | null;
  /** False keeps everything above hidden, whatever it holds. */
  published: boolean;
}

export const OPERATOR: OperatorFacts = {
  name: null,
  contact: null,
  published: false,
};

export interface PublishedOperator {
  name: string;
  contact: string | null;
  /** A mailto: or tel: link for the contact, or null when it is neither. */
  contactHref: string | null;
}

/** The operator as students may see them, or null while unpublished. Every
    surface goes through this, never through OPERATOR directly. */
export function publishedOperator(facts: OperatorFacts = OPERATOR): PublishedOperator | null {
  if (!facts.published) return null;
  const name = facts.name?.trim();
  if (!name) return null;
  const contact = facts.contact?.trim() || null;
  let contactHref: string | null = null;
  if (contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) contactHref = `mailto:${contact}`;
  else if (contact && /^\+?[0-9 ()-]{7,20}$/.test(contact)) contactHref = `tel:${contact.replace(/[^0-9+]/g, '')}`;
  return { name, contact, contactHref };
}

/* ── Seller details for the paid site (2 October 2026) ───────────────────
   Kazakh consumer and personal-data law asks the paid site to show who
   sells: the full registered name, IIN, the registration, the addresses, a
   Kazakh phone, an email and working hours (docs/legal/KZ-WEBSITE-
   REQUIREMENTS-2026-10-02.md, sections 1 and 2). ONLY ALEX FILLS THESE IN,
   exactly as registered. Until a value is filled in:
   - the gated build (the paid version, reviewed locally, not live) shows a
     visible placeholder such as "[full registered name]", so Alex can see
     where each detail will appear;
   - the open build (the live site) shows nothing, as before.
   The same rule as above applies: these values are the only place such
   details may be written (tests/operator.test.ts). */

export interface LegalDetails {
  /** Surname, first name and patronymic, exactly as on the sole-trader registration. */
  fullName: string | null;
  /** The IIN, which also serves as the business number. */
  iin: string | null;
  /** The registration notice: its number and date, and the tax office that issued it. */
  registration: string | null;
  /** The registered address. */
  registeredAddress: string | null;
  /** The centre's actual address, when it differs from the registered one. */
  actualAddress: string | null;
  /** A Kazakh phone number. */
  phone: string | null;
  /** A contact email. */
  email: string | null;
  /** Working hours, as they should appear. */
  hours: string | null;
}

export const LEGAL: LegalDetails = {
  fullName: null,
  iin: null,
  registration: null,
  registeredAddress: null,
  actualAddress: null,
  phone: null,
  email: null,
  hours: null,
};

export type LegalKey = keyof LegalDetails;

/** The placeholder the gated build shows for a detail Alex has not given yet.
    English on purpose: Alex reads them, students never see them. */
export const LEGAL_PLACEHOLDER: Record<LegalKey, string> = {
  fullName: '[full registered name]',
  iin: '[IIN]',
  registration: '[registration notice number, date and tax office]',
  registeredAddress: '[registered address]',
  actualAddress: '[centre address]',
  phone: '[Kazakh phone number]',
  email: '[contact email]',
  hours: '[working hours]',
};

/** One seller detail: the value, or (in a build that shows drafts) its
    placeholder, or null (the live site, where nothing unfinished is shown).
    `showDrafts` is true only in the gated build; callers pass
    isTrialBuild(). Kept free of build imports so tests can call it. */
export function legalDetail(key: LegalKey, showDrafts: boolean, facts: LegalDetails = LEGAL): { text: string; draft: boolean } | null {
  const value = facts[key]?.trim();
  if (value) return { text: value, draft: false };
  return showDrafts ? { text: LEGAL_PLACEHOLDER[key], draft: true } : null;
}

/** True once every detail the law asks for is filled in (the actual
    address is optional: it may be the same as the registered one). */
export function legalDetailsComplete(facts: LegalDetails = LEGAL): boolean {
  return (['fullName', 'iin', 'registration', 'registeredAddress', 'phone', 'email', 'hours'] as LegalKey[]).every((k) => Boolean(facts[k]?.trim()));
}
