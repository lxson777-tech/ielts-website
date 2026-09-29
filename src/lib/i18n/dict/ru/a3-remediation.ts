/* Russian: paid content in the gated build (audit remediation, builder A3).
   Batch owner: builder A3 (29 September 2026). Nobody else edits this file.

   Covers: the in-between screens of paid material (src/components/trial/
   PaidStates.tsx), shown while a paid account's material arrives through
   the content gate or when it could not be fetched.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  'This page could not be loaded just now': 'Сейчас не удалось загрузить эту страницу',
  'You seem to be offline. Your access and your work are safe; try again once you are connected.':
    'Похоже, вы не в сети. Ваш доступ и ваши работы в сохранности; попробуйте снова, когда подключитесь.',
  'Your access and your work are safe. Please try again in a moment.':
    'Ваш доступ и ваши работы в сохранности. Пожалуйста, попробуйте ещё раз чуть позже.',
  'Please sign in again': 'Пожалуйста, войдите снова',
  'Your session has expired. Sign in and this page opens again, with your access and your work as they were.':
    'Срок вашего сеанса истёк. Войдите, и эта страница снова откроется, а ваш доступ и ваши работы останутся прежними.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
