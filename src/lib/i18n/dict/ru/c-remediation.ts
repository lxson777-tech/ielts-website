/* Russian for the 29 September 2026 audit remediation, Builder C (F05).

   The interface sentences and counts the audit found still English in
   Russian mode: the Tests page, Practice, the trainer catalogues, the
   Reading overview card, and the section-overview grids (PartGrid) on the
   Speaking, Writing and Vocabulary lesson pages. tests/i18n-templates.test.ts
   is what finds them now; see docs/I18N-GUIDE.md for the rules.

   Paper names, Task / Part numbers and IELTS stay English inside the
   Russian, as everywhere else. */

export const strings: Record<string, string> = {
  /* Tests page (src/pages/tests/index.astro): the attribution line. */
  'Listening questions and recordings are adapted with permission from':
    'Вопросы и записи для Listening адаптированы с разрешения',
  'Ready for the complete exam routine?': 'Готовы пройти весь экзамен по порядку?',
  'Open Exam readiness': 'Открыть «Готовность к экзамену»',

  /* Account page (src/pages/account.astro). */
  'Account sections': 'Разделы аккаунта',

  /* Section overview grids (src/components/PartGrid.astro), passed as props
     from src/pages/lessons/{speaking,writing,vocabulary}.astro. */
  'Learn Each Part': 'Изучите каждую часть',
  'The Three Parts': 'Три части экзамена',
  'Each part has its own lesson. Format, strategy, useful language, and practice questions with model answers. Work through them in test order, which is also easiest to hardest.':
    'У каждой части свой урок: формат, стратегия, полезные фразы и вопросы для практики с образцами ответов. Проходите их в порядке экзамена: он же идёт от простого к сложному.',
  'Learn Each Topic': 'Изучите каждую тему',
  'Topic Lists': 'Списки тем',
  'Each topic has its own lesson. A word table with meanings and examples, key collocations, essay phrases, and a gap-fill exercise. Start with Conjunctions & Linking Words: every other lesson here assumes you can join ideas. After that the topics run from most to least common in the exam.':
    'У каждой темы свой урок: таблица слов со значениями и примерами, ключевые коллокации, фразы для эссе и упражнение на заполнение пропусков. Начните с урока Conjunctions & Linking Words: все остальные уроки предполагают, что вы умеете связывать идеи. Дальше темы идут от самых частых на экзамене к самым редким.',
  'Task 1 · 20 minutes · 150+ words': 'Task 1 · 20 минут · от 150 слов',
  'Task 1: The Report': 'Task 1: отчёт',
  'You describe visual data in a short report. Start with the universal method (one structure works for every question type), then learn what to look for in each visual.':
    'Вы описываете визуальные данные в коротком отчёте. Начните с универсального метода (одна структура подходит для любого типа задания), затем узнайте, на что смотреть в каждом виде графика.',
  'Task 2 · 40 minutes · 250+ words · counts double': 'Task 2 · 40 минут · от 250 слов · весит вдвое больше',
  'Task 2: The Essay': 'Task 2: эссе',
  'One essay task, worth twice as much as Task 1. Start with the universal method, then learn to recognise each question type, because each demands a different structure.':
    'Одно эссе, которое весит вдвое больше, чем Task 1. Начните с универсального метода, затем научитесь узнавать каждый тип вопроса: для каждого нужна своя структура.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  "{n} complete exams in rotation, a different one every attempt until you've taken them all.": {
    one: 'В ротации {n} полный экзамен: каждая попытка даёт новый, пока вы не пройдёте все.',
    few: 'В ротации {n} полных экзамена: каждая попытка даёт новый, пока вы не пройдёте все.',
    many: 'В ротации {n} полных экзаменов: каждая попытка даёт новый, пока вы не пройдёте все.',
    other: 'В ротации {n} полного экзамена: каждая попытка даёт новый, пока вы не пройдёте все.',
  },
  '{n} passages': { one: '{n} текст', few: '{n} текста', many: '{n} текстов', other: '{n} текста' },
  '{n} questions': { one: '{n} вопрос', few: '{n} вопроса', many: '{n} вопросов', other: '{n} вопроса' },
  '{n} scored questions': {
    one: '{n} оцениваемый вопрос',
    few: '{n} оцениваемых вопроса',
    many: '{n} оцениваемых вопросов',
    other: '{n} оцениваемого вопроса',
  },
  '{n} min': { one: '{n} мин', few: '{n} мин', many: '{n} мин', other: '{n} мин' },
  '{n} parts': { one: '{n} часть', few: '{n} части', many: '{n} частей', other: '{n} части' },
  '{n} tests': { one: '{n} тест', few: '{n} теста', many: '{n} тестов', other: '{n} теста' },
  '{n} tests in rotation': {
    one: '{n} тест в ротации',
    few: '{n} теста в ротации',
    many: '{n} тестов в ротации',
    other: '{n} теста в ротации',
  },
  '{n} exams': { one: '{n} экзамен', few: '{n} экзамена', many: '{n} экзаменов', other: '{n} экзамена' },
  '{n} drills': { one: '{n} тренировка', few: '{n} тренировки', many: '{n} тренировок', other: '{n} тренировки' },
  '{n} Task 1 prompts': {
    one: '{n} задание Task 1',
    few: '{n} задания Task 1',
    many: '{n} заданий Task 1',
    other: '{n} задания Task 1',
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
};
