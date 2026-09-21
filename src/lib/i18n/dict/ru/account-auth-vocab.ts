/* Russian: account, sign-in and vocabulary.
   Batch owner: the account/auth/vocabulary agent. Nobody else edits this file.

   Covers: src/components/AuthModal.tsx, src/components/AccountMenu.tsx,
   src/components/ResetPassword.tsx, src/components/WordOfTheDay.tsx,
   src/components/VocabQuiz*.tsx, src/pages/account.astro,
   src/pages/review.astro, src/pages/reset-password.astro.

   The English vocabulary items themselves stay in English; their
   definitions and the quiz chrome are this batch's job.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
