/* Kazakh for the public offer and the seller's details (Builder K,
   2 October 2026; docs/legal/BUILD-PLAN-2026-10-02.md): /terms
   (TermsDocument.tsx, both the paid build's public offer and the open
   build's plain terms), the refund line beside the plans
   (PurchaseTerms.tsx), the seller block (src/lib/legal/offer.ts) and the
   workspace footer.

   Written by Claude, to be checked by a native Kazakh speaker before
   launch (docs/legal/KAZAKH-REVIEW.md lists every line next to its English
   and Russian). Words kept the same everywhere in Kazakh:
   "жария оферта" for the public offer, "сатушы" for the seller,
   "практика және сүйемелдеу" for what paying adds, "тексеру" for an AI
   assessment, "ЖИ" (жасанды интеллект) for AI, "сынақ емтиханы" for a mock
   exam, "деңгейді анықтау тесті" for the placement test, "ақшаны қайтару"
   for a refund, "сіз" for the student. IELTS, Mr EZ, Band and the paper
   names stay English; currency is тенге / ₸. No em or en dashes. */
export const strings: Record<string, string> = {
  /* Seller details (src/lib/legal/offer.ts) */
  'Committee for the Protection of Consumer Rights of the Ministry of Trade and Integration of the Republic of Kazakhstan':
    'Қазақстан Республикасы Сауда және интеграция министрлігінің Тұтынушылардың құқықтарын қорғау комитеті',
  'Seller, sole trader': 'Сатушы, жеке кәсіпкер',
  IIN: 'ЖСН',
  Registration: 'Тіркелуі',
  'Registered address': 'Заңды мекенжайы',
  'Centre address': 'Орталықтың мекенжайы',
  Phone: 'Телефон',
  Email: 'Email',
  'Working hours': 'Жұмыс уақыты',

  /* Footer */
  'Site information': 'Сайт туралы ақпарат',
  Help: 'Көмек',
  'Report a problem': 'Ақау туралы хабарлау',
  Terms: 'Шарттар',
  Seller: 'Сатушы',
  Privacy: 'Құпиялылық',

  /* The public offer (paid build) */
  '{amount} KZT': '{amount} теңге',
  'Public offer': 'Жария оферта',
  'The agreement for practice and guidance': 'Практика және сүйемелдеу туралы шарт',
  'This page is a public offer: the seller’s proposal to anyone who wants practice and guidance on IELTS is EZ. Paying for it means you accept everything on this page, so please read it before you buy.':
    'Бұл бет жария оферта болып табылады: сатушының IELTS is EZ сайтында практика мен сүйемелдеу алғысы келетін әр адамға ұсынысы. Оны төлеу арқылы сіз осы беттегі барлық шартты қабылдайсыз, сондықтан сатып алмас бұрын оқып шығыңыз.',
  'Version of {date}': 'Редакция күні: {date}',
  'Buying practice and guidance is not open yet. The terms for it below will apply once it opens.':
    'Практика мен сүйемелдеуді сатып алу әзірге қолжетімсіз. Төмендегі шарттар сатып алу ашылған кезде күшіне енеді.',
  '1. Who sells': '1. Сатушы кім',
  'IELTS is EZ is run and sold by a sole trader registered in Kazakhstan:':
    'IELTS is EZ сайтын Қазақстанда тіркелген жеке кәсіпкер жүргізеді және сатады:',
  'IELTS is EZ is independent preparation. It is not affiliated with or endorsed by IELTS.':
    'IELTS is EZ: тәуелсіз дайындық. Біз IELTS ұйымымен байланысты емеспіз және IELTS бізді мақұлдамаған.',
  'It is private preparation for the IELTS test, not an official or state-recognised course.':
    'Бұл IELTS емтиханына жеке дайындық, ресми немесе мемлекет мойындаған курс емес.',
  '2. What is sold': '2. Не сатылады',
  'Practice and guidance: {days} days of access for {price}, paid once.':
    'Практика және сүйемелдеу: {days} күндік қолжетімділік, бағасы {price}, бір рет төленеді.',
  'Every practice exercise and timed test, with band estimates. Reading and Listening practice has no limit.':
    'Барлық жаттығу мен уақыты шектелген тест, болжамды Band бағасымен. Reading және Listening практикасы шектеусіз.',
  '{essays} essay assessments, {speaking} recorded Speaking assessments (up to 5 minutes each) and {live} live interviews with the AI examiner, with feedback (up to 15 minutes each).':
    'Эссе тексерулері: {essays}. Speaking жазбаларын тексеру, әрқайсысы 5 минутқа дейін: {speaking}. ЖИ емтихан алушысымен талдауы бар ауызша сұхбат, әрқайсысы 15 минутқа дейін: {live}.',
  '{mock} full mock exams, and the placement test once per account. Essays written in a mock exam or the placement test count towards the essay assessments.':
    'Толық сынақ емтихандары: {mock}, сондай-ақ деңгейді анықтау тесті, бір аккаунтқа бір рет. Сынақ емтиханында немесе деңгейді анықтау тестінде жазылған эссе эссе тексерулерінің санына кіреді.',
  'Mr EZ, your personal AI tutor, and the practice in your personal study plan.':
    'Mr EZ, сіздің жеке ЖИ тәлімгеріңіз, және жеке оқу жоспарыңыздағы практика.',
  'Mr EZ answers up to 40 chat messages and 60 lesson-help requests a day.':
    'Mr EZ күніне чаттағы 40 хабарламаға дейін және сабақтағы көмекке арналған 60 сұрауға дейін жауап береді.',
  'Each account has a fair daily safety limit, so the service stays available for everyone. If you reach it, you can carry on the next day.':
    'Қызмет барлығына қолжетімді болуы үшін әр аккаунттың күндік қауіпсіздік шегі бар. Шекке жетсеңіз, келесі күні жалғастыра аласыз.',
  'Unused assessments expire at the end of the {days} days.': 'Пайдаланылмаған тексерулер {days} күн біткенде күшін жояды.',
  '3. What stays free': '3. Не тегін болып қалады',
  'Every lesson is free: the explanations, worked examples, each lesson’s own short quiz and the vocabulary lists.':
    'Барлық сабақ тегін: түсіндірмелер, талданған мысалдар, әр сабақтың қысқа тесті және сөздік тізімдері.',
  'Lessons open once you are signed in to a free account.': 'Сабақтар тегін аккаунтқа кірген соң ашылады.',
  'Creating an account is free and needs no payment card. A free account never turns into a paid one by itself.':
    'Аккаунт ашу тегін, банк картасы қажет емес. Тегін аккаунт ешқашан өздігінен ақылы аккаунтқа айналмайды.',
  '4. How the agreement is made': '4. Шарт қалай жасалады',
  'You accept this offer by paying for practice and guidance on the Plans page. The agreement is made when your payment is confirmed.':
    'Сіз бұл офертаны Тарифтер бетінде практика мен сүйемелдеуді төлеу арқылы қабылдайсыз. Шарт төлеміңіз расталған сәтте жасалады.',
  'Your access starts as soon as the payment is confirmed. If you already have access, the new {days} days start when your current ones end.':
    'Қолжетімділік төлем расталған бойда ашылады. Егер сізде қолжетімділік бар болса, жаңа {days} күн қазіргі мерзім біткенде басталады.',
  'You pay on the payment company’s own page. Your card details never reach this site.':
    'Төлем төлем компаниясының өз бетінде жасалады. Картаңыздың деректері бұл сайтқа ешқашан түспейді.',
  'A receipt for each payment is on your Account page, together with the date your access ends.':
    'Әр төлемнің түбіртегі Аккаунт бетінде тұрады, сол жерде қолжетімділіктің аяқталу күні де көрсетілген.',
  '{days} days of access. It ends on its own. Nothing renews, so you are never charged automatically.':
    '{days} күндік қолжетімділік. Ол өздігінен аяқталады. Ештеңе ұзартылмайды, сондықтан ақша ешқашан автоматты түрде алынбайды.',
  '5. Refunds': '5. Ақшаны қайтару',
  'You can ask for a refund at any time during your {days} days.': 'Ақшаны қайтаруды {days} күн ішінде кез келген уақытта сұрай аласыз.',
  'We pay back the share of the price you have not used. The used share is the larger of two: the days of access that have started, out of {days}, and the AI assessments you have used (essays, recorded Speaking and live interviews), out of the {included} your purchase includes.':
    'Біз бағаның сіз пайдаланбаған үлесін қайтарамыз. Пайдаланылған үлес екеуінің үлкені бойынша есептеледі: {days} күннің ішінде басталған қолжетімділік күндерінің үлесі және сатып алуға кіретін {included} тексерудің ішінде сіз пайдаланған ЖИ тексерулерінің (эссе, Speaking жазбалары және ауызша сұхбаттар) үлесі.',
  'The refund is the price multiplied by the unused share, rounded down to whole tenge.':
    'Қайтарылатын сома бағаны пайдаланылмаған үлеске көбейткенге тең, бүтін теңгеге дейін төмен қарай дөңгелектенеді.',
  'An example': 'Мысал',
  'Day {day} of {days}: {percent}% of the days have started.': '{days} күннің {day}-күні: күндердің {percent}% басталды.',
  '{used} of {included} assessments used: {percent}%.': 'Пайдаланылған тексерулер: {included} ішінен {used}, яғни {percent}%.',
  'The larger share, {percent}%, counts as used.': 'Пайдаланылған деп үлкен үлес саналады: {percent}%.',
  'Refund: {percent}% of {price}, which is {refund}.': 'Қайтарылатын сома: {price} бағасының {percent}%, яғни {refund}.',
  'When the refund is made, your access and any assessments left on it end. Everything you saved stays on your account, and your lessons stay open.':
    'Ақша қайтарылғанда қолжетімділік және одан қалған тексерулер аяқталады. Сақтағаныңыздың бәрі аккаунтыңызда қалады, сабақтар ашық күйінде қалады.',
  'The money goes back to the card or account you paid with, within {n} working days of your request being accepted. Your bank may take a few more days to show it.':
    'Ақша сұрауыңыз қабылданған соң {n} жұмыс күні ішінде төлеген картаңызға немесе шотыңызға қайтарылады. Банкке оны көрсету үшін тағы бірнеше күн қажет болуы мүмкін.',
  'Once your {days} days have ended, there is nothing left to refund.': '{days} күн аяқталған соң қайтаратын ештеңе қалмайды.',
  'How to ask for a refund': 'Ақшаны қайтаруды қалай сұрауға болады',
  'Through the support form:': 'Қолдау формасы арқылы:',
  'ask for a refund': 'ақшаны қайтаруды сұрау',
  'Or by email to the seller:': 'Немесе сатушыға электрондық хат арқылы:',
  'Please give the email address of your account, so we can find your purchase.':
    'Сатып алуыңызды табуымыз үшін аккаунтыңыздың электрондық поштасын көрсетіңіз.',
  '6. Questions and complaints': '6. Сұрақтар мен шағымдар',
  'Write to us through the support form or by email. A person reads every message and replies by email.':
    'Бізге қолдау формасы арқылы немесе электрондық пошта арқылы жазыңыз. Әр хабарламаны адам оқиды және электрондық пошта арқылы жауап береді.',
  'We answer every complaint in writing, with our reasons, within {n} calendar days.':
    'Әр шағымға {n} күнтізбелік күн ішінде себептерін түсіндіре отырып жазбаша жауап береміз.',
  'If you are not satisfied with our answer, you can turn to the consumer protection authority:':
    'Жауабымыз сізді қанағаттандырмаса, тұтынушылардың құқықтарын қорғау жөніндегі уәкілетті органға жүгіне аласыз:',
  'You also have the right to go to court.': 'Сондай-ақ сотқа жүгінуге құқығыңыз бар.',
  '7. Artificial intelligence (AI)': '7. Жасанды интеллект (ЖИ)',
  'The feedback on essays and recorded Speaking, Mr EZ and the live examiner are AI. The live examiner’s voice is an AI voice, not a real person.':
    'Эссе мен Speaking жазбаларының талдауы, Mr EZ және ауызша емтихан алушы жасанды интеллектпен жұмыс істейді. Емтихан алушының дауысы ЖИ дауысы, ол шын адам емес.',
  'AI band scores are estimates against the public IELTS band descriptors. They are not official IELTS results and do not guarantee your test score.':
    'ЖИ қойған Band бағасы IELTS-тің ашық бағалау критерийлеріне сүйенген болжам ғана. Бұл ресми IELTS нәтижесі емес және емтихандағы балыңызға кепілдік бермейді.',
  'If you disagree with an AI result, a person will review it on request.':
    'ЖИ нәтижесімен келіспесеңіз, сұрауыңыз бойынша оны адам қайта қарайды.',
  'Ask for a review': 'Адамның тексеруін сұрау',
  '8. Students under 18': '8. 18 жасқа толмаған оқушылар',
  'If you are under 18, a parent or guardian must agree to the purchase. Please read this page with them before you buy.':
    'Егер сіз 18 жасқа толмаған болсаңыз, сатып алуға ата-анаңыздың немесе қамқоршыңыздың келісімі қажет. Сатып алмас бұрын бұл бетті олармен бірге оқыңыз.',
  'The profile of a student under 18 also asks for a parent or guardian’s details and agreement.':
    '18 жасқа толмаған оқушының профилінде ата-ананың немесе қамқоршының деректері мен келісімі де сұралады.',
  '9. Changes to this offer': '9. Офертаның өзгеруі',
  'The seller may update this offer. The version date at the top of this page shows which version is in force.':
    'Сатушы бұл офертаны жаңарта алады. Беттің басындағы редакция күні қай редакцияның күшінде екенін көрсетеді.',
  'A purchase follows the version in force on the day you paid. A change never raises the price of a purchase already made and never takes away what it includes.':
    'Сатып алу төлем жасалған күні күшінде болған редакция бойынша жүреді. Өзгеріс бұрын жасалған сатып алудың бағасын ешқашан көтермейді және оған кіретін нәрсені алып тастамайды.',
  '10. When your access ends': '10. Қолжетімділік аяқталғанда',
  'Everything you saved stays on your account: your results, essays, progress and study plan.':
    'Сақтағаныңыздың бәрі аккаунтыңызда қалады: нәтижелеріңіз, эсселеріңіз, үлгерімдеріңіз және оқу жоспарыңыз.',
  'Your lessons stay open with your free account. Practice, tests, AI feedback and Mr EZ need practice and guidance again.':
    'Сабақтар тегін аккаунтыңызда ашық күйінде қалады. Практика, тесттер, ЖИ талдауы және Mr EZ үшін қайтадан практика мен сүйемелдеу қажет болады.',
  'How we handle your information': 'Деректеріңізбен қалай жұмыс істейміз',
  'How the platform works': 'Платформа қалай жұмыс істейді',

  /* The plain terms (open build) */
  'Terms of use': 'Пайдалану шарттары',
  'The terms, in plain words': 'Шарттар қарапайым тілмен',
  'What a free account includes, what practice and guidance add, and what happens when your access ends.':
    'Тегін аккаунтқа не кіреді, практика мен сүйемелдеу не қосады және қолжетімділік аяқталғанда не болады.',
  'Updated 2 October 2026': 'Жаңартылған күні: 2026 жылғы 2 қазан',
  'Your free account': 'Сіздің тегін аккаунтыңыз',
  'Practice and guidance': 'Практика және сүйемелдеу',
  'Practice and guidance cost {price} for 30 days, paid once.': 'Практика мен сүйемелдеудің 30 күндік бағасы {price}, бір рет төленеді.',
  'They add every practice exercise and timed test with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan.':
    'Оларға болжамды Band бағасы бар барлық жаттығу мен уақыты шектелген тест, эссе мен Speaking жазбаларына ЖИ талдауы, ЖИ емтихан алушысымен ауызша сұхбаттар, толық сынақ емтихандары, деңгейді анықтау тесті, Mr EZ және жеке оқу жоспарыңыздағы практика кіреді.',
  '30 days of access. It ends on its own. Nothing renews, so you are never charged automatically.':
    '30 күндік қолжетімділік. Ол өздігінен аяқталады. Ештеңе ұзартылмайды, сондықтан ақша ешқашан автоматты түрде алынбайды.',
  'If you buy again while your access is running, the new 30 days start when the current ones end.':
    'Қолжетімділік әлі жұмыс істеп тұрғанда қайта сатып алсаңыз, жаңа 30 күн қазіргі мерзім біткенде басталады.',
  'You can ask for a refund at any time during the 30 days. We pay back the share you have not used.':
    '30 күн ішінде кез келген уақытта ақшаны қайтаруды сұрай аласыз. Біз сіз пайдаланбаған үлесті қайтарамыз.',
  'What 30 days include': '30 күнге не кіреді',
  '12 essay assessments, 6 recorded Speaking assessments (up to 5 minutes each), 2 live interviews with feedback (up to 15 minutes each) and 2 full mock exams.':
    '12 эссе тексеруі, 6 Speaking жазбасын тексеру (әрқайсысы 5 минутқа дейін), талдауы бар 2 ауызша сұхбат (әрқайсысы 15 минутқа дейін) және 2 толық сынақ емтиханы.',
  'The placement test, once per account. Essays written in a mock exam or the placement test count towards the 12 essay assessments.':
    'Деңгейді анықтау тесті, бір аккаунтқа бір рет. Сынақ емтиханында немесе деңгейді анықтау тестінде жазылған эссе 12 эссе тексеруінің санына кіреді.',
  'Unused assessments expire at the end of the 30 days. Reading and Listening practice has no limit.':
    'Пайдаланылмаған тексерулер 30 күн біткенде күшін жояды. Reading және Listening практикасы шектеусіз.',
  'AI feedback is an estimate against the public IELTS band descriptors. It is not an official IELTS result.':
    'ЖИ талдауы IELTS-тің ашық бағалау критерийлеріне сүйенген болжам. Бұл ресми IELTS нәтижесі емес.',
  'When your access ends': 'Қолжетімділік аяқталғанда',
  'About IELTS is EZ': 'IELTS is EZ туралы',
  'IELTS is EZ is run by {name}.': 'IELTS is EZ сайтын {name} жүргізеді.',
  Questions: 'Сұрақтар',
  'If anything here is unclear, ask a person through the support form. A person reads every message and replies by email.':
    'Бірдеңе түсініксіз болса, қолдау формасы арқылы адамнан сұраңыз. Әр хабарламаны адам оқиды және электрондық пошта арқылы жауап береді.',

  /* Beside the plans (PurchaseTerms.tsx) */
  'Before you buy': 'Сатып алмас бұрын',
  'How refunds work': 'Ақша қалай қайтарылады',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
