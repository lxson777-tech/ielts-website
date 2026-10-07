/* Russian: the three vocabulary games under /review/games: Match pairs, 60-second sprint and Spell it.
   Batch owner: Builder V2 (vocabulary games, 8 October 2026). Nobody else edits this file.

   Exam material stays English: the vocabulary words, their meanings and the
   example sentences are never translated here; only the interface around
   them. */

export const strings: Record<string, string> = {
  /* The page and the chooser */
  'Vocabulary games': 'Игры со словами',
  'Quick ways to practise your words. Each answer counts toward your study plan.':
    'Быстрые способы потренировать слова. Каждый ответ учитывается в вашем учебном плане.',
  Games: 'Игры',
  'Match pairs': 'Найди пару',
  '60-second sprint': 'Спринт за 60 секунд',
  'Spell it': 'Напиши слово',
  'Pair six words with their meanings, as fast as you can.': 'Соедините шесть слов с их значениями как можно быстрее.',
  'Fill the gap in each sentence. One minute, as many as you can.':
    'Заполните пропуск в каждом предложении. Одна минута, как можно больше ответов.',
  'Read the meaning, then type the word from memory.': 'Прочитайте значение и напишите слово по памяти.',
  'Six pairs · against the clock': 'Шесть пар · на время',
  'One minute · four choices': 'Одна минута · четыре варианта',
  'Ten words · counts toward learnt': 'Десять слов · засчитывается в выученные',

  /* The topic switch */
  'Mixed set': 'Смешанный набор',
  'Words due for review first, then new ones': 'Сначала слова для повторения, потом новые',
  'Choose a topic': 'Выбрать тему',
  'There are not enough words here for this game. Choose another topic.':
    'Для этой игры здесь недостаточно слов. Выберите другую тему.',

  /* Signed out, and the account changing hands */
  'Your progress is kept on this device only.': 'Ваш прогресс сохраняется только на этом устройстве.',
  'Sign in to keep it everywhere': 'Войдите, чтобы он был с вами везде',

  /* Shared end screens */
  'New personal best': 'Новый личный рекорд',
  'Your best': 'Ваш рекорд',
  'Play again': 'Сыграть ещё раз',
  'All games': 'Все игры',

  /* Match pairs */
  'Tap a word, then its meaning, in either order. The clock starts when you press Start.':
    'Нажмите на слово, а затем на его значение, в любом порядке. Время пойдёт, когда вы нажмёте «Начать».',
  'Your best here: {time}': 'Ваш рекорд здесь: {time}',
  'Game started. Choose a word, then its meaning.': 'Игра началась. Выберите слово, а затем его значение.',
  'Chosen: {text}': 'Выбрано: {text}',
  'Choice cleared.': 'Выбор снят.',
  'Not a pair. Try again.': 'Это не пара. Попробуйте ещё раз.',
  'Matched: {word}. All pairs done.': 'Пара найдена: {word}. Все пары собраны.',
  '{done} of {total} pairs': '{done} из {total} пар',
  Meanings: 'Значения',
  'All pairs matched': 'Все пары найдены',
  Mistakes: 'Ошибки',
  'Your previous best was {time}.': 'Ваш прошлый рекорд: {time}.',
  'Every pair right first time. Well done.': 'Все пары найдены с первого раза. Отлично.',
  'Next topic: {topic}': 'Следующая тема: {topic}',
  'Words to look at again': 'Слова, которые стоит повторить',

  /* 60-second sprint */
  'Choose the missing word. Three right in a row starts a streak. The minute starts when you press Start, and pauses if you leave the tab.':
    'Выберите пропущенное слово. Три верных ответа подряд начинают серию. Минута пойдёт, когда вы нажмёте «Начать», и остановится, если вы уйдёте со вкладки.',
  'Your best here: {score}': 'Ваш рекорд здесь: {score}',
  'Sprint started. One minute.': 'Спринт начался. Одна минута.',
  'Right. Score {score}.': 'Верно. Счёт: {score}.',
  'The answer is “{word}”.': 'Правильный ответ: «{word}».',
  'Time left': 'Осталось времени',
  '{s}s': '{s} с',
  'Streak {n}': 'Серия {n}',
  Paused: 'Пауза',
  'The clock stopped while you were away.': 'Пока вас не было, время остановилось.',
  'Carry on': 'Продолжить',
  'Time is up': 'Время вышло',
  'Longest streak': 'Самая длинная серия',
  'No mistakes at all. Well done.': 'Ни одной ошибки. Отлично.',
  'Words you missed': 'Слова, в которых вы ошиблись',

  /* Spell it */
  'This game makes words count as learnt: spell a word right on two different days, with no letters shown.':
    'Эта игра засчитывает слова как выученные: напишите слово правильно в два разных дня, без подсказанных букв.',
  'Ten words. Capital letters do not matter, but the spelling must be exact.':
    'Десять слов. Заглавные буквы не важны, но написание должно быть точным.',
  'Second go': 'Вторая попытка',
  'In the sentence the word may change a little, for example by adding -s. Type the word itself.':
    'В предложении слово может немного меняться, например получать окончание -s. Напишите само слово.',
  'Type the word': 'Напишите слово',
  'Show a letter': 'Показать букву',
  'Letter shown. This word will not count as learnt today.': 'Буква показана. Сегодня это слово не засчитается как выученное.',
  'With a letter shown, this word will not count as learnt today.':
    'С подсказанной буквой это слово сегодня не засчитается как выученное.',
  'Correct: {word}.': 'Верно: {word}.',
  'Not quite. The word is “{word}”.': 'Не совсем. Правильное слово: «{word}».',
  'Spelt from memory. This counts toward learning the word.': 'Написано по памяти. Это засчитывается в изучение слова.',
  'Right, with help. Spell it with no help another time to count it as learnt.':
    'Верно, но с подсказкой. Напишите его без подсказки в другой раз, чтобы оно засчиталось как выученное.',
  'Try again later': 'Попробовать позже',
  'Set complete': 'Набор пройден',
  'Spelt from memory': 'Написано по памяти',
  '{n} of {total}': '{n} из {total}',
  'To practise': 'Повторить',
  'Now learnt': 'Теперь выучено',
  'Spell them again on another day and they count as learnt.':
    'Напишите их снова в другой день, и они засчитаются как выученные.',
  'Words to practise': 'Слова для тренировки',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  /* Keyed by the English "other" form, as written at the call site. */
  '{n} mistakes': { one: '{n} ошибка', few: '{n} ошибки', many: '{n} ошибок', other: '{n} ошибки' },
  'Matched: {word}. {n} pairs left.': {
    one: 'Пара найдена: {word}. Осталась {n} пара.',
    few: 'Пара найдена: {word}. Осталось {n} пары.',
    many: 'Пара найдена: {word}. Осталось {n} пар.',
    other: 'Пара найдена: {word}. Осталось {n} пары.',
  },
  '{n} letters': { one: '{n} буква', few: '{n} буквы', many: '{n} букв', other: '{n} буквы' },
  '{n} words now count as learnt:': {
    one: '{n} слово теперь считается выученным:',
    few: '{n} слова теперь считаются выученными:',
    many: '{n} слов теперь считаются выученными:',
    other: '{n} слова теперь считаются выученными:',
  },
};
