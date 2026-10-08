/* Russian: the Vocabulary home at /review: the Today strip, streak, word of the day, illustrated topic cards with progress rings, and the topic page flip cards.
   Batch owner: Builder V1 (Vocabulary home and topic pages, 8 October 2026). Nobody else edits this file.

   Exam material stays English: the vocabulary words, their meanings and the
   example sentences are never translated here; only the interface around
   them.

   The three game names on a topic page carry the context "vocab-home"
   (key = context + U+0004 + English), so they can never disagree with the
   games' own batch (vocab-games.ts), which names the same games. */

export const strings: Record<string, string> = {
  /* Today strip (src/components/vocab/home/TodayStrip.tsx) */
  'Today': 'Сегодня',
  'Five minutes a day is enough. Learn a few words, then spell them from memory.':
    'Хватит пяти минут в день. Выучите несколько слов, а потом напишите их по памяти.',
  'Study today to start a streak': 'Позанимайтесь сегодня, чтобы начать серию',
  'All caught up for today': 'На сегодня всё повторено',
  "Start today's 5 minutes": 'Начать 5 минут на сегодня',

  /* Word of the day and the flip cards */
  'Word of the day': 'Слово дня',
  'Tap to see the meaning': 'Нажмите, чтобы увидеть значение',
  'Show the meaning': 'Показать значение',
  'Learnt': 'Выучено',
  'Open the topic {topic}': 'Открыть тему {topic}',

  /* Topic cards and rings */
  'Topics': 'Темы',
  'A word counts as learnt once you spell it from memory on two different days.':
    'Слово считается выученным, когда вы написали его по памяти в два разных дня.',
  '{learnt} of {total} learnt': 'Выучено {learnt} из {total}',
  '{learnt} of {total} words learnt': 'Выучено слов: {learnt} из {total}',

  /* Topic page */
  'Play with these words': 'Играть с этими словами',
  'vocab-home\u0004Match pairs': 'Найди пару',
  'Join each word to its meaning': 'Соедините каждое слово с его значением',
  'vocab-home\u000460-second sprint': 'Спринт за 60 секунд',
  'As many as you can in one minute': 'Как можно больше за одну минуту',
  'vocab-home\u0004Spell it': 'Напиши слово',
  'Type the word from its meaning': 'Напишите слово по его значению',
  'Show all as a list': 'Показать всё списком',
  'Show as cards': 'Показать карточками',
  'Tap a card to see its meaning and an example.': 'Нажмите на карточку, чтобы увидеть значение и пример.',

  /* Go Further as guess-the-word cards (GuessCards.tsx) */
  'Band 7+': 'Балл 7+',
  '{revealed} of {total} revealed': 'Открыто {revealed} из {total}',
  'Hide all again': 'Скрыть все снова',
  'Read the meaning, think of the word, then tap to check.': 'Прочитайте значение, вспомните слово и нажмите, чтобы проверить.',
  'Reveal the word': 'Показать слово',

  /* Key Collocations as pick-the-partner (PartnerPicks.tsx). "Try again"
     already has its Russian in another batch. */
  'Pick the word that completes each phrase.': 'Выберите слово, которое завершает каждое сочетание.',
  '{score} of {total} right': 'Верно {score} из {total}',
  'Correct: {answer}.': 'Верно: {answer}.',
  'The answer is {answer}.': 'Правильный ответ: {answer}.',
  'Not quite. Try another word.': 'Не совсем. Попробуйте другое слово.',
  'blank': 'пропуск',
  'Choose the missing word': 'Выберите пропущенное слово',

  /* Useful phrases as copy-ready cards (PhraseCards.tsx) */
  'Copy': 'Копировать',
  'Copied': 'Скопировано',
  'Select to copy': 'Выделите текст',
  'Could not copy. Select the text instead.': 'Не удалось скопировать. Выделите текст вручную.',
  'Copy a phrase into the Writing trainer': 'Скопируйте фразу в тренажёр Writing',
  'Words from this topic are marked.': 'Слова из этой темы выделены.',

  /* Topic lesson pages (src/pages/lessons/vocabulary/[part].astro) */
  'Play games with these words': 'Играть с этими словами',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  '{n} words to review today': {
    one: '{n} слово на повторение сегодня',
    few: '{n} слова на повторение сегодня',
    many: '{n} слов на повторение сегодня',
    other: '{n} слова на повторение сегодня',
  },
};
