/* Russian: Builder D of the 2026-09-29 audit remediation (accessibility and
   layout: F07, F09, F10, F11, F12). Nobody else edits this file.

   Covers the new sentences on Today's compact placement invitation
   (src/components/placement/PlacementOffer.tsx) and the topic search on the
   vocabulary overview (src/components/LessonVocabularySearch.astro). The
   Writing answer label reuses "Your answer", already translated.

   Same wording as the placement batch: "вступительный тест" (named "тест"
   again in the sentence, which reads better than a bare "он" under a
   title), "части экзамена" for the four papers, "занятие" for Today's
   session. The first sentence is kept to two lines at 390px so the
   session's "Начать" stays inside the first phone screen.
   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* PlacementOffer.tsx: the compact invitation on Today */
  "It tailors your plan to all four papers. Today's session below is ready either way.":
    'Тест подстроит план под все четыре части. Занятие ниже готово в любом случае.',
  'It tailors your plan to all four papers, so your next sessions start from real evidence.':
    'Тест подстроит план под все четыре части экзамена, чтобы следующие занятия начинались с реальных данных.',

  /* LessonVocabularySearch.astro: the overview searches its topic cards */
  'Find a topic': 'Найти тему',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
