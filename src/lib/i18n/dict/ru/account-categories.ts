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
  /* Delete my account (src/components/AccountSettings.tsx, AccountDeleted.tsx). */
  "Delete account": "Удаление аккаунта",
  "Removes your account and all your data at once. This cannot be undone.": "Сразу удаляет ваш аккаунт и все ваши данные. Это нельзя отменить.",
  "Delete my account": "Удалить мой аккаунт",
  "Deleting your account removes, immediately and for good: your details, your progress and results, your essays and speaking feedback, your saved items and notes, your study plan, your conversations with Mr EZ and your messages to us. Any access you have paid for ends.": "Удаление аккаунта сразу и навсегда стирает: ваши данные, прогресс и результаты, эссе и разборы ответов Speaking, сохранённое и заметки, учебный план, переписку с Mr EZ и ваши сообщения нам. Оплаченный доступ прекращается.",
  "Only a record of each payment is kept, without your name or email, because the law requires sales records to be kept.": "Остаётся только запись о каждой оплате, без вашего имени и почты, потому что закон требует хранить записи о продажах.",
  "I understand that my account and all my data will be deleted and cannot be recovered.": "Я понимаю, что мой аккаунт и все мои данные будут удалены и их нельзя будет восстановить.",
  "Deleting…": "Удаляем…",
  "Delete my account and all my data": "Удалить аккаунт и все мои данные",
  "Sign in to delete your account.": "Войдите, чтобы удалить аккаунт.",
  "Back to the home page": "Вернуться на главную",
  "Can I use the platform in Russian or Kazakh?": "Можно ли пользоваться платформой на русском или казахском?",
  "Your account has been deleted": "Ваш аккаунт удалён",
  "Your account and all your data have been removed. Thank you for studying with us.": "Ваш аккаунт и все ваши данные удалены. Спасибо, что занимались с нами.",
  "You can create a new account at any time. It will start empty.": "Вы можете в любой момент создать новый аккаунт. Он начнётся с чистого листа.",
  /* /privacy, account removal with self-service deletion. */
  "Still being decided: how long information is kept while an account stays open. This page will say so once it is.": "Ещё решается: как долго хранятся данные, пока аккаунт открыт. Когда решение будет принято, оно появится на этой странице.",
  "You can delete your account yourself at any time: open Account, then Profile, then Delete account.": "Вы можете сами удалить аккаунт в любой момент: откройте «Аккаунт», затем «Профиль», затем «Удаление аккаунта».",
  "Everything is removed at once and cannot be recovered: your details, your progress and results, your essays and speaking feedback, your saved items and notes, your study plan, your conversations with Mr EZ and your messages to us. Any access you have paid for ends.": "Всё удаляется сразу и без возможности восстановления: ваши данные, прогресс и результаты, эссе и разборы ответов Speaking, сохранённое и заметки, учебный план, переписка с Mr EZ и ваши сообщения нам. Оплаченный доступ прекращается.",
  "A record of each payment (the plan, the amount, the date and the receipt number) is kept without your name or email, because sales records must be kept by law.": "Запись о каждой оплате (тариф, сумма, дата и номер чека) сохраняется без вашего имени и почты, потому что записи о продажах по закону нужно хранить.",
  /* LiveExaminer: a start the browser itself could not complete. */
  'Could not connect to the examiner just now. Check your internet connection and press Start again.': 'Не удалось подключиться к экзаменатору. Проверьте подключение к интернету и нажмите «Начать интервью» ещё раз.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
