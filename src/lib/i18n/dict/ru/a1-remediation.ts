/* Russian: paid access, server side (audit remediation, builder A1).
   Batch owner: builder A1 (29 September 2026). Nobody else edits this file.

   Covers: the sentences in src/lib/access/plans.ts that the pricing
   surfaces show. The other plan sentences ('One month', 'Three months', the
   one-month summary) are already in dict/ru/trial.ts and are not repeated;
   the dictionary is one merged object.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  'The full course and every practice test for three months.': 'Полный курс и все тренировочные тесты на три месяца.',
  'Unlimited study, with fair daily limits on Mr EZ and the live examiner.':
    'Занимайтесь без ограничений; у Mr EZ и устного экзаменатора есть разумные дневные лимиты.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
