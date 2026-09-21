/* Russian: Mr EZ's interface.
   Batch owner: the tutor agent. Nobody else edits this file.

   Covers: src/components/tutor/* chrome (panel, welcome, memory,
   "explain this result", the ask-why-wrong button) and the deterministic
   sentences produced in src/lib/tutor/insights.ts, recommend.ts and
   local.ts.

   Mr EZ's own generated speech is not a dictionary job: the Worker is told
   which language to answer in. Only the fixed wording around him lives here.

   Known gap: src/lib/tutor/insights.ts, recommend.ts, catalog.ts, week.ts,
   units.ts, assessment.ts, prompt.ts, schema.ts, test-items.ts and
   wrong-items.ts are shared with the Cloudflare Worker and out of this
   batch's scope (see .tmp/I18N-BATCH-BRIEF.md). Sentences and recommendation
   labels/reasons produced by those files, plus any error text a Worker
   response supplies directly (body.error in src/lib/tutor/client.ts) and
   Mr EZ's own model replies, stay in English for a Russian student until
   those files get an explicit-locale pass. That is a known and accepted gap,
   not an oversight in this file.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* Suggested questions (MrEzPanel.tsx). Sent to the model as the student's
     own message, so translating them is fine: a Russian question is a valid
     question. "Task Response" is an assessment criterion name and stays in
     English inside the Russian sentence. */
  'How is this paper marked?': 'Как оценивается эта работа?',
  'How should I split my time?': 'Как лучше распределить время?',
  'Explain this lesson in simpler words': 'Объясни этот урок проще',
  'What is the most common mistake here?': 'Какая здесь самая частая ошибка?',
  'How is this tested in the exam?': 'Как это проверяется на экзамене?',
  'What should I practise next?': 'Что мне попрактиковать дальше?',
  'How am I doing against my target band?': 'Как у меня дела относительно целевого балла?',
  'What does Task Response actually mean?': 'Что на самом деле значит Task Response?',

  /* Panel chrome (MrEzPanel.tsx). */
  Close: 'Закрыть',
  'Ask Mr EZ': 'Спросить Mr EZ',
  'Mr EZ, your IELTS tutor': 'Mr EZ, ваш репетитор по IELTS',
  'Invigilating: no answers until the timer stops': 'Идёт наблюдение: ответов не будет, пока не остановится таймер',
  'Simulated tutor (no AI is being called)': 'Симулированный репетитор (запрос к ИИ не отправляется)',
  'Your IELTS tutor': 'Ваш репетитор по IELTS',
  'Close Mr EZ': 'Закрыть окно Mr EZ',
  'Your next step on the dashboard still works, it just comes with a plain explanation instead of his.':
    'Ваш следующий шаг на главной странице всё равно работает, просто с обычным объяснением вместо его.',
  "Sign in and Mr EZ can see your own results. He never reads anyone else's, which is exactly why he needs to know who you are.":
    'Войдите, и Mr EZ сможет видеть ваши результаты. Он никогда не читает чужие, и именно поэтому ему нужно знать, кто вы.',
  'Sign in': 'Войти',
  'Ask me anything about IELTS, this lesson, or what to do next. I will not hand you answers during practice, but I will show you how to get them.':
    'Спрашивайте что угодно об IELTS, этом уроке или о том, что делать дальше. Я не дам готовых ответов во время практики, но покажу, как их найти.',
  'Simulated, not a real AI reply': 'Симуляция, это не настоящий ответ ИИ',
  'Mr EZ is thinking': 'Mr EZ думает',
  'Try again': 'Попробовать ещё раз',
  'Your message to Mr EZ': 'Ваше сообщение для Mr EZ',
  'Ask Mr EZ…': 'Спросите Mr EZ…',
  'Mr EZ is not available on this build': 'Mr EZ недоступен в этой версии',
  Send: 'Отправить',
  '{n} min': '{n} мин',
  'Something went wrong. Try again in a moment.': 'Что-то пошло не так. Попробуйте ещё раз через минуту.',

  /* Dashboard welcome and the one-time goal form (MrEzWelcome.tsx). */
  'Saved. Everything I suggest from here is aimed at that.': 'Сохранено. Теперь все мои советы будут учитывать эту цель.',
  'Band you need': 'Нужный балл',
  'Exam date (optional)': 'Дата экзамена (необязательно)',
  Save: 'Сохранить',

  /* What Mr EZ remembers (MrEzMemory.tsx). */
  'Band {band}, exam on {date}': 'Балл {band}, экзамен {date}',
  'Band {band}': 'Балл {band}',
  'Not set yet': 'Пока не задано',
  'Nothing in this session, plus anything saved to your account.':
    'В этой сессии ничего нет, плюс всё сохранённое в вашем аккаунте.',
  'Nothing in this session.': 'В этой сессии ничего нет.',
  'What Mr EZ remembers': 'Что помнит Mr EZ',
  'He only ever reads your own record, and only the part he needs for what you just asked.':
    'Он читает только вашу собственную историю и только ту часть, что нужна для вашего вопроса.',
  'Your goal': 'Ваша цель',
  'Change it': 'Изменить',
  'Your results': 'Ваши результаты',
  'Completed lessons, test scores and marked work. He reads these as evidence and never changes them.':
    'Пройденные уроки, результаты тестов и проверенные работы. Он использует их как доказательства и никогда не меняет.',
  'See them': 'Посмотреть',
  'Your conversation': 'Ваш разговор',
  'Mr EZ is not switched on for this build, so there is nothing stored in the cloud to clear.':
    'Mr EZ не включён в этой версии, поэтому в облаке нечего очищать.',
  'This deletes every message between you and Mr EZ, the summary he keeps of older turns, and his saved dashboard welcome.':
    'Это удалит все сообщения между вами и Mr EZ, сводку, которую он хранит о более ранних репликах, и его сохранённое приветствие на главной странице.',
  'Your lessons, test scores and marked essays are not affected.':
    'Ваши уроки, результаты тестов и проверенные эссе не затрагиваются.',
  'He will still read them afterwards. It cannot be undone.': 'Он всё равно будет читать их и дальше. Отменить это нельзя.',
  'Clearing…': 'Очищаем…',
  'Yes, clear the conversation': 'Да, очистить разговор',
  Cancel: 'Отмена',
  "Clear Mr EZ's conversation history": 'Очистить историю разговоров с Mr EZ',

  /* "Ask Mr EZ to explain this result" (ExplainResult.tsx). */
  'Mr EZ could not explain this just now.': 'Mr EZ не смог объяснить это прямо сейчас.',
  'Want this explained, and one thing to work on next?': 'Хотите разбор и одну вещь, над которой стоит поработать дальше?',
  'Mr EZ is reading it…': 'Mr EZ читает…',
  'Ask Mr EZ to explain this result': 'Попросить Mr EZ объяснить этот результат',
  'He reads the marking that has already been done. Nothing is sent for marking again.':
    'Он читает уже готовую проверку. Ничего не отправляется на повторную проверку.',
  "This band is an estimate from this platform's AI marking. It is not an official IELTS result.":
    'Этот балл получен по ИИ-проверке этой платформы и не является официальным результатом IELTS.',

  /* Weekly review (WeeklyReview.tsx). The date-range text itself
     ('{startDay} to {endDay} {month}' and
     '{startDay} {startMonth} to {endDay} {endMonth}') is the same key
     dict/ru/dashboard-plan.ts already translates for the study plan's own
     week range, so it is not repeated here; the merged dictionary supplies
     it. The month name is filled from Intl.DateTimeFormat so it follows the
     interface language automatically. */
  'Last week with Mr EZ': 'Прошлая неделя с Mr EZ',
  'This week so far': 'Эта неделя',
  'Nothing recorded in the last two weeks. Here is an easy way back in.':
    'За последние две недели ничего не записано. Вот простой способ вернуться к занятиям.',
  '{n} the week before': '{n} на прошлой неделе',
  '{active} of {planned}': '{active} из {planned}',
  'study time': 'время занятий',

  /* Unit note (UnitNote.tsx). */
  'Mr EZ on this unit': 'Mr EZ об этом разделе',

  /* Test debrief (TestDebrief.tsx). */
  'Mr EZ could not go through these just now.': 'Mr EZ не смог разобрать это прямо сейчас.',
  'Sign in and Mr EZ can go through your mistakes with you.': 'Войдите, и Mr EZ сможет разобрать ваши ошибки вместе с вами.',
  'Go through your mistakes with Mr EZ': 'Разобрать ваши ошибки с Mr EZ',
  'Mr EZ is reading them…': 'Mr EZ читает их…',
  'Go through my mistakes with Mr EZ': 'Разобрать мои ошибки с Mr EZ',
  'He read the marking that was already done. Nothing was re-scored.':
    'Он прочитал уже готовую проверку. Ничего не оценивалось заново.',

  /* Ask why wrong (AskWhyWrong.tsx). */
  'Mr EZ could not look at this one just now.': 'Mr EZ не смог посмотреть это прямо сейчас.',
  'Mr EZ is looking at it…': 'Mr EZ смотрит…',
  'Why was my answer wrong?': 'Почему мой ответ неверный?',

  /* Browser client errors (src/lib/tutor/client.ts). */
  'Mr EZ is not switched on for this build yet.': 'Mr EZ пока не включён в этой версии.',
  'Mr EZ needs accounts to be configured, because he only ever reads your own record.':
    'Для Mr EZ нужны настроенные аккаунты, ведь он читает только вашу собственную историю.',
  'Mr EZ could not be reached. Check your connection and try again.':
    'Не удалось связаться с Mr EZ. Проверьте соединение и попробуйте ещё раз.',
  'Mr EZ could not answer just now.': 'Mr EZ не смог ответить прямо сейчас.',
  'That is a bit long. Keep it under {max} characters.': 'Это немного длинно. Уложитесь в {max} символов.',
  'Sign in and Mr EZ can see your own results.': 'Войдите, и Mr EZ сможет видеть ваши результаты.',

  /* Clearing Mr EZ's memory (src/lib/tutor/conversation.ts). */
  'Cleared on this device. Nothing was stored in the cloud.': 'Очищено на этом устройстве. В облаке ничего не хранилось.',
  'Cleared on this device.': 'Очищено на этом устройстве.',
  'Some of it could not be cleared just now. Try again in a moment.':
    'Часть данных не удалось очистить прямо сейчас. Попробуйте ещё раз через минуту.',
  'Cleared his saved welcome and any weekly reviews and unit notes. There were no conversations stored. Your lessons, test scores and marked work are untouched.':
    'Очищено его сохранённое приветствие и все еженедельные обзоры и заметки по разделам. Сохранённых разговоров не было. Ваши уроки, результаты тестов и проверенные работы не затронуты.',

  /* The deterministic welcome line (src/lib/tutor/local.ts). */
  'Tell me the band you need and, if you have one, your exam date. Everything I suggest gets more specific once I know what you are aiming at.':
    'Скажите, какой балл вам нужен и, если есть, дату экзамена. Все мои советы станут точнее, как только я буду знать вашу цель.',
  'You are aiming at band {band}. There are no results on record yet, so there is nothing to estimate your current level from. Here is where to start.':
    'Ваша цель: балл {band}. Результатов пока нет, поэтому оценить ваш текущий уровень пока не по чему. Вот с чего начать.',
  'You are aiming at band {band}. Nothing in your results stands out as a weak spot yet.':
    'Ваша цель: балл {band}. Пока ни один результат не выделяется как слабое место.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  /* Composer character counter (MrEzPanel.tsx). */
  '{n} characters left': {
    one: '{n} символ остался',
    few: '{n} символа осталось',
    many: '{n} символов осталось',
    other: '{n} символа осталось',
  },

  /* Conversation summary in the memory panel (MrEzMemory.tsx). */
  '{n} messages in this session, plus anything saved to your account.': {
    one: '{n} сообщение в этой сессии, плюс всё сохранённое в вашем аккаунте.',
    few: '{n} сообщения в этой сессии, плюс всё сохранённое в вашем аккаунте.',
    many: '{n} сообщений в этой сессии, плюс всё сохранённое в вашем аккаунте.',
    other: '{n} сообщения в этой сессии, плюс всё сохранённое в вашем аккаунте.',
  },
  '{n} messages in this session.': {
    one: '{n} сообщение в этой сессии.',
    few: '{n} сообщения в этой сессии.',
    many: '{n} сообщений в этой сессии.',
    other: '{n} сообщения в этой сессии.',
  },

  /* Weekly stat chips (WeeklyReview.tsx). */
  'days studied': {
    one: 'активный день',
    few: 'активных дня',
    many: 'активных дней',
    other: 'активных дня',
  },
  lessons: {
    one: 'урок',
    few: 'урока',
    many: 'уроков',
    other: 'урока',
  },
  'practice attempts': {
    one: 'тренировочная попытка',
    few: 'тренировочные попытки',
    many: 'тренировочных попыток',
    other: 'тренировочные попытки',
  },

  /* Test debrief lead line (TestDebrief.tsx). The Russian sentence does not
     inflect with the count (it is "вы", always plural, plus a bare
     numeral), so all four forms read the same. */
  'You missed {missed} of {total}. Want to see what they have in common?': {
    one: 'Вы пропустили {missed} из {total}. Хотите увидеть, что у них общего?',
    few: 'Вы пропустили {missed} из {total}. Хотите увидеть, что у них общего?',
    many: 'Вы пропустили {missed} из {total}. Хотите увидеть, что у них общего?',
    other: 'Вы пропустили {missed} из {total}. Хотите увидеть, что у них общего?',
  },

  /* Clear-memory confirmation count (src/lib/tutor/conversation.ts). */
  'Cleared {count} conversations, everything Mr EZ had summarised from them, his saved welcome, and his weekly reviews and unit notes. Your lessons, test scores and marked work are untouched.':
    {
      one: 'Очищен {count} разговор, всё, что Mr EZ обобщил из него, его сохранённое приветствие, а также его еженедельные обзоры и заметки по разделам. Ваши уроки, результаты тестов и проверенные работы не затронуты.',
      few: 'Очищено {count} разговора, всё, что Mr EZ обобщил из них, его сохранённое приветствие, а также его еженедельные обзоры и заметки по разделам. Ваши уроки, результаты тестов и проверенные работы не затронуты.',
      many: 'Очищено {count} разговоров, всё, что Mr EZ обобщил из них, его сохранённое приветствие, а также его еженедельные обзоры и заметки по разделам. Ваши уроки, результаты тестов и проверенные работы не затронуты.',
      other:
        'Очищено {count} разговора, всё, что Mr EZ обобщил из них, его сохранённое приветствие, а также его еженедельные обзоры и заметки по разделам. Ваши уроки, результаты тестов и проверенные работы не затронуты.',
    },
};
