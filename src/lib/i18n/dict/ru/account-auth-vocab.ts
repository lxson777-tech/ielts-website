/* Russian: account, sign-in and vocabulary.
   Batch owner: the account/auth/vocabulary agent. Nobody else edits this file.

   Covers: the sign-in, sign-up and password pages (src/components/auth/:
   SignInForm, SignUpForm, ForgotPasswordForm, fields, shell, Turnstile;
   they replaced the AuthModal popup on 24 September 2026),
   src/components/AccountMenu.tsx,
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
  /* The sign-in, sign-up and forgot-password pages (src/components/auth/). */
  'Log in': 'Войти',
  'Welcome back': 'С возвращением',
  'Sign in to carry on where you left off, on any device.': 'Войдите, чтобы продолжить с того места, где остановились, на любом устройстве.',
  'Enter your email and password.': 'Введите email и пароль.',
  'Signing in…': 'Входим…',
  or: 'или',
  'New here?': 'Впервые здесь?',
  'Create an account': 'Создать аккаунт',
  'Create your account': 'Создайте аккаунт',
  'Your course, scores and essays are saved to your account and follow you to any device.':
    'Курс, результаты и эссе сохраняются в аккаунте и доступны на любом устройстве.',
  'Create account': 'Создать аккаунт',
  'Creating your account…': 'Создаём аккаунт…',
  'Please enter a valid email address.': 'Введите правильный адрес email.',
  'No email after a few minutes? Check your spam folder, or try again with a different address.':
    'Письма нет уже несколько минут? Загляните в папку «Спам» или попробуйте другой адрес.',
  'Back to sign in': 'Назад ко входу',
  "Enter your account's email and we'll send you a link to set a new password.":
    'Введите email вашего аккаунта, и мы пришлём ссылку для нового пароля.',
  'Send reset link': 'Отправить ссылку',
  'Sending…': 'Отправляем…',
  'If there is no account with this email, no link is sent.': 'Если аккаунта с этим email нет, письмо не придёт.',
  "Passwords don't match.": 'Пароли не совпадают.',
  'We sent a confirmation link to {email}. Open it on this device to finish creating your account.':
    'Мы отправили ссылку для подтверждения на {email}. Откройте её на этом устройстве, чтобы завершить создание аккаунта.',
  'We sent a password-reset link to {email}. Open it on this device to set a new password.':
    'Мы отправили ссылку для сброса пароля на {email}. Откройте её на этом устройстве, чтобы задать новый пароль.',
  'Check your email': 'Проверьте почту',
  Email: 'Email',
  Password: 'Пароль',
  'Forgot password?': 'Забыли пароль?',
  'Confirm password': 'Подтвердите пароль',
  'Continue with Google': 'Продолжить с Google',
  'Already have an account?': 'Уже есть аккаунт?',
  'Remembered it?': 'Вспомнили пароль?',
  Done: 'Готово',

  /* src/components/auth/shell.tsx: states every account page shares, and
     Supabase's errors in plain words. */
  'Accounts are not available': 'Аккаунты недоступны',
  'Go to my dashboard': 'Перейти на главную',
  'You are signed in': 'Вы уже вошли',
  'Signed in as {email}.': 'Вы вошли как {email}.',
  'That email and password do not match. Check them and try again.':
    'Email и пароль не совпадают. Проверьте их и попробуйте ещё раз.',
  'Please open the confirmation link we emailed you first.': 'Сначала откройте ссылку для подтверждения из нашего письма.',
  'There is already an account with this email. Sign in instead.': 'Аккаунт с этим email уже есть. Просто войдите.',
  'The security check did not go through. Please try again.': 'Проверка безопасности не пройдена. Попробуйте ещё раз.',
  'Too many attempts. Please wait a minute and try again.': 'Слишком много попыток. Подождите минуту и попробуйте снова.',
  'This password has appeared in a data leak elsewhere. Please choose a different one.':
    'Этот пароль уже встречался в утечках данных на других сайтах. Выберите другой.',
  'The new password must be different from the old one.': 'Новый пароль должен отличаться от старого.',
  'Could not reach the server. Check your connection and try again.':
    'Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.',

  /* src/components/auth/fields.tsx: the password field and its rules. */
  Show: 'Показать',
  Hide: 'Скрыть',
  'At least 8 characters': 'Не меньше 8 символов',
  'At least one letter': 'Хотя бы одна буква',
  'At least one number': 'Хотя бы одна цифра',
  'Password strength': 'Надёжность пароля',
  Weak: 'Слабый',
  Fair: 'Неплохой',
  Strong: 'Надёжный',
  'Use at least 8 characters.': 'Нужно не меньше 8 символов.',
  'Add at least one letter.': 'Добавьте хотя бы одну букву.',
  'Add at least one number.': 'Добавьте хотя бы одну цифру.',

  /* src/components/auth/Turnstile.tsx: the bot check's accessible name. */
  'Security check': 'Проверка безопасности',

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
  'Password-reset links only work once and expire after a while. Ask for a fresh one and open it on this device.':
    'Ссылка для сброса пароля работает один раз и со временем устаревает. Запросите новую и откройте её на этом устройстве.',
  'Send me a new link': 'Прислать новую ссылку',
  'Password updated': 'Пароль обновлён',
  "You're signed in with your new password.": 'Вы вошли с новым паролем.',
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

  /* VocabReview.tsx: one practice round over a topic. "Next", "Correct!"
     and "Practice" are shared with other screens and live in their files. */
  'Getting your words ready…': 'Готовим слова…',
  '{current} of {total}': '{current} из {total}',
  'Choose the word that completes the sentence.': 'Выберите слово, которое подходит в предложение.',
  'Choose the word that matches this meaning.': 'Выберите слово с этим значением.',
  blank: 'пропуск',
  Meaning: 'Значение',
  'The word may change a little to fit, for example by adding -s.':
    'Форма слова может немного измениться, например, добавится окончание -s.',
  'Answer options': 'Варианты ответа',
  'Not quite. The answer is “{word}”.': 'Не совсем. Правильный ответ: «{word}».',
  'This word will come back at the end of the round.': 'Это слово ещё раз появится в конце раунда.',
  'See my results': 'Посмотреть результат',
  'Round complete': 'Раунд завершён',
  '{score} of {total} right first time': '{score} из {total} с первой попытки',
  'Words to look at again': 'Слова, которые стоит повторить',
  'Every word right first time. Well done.': 'Все слова верно с первой попытки. Отлично.',
  'Practise another round': 'Ещё один раунд',
  'Words you miss come back sooner. Words you know come back less often.':
    'Слова с ошибками вернутся скорее. Слова, которые вы знаете, будут появляться реже.',
  'Back to {topic}': 'Назад к теме {topic}',

  /* VocabTopics.tsx: the plain topic browser at /review. */
  'All topics': 'Все темы',
  'Words and phrases': 'Слова и выражения',
  'Practise these words': 'Потренировать эти слова',
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
  '{n} words': { one: '{n} слово', few: '{n} слова', many: '{n} слов', other: '{n} слова' },
};
