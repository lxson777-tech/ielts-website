/* Russian: the placement test.
   Batch owner: the placement test build (24 September 2026). Nobody else
   edits this file.

   Covers: src/components/placement/*, and the one placement sentence on the
   test player's score card (src/components/TestPlayer.tsx).

   Paper names (Listening, Reading, Writing, Speaking), "Task 1", "Part 1",
   IELTS and the question type names stay English inside the Russian, as the
   guide asks: the student meets them in that form on the real exam. Words
   already translated elsewhere ("Not now", "Continue", "Sign in", "Try
   again", "Not yet assessed", "{n} min", "Listening recording") are not
   repeated here; the dictionary is one merged object.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* Names and frame */
  'Placement test': 'Вступительный тест',
  'Placement test parts': 'Части вступительного теста',
  'Back to Today': 'Вернуться к плану на сегодня',
  Now: 'Сейчас',
  'Part {n} of 4': 'Часть {n} из 4',

  /* Signed out, unavailable, paused */
  'Sign in to take the placement test': 'Войдите, чтобы пройти вступительный тест',
  'The placement test saves its results to your account and uses the AI examiner, so it needs you to be signed in. It takes about {n} minutes, once.':
    'Вступительный тест сохраняет результаты в вашем аккаунте и использует ИИ-экзаменатора, поэтому нужно войти. Он занимает около {n} минут, один раз.',
  'Accounts are not set up on this site, so the placement test cannot be taken here.':
    'На этом сайте не настроены аккаунты, поэтому вступительный тест здесь пройти нельзя.',
  'The placement test is not available here': 'Вступительный тест здесь недоступен',
  'Its material is not part of this version of the site. Your plan still starts with short samples of each paper, so nothing is missing from your study.':
    'Его материалов нет в этой версии сайта. Ваш план всё равно начнётся с коротких проб каждой части экзамена, так что в учёбе ничего не теряется.',
  'This placement test is paused here': 'Вступительный тест на этой вкладке остановлен',
  'This placement test carried on in another tab, so this tab stopped rather than write over it.':
    'Вступительный тест продолжился на другой вкладке, поэтому эта вкладка остановилась, чтобы ничего не перезаписать.',
  'Reload this page': 'Обновить страницу',
  'The account on this page changed. The placement test in progress was kept for the student who was taking it.':
    'Аккаунт на этой странице сменился. Начатый вступительный тест сохранён для того, кто его проходил.',

  /* Introduction */
  'One sitting of about {n} minutes, taken once. It shows your plan where you are in all four papers, so your study time goes where it helps most.':
    'Один заход примерно на {n} минут, один раз. Он показывает плану, где вы сейчас во всех четырёх частях экзамена, чтобы время на учёбу шло туда, где оно полезнее всего.',
  'One part of a real recording, 10 questions, played once.': 'Одна часть настоящей записи, 10 вопросов, звучит один раз.',
  'One passage from a real Academic paper, 13 questions.': 'Один текст из настоящего Academic экзамена, 13 вопросов.',
  'One Task 1 report of at least 150 words, marked by the AI examiner.':
    'Один отчёт Task 1 не короче 150 слов, его оценивает ИИ-экзаменатор.',
  'A short Part 1 interview with the AI examiner.': 'Короткое интервью Part 1 с ИИ-экзаменатором.',
  'The result is an estimate from one sitting, not a band score. You can stop between parts and come back later on this device; once a part has started, its clock keeps running.':
    'Результат будет примерной оценкой по одному заходу, а не баллом. Между частями можно остановиться и вернуться позже на этом устройстве; если часть уже началась, её время продолжает идти.',
  'Start the placement test': 'Начать вступительный тест',

  /* Part briefs */
  'One part of a real IELTS recording with 10 questions. It plays once, as in the exam, so read the first questions while it starts and answer as you listen.':
    'Одна часть настоящей записи IELTS, 10 вопросов. Она звучит один раз, как на экзамене: прочитайте первые вопросы, пока запись начинается, и отвечайте по ходу.',
  'Plays once': 'Звучит один раз',
  'Headphones help': 'Лучше в наушниках',
  'Start Listening': 'Начать Listening',
  'One passage from a real Academic Reading paper, with 13 questions of three kinds.':
    'Один текст из настоящего экзамена Academic Reading, 13 вопросов трёх типов.',
  '13 questions': '13 вопросов',
  'The exam allows about 20 minutes a passage. Here you have {n}, a brisk but realistic pace.':
    'На экзамене на один текст уходит около 20 минут. Здесь у вас {n}: темп быстрый, но реальный.',
  'Start Reading': 'Начать Reading',
  'One Writing Task 1 report about a chart. Describe the main features and compare them. The AI examiner marks it against the official criteria.':
    'Один отчёт Writing Task 1 по диаграмме. Опишите главное и сравните данные. ИИ-экзаменатор оценит его по официальным критериям.',
  'At least {n} words': 'Не меньше {n} слов',
  'The exam gives 20 minutes for Task 1. Here you have {n}, so aim for a complete short report rather than a perfect one.':
    'На экзамене на Task 1 даётся 20 минут. Здесь у вас {n}, поэтому стремитесь к законченному короткому отчёту, а не к идеальному.',
  'Start Writing': 'Начать Writing',
  'Writing cannot be marked on this site right now, so this part is left out and shown as not yet assessed. Nothing is lost: your plan will ask for a short Writing sample later.':
    'Сейчас на этом сайте нельзя оценить Writing, поэтому эта часть пропускается и отмечается как пока не оценённая. Ничего не теряется: позже план попросит короткую пробу Writing.',
  'Continue to Speaking': 'Перейти к Speaking',
  'Marking your writing': 'Оцениваем ваш текст',
  'This usually takes about a minute. Please keep this page open.': 'Обычно это занимает около минуты. Не закрывайте страницу.',
  'Your writing could not be marked just now. It is kept on this device. You can try once more, or carry on and leave Writing as not yet assessed.':
    'Сейчас не удалось оценить ваш текст. Он сохранён на этом устройстве. Можно попробовать ещё раз или продолжить, оставив Writing пока не оценённым.',
  'Continue without marking': 'Продолжить без оценки',
  'Hand in my writing': 'Сдать текст',
  'A short Part 1 interview with the AI examiner: everyday questions about one familiar topic. Answer out loud, and say a little more than yes or no.':
    'Короткое интервью Part 1 с ИИ-экзаменатором: бытовые вопросы на одну знакомую тему. Отвечайте вслух и говорите чуть больше, чем просто да или нет.',
  'About {n} min': 'Около {n} мин',
  'Microphone needed': 'Нужен микрофон',
  'The examiner marks your answers from the recording itself. The recording is not kept.':
    'Экзаменатор оценивает ответы по самой записи. Запись не сохраняется.',
  'Start Speaking': 'Начать Speaking',
  'Skip Speaking': 'Пропустить Speaking',
  'Speaking cannot be assessed on this site right now, so this part is left out and shown as not yet assessed. Nothing is lost: your plan will ask for a short Speaking sample later.':
    'Сейчас на этом сайте нельзя оценить Speaking, поэтому эта часть пропускается и отмечается как пока не оценённая. Ничего не теряется: позже план попросит короткую пробу Speaking.',

  /* The test player's score card, inside the placement */
  'One part of your placement test. The next part is ready when you are.':
    'Это одна часть вступительного теста. Следующая часть ждёт, когда вы будете готовы.',

  /* Results */
  'Your starting point': 'Ваша отправная точка',
  'An estimate from one sitting of about 40 minutes, not a band score. It tells your plan where to start, and your everyday work will sharpen it.':
    'Это примерная оценка по одному заходу около 40 минут, а не балл. Она подсказывает плану, с чего начать, а ежедневная работа сделает её точнее.',
  /* PlacementResults.tsx, ctx "placement-level" (the password hint's own
     "Weak"/"Strong" are different words in Russian). */
  'placement-levelWeak': 'Слабо',
  'placement-levelDeveloping': 'В процессе',
  'placement-levelStrong': 'Сильно',
  Assessed: 'Оценено',
  '{raw} of {total} right in this sitting.': 'В этом заходе верно {raw} из {total}.',
  'Below the pass line: {types}.': 'Ниже проходной границы: {types}.',
  'Every question type came in at or above the pass line.': 'Все типы вопросов на проходной границе или выше.',
  'Marked at band {band} on this one piece of work, against the {target} you need.':
    'За эту одну работу оценка {band}, а вам нужно {target}.',
  'Marked at band {band} on this one piece of work. Set a target band to see how far that is from it.':
    'За эту одну работу оценка {band}. Укажите целевой балл, чтобы увидеть, насколько это далеко от цели.',
  'This could not be marked on this site at the time. Your plan will ask for a short sample of it later.':
    'Тогда на этом сайте это нельзя было оценить. Позже план попросит короткую пробу.',
  'This could not be finished or marked this time. Your plan will ask for a short sample of it later.':
    'В этот раз это не удалось завершить или оценить. Позже план попросит короткую пробу.',
  'You left this part out. Your plan will ask for a short sample of it later.':
    'Вы пропустили эту часть. Позже план попросит короткую пробу.',
  'Nothing was answered, so there was nothing to mark. Your plan will ask for a short sample of it later.':
    'Ответов не было, поэтому оценивать было нечего. Позже план попросит короткую пробу.',
  'There is no result for this part yet. Your plan will ask for a short sample of it later.':
    'По этой части пока нет результата. Позже план попросит короткую пробу.',
  'What your plan does next': 'Что план сделает дальше',
  'Your plan is ready on Today.': 'Ваш план готов на странице «Сегодня».',

  /* Today card and settings link */
  'Your placement results': 'Результаты вступительного теста',
  'Take the {n}-minute placement test': 'Пройти вступительный тест на {n} минут',
  'What your one sitting found in each paper, and what your plan did with it.':
    'Что показал ваш заход по каждой части экзамена и как план это учёл.',
  'One sitting, taken once, so your plan starts from real evidence about all four papers instead of guessing.':
    'Один заход, один раз, чтобы план начинал с реальных данных по всем четырём частям, а не с догадок.',
  'One sitting, taken once, so your plan starts from real evidence about all four papers instead of guessing. The result is an estimate, not a band score.':
    'Один заход, один раз, чтобы план начинал с реальных данных по всем четырём частям, а не с догадок. Результат будет примерной оценкой, а не баллом.',
  'Carry on with the placement test': 'Продолжить вступительный тест',
  'Take the placement test': 'Пройти вступительный тест',
  'Your placement test is waiting': 'Ваш вступительный тест ждёт',
  'Sign in first: the placement test saves its results to your account and uses the AI examiner.':
    'Сначала войдите: вступительный тест сохраняет результаты в аккаунте и использует ИИ-экзаменатора.',
  'Carry on where you stopped. Your plan uses the result to decide where to start.':
    'Продолжите с того места, где остановились. План использует результат, чтобы решить, с чего начать.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
