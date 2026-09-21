/* Russian: the workspace shell.
   Batch owner: the foundation (this batch is already done). Nobody else
   edits this file.

   Covers: the five capsule tabs and the phone tab bar
   (src/lib/platform-nav.ts as rendered by src/components/WorkspaceHeader.astro),
   the avatar menu (src/components/WorkspaceMenu.tsx), the app-route footer
   (src/components/WorkspaceFooter.astro) and the skip link in
   src/layouts/BaseLayout.astro.

   Tab labels are deliberately one short word each: the capsule row is tight
   and Russian runs 15 to 30 percent longer than English.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* The five tabs (src/lib/platform-nav.ts). */
  Today: 'Сегодня',
  Course: 'Курс',
  Practice: 'Практика',
  Tests: 'Тесты',
  Vocabulary: 'Словарь',

  /* Avatar menu (src/lib/platform-nav.ts, WORKSPACE_MENU). */
  Account: 'Аккаунт',
  'Study plan settings': 'Настройки учебного плана',
  'Saved and notes': 'Сохранённое и заметки',
  'Progress report': 'Отчёт о прогрессе',
  'Lessons library': 'Библиотека уроков',
  'What each band needs': 'Что нужно для каждого балла',
  'Model answers': 'Образцы ответов',
  'Cue cards': 'Карточки заданий',

  /* Avatar button, identity line and auth actions (WorkspaceMenu.tsx). */
  'Open menu': 'Открыть меню',
  'Close menu': 'Закрыть меню',
  'Signed in as': 'Вы вошли как',
  'Sign in': 'Войти',
  'Sign out': 'Выйти',
  Language: 'Язык',

  /* Header and skip link (WorkspaceHeader.astro, BaseLayout.astro). */
  Workspace: 'Рабочая область',
  'IELTS is EZ workspace': 'Рабочая область IELTS is EZ',
  'Skip to content': 'Перейти к содержимому',

  /* App-route footer (WorkspaceFooter.astro). */
  Help: 'Помощь',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
