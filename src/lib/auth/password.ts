/* The password rules every form on the site applies (sign-up, reset,
   change password on /account), decided by Alex on 24 September 2026:
   at least 8 characters, with at least one letter and at least one digit.

   The same rules are meant to be switched on in the Supabase dashboard
   (minimum length, "letters and digits", leaked-password check), which is
   what actually refuses a weak password. This file is the friendly half:
   it tells the student what is missing while they type, before a request
   is ever sent. Pure, no browser, unit tested in tests/password.test.ts.

   It returns codes, never English, so the form owns the wording and its
   translation. */

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordProblem = 'tooShort' | 'noLetter' | 'noDigit';
export type PasswordStrength = 'weak' | 'fair' | 'strong';

export interface PasswordCheck {
  /** True when every rule above holds. */
  ok: boolean;
  /** What is still missing, in a fixed order, empty when ok. */
  problems: PasswordProblem[];
  /** A hint only, never a rule: 'weak' whenever a rule fails. */
  strength: PasswordStrength;
}

const LETTER = /\p{L}/u;
const DIGIT = /\p{Nd}/u;

export function checkPassword(password: string): PasswordCheck {
  const pw = password ?? '';
  const problems: PasswordProblem[] = [];
  // Count characters, not UTF-16 units, so an emoji is one character.
  const length = [...pw].length;
  if (length < PASSWORD_MIN_LENGTH) problems.push('tooShort');
  if (!LETTER.test(pw)) problems.push('noLetter');
  if (!DIGIT.test(pw)) problems.push('noDigit');
  if (problems.length > 0) return { ok: false, problems, strength: 'weak' };

  /* Past the rules, a rough hint: length does most of the work, and mixing
     in a capital or a symbol helps. A long passphrase counts as strong
     without any symbols at all. */
  const hasUpperAndLower = /\p{Lu}/u.test(pw) && /\p{Ll}/u.test(pw);
  const hasSymbol = /[^\p{L}\p{Nd}]/u.test(pw);
  const variety = (hasUpperAndLower ? 1 : 0) + (hasSymbol ? 1 : 0);
  const strong = length >= 16 || (length >= 12 && variety >= 1) || (length >= 10 && variety >= 2);
  return { ok: true, problems, strength: strong ? 'strong' : 'fair' };
}
