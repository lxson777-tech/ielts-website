/* What the public offer, the privacy notice, the receipt and the workspace
   footer share (Builder L, 2 October 2026; docs/legal/BUILD-PLAN-2026-10-02.md).

   - The versions of the offer and of the privacy notice. The privacy
     notice's version is the consent version (CONSENT_VERSION in
     src/lib/legal/consent.ts, Builder C): tests/legal-pages.test.ts fails if
     the two ever differ.
   - The consumer protection authority, confirmed on gov.kz on 2 October 2026:
     the page at https://www.gov.kz/memleket/entities/mti-kzpp is titled
     "Комитет по защите прав потребителей Министерства торговли и интеграции РК"
     (English page: "Committee on consumer protection of the Ministry of trade
     and integration of the Republic of Kazakhstan").
   - The seller's details, as rows, read ONLY through legalDetail() in
     src/lib/operator.ts. Nothing here holds a name, an IIN, an address, a
     phone or an email. `showDrafts` is isTrialBuild(): the gated build shows
     a visible placeholder for a detail Alex has not filled in, the open build
     (the live site) shows nothing until it is filled in. Kept free of build
     imports so tests can call it. */

import { nt } from '../i18n/translate';
import { intlLocale, type Locale } from '../i18n/locale';
import { legalDetail, LEGAL, type LegalDetails, type LegalKey } from '../operator';

/** The date this version of the public offer took effect (YYYY-MM-DD). */
export const OFFER_VERSION = '2026-10-02';
/** The privacy notice's version: the same as the consent a student gives. */
export const PRIVACY_VERSION = '2026-10-02';

/** "2 October 2026" or "2 октября 2026 г.". */
export function formatVersion(version: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale, 'en-GB'), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${version}T00:00:00Z`),
  );
}

export const CONSUMER_AUTHORITY = {
  name: nt('Committee for the Protection of Consumer Rights of the Ministry of Trade and Integration of the Republic of Kazakhstan'),
  url: 'https://www.gov.kz/memleket/entities/mti-kzpp',
} as const;

const LABELS: Record<LegalKey, string> = {
  fullName: nt('Seller, sole trader'),
  iin: nt('IIN'),
  registration: nt('Registration'),
  registeredAddress: nt('Registered address'),
  actualAddress: nt('Centre address'),
  phone: nt('Phone'),
  email: nt('Email'),
  hours: nt('Working hours'),
};

/** Every detail the law asks the seller to show, in reading order. */
export const SELLER_FULL: readonly LegalKey[] = ['fullName', 'iin', 'registration', 'registeredAddress', 'actualAddress', 'phone', 'email', 'hours'];
/** The short version: who, the IIN, and how to reach them. */
export const SELLER_SHORT: readonly LegalKey[] = ['fullName', 'iin', 'phone', 'email'];

export interface SellerRow {
  key: LegalKey;
  /** English label, for t() or data-i18n. */
  label: string;
  text: string;
  /** True for a placeholder (gated build only). */
  draft: boolean;
  /** mailto: or tel: for a real email or phone; never for a placeholder. */
  href: string | null;
}

export function sellerRows(keys: readonly LegalKey[], showDrafts: boolean, facts: LegalDetails = LEGAL): SellerRow[] {
  const rows: SellerRow[] = [];
  for (const key of keys) {
    const detail = legalDetail(key, showDrafts, facts);
    if (!detail) continue;
    let href: string | null = null;
    if (!detail.draft && key === 'email') href = `mailto:${detail.text}`;
    if (!detail.draft && key === 'phone') href = `tel:${detail.text.replace(/[^0-9+]/g, '')}`;
    rows.push({ key, label: LABELS[key], text: detail.text, draft: detail.draft, href });
  }
  return rows;
}

/** The seller's email as a link target, or null when there is none to show. */
export function sellerEmail(showDrafts: boolean, facts: LegalDetails = LEGAL): SellerRow | null {
  return sellerRows(['email'], showDrafts, facts)[0] ?? null;
}
