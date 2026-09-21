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
};
