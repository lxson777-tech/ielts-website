/* Russian: the practice tests hub, the test player and the mock exam.
   Batch owner: the tests agent. Nobody else edits this file.

   Covers: src/components/TestPlayer.tsx, src/components/ScoreHistory.tsx,
   src/components/TypeAnalytics.tsx, src/components/TestDebrief.tsx,
   src/components/mock/*, src/pages/tests/*.

   Exam CONTENT (passages, transcripts, questions, answer options) is never
   translated, and src/data/tests/ is off limits to this batch.

   The paper names (Reading, Listening, Writing, Speaking), Task 1 / Task 2,
   Part 1 / Part 2 / Part 3 and the official question type names stay in
   English inside Russian sentences on purpose: the student has to recognise
   those exact words on the real paper.

   "Tests" and "Sign in" are used by the test player too but live in
   dict/ru/shell.ts, which owns them; they are deliberately not repeated here.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* ---------------------------------------------------------------- */
  /* The test player: chrome, timer, navigation                        */
  /* ---------------------------------------------------------------- */
  'Choose passage': 'Выбрать отрывок',
  'Questions {from}-{to}': 'Вопросы {from}-{to}',
  Questions: 'Вопросы',
  'Time remaining': 'Осталось времени',
  /* "Review" with a context: the study plan owns the plain key for revising a
     lesson, this one is the button that jumps to the question list.  is
     the context separator from src/lib/i18n/translate.ts. */
  'test playerReview': 'Проверить',
  Score: 'Результат',
  Submit: 'Отправить',
  'Go back': 'Вернуться',
  Dismiss: 'Скрыть',
  'Resize panes': 'Изменить ширину панелей',
  'Continue to {part}': 'Перейти к {part}',
  'This is the last passage. Check your answers, then submit using the Submit button above.':
    'Это последний отрывок. Проверьте ответы и отправьте работу кнопкой «Отправить» выше.',
  'Do the passages in any order. Your answers are kept when you switch.':
    'Отрывки можно проходить в любом порядке. Ответы сохраняются при переключении.',
  'Tip: press {keys} or the arrow keys to move between questions.':
    'Совет: нажимайте {keys} или стрелки, чтобы переходить между вопросами.',
  'You fixed {fixed} of {total}.': 'Исправлено: {fixed} из {total}.',

  /* The two panes, on a phone one at a time. */
  Passage: 'Отрывок',
  'Question paper': 'Лист заданий',
  'Answer sheet': 'Бланк ответов',
  '{label}. Follow the recording and read each task carefully.':
    '{label}. Следите за записью и внимательно читайте каждое задание.',
  '{label}. Enter answers for {range}.': '{label}. Впишите ответы на {range}.',
  'The question paper for this section is unavailable.': 'Лист заданий для этой части недоступен.',
  'Review transcript': 'Посмотреть расшифровку',

  /* The numbered circles along the bottom. */
  'Jump to question {n}, {status}': 'Перейти к вопросу {n}, {status}',
  'Jump to question {n}, {status}, flagged for review':
    'Перейти к вопросу {n}, {status}, отмечен для проверки',
  'unavailable and excluded from score': 'недоступен, не учитывается в баллах',
  answered: 'есть ответ',
  unanswered: 'без ответа',

  /* ---------------------------------------------------------------- */
  /* Answering: inputs, flags, bookmarks                               */
  /* ---------------------------------------------------------------- */
  'Question {n}': 'Вопрос {n}',
  'Label…': 'Подпись…',
  '(blank)': '(пусто)',
  'Selected {chosen} of {total}': 'Выбрано {chosen} из {total}',
  '{chosen}/{total} selected': 'выбрано {chosen}/{total}',
  'Flag for review': 'Отметить для проверки',
  'Unflag for review': 'Снять отметку',
  'Flag question {n} for review': 'Отметить вопрос {n} для проверки',
  'Unflag question {n} for review': 'Снять отметку с вопроса {n}',
  'Bookmark this question': 'Сохранить вопрос',
  'Remove bookmark': 'Убрать из сохранённого',
  'This question is missing from the published source and is excluded from your score.':
    'Этого вопроса нет в опубликованном источнике, он не учитывается в баллах.',

  /* Highlighting the passage, like the real computer-delivered test. */
  Highlight: 'Выделить',
  'Clear highlights': 'Убрать выделение',

  /* ---------------------------------------------------------------- */
  /* The listening recording                                           */
  /* ---------------------------------------------------------------- */
  'Listening recording': 'Запись Listening',
  'Drill recording': 'Запись тренировки',
  'Full recording': 'Полная запись',
  'Pause and replay freely': 'Можно ставить на паузу и переслушивать',
  'Plays once, exam conditions': 'Звучит один раз, условия экзамена',
  'Start recording': 'Включить запись',
  'Recording playing': 'Запись идёт',
  'Recording finished': 'Запись закончилась',
  'Recording ready': 'Запись готова',
  'Loading recording...': 'Загружаем запись...',
  'Recording unavailable.': 'Запись недоступна.',
  Retry: 'Повторить',
  'This drill covers Part {part} of the recording ({from} to {to}).':
    'Эта тренировка охватывает Part {part} записи (с {from} до {to}).',
  'This drill covers one part of the recording ({from} to {to}).':
    'Эта тренировка охватывает одну часть записи (с {from} до {to}).',

  /* ---------------------------------------------------------------- */
  /* The score modal and the review screen                             */
  /* ---------------------------------------------------------------- */
  'Your Score': 'Ваш результат',
  '{percent}% correct': '{percent}% верно',
  'Estimated Band: {band}': 'Примерный балл: {band}',
  'below 2.5': 'ниже 2.5',
  'Your weakest type in this test: {type}, {correct} of {total} correct.':
    'Самый слабый тип в этом тесте: {type}, верно {correct} из {total}.',
  'Review the lesson': 'Повторить урок',
  'Practise this type': 'Потренировать этот тип',
  'Review Answers': 'Разобрать ответы',
  'Back to results': 'К результатам',
  'More Tests': 'Другие тесты',
  'Show:': 'Показать:',
  All: 'Все',
  'Wrong only': 'Только ошибки',

  /* The per-answer note. The reasons themselves ("the hyphen" and friends)
     are marked with nt() in src/lib/tests/schema.ts and joined with " and ". */
  'Correct answer:': 'Правильный ответ:',
  'Marked right, but write it exactly as {expected} in the real test. We let {forgiven} through here.':
    'Засчитано, но в настоящем тесте пишите точно так: {expected}. Здесь мы простили {forgiven}.',
  'The key accepts {variants}. In the test write one answer only, never both with a slash or brackets.':
    'Ключ принимает {variants}. В тесте пишите только один вариант, не оба через слэш или в скобках.',
  ' and ': ' и ',
  ' or ': ' или ',
  'the currency symbol': 'знак валюты',
  'the comma inside the number': 'запятую внутри числа',
  'writing percent out in words instead of using the % sign': 'слово «процент» вместо знака %',
  'the hyphen': 'дефис',
  'the quotation marks': 'кавычки',
  'the punctuation you added': 'добавленную вами пунктуацию',
  'Show in passage': 'Показать в тексте',
  'Show in transcript': 'Показать в расшифровке',

  /* ---------------------------------------------------------------- */
  /* The instructions gate, before the clock starts                    */
  /* ---------------------------------------------------------------- */
  'Listening Practice Test': 'Пробный тест Listening',
  'Reading Test': 'Тест Reading',
  'The timer starts as soon as you begin and runs continuously.':
    'Таймер запускается сразу и идёт без остановки.',
  'You cannot pause.': 'Паузы нет.',
  'Refreshing or closing the tab will not stop the clock. You will resume with time already elapsed.':
    'Обновление или закрытие вкладки не остановит часы. Вы вернётесь с уже потраченным временем.',
  'This is a single-part drill. You can play, pause, seek and replay the recording as many times as you like while you practise.':
    'Это тренировка по одной части. Запись можно включать, ставить на паузу, перематывать и переслушивать сколько угодно.',
  'This is exam conditions: press Start recording when ready and it plays once, from the beginning, with no pausing, seeking or replaying. Refreshing keeps your answers and running timer, but restarts the recording from the beginning.':
    'Это условия экзамена: нажмите «Включить запись», когда будете готовы, и она прозвучит один раз с самого начала, без пауз, перемотки и повторов. Обновление страницы сохранит ваши ответы и таймер, но запись начнётся заново.',
  'Select any text in a passage to highlight it, just like the real computer test. Click a highlight to remove it.':
    'Выделите любой текст в отрывке, чтобы подсветить его, как в настоящем компьютерном тесте. Нажмите на подсветку, чтобы убрать её.',
  'Not sure about an answer? Flag it and jump back later using the numbered circles at the bottom.':
    'Не уверены в ответе? Отметьте его и вернитесь позже по нумерованным кружкам внизу.',
  'At the end you get a score, an estimated band, and a full answer review, including the transcript.':
    'В конце вы получите результат, примерный балл и полный разбор ответов вместе с расшифровкой записи.',
  'At the end you get a score, an estimated band, and a full answer review, with every question explained with the exact line from the passage.':
    'В конце вы получите результат, примерный балл и полный разбор ответов, где каждый вопрос объяснён точной строкой из текста.',
  Back: 'Назад',
  'Start test': 'Начать тест',

  /* The account on this browser changed while a paper was open (a sign-out
     here, or a sign-in in another tab). The sitting stops and is kept for
     the student who started it. See SittingOwnerChangedScreen in
     src/components/TestPlayer.tsx. */
  'Test paused': 'Тест приостановлен',
  'This test belongs to another student': 'Этот тест принадлежит другому студенту',
  'You signed out during this test': 'Вы вышли из аккаунта во время теста',
  'A different account is signed in on this browser now, so this test was not submitted. The answers are saved for the student who started it, and they can carry on from here when they sign back in.':
    'Сейчас в этом браузере выполнен вход в другой аккаунт, поэтому тест не был отправлен. Ответы сохранены для того студента, который его начал, и он сможет продолжить с этого места, когда снова войдёт в аккаунт.',
  'You are signed out now, so this test was not submitted. The answers are saved for the account that started it, and you can carry on from here when you sign back in.':
    'Сейчас вы не в аккаунте, поэтому тест не был отправлен. Ответы сохранены для того аккаунта, в котором вы его начали, и вы сможете продолжить с этого места, когда снова войдёте.',
  'Start this test fresh': 'Начать этот тест заново',
  /* The sitting on screen is over in this tab for good (R2D-02): a newer
     one was started in another tab, or this one was handed in (or added to
     an account) there. SittingStoppedScreen in src/components/TestPlayer.tsx. */
  'A newer test was started in another tab, so this one is no longer being saved.':
    'В другой вкладке начат более новый тест, поэтому этот больше не сохраняется.',
  'This test was submitted or closed in another tab, so this one is no longer being saved.':
    'Этот тест был отправлен или закрыт в другой вкладке, поэтому здесь он больше не сохраняется.',

  /* ---------------------------------------------------------------- */
  /* Mock Exam Day: the start screen                                   */
  /* ---------------------------------------------------------------- */
  'No practice tests are available to build a mock exam right now.':
    'Сейчас нет пробных тестов, из которых можно собрать пробный экзамен.',
  'Mock Exam Day': 'День пробного экзамена',
  'A full IELTS sitting, back to back': 'Полный IELTS подряд, без перерывов',
  'Listening, then Reading, then Writing, then Speaking, the same order and pace as the real test day, with no breaks in between. About 2 hours 45 minutes for the first three papers, plus 14 minutes for Speaking.':
    'Listening, потом Reading, потом Writing, потом Speaking: тот же порядок и темп, что и в настоящий день экзамена, без перерывов между ними. Около 2 часов 45 минут на первые три части и ещё 14 минут на Speaking.',
  '(about 30 minutes, plus time at the end to check your answers). The recording plays once, exam conditions.':
    '(около 30 минут плюс время в конце на проверку ответов). Запись звучит один раз, условия экзамена.',
  '(60 minutes), straight after.': '(60 минут), сразу следом.',
  '(60 minutes): Task 1 and Task 2 share one clock, a suggested 20 minutes on Task 1 and 40 on Task 2, same as the real exam.':
    '(60 минут): у Task 1 и Task 2 одни часы, рекомендуется 20 минут на Task 1 и 40 на Task 2, как на настоящем экзамене.',
  '(about 14 minutes): a real-time voice conversation with the AI examiner, Part 1 interview, Part 2 long turn, Part 3 discussion. Needs a microphone, and an account if this site requires one for it. You can skip this stage.':
    '(около 14 минут): голосовой разговор с AI экзаменатором в реальном времени, Part 1 интервью, Part 2 монолог, Part 3 обсуждение. Нужен микрофон, а также аккаунт, если он требуется на этом сайте. Этот этап можно пропустить.',
  "Listening, Reading and Speaking are graded automatically. Writing isn't graded during the mock, score it afterwards in the Writing Checker.":
    'Listening, Reading и Speaking проверяются автоматически. Writing во время пробного экзамена не оценивается, разберите его потом в Writing Checker.',
  'Choose your tests': 'Выберите тесты',
  'Listening Test {n}': 'Тест Listening {n}',
  'Reading Test {n}': 'Тест Reading {n}',
  "Defaulted to the next tests you haven't taken: {pair}.":
    'По умолчанию выбраны следующие непройденные тесты: {pair}.',
  'Start Mock Exam': 'Начать пробный экзамен',

  /* The same owner change, caught during a mock sitting (MockExam.tsx). */
  'Mock exam stopped': 'Пробный экзамен остановлен',
  'This mock exam belongs to another student': 'Этот пробный экзамен принадлежит другому студенту',
  'You signed out during this mock exam': 'Вы вышли из аккаунта во время пробного экзамена',
  'The account on this browser changed part way through, so nothing from this sitting was saved to it. Each paper that was already finished stays with the student who sat it.':
    'Аккаунт в этом браузере сменился посреди экзамена, поэтому ничего из этой попытки в него не сохранено. Каждая уже законченная часть остаётся у того студента, который её писал.',
  'Start a fresh mock exam': 'Начать новый пробный экзамен',
  'The sitting itself is kept for the student who started it, and it picks up where it stopped when they sign back in on this browser.':
    'Сама попытка сохранена для студента, который её начал, и продолжится с того же места, когда он снова войдёт в аккаунт в этом браузере.',
  /* The same student started a fresh mock in another tab, which replaces
     this one for good (MockExam.tsx, R2C-02). */
  'A newer mock exam was started in another tab, so this one is no longer being saved.':
    'В другой вкладке начат более новый пробный экзамен, поэтому этот больше не сохраняется.',
  /* The written-down sitting disappeared after this tab had seen it: it was
     finished, or added to an account, in another tab (MockExam.tsx, R2D-03). */
  'This mock exam was finished or closed in another tab, so this one is no longer being saved.':
    'Этот пробный экзамен был завершён или закрыт в другой вкладке, поэтому здесь он больше не сохраняется.',

  /* The student's own unfinished mock, offered back on the start screen
     (ResumeOffer in MockExam.tsx). {papers} and {paper} are paper names,
     which stay English. */
  'You have an unfinished mock exam': 'У вас есть незаконченный пробный экзамен',
  'Finished so far: {papers}.': 'Уже закончено: {papers}.',
  'No paper is finished yet.': 'Пока не закончена ни одна часть.',
  'It picks up at {paper}.': 'Продолжите с части {paper}.',
  'The Writing time has run out.': 'Время на Writing истекло.',
  'Less than a minute is left on the Writing clock.': 'На часах Writing осталось меньше минуты.',
  'Continue where you left off': 'Продолжить с того же места',
  'Starting a new mock exam below replaces this unfinished one. Papers you already finished stay in your history.':
    'Если начать новый пробный экзамен ниже, он заменит этот незаконченный. Уже законченные части останутся в вашей истории.',

  /* Between two papers. */
  'Exam continues': 'Экзамен продолжается',
  'Start now': 'Начать сейчас',
  'Reading Test {n} · {minutes} minutes': 'Тест Reading {n} · {minutes} мин',
  'Task 1 and Task 2 · 60 minutes total': 'Task 1 и Task 2 · 60 мин на оба',

  /* The writing leg. */
  'Mock Exam · Writing': 'Пробный экзамен · Writing',
  'Finish Writing': 'Завершить Writing',
  "Suggested timing: about {first} minutes on Task 1, then {second} minutes on Task 2. One clock for both, split it however suits you, then submit when you're done or when time runs out.":
    'Рекомендуемое время: около {first} минут на Task 1, затем {second} минут на Task 2. Часы одни на оба задания, распределите их как удобно, и отправьте работу, когда закончите или когда время выйдет.',
  'No {label} prompt is available right now.': 'Задания для {label} сейчас нет.',
  '{label} · ~{minutes} min': '{label} · ~{minutes} мин',
  '{label} answer': 'Ответ на {label}',
  'Task visual': 'Иллюстрация к заданию',
  /* Same wording as the writing trainer's box, which owns this key too. */
  'Write your answer here…': 'Напишите здесь свой ответ…',
  '{count} / {min}+ words': '{count} / {min}+ слов',

  /* The speaking leg. */
  'Part 4 of 4': 'Часть 4 из 4',
  'About 14 minutes with the AI examiner: Part 1 interview, Part 2 long turn, Part 3 discussion. You need a microphone and to be signed in.':
    'Около 14 минут с AI экзаменатором: Part 1 интервью, Part 2 монолог, Part 3 обсуждение. Нужен микрофон и вход в аккаунт.',
  'Sign in to take the speaking test (this keeps the paid voice service for real students).':
    'Войдите, чтобы пройти тест Speaking (так платный голосовой сервис остаётся для реальных студентов).',
  'The speaking test needs accounts to be enabled on this site.':
    'Для теста Speaking на сайте должны быть включены аккаунты.',
  "The speaking test isn't configured on this site yet.": 'Тест Speaking пока не настроен на этом сайте.',
  'Start speaking test': 'Начать тест Speaking',
  'Skip speaking': 'Пропустить Speaking',
  /* Back on the brief after the interview was stopped part way (the account
     on the browser changed, or the page went away), R2B-02. */
  'Your speaking test was interrupted before it finished, so it is not part of this mock yet. Start it again when you are ready, or skip it.':
    'Тест Speaking прервался, не дойдя до конца, поэтому в этот пробный экзамен он пока не вошёл. Начните его заново, когда будете готовы, или пропустите.',

  /* ---------------------------------------------------------------- */
  /* Mock Exam Day: the results                                        */
  /* ---------------------------------------------------------------- */
  'Mock Exam Day · Results': 'День пробного экзамена · Результаты',
  "You've finished the sitting": 'Вы прошли весь экзамен',
  'Listening, Reading and Speaking are scored automatically.':
    'Listening, Reading и Speaking проверяются автоматически.',
  'Listening and Reading are scored automatically.': 'Listening и Reading проверяются автоматически.',
  'Listening and Reading are scored automatically; you skipped Speaking.':
    'Listening и Reading проверяются автоматически, Speaking вы пропустили.',
  "Writing isn't auto-scored here, so get real feedback on your essays in the Writing Checker.":
    'Writing здесь автоматически не оценивается, поэтому получите настоящий разбор эссе в Writing Checker.',
  "Mean of {papers}, rounded to the nearest half band. Writing isn't included — it isn't graded during the mock.":
    'Среднее по {papers}, округлённое до ближайшего половинного балла. Writing не учитывается: во время пробного экзамена он не оценивается.',
  'Listening, Reading and Speaking': 'Listening, Reading и Speaking',
  'Listening and Reading': 'Listening и Reading',
  '{raw} / {total} correct': 'верно {raw} / {total}',
  'score it below': 'оцените ниже',
  'not scored here': 'здесь не оценивается',
  'live AI examiner': 'живой AI экзаменатор',
  Skipped: 'Пропущено',
  'not taken': 'не пройдено',
  'Your essays': 'Ваши эссе',
  '(left blank)': '(пусто)',
  'Get AI feedback on these essays': 'Получить разбор этих эссе от AI',
  "AI feedback isn't available on this build. Your essays are saved on this device either way.":
    'Разбор от AI недоступен в этой сборке. Ваши эссе всё равно сохранены на этом устройстве.',
  "You skipped Speaking, so it isn't in your overall band above. You can take a full Speaking test any time at":
    'Вы пропустили Speaking, поэтому его нет в общем балле выше. Пройти полный тест Speaking можно в любой момент здесь:',
  'the live AI examiner': 'живой AI экзаменатор',
  'Back to Tests': 'Назад к тестам',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  'You have {n} unanswered questions. Submit anyway?': {
    one: 'У вас {n} вопрос без ответа. Всё равно отправить?',
    few: 'У вас {n} вопроса без ответа. Всё равно отправить?',
    many: 'У вас {n} вопросов без ответа. Всё равно отправить?',
    other: 'У вас {n} вопроса без ответа. Всё равно отправить?',
  },
  'Retry the {n} you got wrong': {
    one: 'Повторить {n} ошибку',
    few: 'Повторить {n} ошибки',
    many: 'Повторить {n} ошибок',
    other: 'Повторить {n} ошибки',
  },
  '{n} minutes are left on the Writing clock.': {
    one: 'На часах Writing осталась {n} минута.',
    few: 'На часах Writing осталось {n} минуты.',
    many: 'На часах Writing осталось {n} минут.',
    other: 'На часах Writing осталось {n} минуты.',
  },
  '{n} words: limit is {limit}': {
    one: '{n} слово: лимит {limit}',
    few: '{n} слова: лимит {limit}',
    many: '{n} слов: лимит {limit}',
    other: '{n} слова: лимит {limit}',
  },

  /* The three figures on the instructions gate. These forms carry no {n}:
     the number is printed above them in its own element. */
  parts: { one: 'часть', few: 'части', many: 'частей', other: 'части' },
  passages: { one: 'отрывок', few: 'отрывка', many: 'отрывков', other: 'отрывка' },
  'numbered questions': {
    one: 'пронумерованный вопрос',
    few: 'пронумерованных вопроса',
    many: 'пронумерованных вопросов',
    other: 'пронумерованных вопроса',
  },
  minutes: { one: 'минута', few: 'минуты', many: 'минут', other: 'минуты' },

  'Answer all {scored} scored questions across {n} parts, then submit. It auto-submits when time runs out.': {
    one: 'Ответьте на все {scored} оцениваемых вопросов в {n} части, затем отправьте работу. Когда время выйдет, она отправится сама.',
    few: 'Ответьте на все {scored} оцениваемых вопросов в {n} частях, затем отправьте работу. Когда время выйдет, она отправится сама.',
    many: 'Ответьте на все {scored} оцениваемых вопросов в {n} частях, затем отправьте работу. Когда время выйдет, она отправится сама.',
    other: 'Ответьте на все {scored} оцениваемых вопросов в {n} частях, затем отправьте работу. Когда время выйдет, она отправится сама.',
  },
  'Answer all {scored} scored questions across {n} passages, then submit. It auto-submits when time runs out.': {
    one: 'Ответьте на все {scored} оцениваемых вопросов в {n} отрывке, затем отправьте работу. Когда время выйдет, она отправится сама.',
    few: 'Ответьте на все {scored} оцениваемых вопросов в {n} отрывках, затем отправьте работу. Когда время выйдет, она отправится сама.',
    many: 'Ответьте на все {scored} оцениваемых вопросов в {n} отрывках, затем отправьте работу. Когда время выйдет, она отправится сама.',
    other: 'Ответьте на все {scored} оцениваемых вопросов в {n} отрывках, затем отправьте работу. Когда время выйдет, она отправится сама.',
  },
  '{n} numbered questions are missing from the published source and are excluded from your score.': {
    one: '{n} пронумерованный вопрос отсутствует в опубликованном источнике и не учитывается в баллах.',
    few: '{n} пронумерованных вопроса отсутствуют в опубликованном источнике и не учитываются в баллах.',
    many: '{n} пронумерованных вопросов отсутствуют в опубликованном источнике и не учитываются в баллах.',
    other: '{n} пронумерованных вопроса отсутствуют в опубликованном источнике и не учитываются в баллах.',
  },

  '{paper} starts in {n} seconds': {
    one: '{paper} начнётся через {n} секунду',
    few: '{paper} начнётся через {n} секунды',
    many: '{paper} начнётся через {n} секунд',
    other: '{paper} начнётся через {n} секунды',
  },
  'Overall band · {n} papers': {
    one: 'Общий балл · {n} часть',
    few: 'Общий балл · {n} части',
    many: 'Общий балл · {n} частей',
    other: 'Общий балл · {n} части',
  },
  '{n} words · {status}': {
    one: '{n} слово · {status}',
    few: '{n} слова · {status}',
    many: '{n} слов · {status}',
    other: '{n} слова · {status}',
  },
  '{n} words': { one: '{n} слово', few: '{n} слова', many: '{n} слов', other: '{n} слова' },
};
