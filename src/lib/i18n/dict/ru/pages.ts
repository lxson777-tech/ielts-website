/* Russian: page-level copy that belongs to no other batch.
   Batch owner: the pages agent. Nobody else edits this file.

   Covers: headings, intros and empty states written directly in the .astro
   files under src/pages (including the blog and styleguide shells), plus the
   marketing chrome in src/components/Nav.astro and src/components/Footer.astro.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* Marketing chrome (src/components/Nav.astro, src/components/Footer.astro). */
  Learn: 'Учиться',
  Practice: 'Практика',
  Tests: 'Тесты',
  'AI Tutor': 'ИИ-репетитор',
  'My workspace': 'Моя рабочая область',
  'Main navigation': 'Основная навигация',
  'Study areas': 'Направления обучения',
  'IELTS is EZ home': 'IELTS is EZ, на главную',
  'Open menu': 'Открыть меню',
  'Close menu': 'Закрыть меню',
  'Study plan': 'Учебный план',
  Lessons: 'Уроки',
  Vocabulary: 'Словарь',
  'Skill trainers': 'Тренажёры навыков',
  'AI speaking': 'Устная часть с ИИ',
  'Clear IELTS preparation that helps you know what to study next.':
    'Понятная подготовка к IELTS: всегда ясно, что учить дальше.',
  'Your space': 'Ваше пространство',
  'Open workspace': 'Открыть рабочую область',
  'Made for focused learners.': 'Создано для тех, кто настроен на результат.',

  /* src/components/Card.astro. */
  Open: 'Открыть',

  /* src/components/home/GameStudent.astro, EzStudent.astro (decorative,
     accessible labels only; neither component is used anywhere yet). */
  'IELTS student': 'Студент, готовящийся к IELTS',
  'A determined student running with a backpack': 'Целеустремлённый студент бежит с рюкзаком',

  /* src/pages/reset-password.astro */
  'Reset your password': 'Сброс пароля',

  /* src/pages/plan-settings.astro */
  'Your study plan': 'Ваш учебный план',
  'Set your target, exam date and study time. Your completed lessons stay saved.':
    'Укажите цель, дату экзамена и время на учёбу. Пройденные уроки сохраняются.',

  /* src/pages/speaking/cue-cards.astro */
  'Cue Card Bank': 'Банк карточек заданий',

  /* src/pages/start.astro */
  'Start Here': 'Начните здесь',
  'The IELTS course': 'Курс IELTS',
  "Every lesson on the site, in an order that builds. Tell us your target band and test date, and we'll set your pace and keep a Continue button on the next lesson you haven't finished.":
    'Все уроки сайта в порядке, который выстраивается шаг за шагом. Укажите целевой балл и дату экзамена: мы зададим темп и оставим кнопку "Продолжить" на следующем незавершённом уроке.',

  /* src/pages/report.astro */
  'Your progress, one page.': 'Ваш прогресс на одной странице.',

  /* src/pages/writing/models.astro */
  'Essay Model Answers': 'Образцы эссе',
  "A Band 8 answer for every one of the 60 real exam tasks in the trainer. Each one comes with examiner notes on all four criteria, saying what earns the band and what still holds it below Band 9, and phrases you can hover or tap to see why they work.":
    'Ответ на балл 8 для каждого из 60 реальных заданий тренажёра. К каждому прилагаются заметки экзаменатора по всем четырём критериям: что даёт этот балл, что пока не пускает выше, и фразы, на которые можно навести курсор или нажать, чтобы понять, почему они работают.',

  /* src/pages/learn/bands.astro */
  Bands: 'Баллы',
  'Pick a paper, a criterion, and the band you are at now. Each step is the official band descriptor put into plain words, with what to do, what to stop doing, and one thing to practise today.':
    'Выберите модуль, критерий и балл, на котором вы сейчас находитесь. Каждый шаг: официальное описание балла простыми словами, что делать, что перестать делать, и одно упражнение на сегодня.',

  /* src/pages/speaking/examiner.astro */
  'Live AI Examiner': 'Устный экзамен с ИИ вживую',
  'A full three-part mock speaking test as a real conversation: the examiner speaks, listens, and asks follow-up questions based on what you actually say.':
    'Полный пробный устный экзамен из трёх частей в формате настоящего разговора: экзаменатор говорит, слушает и задаёт уточняющие вопросы по вашим ответам.',
  'Cue-card bank (for study, not a test)': 'Банк карточек заданий (для подготовки, не тест)',
  'Read 24 Part 2 cue cards with model answers, to prepare before you speak':
    'Изучите 24 карточки Part 2 с образцами ответов перед устной частью',

  /* src/pages/trainers/speaking.astro, trainers/writing.astro, writing/checker.astro
     (the shared "score history" / "past essays" section heading). */
  'Speaking Trainer': 'Тренажёр устной части',
  'Pick a part and talk to the AI examiner in a real voice conversation. She asks the questions out loud, follows up on your answers, and grades you on the four official IELTS Speaking criteria, while a coach panel keeps structures, phrases and topic vocabulary at hand.':
    'Выберите часть и поговорите с ИИ-экзаменатором вживую. Она задаёт вопросы голосом, уточняет ваши ответы и оценивает по четырём официальным критериям IELTS Speaking, а рядом всегда под рукой панель с конструкциями, фразами и лексикой по теме.',
  'Pick a part. Record your answers with your microphone and an AI examiner grades you on the four official IELTS Speaking criteria, while a coach panel keeps structures, phrases and topic vocabulary at hand.':
    'Выберите часть. Запишите ответы на микрофон, и ИИ-экзаменатор оценит их по четырём официальным критериям IELTS Speaking, а рядом всегда под рукой панель с конструкциями, фразами и лексикой по теме.',
  'Your score history': 'История ваших баллов',
  'Attempts are stored in your browser, no account needed.': 'Попытки сохраняются в браузере, аккаунт не нужен.',

  /* src/pages/writing/checker.astro */
  'Writing Checker': 'Проверка эссе',
  'Exam conditions: you get a task and a clock, nothing else. Write your answer and an AI examiner grades it against the four official IELTS Writing criteria. Want structures, phrases and vocabulary while you write? Use the Writing Trainer instead.':
    'Экзаменационные условия: задание и таймер, больше ничего. Напишите ответ, и ИИ-экзаменатор оценит его по четырём официальным критериям IELTS Writing. Нужны конструкции, фразы и лексика во время письма? Используйте Тренажёр письма.',
  'Still learning the format? Practice with the coached Writing Trainer':
    'Всё ещё осваиваете формат? Потренируйтесь с подсказками в Тренажёре письма',
  'Your past essays': 'Ваши прошлые эссе',
  'Saved on this device, no account needed.': 'Сохранено на этом устройстве, аккаунт не нужен.',

  /* src/pages/trainers/writing.astro */
  'Writing Trainer': 'Тренажёр письма',
  'Press start to get an exam-style task, a different one every time. A coach panel with the paragraph plan, useful phrases and topic vocabulary stays beside you while you write, then you get instant feedback on the four IELTS criteria.':
    'Нажмите "Начать", чтобы получить экзаменационное задание, каждый раз новое. Пока вы пишете, рядом остаётся панель с планом абзацев, полезными фразами и лексикой по теме, а в конце вы получаете мгновенный разбор по четырём критериям IELTS.',
  'Ready to write without help? Take it under exam conditions in the Writing Checker':
    'Готовы писать без подсказок? Пройдите в экзаменационных условиях в Проверке эссе',
  'A Band 8 answer for every task here, with examiner notes on all four criteria.':
    'Ответ на балл 8 для каждого задания здесь, с заметками экзаменатора по всем четырём критериям.',

  /* src/pages/lessons/reading-task1.astro */
  'Practice Tests': 'Пробные тесты',
  'Take a Timed Test': 'Пройти тест с таймером',
  'Ready to put it together? Every attempt is a real exam: 3 passages, 40 questions, 60 minutes, with instant scoring and an estimated band, and you get a different test each time. Once you start, the clock can’t be paused.':
    'Готовы собрать всё вместе? Каждая попытка это настоящий экзамен: 3 текста, 40 вопросов, 60 минут, мгновенная проверка и примерный балл, и каждый раз новый тест. После старта таймер остановить нельзя.',
  'Take a Reading Test': 'Пройти тест по Reading',
  'Start a test': 'Начать тест',
  'Stopwatch at 60:00 beside a reading test booklet': 'Секундомер на отметке 60:00 рядом с буклетом теста по Reading',
  'Your score history lives on the': 'История ваших баллов хранится на',
  'practice tests page': 'странице пробных тестов',

  /* src/pages/lessons/{speaking,vocabulary,writing,listening,reading}/[part].astro
     (the shared prev/next lesson footer nav). "Speaking", "Writing", "Reading"
     and "Listening" section labels are left untranslated on purpose: they are
     the protected paper names. */
  Previous: 'Назад',
  Next: 'Далее',
  'All Three Parts': 'Все три части',
  'Vocabulary section': 'Раздел словаря',
  'All Topics & Quiz': 'Все темы и тест',
  'Writing section': 'Раздел Writing',
  'All Question Types': 'Все типы заданий',
  'Speaking section': 'Раздел Speaking',
  'Listening section': 'Раздел Listening',
  'Reading section': 'Раздел Reading',
  'Practice with real test questions': 'Практика на реальных вопросах теста',
  'The recording and questions below come from a real IELTS Listening test.':
    'Запись и вопросы ниже взяты из настоящего теста IELTS Listening.',
  'All Listening Lessons': 'Все уроки Listening',
  'The passage and questions below come from a real IELTS Academic Reading test.':
    'Текст и вопросы ниже взяты из настоящего теста IELTS Academic Reading.',

  /* src/pages/account.astro */
  'My account': 'Мой аккаунт',
  'Account & progress': 'Аккаунт и прогресс',
  'Every skill and every attempt in one place, so you can see what is improving and what to practise next.':
    'Все навыки и все попытки в одном месте: видно, что улучшается и что тренировать дальше.',
  Saved: 'Сохранённое',
  'Saved lessons & questions': 'Сохранённые уроки и вопросы',
  'Everything you have bookmarked while studying, plus your lesson notes.':
    'Всё, что вы сохранили во время учёбы, и заметки к урокам.',
  'Your weak spots': 'Ваши слабые места',
  'Accuracy by question type across every attempt. Drill the red ones first.':
    'Точность по типам заданий за все попытки. Сначала тренируйте отмеченные красным.',
  'Score history': 'История баллов',
  'Accuracy by question type across every listening test.':
    'Точность по типам заданий за все тесты Listening.',
  "Every essay you've submitted to the AI examiner.": 'Все эссе, отправленные ИИ-экзаменатору.',
  "Every part you've practiced with the AI examiner.": 'Все части, отработанные с ИИ-экзаменатором.',

  /* src/pages/trainers/index.astro */
  'Practice, at your pace.': 'Практика в вашем темпе.',
  'Build one skill at a time, with a coach beside you.': 'Развивайте один навык за раз, а рядом всегда коуч.',
  'Guided practice': 'Практика с подсказками',
  'Start a drill': 'Начать тренировку',
  'Start a part': 'Начать часть',
  'Start writing': 'Начать писать',
  'Looking for a full timed exam instead?': 'Ищете полный экзамен с таймером?',
  'One timed passage at a time, with a live "how to approach it" strategy panel and trap warnings for every question type.':
    'Один текст с таймером за раз, с панелью стратегии "как подойти к заданию" и предупреждениями о ловушках для каждого типа вопросов.',
  'One part of the recording at a time, with a live "how to approach it" strategy panel, full pause/seek/replay control while you practise, unlike the bare-conditions full test.':
    'Одна часть записи за раз, с панелью стратегии "как подойти к заданию" и полным контролем паузы, перемотки и повтора во время практики, в отличие от условий полного теста.',
  'Practice Part 1, 2 or 3 on its own, with a live coach panel: the answer structure (A.R.E. / PEEL / OREO), useful phrases, topic vocabulary and idea hints when you get stuck.':
    'Практикуйте Part 1, 2 или 3 отдельно, с панелью коуча: структура ответа (A.R.E. / PEEL / OREO), полезные фразы, лексика по теме и подсказки идей, если вы застряли.',
  'Write against a rotating prompt with a live coach panel: the paragraph plan for that exact question type, useful phrases and topic vocabulary, then get instant AI feedback.':
    'Пишите по случайному заданию с панелью коуча: план абзацев именно для этого типа вопроса, полезные фразы и лексика по теме, а затем получите мгновенный отклик от ИИ.',
  /* The rendered card swaps "instant AI feedback" for "AI feedback" at
     render time (see the .replace() in trainers/index.astro); this extra
     entry matches what data-i18n actually reads off that card. */
  'Write against a rotating prompt with a live coach panel: the paragraph plan for that exact question type, useful phrases and topic vocabulary, then get AI feedback.':
    'Пишите по случайному заданию с панелью коуча: план абзацев именно для этого типа вопроса, полезные фразы и лексика по теме, а затем получите отклик от ИИ.',

  /* src/pages/trainers/reading/index.astro, trainers/listening/index.astro */
  'All trainers': 'Все тренажёры',
  'Reading Trainer': 'Тренажёр чтения',
  'Listening Trainer': 'Тренажёр аудирования',
  "One passage, one realistic time budget, instant scoring, and a live 'how to approach it' strategy panel for every question type, the same review and evidence features as a full test, without committing 60 minutes. These attempts don't count toward your full-test band history.":
    'Один текст, реалистичное время, мгновенная проверка и панель стратегии "как подойти к заданию" для каждого типа вопросов: те же разбор и доказательства, что и в полном тесте, но без 60 минут. Эти попытки не учитываются в истории баллов по полным тестам.',
  "One part, a realistic time budget, instant scoring, and a live 'how to approach it' strategy panel for every question type. You can pause, seek and replay the recording as you practise, the same review and transcript features as a full test, without committing 40 minutes. These attempts don't count toward your full-test band history.":
    'Одна часть, реалистичное время, мгновенная проверка и панель стратегии "как подойти к заданию" для каждого типа вопросов. Во время практики можно ставить на паузу, перематывать и переслушивать запись: те же разбор и транскрипт, что и в полном тесте, но без 40 минут. Эти попытки не учитываются в истории баллов по полным тестам.',
  'Drills with': 'Тренировки на',
  'matching drills': 'подходящих заданий',
  'Show all drills': 'Показать все тренировки',
  'No drill happens to isolate this question type on its own yet — try a full reading test instead.':
    'Отдельного задания только на этот тип вопросов пока нет: попробуйте пройти полный тест по Reading.',
  'No drill happens to isolate this question type on its own yet — try a full listening test instead.':
    'Отдельного задания только на этот тип вопросов пока нет: попробуйте пройти полный тест по Listening.',

  /* src/pages/tests/index.astro */
  'Put your skills to the test.': 'Проверьте свои навыки.',
  'Full timed tests, exactly like the real exam: no hints, no coaching, just the question and the clock. You get a band estimate and a full answer review afterwards. Results stay on this device so you can see your progress over time.':
    'Полные тесты с таймером, точно как настоящий экзамен: без подсказок, без коучинга, только задание и время. В конце вы получаете примерный балл и полный разбор ответов. Результаты хранятся на этом устройстве, чтобы вы видели прогресс со временем.',
  'Full Reading Test': 'Полный тест по Reading',
  'Once you begin, the clock cannot be paused.': 'После начала таймер остановить нельзя.',
  'Only have 20 minutes? Try the Reading Trainer': 'Есть только 20 минут? Попробуйте Тренажёр чтения',
  'Full Listening Test': 'Полный тест по Listening',
  'Hear the complete recording once, answer all four parts, then get your score and estimated band instantly.':
    'Прослушайте запись один раз, ответьте на все четыре части и сразу получите балл и примерную оценку.',
  'Start a listening test': 'Начать тест по Listening',
  'Use headphones. The recording cannot be replayed.': 'Используйте наушники. Запись повторно не проигрывается.',
  'Learn the four Listening parts first': 'Сначала изучите четыре части Listening',
  'Exam conditions': 'Экзаменационные условия',
  'Write a Task 1 or Task 2 answer under exam conditions, then get AI-graded feedback plus a mechanics check on length, vocabulary, cohesion and spelling.':
    'Напишите ответ на Task 1 или Task 2 в экзаменационных условиях и получите оценку от ИИ, а также проверку объёма, лексики, связности и орфографии.',
  'AI feedback': 'Отклик от ИИ',
  'A different prompt every attempt. No coaching aids.': 'Каждый раз новое задание. Без подсказок.',
  'Want structures and phrases while you write? Try the Writing Trainer':
    'Нужны конструкции и фразы во время письма? Попробуйте Тренажёр письма',
  'A full three-part mock speaking test as a real voice conversation: the examiner speaks, listens, and asks follow-ups based on what you actually say.':
    'Полный пробный устный экзамен из трёх частей в формате настоящего голосового разговора: экзаменатор говорит, слушает и задаёт уточняющие вопросы по вашим ответам.',
  '3 parts': '3 части',
  'Real-time voice': 'Голос в реальном времени',
  'Start the interview': 'Начать интервью',
  'Microphone access required.': 'Нужен доступ к микрофону.',
  'Want to practice one part at a time instead?': 'Хотите практиковать по одной части за раз?',
  'Mock Exam Day': 'День пробного экзамена',
  'One chained sitting: Listening, then Reading, then Writing, then Speaking, no breaks, just like the real test day.':
    'Один сплошной сеанс: сначала Listening, затем Reading, потом Writing и Speaking, без перерывов, как в настоящий день экзамена.',
  'Start Mock Exam Day': 'Начать День пробного экзамена',
  'Browse the bank': 'Банк тестов',
  'Every full exam': 'Все полные экзамены',
  'Accuracy by question type across every attempt on this device. Drill the red ones first.':
    'Точность по типам заданий за все попытки на этом устройстве. Сначала тренируйте отмеченные красным.',
  'Resume your test: {min} min left': 'Продолжить тест: осталось {min} мин',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
