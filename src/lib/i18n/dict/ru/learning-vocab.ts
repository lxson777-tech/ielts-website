/* Russian: the recall and use-in-a-sentence review modes.
   Batch owner: WP21, vocabulary integration (personal learning build).
   Nobody else edits this file.

   Covers: src/components/VocabReview.tsx's two new modes only. The
   original recognise-mode strings (Flashcards, the flip card, the four
   rating buttons, the finished summary grid, "Words you struggle with", and
   so on) were already translated before this package and live in
   dict/ru/account-auth-vocab.ts; they are deliberately not repeated here.

   Exam material stays English. Vocabulary words and example sentences stay
   English; only the chrome around the recall and sentence-writing modes
   (prompts, buttons, feedback) is this batch's job.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* VocabReview.tsx: the quiet mode badge above the card. "Recall" is
     deliberately NOT repeated here: dict/ru/learning-today.ts already
     translates that exact English word (the Today session's own "recall"
     step role), and the merged dictionary makes it available to every
     caller regardless of which batch file added it. Adding it again here
     would conflict (tests/i18n.test.ts checks for exactly this). */
  Recognise: 'Узнать',
  'Use it': 'Использовать',

  /* VocabReview.tsx: recall mode, the definition-shown, type-the-word form. */
  'Type the English word': 'Введите слово на английском',
  Check: 'Проверить',
  'I don’t know, show me': 'Не знаю, покажите',
  'Correct.': 'Верно.',
  'Not quite.': 'Не совсем.',
  Next: 'Далее',

  /* VocabReview.tsx: use-in-a-sentence mode, writing then comparing. */
  'Write your own sentence using this word': 'Составьте своё предложение с этим словом',
  'Write a sentence with this word': 'Напишите предложение с этим словом',
  'Try to use the word itself, or a simple form of it.':
    'Постарайтесь использовать само слово или его простую форму.',
  'A little more. Aim for at least {n} words.': 'Ещё немного. Постарайтесь написать не менее {n} слов.',
  'Your sentence:': 'Ваше предложение:',
  'The lesson’s own example:': 'Пример из урока:',
  'Did you use it well?': 'Вы использовали его правильно?',
  'Yes, I used it well': 'Да, я использовал его правильно',
  'Not quite, I’ll review it': 'Не совсем, повторю это слово',

  /* VocabReview.tsx: the finished screen's "what comes back when" line. */
  'Some of today’s words are already due again.': 'Некоторые из сегодняшних слов уже пора повторить снова.',
  'The next of today’s words comes back tomorrow.': 'Следующее из сегодняшних слов вернётся завтра.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  /* Keyed by the English "other" form exactly as written at the call site
     (docs/I18N-GUIDE.md), not the singular. */
  'The next of today’s words comes back in {n} days.': {
    one: 'Следующее из сегодняшних слов вернётся через {n} день.',
    few: 'Следующее из сегодняшних слов вернётся через {n} дня.',
    many: 'Следующее из сегодняшних слов вернётся через {n} дней.',
    other: 'Следующее из сегодняшних слов вернётся через {n} дня.',
  },
};
