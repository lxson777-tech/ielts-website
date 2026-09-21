/* Russian: new strings from the personal-learning account, report and
   tutor surfaces work package (WP9), 2026-09-22.

   New keys only. Every string that already existed before this package
   (AccountMenu.tsx's sign-in chrome, ProgressReport.tsx's plan/consistency/
   lessons/tests tables, WeeklyReview.tsx, ExplainResult.tsx, TestDebrief.tsx,
   UnitNote.tsx's component chrome) keeps its translation in the batch file
   that already owned it (account-auth-vocab.ts, dashboard-plan.ts, tutor.ts);
   this file is additive, not a replacement for those.

   Covers: src/components/AccountMenu.tsx (the studied-percent line),
   src/components/AccountOverview.tsx (the shared-session course summary),
   src/components/ProgressReport.tsx (the estimated-time label and the
   skill-trends heading), src/components/SkillTrendGrid.tsx and
   src/components/reportTrends.ts (the four skill trend panels),
   src/components/tutor/ProposalCard.tsx (reconciling a suggestion into the
   plan, used by ExplainResult.tsx and TestDebrief.tsx).

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* AccountMenu.tsx: the nav's compact account widget now shows the shared
     session's real objective as its subtitle (untranslated English, same as
     everywhere else the planner's own sentences appear), with the library
     percentage relabelled as studied rather than a bare number. */
  '{percent}% of lessons studied': '{percent}% уроков изучено',
  '{percent}% studied': '{percent}% изучено',

  /* AccountOverview.tsx: the course summary card. */
  '{done} of {total} lessons studied': '{done} из {total} уроков изучено',

  /* ProgressReport.tsx */
  'Estimated study time': 'Примерное время занятий',
  'Skill trends': 'Динамика по навыкам',

  /* SkillTrendGrid.tsx: one card per paper (Reading, Listening, Writing,
     Speaking, left untranslated as protected exam names). */
  band: 'балл',
  '{low} to {high}': 'от {low} до {high}',
  'Self-reported only, not measured here yet.': 'Только со слов студента, здесь пока не измерено.',
  'Not measured yet.': 'Пока не измерено.',
  'Meets your target of band {band}': 'Соответствует вашей цели: балл {band}',
  'Needs band {band} for your target': 'Для вашей цели нужен балл {band}',
  'Each skill is its own estimate. They are never averaged into one line, because a Reading band and a Writing band are not the same scale.':
    'Каждый навык оценивается отдельно. Они никогда не усредняются в одну линию, потому что балл по Reading и балл по Writing относятся к разным шкалам.',

  /* reportTrends.ts: the five certainty words and the trend direction,
     shown through CERTAINTY_LABEL and trendDirectionKey. Exactly the five
     words the brief names, kept short since they sit in a small badge. */
  Unknown: 'Неизвестно',
  'Self-reported': 'Со слов студента',
  'Limited evidence': 'Мало данных',
  Tentative: 'Предварительно',
  Measured: 'Измерено',
  Improving: 'Растёт',
  Slipping: 'Снижается',
  Steady: 'Стабильно',
  'No evidence yet': 'Пока нет данных',

  /* ProposalCard.tsx: reconciling one of Mr EZ's suggestions into the plan
     (ExplainResult.tsx, TestDebrief.tsx). */
  'Added. This is your next step now.': 'Добавлено. Теперь это ваш следующий шаг.',
  'Added to your plan. It will come up as your next step when it fits your schedule.':
    'Добавлено в ваш план. Это станет вашим следующим шагом, когда подойдёт по расписанию.',
  'This is already your next step.': 'Это уже ваш следующий шаг.',
  'A suggestion for later': 'Предложение на потом',
  'Do this next': 'Сделать следующим',
  'Worth a look, not on your plan yet': 'Стоит посмотреть, в план пока не добавлено',

  /* ── WP23, 2026-09-22: progress report, weekly review, current level and
     account/memory second pass ── */

  /* CurrentLevel.tsx */
  'Nothing measured yet. Your plan already has a first step chosen for you.':
    'Пока ничего не измерено. В вашем плане уже выбран первый шаг.',
  "Go to today's session": 'Перейти к сегодняшнему занятию',
  'Still unknown: {list}.': 'Пока неизвестно: {list}.',
  'Estimated from your recent evidence, weighted towards your latest attempts. It is a study guide, not an official IELTS result.':
    'Оценка по вашим недавним данным, с упором на последние попытки. Это ориентир для учёбы, а не официальный результат IELTS.',
  'Based on very little practice so far, or on a self-reported score rather than something measured here. Treat this as a first impression, not a score.':
    'Основано на очень небольшой практике или на балле, названном вами самостоятельно, а не измеренном здесь. Считайте это первым впечатлением, а не баллом.',
  'Built from a solid spread of recent attempts across all four papers.':
    'Построено на достаточном количестве недавних попыток по всем четырём разделам.',

  /* ProgressReport.tsx: the four-question detail and the teacher review
     summary. */
  'What each paper tells us': 'Что говорит каждый раздел',
  'What improved': 'Что улучшилось',
  'Nothing to report yet from independent evidence alone.':
    'Пока нечего сообщить только по самостоятельным попыткам.',
  'What remains uncertain': 'Что остаётся неясным',
  'Nothing flagged as uncertain right now.': 'Сейчас ничего не отмечено как неясное.',
  'What to work on next': 'Над чем работать дальше',
  'What changed in the schedule, and why': 'Что изменилось в расписании и почему',
  'No change to the schedule for this paper recently.':
    'По этому разделу расписание недавно не менялось.',
  '{paper}: band {band} ({status})': '{paper}: балл {band} ({status})',
  'Teacher review summary': 'Сводка для учителя',
  'Generated locally from your own data and never sent anywhere. Print or save this whole page as a PDF to share it.':
    'Формируется локально на основе ваших данных и никуда не отправляется. Чтобы поделиться, распечатайте или сохраните всю страницу как PDF.',
  Goals: 'Цели',
  'No goal set yet.': 'Цель пока не задана.',
  'Self-reported scores': 'Баллы, указанные самостоятельно',
  '{paper}: band {band}, taken {date}': '{paper}: балл {band}, сдан {date}',
  'Overall: band {band}, taken {date}': 'Общий: балл {band}, сдан {date}',
  'Flagged for a teacher': 'Отмечено для учителя',
  '{scope}: no improvement after {n} attempts in a row':
    '{scope}: нет улучшения после {n} попыток подряд',
  'Nothing currently flagged.': 'Сейчас ничего не отмечено.',
  'How much was not counted, and why': 'Сколько не засчитано и почему',
  'Recent independent evidence': 'Недавние самостоятельные результаты',
  'No independent evidence recorded yet.': 'Пока нет самостоятельных результатов.',
  "The student's own account of mistakes": 'Объяснения ошибок от студента',
  "In the student's own words. Never a finding on its own, always tentative.":
    'В собственных словах студента. Само по себе это не вывод, всегда предварительно.',
  'Recent plan changes': 'Недавние изменения плана',
  'No plan changes recorded yet.': 'Пока нет изменений плана.',
  confirmed: 'подтверждено',
  provisional: 'предварительно',

  /* reportTrends.ts: paperNarratives, recentIndependentEvidence's outcome
     summaries. Paper names inside these sentences stay English (protected
     exam vocabulary), filled through {paper} by the render site. */
  'Your independent {paper} evidence is trending up, about {trend} bands over your recent attempts.':
    'Ваши самостоятельные результаты по {paper} растут, примерно на {trend} балла за последние попытки.',
  '{scope} is improving on independent attempts.': '{scope} улучшается в самостоятельных попытках.',
  '{scope} is now a demonstrated strength.': '{scope} теперь подтверждённая сильная сторона.',
  '{paper} has never been sampled, so nothing about it is known yet.':
    '{paper} ещё ни разу не проверялся, поэтому о нём пока ничего не известно.',
  '{paper} has no usable evidence yet.': 'По {paper} пока нет пригодных данных.',
  '{paper} rests on a self-reported score only, not on anything measured here.':
    '{paper} основан только на балле, указанном самостоятельно, а не на измерениях здесь.',
  '{paper} evidence is real but coarse: older, migrated results with no per-question detail, so it is kept to limited confidence.':
    'Данные по {paper} реальны, но грубые: старые перенесённые результаты без детализации по вопросам, поэтому уверенность ограничена.',
  '{paper} is still tentative: seen, but not yet enough to call it a settled pattern.':
    '{paper} пока предварительно: данные есть, но их ещё недостаточно, чтобы назвать устойчивой закономерностью.',
  'The most recent {paper} evidence is old enough that it no longer counts as current.':
    'Последние данные по {paper} уже достаточно старые и больше не считаются актуальными.',
  '{paper} evidence is ageing. A fresh attempt would sharpen this.':
    'Данные по {paper} устаревают. Новая попытка уточнит картину.',
  '{scope} has not improved after {n} attempts in a row. This has been flagged for a teacher to look at.':
    '{scope} не улучшается уже {n} попыток подряд. Это отмечено для внимания учителя.',
  "This is today's focus: {objective}": 'Сегодняшний фокус: {objective}',
  '{paper} already meets your goal. It stays in rotation for review, not because it is a gap.':
    '{paper} уже соответствует вашей цели. Он остаётся в ротации для повторения, а не потому что это пробел.',
  '{paper} is your biggest current gap against your goal. The shared plan will turn to it next.':
    '{paper} сейчас ваш самый большой пробел относительно цели. Общий план скоро перейдёт к нему.',
  "{paper} is priority {n} of the papers with a gap left, behind today's focus.":
    '{paper} на {n} месте по приоритету среди разделов с пробелом, после сегодняшнего фокуса.',
  '{paper} has no goal set yet, so it has no ranked priority. Set one in your plan settings.':
    'Для {paper} пока не задана цель, поэтому приоритет не определён. Задайте её в настройках плана.',
  '{raw} of {total} (band {band})': '{raw} из {total} (балл {band})',
  '{raw} of {total}': '{raw} из {total}',
  Met: 'Выполнено',
  'Not yet met': 'Пока не выполнено',
  '{correct} of {reviewed} recalled': '{correct} из {reviewed} вспомнено',
  Studied: 'Изучено',

  /* MrEzMemory.tsx: "What your plan knows about you" and the override
     labels. */
  'Shorter day on {date}: {minutes} minutes': 'Короткий день {date}: {minutes} минут',
  'Chose to work on {paper} on {date}': 'Выбрано занятие по {paper} {date}',
  'Chose a specific objective on {date}': 'Выбрана конкретная цель {date}',
  'Skipping one activity until {until}': 'Одно занятие пропускается до {until}',
  'Skipping one activity until you choose it again':
    'Одно занятие пропускается, пока вы не выберете его снова',
  'Agreed to a longer session on {date} ({minutes} minutes)':
    'Согласие на более длинное занятие {date} ({minutes} минут)',
  'Put off the {paper} diagnostic until {until}': 'Диагностика по {paper} отложена до {until}',
  'Put off the {paper} diagnostic until you start it':
    'Диагностика по {paper} отложена, пока вы её не начнёте',
  'Rest day on {date}': 'День отдыха {date}',
  'A plan override': 'Изменение плана',
  'Band {band} (a placeholder, not yet confirmed)': 'Балл {band} (черновой вариант, ещё не подтверждён)',
  'Exam on {date}': 'Экзамен {date}',
  'Exam date {date} (a placeholder, not yet confirmed)':
    'Дата экзамена {date} (черновой вариант, ещё не подтверждена)',
  'No exam date set': 'Дата экзамена не задана',
  'What your plan knows about you': 'Что ваш план знает о вас',
  'Exactly what is stored, in plain words. Change any of it in the form above.':
    'Именно то, что сохранено, простыми словами. Изменить это можно в форме выше.',
  'Per-paper minimums': 'Минимумы по разделам',
  'None set; your overall target applies to every paper.':
    'Не заданы; ваша общая цель применяется ко всем разделам.',
  'Regular daily time': 'Обычное время в день',
  'a placeholder, not yet confirmed': 'черновой вариант, ещё не подтверждён',
  'Explanation language': 'Язык объяснений',
  Russian: 'Русский',
  English: 'Английский',
  'Papers still unknown': 'Разделы, которые ещё неизвестны',
  'None. Every paper has at least some evidence.': 'Нет. По каждому разделу есть хоть какие-то данные.',
  'Overrides in force': 'Действующие изменения плана',
  'Dated ones clear on their own once the date passes. To change one before then, make a different choice from Today.':
    'Те, что привязаны к дате, снимаются сами после её наступления. Чтобы изменить раньше, сделайте другой выбор на странице «Сегодня».',
  'None right now.': 'Сейчас нет.',

  /* WeeklyReview.tsx: all four papers, and effort against the goal. */
  'This week, by paper': 'На этой неделе по разделам',
  'No practice this week': 'На этой неделе практики не было',
  '{n} band short of your goal': 'До цели не хватает {n} балла',
};

/* Keyed by the English `other` form, exactly like every other batch file
   (see pluralWith in src/lib/i18n/translate.ts): one entry per counted
   phrase, whatever its singular happens to look like. */
export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  /* SkillTrendGrid.tsx: how much was studied for one paper, kept apart from
     the certainty badge above it (studied is never mastery). */
  '{n} lessons or drills studied': {
    one: 'изучено {n} занятие',
    few: 'изучено {n} занятия',
    many: 'изучено {n} занятий',
    other: 'изучено {n} занятия',
  },
  /* reportTrends.ts: freshnessCountForms, one set of forms per state so a
     Russian student reads a real day count, not a fixed word. */
  'Checked {n} days ago': {
    one: 'Проверено {n} день назад',
    few: 'Проверено {n} дня назад',
    many: 'Проверено {n} дней назад',
    other: 'Проверено {n} дня назад',
  },
  'Last checked {n} days ago': {
    one: 'В последний раз проверено {n} день назад',
    few: 'В последний раз проверено {n} дня назад',
    many: 'В последний раз проверено {n} дней назад',
    other: 'В последний раз проверено {n} дня назад',
  },
  'Stale, last checked {n} days ago': {
    one: 'Устарело, проверено {n} день назад',
    few: 'Устарело, проверено {n} дня назад',
    many: 'Устарело, проверено {n} дней назад',
    other: 'Устарело, проверено {n} дня назад',
  },

  /* CurrentLevel.tsx: how many of the four papers are measured so far. */
  'Measured on {n} of 4 papers so far. Once all four have real evidence, one overall band appears here.': {
    one: 'Пока измерен {n} раздел из 4. Как только у всех четырёх появятся реальные данные, здесь появится общий балл.',
    few: 'Пока измерено {n} раздела из 4. Как только у всех четырёх появятся реальные данные, здесь появится общий балл.',
    many: 'Пока измерено {n} разделов из 4. Как только у всех четырёх появятся реальные данные, здесь появится общий балл.',
    other: 'Пока измерено {n} раздела из 4. Как только у всех четырёх появятся реальные данные, здесь появится общий балл.',
  },

  /* ProgressReport.tsx: the "how much was not counted, and why" list. One
     entry per IgnoredReason (reportTrends.ts's IGNORED_REASONS). */
  '{n} submissions were left blank, so they were not counted.': {
    one: '{n} попытка была сдана пустой, поэтому не засчитана.',
    few: '{n} попытки были сданы пустыми, поэтому не засчитаны.',
    many: '{n} попыток были сданы пустыми, поэтому не засчитаны.',
    other: '{n} попытки были сданы пустыми, поэтому не засчитаны.',
  },
  '{n} attempts were abandoned partway through, so they were not counted.': {
    one: '{n} попытка была брошена на середине, поэтому не засчитана.',
    few: '{n} попытки были брошены на середине, поэтому не засчитаны.',
    many: '{n} попыток были брошены на середине, поэтому не засчитаны.',
    other: '{n} попытки были брошены на середине, поэтому не засчитаны.',
  },
  '{n} attempts were repeats of material you had already seen, so they are not counted as new proof.': {
    one: '{n} попытка была повтором уже знакомого материала, поэтому не засчитана как новое доказательство.',
    few: '{n} попытки были повтором уже знакомого материала, поэтому не засчитаны как новое доказательство.',
    many: '{n} попыток были повтором уже знакомого материала, поэтому не засчитаны как новое доказательство.',
    other: '{n} попытки были повтором уже знакомого материала, поэтому не засчитаны как новое доказательство.',
  },
  '{n} results came from a stand-in grader, not the real one, so they were not counted.': {
    one: '{n} результат получен от временной, не настоящей проверки, поэтому не засчитан.',
    few: '{n} результата получены от временной, не настоящей проверки, поэтому не засчитаны.',
    many: '{n} результатов получены от временной, не настоящей проверки, поэтому не засчитаны.',
    other: '{n} результата получены от временной, не настоящей проверки, поэтому не засчитаны.',
  },
  '{n} results were simulated for testing, so they were not counted.': {
    one: '{n} результат был смоделирован для тестирования, поэтому не засчитан.',
    few: '{n} результата были смоделированы для тестирования, поэтому не засчитаны.',
    many: '{n} результатов были смоделированы для тестирования, поэтому не засчитаны.',
    other: '{n} результата были смоделированы для тестирования, поэтому не засчитаны.',
  },
  '{n} results were replaced by later, corrected ones, so the earlier ones were not counted.': {
    one: '{n} результат был заменён более поздним, исправленным, поэтому более ранний не засчитан.',
    few: '{n} результата были заменены более поздними, исправленными, поэтому более ранние не засчитаны.',
    many: '{n} результатов были заменены более поздними, исправленными, поэтому более ранние не засчитаны.',
    other: '{n} результата были заменены более поздними, исправленными, поэтому более ранние не засчитаны.',
  },
  '{n} results were about an older version of the material, so they were not counted.': {
    one: '{n} результат относился к более старой версии материала, поэтому не засчитан.',
    few: '{n} результата относились к более старой версии материала, поэтому не засчитаны.',
    many: '{n} результатов относились к более старой версии материала, поэтому не засчитаны.',
    other: '{n} результата относились к более старой версии материала, поэтому не засчитаны.',
  },
  '{n} scores were told to us by you rather than measured here, so they are kept separate.': {
    one: '{n} балл был указан вами самостоятельно, а не измерен здесь, поэтому учитывается отдельно.',
    few: '{n} балла были указаны вами самостоятельно, а не измерены здесь, поэтому учитываются отдельно.',
    many: '{n} баллов были указаны вами самостоятельно, а не измерены здесь, поэтому учитываются отдельно.',
    other: '{n} балла были указаны вами самостоятельно, а не измерены здесь, поэтому учитываются отдельно.',
  },
  '{n} results are old enough that they no longer count as current.': {
    one: '{n} результат уже достаточно старый и больше не считается актуальным.',
    few: '{n} результата уже достаточно старые и больше не считаются актуальными.',
    many: '{n} результатов уже достаточно старые и больше не считаются актуальными.',
    other: '{n} результата уже достаточно старые и больше не считаются актуальными.',
  },

  /* MrEzMemory.tsx: the regular daily commitment, "what your plan knows". */
  '{n} minutes a day': {
    one: '{n} минута в день',
    few: '{n} минуты в день',
    many: '{n} минут в день',
    other: '{n} минуты в день',
  },

  /* WeeklyReview.tsx: attempts per paper this week. */
  '{n} attempts this week': {
    one: '{n} попытка на этой неделе',
    few: '{n} попытки на этой неделе',
    many: '{n} попыток на этой неделе',
    other: '{n} попытки на этой неделе',
  },
};
