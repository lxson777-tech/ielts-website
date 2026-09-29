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
