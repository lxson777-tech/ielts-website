/* Russian for the legal pages of the paid site (Builder L, 2 October 2026;
   docs/legal/BUILD-PLAN-2026-10-02.md): the public offer (/terms on the
   gated build, TermsDocument.tsx), the refund line beside the plans
   (PurchaseTerms.tsx), the privacy notice (/privacy), the refund answer on
   /help, the seller's details (src/lib/legal/offer.ts, the receipt and the
   workspace footer).

   Words kept the same everywhere: "публичная оферта" for the public offer,
   "продавец" for the seller, "практика и сопровождение" for what paying
   adds, "проверка" for an AI assessment, "вступительный тест" and "пробный
   экзамен" as elsewhere, "возврат" for a refund. IELTS, Mr EZ and the paper
   names stay English. The sales page keeps its own bilingual table
   (src/marketing/sales-copy.ts). */
export const strings: Record<string, string> = {
  /* Seller details (src/lib/legal/offer.ts) */
  'Committee for the Protection of Consumer Rights of the Ministry of Trade and Integration of the Republic of Kazakhstan':
    'Комитет по защите прав потребителей Министерства торговли и интеграции Республики Казахстан',
  'Seller, sole trader': 'Продавец, индивидуальный предприниматель',
  IIN: 'ИИН',
  Registration: 'Регистрация',
  'Registered address': 'Юридический адрес',
  'Centre address': 'Адрес центра',
  Phone: 'Телефон',
  'Working hours': 'Часы работы',
  Seller: 'Продавец',
  'Public offer': 'Публичная оферта',

  /* The public offer (gated build) */
  'The agreement for practice and guidance': 'Договор на практику и сопровождение',
  'This page is a public offer: the seller’s proposal to anyone who wants practice and guidance on IELTS is EZ. Paying for it means you accept everything on this page, so please read it before you buy.':
    'Эта страница является публичной офертой: предложением продавца каждому, кто хочет получить практику и сопровождение на IELTS is EZ. Оплачивая их, вы принимаете всё, что написано на этой странице, поэтому прочитайте её до покупки.',
  'Version of {date}': 'Редакция от {date}',
  '1. Who sells': '1. Кто продаёт',
  'IELTS is EZ is run and sold by a sole trader registered in Kazakhstan:':
    'IELTS is EZ ведёт и продаёт индивидуальный предприниматель, зарегистрированный в Казахстане:',
  'It is private preparation for the IELTS test, not an official or state-recognised course.':
    'Это частная подготовка к экзамену IELTS, а не официальный или признанный государством курс.',
  '2. What is sold': '2. Что продаётся',
  'Practice and guidance: {days} days of access for {price}, paid once.':
    'Практика и сопровождение: доступ на {days} дней за {price}, оплата один раз.',
  'Every practice exercise and timed test, with band estimates. Reading and Listening practice has no limit.':
    'Все упражнения и тесты на время, с примерной оценкой балла. Практика Reading и Listening без ограничений.',
  '{essays} essay assessments, {speaking} recorded Speaking assessments (up to 5 minutes each) and {live} live interviews with the AI examiner, with feedback (up to 15 minutes each).':
    'Проверки эссе: {essays}. Проверки записей Speaking до 5 минут каждая: {speaking}. Устные собеседования с ИИ-экзаменатором и разбором, до 15 минут каждое: {live}.',
  '{mock} full mock exams, and the placement test once per account. Essays written in a mock exam or the placement test count towards the essay assessments.':
    'Полные пробные экзамены: {mock}, и вступительный тест, один раз на аккаунт. Эссе в пробном экзамене и во вступительном тесте входят в число проверок эссе.',
  'Mr EZ, your personal AI tutor, and the practice in your personal study plan.':
    'Mr EZ, ваш личный ИИ-репетитор, и практика из вашего личного учебного плана.',
  'Unused assessments expire at the end of the {days} days.': 'Неиспользованные проверки сгорают по окончании {days} дней.',
  '3. What stays free': '3. Что остаётся бесплатным',
  '4. How the agreement is made': '4. Как заключается договор',
  'You accept this offer by paying for practice and guidance on the Plans page. The agreement is made when your payment is confirmed.':
    'Вы принимаете эту оферту, оплачивая практику и сопровождение на странице тарифов. Договор заключён, когда оплата подтверждена.',
  'Your access starts as soon as the payment is confirmed. If you already have access, the new {days} days start when your current ones end.':
    'Доступ открывается сразу после подтверждения оплаты. Если у вас уже есть доступ, новые {days} дней начнутся, когда закончатся текущие.',
  'You pay on the payment company’s own page. Your card details never reach this site.':
    'Оплата проходит на странице платёжной компании. Данные вашей карты никогда не попадают на этот сайт.',
  'A receipt for each payment is on your Account page, together with the date your access ends.':
    'Квитанция по каждой оплате есть на странице аккаунта, там же указана дата окончания доступа.',
  '{days} days of access. It ends on its own. Nothing renews, so you are never charged automatically.':
    'Доступ на {days} дней. Он заканчивается сам. Автоматического продления и списания нет.',
  '5. Refunds': '5. Возврат денег',
  'You can ask for a refund at any time during your {days} days.': 'Попросить возврат можно в любой момент в течение ваших {days} дней.',
  'We pay back the share of the price you have not used. The used share is the larger of two: the days of access that have started, out of {days}, and the AI assessments you have used (essays, recorded Speaking and live interviews), out of the {included} your purchase includes.':
    'Мы возвращаем неиспользованную часть цены. Использованная часть считается по большему из двух: доля начавшихся дней доступа из {days} и доля использованных проверок ИИ (эссе, записи Speaking и устные собеседования) из {included}, которые входят в покупку.',
  'The refund is the price multiplied by the unused share, rounded down to whole tenge.':
    'Сумма возврата равна цене, умноженной на неиспользованную долю, с округлением вниз до целых тенге.',
  'An example': 'Пример',
  'Day {day} of {days}: {percent}% of the days have started.': 'День {day} из {days}: началось {percent}% дней.',
  '{used} of {included} assessments used: {percent}%.': 'Использовано проверок: {used} из {included}, это {percent}%.',
  'The larger share, {percent}%, counts as used.': 'Использованной считается большая доля: {percent}%.',
  'Refund: {percent}% of {price}, which is {refund}.': 'Возврат: {percent}% от {price}, то есть {refund}.',
  'When the refund is made, your access and any assessments left on it end. Everything you saved stays on your account, and your lessons stay open.':
    'После возврата доступ и оставшиеся по нему проверки заканчиваются. Всё сохранённое остаётся в вашем аккаунте, а уроки остаются открытыми.',
  'The money goes back to the card or account you paid with, within {n} working days of your request being accepted. Your bank may take a few more days to show it.':
    'Деньги возвращаются на карту или счёт, с которых вы платили, в течение {n} рабочих дней после того, как запрос принят. Банку может понадобиться ещё несколько дней, чтобы их зачислить.',
  'Once your {days} days have ended, there is nothing left to refund.': 'Когда ваши {days} дней закончились, возвращать уже нечего.',
  'How to ask for a refund': 'Как попросить возврат',
  'Through the support form:': 'Через форму поддержки:',
  'ask for a refund': 'попросить возврат',
  'Or by email to the seller:': 'Или письмом продавцу:',
  'Please give the email address of your account, so we can find your purchase.':
    'Укажите адрес электронной почты своего аккаунта, чтобы мы нашли вашу покупку.',
  '6. Questions and complaints': '6. Вопросы и жалобы',
  'Write to us through the support form or by email. A person reads every message and replies by email.':
    'Пишите нам через форму поддержки или по электронной почте. Каждое сообщение читает человек и отвечает по электронной почте.',
  'We answer every complaint in writing, with our reasons, within {n} calendar days.':
    'На каждую жалобу мы отвечаем письменно и с объяснением причин в течение {n} календарных дней.',
  'If you are not satisfied with our answer, you can turn to the consumer protection authority:':
    'Если наш ответ вас не устроит, вы можете обратиться в уполномоченный орган по защите прав потребителей:',
  'You also have the right to go to court.': 'Также вы вправе обратиться в суд.',
  '7. Artificial intelligence (AI)': '7. Искусственный интеллект (ИИ)',
  'The feedback on essays and recorded Speaking, Mr EZ and the live examiner are AI. The live examiner’s voice is an AI voice, not a real person.':
    'Разбор эссе и записей Speaking, Mr EZ и устный экзаменатор работают на искусственном интеллекте. Голос экзаменатора создан ИИ, это не живой человек.',
  'AI band scores are estimates against the public IELTS band descriptors. They are not official IELTS results and do not guarantee your test score.':
    'Баллы от ИИ примерные и опираются на открытые критерии оценки IELTS. Это не официальные результаты IELTS и не гарантия балла на экзамене.',
  'If you disagree with an AI result, a person will review it on request.':
    'Если вы не согласны с результатом ИИ, по вашему запросу его проверит человек.',
  'Ask for a review': 'Попросить проверку человеком',
  '8. Students under 18': '8. Ученики младше 18 лет',
  'If you are under 18, a parent or guardian must agree to the purchase. Please read this page with them before you buy.':
    'Если вам меньше 18 лет, на покупку нужно согласие родителя или опекуна. Прочитайте эту страницу вместе с ними до покупки.',
  'The profile of a student under 18 also asks for a parent or guardian’s details and agreement.':
    'В профиле ученика младше 18 лет также указываются данные и согласие родителя или опекуна.',
  '9. Changes to this offer': '9. Изменения оферты',
  'The seller may update this offer. The version date at the top of this page shows which version is in force.':
    'Продавец может обновлять эту оферту. Дата редакции в начале страницы показывает, какая редакция действует.',
  'A purchase follows the version in force on the day you paid. A change never raises the price of a purchase already made and never takes away what it includes.':
    'Покупка действует по той редакции, которая была в силе в день оплаты. Изменения никогда не повышают цену уже сделанной покупки и не убирают то, что в неё входит.',
  '10. When your access ends': '10. Когда доступ заканчивается',

  /* The open site's terms and the purchase facts */
  'Updated 2 October 2026': 'Обновлено 2 октября 2026 года',
  'You can ask for a refund at any time during the 30 days. We pay back the share you have not used.':
    'В течение 30 дней можно в любой момент попросить возврат. Мы вернём неиспользованную часть оплаты.',
  'How refunds work': 'Как устроен возврат',

  /* /help */
  'Practice and guidance last 30 days and then simply end. Nothing renews. The Plans page shows the price and what 30 days include.':
    'Практика и сопровождение действуют 30 дней и просто заканчиваются. Ничего не продлевается. Цена и то, что входит в 30 дней, указаны на странице тарифов.',
  'Can I get a refund?': 'Можно ли вернуть деньги?',
  'Yes. You can ask for a refund at any time during the 30 days, and we pay back the share you have not used. The used share is the larger of the days that have started and the AI assessments you have used.':
    'Да. В течение 30 дней можно в любой момент попросить возврат, и мы вернём неиспользованную часть оплаты. Использованная часть считается по большему из двух: сколько дней доступа уже началось и сколько проверок ИИ вы использовали.',
  'Ask through the support form, choosing a refund, or by email to the seller. The public offer has the full rule and a worked example.':
    'Напишите через форму поддержки, выбрав возврат, или письмом продавцу. Полное правило и пример расчёта есть в публичной оферте.',

  /* /privacy (gated build) */
  'This is the privacy notice of IELTS is EZ: who is responsible for your information, what is collected and why, who else receives it, how long it is kept and what your rights are. Only what the site actually does, in plain words.':
    'Это политика конфиденциальности IELTS is EZ: кто отвечает за ваши данные, что собирается и зачем, кто ещё их получает, сколько они хранятся и какие у вас права. Только то, что сайт действительно делает, простыми словами.',
  'Version of 2 October 2026, the same version as the consent you give when you create your account.':
    'Редакция от 2 октября 2026 года, та же редакция, что и у согласия, которое вы даёте при создании аккаунта.',
  'Your information is handled by the seller of IELTS is EZ, a sole trader registered in Kazakhstan. The seller is the operator of your personal data: the one who decides how it is used and is responsible for keeping it safe.':
    'Вашими данными занимается продавец IELTS is EZ, индивидуальный предприниматель, зарегистрированный в Казахстане. Продавец является оператором ваших персональных данных: он решает, как они используются, и отвечает за их защиту.',
  'Why we use it, and on what basis': 'Зачем мы используем данные и на каком основании',
  'To create and run your account, open your lessons and keep your progress on all your devices.':
    'Чтобы создать и вести ваш аккаунт, открывать уроки и сохранять прогресс на всех ваших устройствах.',
  'To mark your essays and Speaking with AI, and to run Mr EZ and the live examiner.':
    'Чтобы проверять ваши эссе и Speaking с помощью ИИ и чтобы работали Mr EZ и устный экзаменатор.',
  'To sell practice and guidance, count its included assessments and keep a receipt for each payment.':
    'Чтобы продавать практику и сопровождение, считать входящие в них проверки и хранить квитанцию по каждой оплате.',
  'To answer your messages and requests.': 'Чтобы отвечать на ваши сообщения и запросы.',
  'To keep the service safe and fair, for example with daily limits.':
    'Чтобы сервис оставался безопасным и честным для всех, например с помощью дневных лимитов.',
  'To keep the sales records the tax law requires.': 'Чтобы хранить записи о продажах, которых требует налоговое законодательство.',
  'We use your information because you agree to it. You give your consent when you create your account, and a parent or guardian gives it for a student under 18. You can withdraw it at any time (see Your rights below).':
    'Мы используем ваши данные, потому что вы на это согласны. Вы даёте согласие при создании аккаунта, а за ученика младше 18 лет его даёт родитель или опекун. Отозвать согласие можно в любой момент (см. раздел «Ваши права» ниже).',
  'Sales records are kept after that because the tax law requires them.':
    'Записи о продажах хранятся и после этого, потому что их требует налоговое законодательство.',
  'Your information is never sold, never used for advertising and never made public.':
    'Ваши данные никогда не продаются, не используются для рекламы и не публикуются.',
  'Who else receives it, and where': 'Кто ещё получает данные и где',
  'These companies handle your information for the site, only for the work described here:':
    'Эти компании обрабатывают ваши данные для сайта и только для описанной здесь работы:',
  'Writes the AI feedback and Mr EZ’s replies, and runs the live examiner. Your essay text, your Speaking recording, your voice in a live interview, and your questions to Mr EZ with a summary of your own results are sent to OpenAI for this.':
    'Пишет разборы ИИ и ответы Mr EZ и ведёт устного экзаменатора. Для этого в OpenAI отправляются текст вашего эссе, ваша запись Speaking, ваш голос на устном собеседовании и ваши вопросы к Mr EZ со сводкой ваших собственных результатов.',
  'Runs the small services that check your account and pass your work to OpenAI, so the AI keys never reach your browser, and the security check on the support form.':
    'Запускает небольшие сервисы, которые проверяют ваш аккаунт и передают вашу работу в OpenAI, чтобы ключи ИИ никогда не попадали в ваш браузер, а также проверку безопасности в форме поддержки.',
  'Serves the pages of the site. Like any website host, it receives your connection’s address when your browser loads a page.':
    'Отдаёт страницы сайта. Как и любой хостинг, он получает адрес вашего подключения, когда браузер загружает страницу.',
  'The payment company': 'Платёжная компания',
  'Takes your payment on its own page and confirms it to the site. It will be named here once it is chosen.':
    'Принимает оплату на своей странице и подтверждает её сайту. Её название появится здесь, когда она будет выбрана.',
  'Outside Kazakhstan: the European Union or the United States.': 'За пределами Казахстана: в Европейском союзе или в США.',
  'The United States.': 'США.',
  'A worldwide network, with servers in many countries.': 'Всемирная сеть с серверами во многих странах.',
  'Kazakhstan.': 'Казахстан.',
  'Some of these companies are outside Kazakhstan, so your information is sent abroad. You agree to this as part of your consent.':
    'Некоторые из этих компаний находятся за пределами Казахстана, поэтому ваши данные передаются за границу. Вы соглашаетесь на это в рамках своего согласия.',
  'In a live Speaking interview, your voice goes straight from your browser to OpenAI. It does not pass through this site, which keeps only a short record of when the interview started and ended, to apply the limits.':
    'На устном собеседовании Speaking ваш голос идёт напрямую из браузера в OpenAI. Он не проходит через этот сайт: сайт хранит только короткую запись о том, когда собеседование началось и закончилось, чтобы соблюдать лимиты.',
  'How long it is kept': 'Сколько хранятся данные',
  'Your account and everything in it': 'Ваш аккаунт и всё, что в нём',
  'While your account is open. When you delete your account, it is all deleted at once.':
    'Пока аккаунт открыт. Когда вы удаляете аккаунт, всё удаляется сразу.',
  'Your consent': 'Ваше согласие',
  'The record of when you gave it is kept with your account and deleted with it.':
    'Запись о том, когда вы его дали, хранится вместе с аккаунтом и удаляется вместе с ним.',
  'Payment records': 'Записи об оплатах',
  'Kept for 5 years as anonymous sale records, because the tax law requires it, then deleted.':
    'Хранятся 5 лет как обезличенные записи о продажах, потому что этого требует налоговое законодательство, затем удаляются.',
  'Messages sent without signing in': 'Сообщения, отправленные без входа в аккаунт',
  'Kept for 12 months, then deleted automatically.': 'Хранятся 12 месяцев, затем удаляются автоматически.',
  'The scrambled code of your connection': 'Зашифрованный код вашего подключения',
  'Kept for 24 hours, only to limit how often one sender can write.':
    'Хранится 24 часа, только чтобы ограничивать, как часто может писать один отправитель.',
  'What OpenAI receives': 'Что получает OpenAI',
  'OpenAI may keep it for up to 30 days to check for misuse, then deletes it, unless the law requires longer. It does not use it to train its models. This site also tells OpenAI not to store the replies it writes.':
    'OpenAI может хранить эти данные до 30 дней, чтобы проверять злоупотребления, затем удаляет их, если закон не требует хранить дольше. OpenAI не использует их для обучения своих моделей. Кроме того, сайт просит OpenAI не сохранять написанные ответы.',
  'Cookies and your browser': 'Cookie и ваш браузер',
  'This site keeps only your sign-in, your study progress and settings such as your language in your browser. There are no advertising or analytics cookies.':
    'В вашем браузере сайт хранит только вход в аккаунт, ваш учебный прогресс и настройки, например язык. Рекламных и аналитических cookie нет.',
  'Your rights': 'Ваши права',
  'To know what information we hold about you and how it is used, and to get a copy. We answer within 3 working days.':
    'Знать, какие данные о вас у нас есть и как они используются, и получить их копию. Мы отвечаем в течение 3 рабочих дней.',
  'To have information corrected, blocked or deleted if it is wrong or held unlawfully. We do this within 1 working day of confirming it.':
    'Исправить, заблокировать или удалить данные, если они неверны или хранятся незаконно. Мы делаем это в течение 1 рабочего дня после подтверждения.',
  'To delete your account and everything in it, at any time.': 'Удалить свой аккаунт и всё, что в нём, в любой момент.',
  'To withdraw your consent. We stop using your information and delete it within 15 working days, except the records the law requires us to keep. The site cannot run an account without it, so withdrawing consent closes your account.':
    'Отозвать согласие. Мы перестаём использовать ваши данные и удаляем их в течение 15 рабочих дней, кроме записей, которые закон требует хранить. Без согласия сайт не может вести аккаунт, поэтому отзыв согласия закрывает аккаунт.',
  'To object to an AI result and have a person review it.': 'Возразить против результата ИИ и попросить, чтобы его проверил человек.',
  'How to use them': 'Как ими воспользоваться',
  'Download my data: open Account, then Profile. You get a copy of what your account holds.':
    'Скачать мои данные: откройте «Аккаунт», затем «Профиль». Вы получите копию того, что хранится в вашем аккаунте.',
  'Delete account: open Account, then Profile.': 'Удалить аккаунт: откройте «Аккаунт», затем «Профиль».',
  'Anything else: write through the support form.': 'По любому другому вопросу: напишите через форму поддержки.',
  'Using your rights is free.': 'Воспользоваться своими правами можно бесплатно.',
  'Marking by AI': 'Проверка с помощью ИИ',
  'Your essays and Speaking are marked automatically by AI, and Mr EZ and the live examiner are AI too. A band from AI is an estimate to help you practise. It is not an official IELTS score, and nothing else about you is decided by it.':
    'Ваши эссе и Speaking проверяет ИИ автоматически, и Mr EZ с устным экзаменатором тоже работают на ИИ. Балл от ИИ примерный, он нужен для практики. Это не официальный балл IELTS, и больше ничего о вас по нему не решается.',
  'You can object to any AI result and ask a person to review it.':
    'Вы можете возразить против любого результата ИИ и попросить, чтобы его проверил человек.',
  'Keeping it safe': 'Защита данных',
  'Only you and the person who runs the site can see your details. Connections to the site are encrypted.':
    'Ваши данные видите только вы и человек, который ведёт сайт. Соединения с сайтом зашифрованы.',
  'If your information is ever exposed in a security incident, the government body for personal data protection is told within one working day, as the law requires.':
    'Если ваши данные когда-нибудь окажутся раскрыты из-за инцидента безопасности, государственный орган по защите персональных данных будет уведомлён в течение одного рабочего дня, как требует закон.',
  'If you are under 18, a parent or guardian must agree before you use the site, and before any purchase. The profile asks for their name, their phone number and their agreement.':
    'Если вам меньше 18 лет, родитель или опекун должен дать согласие до того, как вы начнёте пользоваться сайтом, и перед любой покупкой. В профиле указываются их имя, номер телефона и согласие.',
  'Deleting your account, and what is kept': 'Удаление аккаунта и что остаётся',
  'One thing is kept: a record of each payment (the plan, the amount, the date and the receipt number), without your name or email, for 5 years, because the tax law requires sales records to be kept.':
    'Остаётся только одно: запись о каждой оплате (тариф, сумма, дата и номер квитанции) без вашего имени и почты, на 5 лет, потому что налоговое законодательство требует хранить записи о продажах.',
  'Service logs': 'Служебные журналы',
  'Kept by Cloudflare for up to 7 days, then deleted automatically.':
    'Cloudflare хранит их до 7 дней, затем они удаляются автоматически.',
  'The site’s services on Cloudflare keep short technical logs for up to 7 days, to find faults and slow connections: when each request came, how long it took, whether it worked, and your connection’s address. During a live interview your browser also sends one short summary of the connection’s quality (delays, lost sound, phone or computer), never your voice or your words. Your essays, recordings and messages are never in these logs.':
    'Сервисы сайта на Cloudflare хранят краткие технические журналы до 7 дней, чтобы находить сбои и медленные подключения: когда пришёл каждый запрос, сколько времени он занял, прошёл ли он успешно, и адрес вашего подключения. Во время живого собеседования браузер также отправляет одну короткую сводку о качестве связи (задержки, пропавший звук, телефон или компьютер), но никогда не ваш голос и не ваши слова. Ваших эссе, записей и сообщений в этих журналах нет.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
