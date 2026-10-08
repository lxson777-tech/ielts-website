/* Russian: the simplified Tests page (/tests), 8 October 2026, and the two
   start-screen notes that moved off it (headphones on a Listening paper,
   the microphone before the live examiner).
   Batch owner: the Tests page builder. Nobody else edits this file.

   The paper names (Reading, Listening, Writing, Speaking) stay English, as
   everywhere on the site; they are never keys here. */

export const strings: Record<string, string> = {
  /* Heading */
  'Timed, exactly like the real exam.': 'По времени, как на настоящем экзамене.',

  /* The five tiles */
  'A new full paper every time.': 'Каждый раз новый полный тест.',
  'Four parts, the recording plays once.': 'Четыре части, запись звучит один раз.',
  '20 or 40 min': '20 или 40 мин',
  'Task 1 or Task 2, marked by AI.': 'Task 1 или Task 2, оценка от ИИ.',
  '11 to 14 min': 'От 11 до 14 мин',
  'A live interview with an AI examiner.': 'Живое интервью с ИИ-экзаменатором.',
  'About 3 hours': 'Около 3 часов',
  'All four papers in one sitting.': 'Все четыре части за один раз.',
  'Last: Band {band}': 'Последний: балл {band}',

  /* The two quiet lines */
  'Short on time? Practise one part at a time.': 'Мало времени? Тренируйте по одной части.',
  "Want your real level? Try a paper you haven't seen:": 'Хотите узнать свой реальный уровень? Пройдите незнакомый тест:',
  'Start an unseen {skill} paper': 'Начать незнакомый тест {skill}',

  /* The bank and the results */
  'Choose a paper': 'Выберите часть экзамена',
  'Your results': 'Ваши результаты',
  'Weak spots': 'Слабые места',
  'Your scores and weak spots appear here after your first test.':
    'Ваши баллы и слабые места появятся здесь после первого теста.',

  /* Start screens */
  'Use headphones if you can.': 'По возможности используйте наушники.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
