/* Russian: account, sign-in and vocabulary.
   Batch owner: the account/auth/vocabulary agent. Nobody else edits this file.

   Covers: src/components/AuthModal.tsx, src/components/AccountMenu.tsx,
   src/components/ResetPassword.tsx, src/components/SavedItems.tsx,
   src/components/VocabReview.tsx, src/components/VocabTopics.tsx,
   src/components/WordOfTheDay.astro, src/components/VocabQuizInit.astro,
   and the "Accounts are not configured for this site yet." style messages
   in src/lib/auth/session.ts.

   The English vocabulary items themselves (words, definitions, examples,
   topic names, collocations) stay in English; their surrounding chrome
   (buttons, labels, empty states, session summaries) is this batch's job.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {
  /* AuthModal.tsx: sign in / sign up / forgot password / magic link. */
  'Log in': 'Войти',
  'Sync your course progress and scores across devices.': 'Синхронизируйте прогресс по курсу и результаты на всех устройствах.',
  'Create your account': 'Создайте аккаунт',
  'Save your course progress, essays and scores, and sync them across devices.':
    'Сохраняйте прогресс по курсу, эссе и результаты, синхронизируя их на всех устройствах.',
  'Create account': 'Создать аккаунт',
  /* ctx 'modal': the /reset-password PAGE heading (pages.ts) uses the same
     English text with its own Russian wording, so this modal title is kept
     apart with a ctx (see AuthModal.tsx) rather than colliding on one key. */
  ['modalReset your password']: 'Сбросьте пароль',
  "We'll email you a link to set a new one.": 'Мы отправим вам письмо со ссылкой для нового пароля.',
  'Send reset link': 'Отправить ссылку',
  'Email me a link': 'Прислать мне ссылку',
  "We'll email you a one-time link, no password needed.": 'Мы отправим вам одноразовую ссылку, пароль не понадобится.',
  'Send sign-in link': 'Отправить ссылку для входа',
  'Maybe later': 'Может быть, позже',
  "Passwords don't match.": 'Пароли не совпадают.',
  'Password must be at least 6 characters.': 'Пароль должен содержать не менее 6 символов.',
  'We sent a confirmation link to {email}. Open it on this device to finish creating your account.':
    'Мы отправили ссылку для подтверждения на {email}. Откройте её на этом устройстве, чтобы завершить создание аккаунта.',
  'We sent a password-reset link to {email}. Open it on this device to set a new password.':
    'Мы отправили ссылку для сброса пароля на {email}. Откройте её на этом устройстве, чтобы задать новый пароль.',
  'We sent a sign-in link to {email}. Open it on this device to finish.':
    'Мы отправили ссылку для входа на {email}. Откройте её на этом устройстве, чтобы завершить вход.',
  'Check your email': 'Проверьте почту',
  Email: 'Email',
  Password: 'Пароль',
  'Forgot password?': 'Забыли пароль?',
  'Confirm password': 'Подтвердите пароль',
  'Please wait…': 'Подождите…',
  'Continue with Google': 'Продолжить с Google',
  'Email me a sign-in link instead': 'Прислать мне ссылку для входа',
  'Already have an account?': 'Уже есть аккаунт?',
  'Remembered it?': 'Вспомнили пароль?',
  'Back to log in': 'Назад ко входу',
  "Don't have an account?": 'Нет аккаунта?',
  'Sign up': 'Зарегистрироваться',
  Done: 'Готово',

  /* AccountMenu.tsx: the nav's compact account widget. */
  Account: 'Аккаунт',
  'Signed in as': 'Вы вошли как',
  'Progress is syncing to your account.': 'Прогресс синхронизируется с вашим аккаунтом.',
  'Continue course': 'Продолжить курс',
  'Start the course': 'Начать курс',
  'Loading…': 'Загрузка…',
  'Every lesson, in the right order': 'Все уроки по порядку',
  'All lessons complete 🎉': 'Все уроки пройдены 🎉',
  'My progress': 'Мой прогресс',
  'Sign out': 'Выйти',

  /* ResetPassword.tsx: the "forgot password" email-link landing page. */
  'Link expired or invalid': 'Ссылка устарела или недействительна',
  'Password-reset links only work once and expire after a while. Open the site, click {login}, then {forgot} to request a fresh one.':
    'Ссылка для сброса пароля работает один раз и со временем становится недействительной. Откройте сайт, нажмите {login}, затем {forgot}, чтобы запросить новую.',
  'Back to home': 'Вернуться на главную',
  'Password updated': 'Пароль обновлён',
  "You're signed in with your new password.": 'Вы вошли с новым паролем.',
  'Go to my account': 'Перейти в аккаунт',
  'Set a new password': 'Задайте новый пароль',
  'Choose a new password for your account.': 'Выберите новый пароль для аккаунта.',
  'New password': 'Новый пароль',
  'Confirm new password': 'Подтвердите новый пароль',
  'Saving…': 'Сохранение…',
  'Set new password': 'Задать новый пароль',

  /* SavedItems.tsx: /account's "Saved" section (bookmarks + notes). */
  'Save a lesson or a tricky question and it will appear here.': 'Сохраните урок или сложный вопрос, и они появятся здесь.',
  Lesson: 'Урок',
  Question: 'Вопрос',
  Remove: 'Удалить',
  Notes: 'Заметки',
  'Empty note': 'Пустая заметка',

  /* VocabReview.tsx: one flashcard session over a topic's deck. */
  Again: 'Снова',
  Hard: 'Сложно',
  Good: 'Хорошо',
  Easy: 'Легко',
  'later today': 'сегодня позже',
  Flashcards: 'Карточки',
  'Loading your deck…': 'Загружаем карточки…',
  '{current} of {total}': '{current} из {total}',
  '{word}: definition shown, tap to hide': '{word}: значение показано, нажмите, чтобы скрыть',
  '{word}: tap or press space to reveal the definition': '{word}: нажмите или используйте пробел, чтобы увидеть значение',
  'Tap the card or press space to reveal': 'Нажмите на карточку или используйте пробел, чтобы открыть',
  'Rate how well you knew this word': 'Оцените, насколько хорошо вы знали это слово',
  'Session complete': 'Тренировка завершена',
  "You're all caught up": 'Все карточки повторены',
  'Nothing from {topic} is due right now. Come back tomorrow for more.':
    'Из темы {topic} пока нечего повторять. Возвращайтесь завтра.',
  'Due now': 'К повторению',
  'New left today': 'Новых осталось',
  Learned: 'Изучено',
  'Reviewed today': 'Повторено сегодня',
  'Words you struggle with': 'Слова, которые даются сложнее',
  'Review more': 'Повторить ещё',
  'Back to {topic}': 'Назад к теме {topic}',

  /* VocabTopics.tsx: the plain topic browser at /review. */
  'All topics': 'Все темы',
  'Words and phrases': 'Слова и выражения',
  'Practise this topic with flashcards': 'Потренировать эту тему с карточками',
  Dashboard: 'Дашборд',
  Vocabulary: 'Словарь',
  'Every IELTS topic, its vocabulary, meanings and examples. Pick a topic to see it all at once.':
    'Каждая тема IELTS, её словарь, значения и примеры. Выберите тему, чтобы увидеть всё сразу.',

  /* WordOfTheDay.astro: the vocabulary spotlight card. */
  'Vocabulary Spotlight': 'Слово дня',
  'Tap the word to reveal its meaning': 'Нажмите на слово, чтобы увидеть значение',
  'Next word': 'Следующее слово',

  /* src/lib/auth/session.ts: shown when no Supabase project is configured. */
  'Accounts are not configured for this site yet.': 'Аккаунты на этом сайте пока не настроены.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {
  /* Keyed by the English "other" form exactly as written at the call site
     (docs/I18N-GUIDE.md), not the singular. */
  '{n} days': { one: '{n} день', few: '{n} дня', many: '{n} дней', other: '{n} дня' },
  '{n} months': { one: '{n} месяц', few: '{n} месяца', many: '{n} месяцев', other: '{n} месяца' },
  '{n} years': { one: '{n} год', few: '{n} года', many: '{n} лет', other: '{n} года' },
  'You reviewed {n} words this session.': {
    one: 'Вы повторили {n} слово в этой тренировке.',
    few: 'Вы повторили {n} слова в этой тренировке.',
    many: 'Вы повторили {n} слов в этой тренировке.',
    other: 'Вы повторили {n} слова в этой тренировке.',
  },
  '{n} words': { one: '{n} слово', few: '{n} слова', many: '{n} слов', other: '{n} слова' },
};
