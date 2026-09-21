/* Russian: the Today block and "Your route".
   Batch owner: WP8 (personal learning build). Nobody else edits this file.

   Covers: src/components/learning/today/*, src/components/plan/PlanToday.tsx,
   src/components/plan/WeekView.tsx, src/components/tutor/MrEzWelcome.tsx (the
   Today voice), src/components/Course.tsx, src/components/CourseGate.tsx and
   the shared "next" control at the bottom of src/layouts/LessonLayout.astro.

   Several short words this file needs (Reading, Continue, Vocabulary, Rest,
   Review, "Simulated, not a real AI reply", "{n} min" and so on) already
   have entries in other batch files and are deliberately NOT repeated here:
   the dictionary is one merged object, and every caller finds them there
   regardless of which file supplied them.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* todayViewModel.ts: SessionStepRole labels */
  Recall: 'Повторение материала',
  Teach: 'Объяснение',
  Practise: 'Практика',
  Feedback: 'Разбор ответов',
  'Independent check': 'Самостоятельная проверка',
  Recap: 'Итог',
  'First look': 'Первый взгляд',

  /* todayViewModel.ts: PAPER_LABEL */
  Reading: 'Чтение',
  Listening: 'Аудирование',
  Writing: 'Письмо',
  Speaking: 'Говорение',

  /* TodaySession.tsx: intake screen */
  "Let's set your goal": 'Определим вашу цель',
  'One short question set makes every suggestion here specific to you instead of generic.':
    'Один короткий опрос делает каждую подсказку здесь конкретной для вас, а не общей.',

  /* TodaySession.tsx: exam date passed */
  'Your exam date has passed': 'Дата вашего экзамена уже прошла',
  'Set a new exam date or a new goal and your study session will rebuild around it. This is never a sign you are finished.':
    'Укажите новую дату экзамена или новую цель, и ваше занятие перестроится вокруг неё. Это никогда не значит, что вы закончили.',
  'Set a new date or goal': 'Указать новую дату или цель',

  /* TodaySession.tsx: finished today */
  'Today, done': 'Сегодня сделано',
  'This showed guided and independent work on today\'s objective. It is not a band and it is not the whole picture, one session is one data point.':
    'Это показало и практику с подсказками, и самостоятельную работу над сегодняшней целью. Это не балл и не полная картина, одно занятие это одна точка данных.',
  'Still unknown: {papers}.': 'Пока неизвестно: {papers}.',
  'A new session is ready tomorrow, or whenever your plan next calls for one.':
    'Новое занятие будет готово завтра, или когда ваш план в следующий раз это предложит.',

  /* TodaySession.tsx: broken / storage */
  'Today could not be worked out on this device right now. Reloading the page usually fixes this.':
    'Не удалось построить сегодняшнее занятие на этом устройстве. Обычно помогает перезагрузка страницы.',
  'Your device storage is full, so today is not being saved here. Free up some space or sign in to keep it safe.':
    'Память устройства заполнена, поэтому сегодняшнее занятие здесь не сохраняется. Освободите немного места или войдите в аккаунт, чтобы не потерять прогресс.',
  'This browser is blocking local storage, so today is not being saved on this device. Private browsing does this.':
    'Этот браузер блокирует локальное хранилище, поэтому сегодняшнее занятие не сохраняется на этом устройстве. Так бывает в приватном режиме.',
  'Nothing can be saved on this device right now.': 'Сейчас на этом устройстве ничего нельзя сохранить.',

  /* TodaySession.tsx: the active session */
  '{n} days to your exam': 'До экзамена {n} дн.',
  'About {n} minutes today.': 'Сегодня примерно {n} мин.',
  'Your regular day is {n} minutes.': 'Ваш обычный день это {n} мин.',
  Start: 'Начать',
  'Give it the time it needs ({n} min)': 'Дать этому нужное время ({n} мин)',
  'This is a short first look, not a full result.': 'Это короткий первый взгляд, а не полный результат.',
  'Not now': 'Не сейчас',
  'Why this': 'Почему это',
  'I have less time today': 'Сегодня у меня меньше времени',
  'Choose another skill': 'Выбрать другой раздел',
  'Every paper has at least a first look recorded.': 'По каждому разделу есть хотя бы первый взгляд.',
  '{n} planned study days were missed recently; this session was rebuilt around that.':
    'Недавно было пропущено {n} запланированных дней занятий; это занятие перестроено с учётом этого.',
  'Your regular {n} minutes a day is unchanged. This only shortens today.':
    'Ваши обычные {n} мин. в день не меняются. Это сокращает только сегодня.',
  'Not yet assessed: {papers}.': 'Пока не оценено: {papers}.',

  /* LearningDashboard.tsx: quiet sidebar context */
  'Focus areas': 'На что обратить внимание',
  'Has evidence recorded': 'Есть накопленные данные',
  'Not yet assessed': 'Пока не оценено',

  /* WeekView.tsx */
  'The week ahead': 'Неделя впереди',
  'Your rolling schedule': 'Ваше скользящее расписание',
  'Every day within its own time budget. Only today is fixed; the rest adjusts as you go.':
    'Каждый день в пределах своего времени. Фиксирован только сегодняшний день, остальное подстраивается по ходу дела.',
  'Exam day': 'День экзамена',
  'Timed practice': 'Практика на время',

  /* Course.tsx: "Your route" */
  'No confirmed goal yet, {minutes} min a day for now': 'Цель пока не подтверждена, пока {minutes} мин в день',
  'no exam date yet': 'дата экзамена пока не указана',
  'Milestones ahead': 'Вехи впереди',
  'Exam practice': 'Практика перед экзаменом',
  'Full timed papers and your record, whenever you want them, outside today\'s session.':
    'Полные тесты на время и ваша статистика, когда захотите, отдельно от сегодняшнего занятия.',
  'All practice tests': 'Все тренировочные тесты',
  'Your progress report': 'Ваш отчёт о прогрессе',
  'Why your plan changed recently': 'Почему ваш план недавно изменился',

  /* CourseGate.tsx */
  'Your route': 'Ваш маршрут',
  'Browse all lessons': 'Все уроки',
  'This plan is saved on this device. Sign in to keep it synced across your devices too.':
    'Этот план сохранён на этом устройстве. Войдите в аккаунт, чтобы он синхронизировался и на других устройствах.',

  /* LessonLayout.astro: the shared "next" control */
  "Back to today's session": 'Вернуться к сегодняшнему занятию',
  'Next step: {title}': 'Следующий шаг: {title}',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
