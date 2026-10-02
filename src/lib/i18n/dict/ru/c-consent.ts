/* Russian for consent and the student's rights (Builder C, 2 October 2026;
   docs/legal/BUILD-PLAN-2026-10-02.md): the consent at sign-up and its full
   wording (src/lib/legal/consent.ts), the parent's declaration, "Download
   my data" (src/lib/legal/export.ts), the AI labels and the "ask a person
   to review it" line, and the two new support reasons. IELTS, Mr EZ,
   Speaking and the service names stay English. The menu names follow the
   account screens: «Аккаунт», «Профиль», «Удаление аккаунта». */
export const strings: Record<string, string> = {
  /* Consent at sign-up */
  'I agree to my personal data being processed as described here, including its transfer to services outside Kazakhstan.':
    'Я согласен(на) на обработку моих персональных данных, как описано здесь, включая их передачу сервисам за пределами Казахстана.',
  'Read what this covers': 'Что входит в согласие',
  'Consent version {version}.': 'Версия согласия: {version}.',
  'The privacy notice explains all of this in full.': 'Подробно всё это описано в политике конфиденциальности.',
  'Please tick the box to agree before creating your account.': 'Чтобы создать аккаунт, отметьте галочку согласия.',
  'Please tick the box to agree before you continue.': 'Чтобы продолжить, отметьте галочку согласия.',

  /* The full wording */
  'Who processes your data': 'Кто обрабатывает ваши данные',
  'Your data is processed by {name} (IIN {iin}), who runs IELTS is EZ.': 'Ваши данные обрабатывает {name} (ИИН {iin}), владелец IELTS is EZ.',
  'Your data is processed by {name}, who runs IELTS is EZ.': 'Ваши данные обрабатывает {name}, владелец IELTS is EZ.',
  'Your data is processed by the person who runs IELTS is EZ.': 'Ваши данные обрабатывает владелец IELTS is EZ.',
  'What data': 'Какие данные',
  'Your email address, and your name if you sign in with Google.': 'Ваш адрес электронной почты, а при входе через Google и ваше имя.',
  'Your profile: first and last name, date of birth, phone, city, school, university or job, and how you found us. For a student under 18, a parent or guardian’s name and phone.':
    'Ваш профиль: имя и фамилия, дата рождения, телефон, город, школа, вуз или работа и то, как вы о нас узнали. Для ученика младше 18 лет также имя и телефон родителя или опекуна.',
  'Your study: lessons completed, answers, test results, your study plan, saved words and notes.':
    'Ваша учёба: пройденные уроки, ответы, результаты тестов, учебный план, сохранённые слова и заметки.',
  'The essays you send for AI feedback, and the feedback. Speaking recordings are sent for marking, and only the results are kept.':
    'Эссе, которые вы отправляете на проверку ИИ, и разборы к ним. Записи Speaking отправляются на оценку, а сохраняются только результаты.',
  'Your conversations with Mr EZ, and the messages you send us.': 'Ваши разговоры с Mr EZ и сообщения, которые вы отправляете нам.',
  'If you buy access: the plan, the amount, the date, the payment status and the receipt number. Card details go to the payment company, never to us.':
    'Если вы покупаете доступ: тариф, сумма, дата, статус оплаты и номер чека. Данные карты получает платёжная компания, а не мы.',
  'Why': 'Зачем',
  'To run your account and keep your work on every device.': 'Чтобы вести ваш аккаунт и сохранять вашу работу на всех устройствах.',
  'To give you the course, mark your essays and Speaking with AI, and run Mr EZ and the live examiner.':
    'Чтобы давать вам курс, оценивать ваши эссе и Speaking с помощью ИИ, а также работу Mr EZ и живого экзаменатора.',
  'To answer your messages and contact you about your studies or your account.':
    'Чтобы отвечать на ваши сообщения и связываться с вами по поводу учёбы или аккаунта.',
  'To keep the site secure and prevent misuse.': 'Чтобы защищать сайт и не допускать злоупотреблений.',
  'To sell access and keep the sales records the law requires.': 'Чтобы продавать доступ и хранить записи о продажах, которых требует закон.',
  'Who else receives it, and where': 'Кто ещё получает данные и где',
  'Supabase stores your account and your data (servers in the European Union or the United States).':
    'Supabase хранит ваш аккаунт и данные (серверы в Европейском союзе или США).',
  'OpenAI marks essays and Speaking and runs Mr EZ and the live examiner (United States).':
    'OpenAI оценивает эссе и Speaking и обеспечивает работу Mr EZ и живого экзаменатора (США).',
  'Cloudflare runs the site’s background services and its security check (servers around the world).':
    'Cloudflare обеспечивает фоновые сервисы сайта и проверку безопасности (серверы по всему миру).',
  'GitHub Pages delivers the site’s pages to your browser (United States).': 'GitHub Pages доставляет страницы сайта в ваш браузер (США).',
  'The payment company handles payments (Kazakhstan).': 'Платёжная компания проводит оплату (Казахстан).',
  'So your data is transferred outside Kazakhstan, and by agreeing you consent to that transfer.':
    'Значит, ваши данные передаются за пределы Казахстана, и, соглашаясь, вы даёте согласие на эту передачу.',
  'Nothing about you is made public.': 'Никакие сведения о вас не публикуются.',
  'How long your consent lasts': 'Сколько действует согласие',
  'While your account is open: until you withdraw it or delete your account.': 'Пока открыт ваш аккаунт: до тех пор, пока вы не отзовёте согласие или не удалите аккаунт.',
  'How to withdraw it': 'Как отозвать согласие',
  'You can withdraw your consent at any time by deleting your account: Account, then Profile, then Delete account. Everything is removed at once.':
    'Вы можете отозвать согласие в любой момент, удалив аккаунт: «Аккаунт», затем «Профиль», затем «Удаление аккаунта». Всё удаляется сразу.',
  'You can also ask us to do it through the support form.': 'Можно также попросить нас сделать это через форму поддержки.',
  'You can withdraw your consent at any time by asking us, through the support form, to close your account.':
    'Вы можете отозвать согласие в любой момент, попросив нас через форму поддержки закрыть ваш аккаунт.',
  'You can withdraw your consent at any time by asking us to close your account.': 'Вы можете отозвать согласие в любой момент, попросив нас закрыть ваш аккаунт.',
  'The site cannot keep an account without this data, so withdrawing consent closes the account.':
    'Без этих данных сайт не может вести аккаунт, поэтому отзыв согласия закрывает аккаунт.',
  'A record of each payment is kept without your name or email for 5 years, because tax law requires sales records.':
    'Запись о каждой оплате хранится без вашего имени и почты 5 лет, потому что налоговый закон требует хранить записи о продажах.',

  /* The parent or guardian's declaration (profile form, under 18) */
  'My parent or guardian agrees to me using this site, to my personal data being processed as the privacy notice describes, and to any purchase of access I make.':
    'Мой родитель или опекун согласен(на), чтобы я пользовался(ась) этим сайтом, на обработку моих персональных данных, как описано в политике конфиденциальности, и на любую мою покупку доступа.',
  'My parent or guardian agrees to me using this site and to my personal data being processed as the privacy notice describes.':
    'Мой родитель или опекун согласен(на), чтобы я пользовался(ась) этим сайтом, и на обработку моих персональных данных, как описано в политике конфиденциальности.',

  /* AI labels and a person's review */
  'Marked by AI. This band is an AI estimate, not an official IELTS score.': 'Оценено ИИ. Этот балл является оценкой ИИ, а не официальным результатом IELTS.',
  'Ask a person to review it': 'Попросить человека проверить',
  '{name} is an AI voice, not a real person. Your interview is marked by AI.': '{name} является голосом ИИ, а не реальным человеком. Ваше интервью оценивает ИИ.',
  'Mr EZ is an AI tutor, not a real person.': 'Mr EZ является ИИ-наставником, а не реальным человеком.',

  /* The two new support reasons */
  'You came here to ask for a refund. Tell us which purchase it is for, and a person will answer by email.':
    'Вы пришли сюда, чтобы запросить возврат. Напишите, о какой покупке речь, и человек ответит вам по почте.',
  'You came here to ask a person to review an AI-marked result. Tell us which essay or Speaking result it is and what you would like checked.':
    'Вы пришли сюда, чтобы попросить человека проверить результат, выставленный ИИ. Напишите, о каком эссе или результате Speaking речь и что нужно проверить.',

  /* Download my data (Account, then Profile) */
  'Your data': 'Ваши данные',
  'Download a copy of everything your account holds, as one file.': 'Скачайте копию всего, что хранится в вашем аккаунте, одним файлом.',
  'Download my data': 'Скачать мои данные',
  'Preparing…': 'Готовим…',
  'Your file is downloading.': 'Файл скачивается.',
  'Your file is downloading, but some parts could not be read just now. Try again later for a complete copy.':
    'Файл скачивается, но некоторые части сейчас не удалось прочитать. Попробуйте позже, чтобы получить полную копию.',
  'Your data could not be read just now. Please try again.': 'Сейчас не удалось прочитать ваши данные. Попробуйте ещё раз.',

  /* Inside the downloaded file */
  'Everything your IELTS is EZ account holds, and what this browser keeps for you, as read when you downloaded this file.':
    'Всё, что хранится в вашем аккаунте IELTS is EZ, и то, что этот браузер хранит для вас, на момент скачивания файла.',
  'Your details from the profile form.': 'Ваши данные из профиля.',
  'Your saved progress and study plan.': 'Ваш сохранённый прогресс и учебный план.',
  'A record of what you studied and when.': 'Запись о том, что и когда вы изучали.',
  'Your personal study plan.': 'Ваш личный учебный план.',
  'Your saved words, notes and study preferences.': 'Ваши сохранённые слова, заметки и учебные настройки.',
  'Your conversations with Mr EZ.': 'Ваши разговоры с Mr EZ.',
  'The messages in those conversations.': 'Сообщения в этих разговорах.',
  'The latest next step Mr EZ suggested.': 'Последний следующий шаг, который предложил Mr EZ.',
  'Weekly reviews and unit notes from Mr EZ.': 'Недельные обзоры и заметки к разделам от Mr EZ.',
  'Your trial, if you had one.': 'Ваш пробный период, если он был.',
  'What you used during the trial.': 'Что вы использовали во время пробного периода.',
  'Each AI assessment counted against your access.': 'Каждая оценка ИИ, учтённая в вашем доступе.',
  'Your periods of access.': 'Ваши периоды доступа.',
  'Your purchases and receipts.': 'Ваши покупки и чеки.',
  'The messages you sent us through the support form.': 'Сообщения, которые вы отправили нам через форму поддержки.',
  'A usage record for each Mr EZ reply (the AI model, its size and cost), used for spending limits.':
    'Запись об использовании для каждого ответа Mr EZ (модель ИИ, объём и стоимость), нужна для лимитов расходов.',
  'When each live Speaking interview started and ended, used for the daily limits. Your voice is never stored.':
    'Когда начиналось и заканчивалось каждое живое интервью Speaking, нужно для дневных лимитов. Ваш голос никогда не сохраняется.',
  'The AI service’s usage figures for each assessment. Never your essay, your audio or the reply.':
    'Показатели использования сервиса ИИ для каждой оценки. Никогда не ваше эссе, не запись и не ответ.',
  'Kept for spending limits and not readable from your browser. Ask us for a copy if you need it.':
    'Хранится для лимитов расходов и недоступно для чтения из браузера. Если нужна копия, напишите нам.',
  'Kept only on this device. Other devices may hold different items.': 'Хранится только на этом устройстве. На других устройствах может храниться другое.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
