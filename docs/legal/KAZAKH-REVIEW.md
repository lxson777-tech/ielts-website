# Kazakh text for a native speaker to check (2 October 2026)

**For:** a Kazakh-speaking checker, before the paid site launches.
**From:** Builder K (Claude). Every Kazakh line below was written by Claude,
not by a native speaker, and must be checked before launch.

## Why this exists

Kazakh consumer law asks for the public offer, the consumer information
(plans, prices, the seller's details, refunds, receipts) and the shop's
advertising in Kazakh as well as Russian
(`docs/legal/KZ-WEBSITE-REQUIREMENTS-2026-10-02.md`, section 3). The owner
decided that the legal and buying pages get Kazakh, and the course itself
stays in English and Russian. On the site, a student who presses **KZ** sees
these pages in Kazakh; everything else (lessons, practice, Mr EZ's replies)
appears in Russian.

## How to check

- Each numbered item shows the English, the Russian the site already uses,
  and the Kazakh. Write any fix on the **Correction** line; leave it empty
  if the Kazakh is right.
- The Russian is the reference for tone and meaning: it has already been
  checked. Where the Kazakh says something different from the Russian, that
  is a mistake to flag.
- Keep anything in curly braces exactly as it is: `{date}`, `{price}`,
  `{n}`, `{name}` and so on are filled in by the site. You may move them
  within the sentence. A date arrives already written, for example
  "2026 ж. 31 қазан", so it cannot take a case ending; that is why many
  sentences put it after a colon ("аяқталу күні: {date}").
- Keep these as they are: IELTS, Reading, Listening, Writing, Speaking,
  Band, Part 1 / 2 / 3, Task 1 / 2, Mr EZ, IELTS is EZ, the service names
  (Supabase, OpenAI, Cloudflare, GitHub Pages, Google), and the currency
  (теңге, ₸, KZT).
- Please do not use long dashes (the em dash or the en dash) anywhere: the
  site's style uses a colon, a comma or a full stop instead.
- In the sales website section, keep the markup (`<br />`, `<em>`,
  `<span ...>`, `<small>`, `<b>`) exactly where it is: it carries the
  page's line breaks and coloured words.
- A short line such as "Cancel", "Close", "Show" or "Saved" is used in many
  places on the site; its Kazakh must make sense on a button anywhere, not
  only on the page it is listed under.

## Words used the same way everywhere (please confirm or change all at once)

| English | Russian | Kazakh used |
|---|---|---|
| public offer | публичная оферта | жария оферта |
| seller | продавец | сатушы |
| sole trader | индивидуальный предприниматель | жеке кәсіпкер |
| IIN | ИИН | ЖСН |
| practice and guidance (what paying adds) | практика и сопровождение | практика және сүйемелдеу |
| AI | ИИ | ЖИ (жасанды интеллект) |
| AI assessment / check | проверка | тексеру |
| AI feedback | разбор от ИИ | ЖИ талдауы |
| AI tutor | ИИ-репетитор | ЖИ тәлімгер |
| live interview | устное собеседование | ауызша сұхбат |
| mock exam | пробный экзамен | сынақ емтиханы |
| placement test | вступительный тест | деңгейді анықтау тесті |
| refund | возврат | ақшаны қайтару |
| receipt | чек / квитанция | түбіртек |
| access | доступ | қолжетімділік |
| plans (page) | тарифы | тарифтер |
| personal data | персональные данные | дербес деректер |
| consent | согласие | келісім |
| privacy notice | политика конфиденциальности | құпиялылық саясаты |
| parent or guardian | родитель или опекун | ата-ана немесе қамқоршы |
| support form | форма поддержки | қолдау формасы |
| account | аккаунт | аккаунт |
| you (to the student) | вы | сіз |

## Open questions for the checker

1. **The consumer protection authority's name** (item 1): "Қазақстан
   Республикасы Сауда және интеграция министрлігінің Тұтынушылардың
   құқықтарын қорғау комитеті". Please confirm the current official Kazakh
   name.
2. **ЖИ for AI.** Is "ЖИ" clear to students, or should the site write
   "жасанды интеллект" in full in some places (headings, labels)?
3. **Band.** The English word Band is kept ("болжамды Band бағасы" for a
   band estimate), as the owner asked. Russian uses "балл". Does
   "Band бағасы" read naturally, or would "балл" be better in running text?
4. **"Сүйемелдеу"** for "guidance / сопровождение" in the name of the paid
   access. Is there a more natural word students would use?
5. **The consent sentence** at sign-up (first person, "келісемін") and the
   parent's declaration ("Ата-анам немесе қамқоршым ... келіседі"). These
   are legal statements: please check them with particular care.
6. **Dates.** Where a browser has Kazakh date data, dates appear as
   "2026 ж. 2 қазан"; where it does not (some Chrome builds), the site falls
   back to the Russian form "2 октября 2026 г.". No wording change needed,
   just so you are not surprised.

## The lines

## Public offer, terms, seller details and footer (/terms, footer on every page)

Source file: `src/lib/i18n/dict/kk/offer.ts`

### Seller details (src/lib/legal/offer.ts)

1. **EN:** Committee for the Protection of Consumer Rights of the Ministry of Trade and Integration of the Republic of Kazakhstan
   - **RU:** Комитет по защите прав потребителей Министерства торговли и интеграции Республики Казахстан
   - **KK:** Қазақстан Республикасы Сауда және интеграция министрлігінің Тұтынушылардың құқықтарын қорғау комитеті
   - **Correction:**

2. **EN:** Seller, sole trader
   - **RU:** Продавец, индивидуальный предприниматель
   - **KK:** Сатушы, жеке кәсіпкер
   - **Correction:**

3. **EN:** IIN
   - **RU:** ИИН
   - **KK:** ЖСН
   - **Correction:**

4. **EN:** Registration
   - **RU:** Регистрация
   - **KK:** Тіркелуі
   - **Correction:**

5. **EN:** Registered address
   - **RU:** Юридический адрес
   - **KK:** Заңды мекенжайы
   - **Correction:**

6. **EN:** Centre address
   - **RU:** Адрес центра
   - **KK:** Орталықтың мекенжайы
   - **Correction:**

7. **EN:** Phone
   - **RU:** Телефон
   - **KK:** Телефон
   - **Correction:**

8. **EN:** Email
   - **RU:** Email
   - **KK:** Email
   - **Correction:**

9. **EN:** Working hours
   - **RU:** Часы работы
   - **KK:** Жұмыс уақыты
   - **Correction:**

### Footer

10. **EN:** Site information
   - **RU:** Информация о сайте
   - **KK:** Сайт туралы ақпарат
   - **Correction:**

11. **EN:** Help
   - **RU:** Помощь
   - **KK:** Көмек
   - **Correction:**

12. **EN:** Report a problem
   - **RU:** Сообщить о проблеме
   - **KK:** Ақау туралы хабарлау
   - **Correction:**

13. **EN:** Terms
   - **RU:** Условия
   - **KK:** Шарттар
   - **Correction:**

14. **EN:** Seller
   - **RU:** Продавец
   - **KK:** Сатушы
   - **Correction:**

15. **EN:** Privacy
   - **RU:** Конфиденциальность
   - **KK:** Құпиялылық
   - **Correction:**

### The public offer (paid build)

16. **EN:** {amount} KZT
   - **RU:** {amount} тенге
   - **KK:** {amount} теңге
   - **Correction:**

17. **EN:** Public offer
   - **RU:** Публичная оферта
   - **KK:** Жария оферта
   - **Correction:**

18. **EN:** The agreement for practice and guidance
   - **RU:** Договор на практику и сопровождение
   - **KK:** Практика және сүйемелдеу туралы шарт
   - **Correction:**

19. **EN:** This page is a public offer: the seller’s proposal to anyone who wants practice and guidance on IELTS is EZ. Paying for it means you accept everything on this page, so please read it before you buy.
   - **RU:** Эта страница является публичной офертой: предложением продавца каждому, кто хочет получить практику и сопровождение на IELTS is EZ. Оплачивая их, вы принимаете всё, что написано на этой странице, поэтому прочитайте её до покупки.
   - **KK:** Бұл бет жария оферта болып табылады: сатушының IELTS is EZ сайтында практика мен сүйемелдеу алғысы келетін әр адамға ұсынысы. Оны төлеу арқылы сіз осы беттегі барлық шартты қабылдайсыз, сондықтан сатып алмас бұрын оқып шығыңыз.
   - **Correction:**

20. **EN:** Version of {date}
   - **RU:** Редакция от {date}
   - **KK:** Редакция күні: {date}
   - **Correction:**

21. **EN:** Buying practice and guidance is not open yet. The terms for it below will apply once it opens.
   - **RU:** Покупка практики и сопровождения пока недоступна. Условия ниже начнут действовать, когда она откроется.
   - **KK:** Практика мен сүйемелдеуді сатып алу әзірге қолжетімсіз. Төмендегі шарттар сатып алу ашылған кезде күшіне енеді.
   - **Correction:**

22. **EN:** 1. Who sells
   - **RU:** 1. Кто продаёт
   - **KK:** 1. Сатушы кім
   - **Correction:**

23. **EN:** IELTS is EZ is run and sold by a sole trader registered in Kazakhstan:
   - **RU:** IELTS is EZ ведёт и продаёт индивидуальный предприниматель, зарегистрированный в Казахстане:
   - **KK:** IELTS is EZ сайтын Қазақстанда тіркелген жеке кәсіпкер жүргізеді және сатады:
   - **Correction:**

24. **EN:** IELTS is EZ is independent preparation. It is not affiliated with or endorsed by IELTS.
   - **RU:** IELTS is EZ это независимая подготовка. Мы не связаны с IELTS и не одобрены IELTS.
   - **KK:** IELTS is EZ: тәуелсіз дайындық. Біз IELTS ұйымымен байланысты емеспіз және IELTS бізді мақұлдамаған.
   - **Correction:**

25. **EN:** It is private preparation for the IELTS test, not an official or state-recognised course.
   - **RU:** Это частная подготовка к экзамену IELTS, а не официальный или признанный государством курс.
   - **KK:** Бұл IELTS емтиханына жеке дайындық, ресми немесе мемлекет мойындаған курс емес.
   - **Correction:**

26. **EN:** 2. What is sold
   - **RU:** 2. Что продаётся
   - **KK:** 2. Не сатылады
   - **Correction:**

27. **EN:** Practice and guidance: {days} days of access for {price}, paid once.
   - **RU:** Практика и сопровождение: доступ на {days} дней за {price}, оплата один раз.
   - **KK:** Практика және сүйемелдеу: {days} күндік қолжетімділік, бағасы {price}, бір рет төленеді.
   - **Correction:**

28. **EN:** Every practice exercise and timed test, with band estimates. Reading and Listening practice has no limit.
   - **RU:** Все упражнения и тесты на время, с примерной оценкой балла. Практика Reading и Listening без ограничений.
   - **KK:** Барлық жаттығу мен уақыты шектелген тест, болжамды Band бағасымен. Reading және Listening практикасы шектеусіз.
   - **Correction:**

29. **EN:** {essays} essay assessments, {speaking} recorded Speaking assessments (up to 5 minutes each) and {live} live interviews with the AI examiner, with feedback (up to 15 minutes each).
   - **RU:** Проверки эссе: {essays}. Проверки записей Speaking до 5 минут каждая: {speaking}. Устные собеседования с ИИ-экзаменатором и разбором, до 15 минут каждое: {live}.
   - **KK:** Эссе тексерулері: {essays}. Speaking жазбаларын тексеру, әрқайсысы 5 минутқа дейін: {speaking}. ЖИ емтихан алушысымен талдауы бар ауызша сұхбат, әрқайсысы 15 минутқа дейін: {live}.
   - **Correction:**

30. **EN:** {mock} full mock exams, and the placement test once per account. Essays written in a mock exam or the placement test count towards the essay assessments.
   - **RU:** Полные пробные экзамены: {mock}, и вступительный тест, один раз на аккаунт. Эссе в пробном экзамене и во вступительном тесте входят в число проверок эссе.
   - **KK:** Толық сынақ емтихандары: {mock}, сондай-ақ деңгейді анықтау тесті, бір аккаунтқа бір рет. Сынақ емтиханында немесе деңгейді анықтау тестінде жазылған эссе эссе тексерулерінің санына кіреді.
   - **Correction:**

31. **EN:** Mr EZ, your personal AI tutor, and the practice in your personal study plan.
   - **RU:** Mr EZ, ваш личный ИИ-репетитор, и практика из вашего личного учебного плана.
   - **KK:** Mr EZ, сіздің жеке ЖИ тәлімгеріңіз, және жеке оқу жоспарыңыздағы практика.
   - **Correction:**

32. **EN:** Mr EZ answers up to 40 chat messages and 60 lesson-help requests a day.
   - **RU:** Mr EZ отвечает не больше чем на 40 сообщений в чате и 60 запросов помощи в уроках в день.
   - **KK:** Mr EZ күніне чаттағы 40 хабарламаға дейін және сабақтағы көмекке арналған 60 сұрауға дейін жауап береді.
   - **Correction:**

33. **EN:** Each account has a fair daily safety limit, so the service stays available for everyone. If you reach it, you can carry on the next day.
   - **RU:** У каждого аккаунта есть разумный дневной лимит, чтобы сервис оставался доступным для всех. Если вы его достигли, продолжите на следующий день.
   - **KK:** Қызмет барлығына қолжетімді болуы үшін әр аккаунттың күндік қауіпсіздік шегі бар. Шекке жетсеңіз, келесі күні жалғастыра аласыз.
   - **Correction:**

34. **EN:** Unused assessments expire at the end of the {days} days.
   - **RU:** Неиспользованные проверки сгорают по окончании {days} дней.
   - **KK:** Пайдаланылмаған тексерулер {days} күн біткенде күшін жояды.
   - **Correction:**

35. **EN:** 3. What stays free
   - **RU:** 3. Что остаётся бесплатным
   - **KK:** 3. Не тегін болып қалады
   - **Correction:**

36. **EN:** Every lesson is free: the explanations, worked examples, each lesson’s own short quiz and the vocabulary lists.
   - **RU:** Все уроки бесплатны: объяснения, разобранные примеры, короткий тест к каждому уроку и списки слов.
   - **KK:** Барлық сабақ тегін: түсіндірмелер, талданған мысалдар, әр сабақтың қысқа тесті және сөздік тізімдері.
   - **Correction:**

37. **EN:** Lessons open once you are signed in to a free account.
   - **RU:** Уроки открываются, когда вы вошли в бесплатный аккаунт.
   - **KK:** Сабақтар тегін аккаунтқа кірген соң ашылады.
   - **Correction:**

38. **EN:** Creating an account is free and needs no payment card. A free account never turns into a paid one by itself.
   - **RU:** Аккаунт создаётся бесплатно, банковская карта не нужна. Бесплатный аккаунт никогда не становится платным сам по себе.
   - **KK:** Аккаунт ашу тегін, банк картасы қажет емес. Тегін аккаунт ешқашан өздігінен ақылы аккаунтқа айналмайды.
   - **Correction:**

39. **EN:** 4. How the agreement is made
   - **RU:** 4. Как заключается договор
   - **KK:** 4. Шарт қалай жасалады
   - **Correction:**

40. **EN:** You accept this offer by paying for practice and guidance on the Plans page. The agreement is made when your payment is confirmed.
   - **RU:** Вы принимаете эту оферту, оплачивая практику и сопровождение на странице тарифов. Договор заключён, когда оплата подтверждена.
   - **KK:** Сіз бұл офертаны Тарифтер бетінде практика мен сүйемелдеуді төлеу арқылы қабылдайсыз. Шарт төлеміңіз расталған сәтте жасалады.
   - **Correction:**

41. **EN:** Your access starts as soon as the payment is confirmed. If you already have access, the new {days} days start when your current ones end.
   - **RU:** Доступ открывается сразу после подтверждения оплаты. Если у вас уже есть доступ, новые {days} дней начнутся, когда закончатся текущие.
   - **KK:** Қолжетімділік төлем расталған бойда ашылады. Егер сізде қолжетімділік бар болса, жаңа {days} күн қазіргі мерзім біткенде басталады.
   - **Correction:**

42. **EN:** You pay on the payment company’s own page. Your card details never reach this site.
   - **RU:** Оплата проходит на странице платёжной компании. Данные вашей карты никогда не попадают на этот сайт.
   - **KK:** Төлем төлем компаниясының өз бетінде жасалады. Картаңыздың деректері бұл сайтқа ешқашан түспейді.
   - **Correction:**

43. **EN:** A receipt for each payment is on your Account page, together with the date your access ends.
   - **RU:** Квитанция по каждой оплате есть на странице аккаунта, там же указана дата окончания доступа.
   - **KK:** Әр төлемнің түбіртегі Аккаунт бетінде тұрады, сол жерде қолжетімділіктің аяқталу күні де көрсетілген.
   - **Correction:**

44. **EN:** {days} days of access. It ends on its own. Nothing renews, so you are never charged automatically.
   - **RU:** Доступ на {days} дней. Он заканчивается сам. Автоматического продления и списания нет.
   - **KK:** {days} күндік қолжетімділік. Ол өздігінен аяқталады. Ештеңе ұзартылмайды, сондықтан ақша ешқашан автоматты түрде алынбайды.
   - **Correction:**

45. **EN:** 5. Refunds
   - **RU:** 5. Возврат денег
   - **KK:** 5. Ақшаны қайтару
   - **Correction:**

46. **EN:** You can ask for a refund at any time during your {days} days.
   - **RU:** Попросить возврат можно в любой момент в течение ваших {days} дней.
   - **KK:** Ақшаны қайтаруды {days} күн ішінде кез келген уақытта сұрай аласыз.
   - **Correction:**

47. **EN:** We pay back the share of the price you have not used. The used share is the larger of two: the days of access that have started, out of {days}, and the AI assessments you have used (essays, recorded Speaking and live interviews), out of the {included} your purchase includes.
   - **RU:** Мы возвращаем неиспользованную часть цены. Использованная часть считается по большему из двух: доля начавшихся дней доступа из {days} и доля использованных проверок ИИ (эссе, записи Speaking и устные собеседования) из {included}, которые входят в покупку.
   - **KK:** Біз бағаның сіз пайдаланбаған үлесін қайтарамыз. Пайдаланылған үлес екеуінің үлкені бойынша есептеледі: {days} күннің ішінде басталған қолжетімділік күндерінің үлесі және сатып алуға кіретін {included} тексерудің ішінде сіз пайдаланған ЖИ тексерулерінің (эссе, Speaking жазбалары және ауызша сұхбаттар) үлесі.
   - **Correction:**

48. **EN:** The refund is the price multiplied by the unused share, rounded down to whole tenge.
   - **RU:** Сумма возврата равна цене, умноженной на неиспользованную долю, с округлением вниз до целых тенге.
   - **KK:** Қайтарылатын сома бағаны пайдаланылмаған үлеске көбейткенге тең, бүтін теңгеге дейін төмен қарай дөңгелектенеді.
   - **Correction:**

49. **EN:** An example
   - **RU:** Пример
   - **KK:** Мысал
   - **Correction:**

50. **EN:** Day {day} of {days}: {percent}% of the days have started.
   - **RU:** День {day} из {days}: началось {percent}% дней.
   - **KK:** {days} күннің {day}-күні: күндердің {percent}% басталды.
   - **Correction:**

51. **EN:** {used} of {included} assessments used: {percent}%.
   - **RU:** Использовано проверок: {used} из {included}, это {percent}%.
   - **KK:** Пайдаланылған тексерулер: {included} ішінен {used}, яғни {percent}%.
   - **Correction:**

52. **EN:** The larger share, {percent}%, counts as used.
   - **RU:** Использованной считается большая доля: {percent}%.
   - **KK:** Пайдаланылған деп үлкен үлес саналады: {percent}%.
   - **Correction:**

53. **EN:** Refund: {percent}% of {price}, which is {refund}.
   - **RU:** Возврат: {percent}% от {price}, то есть {refund}.
   - **KK:** Қайтарылатын сома: {price} бағасының {percent}%, яғни {refund}.
   - **Correction:**

54. **EN:** When the refund is made, your access and any assessments left on it end. Everything you saved stays on your account, and your lessons stay open.
   - **RU:** После возврата доступ и оставшиеся по нему проверки заканчиваются. Всё сохранённое остаётся в вашем аккаунте, а уроки остаются открытыми.
   - **KK:** Ақша қайтарылғанда қолжетімділік және одан қалған тексерулер аяқталады. Сақтағаныңыздың бәрі аккаунтыңызда қалады, сабақтар ашық күйінде қалады.
   - **Correction:**

55. **EN:** The money goes back to the card or account you paid with, within {n} working days of your request being accepted. Your bank may take a few more days to show it.
   - **RU:** Деньги возвращаются на карту или счёт, с которых вы платили, в течение {n} рабочих дней после того, как запрос принят. Банку может понадобиться ещё несколько дней, чтобы их зачислить.
   - **KK:** Ақша сұрауыңыз қабылданған соң {n} жұмыс күні ішінде төлеген картаңызға немесе шотыңызға қайтарылады. Банкке оны көрсету үшін тағы бірнеше күн қажет болуы мүмкін.
   - **Correction:**

56. **EN:** Once your {days} days have ended, there is nothing left to refund.
   - **RU:** Когда ваши {days} дней закончились, возвращать уже нечего.
   - **KK:** {days} күн аяқталған соң қайтаратын ештеңе қалмайды.
   - **Correction:**

57. **EN:** How to ask for a refund
   - **RU:** Как попросить возврат
   - **KK:** Ақшаны қайтаруды қалай сұрауға болады
   - **Correction:**

58. **EN:** Through the support form:
   - **RU:** Через форму поддержки:
   - **KK:** Қолдау формасы арқылы:
   - **Correction:**

59. **EN:** ask for a refund
   - **RU:** попросить возврат
   - **KK:** ақшаны қайтаруды сұрау
   - **Correction:**

60. **EN:** Or by email to the seller:
   - **RU:** Или письмом продавцу:
   - **KK:** Немесе сатушыға электрондық хат арқылы:
   - **Correction:**

61. **EN:** Please give the email address of your account, so we can find your purchase.
   - **RU:** Укажите адрес электронной почты своего аккаунта, чтобы мы нашли вашу покупку.
   - **KK:** Сатып алуыңызды табуымыз үшін аккаунтыңыздың электрондық поштасын көрсетіңіз.
   - **Correction:**

62. **EN:** 6. Questions and complaints
   - **RU:** 6. Вопросы и жалобы
   - **KK:** 6. Сұрақтар мен шағымдар
   - **Correction:**

63. **EN:** Write to us through the support form or by email. A person reads every message and replies by email.
   - **RU:** Пишите нам через форму поддержки или по электронной почте. Каждое сообщение читает человек и отвечает по электронной почте.
   - **KK:** Бізге қолдау формасы арқылы немесе электрондық пошта арқылы жазыңыз. Әр хабарламаны адам оқиды және электрондық пошта арқылы жауап береді.
   - **Correction:**

64. **EN:** We answer every complaint in writing, with our reasons, within {n} calendar days.
   - **RU:** На каждую жалобу мы отвечаем письменно и с объяснением причин в течение {n} календарных дней.
   - **KK:** Әр шағымға {n} күнтізбелік күн ішінде себептерін түсіндіре отырып жазбаша жауап береміз.
   - **Correction:**

65. **EN:** If you are not satisfied with our answer, you can turn to the consumer protection authority:
   - **RU:** Если наш ответ вас не устроит, вы можете обратиться в уполномоченный орган по защите прав потребителей:
   - **KK:** Жауабымыз сізді қанағаттандырмаса, тұтынушылардың құқықтарын қорғау жөніндегі уәкілетті органға жүгіне аласыз:
   - **Correction:**

66. **EN:** You also have the right to go to court.
   - **RU:** Также вы вправе обратиться в суд.
   - **KK:** Сондай-ақ сотқа жүгінуге құқығыңыз бар.
   - **Correction:**

67. **EN:** 7. Artificial intelligence (AI)
   - **RU:** 7. Искусственный интеллект (ИИ)
   - **KK:** 7. Жасанды интеллект (ЖИ)
   - **Correction:**

68. **EN:** The feedback on essays and recorded Speaking, Mr EZ and the live examiner are AI. The live examiner’s voice is an AI voice, not a real person.
   - **RU:** Разбор эссе и записей Speaking, Mr EZ и устный экзаменатор работают на искусственном интеллекте. Голос экзаменатора создан ИИ, это не живой человек.
   - **KK:** Эссе мен Speaking жазбаларының талдауы, Mr EZ және ауызша емтихан алушы жасанды интеллектпен жұмыс істейді. Емтихан алушының дауысы ЖИ дауысы, ол шын адам емес.
   - **Correction:**

69. **EN:** AI band scores are estimates against the public IELTS band descriptors. They are not official IELTS results and do not guarantee your test score.
   - **RU:** Баллы от ИИ примерные и опираются на открытые критерии оценки IELTS. Это не официальные результаты IELTS и не гарантия балла на экзамене.
   - **KK:** ЖИ қойған Band бағасы IELTS-тің ашық бағалау критерийлеріне сүйенген болжам ғана. Бұл ресми IELTS нәтижесі емес және емтихандағы балыңызға кепілдік бермейді.
   - **Correction:**

70. **EN:** If you disagree with an AI result, a person will review it on request.
   - **RU:** Если вы не согласны с результатом ИИ, по вашему запросу его проверит человек.
   - **KK:** ЖИ нәтижесімен келіспесеңіз, сұрауыңыз бойынша оны адам қайта қарайды.
   - **Correction:**

71. **EN:** Ask for a review
   - **RU:** Попросить проверку человеком
   - **KK:** Адамның тексеруін сұрау
   - **Correction:**

72. **EN:** 8. Students under 18
   - **RU:** 8. Ученики младше 18 лет
   - **KK:** 8. 18 жасқа толмаған оқушылар
   - **Correction:**

73. **EN:** If you are under 18, a parent or guardian must agree to the purchase. Please read this page with them before you buy.
   - **RU:** Если вам меньше 18 лет, на покупку нужно согласие родителя или опекуна. Прочитайте эту страницу вместе с ними до покупки.
   - **KK:** Егер сіз 18 жасқа толмаған болсаңыз, сатып алуға ата-анаңыздың немесе қамқоршыңыздың келісімі қажет. Сатып алмас бұрын бұл бетті олармен бірге оқыңыз.
   - **Correction:**

74. **EN:** The profile of a student under 18 also asks for a parent or guardian’s details and agreement.
   - **RU:** В профиле ученика младше 18 лет также указываются данные и согласие родителя или опекуна.
   - **KK:** 18 жасқа толмаған оқушының профилінде ата-ананың немесе қамқоршының деректері мен келісімі де сұралады.
   - **Correction:**

75. **EN:** 9. Changes to this offer
   - **RU:** 9. Изменения оферты
   - **KK:** 9. Офертаның өзгеруі
   - **Correction:**

76. **EN:** The seller may update this offer. The version date at the top of this page shows which version is in force.
   - **RU:** Продавец может обновлять эту оферту. Дата редакции в начале страницы показывает, какая редакция действует.
   - **KK:** Сатушы бұл офертаны жаңарта алады. Беттің басындағы редакция күні қай редакцияның күшінде екенін көрсетеді.
   - **Correction:**

77. **EN:** A purchase follows the version in force on the day you paid. A change never raises the price of a purchase already made and never takes away what it includes.
   - **RU:** Покупка действует по той редакции, которая была в силе в день оплаты. Изменения никогда не повышают цену уже сделанной покупки и не убирают то, что в неё входит.
   - **KK:** Сатып алу төлем жасалған күні күшінде болған редакция бойынша жүреді. Өзгеріс бұрын жасалған сатып алудың бағасын ешқашан көтермейді және оған кіретін нәрсені алып тастамайды.
   - **Correction:**

78. **EN:** 10. When your access ends
   - **RU:** 10. Когда доступ заканчивается
   - **KK:** 10. Қолжетімділік аяқталғанда
   - **Correction:**

79. **EN:** Everything you saved stays on your account: your results, essays, progress and study plan.
   - **RU:** Всё сохранённое остаётся в аккаунте: результаты, эссе, прогресс и учебный план.
   - **KK:** Сақтағаныңыздың бәрі аккаунтыңызда қалады: нәтижелеріңіз, эсселеріңіз, үлгерімдеріңіз және оқу жоспарыңыз.
   - **Correction:**

80. **EN:** Your lessons stay open with your free account. Practice, tests, AI feedback and Mr EZ need practice and guidance again.
   - **RU:** Уроки остаются открытыми в вашем бесплатном аккаунте. Для практики, тестов, разбора от ИИ и Mr EZ снова понадобятся практика и сопровождение.
   - **KK:** Сабақтар тегін аккаунтыңызда ашық күйінде қалады. Практика, тесттер, ЖИ талдауы және Mr EZ үшін қайтадан практика мен сүйемелдеу қажет болады.
   - **Correction:**

81. **EN:** How we handle your information
   - **RU:** Как мы обращаемся с вашими данными
   - **KK:** Деректеріңізбен қалай жұмыс істейміз
   - **Correction:**

82. **EN:** How the platform works
   - **RU:** Как устроена платформа
   - **KK:** Платформа қалай жұмыс істейді
   - **Correction:**

### The plain terms (open build)

83. **EN:** Terms of use
   - **RU:** Условия использования
   - **KK:** Пайдалану шарттары
   - **Correction:**

84. **EN:** The terms, in plain words
   - **RU:** Условия простыми словами
   - **KK:** Шарттар қарапайым тілмен
   - **Correction:**

85. **EN:** What a free account includes, what practice and guidance add, and what happens when your access ends.
   - **RU:** Что даёт бесплатный аккаунт, что добавляют практика и сопровождение и что происходит, когда доступ заканчивается.
   - **KK:** Тегін аккаунтқа не кіреді, практика мен сүйемелдеу не қосады және қолжетімділік аяқталғанда не болады.
   - **Correction:**

86. **EN:** Updated 2 October 2026
   - **RU:** Обновлено 2 октября 2026 года
   - **KK:** Жаңартылған күні: 2026 жылғы 2 қазан
   - **Correction:**

87. **EN:** Your free account
   - **RU:** Ваш бесплатный аккаунт
   - **KK:** Сіздің тегін аккаунтыңыз
   - **Correction:**

88. **EN:** Practice and guidance
   - **RU:** Практика и сопровождение
   - **KK:** Практика және сүйемелдеу
   - **Correction:**

89. **EN:** Practice and guidance cost {price} for 30 days, paid once.
   - **RU:** Практика и сопровождение стоят {price} за 30 дней, оплата один раз.
   - **KK:** Практика мен сүйемелдеудің 30 күндік бағасы {price}, бір рет төленеді.
   - **Correction:**

90. **EN:** They add every practice exercise and timed test with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan.
   - **RU:** В них входят все упражнения и тесты на время с оценкой балла, разбор эссе и записей Speaking от ИИ, устные собеседования с ИИ-экзаменатором, полные пробные экзамены, вступительный тест, Mr EZ и практика из вашего личного учебного плана.
   - **KK:** Оларға болжамды Band бағасы бар барлық жаттығу мен уақыты шектелген тест, эссе мен Speaking жазбаларына ЖИ талдауы, ЖИ емтихан алушысымен ауызша сұхбаттар, толық сынақ емтихандары, деңгейді анықтау тесті, Mr EZ және жеке оқу жоспарыңыздағы практика кіреді.
   - **Correction:**

91. **EN:** 30 days of access. It ends on its own. Nothing renews, so you are never charged automatically.
   - **RU:** Доступ на 30 дней. Он заканчивается сам. Автоматического продления и списания нет.
   - **KK:** 30 күндік қолжетімділік. Ол өздігінен аяқталады. Ештеңе ұзартылмайды, сондықтан ақша ешқашан автоматты түрде алынбайды.
   - **Correction:**

92. **EN:** If you buy again while your access is running, the new 30 days start when the current ones end.
   - **RU:** Если купить снова, пока доступ ещё действует, новые 30 дней начнутся, когда закончатся текущие.
   - **KK:** Қолжетімділік әлі жұмыс істеп тұрғанда қайта сатып алсаңыз, жаңа 30 күн қазіргі мерзім біткенде басталады.
   - **Correction:**

93. **EN:** You can ask for a refund at any time during the 30 days. We pay back the share you have not used.
   - **RU:** В течение 30 дней можно в любой момент попросить возврат. Мы вернём неиспользованную часть оплаты.
   - **KK:** 30 күн ішінде кез келген уақытта ақшаны қайтаруды сұрай аласыз. Біз сіз пайдаланбаған үлесті қайтарамыз.
   - **Correction:**

94. **EN:** What 30 days include
   - **RU:** Что входит в 30 дней
   - **KK:** 30 күнге не кіреді
   - **Correction:**

95. **EN:** 12 essay assessments, 6 recorded Speaking assessments (up to 5 minutes each), 2 live interviews with feedback (up to 15 minutes each) and 2 full mock exams.
   - **RU:** 12 проверок эссе, 6 проверок записей Speaking (до 5 минут каждая), 2 устных собеседования с разбором (до 15 минут каждое) и 2 полных пробных экзамена.
   - **KK:** 12 эссе тексеруі, 6 Speaking жазбасын тексеру (әрқайсысы 5 минутқа дейін), талдауы бар 2 ауызша сұхбат (әрқайсысы 15 минутқа дейін) және 2 толық сынақ емтиханы.
   - **Correction:**

96. **EN:** The placement test, once per account. Essays written in a mock exam or the placement test count towards the 12 essay assessments.
   - **RU:** Вступительный тест, один раз на аккаунт. Эссе, написанные в пробном экзамене или во вступительном тесте, входят в 12 проверок эссе.
   - **KK:** Деңгейді анықтау тесті, бір аккаунтқа бір рет. Сынақ емтиханында немесе деңгейді анықтау тестінде жазылған эссе 12 эссе тексеруінің санына кіреді.
   - **Correction:**

97. **EN:** Unused assessments expire at the end of the 30 days. Reading and Listening practice has no limit.
   - **RU:** Неиспользованные проверки сгорают в конце 30 дней. Практика Reading и Listening без ограничений.
   - **KK:** Пайдаланылмаған тексерулер 30 күн біткенде күшін жояды. Reading және Listening практикасы шектеусіз.
   - **Correction:**

98. **EN:** AI feedback is an estimate against the public IELTS band descriptors. It is not an official IELTS result.
   - **RU:** Оценка ИИ примерная и опирается на открытые критерии баллов IELTS. Это не официальный результат IELTS.
   - **KK:** ЖИ талдауы IELTS-тің ашық бағалау критерийлеріне сүйенген болжам. Бұл ресми IELTS нәтижесі емес.
   - **Correction:**

99. **EN:** When your access ends
   - **RU:** Когда доступ заканчивается
   - **KK:** Қолжетімділік аяқталғанда
   - **Correction:**

100. **EN:** About IELTS is EZ
   - **RU:** Об IELTS is EZ
   - **KK:** IELTS is EZ туралы
   - **Correction:**

101. **EN:** IELTS is EZ is run by {name}.
   - **RU:** IELTS is EZ ведёт {name}.
   - **KK:** IELTS is EZ сайтын {name} жүргізеді.
   - **Correction:**

102. **EN:** Questions
   - **RU:** Вопросы
   - **KK:** Сұрақтар
   - **Correction:**

103. **EN:** If anything here is unclear, ask a person through the support form. A person reads every message and replies by email.
   - **RU:** Если что-то непонятно, спросите через форму поддержки. Каждое сообщение читает человек и отвечает по электронной почте.
   - **KK:** Бірдеңе түсініксіз болса, қолдау формасы арқылы адамнан сұраңыз. Әр хабарламаны адам оқиды және электрондық пошта арқылы жауап береді.
   - **Correction:**

### Beside the plans (PurchaseTerms.tsx)

104. **EN:** Before you buy
   - **RU:** Перед покупкой
   - **KK:** Сатып алмас бұрын
   - **Correction:**

105. **EN:** How refunds work
   - **RU:** Как устроен возврат
   - **KK:** Ақша қалай қайтарылады
   - **Correction:**

## Privacy notice (/privacy)

Source file: `src/lib/i18n/dict/kk/privacy.ts`

106. **EN:** Who else receives it, and where
   - **RU:** Кто ещё получает данные и где
   - **KK:** Деректерді тағы кім алады және қай жерде
   - **Correction:**

107. **EN:** Which services handle it
   - **RU:** Какие сервисы с этим работают
   - **KK:** Олармен қандай сервистер жұмыс істейді
   - **Correction:**

108. **EN:** Deleting your account, and what is kept
   - **RU:** Удаление аккаунта и что остаётся
   - **KK:** Аккаунтты жою және не сақталады
   - **Correction:**

109. **EN:** Removing your account
   - **RU:** Удаление аккаунта
   - **KK:** Аккаунтты жою
   - **Correction:**

110. **EN:** Email and password
   - **RU:** Электронная почта и пароль
   - **KK:** Электрондық пошта және құпиясөз
   - **Correction:**

111. **EN:** To create your account, so your work stays yours and follows you to other devices. If you sign in with Google, Google shares your email address and name instead.
   - **RU:** Чтобы создать аккаунт: так ваша работа остаётся вашей и доступна на других устройствах. Если вы входите через Google, вместо пароля Google передаёт ваш адрес почты и имя.
   - **KK:** Аккаунтыңызды ашу үшін: осылайша жұмысыңыз өзіңізде қалады және басқа құрылғыларда да қолжетімді болады. Google арқылы кірсеңіз, құпиясөздің орнына Google электрондық поштаңыз бен атыңызды береді.
   - **Correction:**

112. **EN:** First and last name
   - **RU:** Имя и фамилия
   - **KK:** Аты-жөні
   - **Correction:**

113. **EN:** So the course and Mr EZ can call you by name.
   - **RU:** Чтобы курс и Mr EZ обращались к вам по имени.
   - **KK:** Курс пен Mr EZ сізге атыңызбен жүгінуі үшін.
   - **Correction:**

114. **EN:** Date of birth
   - **RU:** Дата рождения
   - **KK:** Туған күні
   - **Correction:**

115. **EN:** Students under 18 also give a parent or guardian’s details, and your date of birth tells the form when that is needed.
   - **RU:** Ученики младше 18 лет также указывают данные родителя или опекуна, и по дате рождения форма понимает, когда это нужно.
   - **KK:** 18 жасқа толмаған оқушылар ата-анасының немесе қамқоршысының деректерін де көрсетеді, ал туған күніңіз форманың бұл қашан қажет екенін білуіне көмектеседі.
   - **Correction:**

116. **EN:** Phone number
   - **RU:** Номер телефона
   - **KK:** Телефон нөмірі
   - **Correction:**

117. **EN:** So we can contact you about your studies or your account if we need to.
   - **RU:** Чтобы при необходимости связаться с вами по поводу учёбы или аккаунта.
   - **KK:** Қажет болса, оқуыңызға немесе аккаунтыңызға қатысты сізбен байланысу үшін.
   - **Correction:**

118. **EN:** City, school or job, and how you found us
   - **RU:** Город, место учёбы или работы и как вы нас нашли
   - **KK:** Қала, оқу немесе жұмыс орны және бізді қалай тапқаныңыз
   - **Correction:**

119. **EN:** To understand who studies here and how people find the course.
   - **RU:** Чтобы понимать, кто здесь учится и как люди находят курс.
   - **KK:** Мұнда кім оқитынын және адамдар курсты қалай табатынын түсіну үшін.
   - **Correction:**

120. **EN:** A parent or guardian, under 18 only
   - **RU:** Родитель или опекун, только до 18 лет
   - **KK:** Ата-ана немесе қамқоршы, тек 18 жасқа дейін
   - **Correction:**

121. **EN:** Their name, their phone number and their agreement to you using the site. The time of that agreement is recorded.
   - **RU:** Имя, номер телефона и согласие на то, что вы пользуетесь сайтом. Время согласия записывается.
   - **KK:** Олардың аты, телефон нөмірі және сайтты пайдалануыңызға берген келісімі. Келісім берілген уақыт жазылып қойылады.
   - **Correction:**

122. **EN:** Lessons you finish, your test answers and results, your study plan and how much you study each day.
   - **RU:** Пройденные уроки, ответы и результаты тестов, учебный план и сколько вы занимаетесь каждый день.
   - **KK:** Аяқтаған сабақтарыңыз, тесттегі жауаптарыңыз бен нәтижелеріңіз, оқу жоспарыңыз және күн сайын қанша оқитыныңыз.
   - **Correction:**

123. **EN:** Essays you have had graded, with their feedback, so you can reread them later.
   - **RU:** Проверенные эссе вместе с разбором, чтобы их можно было перечитать.
   - **KK:** Кейін қайта оқи алуыңыз үшін тексерілген эсселеріңіз және олардың талдауы.
   - **Correction:**

124. **EN:** For Speaking, your scores. The recording itself is not saved by this site.
   - **RU:** Для Speaking только ваши баллы. Саму запись сайт не сохраняет.
   - **KK:** Speaking бойынша тек балдарыңыз. Жазбаның өзін бұл сайт сақтамайды.
   - **Correction:**

125. **EN:** Your conversations with Mr EZ, so he can carry on where you left off. You can clear them at any time in Study plan settings.
   - **RU:** Ваши разговоры с Mr EZ, чтобы он мог продолжить с того же места. Их можно удалить в любой момент в настройках учебного плана.
   - **KK:** Mr EZ тоқтаған жерінен жалғастыра алуы үшін онымен әңгімелеріңіз. Оларды кез келген уақытта оқу жоспарының баптауларында өшіре аласыз.
   - **Correction:**

126. **EN:** If you took the free trial while it was offered: when it started, which trial tests and Mr EZ messages you used, and your answers to the short questions about your goals. The trial is no longer offered, so no new trial records are made.
   - **RU:** Если вы проходили бесплатный пробный период, пока он предлагался: когда он начался, какие пробные тесты и сообщения Mr EZ вы использовали, и ваши ответы на короткие вопросы о целях. Пробный период больше не предлагается, поэтому новые записи о нём не создаются.
   - **KK:** Тегін сынақ мерзімі ұсынылған кезде оны пайдаланған болсаңыз: ол қашан басталғаны, қандай сынақ тесттері мен Mr EZ хабарламаларын пайдаланғаныңыз және мақсаттарыңыз туралы қысқа сұрақтарға жауаптарыңыз. Сынақ мерзімі енді ұсынылмайды, сондықтан ол туралы жаңа жазбалар жасалмайды.
   - **Correction:**

127. **EN:** Messages you send through the support form, with the page you sent them from.
   - **RU:** Сообщения, отправленные через форму поддержки, и страница, с которой вы их отправили.
   - **KK:** Қолдау формасы арқылы жіберген хабарламаларыңыз және оларды жіберген бетіңіз.
   - **Correction:**

128. **EN:** If you write without signing in: the email address you give for the reply. To stop one sender from flooding the form, your internet connection’s address is also kept for 24 hours, only as a scrambled code that cannot be read back. The address itself is never stored.
   - **RU:** Если вы пишете, не входя в аккаунт: адрес почты, который вы указали для ответа. Чтобы один отправитель не мог завалить форму сообщениями, адрес вашего интернет-подключения тоже хранится 24 часа, но только в виде зашифрованного кода, из которого его нельзя восстановить. Сам адрес не сохраняется.
   - **KK:** Аккаунтқа кірмей жазсаңыз: жауап үшін көрсеткен электрондық поштаңыз. Бір жіберуші форманы хабарламаға толтырып тастамауы үшін интернет байланысыңыздың мекенжайы да 24 сағат сақталады, бірақ тек кері оқуға болмайтын шифрланған код түрінде. Мекенжайдың өзі ешқашан сақталмайды.
   - **Correction:**

129. **EN:** When the form shows a security check, Cloudflare runs it and receives your connection’s address to do so. This site keeps nothing from the check.
   - **RU:** Если форма показывает проверку безопасности, её проводит Cloudflare и для этого получает адрес вашего подключения. Сайт ничего из этой проверки не сохраняет.
   - **KK:** Формада қауіпсіздік тексерісі шыққанда, оны Cloudflare жүргізеді және ол үшін байланысыңыздың мекенжайын алады. Бұл сайт тексерістен ештеңе сақтамайды.
   - **Correction:**

130. **EN:** Which plan you chose, its price and currency, and when you started the purchase.
   - **RU:** Какой тариф вы выбрали, его цену и валюту, и когда вы начали покупку.
   - **KK:** Қай тарифті таңдағаныңыз, оның бағасы мен валютасы және сатып алуды қашан бастағаныңыз.
   - **Correction:**

131. **EN:** What happened to it: waiting for payment, paid, not completed, cancelled or refunded, with the time, and a short reason if a payment did not go through.
   - **RU:** Что с ней произошло: ожидает оплаты, оплачена, не завершена, отменена или возвращена, со временем, а если платёж не прошёл, то и краткой причиной.
   - **KK:** Онымен не болғаны: төлемді күтуде, төленді, аяқталмады, тоқтатылды немесе ақша қайтарылды, уақытымен бірге, ал төлем өтпесе, қысқа себебі.
   - **Correction:**

132. **EN:** The name of the payment company and its reference number for the payment.
   - **RU:** Название платёжной компании и её номер этого платежа.
   - **KK:** Төлем компаниясының атауы және оның осы төлемге берген нөмірі.
   - **Correction:**

133. **EN:** A receipt number for each paid purchase.
   - **RU:** Номер квитанции для каждой оплаченной покупки.
   - **KK:** Төленген әр сатып алудың түбіртек нөмірі.
   - **Correction:**

134. **EN:** The dates your paid access starts and ends, and the date it was withdrawn if a payment was refunded.
   - **RU:** Даты начала и окончания платного доступа, а если платёж был возвращён, то и дату, когда доступ был отозван.
   - **KK:** Ақылы қолжетімділіктің басталу және аяқталу күндері, ал төлем қайтарылса, қолжетімділік тоқтатылған күн.
   - **Correction:**

135. **EN:** How many of the included assessments you have used: each essay, recorded Speaking, live interview and mock exam or placement interview, with its time and whether it finished.
   - **RU:** Сколько включённых проверок вы использовали: каждое эссе, запись Speaking, устное собеседование и собеседование в пробном экзамене или вступительном тесте, со временем и отметкой, завершилась ли проверка.
   - **KK:** Құрамына кіретін тексерулердің қаншасын пайдаланғаныңыз: әр эссе, Speaking жазбасы, ауызша сұхбат және сынақ емтиханындағы немесе деңгейді анықтау тестіндегі сұхбат, уақытымен және аяқталған-аяқталмағанымен.
   - **Correction:**

136. **EN:** For each AI assessment, the AI service’s usage figures and the result of the call, to keep costs in check. Your essay, your recording and the feedback text are not part of this record.
   - **RU:** Для каждой проверки ИИ: данные сервиса ИИ об объёме работы и результат запроса, чтобы следить за расходами. Ваше эссе, запись и текст разбора в эту запись не входят.
   - **KK:** Шығынды бақылау үшін әр ЖИ тексеруі бойынша ЖИ сервисінің пайдалану көрсеткіштері мен сұраудың нәтижесі. Эссеңіз, жазбаңыз және талдау мәтіні бұл жазбаға кірмейді.
   - **Correction:**

137. **EN:** If the person who runs the site gives you free access, the dates it starts and ends and who gave it.
   - **RU:** Если человек, который ведёт сайт, даёт вам бесплатный доступ: даты его начала и окончания и кто его выдал.
   - **KK:** Сайтты жүргізетін адам сізге тегін қолжетімділік берсе, оның басталу және аяқталу күндері және оны кім бергені.
   - **Correction:**

138. **EN:** To create and run your account, open your lessons and keep your progress on all your devices.
   - **RU:** Чтобы создать и вести ваш аккаунт, открывать уроки и сохранять прогресс на всех ваших устройствах.
   - **KK:** Аккаунтыңызды ашу және жүргізу, сабақтарыңызды ашу және үлгеріміңізді барлық құрылғыларыңызда сақтау үшін.
   - **Correction:**

139. **EN:** To mark your essays and Speaking with AI, and to run Mr EZ and the live examiner.
   - **RU:** Чтобы проверять ваши эссе и Speaking с помощью ИИ и чтобы работали Mr EZ и устный экзаменатор.
   - **KK:** Эссеңіз бен Speaking жауабыңызды ЖИ көмегімен бағалау үшін, сондай-ақ Mr EZ пен ауызша емтихан алушының жұмыс істеуі үшін.
   - **Correction:**

140. **EN:** To sell practice and guidance, count its included assessments and keep a receipt for each payment.
   - **RU:** Чтобы продавать практику и сопровождение, считать входящие в них проверки и хранить квитанцию по каждой оплате.
   - **KK:** Практика мен сүйемелдеуді сату, оған кіретін тексерулерді есептеу және әр төлемнің түбіртегін сақтау үшін.
   - **Correction:**

141. **EN:** To answer your messages and requests.
   - **RU:** Чтобы отвечать на ваши сообщения и запросы.
   - **KK:** Хабарламалар мен сұрауларыңызға жауап беру үшін.
   - **Correction:**

142. **EN:** To keep the service safe and fair, for example with daily limits.
   - **RU:** Чтобы сервис оставался безопасным и честным для всех, например с помощью дневных лимитов.
   - **KK:** Қызметті қауіпсіз әрі әділ ұстау үшін, мысалы, күндік шектеулер арқылы.
   - **Correction:**

143. **EN:** To keep the sales records the tax law requires.
   - **RU:** Чтобы хранить записи о продажах, которых требует налоговое законодательство.
   - **KK:** Салық заңнамасы талап ететін сату жазбаларын сақтау үшін.
   - **Correction:**

144. **EN:** Your account and everything in it
   - **RU:** Ваш аккаунт и всё, что в нём
   - **KK:** Аккаунтыңыз және ондағының бәрі
   - **Correction:**

145. **EN:** While your account is open. When you delete your account, it is all deleted at once.
   - **RU:** Пока аккаунт открыт. Когда вы удаляете аккаунт, всё удаляется сразу.
   - **KK:** Аккаунтыңыз ашық тұрғанша. Аккаунтты жойғанда бәрі бірден жойылады.
   - **Correction:**

146. **EN:** Your consent
   - **RU:** Ваше согласие
   - **KK:** Сіздің келісіміңіз
   - **Correction:**

147. **EN:** The record of when you gave it is kept with your account and deleted with it.
   - **RU:** Запись о том, когда вы его дали, хранится вместе с аккаунтом и удаляется вместе с ним.
   - **KK:** Келісімді қашан бергеніңіз туралы жазба аккаунтыңызбен бірге сақталады және онымен бірге жойылады.
   - **Correction:**

148. **EN:** Payment records
   - **RU:** Записи об оплатах
   - **KK:** Төлем жазбалары
   - **Correction:**

149. **EN:** Kept for 5 years as anonymous sale records, because the tax law requires it, then deleted.
   - **RU:** Хранятся 5 лет как обезличенные записи о продажах, потому что этого требует налоговое законодательство, затем удаляются.
   - **KK:** Салық заңнамасы талап ететіндіктен, иесіздендірілген сату жазбалары ретінде 5 жыл сақталады, содан кейін жойылады.
   - **Correction:**

150. **EN:** Messages sent without signing in
   - **RU:** Сообщения, отправленные без входа в аккаунт
   - **KK:** Аккаунтқа кірмей жіберілген хабарламалар
   - **Correction:**

151. **EN:** Kept for 12 months, then deleted automatically.
   - **RU:** Хранятся 12 месяцев, затем удаляются автоматически.
   - **KK:** 12 ай сақталады, содан кейін автоматты түрде жойылады.
   - **Correction:**

152. **EN:** The scrambled code of your connection
   - **RU:** Зашифрованный код вашего подключения
   - **KK:** Байланысыңыздың шифрланған коды
   - **Correction:**

153. **EN:** Kept for 24 hours, only to limit how often one sender can write.
   - **RU:** Хранится 24 часа, только чтобы ограничивать, как часто может писать один отправитель.
   - **KK:** 24 сағат сақталады, тек бір жіберушінің қаншалықты жиі жаза алатынын шектеу үшін.
   - **Correction:**

154. **EN:** What OpenAI receives
   - **RU:** Что получает OpenAI
   - **KK:** OpenAI не алады
   - **Correction:**

155. **EN:** OpenAI may keep it for up to 30 days to check for misuse, then deletes it, unless the law requires longer. It does not use it to train its models. This site also tells OpenAI not to store the replies it writes.
   - **RU:** OpenAI может хранить эти данные до 30 дней, чтобы проверять злоупотребления, затем удаляет их, если закон не требует хранить дольше. OpenAI не использует их для обучения своих моделей. Кроме того, сайт просит OpenAI не сохранять написанные ответы.
   - **KK:** OpenAI бұл деректерді теріс пайдалануды тексеру үшін 30 күнге дейін сақтауы мүмкін, содан кейін, заң ұзағырақ сақтауды талап етпесе, жояды. OpenAI оларды өз модельдерін оқыту үшін пайдаланбайды. Сондай-ақ бұл сайт OpenAI-ға жазған жауаптарын сақтамауды сұрайды.
   - **Correction:**

156. **EN:** Still being decided: how long information is kept while an account stays open. This page will say so once it is.
   - **RU:** Ещё решается: как долго хранятся данные, пока аккаунт открыт. Когда решение будет принято, оно появится на этой странице.
   - **KK:** Әлі шешілуде: аккаунт ашық тұрғанда деректер қанша уақыт сақталады. Шешім қабылданғанда, бұл бетте жазылады.
   - **Correction:**

157. **EN:** Still being decided: how long each kind of information is kept, and the full process for removing an account. This page will say so once it is.
   - **RU:** Ещё решается: сколько хранится каждый вид информации и как полностью проходит удаление аккаунта. Когда это будет решено, здесь об этом будет написано.
   - **KK:** Әлі шешілуде: ақпараттың әр түрі қанша уақыт сақталатыны және аккаунтты жоюдың толық тәртібі. Шешілгенде, бұл бетте жазылады.
   - **Correction:**

158. **EN:** Stores accounts, profiles, saved work, Mr EZ conversations, support messages and purchase records.
   - **RU:** Хранит аккаунты, профили, сохранённые работы, разговоры с Mr EZ, сообщения в поддержку и записи о покупках.
   - **KK:** Аккаунттарды, профильдерді, сақталған жұмыстарды, Mr EZ-пен әңгімелерді, қолдау қызметіне хабарламаларды және сатып алу жазбаларын сақтайды.
   - **Correction:**

159. **EN:** Outside Kazakhstan: the European Union or the United States.
   - **RU:** За пределами Казахстана: в Европейском союзе или в США.
   - **KK:** Қазақстаннан тыс жерде: Еуропалық одақта немесе АҚШ-та.
   - **Correction:**

160. **EN:** Writes the AI feedback and Mr EZ’s replies, and runs the live examiner. Your essay text, your Speaking recording, your voice in a live interview, and your questions to Mr EZ with a summary of your own results are sent to OpenAI for this.
   - **RU:** Пишет разборы ИИ и ответы Mr EZ и ведёт устного экзаменатора. Для этого в OpenAI отправляются текст вашего эссе, ваша запись Speaking, ваш голос на устном собеседовании и ваши вопросы к Mr EZ со сводкой ваших собственных результатов.
   - **KK:** ЖИ талдауын және Mr EZ жауаптарын жазады, ауызша емтихан алушының жұмысын қамтамасыз етеді. Ол үшін OpenAI-ға эссеңіздің мәтіні, Speaking жазбаңыз, ауызша сұхбаттағы дауысыңыз және өз нәтижелеріңіздің қысқаша мазмұнымен бірге Mr EZ-ге қойған сұрақтарыңыз жіберіледі.
   - **Correction:**

161. **EN:** The United States.
   - **RU:** США.
   - **KK:** АҚШ.
   - **Correction:**

162. **EN:** Runs the small services that check your account and pass your work to OpenAI, so the AI keys never reach your browser, and the security check on the support form.
   - **RU:** Запускает небольшие сервисы, которые проверяют ваш аккаунт и передают вашу работу в OpenAI, чтобы ключи ИИ никогда не попадали в ваш браузер, а также проверку безопасности в форме поддержки.
   - **KK:** Аккаунтыңызды тексеріп, жұмысыңызды OpenAI-ға жеткізетін шағын сервистерді іске қосады, сондықтан ЖИ кілттері браузеріңізге ешқашан түспейді. Қолдау формасындағы қауіпсіздік тексерісін де жүргізеді.
   - **Correction:**

163. **EN:** A worldwide network, with servers in many countries.
   - **RU:** Всемирная сеть с серверами во многих странах.
   - **KK:** Көптеген елдерде серверлері бар әлемдік желі.
   - **Correction:**

164. **EN:** Serves the pages of the site. Like any website host, it receives your connection’s address when your browser loads a page.
   - **RU:** Отдаёт страницы сайта. Как и любой хостинг, он получает адрес вашего подключения, когда браузер загружает страницу.
   - **KK:** Сайттың беттерін жеткізеді. Кез келген хостинг сияқты, браузеріңіз бетті жүктегенде ол байланысыңыздың мекенжайын алады.
   - **Correction:**

165. **EN:** The payment company
   - **RU:** Платёжная компания
   - **KK:** Төлем компаниясы
   - **Correction:**

166. **EN:** Takes your payment on its own page and confirms it to the site. It will be named here once it is chosen.
   - **RU:** Принимает оплату на своей странице и подтверждает её сайту. Её название появится здесь, когда она будет выбрана.
   - **KK:** Төлемді өз бетінде қабылдап, оны сайтқа растайды. Компания таңдалғанда, оның атауы осында жазылады.
   - **Correction:**

167. **EN:** Kazakhstan.
   - **RU:** Казахстан.
   - **KK:** Қазақстан.
   - **Correction:**

168. **EN:** Stores accounts, profiles, saved work, Mr EZ conversations and support messages.
   - **RU:** Хранит аккаунты, профили, сохранённые работы, разговоры с Mr EZ и сообщения в поддержку.
   - **KK:** Аккаунттарды, профильдерді, сақталған жұмыстарды, Mr EZ-пен әңгімелерді және қолдау қызметіне хабарламаларды сақтайды.
   - **Correction:**

169. **EN:** Writes the AI feedback and Mr EZ’s replies. Your essay text, your Speaking recording, and your questions to Mr EZ with a summary of your own results are sent to OpenAI for this, under OpenAI’s own terms for its API.
   - **RU:** Готовит разбор ИИ и ответы Mr EZ. Для этого в OpenAI отправляются текст эссе, запись Speaking и ваши вопросы к Mr EZ вместе со сводкой ваших результатов, по собственным условиям OpenAI для API.
   - **KK:** ЖИ талдауын және Mr EZ жауаптарын жазады. Ол үшін OpenAI-ға OpenAI-дың API бойынша өз шарттарымен эссеңіздің мәтіні, Speaking жазбаңыз және өз нәтижелеріңіздің қысқаша мазмұнымен бірге Mr EZ-ге қойған сұрақтарыңыз жіберіледі.
   - **Correction:**

170. **EN:** Runs the small services that check your account and pass your work to OpenAI, so the AI keys never reach your browser.
   - **RU:** Запускает небольшие сервисы, которые проверяют ваш аккаунт и передают работу в OpenAI, чтобы ключи ИИ никогда не попадали в ваш браузер.
   - **KK:** Аккаунтыңызды тексеріп, жұмысыңызды OpenAI-ға жеткізетін шағын сервистерді іске қосады, сондықтан ЖИ кілттері браузеріңізге ешқашан түспейді.
   - **Correction:**

171. **EN:** To know what information we hold about you and how it is used, and to get a copy. We answer within 3 working days.
   - **RU:** Знать, какие данные о вас у нас есть и как они используются, и получить их копию. Мы отвечаем в течение 3 рабочих дней.
   - **KK:** Сіз туралы қандай деректер бар екенін және олардың қалай пайдаланылатынын білу, сондай-ақ олардың көшірмесін алу. Біз 3 жұмыс күні ішінде жауап береміз.
   - **Correction:**

172. **EN:** To have information corrected, blocked or deleted if it is wrong or held unlawfully. We do this within 1 working day of confirming it.
   - **RU:** Исправить, заблокировать или удалить данные, если они неверны или хранятся незаконно. Мы делаем это в течение 1 рабочего дня после подтверждения.
   - **KK:** Деректер қате болса немесе заңсыз сақталса, оларды түзету, бұғаттау немесе жою. Біз мұны расталған соң 1 жұмыс күні ішінде орындаймыз.
   - **Correction:**

173. **EN:** To delete your account and everything in it, at any time.
   - **RU:** Удалить свой аккаунт и всё, что в нём, в любой момент.
   - **KK:** Аккаунтыңызды және ондағының бәрін кез келген уақытта жою.
   - **Correction:**

174. **EN:** To withdraw your consent. We stop using your information and delete it within 15 working days, except the records the law requires us to keep. The site cannot run an account without it, so withdrawing consent closes your account.
   - **RU:** Отозвать согласие. Мы перестаём использовать ваши данные и удаляем их в течение 15 рабочих дней, кроме записей, которые закон требует хранить. Без согласия сайт не может вести аккаунт, поэтому отзыв согласия закрывает аккаунт.
   - **KK:** Келісіміңізді кері қайтарып алу. Біз деректеріңізді пайдалануды тоқтатамыз және заң сақтауды талап ететін жазбалардан басқасын 15 жұмыс күні ішінде жоямыз. Келісімсіз сайт аккаунтты жүргізе алмайды, сондықтан келісімді қайтарып алу аккаунтты жабады.
   - **Correction:**

175. **EN:** To object to an AI result and have a person review it.
   - **RU:** Возразить против результата ИИ и попросить, чтобы его проверил человек.
   - **KK:** ЖИ нәтижесіне қарсылық білдіріп, оны адамға қайта қаратуға.
   - **Correction:**

176. **EN:** How your information is used
   - **RU:** Как используются ваши данные
   - **KK:** Деректеріңіз қалай пайдаланылады
   - **Correction:**

177. **EN:** This is the privacy notice of IELTS is EZ: who is responsible for your information, what is collected and why, who else receives it, how long it is kept and what your rights are. Only what the site actually does, in plain words.
   - **RU:** Это политика конфиденциальности IELTS is EZ: кто отвечает за ваши данные, что собирается и зачем, кто ещё их получает, сколько они хранятся и какие у вас права. Только то, что сайт действительно делает, простыми словами.
   - **KK:** Бұл IELTS is EZ құпиялылық саясаты: деректеріңізге кім жауап береді, не жиналады және не үшін, оларды тағы кім алады, қанша уақыт сақталады және қандай құқықтарыңыз бар. Тек сайттың шын мәнінде істейтіні, қарапайым тілмен.
   - **Correction:**

178. **EN:** Version of 2 October 2026, the same version as the consent you give when you create your account.
   - **RU:** Редакция от 2 октября 2026 года, та же редакция, что и у согласия, которое вы даёте при создании аккаунта.
   - **KK:** 2026 жылғы 2 қазандағы редакция, аккаунт ашқанда беретін келісіміңіздің редакциясымен бірдей.
   - **Correction:**

179. **EN:** What the site asks for and why, what it keeps, and which services handle it. Only what the site actually does, in plain words.
   - **RU:** Что сайт спрашивает и зачем, что он хранит и какие сервисы с этим работают. Только то, что сайт действительно делает, простыми словами.
   - **KK:** Сайт нені және не үшін сұрайды, нені сақтайды және олармен қандай сервистер жұмыс істейді. Тек сайттың шын мәнінде істейтіні, қарапайым тілмен.
   - **Correction:**

180. **EN:** Updated 1 October 2026
   - **RU:** Обновлено 1 октября 2026 года
   - **KK:** Жаңартылған күні: 2026 жылғы 1 қазан
   - **Correction:**

181. **EN:** Who is responsible
   - **RU:** Кто отвечает за сайт
   - **KK:** Кім жауап береді
   - **Correction:**

182. **EN:** Your information is handled by the seller of IELTS is EZ, a sole trader registered in Kazakhstan. The seller is the operator of your personal data: the one who decides how it is used and is responsible for keeping it safe.
   - **RU:** Вашими данными занимается продавец IELTS is EZ, индивидуальный предприниматель, зарегистрированный в Казахстане. Продавец является оператором ваших персональных данных: он решает, как они используются, и отвечает за их защиту.
   - **KK:** Деректеріңізбен Қазақстанда тіркелген жеке кәсіпкер, IELTS is EZ сатушысы жұмыс істейді. Сатушы сіздің дербес деректеріңіздің операторы болып табылады: олардың қалай пайдаланылатынын шешеді және қорғалуына жауап береді.
   - **Correction:**

183. **EN:** Run by
   - **RU:** Владелец
   - **KK:** Иесі
   - **Correction:**

184. **EN:** Contact
   - **RU:** Контакт
   - **KK:** Байланыс
   - **Correction:**

185. **EN:** What we ask for, and why
   - **RU:** Что мы спрашиваем и зачем
   - **KK:** Біз нені сұраймыз және не үшін
   - **Correction:**

186. **EN:** Your details are seen only by you and by the person who runs the site, on a private admin page. To help you study, that person can also see your test answers and your essays there. Other students never see any of it. (changed 5 October 2026: the owner can now see test answers and essays)
   - **RU:** Ваши данные видите только вы и тот, кто ведёт сайт, на закрытой странице администратора. Чтобы помогать вам в учёбе, этот человек также видит там ваши ответы в тестах и ваши эссе. Другие ученики ничего из этого не видят.
   - **KK:** Деректеріңізді тек сіз және сайтты жүргізетін адам жабық әкімші бетінде көресіздер. Оқуыңызға көмектесу үшін бұл адам сол жерде тесттердегі жауаптарыңызды және эсселеріңізді де көреді. Басқа оқушылар мұның ешқайсысын көрмейді.
   - **Correction:**

187. **EN:** What the site keeps from your studies
   - **RU:** Что сайт сохраняет о вашей учёбе
   - **KK:** Сайт оқуыңыздан нені сақтайды
   - **Correction:**

188. **EN:** Your progress is also kept in this browser, on this device. Signing in keeps it on your account too.
   - **RU:** Прогресс также хранится в этом браузере на этом устройстве. Если вы вошли в аккаунт, он сохраняется и в аккаунте.
   - **KK:** Үлгеріміңіз осы құрылғыдағы осы браузерде де сақталады. Аккаунтқа кірсеңіз, ол аккаунтыңызда да сақталады.
   - **Correction:**

189. **EN:** Purchases and payment records
   - **RU:** Покупки и платёжные записи
   - **KK:** Сатып алулар және төлем жазбалары
   - **Correction:**

190. **EN:** When you buy practice and guidance, or are given it, the site keeps these records:
   - **RU:** Когда вы покупаете практику и сопровождение или получаете их бесплатно, сайт хранит такие записи:
   - **KK:** Практика мен сүйемелдеуді сатып алғанда немесе оны тегін алғанда, сайт мына жазбаларды сақтайды:
   - **Correction:**

191. **EN:** A purchase that you start and do not finish is recorded too.
   - **RU:** Покупка, которую вы начали, но не завершили, тоже записывается.
   - **KK:** Бастап, бірақ аяқтамаған сатып алуыңыз да жазылады.
   - **Correction:**

192. **EN:** Card details are entered on the payment company’s own page. This site does not receive or keep them.
   - **RU:** Данные карты вводятся на странице самой платёжной компании. Этот сайт их не получает и не хранит.
   - **KK:** Карта деректері төлем компаниясының өз бетінде енгізіледі. Бұл сайт оларды алмайды және сақтамайды.
   - **Correction:**

193. **EN:** You can see your own purchases and receipts on your Account page. Other students cannot see them.
   - **RU:** Свои покупки и квитанции вы видите на странице «Аккаунт». Другие студенты их не видят.
   - **KK:** Өз сатып алуларыңыз бен түбіртектеріңізді Аккаунт бетінен көре аласыз. Басқа оқушылар оларды көре алмайды.
   - **Correction:**

194. **EN:** No payment company is connected yet, so buying is not open. When one is chosen, this page will name it and say what it receives.
   - **RU:** Платёжная компания пока не подключена, поэтому покупка ещё не открыта. Когда она будет выбрана, на этой странице появится её название и то, какие данные она получает.
   - **KK:** Төлем компаниясы әлі қосылмаған, сондықтан сатып алу әзірге ашық емес. Компания таңдалғанда, бұл бетте оның атауы және қандай деректер алатыны жазылады.
   - **Correction:**

195. **EN:** Why we use it, and on what basis
   - **RU:** Зачем мы используем данные и на каком основании
   - **KK:** Деректерді не үшін және қандай негізде пайдаланамыз
   - **Correction:**

196. **EN:** We use your information because you agree to it. You give your consent when you create your account, and a parent or guardian gives it for a student under 18. You can withdraw it at any time (see Your rights below).
   - **RU:** Мы используем ваши данные, потому что вы на это согласны. Вы даёте согласие при создании аккаунта, а за ученика младше 18 лет его даёт родитель или опекун. Отозвать согласие можно в любой момент (см. раздел «Ваши права» ниже).
   - **KK:** Біз деректеріңізді сіз келісім бергендіктен пайдаланамыз. Келісімді аккаунт ашқанда бересіз, ал 18 жасқа толмаған оқушы үшін оны ата-анасы немесе қамқоршысы береді. Оны кез келген уақытта кері қайтарып ала аласыз (төмендегі «Сіздің құқықтарыңыз» бөлімін қараңыз).
   - **Correction:**

197. **EN:** Sales records are kept after that because the tax law requires them.
   - **RU:** Записи о продажах хранятся и после этого, потому что их требует налоговое законодательство.
   - **KK:** Сату жазбалары одан кейін де сақталады, себебі оларды салық заңнамасы талап етеді.
   - **Correction:**

198. **EN:** Your information is never sold, never used for advertising and never made public.
   - **RU:** Ваши данные никогда не продаются, не используются для рекламы и не публикуются.
   - **KK:** Деректеріңіз ешқашан сатылмайды, жарнамаға пайдаланылмайды және жария етілмейді.
   - **Correction:**

199. **EN:** These companies handle your information for the site, only for the work described here:
   - **RU:** Эти компании обрабатывают ваши данные для сайта и только для описанной здесь работы:
   - **KK:** Бұл компаниялар деректеріңізді сайт үшін, тек осында сипатталған жұмыс үшін өңдейді:
   - **Correction:**

200. **EN:** Some of these companies are outside Kazakhstan, so your information is sent abroad. You agree to this as part of your consent.
   - **RU:** Некоторые из этих компаний находятся за пределами Казахстана, поэтому ваши данные передаются за границу. Вы соглашаетесь на это в рамках своего согласия.
   - **KK:** Бұл компаниялардың кейбірі Қазақстаннан тыс жерде орналасқан, сондықтан деректеріңіз шетелге жіберіледі. Сіз бұған келісіміңіздің бір бөлігі ретінде келісесіз.
   - **Correction:**

201. **EN:** In a live Speaking interview, your voice goes straight from your browser to OpenAI. It does not pass through this site, which keeps only a short record of when the interview started and ended, to apply the limits.
   - **RU:** На устном собеседовании Speaking ваш голос идёт напрямую из браузера в OpenAI. Он не проходит через этот сайт: сайт хранит только короткую запись о том, когда собеседование началось и закончилось, чтобы соблюдать лимиты.
   - **KK:** Speaking бойынша ауызша сұхбатта дауысыңыз браузерден тікелей OpenAI-ға барады. Ол бұл сайт арқылы өтпейді: сайт шектеулерді сақтау үшін сұхбаттың қашан басталып, қашан аяқталғаны туралы қысқа жазбаны ғана сақтайды.
   - **Correction:**

202. **EN:** In a live Speaking interview, your voice goes straight from your browser to OpenAI. It does not pass through this site, which keeps only a short record of when the interview started and ended, to apply the daily limits.
   - **RU:** Во время живого собеседования Speaking ваш голос идёт из браузера напрямую в OpenAI. Он не проходит через этот сайт; сайт хранит только краткую запись о начале и конце собеседования, чтобы соблюдать дневные лимиты.
   - **KK:** Speaking бойынша ауызша сұхбатта дауысыңыз браузерден тікелей OpenAI-ға барады. Ол бұл сайт арқылы өтпейді: сайт күндік шектеулерді сақтау үшін сұхбаттың қашан басталып, қашан аяқталғаны туралы қысқа жазбаны ғана сақтайды.
   - **Correction:**

203. **EN:** How long it is kept
   - **RU:** Сколько хранятся данные
   - **KK:** Деректер қанша уақыт сақталады
   - **Correction:**

204. **EN:** Cookies and your browser
   - **RU:** Cookie и ваш браузер
   - **KK:** Cookie және браузеріңіз
   - **Correction:**

205. **EN:** This site keeps only your sign-in, your study progress and settings such as your language in your browser. There are no advertising or analytics cookies.
   - **RU:** В вашем браузере сайт хранит только вход в аккаунт, ваш учебный прогресс и настройки, например язык. Рекламных и аналитических cookie нет.
   - **KK:** Бұл сайт браузеріңізде тек аккаунтқа кіруіңізді, оқу үлгеріміңізді және тіл сияқты баптауларды сақтайды. Жарнамалық немесе талдау cookie файлдары жоқ.
   - **Correction:**

206. **EN:** Your rights
   - **RU:** Ваши права
   - **KK:** Сіздің құқықтарыңыз
   - **Correction:**

207. **EN:** How to use them
   - **RU:** Как ими воспользоваться
   - **KK:** Оларды қалай пайдалануға болады
   - **Correction:**

208. **EN:** Download my data: open Account, then Profile. You get a copy of what your account holds.
   - **RU:** Скачать мои данные: откройте «Аккаунт», затем «Профиль». Вы получите копию того, что хранится в вашем аккаунте.
   - **KK:** Деректерімді жүктеп алу: «Аккаунт», содан кейін «Профиль» бөлімін ашыңыз. Аккаунтыңызда сақталғанның көшірмесін аласыз.
   - **Correction:**

209. **EN:** Delete account: open Account, then Profile.
   - **RU:** Удалить аккаунт: откройте «Аккаунт», затем «Профиль».
   - **KK:** Аккаунтты жою: «Аккаунт», содан кейін «Профиль» бөлімін ашыңыз.
   - **Correction:**

210. **EN:** Anything else: write through the support form.
   - **RU:** По любому другому вопросу: напишите через форму поддержки.
   - **KK:** Басқа кез келген мәселе бойынша: қолдау формасы арқылы жазыңыз.
   - **Correction:**

211. **EN:** Ask a person
   - **RU:** Спросить человека
   - **KK:** Адамнан сұрау
   - **Correction:**

212. **EN:** Using your rights is free.
   - **RU:** Воспользоваться своими правами можно бесплатно.
   - **KK:** Құқықтарыңызды пайдалану тегін.
   - **Correction:**

213. **EN:** Marking by AI
   - **RU:** Проверка с помощью ИИ
   - **KK:** ЖИ арқылы бағалау
   - **Correction:**

214. **EN:** Your essays and Speaking are marked automatically by AI, and Mr EZ and the live examiner are AI too. A band from AI is an estimate to help you practise. It is not an official IELTS score, and nothing else about you is decided by it.
   - **RU:** Ваши эссе и Speaking проверяет ИИ автоматически, и Mr EZ с устным экзаменатором тоже работают на ИИ. Балл от ИИ примерный, он нужен для практики. Это не официальный балл IELTS, и больше ничего о вас по нему не решается.
   - **KK:** Эссеңіз бен Speaking жауабыңызды ЖИ автоматты түрде бағалайды, Mr EZ пен ауызша емтихан алушы да ЖИ. ЖИ қойған Band бағасы жаттығуға көмектесетін болжам ғана. Бұл ресми IELTS балы емес және ол арқылы сіз туралы басқа ештеңе шешілмейді.
   - **Correction:**

215. **EN:** You can object to any AI result and ask a person to review it.
   - **RU:** Вы можете возразить против любого результата ИИ и попросить, чтобы его проверил человек.
   - **KK:** Кез келген ЖИ нәтижесіне қарсылық білдіріп, оны адамның қайта қарауын сұрай аласыз.
   - **Correction:**

216. **EN:** Keeping it safe
   - **RU:** Защита данных
   - **KK:** Деректерді қорғау
   - **Correction:**

217. **EN:** Only you and the person who runs the site can see your details. Connections to the site are encrypted.
   - **RU:** Ваши данные видите только вы и человек, который ведёт сайт. Соединения с сайтом зашифрованы.
   - **KK:** Деректеріңізді тек сіз және сайтты жүргізетін адам көре алады. Сайтқа қосылу шифрланған.
   - **Correction:**

218. **EN:** If your information is ever exposed in a security incident, the government body for personal data protection is told within one working day, as the law requires.
   - **RU:** Если ваши данные когда-нибудь окажутся раскрыты из-за инцидента безопасности, государственный орган по защите персональных данных будет уведомлён в течение одного рабочего дня, как требует закон.
   - **KK:** Егер қауіпсіздік оқиғасы салдарынан деректеріңіз ашылып қалса, заң талап еткендей, дербес деректерді қорғау жөніндегі мемлекеттік органға бір жұмыс күні ішінде хабарланады.
   - **Correction:**

219. **EN:** Younger students
   - **RU:** Ученики младше 18 лет
   - **KK:** 18 жасқа толмаған оқушылар
   - **Correction:**

220. **EN:** If you are under 18, a parent or guardian must agree before you use the site, and before any purchase. The profile asks for their name, their phone number and their agreement.
   - **RU:** Если вам меньше 18 лет, родитель или опекун должен дать согласие до того, как вы начнёте пользоваться сайтом, и перед любой покупкой. В профиле указываются их имя, номер телефона и согласие.
   - **KK:** Егер сіз 18 жасқа толмаған болсаңыз, сайтты пайдаланбас бұрын және кез келген сатып алу алдында ата-анаңыз немесе қамқоршыңыз келісім беруі керек. Профильде олардың аты, телефон нөмірі және келісімі сұралады.
   - **Correction:**

221. **EN:** Please read this page together with them.
   - **RU:** Пожалуйста, прочитайте эту страницу вместе с ним.
   - **KK:** Бұл бетті олармен бірге оқыңыз.
   - **Correction:**

222. **EN:** If you are under 18, the profile asks for a parent or guardian’s name and phone number, and for their agreement, before you can continue.
   - **RU:** Если вам меньше 18 лет, профиль попросит имя и номер телефона родителя или опекуна и его согласие, прежде чем вы сможете продолжить.
   - **KK:** Егер сіз 18 жасқа толмаған болсаңыз, жалғастырмас бұрын профиль ата-анаңыздың немесе қамқоршыңыздың аты мен телефон нөмірін және олардың келісімін сұрайды.
   - **Correction:**

223. **EN:** Questions about your information
   - **RU:** Вопросы о ваших данных
   - **KK:** Деректеріңіз туралы сұрақтар
   - **Correction:**

224. **EN:** Ask through the support form. A person reads every message and replies by email.
   - **RU:** Задайте вопрос через форму поддержки. Каждое сообщение читает человек и отвечает по электронной почте.
   - **KK:** Қолдау формасы арқылы сұраңыз. Әр хабарламаны адам оқиды және электрондық пошта арқылы жауап береді.
   - **Correction:**

225. **EN:** You can delete your account yourself at any time: open Account, then Profile, then Delete account.
   - **RU:** Вы можете сами удалить аккаунт в любой момент: откройте «Аккаунт», затем «Профиль», затем «Удаление аккаунта».
   - **KK:** Аккаунтыңызды кез келген уақытта өзіңіз жоя аласыз: «Аккаунт», содан кейін «Профиль», содан кейін «Аккаунтты жою» бөлімін ашыңыз.
   - **Correction:**

226. **EN:** Everything is removed at once and cannot be recovered: your details, your progress and results, your essays and speaking feedback, your saved items and notes, your study plan, your conversations with Mr EZ and your messages to us. Any access you have paid for ends.
   - **RU:** Всё удаляется сразу и без возможности восстановления: ваши данные, прогресс и результаты, эссе и разборы ответов Speaking, сохранённое и заметки, учебный план, переписка с Mr EZ и ваши сообщения нам. Оплаченный доступ прекращается.
   - **KK:** Бәрі бірден және қалпына келтіру мүмкіндігінсіз жойылады: деректеріңіз, үлгеріміңіз бен нәтижелеріңіз, эсселеріңіз бен Speaking талдаулары, сақталған материалдар мен жазбалар, оқу жоспарыңыз, Mr EZ-пен әңгімелеріңіз және бізге жазған хабарламаларыңыз. Төленген қолжетімділік тоқтатылады.
   - **Correction:**

227. **EN:** One thing is kept: a record of each payment (the plan, the amount, the date and the receipt number), without your name or email, for 5 years, because the tax law requires sales records to be kept.
   - **RU:** Остаётся только одно: запись о каждой оплате (тариф, сумма, дата и номер квитанции) без вашего имени и почты, на 5 лет, потому что налоговое законодательство требует хранить записи о продажах.
   - **KK:** Тек бір нәрсе сақталады: әр төлемнің жазбасы (тариф, сома, күні және түбіртек нөмірі) атыңыз бен электрондық поштаңызсыз 5 жыл сақталады, себебі салық заңнамасы сату жазбаларын сақтауды талап етеді.
   - **Correction:**

228. **EN:** The site has no button for deleting an account yet. To ask about removing your account or your information, use the support form.
   - **RU:** Кнопки для удаления аккаунта на сайте пока нет. Чтобы спросить об удалении аккаунта или ваших данных, напишите через форму поддержки.
   - **KK:** Сайтта аккаунтты жоюға арналған батырма әзірге жоқ. Аккаунтыңызды немесе деректеріңізді жою туралы сұрау үшін қолдау формасын пайдаланыңыз.
   - **Correction:**

Added 4 October 2026 (service logs, both builds; the retention row in the paid build only):

228a. **EN:** Service logs
   - **RU:** Служебные журналы
   - **KK:** Қызметтік журналдар
   - **Correction:**

228b. **EN:** Kept by Cloudflare for up to 7 days, then deleted automatically.
   - **RU:** Cloudflare хранит их до 7 дней, затем они удаляются автоматически.
   - **KK:** Cloudflare оларды 7 күнге дейін сақтайды, содан кейін олар автоматты түрде жойылады.
   - **Correction:**

228c. **EN:** The site’s services on Cloudflare keep short technical logs for up to 7 days, to find faults and slow connections: when each request came, how long it took, whether it worked, and your connection’s address. During a live interview your browser also sends one short summary of the connection’s quality (delays, lost sound, phone or computer), never your voice or your words. Your essays, recordings and messages are never in these logs.
   - **RU:** Сервисы сайта на Cloudflare хранят краткие технические журналы до 7 дней, чтобы находить сбои и медленные подключения: когда пришёл каждый запрос, сколько времени он занял, прошёл ли он успешно, и адрес вашего подключения. Во время живого собеседования браузер также отправляет одну короткую сводку о качестве связи (задержки, пропавший звук, телефон или компьютер), но никогда не ваш голос и не ваши слова. Ваших эссе, записей и сообщений в этих журналах нет.
   - **KK:** Сайттың Cloudflare-дағы сервистері ақаулар мен баяу байланысты табу үшін қысқа техникалық журналдарды 7 күнге дейін сақтайды: әр сұрау қашан келгені, қанша уақыт алғаны, сәтті өткені және байланысыңыздың мекенжайы. Тікелей сұхбат кезінде браузеріңіз байланыс сапасы туралы бір қысқа есеп те жібереді (кідірістер, жоғалған дыбыс, телефон немесе компьютер), бірақ дауысыңызды немесе сөздеріңізді ешқашан жібермейді. Эсселеріңіз, жазбаларыңыз және хабарламаларыңыз бұл журналдарда ешқашан болмайды.
   - **Correction:**

## Consent, your data, deleting the account, AI labels

Source file: `src/lib/i18n/dict/kk/consent.ts`

### Consent at sign-up

229. **EN:** I agree to my personal data being processed as described here, including its transfer to services outside Kazakhstan.
   - **RU:** Я согласен(на) на обработку моих персональных данных, как описано здесь, включая их передачу сервисам за пределами Казахстана.
   - **KK:** Дербес деректерімнің осында сипатталғандай өңделуіне, соның ішінде Қазақстаннан тыс жердегі сервистерге берілуіне келісемін.
   - **Correction:**

230. **EN:** Read what this covers
   - **RU:** Что входит в согласие
   - **KK:** Келісімге не кіреді
   - **Correction:**

231. **EN:** Consent version {version}.
   - **RU:** Версия согласия: {version}.
   - **KK:** Келісім редакциясы: {version}.
   - **Correction:**

232. **EN:** The privacy notice explains all of this in full.
   - **RU:** Подробно всё это описано в политике конфиденциальности.
   - **KK:** Мұның бәрі құпиялылық саясатында толық сипатталған.
   - **Correction:**

233. **EN:** Please tick the box to agree before creating your account.
   - **RU:** Чтобы создать аккаунт, отметьте галочку согласия.
   - **KK:** Аккаунт ашу үшін келісім белгісін қойыңыз.
   - **Correction:**

234. **EN:** Please tick the box to agree before you continue.
   - **RU:** Чтобы продолжить, отметьте галочку согласия.
   - **KK:** Жалғастыру үшін келісім белгісін қойыңыз.
   - **Correction:**

### The full wording

235. **EN:** Who processes your data
   - **RU:** Кто обрабатывает ваши данные
   - **KK:** Деректеріңізді кім өңдейді
   - **Correction:**

236. **EN:** Your data is processed by {name} (IIN {iin}), who runs IELTS is EZ.
   - **RU:** Ваши данные обрабатывает {name} (ИИН {iin}), владелец IELTS is EZ.
   - **KK:** Деректеріңізді IELTS is EZ иесі {name} (ЖСН {iin}) өңдейді.
   - **Correction:**

237. **EN:** Your data is processed by {name}, who runs IELTS is EZ.
   - **RU:** Ваши данные обрабатывает {name}, владелец IELTS is EZ.
   - **KK:** Деректеріңізді IELTS is EZ иесі {name} өңдейді.
   - **Correction:**

238. **EN:** Your data is processed by the person who runs IELTS is EZ.
   - **RU:** Ваши данные обрабатывает владелец IELTS is EZ.
   - **KK:** Деректеріңізді IELTS is EZ иесі өңдейді.
   - **Correction:**

239. **EN:** What data
   - **RU:** Какие данные
   - **KK:** Қандай деректер
   - **Correction:**

240. **EN:** Your email address, and your name if you sign in with Google.
   - **RU:** Ваш адрес электронной почты, а при входе через Google и ваше имя.
   - **KK:** Электрондық поштаңыздың мекенжайы, ал Google арқылы кірсеңіз, атыңыз да.
   - **Correction:**

241. **EN:** Your profile: first and last name, date of birth, phone, city, school, university or job, and how you found us. For a student under 18, a parent or guardian’s name and phone.
   - **RU:** Ваш профиль: имя и фамилия, дата рождения, телефон, город, школа, вуз или работа и то, как вы о нас узнали. Для ученика младше 18 лет также имя и телефон родителя или опекуна.
   - **KK:** Профиліңіз: аты-жөніңіз, туған күніңіз, телефоныңыз, қалаңыз, мектебіңіз, жоғары оқу орныңыз немесе жұмысыңыз және бізді қалай тапқаныңыз. 18 жасқа толмаған оқушы үшін ата-анасының немесе қамқоршысының аты мен телефоны да.
   - **Correction:**

242. **EN:** Your study: lessons completed, answers, test results, your study plan, saved words and notes.
   - **RU:** Ваша учёба: пройденные уроки, ответы, результаты тестов, учебный план, сохранённые слова и заметки.
   - **KK:** Оқуыңыз: аяқталған сабақтар, жауаптар, тест нәтижелері, оқу жоспарыңыз, сақталған сөздер мен жазбалар.
   - **Correction:**

243. **EN:** The essays you send for AI feedback, and the feedback. Speaking recordings are sent for marking, and only the results are kept.
   - **RU:** Эссе, которые вы отправляете на проверку ИИ, и разборы к ним. Записи Speaking отправляются на оценку, а сохраняются только результаты.
   - **KK:** ЖИ талдауына жіберетін эсселеріңіз және олардың талдауы. Speaking жазбалары бағалауға жіберіледі, тек нәтижелері сақталады.
   - **Correction:**

244. **EN:** Your conversations with Mr EZ, and the messages you send us.
   - **RU:** Ваши разговоры с Mr EZ и сообщения, которые вы отправляете нам.
   - **KK:** Mr EZ-пен әңгімелеріңіз және бізге жіберетін хабарламаларыңыз.
   - **Correction:**

245. **EN:** If you buy access: the plan, the amount, the date, the payment status and the receipt number. Card details go to the payment company, never to us.
   - **RU:** Если вы покупаете доступ: тариф, сумма, дата, статус оплаты и номер чека. Данные карты получает платёжная компания, а не мы.
   - **KK:** Қолжетімділікті сатып алсаңыз: тариф, сома, күні, төлем күйі және түбіртек нөмірі. Карта деректерін бізге емес, төлем компаниясы алады.
   - **Correction:**

246. **EN:** Why
   - **RU:** Зачем
   - **KK:** Не үшін
   - **Correction:**

247. **EN:** To run your account and keep your work on every device.
   - **RU:** Чтобы вести ваш аккаунт и сохранять вашу работу на всех устройствах.
   - **KK:** Аккаунтыңызды жүргізу және жұмысыңызды барлық құрылғыда сақтау үшін.
   - **Correction:**

248. **EN:** To give you the course, mark your essays and Speaking with AI, and run Mr EZ and the live examiner.
   - **RU:** Чтобы давать вам курс, оценивать ваши эссе и Speaking с помощью ИИ, а также работу Mr EZ и живого экзаменатора.
   - **KK:** Сізге курсты ұсыну, эссеңіз бен Speaking жауабыңызды ЖИ көмегімен бағалау, сондай-ақ Mr EZ пен ауызша емтихан алушының жұмысы үшін.
   - **Correction:**

249. **EN:** To answer your messages and contact you about your studies or your account.
   - **RU:** Чтобы отвечать на ваши сообщения и связываться с вами по поводу учёбы или аккаунта.
   - **KK:** Хабарламаларыңызға жауап беру және оқуыңызға немесе аккаунтыңызға қатысты сізбен байланысу үшін.
   - **Correction:**

250. **EN:** To keep the site secure and prevent misuse.
   - **RU:** Чтобы защищать сайт и не допускать злоупотреблений.
   - **KK:** Сайтты қорғау және теріс пайдалануға жол бермеу үшін.
   - **Correction:**

251. **EN:** To sell access and keep the sales records the law requires.
   - **RU:** Чтобы продавать доступ и хранить записи о продажах, которых требует закон.
   - **KK:** Қолжетімділікті сату және заң талап ететін сату жазбаларын сақтау үшін.
   - **Correction:**

252. **EN:** Who else receives it, and where
   - **RU:** Кто ещё получает данные и где
   - **KK:** Деректерді тағы кім алады және қай жерде
   - **Correction:**

253. **EN:** Supabase stores your account and your data (servers in the European Union or the United States).
   - **RU:** Supabase хранит ваш аккаунт и данные (серверы в Европейском союзе или США).
   - **KK:** Supabase аккаунтыңыз бен деректеріңізді сақтайды (серверлері Еуропалық одақта немесе АҚШ-та).
   - **Correction:**

254. **EN:** OpenAI marks essays and Speaking and runs Mr EZ and the live examiner (United States).
   - **RU:** OpenAI оценивает эссе и Speaking и обеспечивает работу Mr EZ и живого экзаменатора (США).
   - **KK:** OpenAI эссе мен Speaking жауаптарын бағалайды және Mr EZ пен ауызша емтихан алушының жұмысын қамтамасыз етеді (АҚШ).
   - **Correction:**

255. **EN:** Cloudflare runs the site’s background services and its security check (servers around the world).
   - **RU:** Cloudflare обеспечивает фоновые сервисы сайта и проверку безопасности (серверы по всему миру).
   - **KK:** Cloudflare сайттың фондық сервистері мен қауіпсіздік тексерісін қамтамасыз етеді (серверлері бүкіл әлемде).
   - **Correction:**

256. **EN:** GitHub Pages delivers the site’s pages to your browser (United States).
   - **RU:** GitHub Pages доставляет страницы сайта в ваш браузер (США).
   - **KK:** GitHub Pages сайттың беттерін браузеріңізге жеткізеді (АҚШ).
   - **Correction:**

257. **EN:** The payment company handles payments (Kazakhstan).
   - **RU:** Платёжная компания проводит оплату (Казахстан).
   - **KK:** Төлем компаниясы төлемдерді жүргізеді (Қазақстан).
   - **Correction:**

258. **EN:** So your data is transferred outside Kazakhstan, and by agreeing you consent to that transfer.
   - **RU:** Значит, ваши данные передаются за пределы Казахстана, и, соглашаясь, вы даёте согласие на эту передачу.
   - **KK:** Яғни деректеріңіз Қазақстаннан тыс жерге беріледі, ал келісім бере отырып, сіз осы беруге келісесіз.
   - **Correction:**

259. **EN:** Nothing about you is made public.
   - **RU:** Никакие сведения о вас не публикуются.
   - **KK:** Сіз туралы ешқандай мәлімет жария етілмейді.
   - **Correction:**

260. **EN:** How long your consent lasts
   - **RU:** Сколько действует согласие
   - **KK:** Келісім қанша уақыт әрекет етеді
   - **Correction:**

261. **EN:** While your account is open: until you withdraw it or delete your account.
   - **RU:** Пока открыт ваш аккаунт: до тех пор, пока вы не отзовёте согласие или не удалите аккаунт.
   - **KK:** Аккаунтыңыз ашық тұрғанша: келісімді кері қайтарып алғанша немесе аккаунтты жойғанша.
   - **Correction:**

262. **EN:** How to withdraw it
   - **RU:** Как отозвать согласие
   - **KK:** Келісімді қалай кері қайтарып алуға болады
   - **Correction:**

263. **EN:** You can withdraw your consent at any time by deleting your account: Account, then Profile, then Delete account. Everything is removed at once.
   - **RU:** Вы можете отозвать согласие в любой момент, удалив аккаунт: «Аккаунт», затем «Профиль», затем «Удаление аккаунта». Всё удаляется сразу.
   - **KK:** Келісіміңізді кез келген уақытта аккаунтты жою арқылы кері қайтарып ала аласыз: «Аккаунт», содан кейін «Профиль», содан кейін «Аккаунтты жою». Бәрі бірден жойылады.
   - **Correction:**

264. **EN:** You can also ask us to do it through the support form.
   - **RU:** Можно также попросить нас сделать это через форму поддержки.
   - **KK:** Мұны қолдау формасы арқылы бізден сұрай аласыз.
   - **Correction:**

265. **EN:** You can withdraw your consent at any time by asking us, through the support form, to close your account.
   - **RU:** Вы можете отозвать согласие в любой момент, попросив нас через форму поддержки закрыть ваш аккаунт.
   - **KK:** Қолдау формасы арқылы аккаунтыңызды жабуды бізден сұрап, келісіміңізді кез келген уақытта кері қайтарып ала аласыз.
   - **Correction:**

266. **EN:** You can withdraw your consent at any time by asking us to close your account.
   - **RU:** Вы можете отозвать согласие в любой момент, попросив нас закрыть ваш аккаунт.
   - **KK:** Аккаунтыңызды жабуды бізден сұрап, келісіміңізді кез келген уақытта кері қайтарып ала аласыз.
   - **Correction:**

267. **EN:** The site cannot keep an account without this data, so withdrawing consent closes the account.
   - **RU:** Без этих данных сайт не может вести аккаунт, поэтому отзыв согласия закрывает аккаунт.
   - **KK:** Бұл деректерсіз сайт аккаунтты жүргізе алмайды, сондықтан келісімді кері қайтарып алу аккаунтты жабады.
   - **Correction:**

268. **EN:** A record of each payment is kept without your name or email for 5 years, because tax law requires sales records.
   - **RU:** Запись о каждой оплате хранится без вашего имени и почты 5 лет, потому что налоговый закон требует хранить записи о продажах.
   - **KK:** Әр төлемнің жазбасы атыңыз бен электрондық поштаңызсыз 5 жыл сақталады, себебі салық заңы сату жазбаларын сақтауды талап етеді.
   - **Correction:**

### The parent or guardian's declaration (profile form, under 18)

269. **EN:** My parent or guardian agrees to me using this site, to my personal data being processed as the privacy notice describes, and to any purchase of access I make.
   - **RU:** Мой родитель или опекун согласен(на), чтобы я пользовался(ась) этим сайтом, на обработку моих персональных данных, как описано в политике конфиденциальности, и на любую мою покупку доступа.
   - **KK:** Ата-анам немесе қамқоршым менің осы сайтты пайдалануыма, дербес деректерімнің құпиялылық саясатында сипатталғандай өңделуіне және менің кез келген қолжетімділік сатып алуыма келіседі.
   - **Correction:**

270. **EN:** My parent or guardian agrees to me using this site and to my personal data being processed as the privacy notice describes.
   - **RU:** Мой родитель или опекун согласен(на), чтобы я пользовался(ась) этим сайтом, и на обработку моих персональных данных, как описано в политике конфиденциальности.
   - **KK:** Ата-анам немесе қамқоршым менің осы сайтты пайдалануыма және дербес деректерімнің құпиялылық саясатында сипатталғандай өңделуіне келіседі.
   - **Correction:**

### AI labels and a person's review

271. **EN:** Marked by AI. This band is an AI estimate, not an official IELTS score.
   - **RU:** Оценено ИИ. Этот балл является оценкой ИИ, а не официальным результатом IELTS.
   - **KK:** ЖИ бағалады. Бұл Band бағасы ЖИ болжамы, ресми IELTS балы емес.
   - **Correction:**

272. **EN:** Ask a person to review it
   - **RU:** Попросить человека проверить
   - **KK:** Адамның тексеруін сұрау
   - **Correction:**

273. **EN:** {name} is an AI voice, not a real person. Your interview is marked by AI.
   - **RU:** {name} является голосом ИИ, а не реальным человеком. Ваше интервью оценивает ИИ.
   - **KK:** {name}: ЖИ дауысы, шын адам емес. Сұхбатыңызды ЖИ бағалайды.
   - **Correction:**

274. **EN:** Mr EZ is an AI tutor, not a real person.
   - **RU:** Mr EZ является ИИ-наставником, а не реальным человеком.
   - **KK:** Mr EZ: ЖИ тәлімгері, шын адам емес.
   - **Correction:**

### The two support reasons (SupportForm.tsx)

275. **EN:** You came here to ask for a refund. Tell us which purchase it is for, and a person will answer by email.
   - **RU:** Вы пришли сюда, чтобы запросить возврат. Напишите, о какой покупке речь, и человек ответит вам по почте.
   - **KK:** Сіз ақшаны қайтаруды сұрау үшін келдіңіз. Қай сатып алу туралы екенін жазыңыз, адам сізге электрондық пошта арқылы жауап береді.
   - **Correction:**

276. **EN:** You came here to ask a person to review an AI-marked result. Tell us which essay or Speaking result it is and what you would like checked.
   - **RU:** Вы пришли сюда, чтобы попросить человека проверить результат, выставленный ИИ. Напишите, о каком эссе или результате Speaking речь и что нужно проверить.
   - **KK:** Сіз ЖИ қойған нәтижені адамның қайта қарауын сұрау үшін келдіңіз. Қай эссе немесе Speaking нәтижесі туралы екенін және нені тексеру керек екенін жазыңыз.
   - **Correction:**

### Account > Profile: Download my data

277. **EN:** Your data
   - **RU:** Ваши данные
   - **KK:** Деректеріңіз
   - **Correction:**

278. **EN:** Download a copy of everything your account holds, as one file.
   - **RU:** Скачайте копию всего, что хранится в вашем аккаунте, одним файлом.
   - **KK:** Аккаунтыңызда сақталғанның бәрінің көшірмесін бір файл етіп жүктеп алыңыз.
   - **Correction:**

279. **EN:** Download my data
   - **RU:** Скачать мои данные
   - **KK:** Деректерімді жүктеп алу
   - **Correction:**

280. **EN:** Preparing…
   - **RU:** Готовим…
   - **KK:** Дайындалуда…
   - **Correction:**

281. **EN:** Your file is downloading.
   - **RU:** Файл скачивается.
   - **KK:** Файл жүктелуде.
   - **Correction:**

282. **EN:** Your file is downloading, but some parts could not be read just now. Try again later for a complete copy.
   - **RU:** Файл скачивается, но некоторые части сейчас не удалось прочитать. Попробуйте позже, чтобы получить полную копию.
   - **KK:** Файл жүктелуде, бірақ кейбір бөліктерін қазір оқу мүмкін болмады. Толық көшірме алу үшін кейінірек қайталап көріңіз.
   - **Correction:**

283. **EN:** Your data could not be read just now. Please try again.
   - **RU:** Сейчас не удалось прочитать ваши данные. Попробуйте ещё раз.
   - **KK:** Деректеріңізді қазір оқу мүмкін болмады. Қайталап көріңіз.
   - **Correction:**

### Account > Profile: Delete account

284. **EN:** Delete account
   - **RU:** Удаление аккаунта
   - **KK:** Аккаунтты жою
   - **Correction:**

285. **EN:** Removes your account and all your data at once. This cannot be undone.
   - **RU:** Сразу удаляет ваш аккаунт и все ваши данные. Это нельзя отменить.
   - **KK:** Аккаунтыңыз бен барлық деректеріңізді бірден жояды. Мұны кері қайтару мүмкін емес.
   - **Correction:**

286. **EN:** Delete my account
   - **RU:** Удалить мой аккаунт
   - **KK:** Аккаунтымды жою
   - **Correction:**

287. **EN:** Deleting your account removes, immediately and for good: your details, your progress and results, your essays and speaking feedback, your saved items and notes, your study plan, your conversations with Mr EZ and your messages to us. Any access you have paid for ends.
   - **RU:** Удаление аккаунта сразу и навсегда стирает: ваши данные, прогресс и результаты, эссе и разборы ответов Speaking, сохранённое и заметки, учебный план, переписку с Mr EZ и ваши сообщения нам. Оплаченный доступ прекращается.
   - **KK:** Аккаунтты жою мыналарды бірден және біржола өшіреді: деректеріңіз, үлгеріміңіз бен нәтижелеріңіз, эсселеріңіз бен Speaking талдаулары, сақталған материалдар мен жазбалар, оқу жоспарыңыз, Mr EZ-пен әңгімелеріңіз және бізге жазған хабарламаларыңыз. Төленген қолжетімділік тоқтатылады.
   - **Correction:**

288. **EN:** Only a record of each payment is kept, without your name or email, because the law requires sales records to be kept.
   - **RU:** Остаётся только запись о каждой оплате, без вашего имени и почты, потому что закон требует хранить записи о продажах.
   - **KK:** Заң сату жазбаларын сақтауды талап ететіндіктен, тек әр төлемнің жазбасы атыңыз бен электрондық поштаңызсыз сақталады.
   - **Correction:**

289. **EN:** I understand that my account and all my data will be deleted and cannot be recovered.
   - **RU:** Я понимаю, что мой аккаунт и все мои данные будут удалены и их нельзя будет восстановить.
   - **KK:** Аккаунтым мен барлық деректерімнің жойылатынын және оларды қалпына келтіру мүмкін емес екенін түсінемін.
   - **Correction:**

290. **EN:** Deleting…
   - **RU:** Удаляем…
   - **KK:** Жойылуда…
   - **Correction:**

291. **EN:** Delete my account and all my data
   - **RU:** Удалить аккаунт и все мои данные
   - **KK:** Аккаунтым мен барлық деректерімді жою
   - **Correction:**

292. **EN:** Cancel
   - **RU:** Отмена
   - **KK:** Бас тарту
   - **Correction:**

### The account-deleted page

293. **EN:** Your account has been deleted
   - **RU:** Ваш аккаунт удалён
   - **KK:** Аккаунтыңыз жойылды
   - **Correction:**

294. **EN:** Your account and all your data have been removed. Thank you for studying with us.
   - **RU:** Ваш аккаунт и все ваши данные удалены. Спасибо, что занимались с нами.
   - **KK:** Аккаунтыңыз бен барлық деректеріңіз жойылды. Бізбен бірге оқығаныңызға рахмет.
   - **Correction:**

295. **EN:** You can create a new account at any time. It will start empty.
   - **RU:** Вы можете в любой момент создать новый аккаунт. Он начнётся с чистого листа.
   - **KK:** Кез келген уақытта жаңа аккаунт аша аласыз. Ол бос күйде басталады.
   - **Correction:**

296. **EN:** Back to the home page
   - **RU:** Вернуться на главную
   - **KK:** Басты бетке оралу
   - **Correction:**

### Inside the downloaded file (src/lib/legal/export.ts)

297. **EN:** Everything your IELTS is EZ account holds, and what this browser keeps for you, as read when you downloaded this file.
   - **RU:** Всё, что хранится в вашем аккаунте IELTS is EZ, и то, что этот браузер хранит для вас, на момент скачивания файла.
   - **KK:** IELTS is EZ аккаунтыңызда сақталғанның бәрі және осы браузердің сіз үшін сақтайтыны, файлды жүктеп алған сәттегі күйі.
   - **Correction:**

298. **EN:** Your details from the profile form.
   - **RU:** Ваши данные из профиля.
   - **KK:** Профильдегі деректеріңіз.
   - **Correction:**

299. **EN:** Your saved progress and study plan.
   - **RU:** Ваш сохранённый прогресс и учебный план.
   - **KK:** Сақталған үлгеріміңіз бен оқу жоспарыңыз.
   - **Correction:**

300. **EN:** A record of what you studied and when.
   - **RU:** Запись о том, что и когда вы изучали.
   - **KK:** Нені және қашан оқығаныңыз туралы жазба.
   - **Correction:**

301. **EN:** Your personal study plan.
   - **RU:** Ваш личный учебный план.
   - **KK:** Жеке оқу жоспарыңыз.
   - **Correction:**

302. **EN:** Your saved words, notes and study preferences.
   - **RU:** Ваши сохранённые слова, заметки и учебные настройки.
   - **KK:** Сақталған сөздеріңіз, жазбаларыңыз және оқу баптауларыңыз.
   - **Correction:**

303. **EN:** Your conversations with Mr EZ.
   - **RU:** Ваши разговоры с Mr EZ.
   - **KK:** Mr EZ-пен әңгімелеріңіз.
   - **Correction:**

304. **EN:** The messages in those conversations.
   - **RU:** Сообщения в этих разговорах.
   - **KK:** Сол әңгімелердегі хабарламалар.
   - **Correction:**

305. **EN:** The latest next step Mr EZ suggested.
   - **RU:** Последний следующий шаг, который предложил Mr EZ.
   - **KK:** Mr EZ ұсынған соңғы келесі қадам.
   - **Correction:**

306. **EN:** Weekly reviews and unit notes from Mr EZ.
   - **RU:** Недельные обзоры и заметки к разделам от Mr EZ.
   - **KK:** Mr EZ-тің апталық шолулары мен бөлімдерге жазбалары.
   - **Correction:**

307. **EN:** Your trial, if you had one.
   - **RU:** Ваш пробный период, если он был.
   - **KK:** Сынақ мерзіміңіз, егер ол болса.
   - **Correction:**

308. **EN:** What you used during the trial.
   - **RU:** Что вы использовали во время пробного периода.
   - **KK:** Сынақ мерзімінде не пайдаланғаныңыз.
   - **Correction:**

309. **EN:** Each AI assessment counted against your access.
   - **RU:** Каждая оценка ИИ, учтённая в вашем доступе.
   - **KK:** Қолжетімділігіңізден есептелген әр ЖИ тексеруі.
   - **Correction:**

310. **EN:** Your periods of access.
   - **RU:** Ваши периоды доступа.
   - **KK:** Қолжетімділік мерзімдеріңіз.
   - **Correction:**

311. **EN:** Your purchases and receipts.
   - **RU:** Ваши покупки и чеки.
   - **KK:** Сатып алуларыңыз бен түбіртектеріңіз.
   - **Correction:**

312. **EN:** The messages you sent us through the support form.
   - **RU:** Сообщения, которые вы отправили нам через форму поддержки.
   - **KK:** Қолдау формасы арқылы бізге жіберген хабарламаларыңыз.
   - **Correction:**

313. **EN:** A usage record for each Mr EZ reply (the AI model, its size and cost), used for spending limits.
   - **RU:** Запись об использовании для каждого ответа Mr EZ (модель ИИ, объём и стоимость), нужна для лимитов расходов.
   - **KK:** Mr EZ-тің әр жауабы бойынша пайдалану жазбасы (ЖИ моделі, көлемі және құны), шығын шектеулері үшін қажет.
   - **Correction:**

314. **EN:** When each live Speaking interview started and ended, used for the daily limits. Your voice is never stored.
   - **RU:** Когда начиналось и заканчивалось каждое живое интервью Speaking, нужно для дневных лимитов. Ваш голос никогда не сохраняется.
   - **KK:** Speaking бойынша әр ауызша сұхбаттың қашан басталып, қашан аяқталғаны, күндік шектеулер үшін қажет. Дауысыңыз ешқашан сақталмайды.
   - **Correction:**

315. **EN:** The AI service’s usage figures for each assessment. Never your essay, your audio or the reply.
   - **RU:** Показатели использования сервиса ИИ для каждой оценки. Никогда не ваше эссе, не запись и не ответ.
   - **KK:** Әр тексеру бойынша ЖИ сервисінің пайдалану көрсеткіштері. Эссеңіз, жазбаңыз немесе жауап ешқашан сақталмайды.
   - **Correction:**

316. **EN:** Kept for spending limits and not readable from your browser. Ask us for a copy if you need it.
   - **RU:** Хранится для лимитов расходов и недоступно для чтения из браузера. Если нужна копия, напишите нам.
   - **KK:** Шығын шектеулері үшін сақталады және браузеріңізден оқылмайды. Көшірме қажет болса, бізге жазыңыз.
   - **Correction:**

317. **EN:** Kept only on this device. Other devices may hold different items.
   - **RU:** Хранится только на этом устройстве. На других устройствах может храниться другое.
   - **KK:** Тек осы құрылғыда сақталады. Басқа құрылғыларда басқа нәрселер сақталуы мүмкін.
   - **Correction:**

## Plans, buying, receipts and account access (/plans, /plans/return, /account)

Source file: `src/lib/i18n/dict/kk/buying.ts`

### /plans

318. **EN:** Keep your momentum.
   - **RU:** Сохраните темп.
   - **KK:** Қарқынды жоғалтпаңыз.
   - **Correction:**

319. **EN:** Choose more time for your IELTS preparation.
   - **RU:** Выберите, сколько времени добавить к подготовке к IELTS.
   - **KK:** IELTS-ке дайындыққа қанша уақыт қосатыныңызды таңдаңыз.
   - **Correction:**

320. **EN:** One month
   - **RU:** Один месяц
   - **KK:** Бір ай
   - **Correction:**

321. **EN:** total
   - **RU:** всего
   - **KK:** барлығы
   - **Correction:**

322. **EN:** The full course and every practice test for one month.
   - **RU:** Полный курс и все тренировочные тесты на один месяц.
   - **KK:** Бір айға толық курс және барлық жаттығу тесттері.
   - **Correction:**

323. **EN:** Payment not connected yet
   - **RU:** Оплата пока не подключена
   - **KK:** Төлем әзірге қосылмаған
   - **Correction:**

324. **EN:** Back to Today
   - **RU:** Вернуться к плану на сегодня
   - **KK:** Бүгінгі жоспарға оралу
   - **Correction:**

325. **EN:** Back to my trial
   - **RU:** Вернуться к пробному периоду
   - **KK:** Сынақ мерзіміне оралу
   - **Correction:**

326. **EN:** Purchase history
   - **RU:** История покупок
   - **KK:** Сатып алу тарихы
   - **Correction:**

327. **EN:** Add more time.
   - **RU:** Добавьте времени.
   - **KK:** Уақыт қосыңыз.
   - **Correction:**

328. **EN:** Taking you to payment…
   - **RU:** Переходим к оплате…
   - **KK:** Төлемге өтудеміз…
   - **Correction:**

329. **EN:** This takes a few seconds. Please keep this page open.
   - **RU:** Это займёт несколько секунд. Не закрывайте эту страницу.
   - **KK:** Бұл бірнеше секунд алады. Бұл бетті жаппаңыз.
   - **Correction:**

330. **EN:** Try again
   - **RU:** Попробовать ещё раз
   - **KK:** Қайталап көру
   - **Correction:**

331. **EN:** Save {amount} compared with three monthly purchases.
   - **RU:** Экономия {amount} по сравнению с тремя месячными покупками.
   - **KK:** Үш айлық жеке сатып алумен салыстырғанда үнемдеу: {amount}.
   - **Correction:**

332. **EN:** Buy three months
   - **RU:** Купить три месяца
   - **KK:** Үш айды сатып алу
   - **Correction:**

333. **EN:** Buy one month
   - **RU:** Купить один месяц
   - **KK:** Бір айды сатып алу
   - **Correction:**

334. **EN:** Sign in to buy
   - **RU:** Войти, чтобы купить
   - **KK:** Сатып алу үшін кіріңіз
   - **Correction:**

335. **EN:** Adds to your current access, which then runs until {date}.
   - **RU:** Добавится к вашему текущему доступу, и он продлится до {date}.
   - **KK:** Қазіргі қолжетімділігіңізге қосылады, сонда ол мына күнге дейін созылады: {date}.
   - **Correction:**

### Shared access pieces (AccessParts.tsx)

336. **EN:** SIMULATED payments
   - **RU:** СИМУЛЯЦИЯ оплаты
   - **KK:** ТӨЛЕМ СИМУЛЯЦИЯСЫ
   - **Correction:**

337. **EN:** This is a local test. No money is taken and nothing here is a real purchase.
   - **RU:** Это локальная проверка. Деньги не списываются, и ничего здесь не является настоящей покупкой.
   - **KK:** Бұл жергілікті тексеріс. Ақша алынбайды және мұндағы ештеңе шын сатып алу емес.
   - **Correction:**

338. **EN:** Checking your access…
   - **RU:** Проверяем ваш доступ…
   - **KK:** Қолжетімділігіңізді тексеріп жатырмыз…
   - **Correction:**

339. **EN:** You are not signed in
   - **RU:** Вы не вошли в аккаунт
   - **KK:** Сіз аккаунтқа кірмегенсіз
   - **Correction:**

340. **EN:** Sign in to buy. Your access belongs to your account and works on every device.
   - **RU:** Войдите, чтобы купить. Доступ привязан к вашему аккаунту и работает на любом устройстве.
   - **KK:** Сатып алу үшін кіріңіз. Қолжетімділік аккаунтыңызға тиесілі және кез келген құрылғыда жұмыс істейді.
   - **Correction:**

341. **EN:** We could not check your access
   - **RU:** Не удалось проверить ваш доступ
   - **KK:** Қолжетімділігіңізді тексеру мүмкін болмады
   - **Correction:**

342. **EN:** Your purchases and your work are safe. Please try again.
   - **RU:** Ваши покупки и ваша работа в сохранности. Попробуйте ещё раз.
   - **KK:** Сатып алуларыңыз бен жұмысыңыз сақтаулы. Қайталап көріңіз.
   - **Correction:**

343. **EN:** Payment confirmed
   - **RU:** Оплата подтверждена
   - **KK:** Төлем расталды
   - **Correction:**

344. **EN:** Full access until {date}
   - **RU:** Полный доступ до {date}
   - **KK:** Толық қолжетімділік, аяқталу күні: {date}
   - **Correction:**

345. **EN:** Your access has been updated.
   - **RU:** Ваш доступ обновлён.
   - **KK:** Қолжетімділігіңіз жаңартылды.
   - **Correction:**

346. **EN:** That payment was not completed
   - **RU:** Эта оплата не была завершена
   - **KK:** Бұл төлем аяқталмады
   - **Correction:**

347. **EN:** Your access has not changed. You can choose a plan again whenever you like.
   - **RU:** Ваш доступ не изменился. Вы можете снова выбрать тариф в любое время.
   - **KK:** Қолжетімділігіңіз өзгерген жоқ. Тарифті кез келген уақытта қайта таңдай аласыз.
   - **Correction:**

348. **EN:** You have an unfinished purchase
   - **RU:** У вас есть незавершённая покупка
   - **KK:** Сізде аяқталмаған сатып алу бар
   - **Correction:**

349. **EN:** {plan}, started on {date}. If you closed the payment page, you can check it again or start again.
   - **RU:** {plan}, начата {date}. Если вы закрыли страницу оплаты, можно проверить покупку ещё раз или начать заново.
   - **KK:** {plan}, басталған күні: {date}. Төлем бетін жапқан болсаңыз, оны қайта тексеруге немесе қайтадан бастауға болады.
   - **Correction:**

350. **EN:** We have not had a confirmation for it yet. If you already paid, give it a few minutes and check again. If you did not finish paying, start again.
   - **RU:** Подтверждения пока нет. Если вы уже оплатили, подождите несколько минут и проверьте снова. Если вы не закончили оплату, начните заново.
   - **KK:** Әзірге растау келген жоқ. Төлеп қойған болсаңыз, бірнеше минут күтіп, қайта тексеріңіз. Төлемді аяқтамаған болсаңыз, қайтадан бастаңыз.
   - **Correction:**

351. **EN:** We could not check it just now. Nothing has changed. Please try again.
   - **RU:** Сейчас не удалось это проверить. Ничего не изменилось. Попробуйте ещё раз.
   - **KK:** Қазір мұны тексеру мүмкін болмады. Ештеңе өзгерген жоқ. Қайталап көріңіз.
   - **Correction:**

352. **EN:** Checking…
   - **RU:** Проверяем…
   - **KK:** Тексерілуде…
   - **Correction:**

353. **EN:** Check again
   - **RU:** Проверить ещё раз
   - **KK:** Қайта тексеру
   - **Correction:**

354. **EN:** Start again
   - **RU:** Начать заново
   - **KK:** Қайтадан бастау
   - **Correction:**

### The account page's frame and tabs (src/pages/account.astro), around Account > Profile and Account > Access

355. **EN:** Log in to see your details, your saved work and your results.
   - **RU:** Войдите, чтобы увидеть свои данные, сохранённое и результаты.
   - **KK:** Деректеріңізді, сақталған жұмыстарыңызды және нәтижелеріңізді көру үшін кіріңіз.
   - **Correction:**

356. **EN:** Log in
   - **RU:** Войти
   - **KK:** Кіру
   - **Correction:**

357. **EN:** Create a free account
   - **RU:** Создать бесплатный аккаунт
   - **KK:** Тегін аккаунт ашу
   - **Correction:**

358. **EN:** Profile
   - **RU:** Профиль
   - **KK:** Профиль
   - **Correction:**

359. **EN:** Access
   - **RU:** Доступ
   - **KK:** Қолжетімділік
   - **Correction:**

360. **EN:** Saved and results
   - **RU:** Сохранённое и результаты
   - **KK:** Сақталғандар мен нәтижелер
   - **Correction:**

### Account > Access (AccountAccess.tsx)

361. **EN:** Add more time
   - **RU:** Добавить время
   - **KK:** Уақыт қосу
   - **Correction:**

362. **EN:** Buy access again
   - **RU:** Купить доступ снова
   - **KK:** Қолжетімділікті қайта сатып алу
   - **Correction:**

363. **EN:** View plans
   - **RU:** Посмотреть тарифы
   - **KK:** Тарифтерді көру
   - **Correction:**

364. **EN:** Your access
   - **RU:** Ваш доступ
   - **KK:** Қолжетімділігіңіз
   - **Correction:**

365. **EN:** What your account can open, and every purchase you have made.
   - **RU:** Что открыто в вашем аккаунте, и все ваши покупки.
   - **KK:** Аккаунтыңызда не ашық және сіздің барлық сатып алуларыңыз.
   - **Correction:**

366. **EN:** Full access includes
   - **RU:** Полный доступ включает:
   - **KK:** Толық қолжетімділікке кіреді:
   - **Correction:**

367. **EN:** The full course and every practice test.
   - **RU:** Полный курс и все тренировочные тесты.
   - **KK:** Толық курс және барлық жаттығу тесттері.
   - **Correction:**

368. **EN:** We could not load your purchases just now. Please try again.
   - **RU:** Сейчас не удалось загрузить ваши покупки. Попробуйте ещё раз.
   - **KK:** Сатып алуларыңызды қазір жүктеу мүмкін болмады. Қайталап көріңіз.
   - **Correction:**

369. **EN:** No purchases yet.
   - **RU:** Покупок пока нет.
   - **KK:** Әзірге сатып алу жоқ.
   - **Correction:**

370. **EN:** Receipt
   - **RU:** Чек
   - **KK:** Түбіртек
   - **Correction:**

### Allowance notes (AllowanceNote.tsx)

371. **EN:** The placement test is taken once per account, and this account has already taken it. Your plan already uses that result.
   - **RU:** Вступительный тест проходят один раз на аккаунт, и на этом аккаунте он уже пройден. Ваш план уже учитывает этот результат.
   - **KK:** Деңгейді анықтау тесті бір аккаунтқа бір рет тапсырылады, бұл аккаунтта ол тапсырылып қойған. Жоспарыңыз сол нәтижені ескеріп отыр.
   - **Correction:**

372. **EN:** The placement test is taken once per account.
   - **RU:** Вступительный тест проходят один раз на аккаунт.
   - **KK:** Деңгейді анықтау тесті бір аккаунтқа бір рет тапсырылады.
   - **Correction:**

373. **EN:** Its Speaking interview does not use your live interviews ({n} of {total} left).
   - **RU:** Его собеседование Speaking не тратит ваши устные собеседования (осталось {n} из {total}).
   - **KK:** Оның Speaking сұхбаты ауызша сұхбаттарыңызды жұмсамайды ({total} ішінен {n} қалды).
   - **Correction:**

374. **EN:** Its Writing report is marked as one of your essay assessments ({n} of {total} left in this 30-day period).
   - **RU:** Его отчёт Writing проверяется как одна из ваших проверок эссе (в этом 30-дневном периоде осталось {n} из {total}).
   - **KK:** Оның Writing жұмысы эссе тексерулеріңіздің бірі ретінде бағаланады (осы 30 күндік кезеңде {total} ішінен {n} қалды).
   - **Correction:**

375. **EN:** You have used all {n} essay assessments in this 30-day period, so this report cannot be marked now. You can carry on without marking.
   - **RU:** Вы использовали все {n} проверок эссе в этом 30-дневном периоде, поэтому сейчас этот отчёт оценить нельзя. Можно продолжить без оценки.
   - **KK:** Осы 30 күндік кезеңде {n} эссе тексеруінің бәрін пайдаландыңыз, сондықтан бұл жұмысты қазір бағалау мүмкін емес. Бағаламай-ақ жалғастыра аласыз.
   - **Correction:**

376. **EN:** Marking this report uses one of your essay assessments ({n} of {total} left in this 30-day period).
   - **RU:** Оценка этого отчёта тратит одну проверку эссе (в этом 30-дневном периоде осталось {n} из {total}).
   - **KK:** Бұл жұмысты бағалау бір эссе тексеруін жұмсайды (осы 30 күндік кезеңде {total} ішінен {n} қалды).
   - **Correction:**

377. **EN:** This interview is part of your once-per-account placement test. It does not use your live interviews ({n} of {total} left).
   - **RU:** Это собеседование входит во вступительный тест, который проходят один раз на аккаунт. Оно не тратит ваши устные собеседования (осталось {n} из {total}).
   - **KK:** Бұл сұхбат бір аккаунтқа бір рет тапсырылатын деңгейді анықтау тестінің бөлігі. Ол ауызша сұхбаттарыңызды жұмсамайды ({total} ішінен {n} қалды).
   - **Correction:**

378. **EN:** Full mock exams: {n} of {total} left in this 30-day period. Its Speaking interview does not use your live interviews.
   - **RU:** Полные пробные экзамены: в этом 30-дневном периоде осталось {n} из {total}. Собеседование Speaking в экзамене не тратит ваши устные собеседования.
   - **KK:** Толық сынақ емтихандары: осы 30 күндік кезеңде {total} ішінен {n} қалды. Емтихандағы Speaking сұхбаты ауызша сұхбаттарыңызды жұмсамайды.
   - **Correction:**

379. **EN:** Writing is not graded during the mock. Essays you check afterwards in the Writing Checker use your essay assessments ({n} of {total} left).
   - **RU:** Во время пробного экзамена Writing не оценивается. Эссе, которые вы потом отправите на проверку эссе, тратят ваши проверки эссе (осталось {n} из {total}).
   - **KK:** Сынақ емтиханы кезінде Writing бағаланбайды. Кейін эссе тексеру құралында тексерген эсселеріңіз эссе тексерулеріңізді жұмсайды ({total} ішінен {n} қалды).
   - **Correction:**

380. **EN:** You have used both full mock exams in this 30-day period, so this Speaking interview cannot start. You can skip Speaking and keep your other papers.
   - **RU:** Вы использовали оба полных пробных экзамена в этом 30-дневном периоде, поэтому это собеседование Speaking начать нельзя. Можно пропустить Speaking и сохранить остальные части.
   - **KK:** Осы 30 күндік кезеңде екі толық сынақ емтиханын да пайдаландыңыз, сондықтан бұл Speaking сұхбатын бастау мүмкін емес. Speaking бөлімін өткізіп жіберіп, қалған бөлімдерді сақтай аласыз.
   - **Correction:**

381. **EN:** Your next 30-day period starts on {date}.
   - **RU:** Следующий 30-дневный период начнётся {date}.
   - **KK:** Келесі 30 күндік кезең басталатын күн: {date}.
   - **Correction:**

382. **EN:** This interview counts as one of your {total} full mock exams for this 30-day period ({n} left). It does not use your live interviews.
   - **RU:** Это собеседование засчитывается как один из {total} полных пробных экзаменов этого 30-дневного периода (осталось {n}). Оно не тратит ваши устные собеседования.
   - **KK:** Бұл сұхбат осы 30 күндік кезеңдегі {total} толық сынақ емтиханының бірі болып саналады ({n} қалды). Ол ауызша сұхбаттарыңызды жұмсамайды.
   - **Correction:**

383. **EN:** See plans and what is included
   - **RU:** Посмотреть тарифы и что в них входит
   - **KK:** Тарифтерді және оларға не кіретінін көру
   - **Correction:**

### After paying (PurchaseReturn.tsx)

384. **EN:** We could not find this purchase
   - **RU:** Не удалось найти эту покупку
   - **KK:** Бұл сатып алуды табу мүмкін болмады
   - **Correction:**

385. **EN:** This link does not name a purchase. Your plans and any purchases you made are in your account.
   - **RU:** В этой ссылке нет покупки. Тарифы и все ваши покупки есть в вашем аккаунте.
   - **KK:** Бұл сілтемеде сатып алу көрсетілмеген. Тарифтер мен барлық сатып алуларыңыз аккаунтыңызда.
   - **Correction:**

386. **EN:** Back to plans
   - **RU:** Вернуться к тарифам
   - **KK:** Тарифтерге оралу
   - **Correction:**

387. **EN:** Your account
   - **RU:** Ваш аккаунт
   - **KK:** Аккаунтыңыз
   - **Correction:**

388. **EN:** Sign in to see this purchase
   - **RU:** Войдите, чтобы увидеть эту покупку
   - **KK:** Бұл сатып алуды көру үшін кіріңіз
   - **Correction:**

389. **EN:** A purchase belongs to the account that made it. Sign in with that account and this page will check it.
   - **RU:** Покупка принадлежит аккаунту, с которого её сделали. Войдите в этот аккаунт, и страница её проверит.
   - **KK:** Сатып алу оны жасаған аккаунтқа тиесілі. Сол аккаунтқа кірсеңіз, бұл бет оны тексереді.
   - **Correction:**

390. **EN:** Sign in
   - **RU:** Войти
   - **KK:** Кіру
   - **Correction:**

391. **EN:** Confirming your payment…
   - **RU:** Подтверждаем вашу оплату…
   - **KK:** Төлеміңізді растап жатырмыз…
   - **Correction:**

392. **EN:** This usually takes a few seconds. Please keep this page open.
   - **RU:** Обычно это занимает несколько секунд. Не закрывайте эту страницу.
   - **KK:** Әдетте бұл бірнеше секунд алады. Бұл бетті жаппаңыз.
   - **Correction:**

393. **EN:** You’re in.
   - **RU:** Готово, вы с нами.
   - **KK:** Дайын, сіз бізбенсіз.
   - **Correction:**

394. **EN:** You have full access until {date}. Every lesson, test and practice tool is open.
   - **RU:** У вас полный доступ до {date}. Открыты все уроки, тесты и тренажёры.
   - **KK:** Сізде толық қолжетімділік бар, аяқталу күні: {date}. Барлық сабақ, тест және жаттығу құралы ашық.
   - **Correction:**

395. **EN:** Your full access is open. Every lesson, test and practice tool is open.
   - **RU:** Полный доступ открыт. Открыты все уроки, тесты и тренажёры.
   - **KK:** Толық қолжетімділігіңіз ашық. Барлық сабақ, тест және жаттығу құралы ашық.
   - **Correction:**

396. **EN:** purchase [context] Plan
   - **RU:** Тариф
   - **KK:** Тариф
   - **Correction:**

397. **EN:** Receipt number
   - **RU:** Номер чека
   - **KK:** Түбіртек нөмірі
   - **Correction:**

398. **EN:** Go to Today
   - **RU:** Перейти к «Сегодня»
   - **KK:** «Бүгін» бетіне өту
   - **Correction:**

399. **EN:** View receipt
   - **RU:** Посмотреть чек
   - **KK:** Түбіртекті көру
   - **Correction:**

400. **EN:** We’re confirming your payment
   - **RU:** Мы подтверждаем вашу оплату
   - **KK:** Төлеміңізді растап жатырмыз
   - **Correction:**

401. **EN:** The payment provider has not confirmed it yet. If you paid, your access opens as soon as it does, on any device. If you closed the payment page before paying, you can start again from the plans page.
   - **RU:** Платёжная система ещё не подтвердила оплату. Если вы оплатили, доступ откроется сразу после подтверждения, на любом устройстве. Если вы закрыли страницу оплаты, не заплатив, можно начать заново на странице тарифов.
   - **KK:** Төлем жүйесі әзірге төлемді растаған жоқ. Төлеген болсаңыз, қолжетімділік расталған бойда кез келген құрылғыда ашылады. Төлем бетін төлемей жапқан болсаңыз, Тарифтер бетінен қайтадан бастай аласыз.
   - **Correction:**

402. **EN:** You cancelled the payment
   - **RU:** Вы отменили оплату
   - **KK:** Сіз төлемді тоқтаттыңыз
   - **Correction:**

403. **EN:** Payment was not completed
   - **RU:** Оплата не завершена
   - **KK:** Төлем аяқталмады
   - **Correction:**

404. **EN:** Payment was not completed. Your access has not changed.
   - **RU:** Оплата не завершена. Ваш доступ не изменился.
   - **KK:** Төлем аяқталмады. Қолжетімділігіңіз өзгерген жоқ.
   - **Correction:**

405. **EN:** The payment did not go through. Your access has not changed.
   - **RU:** Оплата не прошла. Ваш доступ не изменился.
   - **KK:** Төлем өтпеді. Қолжетімділігіңіз өзгерген жоқ.
   - **Correction:**

406. **EN:** This purchase was refunded
   - **RU:** За эту покупку сделан возврат
   - **KK:** Бұл сатып алудың ақшасы қайтарылды
   - **Correction:**

407. **EN:** The access it paid for has ended. Your results are kept.
   - **RU:** Доступ по этой покупке закончился. Ваши результаты сохранены.
   - **KK:** Осы сатып алу бойынша қолжетімділік аяқталды. Нәтижелеріңіз сақталды.
   - **Correction:**

408. **EN:** It is not on the account you are signed in with. If you bought with a different account, sign in with that one.
   - **RU:** Её нет в аккаунте, в который вы вошли. Если вы покупали с другого аккаунта, войдите в него.
   - **KK:** Ол сіз кірген аккаунтта жоқ. Басқа аккаунттан сатып алған болсаңыз, сол аккаунтқа кіріңіз.
   - **Correction:**

409. **EN:** We could not check this purchase just now
   - **RU:** Сейчас не удалось проверить эту покупку
   - **KK:** Бұл сатып алуды қазір тексеру мүмкін болмады
   - **Correction:**

410. **EN:** Nothing has changed on our side. If you paid, your access opens as soon as the payment is confirmed. Please try again.
   - **RU:** С нашей стороны ничего не изменилось. Если вы оплатили, доступ откроется, как только оплата будет подтверждена. Попробуйте ещё раз.
   - **KK:** Біздің тарапта ештеңе өзгерген жоқ. Төлеген болсаңыз, қолжетімділік төлем расталған бойда ашылады. Қайталап көріңіз.
   - **Correction:**

### The receipt (Receipt.tsx)

411. **EN:** Back to your account
   - **RU:** Вернуться в аккаунт
   - **KK:** Аккаунтқа оралу
   - **Correction:**

412. **EN:** We could not find this receipt
   - **RU:** Не удалось найти этот чек
   - **KK:** Бұл түбіртекті табу мүмкін болмады
   - **Correction:**

413. **EN:** This link does not name a purchase.
   - **RU:** В этой ссылке нет покупки.
   - **KK:** Бұл сілтемеде сатып алу көрсетілмеген.
   - **Correction:**

414. **EN:** Sign in to see this receipt
   - **RU:** Войдите, чтобы увидеть этот чек
   - **KK:** Бұл түбіртекті көру үшін кіріңіз
   - **Correction:**

415. **EN:** A receipt belongs to the account that made the purchase.
   - **RU:** Чек принадлежит аккаунту, с которого сделана покупка.
   - **KK:** Түбіртек сатып алу жасалған аккаунтқа тиесілі.
   - **Correction:**

416. **EN:** It is not on the account you are signed in with.
   - **RU:** Его нет в аккаунте, в который вы вошли.
   - **KK:** Ол сіз кірген аккаунтта жоқ.
   - **Correction:**

417. **EN:** We could not load this receipt just now
   - **RU:** Сейчас не удалось загрузить этот чек
   - **KK:** Бұл түбіртекті қазір жүктеу мүмкін болмады
   - **Correction:**

418. **EN:** Nothing has changed. Please try again.
   - **RU:** Ничего не изменилось. Попробуйте ещё раз.
   - **KK:** Ештеңе өзгерген жоқ. Қайталап көріңіз.
   - **Correction:**

419. **EN:** There is no receipt for this purchase
   - **RU:** Для этой покупки нет чека
   - **KK:** Бұл сатып алудың түбіртегі жоқ
   - **Correction:**

420. **EN:** A receipt is issued once a payment is confirmed. This purchase was not paid.
   - **RU:** Чек выдаётся после подтверждения оплаты. Эта покупка не была оплачена.
   - **KK:** Түбіртек төлем расталған соң беріледі. Бұл сатып алу төленбеген.
   - **Correction:**

421. **EN:** SIMULATED payment
   - **RU:** СИМУЛЯЦИЯ оплаты
   - **KK:** ТӨЛЕМ СИМУЛЯЦИЯСЫ
   - **Correction:**

422. **EN:** No money was taken. This receipt is a local test, not a real one.
   - **RU:** Деньги не списывались. Этот чек из локальной проверки, он не настоящий.
   - **KK:** Ақша алынған жоқ. Бұл түбіртек жергілікті тексерістен алынған, шын түбіртек емес.
   - **Correction:**

423. **EN:** This purchase was refunded.
   - **RU:** За эту покупку сделан возврат.
   - **KK:** Бұл сатып алудың ақшасы қайтарылды.
   - **Correction:**

424. **EN:** Account
   - **RU:** Аккаунт
   - **KK:** Аккаунт
   - **Correction:**

425. **EN:** Print or save as PDF
   - **RU:** Распечатать или сохранить как PDF
   - **KK:** Басып шығару немесе PDF ретінде сақтау
   - **Correction:**

426. **EN:** Loading…
   - **RU:** Загрузка…
   - **KK:** Жүктелуде…
   - **Correction:**

### After the first lesson (UpgradeDialog.tsx)

427. **EN:** Lessons stay free. When you want to practise what you have learned, with feedback on your own work, this is what practice and guidance adds.
   - **RU:** Уроки остаются бесплатными. Когда захотите закрепить изученное и получать разбор своих работ, вот что добавляют практика и сопровождение.
   - **KK:** Сабақтар тегін болып қала береді. Үйренгеніңізді бекітіп, өз жұмысыңызға талдау алғыңыз келгенде, практика мен сүйемелдеу мынаны қосады.
   - **Correction:**

428. **EN:** You finished your first lesson
   - **RU:** Вы прошли свой первый урок
   - **KK:** Сіз алғашқы сабағыңызды аяқтадыңыз
   - **Correction:**

429. **EN:** Add practice and guidance
   - **RU:** Добавьте практику и сопровождение
   - **KK:** Практика мен сүйемелдеуді қосыңыз
   - **Correction:**

430. **EN:** Close
   - **RU:** Закрыть
   - **KK:** Жабу
   - **Correction:**

431. **EN:** Get practice and guidance
   - **RU:** Подключить практику и сопровождение
   - **KK:** Практика мен сүйемелдеуді қосу
   - **Correction:**

432. **EN:** Keep reading lessons
   - **RU:** Продолжить читать уроки
   - **KK:** Сабақтарды оқуды жалғастыру
   - **Correction:**

433. **EN:** Create a free account first: every lesson is free with an account.
   - **RU:** Сначала создайте бесплатный аккаунт: с ним все уроки бесплатны.
   - **KK:** Алдымен тегін аккаунт ашыңыз: аккаунтпен барлық сабақ тегін.
   - **Correction:**

### Access states (access-state.ts)

434. **EN:** Practice and guidance until {date}
   - **RU:** Практика и сопровождение до {date}
   - **KK:** Практика және сүйемелдеу, аяқталу күні: {date}
   - **Correction:**

435. **EN:** Buying again adds more time after this date. Nothing renews by itself.
   - **RU:** Новая покупка добавит время после этой даты. Ничего не продлевается само.
   - **KK:** Қайта сатып алу осы күннен кейін уақыт қосады. Ештеңе өздігінен ұзартылмайды.
   - **Correction:**

436. **EN:** Free access from your teacher until {date}
   - **RU:** Бесплатный доступ от вашего преподавателя до {date}
   - **KK:** Мұғаліміңіз берген тегін қолжетімділік, аяқталу күні: {date}
   - **Correction:**

437. **EN:** It opens everything practice and guidance includes. Your teacher renews or stops it.
   - **RU:** Он открывает всё, что входит в практику и сопровождение. Продлевает или отключает его ваш преподаватель.
   - **KK:** Ол практика мен сүйемелдеуге кіретіннің бәрін ашады. Оны мұғаліміңіз ұзартады немесе тоқтатады.
   - **Correction:**

438. **EN:** Practice and guidance ended on {date}
   - **RU:** Практика и сопровождение закончились {date}
   - **KK:** Практика мен сүйемелдеу аяқталған күн: {date}
   - **Correction:**

439. **EN:** Every lesson stays open, and your results are kept. Choose practice and guidance again to continue.
   - **RU:** Все уроки остаются открытыми, а ваши результаты сохранены. Чтобы продолжить, снова подключите практику и сопровождение.
   - **KK:** Барлық сабақ ашық күйінде қалады, нәтижелеріңіз сақталды. Жалғастыру үшін практика мен сүйемелдеуді қайта қосыңыз.
   - **Correction:**

440. **EN:** Free account
   - **RU:** Бесплатный аккаунт
   - **KK:** Тегін аккаунт
   - **Correction:**

441. **EN:** Every lesson is free with your account. Practice and guidance starts as soon as your payment is confirmed.
   - **RU:** С вашим аккаунтом все уроки бесплатны. Практика и сопровождение начнутся, как только оплата будет подтверждена.
   - **KK:** Аккаунтыңызбен барлық сабақ тегін. Практика мен сүйемелдеу төлеміңіз расталған бойда басталады.
   - **Correction:**

442. **EN:** This plan is not available right now.
   - **RU:** Этот тариф сейчас недоступен.
   - **KK:** Бұл тариф қазір қолжетімсіз.
   - **Correction:**

443. **EN:** You have started too many purchases in the last hour. Please try again in an hour.
   - **RU:** За последний час вы начали слишком много покупок. Попробуйте снова через час.
   - **KK:** Соңғы бір сағатта тым көп сатып алу бастадыңыз. Бір сағаттан кейін қайталап көріңіз.
   - **Correction:**

444. **EN:** The payment page could not be opened. Nothing was charged. Please try again shortly.
   - **RU:** Не удалось открыть страницу оплаты. Деньги не списаны. Попробуйте ещё раз чуть позже.
   - **KK:** Төлем бетін ашу мүмкін болмады. Ақша алынған жоқ. Біраздан кейін қайталап көріңіз.
   - **Correction:**

445. **EN:** Payment is not connected yet.
   - **RU:** Оплата пока не подключена.
   - **KK:** Төлем әзірге қосылмаған.
   - **Correction:**

446. **EN:** Please sign in again to buy access.
   - **RU:** Войдите снова, чтобы купить доступ.
   - **KK:** Қолжетімділікті сатып алу үшін қайта кіріңіз.
   - **Correction:**

447. **EN:** You seem to be offline. Nothing has changed. Please try again once you are connected.
   - **RU:** Похоже, нет подключения к интернету. Ничего не изменилось. Попробуйте снова, когда связь появится.
   - **KK:** Интернетке қосылмаған сияқтысыз. Ештеңе өзгерген жоқ. Байланыс қалпына келгенде қайталап көріңіз.
   - **Correction:**

448. **EN:** We could not reach payments just now. Nothing has changed. Please try again.
   - **RU:** Сейчас не удалось связаться с платёжной системой. Ничего не изменилось. Попробуйте ещё раз.
   - **KK:** Төлем жүйесімен қазір байланысу мүмкін болмады. Ештеңе өзгерген жоқ. Қайталап көріңіз.
   - **Correction:**

449. **EN:** Date
   - **RU:** Дата
   - **KK:** Күні
   - **Correction:**

450. **EN:** Access period
   - **RU:** Срок доступа
   - **KK:** Қолжетімділік мерзімі
   - **Correction:**

451. **EN:** {from} to {to}
   - **RU:** с {from} по {to}
   - **KK:** басталуы: {from}, аяқталуы: {to}
   - **Correction:**

452. **EN:** Amount
   - **RU:** Сумма
   - **KK:** Сомасы
   - **Correction:**

453. **EN:** Status
   - **RU:** Статус
   - **KK:** Күйі
   - **Correction:**

454. **EN:** Refunded on {date}
   - **RU:** Возврат {date}
   - **KK:** Ақша қайтарылған күн: {date}
   - **Correction:**

455. **EN:** Refunded
   - **RU:** Возврат
   - **KK:** Ақша қайтарылды
   - **Correction:**

456. **EN:** Paid
   - **RU:** Оплачено
   - **KK:** Төленді
   - **Correction:**

457. **EN:** Not completed
   - **RU:** Не завершено
   - **KK:** Аяқталмады
   - **Correction:**

458. **EN:** Cancelled
   - **RU:** Отменено
   - **KK:** Тоқтатылды
   - **Correction:**

459. **EN:** Not finished
   - **RU:** Не закончено
   - **KK:** Аяқталмаған
   - **Correction:**

### Assessment refusals (assessment-refusal.ts)

460. **EN:** Your next 30-day period starts on {date}, with a fresh set of assessments.
   - **RU:** Следующий 30-дневный период начнётся {date}, с новым набором проверок.
   - **KK:** Келесі 30 күндік кезең жаңа тексерулер жиынтығымен басталады. Басталатын күні: {date}.
   - **Correction:**

461. **EN:** This 30-day period ends on {date}. Another purchase on the Plans page starts a new period after it, with a fresh set of assessments.
   - **RU:** Этот 30-дневный период закончится {date}. Новая покупка на странице тарифов начнёт следующий период после него, с новым набором проверок.
   - **KK:** Осы 30 күндік кезең аяқталатын күн: {date}. Тарифтер бетіндегі жаңа сатып алу одан кейін жаңа тексерулер жиынтығымен жаңа кезеңді бастайды.
   - **Correction:**

462. **EN:** Another purchase on the Plans page starts a new 30-day period with a fresh set of assessments.
   - **RU:** Новая покупка на странице тарифов начнёт новый 30-дневный период с новым набором проверок.
   - **KK:** Тарифтер бетіндегі жаңа сатып алу жаңа тексерулер жиынтығымен жаңа 30 күндік кезеңді бастайды.
   - **Correction:**

463. **EN:** Your essay is safe on this page.
   - **RU:** Ваше эссе сохранено на этой странице.
   - **KK:** Эссеңіз осы бетте сақтаулы.
   - **Correction:**

464. **EN:** Your recorded answers are still on this page.
   - **RU:** Ваши записанные ответы остаются на этой странице.
   - **KK:** Жазылған жауаптарыңыз осы бетте қалды.
   - **Correction:**

465. **EN:** Your one trial AI assessment has been used. Writing and recorded Speaking share it. Paid access includes more assessments.
   - **RU:** Ваша единственная пробная проверка ИИ уже использована. Она общая для Writing и записи Speaking. В платный доступ входит больше проверок.
   - **KK:** Жалғыз сынақ ЖИ тексеруіңіз пайдаланылды. Ол Writing пен Speaking жазбасына ортақ. Ақылы қолжетімділікке көбірек тексеру кіреді.
   - **Correction:**

466. **EN:** You have used all {n} essay assessments in this 30-day period.
   - **RU:** Вы использовали все {n} проверок эссе в этом 30-дневном периоде.
   - **KK:** Осы 30 күндік кезеңде {n} эссе тексеруінің бәрін пайдаландыңыз.
   - **Correction:**

467. **EN:** You have used all {n} recorded Speaking assessments in this 30-day period.
   - **RU:** Вы использовали все {n} проверок записей Speaking в этом 30-дневном периоде.
   - **KK:** Осы 30 күндік кезеңде Speaking жазбасын тексерудің {n} мүмкіндігінің бәрін пайдаландыңыз.
   - **Correction:**

468. **EN:** You have used both full mock exams in this 30-day period.
   - **RU:** Вы использовали оба полных пробных экзамена в этом 30-дневном периоде.
   - **KK:** Осы 30 күндік кезеңде екі толық сынақ емтиханын да пайдаландыңыз.
   - **Correction:**

469. **EN:** You have used both live interviews in this 30-day period.
   - **RU:** Вы использовали оба устных собеседования в этом 30-дневном периоде.
   - **KK:** Осы 30 күндік кезеңде екі ауызша сұхбатты да пайдаландыңыз.
   - **Correction:**

470. **EN:** You have used both full mock exams in this 30-day period, so this Speaking interview cannot start.
   - **RU:** Вы использовали оба полных пробных экзамена в этом 30-дневном периоде, поэтому это собеседование Speaking начать нельзя.
   - **KK:** Осы 30 күндік кезеңде екі толық сынақ емтиханын да пайдаландыңыз, сондықтан бұл Speaking сұхбатын бастау мүмкін емес.
   - **Correction:**

471. **EN:** Your trial has ended, so this cannot be assessed. Lessons stay free, and paid access includes AI assessments.
   - **RU:** Пробный период закончился, поэтому проверить это нельзя. Уроки остаются бесплатными, а в платный доступ входят проверки ИИ.
   - **KK:** Сынақ мерзіміңіз аяқталды, сондықтан мұны бағалау мүмкін емес. Сабақтар тегін болып қалады, ал ақылы қолжетімділікке ЖИ тексерулері кіреді.
   - **Correction:**

472. **EN:** Today's safety limit for assessments is reached. Nothing was used: please try again tomorrow.
   - **RU:** Достигнут дневной защитный лимит проверок. Ничего не списано: попробуйте снова завтра.
   - **KK:** Тексерулердің бүгінгі қауіпсіздік шегіне жеттіңіз. Ештеңе жұмсалған жоқ: ертең қайталап көріңіз.
   - **Correction:**

473. **EN:** Live interviews are included with paid access. Recorded Speaking and Writing assessments are on the Plans page too.
   - **RU:** Устные собеседования входят в платный доступ. Проверки записей Speaking и Writing тоже описаны на странице тарифов.
   - **KK:** Ауызша сұхбаттар ақылы қолжетімділікке кіреді. Speaking жазбалары мен Writing тексерулері де Тарифтер бетінде сипатталған.
   - **Correction:**

474. **EN:** AI feedback comes with practice and guidance. Nothing was used.
   - **RU:** Разбор с помощью ИИ входит в практику и сопровождение. Ничего не списано.
   - **KK:** ЖИ талдауы практика мен сүйемелдеуге кіреді. Ештеңе жұмсалған жоқ.
   - **Correction:**

475. **EN:** This is already being assessed. Give it a moment, then refresh the page to see the result.
   - **RU:** Это уже проверяется. Подождите немного, затем обновите страницу, чтобы увидеть результат.
   - **KK:** Бұл қазір тексерілуде. Сәл күтіп, нәтижені көру үшін бетті жаңартыңыз.
   - **Correction:**

476. **EN:** Feedback needs a live interview taken from your own account in the last day.
   - **RU:** Для разбора нужно устное собеседование, пройденное с вашего аккаунта за последние сутки.
   - **KK:** Талдау үшін соңғы бір тәулікте өз аккаунтыңыздан өткен ауызша сұхбат қажет.
   - **Correction:**

477. **EN:** This assessment cannot be started right now. Nothing was used.
   - **RU:** Сейчас эту проверку начать нельзя. Ничего не списано.
   - **KK:** Бұл тексеруді қазір бастау мүмкін емес. Ештеңе жұмсалған жоқ.
   - **Correction:**

478. **EN:** The interview ended before the examiner began, so it was given back: it does not count as one of your full mock exams.
   - **RU:** Собеседование закончилось до того, как экзаменатор начал, поэтому оно возвращено: оно не засчитывается как один из ваших полных пробных экзаменов.
   - **KK:** Сұхбат емтихан алушы бастамай тұрып аяқталды, сондықтан ол қайтарылды: ол толық сынақ емтихандарыңыздың бірі болып саналмайды.
   - **Correction:**

479. **EN:** The interview ended before the examiner began, so it was given back: your placement interview is still yours to take.
   - **RU:** Собеседование закончилось до того, как экзаменатор начал, поэтому оно возвращено: собеседование вступительного теста по-прежнему доступно вам.
   - **KK:** Сұхбат емтихан алушы бастамай тұрып аяқталды, сондықтан ол қайтарылды: деңгейді анықтау тестінің сұхбатын әлі де тапсыра аласыз.
   - **Correction:**

480. **EN:** The interview ended before the examiner began, so it was given back: it does not count as one of your live interviews.
   - **RU:** Собеседование закончилось до того, как экзаменатор начал, поэтому оно возвращено: оно не засчитывается как одно из ваших устных собеседований.
   - **KK:** Сұхбат емтихан алушы бастамай тұрып аяқталды, сондықтан ол қайтарылды: ол ауызша сұхбаттарыңыздың бірі болып саналмайды.
   - **Correction:**

481. **EN:** If grading was interrupted before a result appeared, that assessment is given back automatically after a short while, and you can send it again.
   - **RU:** Если проверка прервалась до появления результата, она автоматически вернётся к вам через некоторое время, и вы сможете отправить работу снова.
   - **KK:** Егер бағалау нәтиже шықпай тұрып үзілсе, ол тексеру біраз уақыттан кейін автоматты түрде қайтарылады және жұмысты қайта жібере аласыз.
   - **Correction:**

### Locked paid screens (PaidLocked.tsx)

482. **EN:** Your practice and guidance has ended
   - **RU:** Срок практики и сопровождения закончился
   - **KK:** Практика мен сүйемелдеу мерзімі аяқталды
   - **Correction:**

483. **EN:** Part of practice and guidance
   - **RU:** Входит в практику и сопровождение
   - **KK:** Практика мен сүйемелдеуге кіреді
   - **Correction:**

484. **EN:** Every lesson stays open, and your results are saved. Choose practice and guidance again to continue.
   - **RU:** Все уроки остаются открытыми, а ваши результаты сохранены. Чтобы продолжить, снова подключите практику и сопровождение.
   - **KK:** Барлық сабақ ашық күйінде қалады, нәтижелеріңіз сақталды. Жалғастыру үшін практика мен сүйемелдеуді қайта қосыңыз.
   - **Correction:**

485. **EN:** See what practice and guidance adds
   - **RU:** Что дают практика и сопровождение
   - **KK:** Практика мен сүйемелдеу не беретінін көру
   - **Correction:**

### What is left (AssessmentBalance.tsx)

486. **EN:** Recorded Speaking
   - **RU:** Запись Speaking
   - **KK:** Speaking жазбасы
   - **Correction:**

487. **EN:** Live interviews
   - **RU:** Устные собеседования
   - **KK:** Ауызша сұхбаттар
   - **Correction:**

488. **EN:** Full mock exams
   - **RU:** Полные пробные экзамены
   - **KK:** Толық сынақ емтихандары
   - **Correction:**

489. **EN:** Assessments left in this 30-day period
   - **RU:** Осталось проверок в этом 30-дневном периоде
   - **KK:** Осы 30 күндік кезеңде қалған тексерулер
   - **Correction:**

490. **EN:** {left} of {total}
   - **RU:** {left} из {total}
   - **KK:** {total} ішінен {left}
   - **Correction:**

491. **EN:** This period ends on {date}. Unused assessments do not carry over.
   - **RU:** Этот период закончится {date}. Неиспользованные проверки не переносятся.
   - **KK:** Бұл кезең аяқталатын күн: {date}. Пайдаланылмаған тексерулер келесі кезеңге ауыспайды.
   - **Correction:**

### The upgrade pitch (src/lib/access/upgrade-pitch.ts)

492. **EN:** The full practice library, and timed tests with band estimates
   - **RU:** Вся библиотека практики и тесты на время с оценкой балла
   - **KK:** Толық жаттығу кітапханасы және болжамды Band бағасы бар уақыты шектелген тесттер
   - **Correction:**

493. **EN:** {essays} essay checks and {speaking} recorded Speaking checks
   - **RU:** Проверки эссе: {essays}, проверки записей Speaking: {speaking}
   - **KK:** Эссе тексерулері: {essays}, Speaking жазбасын тексеру: {speaking}
   - **Correction:**

494. **EN:** {live} live interviews, {mock} mock exams and the placement test
   - **RU:** Живые собеседования: {live}, пробные экзамены: {mock} и вступительный тест
   - **KK:** Ауызша сұхбаттар: {live}, сынақ емтихандары: {mock}, және деңгейді анықтау тесті
   - **Correction:**

495. **EN:** Mr EZ guidance on everything you study
   - **RU:** Сопровождение Mr EZ по всему, что вы изучаете
   - **KK:** Оқитыныңыздың бәрі бойынша Mr EZ сүйемелдеуі
   - **Correction:**

496. **EN:** Your personal study plan, with practice every day
   - **RU:** Ваш личный план занятий с практикой на каждый день
   - **KK:** Күн сайынғы практикасы бар жеке оқу жоспарыңыз
   - **Correction:**

497. **EN:** {price} for {days} days. No automatic renewal.
   - **RU:** {price} за {days} дней. Без автоматического продления.
   - **KK:** {days} күнге {price}. Автоматты ұзарту жоқ.
   - **Correction:**

497a. **EN:** Use your free try now, then decide.
   - **RU:** Воспользуйтесь бесплатной попыткой, а потом решайте.
   - **KK:** Тегін талпынысты қазір пайдаланыңыз, содан кейін шешіңіз.
   - **Correction:**

497b. **EN:** You have already used your free Speaking check. Nothing was used.
   - **RU:** Вы уже использовали бесплатную проверку Speaking. Ничего не списано.
   - **KK:** Тегін Speaking тексеруін бұрын пайдаландыңыз. Ештеңе жұмсалған жоқ.
   - **Correction:**

497c. **EN:** You have already used your free essay check. Nothing was used.
   - **RU:** Вы уже использовали бесплатную проверку эссе. Ничего не списано.
   - **KK:** Тегін эссе тексеруін бұрын пайдаландыңыз. Ештеңе жұмсалған жоқ.
   - **Correction:**

## Sign-up and the profile form (/sign-up, /profile)

Source file: `src/lib/i18n/dict/kk/auth.ts`

### Sign-up (SignUpForm.tsx)

498. **EN:** Check your email
   - **RU:** Проверьте почту
   - **KK:** Поштаңызды тексеріңіз
   - **Correction:**

499. **EN:** We sent a confirmation link to {email}. Open it on this device to finish creating your account.
   - **RU:** Мы отправили ссылку для подтверждения на {email}. Откройте её на этом устройстве, чтобы завершить создание аккаунта.
   - **KK:** Растау сілтемесін мына мекенжайға жібердік: {email}. Аккаунт ашуды аяқтау үшін оны осы құрылғыда ашыңыз.
   - **Correction:**

500. **EN:** No email after a few minutes? Check your spam folder, or try again with a different address.
   - **RU:** Письма нет уже несколько минут? Загляните в папку «Спам» или попробуйте другой адрес.
   - **KK:** Бірнеше минуттан кейін де хат келмеді ме? «Спам» қалтасын тексеріңіз немесе басқа мекенжаймен қайталап көріңіз.
   - **Correction:**

501. **EN:** Back to sign in
   - **RU:** Назад ко входу
   - **KK:** Кіру бетіне оралу
   - **Correction:**

502. **EN:** Please enter a valid email address.
   - **RU:** Введите правильный адрес email.
   - **KK:** Дұрыс электрондық пошта мекенжайын енгізіңіз.
   - **Correction:**

503. **EN:** Passwords don't match.
   - **RU:** Пароли не совпадают.
   - **KK:** Құпиясөздер сәйкес келмейді.
   - **Correction:**

504. **EN:** Create your account
   - **RU:** Создайте аккаунт
   - **KK:** Аккаунт ашыңыз
   - **Correction:**

505. **EN:** Your course, scores and essays are saved to your account and follow you to any device.
   - **RU:** Курс, результаты и эссе сохраняются в аккаунте и доступны на любом устройстве.
   - **KK:** Курсыңыз, нәтижелеріңіз және эсселеріңіз аккаунтыңызда сақталады және кез келген құрылғыда қолжетімді болады.
   - **Correction:**

506. **EN:** Password
   - **RU:** Пароль
   - **KK:** Құпиясөз
   - **Correction:**

507. **EN:** Confirm password
   - **RU:** Подтвердите пароль
   - **KK:** Құпиясөзді растаңыз
   - **Correction:**

508. **EN:** Creating your account…
   - **RU:** Создаём аккаунт…
   - **KK:** Аккаунт ашылуда…
   - **Correction:**

509. **EN:** Create account
   - **RU:** Создать аккаунт
   - **KK:** Аккаунт ашу
   - **Correction:**

510. **EN:** Next, we ask for a few details about you, such as your name, date of birth and phone number. Only you and the person who runs the site can see them.
   - **RU:** Дальше мы попросим несколько данных о вас: имя, дату рождения и номер телефона. Их видите только вы и тот, кто ведёт сайт.
   - **KK:** Келесі қадамда сіз туралы бірнеше дерек сұраймыз: атыңыз, туған күніңіз және телефон нөміріңіз. Оларды тек сіз және сайтты жүргізетін адам көре алады.
   - **Correction:**

511. **EN:** or
   - **RU:** или
   - **KK:** немесе
   - **Correction:**

512. **EN:** Already have an account?
   - **RU:** Уже есть аккаунт?
   - **KK:** Аккаунтыңыз бар ма?
   - **Correction:**

### The profile form (ProfileForm.tsx)

513. **EN:** Please choose your date of birth.
   - **RU:** Выберите дату рождения.
   - **KK:** Туған күніңізді таңдаңыз.
   - **Correction:**

514. **EN:** Please choose one.
   - **RU:** Выберите один вариант.
   - **KK:** Бір нұсқаны таңдаңыз.
   - **Correction:**

515. **EN:** Please fill this in.
   - **RU:** Заполните это поле.
   - **KK:** Бұл жолды толтырыңыз.
   - **Correction:**

516. **EN:** This is too long. Please shorten it.
   - **RU:** Слишком длинно. Сократите, пожалуйста.
   - **KK:** Тым ұзын. Қысқартыңыз.
   - **Correction:**

517. **EN:** Please choose a day, month and year that exist.
   - **RU:** Выберите существующие день, месяц и год.
   - **KK:** Бар күнді, айды және жылды таңдаңыз.
   - **Correction:**

518. **EN:** This date is in the future.
   - **RU:** Эта дата ещё не наступила.
   - **KK:** Бұл күн әлі келген жоқ.
   - **Correction:**

519. **EN:** Please check the year you were born.
   - **RU:** Проверьте год рождения.
   - **KK:** Туған жылыңызды тексеріңіз.
   - **Correction:**

520. **EN:** Please enter a phone number with 7 to 15 digits, for example +7 701 234 56 78.
   - **RU:** Введите номер телефона от 7 до 15 цифр, например +7 701 234 56 78.
   - **KK:** 7 мен 15 цифр аралығындағы телефон нөмірін енгізіңіз, мысалы +7 701 234 56 78.
   - **Correction:**

521. **EN:** Needed for students under 18.
   - **RU:** Нужно для учеников младше 18 лет.
   - **KK:** 18 жасқа толмаған оқушылар үшін қажет.
   - **Correction:**

522. **EN:** A parent or guardian needs to agree before you continue.
   - **RU:** Чтобы продолжить, нужно согласие родителя или опекуна.
   - **KK:** Жалғастыру үшін ата-анаңыздың немесе қамқоршыңыздың келісімі қажет.
   - **Correction:**

523. **EN:** Day
   - **RU:** День
   - **KK:** Күн
   - **Correction:**

524. **EN:** Month
   - **RU:** Месяц
   - **KK:** Ай
   - **Correction:**

525. **EN:** Year
   - **RU:** Год
   - **KK:** Жыл
   - **Correction:**

526. **EN:** Sign in first
   - **RU:** Сначала войдите
   - **KK:** Алдымен кіріңіз
   - **Correction:**

527. **EN:** Your details belong to your account. Sign in, and this page opens again.
   - **RU:** Ваши данные хранятся в аккаунте. Войдите, и эта страница откроется снова.
   - **KK:** Деректеріңіз аккаунтыңызда сақталады. Кірсеңіз, бұл бет қайта ашылады.
   - **Correction:**

528. **EN:** We could not save your details: {error}
   - **RU:** Не удалось сохранить данные: {error}
   - **KK:** Деректеріңізді сақтау мүмкін болмады: {error}
   - **Correction:**

529. **EN:** Tell us about yourself
   - **RU:** Расскажите о себе
   - **KK:** Өзіңіз туралы айтып беріңіз
   - **Correction:**

530. **EN:** Your details
   - **RU:** Ваши данные
   - **KK:** Деректеріңіз
   - **Correction:**

531. **EN:** We ask once, so the course can call you by name and we can reach you about your studies or your account. It takes a minute.
   - **RU:** Мы спрашиваем один раз, чтобы курс обращался к вам по имени, а мы могли связаться с вами по поводу учёбы или аккаунта. Это займёт минуту.
   - **KK:** Курс сізге атыңызбен жүгінуі және оқуыңызға немесе аккаунтыңызға қатысты сізбен байланыса алуымыз үшін бір рет сұраймыз. Бұл бір минут алады.
   - **Correction:**

532. **EN:** Keep these up to date.
   - **RU:** Поддерживайте эти данные в актуальном состоянии.
   - **KK:** Бұл деректерді өзекті күйде ұстаңыз.
   - **Correction:**

533. **EN:** One last step
   - **RU:** Последний шаг
   - **KK:** Соңғы қадам
   - **Correction:**

534. **EN:** Only you and the person who runs the site can see these details.
   - **RU:** Эти данные видите только вы и тот, кто ведёт сайт.
   - **KK:** Бұл деректерді тек сіз және сайтты жүргізетін адам көре алады.
   - **Correction:**

535. **EN:** Why we ask for each one
   - **RU:** Зачем нужен каждый пункт
   - **KK:** Әрқайсысы не үшін сұралады
   - **Correction:**

536. **EN:** First name
   - **RU:** Имя
   - **KK:** Аты
   - **Correction:**

537. **EN:** Last name
   - **RU:** Фамилия
   - **KK:** Тегі
   - **Correction:**

538. **EN:** With the country code, so we can reach you about your studies or your account.
   - **RU:** С кодом страны, чтобы мы могли связаться с вами по поводу учёбы или аккаунта.
   - **KK:** Оқуыңызға немесе аккаунтыңызға қатысты сізбен байланыса алуымыз үшін ел кодымен бірге.
   - **Correction:**

539. **EN:** City
   - **RU:** Город
   - **KK:** Қала
   - **Correction:**

540. **EN:** School, university or job
   - **RU:** Школа, вуз или работа
   - **KK:** Мектеп, жоғары оқу орны немесе жұмыс
   - **Correction:**

541. **EN:** How did you find us?
   - **RU:** Как вы о нас узнали?
   - **KK:** Бізді қалай таптыңыз?
   - **Correction:**

542. **EN:** A parent or guardian
   - **RU:** Родитель или опекун
   - **KK:** Ата-ана немесе қамқоршы
   - **Correction:**

543. **EN:** You are under 18, so we also need a parent or guardian who knows you are using the site.
   - **RU:** Вам ещё нет 18, поэтому нужен родитель или опекун, который знает, что вы пользуетесь сайтом.
   - **KK:** Сіз 18 жасқа толмағансыз, сондықтан сайтты пайдаланып жүргеніңізді білетін ата-анаңыз немесе қамқоршыңыз да қажет.
   - **Correction:**

544. **EN:** Parent's name
   - **RU:** Имя родителя
   - **KK:** Ата-ананың аты
   - **Correction:**

545. **EN:** Parent's phone
   - **RU:** Телефон родителя
   - **KK:** Ата-ананың телефоны
   - **Correction:**

546. **EN:** Saved
   - **RU:** Сохранённое
   - **KK:** Сақталған
   - **Correction:**

547. **EN:** Saving…
   - **RU:** Сохранение…
   - **KK:** Сақталуда…
   - **Correction:**

548. **EN:** Save and continue
   - **RU:** Сохранить и продолжить
   - **KK:** Сақтап, жалғастыру
   - **Correction:**

549. **EN:** Save details
   - **RU:** Сохранить
   - **KK:** Деректерді сақтау
   - **Correction:**

550. **EN:** Back to my account
   - **RU:** Назад в аккаунт
   - **KK:** Аккаунтыма оралу
   - **Correction:**

### Shared form pieces (fields.tsx)

551. **EN:** Hide
   - **RU:** Скрыть
   - **KK:** Жасыру
   - **Correction:**

552. **EN:** Show
   - **RU:** Показать
   - **KK:** Көрсету
   - **Correction:**

553. **EN:** Strong
   - **RU:** Надёжный
   - **KK:** Күшті
   - **Correction:**

554. **EN:** Fair
   - **RU:** Неплохой
   - **KK:** Орташа
   - **Correction:**

555. **EN:** Weak
   - **RU:** Слабый
   - **KK:** Әлсіз
   - **Correction:**

556. **EN:** Password strength
   - **RU:** Надёжность пароля
   - **KK:** Құпиясөздің беріктігі
   - **Correction:**

557. **EN:** Use at least 8 characters.
   - **RU:** Нужно не меньше 8 символов.
   - **KK:** Кемінде 8 таңба қолданыңыз.
   - **Correction:**

558. **EN:** Add at least one letter.
   - **RU:** Добавьте хотя бы одну букву.
   - **KK:** Кемінде бір әріп қосыңыз.
   - **Correction:**

559. **EN:** Add at least one number.
   - **RU:** Добавьте хотя бы одну цифру.
   - **KK:** Кемінде бір цифр қосыңыз.
   - **Correction:**

560. **EN:** A friend
   - **RU:** От друга
   - **KK:** Досымнан
   - **Correction:**

561. **EN:** Instagram
   - **RU:** Instagram
   - **KK:** Instagram
   - **Correction:**

562. **EN:** The teaching centre
   - **RU:** Учебный центр
   - **KK:** Оқу орталығынан
   - **Correction:**

563. **EN:** Somewhere else
   - **RU:** Другое
   - **KK:** Басқа жерден
   - **Correction:**

564. **EN:** At least 8 characters
   - **RU:** Не меньше 8 символов
   - **KK:** Кемінде 8 таңба
   - **Correction:**

565. **EN:** At least one letter
   - **RU:** Хотя бы одна буква
   - **KK:** Кемінде бір әріп
   - **Correction:**

566. **EN:** At least one number
   - **RU:** Хотя бы одна цифра
   - **KK:** Кемінде бір цифр
   - **Correction:**

### The sign-in shell (shell.tsx)

567. **EN:** Accounts are not available
   - **RU:** Аккаунты недоступны
   - **KK:** Аккаунттар қолжетімсіз
   - **Correction:**

568. **EN:** Accounts are not configured for this site yet.
   - **RU:** Аккаунты на этом сайте пока не настроены.
   - **KK:** Бұл сайтта аккаунттар әлі бапталмаған.
   - **Correction:**

569. **EN:** Go to my dashboard
   - **RU:** Перейти на главную
   - **KK:** Басты бетке өту
   - **Correction:**

570. **EN:** You are signed in
   - **RU:** Вы уже вошли
   - **KK:** Сіз аккаунтқа кірдіңіз
   - **Correction:**

571. **EN:** Signed in as {email}.
   - **RU:** Вы вошли как {email}.
   - **KK:** Кірген аккаунт: {email}.
   - **Correction:**

572. **EN:** Continue
   - **RU:** Продолжить
   - **KK:** Жалғастыру
   - **Correction:**

573. **EN:** Sign out
   - **RU:** Выйти
   - **KK:** Шығу
   - **Correction:**

574. **EN:** Continue with Google
   - **RU:** Продолжить с Google
   - **KK:** Google арқылы жалғастыру
   - **Correction:**

575. **EN:** That email and password do not match. Check them and try again.
   - **RU:** Email и пароль не совпадают. Проверьте их и попробуйте ещё раз.
   - **KK:** Электрондық пошта мен құпиясөз сәйкес келмейді. Тексеріп, қайталап көріңіз.
   - **Correction:**

576. **EN:** Please open the confirmation link we emailed you first.
   - **RU:** Сначала откройте ссылку для подтверждения из нашего письма.
   - **KK:** Алдымен біз хатпен жіберген растау сілтемесін ашыңыз.
   - **Correction:**

577. **EN:** There is already an account with this email. Sign in instead.
   - **RU:** Аккаунт с этим email уже есть. Просто войдите.
   - **KK:** Бұл электрондық поштамен аккаунт бұрыннан бар. Жай ғана кіріңіз.
   - **Correction:**

578. **EN:** The security check did not go through. Please try again.
   - **RU:** Проверка безопасности не пройдена. Попробуйте ещё раз.
   - **KK:** Қауіпсіздік тексерісінен өту мүмкін болмады. Қайталап көріңіз.
   - **Correction:**

579. **EN:** Too many attempts. Please wait a minute and try again.
   - **RU:** Слишком много попыток. Подождите минуту и попробуйте снова.
   - **KK:** Әрекет тым көп. Бір минут күтіп, қайталап көріңіз.
   - **Correction:**

580. **EN:** This password has appeared in a data leak elsewhere. Please choose a different one.
   - **RU:** Этот пароль уже встречался в утечках данных на других сайтах. Выберите другой.
   - **KK:** Бұл құпиясөз басқа сайттардағы деректердің жария болуында кездескен. Басқа құпиясөз таңдаңыз.
   - **Correction:**

581. **EN:** The new password must be different from the old one.
   - **RU:** Новый пароль должен отличаться от старого.
   - **KK:** Жаңа құпиясөз ескісінен өзгеше болуы керек.
   - **Correction:**

582. **EN:** Could not reach the server. Check your connection and try again.
   - **RU:** Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.
   - **KK:** Сервермен байланысу мүмкін болмады. Байланысты тексеріп, қайталап көріңіз.
   - **Correction:**

## Help page: buying, refunds and contact (/help)

Source file: `src/lib/i18n/dict/kk/help.ts`

582a. **EN:** Can I use the platform in Russian or Kazakh?
   - **RU:** Можно ли пользоваться платформой на русском или казахском?
   - **KK:** Платформаны орыс немесе қазақ тілінде қолдануға бола ма?
   - **Correction:**

582b. **EN:** Yes. Choose EN, RU or KZ at the top of the page. In Russian the interface and the explanations change language; in Kazakh the prices, the agreement, the privacy notice and the buying pages are in Kazakh and the rest is in Russian. Passages, recordings, questions and model answers stay in English, as in the real exam.
   - **RU:** Да. Выберите EN, RU или KZ вверху страницы. На русском меняется язык интерфейса и объяснений; на казахском цены, договор, уведомление о персональных данных и страницы покупки показаны на казахском, а остальное на русском. Тексты, записи, вопросы и образцы ответов остаются на английском, как на настоящем экзамене.
   - **KK:** Иә. Беттің жоғарғы жағынан EN, RU немесе KZ таңдаңыз. Орыс тілінде интерфейс пен түсіндірмелер аударылады; қазақ тілінде бағалар, шарт, дербес деректер туралы хабарлама және сатып алу беттері қазақша, қалғаны орысша көрсетіледі. Мәтіндер, жазбалар, сұрақтар мен үлгі жауаптар нақты емтихандағыдай ағылшын тілінде қалады.
   - **Correction:**

583. **EN:** What is free, and what is paid?
   - **RU:** Что бесплатно, а что платно?
   - **KK:** Не тегін, не ақылы?
   - **Correction:**

584. **EN:** Every lesson is free with an account: the explanations, worked examples, each lesson’s own short quiz and the vocabulary lists.
   - **RU:** Все уроки бесплатны с аккаунтом: объяснения, разобранные примеры, короткий тест к каждому уроку и списки слов.
   - **KK:** Аккаунтпен барлық сабақ тегін: түсіндірмелер, талданған мысалдар, әр сабақтың қысқа тесті және сөздік тізімдері.
   - **Correction:**

585. **EN:** Practice and guidance are paid: practice exercises and timed tests with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan.
   - **RU:** Практика и сопровождение платные: упражнения и тесты на время с оценкой балла, разбор эссе и записей Speaking от ИИ, устные собеседования с ИИ-экзаменатором, полные пробные экзамены, вступительный тест, Mr EZ и практика из вашего личного учебного плана.
   - **KK:** Практика мен сүйемелдеу ақылы: болжамды Band бағасы бар жаттығулар мен уақыты шектелген тесттер, эссе мен Speaking жазбаларына ЖИ талдауы, ЖИ емтихан алушысымен ауызша сұхбаттар, толық сынақ емтихандары, деңгейді анықтау тесті, Mr EZ және жеке оқу жоспарыңыздағы практика.
   - **Correction:**

586. **EN:** Practice and guidance last 30 days and then simply end. Nothing renews. The Plans page shows the price and what 30 days include.
   - **RU:** Практика и сопровождение действуют 30 дней и просто заканчиваются. Ничего не продлевается. Цена и то, что входит в 30 дней, указаны на странице тарифов.
   - **KK:** Практика мен сүйемелдеу 30 күн әрекет етеді, содан кейін жай ғана аяқталады. Ештеңе ұзартылмайды. Бағасы мен 30 күнге не кіретіні Тарифтер бетінде көрсетілген.
   - **Correction:**

587. **EN:** Can I get a refund?
   - **RU:** Можно ли вернуть деньги?
   - **KK:** Ақшаны қайтаруға бола ма?
   - **Correction:**

588. **EN:** Yes. You can ask for a refund at any time during the 30 days, and we pay back the share you have not used. The used share is the larger of the days that have started and the AI assessments you have used.
   - **RU:** Да. В течение 30 дней можно в любой момент попросить возврат, и мы вернём неиспользованную часть оплаты. Использованная часть считается по большему из двух: сколько дней доступа уже началось и сколько проверок ИИ вы использовали.
   - **KK:** Иә. 30 күн ішінде кез келген уақытта ақшаны қайтаруды сұрай аласыз, біз сіз пайдаланбаған үлесті қайтарамыз. Пайдаланылған үлес екеуінің үлкені бойынша есептеледі: басталған күндер және сіз пайдаланған ЖИ тексерулері.
   - **Correction:**

589. **EN:** Ask through the support form, choosing a refund, or by email to the seller. The public offer has the full rule and a worked example.
   - **RU:** Напишите через форму поддержки, выбрав возврат, или письмом продавцу. Полное правило и пример расчёта есть в публичной оферте.
   - **KK:** Қолдау формасы арқылы ақшаны қайтаруды таңдап жазыңыз немесе сатушыға электрондық хат жіберіңіз. Толық ереже мен есептеу мысалы жария офертада берілген.
   - **Correction:**

590. **EN:** How do I get practice and guidance?
   - **RU:** Как подключить практику и сопровождение?
   - **KK:** Практика мен сүйемелдеуді қалай қосуға болады?
   - **Correction:**

591. **EN:** Open the Plans page, sign in and pay once for 30 days. Your access starts as soon as the payment is confirmed, and your Account page shows when it ends.
   - **RU:** Откройте страницу тарифов, войдите в аккаунт и оплатите 30 дней один раз. Доступ откроется, как только оплата подтвердится, а на странице аккаунта видно, когда он закончится.
   - **KK:** Тарифтер бетін ашып, аккаунтқа кіріңіз және 30 күн үшін бір рет төлеңіз. Қолжетімділік төлем расталған бойда ашылады, ал оның қашан аяқталатыны Аккаунт бетінде көрсетіледі.
   - **Correction:**

592. **EN:** When you reach for something that comes with practice and guidance, the platform tells you what it adds and links to the Plans page. Your lessons stay open either way.
   - **RU:** Когда вы открываете то, что входит в практику и сопровождение, платформа объясняет, что они добавляют, и ведёт на страницу тарифов. Уроки остаются открытыми в любом случае.
   - **KK:** Практика мен сүйемелдеуге кіретін нәрсені ашқанда, платформа олар не қосатынын түсіндіріп, Тарифтер бетіне апарады. Сабақтар кез келген жағдайда ашық қалады.
   - **Correction:**

593. **EN:** Buying practice and guidance is not open yet. The Plans page shows the price and what 30 days include.
   - **RU:** Покупка практики и сопровождения пока недоступна. Цена и то, что входит в 30 дней, указаны на странице тарифов.
   - **KK:** Практика мен сүйемелдеуді сатып алу әзірге қолжетімсіз. Бағасы мен 30 күнге не кіретіні Тарифтер бетінде көрсетілген.
   - **Correction:**

594. **EN:** Talk to a person
   - **RU:** Написать человеку
   - **KK:** Адамға жазу
   - **Correction:**

595. **EN:** Something not working, or a question these answers do not cover? Write to us. A person reads every message and replies by email.
   - **RU:** Что-то не работает или здесь нет ответа на ваш вопрос? Напишите нам. Каждое сообщение читает человек и отвечает по электронной почте.
   - **KK:** Бірдеңе жұмыс істемей ме немесе сұрағыңызға мұнда жауап жоқ па? Бізге жазыңыз. Әр хабарламаны адам оқиды және электрондық пошта арқылы жауап береді.
   - **Correction:**

596. **EN:** Or write directly:
   - **RU:** Или напишите напрямую:
   - **KK:** Немесе тікелей жазыңыз:
   - **Correction:**

597. **EN:** Ask a person
   - **RU:** Спросить человека
   - **KK:** Адамнан сұрау
   - **Correction:**

598. **EN:** Go to today's session
   - **RU:** Перейти к сегодняшнему занятию
   - **KK:** Бүгінгі сабаққа өту
   - **Correction:**

599. **EN:** Terms of use
   - **RU:** Условия использования
   - **KK:** Пайдалану шарттары
   - **Correction:**

## Sales website (the home page of the paid site)

Source file: `src/marketing/sales-copy.ts` (the `kk` line of each entry). Markup such as `<br />`, `<span>` and `<em>` must stay exactly where it is; `{oneMonth}` and other words in braces are filled in by the site.

600. `meta.title`
   - **EN:** IELTS is EZ | Open the gates to your future
   - **RU:** IELTS is EZ | Откройте ворота в своё будущее
   - **KK:** IELTS is EZ | Болашағыңыздың қақпасын ашыңыз
   - **Correction:**

601. `meta.description`
   - **EN:** Every IELTS lesson is free with an account. Practice, timed tests, AI feedback and Mr EZ cost {oneMonth} for 30 days, with no automatic renewal.
   - **RU:** Все уроки IELTS бесплатны с аккаунтом. Практика, тесты на время, разбор от ИИ и Mr EZ стоят {oneMonth} за 30 дней, без автоматического продления.
   - **KK:** Аккаунтпен IELTS-тің барлық сабағы тегін. Практика, уақыты шектелген тесттер, ЖИ талдауы және Mr EZ 30 күнге {oneMonth} тұрады, автоматты ұзартусыз.
   - **Correction:**

602. `skip`
   - **EN:** Skip to content
   - **RU:** Перейти к содержанию
   - **KK:** Мазмұнға өту
   - **Correction:**

603. `review.note`
   - **EN:** Sales page preview: prices and terms are agreed. Payment is not connected yet.
   - **RU:** Предварительная версия страницы: цены и условия согласованы, оплата пока не подключена.
   - **KK:** Беттің алдын ала нұсқасы: бағалар мен шарттар келісілген, төлем әлі қосылмаған.
   - **Correction:**

604. `nav.home`
   - **EN:** IELTS is EZ home
   - **RU:** IELTS is EZ, на главную
   - **KK:** IELTS is EZ, басты бетке
   - **Correction:**

605. `nav.main`
   - **EN:** Main navigation
   - **RU:** Основное меню
   - **KK:** Негізгі мәзір
   - **Correction:**

606. `nav.tutor`
   - **EN:** AI tutor
   - **RU:** ИИ-репетитор
   - **KK:** ЖИ тәлімгер
   - **Correction:**

607. `nav.feedback`
   - **EN:** AI feedback
   - **RU:** Разбор от ИИ
   - **KK:** ЖИ талдауы
   - **Correction:**

608. `nav.inside`
   - **EN:** Inside the platform
   - **RU:** Внутри платформы
   - **KK:** Платформаның іші
   - **Correction:**

609. `nav.plan`
   - **EN:** Your plan
   - **RU:** Ваш план
   - **KK:** Сіздің жоспарыңыз
   - **Correction:**

610. `nav.pricing`
   - **EN:** Pricing
   - **RU:** Цены
   - **KK:** Бағалар
   - **Correction:**

611. `nav.signIn`
   - **EN:** Sign in
   - **RU:** Войти
   - **KK:** Кіру
   - **Correction:**

612. `nav.signUp`
   - **EN:** Create a free account
   - **RU:** Создать бесплатный аккаунт
   - **KK:** Тегін аккаунт ашу
   - **Correction:**

613. `nav.signUpShort`
   - **EN:** Start for free
   - **RU:** Начать бесплатно
   - **KK:** Тегін бастау
   - **Correction:**

614. `nav.menuOpen`
   - **EN:** Open menu
   - **RU:** Открыть меню
   - **KK:** Мәзірді ашу
   - **Correction:**

615. `nav.menuClose`
   - **EN:** Close menu
   - **RU:** Закрыть меню
   - **KK:** Мәзірді жабу
   - **Correction:**

616. `lang.group`
   - **EN:** Language
   - **RU:** Язык
   - **KK:** Тіл
   - **Correction:**

617. `hero.label`
   - **EN:** Every IELTS lesson free with an account
   - **RU:** Все уроки IELTS бесплатно с аккаунтом
   - **KK:** Аккаунтпен IELTS-тің барлық сабағы тегін
   - **Correction:**

618. `hero.title`
   - **EN:** `Open the gates<br />to <em>your future.</em>`
   - **RU:** `Откройте ворота<br />в <em>своё будущее.</em>`
   - **KK:** `Болашағыңыздың<br /><em>қақпасын ашыңыз.</em>`
   - **Correction:**

619. `hero.bar`
   - **EN:** `IELTS is EZ <span class="bar-divider">/</span> Your study space`
   - **RU:** `IELTS is EZ <span class="bar-divider">/</span> Ваше учебное пространство`
   - **KK:** `IELTS is EZ <span class="bar-divider">/</span> Сіздің оқу кеңістігіңіз`
   - **Correction:**

620. `hero.preview`
   - **EN:** Platform preview
   - **RU:** Так выглядит платформа
   - **KK:** Платформа осылай көрінеді
   - **Correction:**

621. `hero.alt`
   - **EN:** The real IELTS is EZ lesson library, with Reading, Writing, Speaking and Listening lessons
   - **RU:** Настоящая библиотека уроков IELTS is EZ: уроки по Reading, Writing, Speaking и Listening
   - **KK:** IELTS is EZ сабақтарының нағыз кітапханасы: Reading, Writing, Speaking және Listening сабақтары
   - **Correction:**

622. `hero.open`
   - **EN:** Your study space
   - **RU:** Ваше учебное пространство
   - **KK:** Сіздің оқу кеңістігіңіз
   - **Correction:**

623. `demo.title`
   - **EN:** `A big ambition.<br /><span>A practical way forward.</span>`
   - **RU:** `Большая цель.<br /><span>Понятный путь к ней.</span>`
   - **KK:** `Үлкен мақсат.<br /><span>Оған апаратын түсінікті жол.</span>`
   - **Correction:**

624. `demo.lead`
   - **EN:** Prepare for Academic IELTS 7.5+ with guided practice, AI feedback, and a clear next step.
   - **RU:** Готовьтесь к Academic IELTS на 7.5+ с пошаговой практикой, разбором от ИИ и понятным следующим шагом.
   - **KK:** Academic IELTS-ке 7.5+ балға қадамдық практикамен, ЖИ талдауымен және түсінікті келесі қадаммен дайындалыңыз.
   - **Correction:**

625. `demo.tabs`
   - **EN:** See how IELTS is EZ works
   - **RU:** Как работает IELTS is EZ
   - **KK:** IELTS is EZ қалай жұмыс істейді
   - **Correction:**

626. `demo.note`
   - **EN:** Actual platform screenshots, captured in preview mode. No live AI session is running here.
   - **RU:** Настоящие снимки экрана платформы в режиме предпросмотра. Живой сессии с ИИ здесь нет.
   - **KK:** Платформаның алдын ала қарау режимінде түсірілген нағыз скриншоттары. Мұнда ЖИ-мен тікелей сессия жүріп жатқан жоқ.
   - **Correction:**

627. `demo.speaking.label`
   - **EN:** Practise speaking
   - **RU:** Практика Speaking
   - **KK:** Speaking практикасы
   - **Correction:**

628. `demo.speaking.title`
   - **EN:** Say it out loud. Find your confidence.
   - **RU:** Говорите вслух. Обретайте уверенность.
   - **KK:** Дауыстап айтыңыз. Сенімділікке ие болыңыз.
   - **Correction:**

629. `demo.speaking.text`
   - **EN:** Work through an IELTS-style conversation with the AI examiner. Keep answer structures and useful phrases beside you while you practise.
   - **RU:** Пройдите беседу в формате IELTS с ИИ-экзаменатором. Структуры ответов и полезные фразы всё время под рукой.
   - **KK:** ЖИ емтихан алушысымен IELTS форматындағы әңгімеден өтіңіз. Жауап құрылымдары мен пайдалы сөз тіркестері үнемі қол астыңызда.
   - **Correction:**

630. `demo.speaking.alt`
   - **EN:** Speaking trainer showing a Part 2 cue card, notes and examiner controls
   - **RU:** Тренажёр Speaking: карточка Part 2, заметки и управление экзаменатором
   - **KK:** Speaking тренажері: Part 2 тапсырма карточкасы, жазбалар және емтихан алушыны басқару
   - **Correction:**

631. `demo.coach.label`
   - **EN:** Get a little guidance
   - **RU:** Подсказки
   - **KK:** Кеңестер
   - **Correction:**

632. `demo.coach.title`
   - **EN:** A method to use when you get stuck.
   - **RU:** Метод на случай, когда вы застряли.
   - **KK:** Тығырыққа тірелгенде қолданатын әдіс.
   - **Correction:**

633. `demo.coach.text`
   - **EN:** Open the coach beside your practice. See how to organise an answer, choose useful language and avoid common mistakes.
   - **RU:** Откройте подсказки рядом с заданием: как выстроить ответ, какие фразы использовать и каких ошибок избегать.
   - **KK:** Тапсырманың жанынан кеңестерді ашыңыз: жауапты қалай құру керек, қандай сөз тіркестерін қолдану керек және қандай қателерден сақтану керек.
   - **Correction:**

634. `demo.coach.alt`
   - **EN:** Speaking coach with answer planning, phrases, vocabulary and common mistakes
   - **RU:** Подсказки для Speaking: план ответа, фразы, лексика и типичные ошибки
   - **KK:** Speaking бойынша кеңестер: жауап жоспары, сөз тіркестері, лексика және жиі кездесетін қателер
   - **Correction:**

635. `demo.lessons.label`
   - **EN:** Learn the method
   - **RU:** Уроки
   - **KK:** Сабақтар
   - **Correction:**

636. `demo.lessons.title`
   - **EN:** Know what to practise next.
   - **RU:** Знайте, что тренировать дальше.
   - **KK:** Ары қарай нені жаттықтыру керек екенін біліңіз.
   - **Correction:**

637. `demo.lessons.text`
   - **EN:** Explore clear lessons for all four IELTS skills. Learn a method, work through the exercises, then put it to use in practice.
   - **RU:** Понятные уроки по всем четырём частям IELTS. Изучите метод, выполните упражнения и примените его на практике.
   - **KK:** IELTS-тің төрт бөлімі бойынша түсінікті сабақтар. Әдісті үйреніп, жаттығуларды орындаңыз да, оны практикада қолданыңыз.
   - **Correction:**

638. `demo.lessons.alt`
   - **EN:** IELTS lesson library with lessons organised by skill
   - **RU:** Библиотека уроков IELTS, разделённая по навыкам
   - **KK:** Дағдылар бойынша бөлінген IELTS сабақтарының кітапханасы
   - **Correction:**

639. `demo.speaking.zoom`
   - **EN:** View full-size screenshot: Speaking trainer showing a Part 2 cue card, notes and examiner controls
   - **RU:** Открыть снимок экрана целиком: тренажёр Speaking с карточкой Part 2, заметками и управлением экзаменатором
   - **KK:** Скриншотты толық ашу: Part 2 тапсырма карточкасы, жазбалары және емтихан алушыны басқаруы бар Speaking тренажері
   - **Correction:**

640. `demo.coach.zoom`
   - **EN:** View full-size screenshot: Speaking coach with answer planning, phrases, vocabulary and common mistakes
   - **RU:** Открыть снимок экрана целиком: подсказки для Speaking с планом ответа, фразами, лексикой и типичными ошибками
   - **KK:** Скриншотты толық ашу: жауап жоспары, сөз тіркестері, лексика және жиі кездесетін қателері бар Speaking кеңестері
   - **Correction:**

641. `demo.lessons.zoom`
   - **EN:** View full-size screenshot: IELTS lesson library with lessons organised by skill
   - **RU:** Открыть снимок экрана целиком: библиотека уроков IELTS, разделённая по навыкам
   - **KK:** Скриншотты толық ашу: дағдылар бойынша бөлінген IELTS сабақтарының кітапханасы
   - **Correction:**

642. `journey.note`
   - **EN:** Your ambition. Your starting point.
   - **RU:** Ваша цель. Ваша отправная точка.
   - **KK:** Сіздің мақсатыңыз. Сіздің бастау нүктеңіз.
   - **Correction:**

643. `journey.title`
   - **EN:** `A big dream.<br /><span>A plan that feels like you.</span>`
   - **RU:** `Большая мечта.<br /><span>План, который подходит именно вам.</span>`
   - **KK:** `Үлкен арман.<br /><span>Дәл сізге лайық жоспар.</span>`
   - **Correction:**

644. `journey.lead`
   - **EN:** Choose an answer to move to the next question. Your plan is waiting at the end.
   - **RU:** Выберите ответ, чтобы перейти к следующему вопросу. В конце вас ждёт ваш план.
   - **KK:** Келесі сұраққа өту үшін жауапты таңдаңыз. Соңында сізді жоспарыңыз күтіп тұр.
   - **Correction:**

645. `journey.skip`
   - **EN:** Just exploring? Take a look inside
   - **RU:** Просто знакомитесь? Загляните внутрь
   - **KK:** Жай танысып жүрсіз бе? Ішіне қараңыз
   - **Correction:**

646. `journey.answers`
   - **EN:** Your answers
   - **RU:** Ваши ответы
   - **KK:** Сіздің жауаптарыңыз
   - **Correction:**

647. `journey.chip.band`
   - **EN:** Goal
   - **RU:** Цель
   - **KK:** Мақсат
   - **Correction:**

648. `journey.chip.skill`
   - **EN:** Section
   - **RU:** Часть
   - **KK:** Бөлім
   - **Correction:**

649. `journey.chip.focus`
   - **EN:** Focus
   - **RU:** Фокус
   - **KK:** Назар
   - **Correction:**

650. `journey.chip.time`
   - **EN:** Daily time
   - **RU:** Время в день
   - **KK:** Күніне уақыт
   - **Correction:**

651. `journey.step.band`
   - **EN:** 01 / YOUR GOAL
   - **RU:** 01 / Ваша цель
   - **KK:** 01 / Сіздің мақсатыңыз
   - **Correction:**

652. `journey.step.skill`
   - **EN:** 02 / YOUR CHALLENGE
   - **RU:** 02 / Главная трудность
   - **KK:** 02 / Басты қиындық
   - **Correction:**

653. `journey.step.focus`
   - **EN:** 03 / YOUR FOCUS
   - **RU:** 03 / Ваш фокус
   - **KK:** 03 / Сіздің назарыңыз
   - **Correction:**

654. `journey.step.time`
   - **EN:** 04 / YOUR PACE
   - **RU:** 04 / Ваш темп
   - **KK:** 04 / Сіздің қарқыныңыз
   - **Correction:**

655. `journey.q.band`
   - **EN:** What are you aiming for?
   - **RU:** К какому баллу вы стремитесь?
   - **KK:** Қандай балға ұмтыласыз?
   - **Correction:**

656. `journey.n.band`
   - **EN:** Start with the destination.
   - **RU:** Начнём с цели.
   - **KK:** Мақсаттан бастайық.
   - **Correction:**

657. `journey.o.band.7`
   - **EN:** Band 7.0
   - **RU:** Балл 7.0
   - **KK:** Band 7.0
   - **Correction:**

658. `journey.d.band.7`
   - **EN:** A strong next step
   - **RU:** Уверенный следующий шаг
   - **KK:** Сенімді келесі қадам
   - **Correction:**

659. `journey.o.band.7.5`
   - **EN:** Band 7.5
   - **RU:** Балл 7.5
   - **KK:** Band 7.5
   - **Correction:**

660. `journey.d.band.7.5`
   - **EN:** Room for bigger plans
   - **RU:** Простор для больших планов
   - **KK:** Үлкен жоспарларға жол
   - **Correction:**

661. `journey.o.band.8`
   - **EN:** Band 8.0+
   - **RU:** Балл 8.0+
   - **KK:** Band 8.0+
   - **Correction:**

662. `journey.d.band.8`
   - **EN:** Aim a little higher
   - **RU:** Цель чуть выше
   - **KK:** Сәл жоғарырақ мақсат
   - **Correction:**

663. `journey.q.skill`
   - **EN:** Which section feels hardest?
   - **RU:** Какая часть даётся труднее всего?
   - **KK:** Қай бөлім ең қиын?
   - **Correction:**

664. `journey.n.skill`
   - **EN:** We will start where a little support matters most.
   - **RU:** Начнём там, где поддержка нужнее всего.
   - **KK:** Қолдау ең керек жерден бастаймыз.
   - **Correction:**

665. `journey.o.skill.speaking`
   - **EN:** Speaking
   - **RU:** Speaking
   - **KK:** Speaking
   - **Correction:**

666. `journey.d.skill.speaking`
   - **EN:** Finding the words out loud
   - **RU:** Подобрать слова, когда говорите вслух
   - **KK:** Дауыстап сөйлегенде сөз табу
   - **Correction:**

667. `journey.o.skill.writing`
   - **EN:** Writing
   - **RU:** Writing
   - **KK:** Writing
   - **Correction:**

668. `journey.d.skill.writing`
   - **EN:** Turning ideas into an answer
   - **RU:** Превратить идеи в ответ
   - **KK:** Ойды жауапқа айналдыру
   - **Correction:**

669. `journey.o.skill.reading`
   - **EN:** Reading
   - **RU:** Reading
   - **KK:** Reading
   - **Correction:**

670. `journey.d.skill.reading`
   - **EN:** Finding the right evidence
   - **RU:** Найти в тексте нужное подтверждение
   - **KK:** Мәтіннен керек дәлелді табу
   - **Correction:**

671. `journey.o.skill.listening`
   - **EN:** Listening
   - **RU:** Listening
   - **KK:** Listening
   - **Correction:**

672. `journey.d.skill.listening`
   - **EN:** Keeping up with the recording
   - **RU:** Успевать за записью
   - **KK:** Жазбаның қарқынынан қалмау
   - **Correction:**

673. `journey.q.focus`
   - **EN:** What gets in your way?
   - **RU:** Что вам мешает?
   - **KK:** Сізге не кедергі?
   - **Correction:**

674. `journey.n.focus`
   - **EN:** Choose the one you would most like to change.
   - **RU:** Выберите то, что хочется изменить в первую очередь.
   - **KK:** Ең алдымен өзгерткіңіз келетінін таңдаңыз.
   - **Correction:**

675. `journey.o.focus.method`
   - **EN:** Knowing how to answer
   - **RU:** Не знаю, как отвечать
   - **KK:** Қалай жауап беру керегін білмеймін
   - **Correction:**

676. `journey.d.focus.method`
   - **EN:** I need a clear method
   - **RU:** Мне нужен понятный метод
   - **KK:** Маған түсінікті әдіс керек
   - **Correction:**

677. `journey.o.focus.confidence`
   - **EN:** Putting it into practice
   - **RU:** Трудно применить на практике
   - **KK:** Практикада қолдану қиын
   - **Correction:**

678. `journey.d.focus.confidence`
   - **EN:** I know the basics, but get stuck
   - **RU:** Основы знаю, но застреваю
   - **KK:** Негізін білемін, бірақ тұйыққа тірелемін
   - **Correction:**

679. `journey.q.time`
   - **EN:** What fits into your day?
   - **RU:** Сколько времени у вас есть в день?
   - **KK:** Күніне қанша уақытыңыз бар?
   - **Correction:**

680. `journey.n.time`
   - **EN:** A routine you can return to is a good place to begin.
   - **RU:** Хорошее начало: привычка, к которой легко возвращаться.
   - **KK:** Жақсы бастама: оңай қайта оралатын әдет.
   - **Correction:**

681. `journey.o.time.15`
   - **EN:** 15 minutes
   - **RU:** 15 минут
   - **KK:** 15 минут
   - **Correction:**

682. `journey.d.time.15`
   - **EN:** A small daily step
   - **RU:** Небольшой шаг каждый день
   - **KK:** Күн сайын шағын қадам
   - **Correction:**

683. `journey.o.time.30`
   - **EN:** 30 minutes
   - **RU:** 30 минут
   - **KK:** 30 минут
   - **Correction:**

684. `journey.d.time.30`
   - **EN:** Time to practise and reflect
   - **RU:** Время потренироваться и подумать
   - **KK:** Жаттығуға және ойлануға уақыт
   - **Correction:**

685. `journey.o.time.60`
   - **EN:** 60 minutes
   - **RU:** 60 минут
   - **KK:** 60 минут
   - **Correction:**

686. `journey.d.time.60`
   - **EN:** Recommended by your teacher
   - **RU:** Рекомендация преподавателя
   - **KK:** Мұғалімнің ұсынысы
   - **Correction:**

687. `journey.result.note`
   - **EN:** Where to start
   - **RU:** С чего начать
   - **KK:** Неден бастау керек
   - **Correction:**

688. `journey.result.title`
   - **EN:** Make your goal a daily habit.
   - **RU:** Превратите цель в ежедневную привычку.
   - **KK:** Мақсатыңызды күнделікті әдетке айналдырыңыз.
   - **Correction:**

689. `journey.result.lead`
   - **EN:** Four choices. Two lessons to start with.
   - **RU:** Четыре ответа. Два урока для старта.
   - **KK:** Төрт жауап. Бастауға екі сабақ.
   - **Correction:**

690. `journey.action.title`
   - **EN:** Start with these lessons.
   - **RU:** Начните с этих уроков.
   - **KK:** Осы сабақтардан бастаңыз.
   - **Correction:**

691. `journey.action.text`
   - **EN:** Create a free account to open them. Every lesson is free. Practice tests, feedback on your answers and Mr EZ come with practice and guidance.
   - **RU:** Создайте бесплатный аккаунт, чтобы открыть их. Все уроки бесплатны. Тесты, разбор ваших ответов и Mr EZ входят в доступ «практика и сопровождение».
   - **KK:** Оларды ашу үшін тегін аккаунт ашыңыз. Барлық сабақ тегін. Тесттер, жауаптарыңыздың талдауы және Mr EZ «практика және сүйемелдеу» қолжетімділігіне кіреді.
   - **Correction:**

692. `journey.disclaimer`
   - **EN:** A suggestion from your answers, not a level assessment. Your answers go with you when you sign up, and you can change them.
   - **RU:** Это подсказка по вашим ответам, а не оценка уровня. Ответы перейдут в ваш аккаунт, и их можно изменить.
   - **KK:** Бұл жауаптарыңызға негізделген кеңес, деңгейді бағалау емес. Тіркелгенде жауаптарыңыз аккаунтыңызға көшеді, оларды өзгертуге болады.
   - **Correction:**

693. `journey.placeholder`
   - **EN:** Choose your goal, your hardest section and your daily pace. The lessons to start with will appear here.
   - **RU:** Выберите цель, самую трудную часть и темп на день. Здесь появятся уроки, с которых стоит начать.
   - **KK:** Мақсатыңызды, ең қиын бөлімді және күндік қарқыныңызды таңдаңыз. Бастауға тұрарлық сабақтар осында пайда болады.
   - **Correction:**

694. `journey.placeholder.cta`
   - **EN:** Find my starting point
   - **RU:** Найти мою точку старта
   - **KK:** Бастау нүктемді табу
   - **Correction:**

695. `journey.progress`
   - **EN:** {count} of 4 choices made. Finish the questions to see where to start.
   - **RU:** Выбрано ответов: {count} из 4. Ответьте на все вопросы, чтобы увидеть, с чего начать.
   - **KK:** Таңдалған жауаптар: 4 ішінен {count}. Неден бастау керегін көру үшін барлық сұраққа жауап беріңіз.
   - **Correction:**

696. `journey.plan.title`
   - **EN:** For Band {band}, start here.
   - **RU:** Для балла {band} начните здесь.
   - **KK:** Band {band} үшін осы жерден бастаңыз.
   - **Correction:**

697. `journey.plan.lead`
   - **EN:** You chose {skill} as the hardest section. These two lessons help most with {focus}.
   - **RU:** Самой трудной частью вы выбрали {skill}. Эти два урока больше всего помогут {focus}.
   - **KK:** Ең қиын бөлім ретінде {skill} таңдадыңыз. Мына екі сабақ ең алдымен мынаған көмектеседі: {focus}.
   - **Correction:**

698. `journey.plan.label`
   - **EN:** {skill} / {time} minutes a day
   - **RU:** {skill} / {time} минут в день
   - **KK:** {skill} / күніне {time} минут
   - **Correction:**

699. `journey.plan.focus.method`
   - **EN:** A clear method
   - **RU:** Понятный метод
   - **KK:** Түсінікті әдіс
   - **Correction:**

700. `journey.plan.help.method`
   - **EN:** knowing how to answer
   - **RU:** понять, как отвечать
   - **KK:** қалай жауап беру керегін түсіну
   - **Correction:**

701. `journey.plan.help.confidence`
   - **EN:** putting it into practice
   - **RU:** применить знания на практике
   - **KK:** білімді практикада қолдану
   - **Correction:**

702. `journey.plan.focus.confidence`
   - **EN:** More confident practice
   - **RU:** Более уверенная практика
   - **KK:** Сенімдірек практика
   - **Correction:**

703. `journey.plan.free`
   - **EN:** Free lesson
   - **RU:** Бесплатный урок
   - **KK:** Тегін сабақ
   - **Correction:**

704. `ez.alt`
   - **EN:** Mr EZ, your friendly AI tutor, wearing glasses and a forest-green hoodie with orange Mr EZ lettering.
   - **RU:** Mr EZ, ваш дружелюбный ИИ-репетитор, в очках и тёмно-зелёном худи с оранжевой надписью Mr EZ.
   - **KK:** Mr EZ, сіздің мейірімді ЖИ тәлімгеріңіз, көзілдірік киген, қызғылт сары Mr EZ жазуы бар қою жасыл худи киген.
   - **Correction:**

705. `ez.name`
   - **EN:** `Mr EZ <small>Your AI study companion</small>`
   - **RU:** `Mr EZ <small>Ваш ИИ-помощник в учёбе</small>`
   - **KK:** `Mr EZ <small>Оқудағы ЖИ көмекшіңіз</small>`
   - **Correction:**

706. `ez.note`
   - **EN:** A little guidance. A lot more clarity.
   - **RU:** Немного подсказки. Гораздо больше ясности.
   - **KK:** Аздаған кеңес. Әлдеқайда көп айқындық.
   - **Correction:**

707. `ez.title`
   - **EN:** `Meet Mr EZ.<br /><span>Your next step, <br />made clearer.</span>`
   - **RU:** `Знакомьтесь: Mr EZ.<br /><span>Ваш следующий шаг <br />станет понятнее.</span>`
   - **KK:** `Танысыңыз: Mr EZ.<br /><span>Келесі қадамыңыз <br />түсініктірек болады.</span>`
   - **Correction:**

708. `ez.lead`
   - **EN:** Getting a score is one thing. Knowing what to do next is another. Mr EZ is your AI tutor, here to help you understand your practice and keep moving towards your goal.
   - **RU:** Получить балл и понять, что делать дальше, не одно и то же. Mr EZ, ваш ИИ-репетитор, поможет разобраться в результатах практики и не останавливаться на пути к цели.
   - **KK:** Балл алу бір бөлек, ары қарай не істеу керегін түсіну бір бөлек. ЖИ тәлімгеріңіз Mr EZ практика нәтижелерін түсінуге және мақсатқа қарай тоқтамай жүруге көмектеседі.
   - **Correction:**

709. `ez.example`
   - **EN:** Example conversation with Mr EZ
   - **RU:** Пример разговора с Mr EZ
   - **KK:** Mr EZ-пен әңгіме үлгісі
   - **Correction:**

710. `ez.example.label`
   - **EN:** Example conversation
   - **RU:** Пример разговора
   - **KK:** Әңгіме үлгісі
   - **Correction:**

711. `ez.student`
   - **EN:** `<b>You</b>My answers are too short. What should I add?`
   - **RU:** `<b>Вы</b>Мои ответы слишком короткие. Что добавить?`
   - **KK:** `<b>Сіз</b>Жауаптарым тым қысқа. Не қосуым керек?`
   - **Correction:**

712. `ez.reply`
   - **EN:** `Start with your answer, add a reason, then give one specific example. Try it with <span lang="en">“Do you enjoy studying with other people?”</span>`
   - **RU:** `Начните с ответа, добавьте причину, затем приведите один конкретный пример. Попробуйте на вопросе <span lang="en">“Do you enjoy studying with other people?”</span>`
   - **KK:** `Жауаптан бастаңыз, себебін қосыңыз, содан кейін бір нақты мысал келтіріңіз. Мына сұрақпен байқап көріңіз: <span lang="en">“Do you enjoy studying with other people?”</span>`
   - **Correction:**

713. `ez.next`
   - **EN:** Your next practice: developing a Part 1 answer.
   - **RU:** Следующая практика: развёрнутый ответ в Part 1.
   - **KK:** Келесі практика: Part 1-де толық жауап беру.
   - **Correction:**

714. `ez.disclaimer`
   - **EN:** Illustrative conversation, not a live chat. Mr EZ can explain results, help with study questions and suggest relevant practice.
   - **RU:** Это пример, а не живой чат. Mr EZ объясняет результаты, отвечает на вопросы по учёбе и предлагает подходящую практику.
   - **KK:** Бұл үлгі ғана, тікелей чат емес. Mr EZ нәтижелерді түсіндіреді, оқу бойынша сұрақтарға жауап береді және сәйкес практиканы ұсынады.
   - **Correction:**

715. `ez.access`
   - **EN:** Mr EZ comes with practice and guidance. Daily usage limits apply.
   - **RU:** Mr EZ входит в практику и сопровождение. Действуют дневные лимиты использования.
   - **KK:** Mr EZ практика мен сүйемелдеуге кіреді. Күндік пайдалану шектеулері бар.
   - **Correction:**

716. `room.note`
   - **EN:** Come on in
   - **RU:** Заходите
   - **KK:** Кіріңіз
   - **Correction:**

717. `room.title`
   - **EN:** `One space.<br />Every part of IELTS.`
   - **RU:** `Одно пространство.<br />Все части IELTS.`
   - **KK:** `Бір кеңістік.<br />IELTS-тің барлық бөлімі.`
   - **Correction:**

718. `room.lead`
   - **EN:** `Less searching for what to study.<br />More time actually getting somewhere.`
   - **RU:** `Меньше поисков, что учить.<br />Больше времени на настоящий прогресс.`
   - **KK:** `Нені оқу керегін іздеуге аз уақыт.<br />Нақты алға жылжуға көп уақыт.`
   - **Correction:**

719. `room.choose`
   - **EN:** Choose a skill
   - **RU:** Выберите навык
   - **KK:** Дағдыны таңдаңыз
   - **Correction:**

720. `room.tabs`
   - **EN:** Explore IELTS skills
   - **RU:** Навыки IELTS
   - **KK:** IELTS дағдылары
   - **Correction:**

721. `room.method`
   - **EN:** How we teach it
   - **RU:** Как мы этому учим
   - **KK:** Біз мұны қалай үйретеміз
   - **Correction:**

722. `room.hint`
   - **EN:** Choose a section. Find your next step.
   - **RU:** Выберите часть. Найдите следующий шаг.
   - **KK:** Бөлімді таңдаңыз. Келесі қадамыңызды табыңыз.
   - **Correction:**

723. `room.foot`
   - **EN:** Learn at your pace. Come back when you're ready.
   - **RU:** Учитесь в своём темпе. Возвращайтесь, когда будете готовы.
   - **KK:** Өз қарқыныңызбен оқыңыз. Дайын болғанда қайта оралыңыз.
   - **Correction:**

724. `skill.reading.headline`
   - **EN:** Find the meaning. Then the answer.
   - **RU:** Сначала смысл. Потом ответ.
   - **KK:** Алдымен мағына. Содан кейін жауап.
   - **Correction:**

725. `skill.reading.text`
   - **EN:** Learn to spot paraphrases, follow an argument, and find the evidence that makes an answer right.
   - **RU:** Научитесь замечать перефразирование, следить за ходом мысли и находить подтверждение, которое делает ответ верным.
   - **KK:** Перифразды байқауды, ой желісін қадағалауды және жауапты дұрыс ететін дәлелді табуды үйреніңіз.
   - **Correction:**

726. `skill.reading.m1`
   - **EN:** Recognise paraphrases and question types.
   - **RU:** Узнавайте перефразирование и типы вопросов.
   - **KK:** Перифраз бен сұрақ түрлерін танып біліңіз.
   - **Correction:**

727. `skill.reading.m2`
   - **EN:** Find the evidence in the passage.
   - **RU:** Находите подтверждение в тексте.
   - **KK:** Мәтіннен дәлел табыңыз.
   - **Correction:**

728. `skill.reading.m3`
   - **EN:** Apply the method in focused exercises and timed tests.
   - **RU:** Применяйте метод в целевых упражнениях и тестах на время.
   - **KK:** Әдісті мақсатты жаттығулар мен уақыты шектелген тесттерде қолданыңыз.
   - **Correction:**

729. `skill.listening.headline`
   - **EN:** Know what to listen for.
   - **RU:** Знайте, что слушать.
   - **KK:** Нені тыңдау керегін біліңіз.
   - **Correction:**

730. `skill.listening.text`
   - **EN:** Predict the missing detail, follow the signposts, and catch the moment a speaker changes their mind.
   - **RU:** Предсказывайте недостающую деталь, следите за сигнальными словами и ловите момент, когда говорящий меняет решение.
   - **KK:** Жетіспейтін мәліметті алдын ала болжап, белгі сөздерді қадағалаңыз және сөйлеуші ойын өзгерткен сәтті байқаңыз.
   - **Correction:**

731. `skill.listening.m1`
   - **EN:** Predict the detail you need before listening.
   - **RU:** Предсказывайте нужную деталь до прослушивания.
   - **KK:** Тыңдамас бұрын керек мәліметті болжаңыз.
   - **Correction:**

732. `skill.listening.m2`
   - **EN:** Follow signposts and notice distractors.
   - **RU:** Следите за сигнальными словами и замечайте ловушки.
   - **KK:** Белгі сөздерді қадағалап, тұзақтарды байқаңыз.
   - **Correction:**

733. `skill.listening.m3`
   - **EN:** Practise with recordings, then review the answers.
   - **RU:** Тренируйтесь на записях, затем разбирайте ответы.
   - **KK:** Жазбалармен жаттығып, содан кейін жауаптарды талдаңыз.
   - **Correction:**

734. `skill.writing.headline`
   - **EN:** Give your ideas a clear direction.
   - **RU:** Дайте идеям чёткое направление.
   - **KK:** Ойыңызға нақты бағыт беріңіз.
   - **Correction:**

735. `skill.writing.text`
   - **EN:** Make a plan, develop your argument, and practise with useful phrases and structure beside you.
   - **RU:** Составьте план, развивайте аргумент и тренируйтесь, держа под рукой полезные фразы и структуру.
   - **KK:** Жоспар құрып, дәлеліңізді дамытыңыз және пайдалы сөз тіркестері мен құрылымды қол астыңызда ұстап жаттығыңыз.
   - **Correction:**

736. `skill.writing.m1`
   - **EN:** Plan a clear answer with guided structures.
   - **RU:** Планируйте чёткий ответ по готовым структурам.
   - **KK:** Дайын құрылымдармен нақты жауапты жоспарлаңыз.
   - **Correction:**

737. `skill.writing.m2`
   - **EN:** Develop your ideas using examples and useful phrases.
   - **RU:** Развивайте идеи с помощью примеров и полезных фраз.
   - **KK:** Ойыңызды мысалдар мен пайдалы сөз тіркестері арқылы дамытыңыз.
   - **Correction:**

738. `skill.writing.m3`
   - **EN:** Use AI feedback to choose what to revise next.
   - **RU:** По разбору от ИИ решайте, что исправить дальше.
   - **KK:** ЖИ талдауына қарап, ары қарай нені түзету керегін шешіңіз.
   - **Correction:**

739. `skill.speaking.headline`
   - **EN:** Find your words. Keep your voice.
   - **RU:** Найдите слова. Сохраните свой голос.
   - **KK:** Сөзіңізді табыңыз. Өз дауысыңызды сақтаңыз.
   - **Correction:**

740. `skill.speaking.text`
   - **EN:** Build fuller, more natural answers with a simple structure, then put them into practice out loud.
   - **RU:** Стройте более полные и естественные ответы по простой структуре, а потом отрабатывайте их вслух.
   - **KK:** Қарапайым құрылыммен толығырақ әрі табиғи жауап құрып, оны дауыстап жаттықтырыңыз.
   - **Correction:**

741. `skill.speaking.m1`
   - **EN:** Build an answer with a reason and an example.
   - **RU:** Стройте ответ с причиной и примером.
   - **KK:** Себебі мен мысалы бар жауап құрыңыз.
   - **Correction:**

742. `skill.speaking.m2`
   - **EN:** Practise out loud with structures and vocabulary nearby.
   - **RU:** Тренируйтесь вслух, держа под рукой структуры и лексику.
   - **KK:** Құрылымдар мен лексиканы қол астыңызда ұстап, дауыстап жаттығыңыз.
   - **Correction:**

743. `skill.speaking.m3`
   - **EN:** Review AI feedback and focus your next attempt.
   - **RU:** Изучайте разбор от ИИ и уточняйте цель следующей попытки.
   - **KK:** ЖИ талдауын қарап, келесі әрекеттің мақсатын нақтылаңыз.
   - **Correction:**

744. `fb.art`
   - **EN:** Illustrative writing feedback
   - **RU:** Пример разбора письменной работы
   - **KK:** Жазба жұмысты талдау үлгісі
   - **Correction:**

745. `fb.progress`
   - **EN:** Your idea, in progress
   - **RU:** Ваша идея в работе
   - **KK:** Сіздің ойыңыз әзірленуде
   - **Correction:**

746. `fb.comment.title`
   - **EN:** Make the benefit specific.
   - **RU:** Уточните, в чём польза.
   - **KK:** Пайдасын нақтылаңыз.
   - **Correction:**

747. `fb.comment.text`
   - **EN:** What can students do in that space? Why does that matter?
   - **RU:** Что студенты могут делать в этом пространстве? Почему это важно?
   - **KK:** Студенттер бұл кеңістікте не істей алады? Бұл неге маңызды?
   - **Correction:**

748. `fb.draft`
   - **EN:** One possible next draft
   - **RU:** Возможный следующий вариант
   - **KK:** Келесі нұсқаның бір үлгісі
   - **Correction:**

749. `fb.sample`
   - **EN:** Illustrative feedback, not a live assessment
   - **RU:** Пример разбора, а не живая проверка
   - **KK:** Талдау үлгісі, тікелей тексеру емес
   - **Correction:**

750. `fb.note`
   - **EN:** AI built into your practice
   - **RU:** ИИ встроен в вашу практику
   - **KK:** ЖИ практикаңызға енгізілген
   - **Correction:**

751. `fb.title`
   - **EN:** `Understand your band.<br /><span>Know your next step.</span>`
   - **RU:** `Поймите свой балл.<br /><span>Узнайте следующий шаг.</span>`
   - **KK:** `Балыңызды түсініңіз.<br /><span>Келесі қадамыңызды біліңіз.</span>`
   - **Correction:**

752. `fb.lead`
   - **EN:** Write an essay. Record an answer. Get personal AI feedback on demand, without booking a marking session.
   - **RU:** Напишите эссе. Запишите ответ. Получите личный разбор от ИИ, когда вам удобно, без записи на проверку.
   - **KK:** Эссе жазыңыз. Жауабыңызды жазып алыңыз. Тексеруге жазылмай-ақ, өзіңізге ыңғайлы кезде жеке ЖИ талдауын алыңыз.
   - **Correction:**

753. `fb.1.title`
   - **EN:** A band estimate with a reason behind it.
   - **RU:** Примерный балл с объяснением.
   - **KK:** Түсіндірмесі бар болжамды балл.
   - **Correction:**

754. `fb.1.text`
   - **EN:** Your writing and speaking are assessed against the official public IELTS band descriptors, with feedback for each criterion.
   - **RU:** Ваши Writing и Speaking оцениваются по официальным открытым критериям IELTS, с разбором по каждому критерию.
   - **KK:** Writing және Speaking жұмыстарыңыз IELTS-тің ресми ашық критерийлері бойынша бағаланады, әр критерий бойынша талдау беріледі.
   - **Correction:**

755. `fb.2.title`
   - **EN:** Advice about your actual answer.
   - **RU:** Советы по вашему конкретному ответу.
   - **KK:** Нақты жауабыңызға кеңес.
   - **Correction:**

756. `fb.2.text`
   - **EN:** Get specific changes for your essay or recording, including pronunciation feedback from your audio.
   - **RU:** Конкретные правки для эссе или записи, включая разбор произношения по вашему аудио.
   - **KK:** Эссеңізге немесе жазбаңызға нақты түзетулер, соның ішінде аудиоңыз бойынша айтылым талдауы.
   - **Correction:**

757. `fb.3.title`
   - **EN:** Know what the next band asks of you.
   - **RU:** Узнайте, что нужно для следующего балла.
   - **KK:** Келесі балл үшін не керегін біліңіз.
   - **Correction:**

758. `fb.3.text`
   - **EN:** Choose one improvement, practise it, then try again.
   - **RU:** Выберите одно улучшение, отработайте его и попробуйте снова.
   - **KK:** Бір жақсартуды таңдап, оны жаттықтырыңыз да, қайта байқап көріңіз.
   - **Correction:**

759. `fb.score`
   - **EN:** AI assessments take time to process. Bands are practice estimates, not official results or a guarantee of your test score.
   - **RU:** Проверке ИИ нужно немного времени. Баллы примерные, для практики: это не официальный результат и не гарантия балла на экзамене.
   - **KK:** ЖИ тексеруіне біраз уақыт керек. Балдар жаттығуға арналған болжам: бұл ресми нәтиже емес және емтихандағы балыңызға кепілдік бермейді.
   - **Correction:**

760. `fb.criteria.title`
   - **EN:** Official criteria. Transparent practice estimates.
   - **RU:** Официальные критерии. Прозрачные учебные оценки.
   - **KK:** Ресми критерийлер. Ашық оқу бағалары.
   - **Correction:**

761. `fb.criteria.text`
   - **EN:** See what your writing and speaking are assessed on.
   - **RU:** Посмотрите, по каким критериям оцениваются ваши Writing и Speaking.
   - **KK:** Writing және Speaking жұмыстарыңыз қандай критерийлер бойынша бағаланатынын қараңыз.
   - **Correction:**

762. `fb.criteria.foot`
   - **EN:** Our AI uses these published descriptors to guide its assessments. IELTS does not endorse this platform or issue our practice estimates.
   - **RU:** Наш ИИ опирается на эти опубликованные критерии при оценке. IELTS не одобряет эту платформу и не выдаёт наши учебные оценки.
   - **KK:** Біздің ЖИ бағалау кезінде осы жарияланған критерийлерге сүйенеді. IELTS бұл платформаны мақұлдамайды және біздің оқу бағаларымызды бермейді.
   - **Correction:**

763. `price.title`
   - **EN:** `Every lesson, free.<br /><span>Guidance when you want it.</span>`
   - **RU:** `Все уроки бесплатно.<br /><span>Сопровождение, когда оно нужно.</span>`
   - **KK:** `Барлық сабақ тегін.<br /><span>Сүйемелдеу, қажет кезде.</span>`
   - **Correction:**

764. `price.lead`
   - **EN:** `Create a free account to read every lesson.<br />Add practice and guidance for 30 days whenever you are ready.`
   - **RU:** `Создайте бесплатный аккаунт, чтобы читать все уроки.<br />Добавьте практику и сопровождение на 30 дней, когда будете готовы.`
   - **KK:** `Барлық сабақты оқу үшін тегін аккаунт ашыңыз.<br />Дайын болғанда 30 күнге практика мен сүйемелдеуді қосыңыз.`
   - **Correction:**

765. `price.compare`
   - **EN:** What is free and what is paid
   - **RU:** Что бесплатно, а что платно
   - **KK:** Не тегін, не ақылы
   - **Correction:**

766. `price.free.label`
   - **EN:** Free account
   - **RU:** Бесплатный аккаунт
   - **KK:** Тегін аккаунт
   - **Correction:**

767. `price.free.title`
   - **EN:** Every lesson
   - **RU:** Все уроки
   - **KK:** Барлық сабақ
   - **Correction:**

768. `price.free.amount`
   - **EN:** `Free <small>with an account, no payment card</small>`
   - **RU:** `Бесплатно <small>с аккаунтом, без банковской карты</small>`
   - **KK:** `Тегін <small>аккаунтпен, банк картасыз</small>`
   - **Correction:**

769. `price.free.1`
   - **EN:** Every lesson for Reading, Listening, Writing and Speaking
   - **RU:** Все уроки по Reading, Listening, Writing и Speaking
   - **KK:** Reading, Listening, Writing және Speaking бойынша барлық сабақ
   - **Correction:**

770. `price.free.2`
   - **EN:** Worked examples and each lesson’s own short quiz
   - **RU:** Разобранные примеры и короткий тест к каждому уроку
   - **KK:** Талданған мысалдар және әр сабақтың қысқа тесті
   - **Correction:**

771. `price.free.3`
   - **EN:** Vocabulary topic lists and word tables
   - **RU:** Тематические списки слов и таблицы лексики
   - **KK:** Тақырыптық сөз тізімдері мен лексика кестелері
   - **Correction:**

772. `price.free.4`
   - **EN:** The course map and your progress through the lessons
   - **RU:** Карта курса и ваш прогресс по урокам
   - **KK:** Курс картасы және сабақтар бойынша үлгеріміңіз
   - **Correction:**

773. `price.paid.label`
   - **EN:** Practice and guidance
   - **RU:** Практика и сопровождение
   - **KK:** Практика және сүйемелдеу
   - **Correction:**

774. `price.paid.title`
   - **EN:** Practise, get feedback, follow your plan
   - **RU:** Практика, разбор и личный план
   - **KK:** Практика, талдау және жеке жоспар
   - **Correction:**

775. `price.paid.amount`
   - **EN:** `{oneMonth} <small>for 30 days, paid once</small>`
   - **RU:** `{oneMonth} <small>за 30 дней, оплата один раз</small>`
   - **KK:** `{oneMonth} <small>30 күнге, бір рет төленеді</small>`
   - **Correction:**

776. `price.paid.1`
   - **EN:** Every practice exercise and timed test, with band estimates
   - **RU:** Все упражнения и тесты на время, с примерной оценкой балла
   - **KK:** Болжамды Band бағасы бар барлық жаттығу мен уақыты шектелген тест
   - **Correction:**

777. `price.paid.2`
   - **EN:** 12 essay assessments and 6 recorded Speaking assessments
   - **RU:** 12 проверок эссе и 6 проверок записей Speaking
   - **KK:** 12 эссе тексеруі және 6 Speaking жазбасын тексеру
   - **Correction:**

778. `price.paid.3`
   - **EN:** 2 live interviews with the AI examiner, with feedback
   - **RU:** 2 устных собеседования с ИИ-экзаменатором, с разбором
   - **KK:** ЖИ емтихан алушысымен талдауы бар 2 ауызша сұхбат
   - **Correction:**

779. `price.paid.4`
   - **EN:** 2 full mock exams and the placement test
   - **RU:** 2 полных пробных экзамена и вступительный тест
   - **KK:** 2 толық сынақ емтиханы және деңгейді анықтау тесті
   - **Correction:**

780. `price.paid.5`
   - **EN:** Mr EZ, your personal AI tutor, and your personal study plan
   - **RU:** Mr EZ, ваш личный ИИ-репетитор, и ваш личный учебный план
   - **KK:** Mr EZ, сіздің жеке ЖИ тәлімгеріңіз, және жеке оқу жоспарыңыз
   - **Correction:**

781. `price.paid.small`
   - **EN:** No automatic renewal: access simply ends after 30 days. You can ask for a refund during the 30 days, and we pay back the share you have not used. Recorded Speaking assessments last up to 5 minutes and live interviews up to 15. The placement test is once per account. Essays written in a mock exam or the placement test count towards the 12. Unused assessments expire with the 30 days. Mr EZ allows 40 chat messages and 60 lesson-help requests a day.
   - **RU:** Без автоматического продления: доступ просто заканчивается через 30 дней. В течение 30 дней можно попросить возврат, и мы вернём неиспользованную часть оплаты. Запись Speaking длится до 5 минут, устное собеседование до 15 минут. Вступительный тест проходят один раз на аккаунт. Эссе в пробном экзамене и во вступительном тесте входят в 12 проверок. Неиспользованные проверки сгорают через 30 дней. Mr EZ: 40 сообщений в чате и 60 запросов помощи в уроках в день.
   - **KK:** Автоматты ұзарту жоқ: қолжетімділік 30 күннен кейін жай ғана аяқталады. 30 күн ішінде ақшаны қайтаруды сұрай аласыз, біз сіз пайдаланбаған үлесті қайтарамыз. Speaking жазбасы 5 минутқа дейін, ауызша сұхбат 15 минутқа дейін созылады. Деңгейді анықтау тесті бір аккаунтқа бір рет тапсырылады. Сынақ емтиханында және деңгейді анықтау тестінде жазылған эссе 12 тексерудің санына кіреді. Пайдаланылмаған тексерулер 30 күннен кейін күшін жояды. Mr EZ: күніне чатта 40 хабарлама және сабақтағы көмекке 60 сұрау.
   - **Correction:**

782. `price.paid.cta`
   - **EN:** Get practice and guidance
   - **RU:** Подключить практику и сопровождение
   - **KK:** Практика мен сүйемелдеуді қосу
   - **Correction:**

783. `price.status`
   - **EN:** 30 days, no automatic renewal. The unused share is refunded on request. Buying is not switched on yet.
   - **RU:** 30 дней, без автоматического продления. Неиспользованную часть оплаты можно вернуть по запросу. Покупка пока недоступна.
   - **KK:** 30 күн, автоматты ұзартусыз. Пайдаланылмаған үлесті сұрау бойынша қайтаруға болады. Сатып алу әзірге қолжетімсіз.
   - **Correction:**

784. `price.status.open`
   - **EN:** 30 days, no automatic renewal. The unused share is refunded on request. Check what is included before you buy.
   - **RU:** 30 дней, без автоматического продления. Неиспользованную часть оплаты можно вернуть по запросу. Перед покупкой проверьте, что входит в доступ.
   - **KK:** 30 күн, автоматты ұзартусыз. Пайдаланылмаған үлесті сұрау бойынша қайтаруға болады. Сатып алмас бұрын қолжетімділікке не кіретінін тексеріңіз.
   - **Correction:**

785. `price.plans`
   - **EN:** See the plans
   - **RU:** Посмотреть тарифы
   - **KK:** Тарифтерді көру
   - **Correction:**

786. `faq.note`
   - **EN:** Before your first step
   - **RU:** Перед первым шагом
   - **KK:** Алғашқы қадам алдында
   - **Correction:**

787. `faq.title`
   - **EN:** `A few things<br />you might wonder.`
   - **RU:** `Несколько вопросов,<br />которые могут возникнуть.`
   - **KK:** `Туындауы мүмкін<br />бірнеше сұрақ.`
   - **Correction:**

788. `faq.free.q`
   - **EN:** What is free?
   - **RU:** Что бесплатно?
   - **KK:** Не тегін?
   - **Correction:**

789. `faq.free.a`
   - **EN:** Every lesson, with an account: the explanations, worked examples, each lesson’s short quiz and the vocabulary lists, for all four IELTS papers. Creating the account is free and needs no payment card.
   - **RU:** Все уроки, с аккаунтом: объяснения, разобранные примеры, короткий тест к каждому уроку и списки слов по всем четырём частям IELTS. Аккаунт создаётся бесплатно, банковская карта не нужна.
   - **KK:** Аккаунтпен барлық сабақ: IELTS-тің төрт бөлімі бойынша түсіндірмелер, талданған мысалдар, әр сабақтың қысқа тесті және сөз тізімдері. Аккаунт тегін ашылады, банк картасы қажет емес.
   - **Correction:**

790. `faq.paid.q`
   - **EN:** What is paid, and why?
   - **RU:** Что платно и почему?
   - **KK:** Не ақылы және неге?
   - **Correction:**

791. `faq.paid.a`
   - **EN:** Practice and guidance: practice exercises and timed tests with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan. They are paid because every AI check and every conversation costs real money to run. That is what lets the lessons stay free.
   - **RU:** Практика и сопровождение: упражнения и тесты на время с оценкой балла, разбор эссе и записей Speaking от ИИ, устные собеседования с ИИ-экзаменатором, полные пробные экзамены, вступительный тест, Mr EZ и практика из вашего личного учебного плана. Они платные, потому что каждая проверка ИИ и каждый разговор стоят реальных денег. Благодаря этому уроки остаются бесплатными.
   - **KK:** Практика және сүйемелдеу: болжамды Band бағасы бар жаттығулар мен уақыты шектелген тесттер, эссе мен Speaking жазбаларына ЖИ талдауы, ЖИ емтихан алушысымен ауызша сұхбаттар, толық сынақ емтихандары, деңгейді анықтау тесті, Mr EZ және жеке оқу жоспарыңыздағы практика. Олар ақылы, себебі әр ЖИ тексеруі мен әр әңгіме нақты ақша тұрады. Соның арқасында сабақтар тегін болып қалады.
   - **Correction:**

792. `faq.cost.q`
   - **EN:** How much do practice and guidance cost?
   - **RU:** Сколько стоят практика и сопровождение?
   - **KK:** Практика мен сүйемелдеу қанша тұрады?
   - **Correction:**

793. `faq.cost.a`
   - **EN:** 30 days cost {oneMonth}, paid once. Your lessons stay free with your account whether or not you buy.
   - **RU:** 30 дней стоят {oneMonth}, оплата один раз. Уроки остаются бесплатными с аккаунтом, даже если вы ничего не покупаете.
   - **KK:** 30 күн {oneMonth} тұрады, бір рет төленеді. Ештеңе сатып алмасаңыз да, сабақтар аккаунтпен тегін болып қалады.
   - **Correction:**

794. `faq.renewal.q`
   - **EN:** Does it renew automatically?
   - **RU:** Продлевается ли доступ автоматически?
   - **KK:** Қолжетімділік автоматты түрде ұзартыла ма?
   - **Correction:**

795. `faq.renewal.a`
   - **EN:** No. Access lasts 30 days and then simply ends, so you are never charged automatically. You can buy again whenever you like. If your access is still running, the new 30 days start when it ends.
   - **RU:** Нет. Доступ действует 30 дней и просто заканчивается, поэтому автоматических списаний не бывает. Купить снова можно в любой момент. Если доступ ещё действует, новые 30 дней начнутся, когда он закончится.
   - **KK:** Жоқ. Қолжетімділік 30 күн әрекет етеді де, жай ғана аяқталады, сондықтан ақша ешқашан автоматты түрде алынбайды. Кез келген уақытта қайта сатып ала аласыз. Қолжетімділік әлі әрекет етіп тұрса, жаңа 30 күн ол аяқталғанда басталады.
   - **Correction:**

796. `faq.refund.q`
   - **EN:** Can I get a refund?
   - **RU:** Можно ли вернуть деньги?
   - **KK:** Ақшаны қайтаруға бола ма?
   - **Correction:**

797. `faq.refund.a`
   - **EN:** Yes. You can ask for a refund at any time during your 30 days, and we pay back the share you have not used. The used share is the larger of the days that have started and the AI assessments you have used. Ask through the support form. The public offer has the full rule and a worked example.
   - **RU:** Да. В течение 30 дней можно в любой момент попросить возврат, и мы вернём неиспользованную часть оплаты. Использованная часть считается по большему из двух: сколько дней доступа уже началось и сколько проверок ИИ вы уже использовали. Напишите нам через форму поддержки. Полное правило и пример расчёта есть в публичной оферте.
   - **KK:** Иә. 30 күн ішінде кез келген уақытта ақшаны қайтаруды сұрай аласыз, біз сіз пайдаланбаған үлесті қайтарамыз. Пайдаланылған үлес екеуінің үлкені бойынша есептеледі: басталған күндер және сіз пайдаланған ЖИ тексерулері. Бізге қолдау формасы арқылы жазыңыз. Толық ереже мен есептеу мысалы жария офертада берілген.
   - **Correction:**

798. `faq.unlimited.q`
   - **EN:** Is AI practice unlimited?
   - **RU:** Практика с ИИ без ограничений?
   - **KK:** ЖИ-мен практика шектеусіз бе?
   - **Correction:**

799. `faq.unlimited.a`
   - **EN:** No. Each 30 days include 12 essay assessments, 6 recorded Speaking assessments (up to 5 minutes each), 2 live interviews with feedback (up to 15 minutes each), 2 full mock exams, and the placement test once per account. Essays written in a mock exam or the placement test count towards the 12. Unused assessments expire with the 30 days. Reading and Listening practice has no limit. Mr EZ allows 40 chat messages and 60 lesson-help requests a day.
   - **RU:** Нет. За 30 дней: 12 проверок эссе, 6 проверок записей Speaking до 5 минут, 2 устных собеседования с разбором до 15 минут, 2 полных пробных экзамена и вступительный тест, один раз на аккаунт. Эссе в пробном экзамене и во вступительном тесте входят в 12 проверок. Неиспользованные проверки сгорают через 30 дней. Практика Reading и Listening без ограничений. Mr EZ: 40 сообщений в чате и 60 запросов помощи в уроках в день.
   - **KK:** Жоқ. 30 күнге: 12 эссе тексеруі, 5 минутқа дейінгі 6 Speaking жазбасын тексеру, 15 минутқа дейінгі талдауы бар 2 ауызша сұхбат, 2 толық сынақ емтиханы және бір аккаунтқа бір рет деңгейді анықтау тесті. Сынақ емтиханында және деңгейді анықтау тестінде жазылған эссе 12 тексерудің санына кіреді. Пайдаланылмаған тексерулер 30 күннен кейін күшін жояды. Reading және Listening практикасы шектеусіз. Mr EZ: күніне чатта 40 хабарлама және сабақтағы көмекке 60 сұрау.
   - **Correction:**

800. `faq.account.q`
   - **EN:** Do I need an account to read the lessons?
   - **RU:** Нужен ли аккаунт, чтобы читать уроки?
   - **KK:** Сабақтарды оқу үшін аккаунт керек пе?
   - **Correction:**

801. `faq.account.a`
   - **EN:** Yes. Lessons open with a free account, which also keeps your progress and shows it on your other devices. You can read this page without one.
   - **RU:** Да. Уроки открываются с бесплатным аккаунтом, который ещё и сохраняет ваш прогресс и показывает его на других устройствах. Эту страницу можно читать без аккаунта.
   - **KK:** Иә. Сабақтар тегін аккаунтпен ашылады, ол сонымен қатар үлгеріміңізді сақтап, оны басқа құрылғыларыңызда көрсетеді. Бұл бетті аккаунтсыз оқи аласыз.
   - **Correction:**

802. `faq.academic.q`
   - **EN:** Which IELTS is it for?
   - **RU:** Для какого IELTS эта подготовка?
   - **KK:** Бұл қай IELTS-ке арналған?
   - **Correction:**

803. `faq.academic.a`
   - **EN:** Academic IELTS. The lessons, practice and band estimates are built around the Academic test.
   - **RU:** Для Academic IELTS. Уроки, практика и оценка балла построены вокруг формата Academic.
   - **KK:** Academic IELTS-ке. Сабақтар, практика және балл бағалауы Academic форматына негізделген.
   - **Correction:**

804. `faq.official.q`
   - **EN:** Is the AI feedback an official IELTS score?
   - **RU:** Является ли разбор от ИИ официальным баллом IELTS?
   - **KK:** ЖИ талдауы ресми IELTS балы ма?
   - **Correction:**

805. `faq.official.a`
   - **EN:** No. Writing and speaking feedback includes estimated practice bands and suggestions for improvement. Only an official IELTS test can give you an official result.
   - **RU:** Нет. Разбор Writing и Speaking содержит примерные учебные баллы и советы по улучшению. Официальный результат может дать только официальный экзамен IELTS.
   - **KK:** Жоқ. Writing және Speaking талдауында болжамды оқу балдары мен жақсарту бойынша кеңестер бар. Ресми нәтижені тек ресми IELTS емтиханы бере алады.
   - **Correction:**

806. `faq.exam.q`
   - **EN:** Can I practise under exam conditions?
   - **RU:** Можно ли тренироваться в условиях экзамена?
   - **KK:** Емтихан жағдайында жаттығуға бола ма?
   - **Correction:**

807. `faq.exam.a`
   - **EN:** Yes, with practice and guidance: timed Reading and Listening tests, full mock exams, and separate Writing and Speaking assessments. Guided trainers keep teaching help nearby; tests let you practise independently.
   - **RU:** Да, с практикой и сопровождением: тесты Reading и Listening на время, полные пробные экзамены и отдельные проверки Writing и Speaking. В тренажёрах подсказки всегда рядом, а в тестах вы работаете самостоятельно.
   - **KK:** Иә, практика мен сүйемелдеумен: уақыты шектелген Reading және Listening тесттері, толық сынақ емтихандары және Writing пен Speaking бойынша жеке тексерулер. Тренажерлерде кеңестер әрдайым жаныңызда, ал тесттерде өз бетіңізше жұмыс істейсіз.
   - **Correction:**

808. `faq.phone.q`
   - **EN:** Can I use it on my phone?
   - **RU:** Можно ли заниматься с телефона?
   - **KK:** Телефоннан оқуға бола ма?
   - **Correction:**

809. `faq.phone.a`
   - **EN:** Yes. Lessons and practice pages work on a phone. For longer writing tasks, you may find a laptop more comfortable. Speaking practice needs microphone permission.
   - **RU:** Да. Уроки и практика работают на телефоне. Для длинных письменных заданий удобнее ноутбук. Для практики Speaking нужен доступ к микрофону.
   - **KK:** Иә. Сабақтар мен практика телефонда жұмыс істейді. Ұзын жазбаша тапсырмалар үшін ноутбук ыңғайлырақ болуы мүмкін. Speaking практикасы үшін микрофонға рұқсат қажет.
   - **Correction:**

810. `faq.speed.q`
   - **EN:** How quickly will I get feedback?
   - **RU:** Как быстро приходит разбор?
   - **KK:** Талдау қаншалықты тез келеді?
   - **Correction:**

811. `faq.speed.a`
   - **EN:** Exercise checks give you an immediate result. AI writing and recorded speaking assessments process your submission before showing the report, so the wait depends on its length and service availability. You do not need to book a marking session.
   - **RU:** Упражнения проверяются сразу. Проверке Writing и записанного Speaking с помощью ИИ нужно время на обработку до показа отчёта, поэтому ожидание зависит от объёма работы и доступности сервиса. Записываться на проверку не нужно.
   - **KK:** Жаттығулар бірден тексеріледі. ЖИ арқылы Writing пен Speaking жазбасын тексеру есепті көрсетпес бұрын жұмысыңызды өңдейді, сондықтан күту уақыты жұмыстың көлеміне және сервистің қолжетімділігіне байланысты. Тексеруге алдын ала жазылудың қажеті жоқ.
   - **Correction:**

812. `close.note`
   - **EN:** Your next chapter is yours to write.
   - **RU:** Следующую главу пишете вы.
   - **KK:** Келесі тарауды өзіңіз жазасыз.
   - **Correction:**

813. `close.title`
   - **EN:** `Your next chapter.<br />Start with a free lesson.`
   - **RU:** `Ваша следующая глава.<br />Начните с бесплатного урока.`
   - **KK:** `Сіздің келесі тарауыңыз.<br />Тегін сабақтан бастаңыз.`
   - **Correction:**

814. `close.lead`
   - **EN:** `Create a free account and read every lesson.<br />No payment card required.`
   - **RU:** `Создайте бесплатный аккаунт и читайте все уроки.<br />Банковская карта не нужна.`
   - **KK:** `Тегін аккаунт ашып, барлық сабақты оқыңыз.<br />Банк картасы қажет емес.`
   - **Correction:**

815. `close.signIn`
   - **EN:** Already have an account? Sign in.
   - **RU:** Уже есть аккаунт? Войти.
   - **KK:** Аккаунтыңыз бар ма? Кіру.
   - **Correction:**

816. `foot.tagline`
   - **EN:** `A little guidance.<br />A world of possibility.`
   - **RU:** `Немного подсказки.<br />Целый мир возможностей.`
   - **KK:** `Аздаған кеңес.<br />Мүмкіндіктердің тұтас әлемі.`
   - **Correction:**

817. `foot.nav`
   - **EN:** Footer navigation
   - **RU:** Навигация внизу страницы
   - **KK:** Беттің төменгі мәзірі
   - **Correction:**

818. `foot.teach`
   - **EN:** How we teach
   - **RU:** Как мы учим
   - **KK:** Біз қалай оқытамыз
   - **Correction:**

819. `foot.ez`
   - **EN:** Meet Mr EZ
   - **RU:** Знакомьтесь: Mr EZ
   - **KK:** Танысыңыз: Mr EZ
   - **Correction:**

820. `foot.questions`
   - **EN:** Questions
   - **RU:** Вопросы
   - **KK:** Сұрақтар
   - **Correction:**

821. `foot.privacy`
   - **EN:** Privacy
   - **RU:** Конфиденциальность
   - **KK:** Құпиялылық
   - **Correction:**

822. `foot.terms`
   - **EN:** Terms
   - **RU:** Условия
   - **KK:** Шарттар
   - **Correction:**

823. `foot.support`
   - **EN:** Ask a person
   - **RU:** Спросить человека
   - **KK:** Адамнан сұрау
   - **Correction:**

824. `foot.independent`
   - **EN:** Independent preparation. Not affiliated with or endorsed by IELTS.
   - **RU:** Независимая подготовка. Мы не связаны с IELTS и не получали его одобрения.
   - **KK:** Тәуелсіз дайындық. Біз IELTS ұйымымен байланысты емеспіз және IELTS бізді мақұлдамаған.
   - **Correction:**

825. `foot.top`
   - **EN:** Back to top
   - **RU:** Наверх
   - **KK:** Жоғарыға
   - **Correction:**
