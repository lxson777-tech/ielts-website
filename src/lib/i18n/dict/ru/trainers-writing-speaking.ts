/* Russian: the writing and speaking trainers.
   Batch owner: the trainers agent. Nobody else edits this file.

   Covers: src/components/WritingTester.tsx, src/components/SpeakingTester.tsx,
   src/components/LiveExaminer.tsx, src/components/BandReport.tsx,
   src/components/WritingHistory.tsx, src/pages/trainers/*,
   src/pages/writing/*, src/pages/speaking/* interface copy.

   Essay prompts, cue cards and model answers stay in English.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* WritingTester.tsx: start screen */
  'Choose your writing practice': 'Выберите тренировку по письму',
  'Choose your writing task': 'Выберите задание по письму',
  'A different exam-style prompt each attempt, with AI feedback on all four criteria.':
    'Каждый раз новое задание в стиле экзамена, с разбором от ИИ по всем четырём критериям.',
  'A different exam-style prompt each attempt. Just you and the question, under exam conditions.':
    'Каждый раз новое задание в стиле экзамена. Только вы и вопрос, в экзаменационных условиях.',
  Report: 'Отчёт',
  Essay: 'Эссе',
  'Describe a chart, graph, table, process or map in your own words.':
    'Опишите своими словами диаграмму, график, таблицу, процесс или карту.',
  'Write a discursive essay responding to an opinion, discussion or problem prompt.':
    'Напишите эссе-рассуждение на предложенное мнение, тему для обсуждения или проблему.',
  '~{minutes} min': '~{minutes} мин',
  'Start {task}': 'Начать {task}',
  free: 'бесплатно',

  /* WritingTester.tsx: grading in progress */
  'Grading your essay…': 'Проверяем ваше эссе…',
  'Our AI examiner is reading your response against the official IELTS band descriptors.':
    'Наш ИИ-экзаменатор оценивает ваш ответ по официальным дескрипторам баллов IELTS.',

  /* WritingTester.tsx: feedback report */
  'The band scores below are illustrative, generated from mechanical signals only, without an AI examiner. Your teacher can enable AI grading.':
    'Баллы ниже приблизительные: они получены только по механическим признакам, без ИИ-экзаменатора. Ваш преподаватель может включить проверку ИИ.',
  'Compare with a Band 8 answer': 'Сравните с ответом на 8 баллов',
  'A model written for this same task, with the examiner notes behind every criterion.':
    'Образец, написанный на то же задание, с комментариями экзаменатора по каждому критерию.',
  'Mechanics check': 'Механика текста',
  Words: 'Слова',
  Sentences: 'Предложения',
  'Vocab variety': 'Разнообразие лексики',
  'Linking words': 'Слова-связки',
  'Moments from your essay': 'Моменты из вашего эссе',
  'Revise this essay': 'Доработать эссе',
  'Take another test': 'Пройти ещё один тест',
  'Your essay and its scores are saved.': 'Ваше эссе и баллы сохранены.',
  'Reread it any time in My progress': 'Перечитать его в любое время в разделе «Мои результаты»',

  /* WritingTester.tsx: editor */
  'Over the suggested time': 'Больше рекомендованного времени',
  'Time spent writing': 'Время, потраченное на письмо',
  'New task': 'Новое задание',
  'View larger: click the chart to open it full-size.': 'Увеличить: нажмите на диаграмму, чтобы открыть её на весь экран.',
  'Write your answer here…': 'Напишите здесь свой ответ…',
  "AI feedback is not available on this build ({envVar} is not set). You can still write and time yourself, but essays can't be graded here yet.":
    'ИИ-разбор недоступен в этой версии сайта (переменная {envVar} не задана). Вы можете писать и засекать время, но проверить эссе здесь пока нельзя.',
  'We could not reach the grading service. Your essay is safe on this page; try again in a minute.':
    'Не удалось связаться со службой проверки. Ваше эссе никуда не делось, попробуйте ещё раз через минуту.',
  '{count} / {min}+ words': '{count} / {min}+ слов',
  'Check my essay': 'Проверить эссе',
  'Chart, larger view': 'Диаграмма, увеличенный вид',
  Close: 'Закрыть',

  /* WritingCoachPanel.tsx (also reused by SpeakingCoachPanel.tsx tabs, and
     the shared 'Language' / 'Vocabulary' tab keys already live in shell.ts). */
  'This question': 'Этот вопрос',
  Structure: 'Структура',
  Avoid: 'Чего избегать',
  'Writing coach: {structure}': 'Помощник по письму: {structure}',
  'A plan for this question is coming.': 'План для этого вопроса скоро появится.',
  'Key features': 'Ключевые особенности',
  'Key points': 'Ключевые пункты',
  'Build your overview': 'Составьте общий обзор',
  'Write it yourself first. The AI feedback will tell you whether your overview covers the main features.':
    'Сначала напишите его сами. Разбор от ИИ покажет, отразили ли вы основные особенности.',
  'Suggested position': 'Предлагаемая позиция',
  'Mark "{label}" done': 'Отметить «{label}» как готово',
  'Vocabulary tab': 'Вкладка «Словарь»',
  'Pitfalls on this question': 'Типичные ошибки в этом вопросе',
  'Timing.': 'Время.',
  'What to look for': 'На что обратить внимание',
  'Phrases chosen for this exact question. Tap one to see when to use it.':
    'Фразы, подобранные именно для этого вопроса. Нажмите, чтобы увидеть, когда её использовать.',
  'Copy phrase': 'Скопировать фразу',
  'Copy "{phrase}"': 'Скопировать «{phrase}»',
  'No topic vocabulary for this task yet.': 'Для этого задания пока нет тематической лексики.',

  /* WritingHistory.tsx */
  'Estimated band over attempts': 'Примерный балл по попыткам',
  'Writing band across {count} attempts, from {from} to {to}':
    'Баллы за письмо в {count} попытках, от {from} до {to}',
  'Band {band}': 'Балл {band}',
  'No attempts yet': 'Пока нет попыток',
  'Check an essay and your scores will appear here.': 'Проверьте эссе, и здесь появятся ваши баллы.',
  Date: 'Дата',
  Task: 'Задание',
  Band: 'Балл',
  '(sample)': '(пример)',
  Open: 'Открыть',
  'This attempt was recorded before essays were saved.': 'Эта попытка записана до того, как эссе стали сохраняться.',
  'n/a': 'н/д',
  'Your answer': 'Ваш ответ',
  'The band scores below are illustrative, generated from mechanical signals only, without an AI examiner.':
    'Баллы ниже приблизительные: они получены только по механическим признакам, без ИИ-экзаменатора.',
  'Graded before comments were saved.': 'Проверено до того, как комментарии стали сохраняться.',

  /* SpeakingTester.tsx */
  'Microphone access is required for the Speaking test. Please allow the permission and try again.':
    'Для теста Speaking нужен доступ к микрофону. Разрешите доступ и попробуйте снова.',
  'We could not reach the grading service. Please try again in a minute.':
    'Не удалось связаться со службой проверки. Попробуйте ещё раз через минуту.',
  'We could not reach the grading service. Your answers are still here, try grading them again in a minute.':
    'Не удалось связаться со службой проверки. Ваши ответы никуда не делись, попробуйте проверить их снова через минуту.',
  'Try grading again': 'Проверить ещё раз',
  /* WritingTester.tsx, SpeakingTester.tsx, LiveExaminer.tsx: a grade that
     came back after another account took over the page (R2-02). */
  'The account on this page changed while this was being graded, so nothing from that attempt is shown here. It is kept for the student who started it.':
    'Пока шла проверка, на этой странице сменился аккаунт, поэтому эта попытка здесь не показана. Она сохранена для того студента, который её начал.',
  /* WritingTester.tsx: the essay editor belongs to the student who started
     it, and the page changed hands while it was open (R2B-01). */
  'The account on this page changed. Any essay in progress was kept for the student who was writing it.':
    'На этой странице сменился аккаунт. Начатое эссе сохранено для того студента, который его писал.',
  'This essay was started under a different account, so it was not sent for grading. It is kept for the student who wrote it.':
    'Это эссе было начато в другом аккаунте, поэтому оно не отправлено на проверку. Оно сохранено для того студента, который его написал.',
  'Start over': 'Начать заново',
  'Only Fluency & Coherence has any real signal without an AI examiner (from timing alone). Vocabulary, Grammar and Pronunciation need a model listening to your recording. Your teacher can enable AI grading.':
    'Без ИИ-экзаменатора реальный сигнал есть только по критерию Fluency & Coherence (по одному хронометражу). Для оценки Словарного запаса, Грамматики и Pronunciation нужна модель, которая слушает вашу запись. Ваш преподаватель может включить проверку ИИ.',
  'Timing check': 'Проверка времени',
  'Spoke for': 'Говорили',
  Silence: 'Тишина',
  'Longest pause': 'Самая долгая пауза',
  'Moments from your answer': 'Моменты из вашего ответа',
  'Practice this part again': 'Повторить эту часть',
  'Choose a different part': 'Выбрать другую часть',
  'Choose your speaking practice': 'Выберите тренировку по говорению',
  'Pick a part. Each question appears on screen, you record your answer with your microphone, and an AI examiner grades you on the four official IELTS Speaking criteria. A coach panel with the answer structure, useful phrases, and topic vocabulary stays beside you.':
    'Выберите часть. Каждый вопрос появляется на экране, вы записываете ответ на микрофон, а ИИ-экзаменатор оценивает вас по четырём официальным критериям IELTS Speaking. Рядом остаётся панель помощника со структурой ответа, полезными фразами и тематической лексикой.',
  'AI feedback is not available on this build ({envVar} is not set).':
    'ИИ-разбор недоступен в этой версии сайта (переменная {envVar} не задана).',
  'Question {current} / {total}': 'Вопрос {current} / {total}',
  "Read the question above, then continue when you're ready.": 'Прочитайте вопрос выше, затем продолжайте, когда будете готовы.',
  'Start prep time': 'Начать время подготовки',
  'Start answering': 'Начать отвечать',
  "Prep time: plan what you'll say. You can start early.": 'Время подготовки: продумайте, что скажете. Можно начать раньше.',
  'Start speaking now': 'Начать говорить сейчас',
  'Optional notes (not graded)…': 'Заметки по желанию (не оцениваются)…',
  'Recording: {seconds}s left': 'Запись: осталось {seconds} сек',
  'Stop answering': 'Закончить ответ',

  /* SpeakingCoachPanel.tsx */
  Plan: 'План',
  Phrases: 'Фразы',
  Vocab: 'Лексика',
  'How to answer': 'Как отвечать',
  'Topic words to work into your answers. Tap to see what they mean.':
    'Тематические слова, которые стоит использовать в ответах. Нажмите, чтобы увидеть значение.',

  /* SpeakingHistory.tsx */
  'Speaking band across {count} attempts, from {from} to {to}': 'Баллы за говорение в {count} попытках, от {from} до {to}',
  'Finish a speaking part and your bands will appear here.': 'Закончите часть говорения, и здесь появятся ваши баллы.',
  Part: 'Часть',
  Topic: 'Тема',

  /* SpeakingPartCards.tsx */
  'The Interview': 'Интервью',
  'Short questions about your everyday life: home, work, music, food. Answer in 2 to 4 sentences each.':
    'Короткие вопросы о повседневной жизни: дом, работа, музыка, еда. Отвечайте на каждый по 2 до 4 предложений.',
  'A.R.E. method': 'Метод A.R.E.',
  '4-5 questions': '4-5 вопросов',
  'The Long Turn': 'Развёрнутый монолог',
  'One cue card, one minute to prepare with notes, then speak on your own for up to two minutes.':
    'Одна карточка задания, минута на подготовку с заметками, затем самостоятельная речь до двух минут.',
  'PEEL method': 'Метод PEEL',
  '1 cue card': '1 карточка задания',
  'The Discussion': 'Обсуждение',
  'Deeper follow-up questions on the cue-card theme. Give opinions about people and society, not just yourself.':
    'Более глубокие вопросы по теме карточки. Высказывайте мнение о людях и обществе, а не только о себе.',
  'OREO formula': 'Формула OREO',
  discussion: 'обсуждение',

  /* LiveExaminer.tsx */
  'Live mock speaking test': 'Пробный устный тест в реальном времени',
  'Could not reach the live examiner service.': 'Не удалось связаться со службой устного экзаменатора.',
  'Microphone access is required. Please allow the permission and try again.':
    'Нужен доступ к микрофону. Разрешите доступ и попробуйте снова.',
  closed: 'закрыто',
  'network problem': 'проблема с сетью',
  'The connection ended early ({reason}). Grading what we have…': 'Соединение прервалось раньше времени ({reason}). Оцениваем то, что есть…',
  'Could not start the examiner session.': 'Не удалось начать сессию с экзаменатором.',
  'The interview finished, but AI grading is not configured on this site ({envVar}).':
    'Интервью завершено, но проверка ИИ не настроена на этом сайте (переменная {envVar}).',
  'The session ended before there was enough speech to grade. Please try again.':
    'Сессия завершилась раньше, чем накопилось достаточно речи для проверки. Попробуйте ещё раз.',
  'Grading failed.': 'Проверка не удалась.',
  'This is a design preview. The examiner is not connected.': 'Это предпросмотр дизайна. Экзаменатор не подключён.',
  'Preparing the speaking test…': 'Готовим тест по говорению…',
  'Moments from the interview': 'Моменты из интервью',
  'Full interview transcript': 'Полная расшифровка интервью',
  You: 'Вы',
  Done: 'Готово',
  Live: 'Онлайн',
  'Practice One Part with the AI Examiner': 'Тренировка одной части с ИИ-экзаменатором',
  'Live Mock Test with an AI Examiner': 'Пробный устный экзамен в реальном времени с ИИ-экзаменатором',
  "Pick a part. {name} asks questions out loud, listens to your answers, and follows up on what you say, exactly like the real test, just one part at a time. A coach panel with the answer structure, useful phrases, and topic vocabulary stays beside you, and you'll get a band report at the end.":
    'Выберите часть. {name} задаёт вопросы вслух, слушает ваши ответы и уточняет именно то, что говорите вы, точно как на настоящем экзамене, только по одной части за раз. Рядом остаётся панель помощника со структурой ответа, полезными фразами и тематической лексикой, а в конце вы получите отчёт с баллами.',
  "A real-time spoken interview, all three parts, ~12 minutes. {name} asks questions out loud, listens to your answers, and follows up on what you say, exactly like the real test. You'll get a full band report at the end.":
    'Устное интервью в реальном времени, все три части, около 12 минут. {name} задаёт вопросы вслух, слушает ваши ответы и уточняет именно то, что говорите вы, точно как на настоящем экзамене. В конце вы получите полный отчёт с баллами.',
  'Use headphones if you can, in a quiet room': 'По возможности используйте наушники в тихой комнате',
  'Speak naturally, the examiner waits while you think': 'Говорите естественно, экзаменатор подождёт, пока вы думаете',
  'You can ask her to repeat a question, and in Part 3 to rephrase it, exactly as in the real test':
    'Вы можете попросить её повторить вопрос, а в Part 3 переформулировать его, точно как на настоящем экзамене',
  'Sign in to use the live examiner (this keeps the paid voice service for real students).':
    'Войдите, чтобы пользоваться устным экзаменатором (это сохраняет платную голосовую службу для настоящих студентов).',
  'The live examiner needs accounts to be enabled on this site.': 'Для устного экзаменатора на этом сайте должны быть включены аккаунты.',
  'The live examiner service could not be reached: {error}. You can still try to start.':
    'Не удалось связаться со службой устного экзаменатора: {error}. Вы всё ещё можете попробовать начать.',
  'The live examiner is not configured on this site yet ({envVar}).':
    'Устный экзаменатор пока не настроен на этом сайте (переменная {envVar}).',
  'Start the interview': 'Начать интервью',
  'Connecting you to {name}…': 'Подключаем вас к {name}…',
  'Three independent assessments are compared, and the median becomes your report.':
    'Сравниваются три независимые оценки, и медиана становится вашим отчётом.',
  Back: 'Назад',
  'Part 1 · Interview': 'Part 1 · Интервью',
  'Part 2 · Preparation': 'Part 2 · Подготовка',
  'Part 2 · Your talk': 'Part 2 · Ваше выступление',
  'Part 3 · Discussion': 'Part 3 · Обсуждение',
  'Finishing…': 'Завершение…',
  'Cue card': 'Карточка задания',
  'You should say:': 'Вы должны рассказать:',
  'Stuck? Ideas for this card': 'Не знаете, с чего начать? Идеи для этой карточки',
  "Your notes (not graded, the examiner can't see them)…": 'Ваши заметки (не оцениваются, экзаменатор их не видит)…',
  'Prepare your talk:': 'Подготовьте своё выступление:',
  '{name} is speaking: listen': '{name} говорит: слушайте',
  'Your turn: speak': 'Ваша очередь: говорите',
  'Hide captions': 'Скрыть субтитры',
  'Show captions': 'Показать субтитры',
  "I'm ready, start speaking": 'Я готов, начинаю говорить',
  "I've finished my talk": 'Я закончил выступление',
  'End test early': 'Закончить тест досрочно',

  /* BandReport.tsx */
  'AI-assessed': 'Оценено ИИ',
  'Sample assessment (offline)': 'Примерная оценка (офлайн)',
  'Estimated overall band': 'Примерный общий балл',
  'Band {band}:': 'Балл {band}:',
  'Reach band {band}': 'Достигните балла {band}',
  'Full guide: band {from} to {to}': 'Полное руководство: с балла {from} до {to}',
  'Do this': 'Делайте это',
  'Stop this': 'Перестаньте делать это',
  'Practice today:': 'Потренируйтесь сегодня:',
  Strengths: 'Сильные стороны',
  'Improve next': 'Что улучшить дальше',
  'Your action plan': 'Ваш план действий',
  'The official descriptors for every criterion, in plain words.': 'Официальные дескрипторы для каждого критерия простыми словами.',

  /* GradingProgress.tsx + src/lib/grading/progress.ts */
  'Grading your speaking': 'Проверяем ваше говорение',
  'Grading your essay': 'Проверяем ваше эссе',
  'Reading your essay': 'Читаем ваше эссе',
  'Checking it against the official band descriptors': 'Сверяем его с официальными дескрипторами баллов',
  'Writing your feedback': 'Готовим разбор',
  'Preparing your recording': 'Готовим вашу запись',
  'Writing out exactly what you said': 'Расшифровываем, что именно вы сказали',
  'Grading fluency, vocabulary and grammar': 'Оцениваем беглость, словарный запас и грамматику',
  'Checking your pronunciation': 'Проверяем произношение',
  'This one is taking longer than usual. Please keep this tab open.': 'Это занимает больше времени, чем обычно. Пожалуйста, не закрывайте вкладку.',

  /* IdeaHints.tsx */
  'Stuck? Get ideas': 'Не знаете, с чего начать? Идеи',

  /* CueCardBank.tsx */
  'Model answer': 'Образец ответа',
  'Band 8 upgrade': 'Улучшение до 8 баллов',
  'All cue cards': 'Все карточки заданий',
  'Rounding-off questions': 'Завершающие вопросы',
  'Short questions the examiner may ask right after your two minutes, before moving on to Part 3.':
    'Короткие вопросы, которые экзаменатор может задать сразу после ваших двух минут, перед переходом к Part 3.',
  'Prepare and speak': 'Подготовиться и рассказать',
  'Random card': 'Случайная карточка',
  'Keep the card visible while I speak': 'Показывать карточку, пока я говорю',
  'One-minute prep notes': 'Заметки за минуту подготовки',
  'Short jotted notes, the way you would actually write them in the real one-minute prep.':
    'Короткие заметки, так, как вы бы их написали за настоящую минуту подготовки.',
  'Band 7.0 model answer': 'Образец ответа на 7.0 балла',
  'Phrases and structures worth borrowing from the model answer above.': 'Фразы и конструкции, которые стоит позаимствовать из образца ответа выше.',
  'Part 3 follow-up questions': 'Дополнительные вопросы Part 3',
  'Preparation time': 'Время подготовки',
  'Speaking time': 'Время ответа',
  'Read the card and jot short notes, the way you would with a real pencil and paper.':
    'Прочитайте карточку и сделайте короткие заметки, как настоящим карандашом на бумаге.',
  'Speak until the timer ends. Cover every bullet, then explain why.': 'Говорите, пока не закончится время. Раскройте каждый пункт, а затем объясните почему.',
  'Speak from memory. Nothing is being recorded here, the Speaking Trainer does that.':
    'Говорите по памяти. Здесь ничего не записывается, это делает тренажёр по говорению.',
  Stop: 'Стоп',
  "Time's up": 'Время вышло',
  "That's the full two minutes. Compare what you said against the model answer, or take it to the Speaking Trainer for a real AI-graded attempt with your microphone.":
    'Это были все две минуты. Сравните сказанное с образцом ответа или попробуйте настоящую попытку с ИИ-оценкой и микрофоном в тренажёре по говорению.',
  'Back to this card': 'Вернуться к этой карточке',
  'Practise this in the Speaking Trainer': 'Потренироваться в тренажёре по говорению',
  'All ({count})': 'Все ({count})',
  'No cards in this family yet.': 'В этой группе пока нет карточек.',
  'You will have one minute to prepare before speaking.': 'У вас будет одна минута на подготовку перед ответом.',

  /* ModelAnswers.tsx */
  Opinion: 'Мнение',
  Discussion: 'Обсуждение',
  'Problem / Solution': 'Проблема / решение',
  'Advantages & Disadvantages': 'Плюсы и минусы',
  'Two-part question': 'Вопрос из двух частей',
  'Charts and graphs': 'Диаграммы и графики',
  'Line graphs': 'Линейные графики',
  'Bar charts': 'Столбчатые диаграммы',
  'Pie charts': 'Круговые диаграммы',
  Tables: 'Таблицы',
  'Process diagrams': 'Схемы процессов',
  Maps: 'Карты',
  Combination: 'Комбинация',
  'Model answers are being prepared': 'Образцы ответов готовятся',
  "Model answers for the real exam tasks on this site are on their way. In the meantime the Writing Trainer's AI feedback shows you, sentence by sentence, how to reach the next band.":
    'Образцы ответов для настоящих экзаменационных заданий на этом сайте уже готовятся. А пока разбор от ИИ в тренажёре по письму показывает, предложение за предложением, как достичь следующего балла.',
  'Go to the Writing Trainer': 'Перейти в тренажёр по письму',
  'Model answer prompts': 'Вопросы с образцами ответов',
  'Task 2 essays': 'Эссе Task 2',
  'Task 1 reports & letters': 'Отчёты и письма Task 1',
  'Band A': 'Балл A',
  'Band B': 'Балл B',
  'Compare bands': 'Сравнить баллы',
  'Write this one': 'Написать это задание',

  /* ModelAnswer.astro */
  'Show model answer': 'Показать образец ответа',

  /* EssayCheckerCta.astro */
  AI: 'ИИ',
  'Instant Feedback': 'Мгновенный разбор',
  'Check Your Writing': 'Проверьте своё письмо',
  'Written a Task 2 essay? Get it assessed like the real exam: a band for each of the four marking criteria above, examiner-style comments, corrections, and one tip per criterion to reach the next band.':
    'Написали эссе Task 2? Получите оценку как на настоящем экзамене: балл по каждому из четырёх критериев выше, комментарии в стиле экзаменатора, исправления и по одному совету на критерий, чтобы дойти до следующего балла.',
  'Written a practice answer? Get it assessed like the real exam: a band for each of the four marking criteria above, examiner-style comments, corrections, and one tip per criterion to reach the next band.':
    'Написали тренировочный ответ? Получите оценку как на настоящем экзамене: балл по каждому из четырёх критериев выше, комментарии в стиле экзаменатора, исправления и по одному совету на критерий, чтобы дойти до следующего балла.',
  'Ready to write? Take a writing test and get your answer assessed like the real exam: a band for each of the four marking criteria, examiner-style comments, corrections, and one tip per criterion to reach the next band.':
    'Готовы писать? Пройдите тест по письму и получите оценку своего ответа как на настоящем экзамене: балл по каждому из четырёх критериев, комментарии в стиле экзаменатора, исправления и по одному совету на критерий, чтобы дойти до следующего балла.',
  '✨ AI examiner · official band descriptors · free': '✨ ИИ-экзаменатор · официальные дескрипторы баллов · бесплатно',
  'Open the Writing Checker': 'Открыть проверку письма',
  'Check my writing': 'Проверить моё письмо',
  'Hand writing an essay beside a rotating stack of task cards and a 7.5 band badge':
    'Рука пишет эссе рядом со стопкой карточек с заданиями и значком балла 7.5',

  /* src/lib/writing/mechanics.ts (notes lines) */
  'Under the {min}-word minimum ({count} words), which caps your {criterion} band.':
    'Меньше минимума в {min} слов (сейчас {count}), из-за чего балл по {criterion} ограничен.',
  '{count} words, comfortably over the {min}-word minimum.': 'Слов {count}, с запасом больше минимума в {min}.',
  'Sentence lengths are very uniform. Mix short and long sentences for rhythm.':
    'Длина предложений очень однородная. Чередуйте короткие и длинные предложения для ритма.',
  'Your sentences are long on average. Check for run-ons you could split.':
    'В среднем предложения длинные. Проверьте, нет ли слишком длинных, которые стоит разделить.',
  'Good variation in sentence length.': 'Хорошее разнообразие длины предложений.',
  'Vocabulary is quite repetitive. Vary word choice to lift Lexical Resource.':
    'Словарный запас довольно однообразный. Разнообразьте слова, чтобы поднять балл по Lexical Resource.',
  'Varied vocabulary: a strong Lexical Resource signal.': 'Разнообразная лексика: сильный сигнал по Lexical Resource.',
  'You repeat "{word}" {times}. Try synonyms.': 'Вы повторяете «{word}» {times}. Попробуйте синонимы.',
  'No linking words detected. Add cohesive devices (However, Moreover, For example…).':
    'Не найдено слов-связок. Добавьте связующие обороты (However, Moreover, For example…).',
  'Heavy use of linking words: a few are being overused; let some ideas connect naturally.':
    'Слишком много слов-связок: некоторые используются чрезмерно, дайте части мыслей соединиться естественно.',
  'Low overlap with the question wording. Make sure you are answering the prompt directly.':
    'Низкое совпадение с формулировкой вопроса. Убедитесь, что вы отвечаете именно на заданный вопрос.',

  /* src/lib/writing/grader.ts */
  'The AI examiner is not configured for this site yet.': 'ИИ-экзаменатор пока не настроен на этом сайте.',
  // Added by the lead at merge time: the two keys the interrupted run had wrapped but not yet translated.
  'Speaking coach: {structure}': 'Помощник по устной речи: {structure}',
  'Get a different task? Your current answer will be cleared.': 'Взять другое задание? Текущий ответ будет удалён.',
  'Could not analyze pacing in this browser. Length was still measured.': 'В этом браузере не удалось оценить темп речи. Длительность всё равно измерена.',
  'Under the suggested length ({spoken}s of {expected}s+).': 'Короче рекомендуемой длительности ({spoken} с из {expected} с и более).',
  'A long pause was detected. Try to keep talking even while you think of what to say next.': 'Была долгая пауза. Старайтесь продолжать говорить, даже пока обдумываете следующую мысль.',
  'A large portion of the recording was silence.': 'Значительная часть записи прошла в тишине.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  '{n}+ words': { one: '{n}+ слово', few: '{n}+ слова', many: '{n}+ слов', other: '{n}+ слова' },
  '{n} Task 1 prompts': {
    one: '{n} задание Task 1',
    few: '{n} задания Task 1',
    many: '{n} заданий Task 1',
    other: '{n} задания Task 1',
  },
  '{n} phrases for this question': {
    one: '{n} фраза для этого вопроса',
    few: '{n} фразы для этого вопроса',
    many: '{n} фраз для этого вопроса',
    other: '{n} фразы для этого вопроса',
  },
  '{n} Task 2 prompts': {
    one: '{n} задание Task 2',
    few: '{n} задания Task 2',
    many: '{n} заданий Task 2',
    other: '{n} задания Task 2',
  },
  '{n} Part 1 topics': {
    one: '{n} тема Part 1',
    few: '{n} темы Part 1',
    many: '{n} тем Part 1',
    other: '{n} темы Part 1',
  },
  '{n} cue cards': {
    one: '{n} карточка задания',
    few: '{n} карточки задания',
    many: '{n} карточек заданий',
    other: '{n} карточки задания',
  },
  '{n} points to cover': {
    one: '{n} пункт для раскрытия',
    few: '{n} пункта для раскрытия',
    many: '{n} пунктов для раскрытия',
    other: '{n} пункта для раскрытия',
  },
  '{n} words': { one: '{n} слово', few: '{n} слова', many: '{n} слов', other: '{n} слова' },
  '{n} times': { one: '{n} раз', few: '{n} раза', many: '{n} раз', other: '{n} раза' },
  '{n} likely spelling slips detected.': {
    one: 'Найдена {n} вероятная орфографическая ошибка.',
    few: 'Найдено {n} вероятные орфографические ошибки.',
    many: 'Найдено {n} вероятных орфографических ошибок.',
    other: 'Найдено {n} вероятной орфографической ошибки.',
  },
};
