/* Russian: focused practice, the help controls and the session bar.
   Batch owner: WP16 (personal learning build). Nobody else edits this file.

   Covers: src/components/learning/FocusedExercise.tsx,
   LessonHelpControls.tsx, SessionContinueBar.tsx, lesson-help.ts,
   lesson-block-help.ts, session-continue.ts, focused-exercise.ts, and the
   English written into src/data/focused-exercises.ts and
   src/data/focused/*.ts (exercise titles, objectives and the reasons a
   student picks from after a wrong answer).

   Strings this file needs that other batches already carry ("Independent
   check", "Back to today's session", "{n} min", "Passage", "Questions",
   "{done} of {total} answered") are deliberately NOT repeated: the
   dictionary is one merged object and every caller finds them there.

   Exam material stays English. The heading list, the passage, the question
   wording and the publisher's attribution are never translated here; what
   is translated is the teaching around them.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* FocusedExercise.tsx: the header */
  'Guided practice': 'Практика с подсказками',
  'Real exam material.': 'Настоящий экзаменационный материал.',
  'No hints and no explanations until you finish, and Mr EZ is closed for this one. That is what makes the result mean something.':
    'Никаких подсказок и объяснений, пока вы не закончите, и Mr EZ на это время закрыт. Именно поэтому результат что-то значит.',
  'This browser is not saving your work right now, so this run cannot be added to your record.':
    'Этот браузер сейчас не сохраняет вашу работу, поэтому эту попытку не получится добавить в ваш профиль.',

  /* FocusedExercise.tsx: the passage and the questions. "Passage" and
     "Questions" are already in the tests batch and are not repeated. */
  'Heading for {label}': 'Заголовок для {label}',
  'Choose a heading': 'Выберите заголовок',
  /* Phone only: the passage sits above the questions and folds away. */
  'Hide the passage': 'Скрыть текст',
  'Show the passage': 'Показать текст',

  /* FocusedExercise.tsx: after a wrong answer */
  'You chose {given}. That is not the one.': 'Вы выбрали {given}. Это не тот вариант.',
  'You left this one blank.': 'Здесь вы не дали ответа.',
  'How did you choose it?': 'Как вы его выбирали?',
  'Anything else, in your own words (optional)': 'Что-нибудь ещё, своими словами (по желанию)',
  'This looks like {diagnosis}, going by what you told us. It is worth checking against the next one rather than taking it as settled.':
    'Судя по тому, что вы написали, это похоже на {diagnosis}. Это стоит проверить на следующем вопросе, а не считать решённым.',
  'Thank you, that is recorded. It does not tell us much about method on its own, so the sentence below is the place to start.':
    'Спасибо, это записано. Само по себе это мало говорит о способе решения, поэтому начните с предложения ниже.',
  'The sentence that decides this one:': 'Предложение, которое решает этот вопрос:',
  'Try this one again': 'Попробовать ещё раз',
  'Check this one again': 'Проверить ещё раз',
  'Right this time, with help. That is progress, and it is recorded as guided rather than as your own.':
    'В этот раз верно, но с помощью. Это прогресс, и он записан как работа с подсказкой, а не как самостоятельная.',
  'Still not it. The explanation below says why.': 'Всё ещё не то. Объяснение ниже говорит почему.',

  /* FocusedExercise.tsx: the one action, and what it meant */
  'Check my answers': 'Проверить мои ответы',
  'Finish the check': 'Завершить проверку',
  'What changed:': 'Что изменилось:',
  'Read the method again': 'Перечитать метод',
  'On questions you had not seen, with no help, you matched {correct} of {total}.':
    'На вопросах, которых вы раньше не видели, без подсказок вы сопоставили {correct} из {total}.',
  'That is one independent set. It is enough to move what your plan works on next, and it is not a band and not a final answer about this question type.':
    'Это одна самостоятельная попытка. Её достаточно, чтобы изменить то, чем план займётся дальше, но это не балл и не окончательный ответ про этот тип вопросов.',
  'What a short set cannot show is how this holds up under exam timing on a whole passage.':
    'Короткий набор не показывает, как это держится на целом тексте в экзаменационное время.',
  'You worked {total} questions and got {correct} right, {assisted} of them with help.':
    'Вы прошли {total} вопросов и ответили верно на {correct}, из них {assisted} с помощью.',
  'This was practice with help available, so it shows guided work rather than what you can do on your own. The check that follows is what shows that.':
    'Это была практика с доступными подсказками, поэтому она показывает работу с помощью, а не то, что вы можете сами. Это покажет проверка после неё.',
  'Nothing here is a band, and one set is never mastery.':
    'Ничего из этого не является баллом, и один набор никогда не означает освоенный навык.',

  /* LessonHelpControls.tsx and lesson-block-help.ts */
  'Give me a hint': 'Дайте подсказку',
  'Explain this differently': 'Объясните это иначе',
  'Show me an example': 'Покажите пример',
  'Asking Mr EZ...': 'Спрашиваем Mr EZ...',

  /* lesson-help.ts: where the words came from */
  'Simulated, not a real Mr EZ reply.': 'Смоделированный ответ, а не настоящий ответ Mr EZ.',
  "Mr EZ could not be reached, so this is the lesson's own answer.":
    'Mr EZ недоступен, поэтому это ответ самого урока.',
  'Help is switched off while a check is running. That is what makes the result mean something. It comes back the moment you finish.':
    'Пока идёт проверка, помощь отключена. Именно поэтому результат что-то значит. Она вернётся, как только вы закончите.',

  /* session-continue.ts: one next step, never a competing one */
  "Continue today's session": 'Продолжить сегодняшнее занятие',
  'Next: {purpose}': 'Дальше: {purpose}',
  'Back to today': 'Вернуться к сегодняшнему дню',
  "That was the last step of today's session.": 'Это был последний шаг сегодняшнего занятия.',
  'This was extra practice. It has been recorded, and it has not changed today.':
    'Это была дополнительная практика. Она записана и не изменила сегодняшний план.',
  'This was extra practice. It has been recorded, and the plan has been worked out again around it.':
    'Это была дополнительная практика. Она записана, и план был пересчитан с её учётом.',

  /* src/data/focused/reading-matching-headings.ts: titles and objectives.
     "Matching Headings" is the exam's own name for the task and stays in
     English, the way every question type name does on this site. */
  'Matching Headings: guided practice': 'Matching Headings: практика с подсказками',
  'Matching Headings: independent check': 'Matching Headings: самостоятельная проверка',
  'Matching Headings: second independent check': 'Matching Headings: вторая самостоятельная проверка',
  'Match a heading to a paragraph by what the whole paragraph is about, not by a word it repeats.':
    'Подбирайте заголовок к абзацу по тому, о чём весь абзац, а не по совпавшему слову.',
  'Show on a passage you have not seen that you can match headings to paragraphs on your own.':
    'Покажите на незнакомом тексте, что вы можете подбирать заголовки к абзацам самостоятельно.',
  'Show on a second unseen passage that you can match headings to paragraphs on your own.':
    'Покажите на втором незнакомом тексте, что вы можете подбирать заголовки к абзацам самостоятельно.',

  /* src/data/focused-exercises.ts: how the student says they chose, and
     what that usually means. The diagnosis is always shown inside a
     sentence that says it is tentative and that it came from them. */
  'It repeats words from the paragraph': 'В нём повторяются слова из абзаца',
  'It matches the first sentence': 'Он подходит к первому предложению',
  'It fits one detail in the paragraph': 'Он подходит к одной детали в абзаце',
  'Two headings looked the same to me': 'Два заголовка показались мне одинаковыми',
  'I ran out of time': 'У меня закончилось время',
  'I guessed': 'Пришлось угадывать',
  'It repeats words from the text': 'В нём повторяются слова из текста',
  'I misread the question': 'Я неправильно прочитал вопрос',
  'choosing a heading because its words appear in the paragraph, rather than because it says what the paragraph is about':
    'выбор заголовка по словам, которые встречаются в абзаце, а не по тому, о чём абзац',
  'trusting the first sentence instead of the paragraph as a whole':
    'доверие первому предложению вместо всего абзаца',
  'choosing a detail instead of the main idea': 'выбор детали вместо главной мысли',
  'not yet separating two close headings by the one word that differs':
    'пока не получается развести два близких заголовка по единственному слову, которым они отличаются',
  'matching words rather than meaning': 'подбор по совпадению слов, а не по смыслу',
  'reading the question too quickly': 'слишком быстрое чтение вопроса',

  /* reportTrends.ts: the fallback shown on /report when a stored mistake
     reasonId no longer matches anything in the list it came from (content
     renamed or removed after the id was recorded). */
  'Another reason': 'Другая причина',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
