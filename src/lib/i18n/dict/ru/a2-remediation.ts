/* Russian: buying access, the return page, "Your access" and receipts
   (audit remediation, builder A2). Batch owner: builder A2 (29 September
   2026). Nobody else edits this file.

   Covers: src/components/trial/TrialPlans.tsx (the purchase state),
   src/components/access/** and the access strings in AccountSettings. The
   plan names, prices sentence and the paid allowance sentence are already in
   dict/ru/trial.ts and dict/ru/a1-remediation.ts and are not repeated.

   Style as docs/I18N-GUIDE.md: plain, polite "вы", IELTS and Mr EZ stay in
   Latin letters. */

export const strings: Record<string, string> = {
  /* The SIMULATED banner */
  'SIMULATED payments': 'СИМУЛЯЦИЯ оплаты',
  'This is a local test. No money is taken and nothing here is a real purchase.':
    'Это локальная проверка. Деньги не списываются, и ничего здесь не является настоящей покупкой.',
  'SIMULATED payment': 'СИМУЛЯЦИЯ оплаты',
  'No money was taken. This receipt is a local test, not a real one.':
    'Деньги не списывались. Этот чек из локальной проверки, он не настоящий.',

  /* The access strip */
  'Checking your access…': 'Проверяем ваш доступ…',
  'You are not signed in': 'Вы не вошли в аккаунт',
  'Sign in to buy. Your access belongs to your account and works on every device.':
    'Войдите, чтобы купить. Доступ привязан к вашему аккаунту и работает на любом устройстве.',
  'We could not check your access': 'Не удалось проверить ваш доступ',
  'Your purchases and your work are safe. Please try again.': 'Ваши покупки и ваша работа в сохранности. Попробуйте ещё раз.',
  'Full access until {date}': 'Полный доступ до {date}',
  'Buying again adds more time after this date. Nothing renews by itself.':
    'Новая покупка добавит время после этой даты. Ничего не продлевается само.',
  'Your free trial runs until {date}': 'Бесплатный пробный период действует до {date}',
  'Full access starts as soon as your payment is confirmed.': 'Полный доступ откроется, как только оплата будет подтверждена.',
  'Your full access ended on {date}': 'Ваш полный доступ закончился {date}',
  'Your results are kept. Choose a plan to continue.': 'Ваши результаты сохранены. Выберите тариф, чтобы продолжить.',
  'Your free trial ended on {date}': 'Бесплатный пробный период закончился {date}',
  'You do not have full access yet': 'У вас пока нет полного доступа',
  'Purchase history': 'История покупок',

  /* The plans page */
  'Add more time.': 'Добавьте времени.',
  'Taking you to payment…': 'Переходим к оплате…',
  'This takes a few seconds. Please keep this page open.': 'Это займёт несколько секунд. Не закрывайте эту страницу.',
  'Buy one month': 'Купить один месяц',
  'Buy three months': 'Купить три месяца',
  'Sign in to buy': 'Войти, чтобы купить',
  'Adds to your current access, which then runs until {date}.':
    'Добавится к вашему текущему доступу, и он продлится до {date}.',
  'One payment buys a fixed period that simply ends. Nothing renews and you are never charged again automatically. Purchases are not refunded, so the free trial is the time to try the course.':
    'Одна оплата даёт доступ на фиксированный срок, который просто заканчивается. Ничего не продлевается, и повторных автоматических списаний нет. Деньги за покупку не возвращаются, поэтому попробуйте курс в бесплатный пробный период.',
  'Terms of use': 'Условия использования',
  Privacy: 'Конфиденциальность',

  /* Checkout problems */
  'This plan is not available right now.': 'Этот тариф сейчас недоступен.',
  'You have started too many purchases in the last hour. Please try again in an hour.':
    'За последний час вы начали слишком много покупок. Попробуйте снова через час.',
  'The payment page could not be opened. Nothing was charged. Please try again shortly.':
    'Не удалось открыть страницу оплаты. Деньги не списаны. Попробуйте ещё раз чуть позже.',
  'Payment is not connected yet.': 'Оплата пока не подключена.',
  'Please sign in again to buy access.': 'Войдите снова, чтобы купить доступ.',
  'You seem to be offline. Nothing has changed. Please try again once you are connected.':
    'Похоже, нет подключения к интернету. Ничего не изменилось. Попробуйте снова, когда связь появится.',
  'We could not reach payments just now. Nothing has changed. Please try again.':
    'Сейчас не удалось связаться с платёжной системой. Ничего не изменилось. Попробуйте ещё раз.',

  /* An unfinished purchase */
  'Payment confirmed': 'Оплата подтверждена',
  'Your access has been updated.': 'Ваш доступ обновлён.',
  'That payment was not completed': 'Эта оплата не была завершена',
  'Your access has not changed. You can choose a plan again whenever you like.':
    'Ваш доступ не изменился. Вы можете снова выбрать тариф в любое время.',
  'You have an unfinished purchase': 'У вас есть незавершённая покупка',
  '{plan}, started on {date}. If you closed the payment page, you can check it again or start again.':
    '{plan}, начата {date}. Если вы закрыли страницу оплаты, можно проверить покупку ещё раз или начать заново.',
  'We have not had a confirmation for it yet. If you already paid, give it a few minutes and check again. If you did not finish paying, start again.':
    'Подтверждения пока нет. Если вы уже оплатили, подождите несколько минут и проверьте снова. Если вы не закончили оплату, начните заново.',
  'We could not check it just now. Nothing has changed. Please try again.':
    'Сейчас не удалось это проверить. Ничего не изменилось. Попробуйте ещё раз.',
  'Checking…': 'Проверяем…',
  'Check again': 'Проверить ещё раз',
  'Start again': 'Начать заново',

  /* The return page */
  'We could not find this purchase': 'Не удалось найти эту покупку',
  'This link does not name a purchase. Your plans and any purchases you made are in your account.':
    'В этой ссылке нет покупки. Тарифы и все ваши покупки есть в вашем аккаунте.',
  'Back to plans': 'Вернуться к тарифам',
  'Your account': 'Ваш аккаунт',
  'Sign in to see this purchase': 'Войдите, чтобы увидеть эту покупку',
  'A purchase belongs to the account that made it. Sign in with that account and this page will check it.':
    'Покупка принадлежит аккаунту, с которого её сделали. Войдите в этот аккаунт, и страница её проверит.',
  'Confirming your payment…': 'Подтверждаем вашу оплату…',
  'This usually takes a few seconds. Please keep this page open.': 'Обычно это занимает несколько секунд. Не закрывайте эту страницу.',
  'You’re in.': 'Готово, вы с нами.',
  'You have full access until {date}. Every lesson, test and practice tool is open.':
    'У вас полный доступ до {date}. Открыты все уроки, тесты и тренажёры.',
  'Your full access is open. Every lesson, test and practice tool is open.':
    'Полный доступ открыт. Открыты все уроки, тесты и тренажёры.',
  'Go to Today': 'Перейти к «Сегодня»',
  'View receipt': 'Посмотреть чек',
  'We’re confirming your payment': 'Мы подтверждаем вашу оплату',
  'The payment provider has not confirmed it yet. If you paid, your access opens as soon as it does, on any device. If you closed the payment page before paying, you can start again from the plans page.':
    'Платёжная система ещё не подтвердила оплату. Если вы оплатили, доступ откроется сразу после подтверждения, на любом устройстве. Если вы закрыли страницу оплаты, не заплатив, можно начать заново на странице тарифов.',
  'You cancelled the payment': 'Вы отменили оплату',
  'Payment was not completed': 'Оплата не завершена',
  'Payment was not completed. Your access has not changed.': 'Оплата не завершена. Ваш доступ не изменился.',
  'The payment did not go through. Your access has not changed.': 'Оплата не прошла. Ваш доступ не изменился.',
  'This purchase was refunded': 'За эту покупку сделан возврат',
  'The access it paid for has ended. Your results are kept.': 'Доступ по этой покупке закончился. Ваши результаты сохранены.',
  'It is not on the account you are signed in with. If you bought with a different account, sign in with that one.':
    'Её нет в аккаунте, в который вы вошли. Если вы покупали с другого аккаунта, войдите в него.',
  'We could not check this purchase just now': 'Сейчас не удалось проверить эту покупку',
  'Nothing has changed on our side. If you paid, your access opens as soon as the payment is confirmed. Please try again.':
    'С нашей стороны ничего не изменилось. Если вы оплатили, доступ откроется, как только оплата будет подтверждена. Попробуйте ещё раз.',

  /* "Your access" on /account */
  'Add more time': 'Добавить время',
  'Buy access again': 'Купить доступ снова',
  'Your access': 'Ваш доступ',
  'What your account can open, and every purchase you have made.': 'Что открыто в вашем аккаунте, и все ваши покупки.',
  'Full access includes': 'Полный доступ включает:',
  'The full course and every practice test.': 'Полный курс и все тренировочные тесты.',
  'We could not load your purchases just now. Please try again.': 'Сейчас не удалось загрузить ваши покупки. Попробуйте ещё раз.',
  'No purchases yet.': 'Покупок пока нет.',
  Paid: 'Оплачено',
  Refunded: 'Возврат',
  'Not completed': 'Не завершено',
  Cancelled: 'Отменено',
  'Not finished': 'Не закончено',

  /* The receipt */
  'Back to your account': 'Вернуться в аккаунт',
  'We could not find this receipt': 'Не удалось найти этот чек',
  'This link does not name a purchase.': 'В этой ссылке нет покупки.',
  'Sign in to see this receipt': 'Войдите, чтобы увидеть этот чек',
  'A receipt belongs to the account that made the purchase.': 'Чек принадлежит аккаунту, с которого сделана покупка.',
  'It is not on the account you are signed in with.': 'Его нет в аккаунте, в который вы вошли.',
  'We could not load this receipt just now': 'Сейчас не удалось загрузить этот чек',
  'Nothing has changed. Please try again.': 'Ничего не изменилось. Попробуйте ещё раз.',
  'There is no receipt for this purchase': 'Для этой покупки нет чека',
  'A receipt is issued once a payment is confirmed. This purchase was not paid.':
    'Чек выдаётся после подтверждения оплаты. Эта покупка не была оплачена.',
  Receipt: 'Чек',
  'This purchase was refunded.': 'За эту покупку сделан возврат.',
  Account: 'Аккаунт',
  'Receipt number': 'Номер чека',
  Date: 'Дата',
  /* "Plan" as in the plan bought (a trainer's "Plan" is a writing plan). */
  'purchasePlan': 'Тариф',
  'Access period': 'Срок доступа',
  '{from} to {to}': 'с {from} по {to}',
  Amount: 'Сумма',
  Status: 'Статус',
  'Refunded on {date}': 'Возврат {date}',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
