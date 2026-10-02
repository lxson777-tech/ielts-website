/* The shortened account menu, /account in three categories, and the
   links that moved out of the menu (Alex, 1 and 2 October 2026), and the
   fixes from the full click test of 2 October 2026. */
export const strings: Record<string, string> = {
  'Profile': 'Профиль',
  'Access': 'Доступ',
  'Saved and results': 'Сохранённое и результаты',
  'Log in to see your details, your saved work and your results.': 'Войдите, чтобы увидеть свои данные, сохранённое и результаты.',
  'Your best bands, everything you saved, and the history of each paper.': 'Ваши лучшие баллы, всё сохранённое и история по каждой части экзамена.',
  'Open your progress report': 'Открыть отчёт о прогрессе',
  'Study from examples:': 'Учитесь на примерах:',
  /* Lesson help: the lesson's own answer, after the reason Mr EZ did not answer. */
  "Here is the lesson's own answer.": 'Вот ответ самого урока.',
  /* /support on a build without the support form (src/lib/support.ts). */
  'The message form is not open yet. The Help page answers the most common questions.': 'Форма для сообщений пока не открыта. На странице «Помощь» есть ответы на самые частые вопросы.',
  'Open Help': 'Открыть «Помощь»',
  /* LiveExaminer: a start the browser itself could not complete. */
  'Could not connect to the examiner just now. Check your internet connection and press Start again.': 'Не удалось подключиться к экзаменатору. Проверьте подключение к интернету и нажмите «Начать интервью» ещё раз.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
