/* Russian: the titles and descriptions held in the course and lesson
   registries, as opposed to the components that render them.
   Batch owner: the course-data agent. Nobody else edits this file.

   Covers: COURSE_UNITS names and blurbs in src/lib/course.ts, and the lesson
   titles, blurbs and eyebrows in src/data/lessons.ts, reading.ts, listening.ts,
   writing.ts, speaking.ts and vocabulary.ts, marked where they are written with
   nt() and translated where they are rendered.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* COURSE_UNITS (src/lib/course.ts): eight unit names and blurbs. */
  'Start speaking with confidence': 'Начните говорить уверенно',
  'Understand the Speaking test, then answer Part 1 questions about familiar topics. Build the vocabulary to talk about yourself, family, study and work.':
    'Разберитесь, как устроен экзамен Speaking, и начните отвечать на вопросы Part 1 о знакомых темах. Освойте лексику, чтобы рассказывать о себе, семье, учёбе и работе.',

  'Listen for everyday information': 'Понимайте повседневную информацию на слух',
  'Start with the Listening overview and Part 1. Learn to capture details before moving to Part 2 and directions on a map.':
    'Начните с обзора Listening и Part 1. Научитесь улавливать детали, а затем переходите к Part 2 и ориентированию по карте.',

  'Read for meaning and detail': 'Понимайте смысл и детали текста',
  'Understand Reading first. Recognise paraphrases, find precise answers, then work through completion questions with increasingly complex layouts.':
    'Сначала разберитесь, как устроен Reading. Научитесь распознавать перефразирование и находить точные ответы, а затем переходите к заданиям на заполнение пропусков со всё более сложной структурой.',

  'Build a clear Task 1 report': 'Стройте понятный отчёт для Task 1',
  'Learn how Writing is marked and practise the Task 1 method before applying it to charts, processes and maps. Linking and location language support your reports.':
    'Узнайте, как оценивается Writing, и отработайте метод для Task 1, прежде чем применять его к графикам, процессам и картам. Слова для связок и описания расположения помогут в ваших отчётах.',

  'Develop and support your ideas': 'Развивайте и подкрепляйте свои идеи',
  'Extend short answers into Speaking Part 2. Learn the Task 2 essay method before opinion essays, then distinguish facts, claims and distractors in Reading.':
    'Превращайте короткие ответы в развёрнутые монологи для Speaking Part 2. Освойте метод эссе для Task 2, прежде чем переходить к эссе с мнением, а затем учитесь отличать факты, утверждения и отвлекающие варианты в Reading.',

  'Follow and compare arguments': 'Следите за аргументами и сравнивайте их',
  'Progress to academic Listening Parts 3 and 4, then weigh different views in discussion and advantages essays. Reuse social issues vocabulary across both papers.':
    'Переходите к академическим Part 3 и Part 4 в Listening, а затем взвешивайте разные точки зрения в эссе discussion и advantages. Используйте лексику по социальным темам в обеих частях.',

  'Handle complex questions': 'Справляйтесь со сложными вопросами',
  'Move from reading individual answers to connecting ideas. Finish the remaining essay types and Speaking Part 3, using wider topic vocabulary to explain and evaluate.':
    'Переходите от поиска отдельных ответов к связыванию идей. Завершите оставшиеся типы эссе и Speaking Part 3, используя более широкую лексику, чтобы объяснять и оценивать.',

  'Put it together under exam conditions': 'Соберите всё вместе в условиях экзамена',
  'After learning the material, take timed tests, try a complete mock and use your results to revisit weak areas. Keep the final two study days light.':
    'Изучив материал, пройдите тесты на время, попробуйте полный пробный экзамен и используйте результаты, чтобы вернуться к слабым местам. Оставьте последние два дня учёбы лёгкими.',

  /* EXAM_READINESS labels (src/lib/course.ts). */
  'Sit a full Reading test under exam timing': 'Пройдите полный тест Reading с учётом времени экзамена',
  'Sit a full Listening test under exam timing': 'Пройдите полный тест Listening с учётом времени экзамена',
  'Write a Task 2 essay and get an AI band': 'Напишите эссе Task 2 и получите балл от ИИ',
  'Do a full mock interview with the Live AI Examiner': 'Пройдите полное пробное собеседование с AI-экзаменатором в реальном времени',
  'Review your score history and re-target your weakest paper': 'Просмотрите историю результатов и сделайте акцент на самой слабой части экзамена',

  /* coursePace() sentences (src/lib/course.ts), computed at call time. */
  'Follow the eight units in order. Add an exam date to adjust the calendar; lesson times show the actual workload.':
    'Проходите восемь разделов по порядку. Добавьте дату экзамена, чтобы скорректировать расписание: время уроков показывает реальную нагрузку.',
  'This is a condensed schedule. Keep the same learning order and expect longer sessions; extend the date if the daily workload is too high.':
    'Это сжатый график. Сохраняйте тот же порядок обучения и рассчитывайте на более длинные занятия: перенесите дату, если дневная нагрузка окажется слишком высокой.',
  'Follow the units at a steady pace, then use the final unit for timed practice and light review.':
    'Двигайтесь по разделам в спокойном темпе, а последний раздел используйте для тренировок на время и лёгкого повторения.',

  /* STAGES (src/data/lessons.ts). */
  Foundations: 'Основы',
  'How the exam works, plus the sub-skills every other lesson depends on.':
    'Как устроен экзамен, а также навыки, от которых зависят все остальные уроки.',
  'Core question types': 'Основные типы заданий',
  'The question types that carry most of the marks in every paper.':
    'Типы заданий, которые приносят больше всего баллов в каждой части экзамена.',
  'Harder types & range': 'Сложные типы и владение языком',
  'The material that separates a band 6 from a band 7.': 'Материал, который отличает 6 балл от 7.',
  'Exam readiness': 'Готовность к экзамену',
  'No new lessons. Full timed tests and AI-graded practice under exam conditions.':
    'Новых уроков больше нет. Только полные тесты на время и практика с проверкой ИИ в условиях экзамена.',

  /* SKILLS (src/data/lessons.ts). */
  Vocabulary: 'Словарь',
  'Passages, question types and timed practice tests.': 'Тексты, типы заданий и пробные тесты на время.',
  'Task 1 reports and Task 2 essays with model answers.': 'Отчёты для Task 1 и эссе для Task 2 с образцами ответов.',
  'All three parts of the interview, with sample responses.': 'Все три части собеседования с примерами ответов.',
  'Part-by-part strategies for the listening paper.': 'Стратегии для каждой части Listening.',
  'High-value academic words with an interactive quiz.': 'Ценная академическая лексика с интерактивным тестом.',

  /* LESSONS overview entries (src/data/lessons.ts). */
  'Reading Overview': 'Обзор Reading',
  'How the test works, the band score table, and a lesson for every official question type.':
    'Как устроен тест, таблица перевода баллов в шкалу и урок для каждого официального типа заданий.',
  'Writing Overview': 'Обзор Writing',
  'How the test works, how examiners mark it, and a lesson for each task.':
    'Как устроен тест, как его оценивают экзаменаторы, и урок для каждого задания.',
  'Speaking Overview': 'Обзор Speaking',
  'How the interview works, how examiners mark it, and a lesson for each part.':
    'Как устроено собеседование, как его оценивают экзаменаторы, и урок для каждой части.',
  'Listening Overview': 'Обзор Listening',
  'How the test works, how it is scored, and a lesson for each part and every question type.':
    'Как устроен тест, как он оценивается, и урок для каждой части и каждого типа заданий.',
  'Vocabulary Overview': 'Обзор словаря',
  'Why vocabulary decides your band, a lesson per exam topic, and a quiz.':
    'Почему словарный запас определяет ваш балл, урок по каждой теме экзамена и тест.',

  /* Level pills (src/data/lessons.ts, LessonLevel). */
  Beginner: 'Начальный',
  Intermediate: 'Средний',
  Advanced: 'Продвинутый',
  'All levels': 'Все уровни',

  /* READING_GROUPS (src/data/reading.ts). */
  'Core skill': 'Базовый навык',
  'The one skill every question type tests.': 'Навык, который проверяют все типы заданий.',
  'Choose the right option': 'Выберите правильный вариант',
  'Pick a letter or decide True, False or Not Given.': 'Выбирайте букву или определяйте True, False или Not Given.',
  Matching: 'Сопоставление',
  'Match statements, headings or sentence halves to the passage.': 'Сопоставляйте утверждения, заголовки или части предложений с текстом.',
  Completion: 'Заполнение',
  'Write words from the passage into gaps.': 'Вписывайте слова из текста в пропуски.',

  /* READING_PARTS (src/data/reading.ts). */
  'Spotting Paraphrase': 'Распознавание перефразирования',
  'Not a question type, but the skill behind all of them: recognising the same idea in different words.':
    'Это не тип задания, а навык, лежащий в основе всех остальных: узнавать одну и ту же мысль, выраженную другими словами.',
  'Pick the right option and dodge the distractors designed to catch skimmers.':
    'Выбирайте правильный вариант и не попадайтесь на отвлекающие варианты, придуманные для тех, кто читает по диагонали.',
  'Decide whether statements agree with the facts in the text, and learn what "Not Given" really means.':
    'Определяйте, соответствуют ли утверждения фактам из текста, и разберитесь, что на самом деле значит "Not Given".',
  "Decide whether statements match the writer's opinions and claims, not the facts in the text.":
    'Определяйте, совпадают ли утверждения с мнением и заявлениями автора, а не с фактами из текста.',
  'Match each paragraph to its main idea, not just repeated words.':
    'Подбирайте к каждому абзацу его основную мысль, а не просто повторяющиеся слова.',
  'Find which paragraph contains a specific piece of information.':
    'Находите, в каком абзаце содержится нужная информация.',
  'Match statements to people, theories, places or dates. Some books call this classification.':
    'Соотносите утверждения с людьми, теориями, местами или датами. В некоторых пособиях это называют классификацией.',
  'Match the start of a sentence to the ending that correctly completes it, using the passage.':
    'Подбирайте к началу предложения окончание, которое верно его завершает, опираясь на текст.',
  'Fill the gaps within the word limit, keeping the sentence grammatical.':
    'Заполняйте пропуски в пределах лимита слов, сохраняя грамматически верное предложение.',
  'Fill gaps in a summary, a set of notes, a table or a flow-chart using words taken from the passage.':
    'Заполняйте пропуски в кратком изложении, конспекте, таблице или блок-схеме словами из текста.',
  'Label a diagram or process using exact words from the passage.':
    'Подписывайте схему или процесс точными словами из текста.',
  'Answer questions with a word limit, taking the answer straight from the passage.':
    'Отвечайте на вопросы в пределах лимита слов, беря ответ прямо из текста.',

  /* LISTENING_GROUPS (src/data/listening.ts). */
  'The four parts': 'Четыре части',
  'What each part sounds like and how to prepare for it.': 'Как звучит каждая часть и как к ней подготовиться.',
  'Question types': 'Типы заданий',
  'Every question format the Listening paper can use.': 'Все форматы заданий, которые встречаются в Listening.',

  /* LISTENING_PARTS (src/data/listening.ts). */
  'Part 1. Everyday Conversation': 'Part 1. Обычный разговор',
  'Two speakers · Form completion': 'Два собеседника · Form completion',
  'Forms, bookings and registrations: catch names, numbers and spellings.':
    'Формы, бронирования и регистрации: улавливайте имена, числа и произношение по буквам.',
  'Part 2. Monologue & Maps': 'Part 2. Монолог и карты',
  'One speaker · Maps & matching': 'Один диктор · Maps & matching',
  'Follow a single speaker around a map, tour or announcement.':
    'Следите за диктором на карте, во время экскурсии или объявления.',
  'Part 3. Academic Discussion': 'Part 3. Академическая дискуссия',
  'up to four speakers · Multiple choice': 'до четырёх собеседников · Multiple choice',
  'Track multiple speakers, dodge distractors, and catch corrections.':
    'Следите за несколькими собеседниками, избегайте отвлекающих вариантов и замечайте исправления.',
  'Part 4. Academic Lecture': 'Part 4. Академическая лекция',
  'One speaker · Note completion': 'Один диктор · Note completion',
  'Complete notes from a fast, dense university-style talk.':
    'Заполняйте конспект по быстрой, насыщенной лекции в университетском стиле.',
  'Question type · Most common in Part 3': 'Тип задания · Чаще всего в Part 3',
  'Pick the correct option, or two, from a list while the recording plays.':
    'Выбирайте правильный вариант (или два) из списка, пока звучит запись.',
  'Question type · Most common in Parts 2 & 3': 'Тип задания · Чаще всего в Part 2 и Part 3',
  'Match items from a list to the options given, such as speakers to opinions or plans to features.':
    'Сопоставляйте пункты списка с предложенными вариантами: например, собеседников с мнениями или планы с особенностями.',
  'Question type · Most common in Part 2': 'Тип задания · Чаще всего в Part 2',
  'Label a map, plan or diagram by following directions given in the recording.':
    'Подписывайте карту, план или схему, следуя указаниям из записи.',
  'Question type · Most common in Parts 1 & 4': 'Тип задания · Чаще всего в Part 1 и Part 4',
  'Fill gaps in a form, notes, a table or a flow-chart with words or numbers you hear.':
    'Заполняйте пропуски в форме, конспекте, таблице или блок-схеме словами или числами, которые слышите.',
  'Question type · Any part': 'Тип задания · Любая часть',
  'Complete sentences with words taken directly from the recording, within the word limit.':
    'Дополняйте предложения словами прямо из записи, в пределах лимита слов.',
  'Answer questions with a short answer taken from the recording, within the word limit.':
    'Отвечайте на вопросы коротким ответом из записи, в пределах лимита слов.',

  /* WRITING_PARTS (src/data/writing.ts). */
  'How to Answer Task 1': 'Как отвечать на Task 1',
  'The universal report method: analyse, paraphrase, overview, then two detail paragraphs.':
    'Универсальный метод отчёта: анализ, перефразирование, обзор, а затем два абзаца с деталями.',
  'One structure for all': 'Одна структура для всех',
  'Charts, Graphs & Tables': 'Диаграммы, графики и таблицы',
  'Report the key features of data without listing every number.':
    'Описывайте главные особенности данных, не перечисляя каждое число.',
  'Bar · line · pie · table': 'Столбчатая · линейная · круговая · таблица',
  'Process Diagrams': 'Диаграммы процессов',
  'Describe each stage in order using passives and sequencers.':
    'Описывайте каждый этап по порядку, используя пассивный залог и слова-связки последовательности.',
  'Passives & sequencing': 'Пассивный залог и последовательность',
  'Maps & Plans': 'Карты и планы',
  'Compare two maps and describe what changed, using location language.':
    'Сравнивайте две карты и описывайте изменения, используя лексику расположения.',
  'Describing change over time': 'Описание изменений во времени',
  'How to Answer Task 2': 'Как отвечать на Task 2',
  'The universal essay method: analyse the question, take a position, four paragraphs.':
    'Универсальный метод эссе: анализ вопроса, выбор позиции, четыре абзаца.',
  'Opinion Essays': 'Эссе с мнением',
  'State a clear position and defend it from the first paragraph to the last.':
    'Заявите чёткую позицию и отстаивайте её от первого абзаца до последнего.',
  'Agree or disagree?': 'Согласны или нет?',
  'Discussion Essays': 'Эссе-дискуссия',
  'Present both views fairly, then make your own opinion unmistakable.':
    'Представьте обе точки зрения объективно, а затем чётко обозначьте своё мнение.',
  'Discuss both views': 'Обсудите обе точки зрения',
  'Advantages & Disadvantages Essays': 'Эссе о преимуществах и недостатках',
  'Weigh benefits against drawbacks. And check whether the question wants your opinion too.':
    'Взвешивайте плюсы и минусы. И проверяйте, не просит ли вопрос также ваше мнение.',
  'Benefits vs drawbacks': 'Плюсы против минусов',
  'Problem & Solution Essays': 'Эссе о проблеме и решении',
  'Analyse causes or problems, then propose realistic solutions.':
    'Анализируйте причины или проблемы, а затем предлагайте реалистичные решения.',
  'Causes & solutions': 'Причины и решения',
  'Two-Part Questions': 'Вопросы из двух частей',
  'Answer both questions fully. Half an answer caps your band.':
    'Полностью отвечайте на оба вопроса. Неполный ответ снижает балл.',
  'Two direct questions': 'Два прямых вопроса',

  /* SPEAKING_PARTS (src/data/speaking.ts). */
  'Part 1 Interview': 'Part 1. Интервью',
  'Handle the warm-up interview questions with natural, extended answers.':
    'Отвечайте на разминочные вопросы интервью естественными развёрнутыми ответами.',
  'Part 2 Cue Card': 'Part 2. Карточка задания',
  'Speak for two minutes from a cue card without running dry.':
    'Говорите две минуты по карточке задания и не останавливайтесь на середине.',
  'Part 3 Discussion': 'Part 3. Дискуссия',
  'Discuss abstract follow-up questions and show off complex language.':
    'Обсуждайте абстрактные уточняющие вопросы и демонстрируйте сложную грамматику и лексику.',

  /* VOCABULARY_PARTS (src/data/vocabulary.ts). The bracketed English word
     lists in some blurbs are the actual items the lesson teaches, so they
     stay English inside the Russian sentence; only the descriptive part is
     translated. */
  '20 words · collocations · exercise': '20 слов · коллокации · упражнение',
  '18 words · 6 functions · exercise': '18 слов · 6 функций · упражнение',

  'Conjunctions & Linking Words': 'Союзы и слова-связки',
  'Although, whereas, therefore, provided that. The linking words that lift Coherence and Cohesion.':
    'Although, whereas, therefore, provided that. Слова-связки, которые поднимают Coherence and Cohesion.',

  'Environment & Ecology': 'Окружающая среда и экология',
  'Climate, energy and conservation. The most common essay topic of all.':
    'Климат, энергетика и охрана природы. Самая частая тема эссе среди всех.',

  'Education & Learning': 'Образование и обучение',
  'Schools, universities and lifelong learning. A Speaking Part 3 favourite.':
    'Школы, университеты и обучение в течение жизни. Любимая тема в Speaking Part 3.',

  'Technology & Society': 'Технологии и общество',
  'Innovation, automation and digital life, with ready-made essay phrases.':
    'Инновации, автоматизация и цифровая жизнь, с готовыми фразами для эссе.',

  'Work & Employment': 'Работа и трудоустройство',
  'The gig economy, redundancy and the four-day week. The most common Speaking Part 1 topic.':
    'Гиг-экономика, сокращения и четырёхдневная рабочая неделя. Самая частая тема в Speaking Part 1.',

  'Health & Wellbeing': 'Здоровье и благополучие',
  'Public health, lifestyle and healthcare systems vocabulary.':
    'Лексика об общественном здравоохранении, образе жизни и системах здравоохранения.',

  'Society, Culture & Globalisation': 'Общество, культура и глобализация',
  'Inequality, migration and cultural identity for high-band essays.':
    'Неравенство, миграция и культурная идентичность для эссе на высокий балл.',

  'Crime & Law': 'Преступность и право',
  'Punishment, rehabilitation and the causes of crime. Around 1 in 10 Task 2 essays.':
    'Наказание, реабилитация и причины преступности. Примерно каждое десятое эссе Task 2.',

  'Government & Economy': 'Государство и экономика',
  'Taxation, public spending and the cost of living for policy-focused essays.':
    'Налогообложение, государственные расходы и стоимость жизни для эссе о государственной политике.',

  'Artificial Intelligence': 'Искусственный интеллект',
  'Automation, machine learning and job displacement. The fastest-growing essay theme of 2026.':
    'Автоматизация, машинное обучение и вытеснение рабочих мест. Самая быстрорастущая тема эссе 2026 года.',

  'Social Media & Digital Life': 'Социальные сети и цифровая жизнь',
  'Echo chambers, influencers and screen time. A constant Speaking Part 1-3 topic.':
    'Информационные пузыри, блогеры и экранное время. Постоянная тема в Speaking Part 1-3.',

  'Travel & Tourism': 'Путешествия и туризм',
  'Overtourism, eco-tourism and transport. A Speaking and Writing regular.':
    'Овертуризм, экотуризм и транспорт. Постоянная тема в Speaking и Writing.',

  'Housing & Urban Life': 'Жильё и городская жизнь',
  'Affordability, gentrification and city planning for urban-development essays.':
    'Доступность жилья, джентрификация и городское планирование для эссе о развитии городов.',

  'Family & Relationships': 'Семья и отношения',
  'Family structure, childcare and generational change. A Speaking Part 1-2 staple.':
    'Структура семьи, уход за детьми и смена поколений. Основная тема в Speaking Part 1-2.',

  // The twenty-two topics added on 2026-09-21 (vocabulary expansion).
  'Food & Diet': 'Еда и питание',
  'Fast food, food waste and what a balanced diet is. A Speaking Part 1 and health-essay regular.':
    'Фастфуд, пищевые отходы и что такое сбалансированное питание. Постоянная тема Speaking Part 1 и эссе о здоровье.',
  'Transport & Traffic': 'Транспорт и дорожное движение',
  'Congestion, commuting and cleaner vehicles. The language every city-problems essay needs.':
    'Пробки, поездки на работу и экологичный транспорт. Лексика, без которой не обойтись в эссе о проблемах города.',
  'Leisure & Entertainment': 'Досуг и развлечения',
  'Hobbies, films, music and books. The everyday language Speaking Parts 1 and 2 ask for most.':
    'Хобби, фильмы, музыка и книги. Повседневная лексика, которая чаще всего нужна в Speaking Part 1 и Part 2.',
  'People & Personality': 'Люди и характер',
  'The words to describe character. Speaking Part 2 asks you to describe a person more than anything else.':
    'Слова для описания характера. В Speaking Part 2 чаще всего просят описать человека.',
  'Hometown & Describing Places': 'Родной город и описание мест',
  'Every Speaking test opens with your hometown. The language to describe any place well.':
    'Любой Speaking начинается с вопросов о родном городе. Лексика, чтобы хорошо описать любое место.',
  'Childhood & Growing Up': 'Детство и взросление',
  'Memories, upbringing and growing up. Behind a large share of Part 2 cue cards.':
    'Воспоминания, воспитание и взросление. На этом построена большая часть карточек Part 2.',
  'Weather, Seasons & Nature': 'Погода, времена года и природа',
  'Climate, seasons and the outdoors. A Speaking Part 1 regular and useful in environment essays.':
    'Климат, времена года и жизнь на природе. Частая тема Speaking Part 1, пригодится и в эссе об окружающей среде.',
  'Music, Film & Television': 'Музыка, кино и телевидение',
  'Talk about what you watch and listen to, with the words reviewers actually use.':
    'Говорите о том, что смотрите и слушаете, словами, которыми действительно пользуются критики.',
  'Books & Reading': 'Книги и чтение',
  'Reading habits, e-books and libraries. A Speaking Part 1 topic and a recurring essay question.':
    'Привычка читать, электронные книги и библиотеки. Тема Speaking Part 1 и повторяющийся вопрос в эссе.',
  'Sport & Fitness': 'Спорт и фитнес',
  'Team sport, fitness and hosting major events. A Speaking staple and a frequent Task 2 subject.':
    'Командные виды спорта, фитнес и проведение крупных соревнований. Основная тема Speaking и частая тема Task 2.',
  'Money & Consumerism': 'Деньги и общество потребления',
  'Debt, spending and the throwaway culture. The vocabulary behind most consumer-society essays.':
    'Долги, траты и культура одноразовых вещей. Лексика для большинства эссе об обществе потребления.',
  'Media & Advertising': 'СМИ и реклама',
  'The press, fake news and how advertising works on us. A classic Task 2 pairing.':
    'Пресса, фейковые новости и то, как на нас действует реклама. Классическая пара тем для Task 2.',
  'Language & Communication': 'Язык и общение',
  'Learning languages, dying languages and a single world language. A recurring Task 2 question.':
    'Изучение языков, исчезающие языки и единый мировой язык. Повторяющийся вопрос Task 2.',
  'Arts & Culture': 'Искусство и культура',
  'Museums, creativity and whether governments should fund the arts. A frequent opinion essay.':
    'Музеи, творчество и вопрос о том, должно ли государство финансировать искусство. Частая тема эссе с мнением.',
  'Science & Space': 'Наука и космос',
  "Research, evidence and space exploration. The language for \"is this money well spent\" essays.":
    'Исследования, доказательства и освоение космоса. Лексика для эссе о том, разумно ли тратятся эти деньги.',
  'Animals & Wildlife': 'Животные и дикая природа',
  'Endangered species, zoos and animal testing. A common environment and ethics topic.':
    'Исчезающие виды, зоопарки и опыты на животных. Частая тема на стыке экологии и этики.',
  'Business & Entrepreneurship': 'Бизнес и предпринимательство',
  'Start-ups, big corporations and who they answer to. Distinct from the money you spend.':
    'Стартапы, крупные корпорации и то, перед кем они отвечают. Это отдельная тема, не путайте её с личными расходами.',
  'Traditions, Festivals & Customs': 'Традиции, праздники и обычаи',
  'Customs, festivals and what globalisation costs them. A frequent essay and cue card.':
    'Обычаи, праздники и то, чем им грозит глобализация. Частая тема эссе и карточек задания.',
  'Fashion & Clothing': 'Мода и одежда',
  'Clothes, uniforms and fast fashion. A Speaking Part 1 topic with a serious essay side.':
    'Одежда, форма и быстрая мода. Тема Speaking Part 1, у которой есть и серьёзная сторона для эссе.',
  'Volunteering & Community': 'Волонтёрство и местное сообщество',
  'Charities, community work and civic duty. Common in both Task 2 and Part 3.':
    'Благотворительность, общественная работа и гражданский долг. Часто встречается и в Task 2, и в Part 3.',
  'Ageing & Retirement': 'Старение и выход на пенсию',
  'Retirement age, elderly care and an ageing population. One of the most repeated essay themes.':
    'Пенсионный возраст, уход за пожилыми и старение населения. Одна из самых повторяющихся тем эссе.',
  'Success, Goals & Ambition': 'Успех, цели и амбиции',
  'Achievement, failure and what success means. The abstract language Part 3 keeps asking for.':
    'Достижения, неудачи и что значит успех. Абстрактная лексика, которую снова и снова требует Part 3.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
