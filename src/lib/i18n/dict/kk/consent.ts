/* Kazakh for consent and the student's rights (Builder K, 2 October 2026):
   the consent at sign-up and its full wording (src/lib/legal/consent.ts,
   ConsentCheck.tsx), the parent's declaration, Account > Profile's
   "Download my data" and "Delete account" rows (AccountSettings.tsx), the
   file "Download my data" writes (src/lib/legal/export.ts), the
   account-deleted page, the AI labels (AiEstimateNote.tsx, Mr EZ's panel,
   the live examiner) and the support form's refund and AI-review reasons.

   The menu names follow the account screens: «Аккаунт», «Профиль»,
   «Аккаунтты жою». The consent sentence is written in the first person,
   as the Russian is, and Kazakh needs no gendered forms ("келісемін").
   To be checked by a native speaker (docs/legal/KAZAKH-REVIEW.md). */
export const strings: Record<string, string> = {
  /* Consent at sign-up */
  'I agree to my personal data being processed as described here, including its transfer to services outside Kazakhstan.':
    'Дербес деректерімнің осында сипатталғандай өңделуіне, соның ішінде Қазақстаннан тыс жердегі сервистерге берілуіне келісемін.',
  'Read what this covers': 'Келісімге не кіреді',
  'Consent version {version}.': 'Келісім редакциясы: {version}.',
  'The privacy notice explains all of this in full.': 'Мұның бәрі құпиялылық саясатында толық сипатталған.',
  'Please tick the box to agree before creating your account.': 'Аккаунт ашу үшін келісім белгісін қойыңыз.',
  'Please tick the box to agree before you continue.': 'Жалғастыру үшін келісім белгісін қойыңыз.',

  /* The full wording */
  'Who processes your data': 'Деректеріңізді кім өңдейді',
  'Your data is processed by {name} (IIN {iin}), who runs IELTS is EZ.':
    'Деректеріңізді IELTS is EZ иесі {name} (ЖСН {iin}) өңдейді.',
  'Your data is processed by {name}, who runs IELTS is EZ.': 'Деректеріңізді IELTS is EZ иесі {name} өңдейді.',
  'Your data is processed by the person who runs IELTS is EZ.': 'Деректеріңізді IELTS is EZ иесі өңдейді.',
  'What data': 'Қандай деректер',
  'Your email address, and your name if you sign in with Google.':
    'Электрондық поштаңыздың мекенжайы, ал Google арқылы кірсеңіз, атыңыз да.',
  'Your profile: first and last name, date of birth, phone, city, school, university or job, and how you found us. For a student under 18, a parent or guardian’s name and phone.':
    'Профиліңіз: аты-жөніңіз, туған күніңіз, телефоныңыз, қалаңыз, мектебіңіз, жоғары оқу орныңыз немесе жұмысыңыз және бізді қалай тапқаныңыз. 18 жасқа толмаған оқушы үшін ата-анасының немесе қамқоршысының аты мен телефоны да.',
  'Your study: lessons completed, answers, test results, your study plan, saved words and notes.':
    'Оқуыңыз: аяқталған сабақтар, жауаптар, тест нәтижелері, оқу жоспарыңыз, сақталған сөздер мен жазбалар.',
  'The essays you send for AI feedback, and the feedback. Speaking recordings are sent for marking, and only the results are kept.':
    'ЖИ талдауына жіберетін эсселеріңіз және олардың талдауы. Speaking жазбалары бағалауға жіберіледі, тек нәтижелері сақталады.',
  'Your conversations with Mr EZ, and the messages you send us.': 'Mr EZ-пен әңгімелеріңіз және бізге жіберетін хабарламаларыңыз.',
  'If you buy access: the plan, the amount, the date, the payment status and the receipt number. Card details go to the payment company, never to us.':
    'Қолжетімділікті сатып алсаңыз: тариф, сома, күні, төлем күйі және түбіртек нөмірі. Карта деректерін бізге емес, төлем компаниясы алады.',
  Why: 'Не үшін',
  'To run your account and keep your work on every device.': 'Аккаунтыңызды жүргізу және жұмысыңызды барлық құрылғыда сақтау үшін.',
  'To give you the course, mark your essays and Speaking with AI, and run Mr EZ and the live examiner.':
    'Сізге курсты ұсыну, эссеңіз бен Speaking жауабыңызды ЖИ көмегімен бағалау, сондай-ақ Mr EZ пен ауызша емтихан алушының жұмысы үшін.',
  'To answer your messages and contact you about your studies or your account.':
    'Хабарламаларыңызға жауап беру және оқуыңызға немесе аккаунтыңызға қатысты сізбен байланысу үшін.',
  'To keep the site secure and prevent misuse.': 'Сайтты қорғау және теріс пайдалануға жол бермеу үшін.',
  'To sell access and keep the sales records the law requires.': 'Қолжетімділікті сату және заң талап ететін сату жазбаларын сақтау үшін.',
  'Who else receives it, and where': 'Деректерді тағы кім алады және қай жерде',
  'Supabase stores your account and your data (servers in the European Union or the United States).':
    'Supabase аккаунтыңыз бен деректеріңізді сақтайды (серверлері Еуропалық одақта немесе АҚШ-та).',
  'OpenAI marks essays and Speaking and runs Mr EZ and the live examiner (United States).':
    'OpenAI эссе мен Speaking жауаптарын бағалайды және Mr EZ пен ауызша емтихан алушының жұмысын қамтамасыз етеді (АҚШ).',
  'Cloudflare runs the site’s background services and its security check (servers around the world).':
    'Cloudflare сайттың фондық сервистері мен қауіпсіздік тексерісін қамтамасыз етеді (серверлері бүкіл әлемде).',
  'GitHub Pages delivers the site’s pages to your browser (United States).': 'GitHub Pages сайттың беттерін браузеріңізге жеткізеді (АҚШ).',
  'The payment company handles payments (Kazakhstan).': 'Төлем компаниясы төлемдерді жүргізеді (Қазақстан).',
  'So your data is transferred outside Kazakhstan, and by agreeing you consent to that transfer.':
    'Яғни деректеріңіз Қазақстаннан тыс жерге беріледі, ал келісім бере отырып, сіз осы беруге келісесіз.',
  'Nothing about you is made public.': 'Сіз туралы ешқандай мәлімет жария етілмейді.',
  'How long your consent lasts': 'Келісім қанша уақыт әрекет етеді',
  'While your account is open: until you withdraw it or delete your account.':
    'Аккаунтыңыз ашық тұрғанша: келісімді кері қайтарып алғанша немесе аккаунтты жойғанша.',
  'How to withdraw it': 'Келісімді қалай кері қайтарып алуға болады',
  'You can withdraw your consent at any time by deleting your account: Account, then Profile, then Delete account. Everything is removed at once.':
    'Келісіміңізді кез келген уақытта аккаунтты жою арқылы кері қайтарып ала аласыз: «Аккаунт», содан кейін «Профиль», содан кейін «Аккаунтты жою». Бәрі бірден жойылады.',
  'You can also ask us to do it through the support form.': 'Мұны қолдау формасы арқылы бізден сұрай аласыз.',
  'You can withdraw your consent at any time by asking us, through the support form, to close your account.':
    'Қолдау формасы арқылы аккаунтыңызды жабуды бізден сұрап, келісіміңізді кез келген уақытта кері қайтарып ала аласыз.',
  'You can withdraw your consent at any time by asking us to close your account.':
    'Аккаунтыңызды жабуды бізден сұрап, келісіміңізді кез келген уақытта кері қайтарып ала аласыз.',
  'The site cannot keep an account without this data, so withdrawing consent closes the account.':
    'Бұл деректерсіз сайт аккаунтты жүргізе алмайды, сондықтан келісімді кері қайтарып алу аккаунтты жабады.',
  'A record of each payment is kept without your name or email for 5 years, because tax law requires sales records.':
    'Әр төлемнің жазбасы атыңыз бен электрондық поштаңызсыз 5 жыл сақталады, себебі салық заңы сату жазбаларын сақтауды талап етеді.',

  /* The parent or guardian's declaration (profile form, under 18) */
  'My parent or guardian agrees to me using this site, to my personal data being processed as the privacy notice describes, and to any purchase of access I make.':
    'Ата-анам немесе қамқоршым менің осы сайтты пайдалануыма, дербес деректерімнің құпиялылық саясатында сипатталғандай өңделуіне және менің кез келген қолжетімділік сатып алуыма келіседі.',
  'My parent or guardian agrees to me using this site and to my personal data being processed as the privacy notice describes.':
    'Ата-анам немесе қамқоршым менің осы сайтты пайдалануыма және дербес деректерімнің құпиялылық саясатында сипатталғандай өңделуіне келіседі.',

  /* AI labels and a person's review */
  'Marked by AI. This band is an AI estimate, not an official IELTS score.':
    'ЖИ бағалады. Бұл Band бағасы ЖИ болжамы, ресми IELTS балы емес.',
  'Ask a person to review it': 'Адамның тексеруін сұрау',
  '{name} is an AI voice, not a real person. Your interview is marked by AI.':
    '{name}: ЖИ дауысы, шын адам емес. Сұхбатыңызды ЖИ бағалайды.',
  'Mr EZ is an AI tutor, not a real person.': 'Mr EZ: ЖИ тәлімгері, шын адам емес.',

  /* The two support reasons (SupportForm.tsx) */
  'You came here to ask for a refund. Tell us which purchase it is for, and a person will answer by email.':
    'Сіз ақшаны қайтаруды сұрау үшін келдіңіз. Қай сатып алу туралы екенін жазыңыз, адам сізге электрондық пошта арқылы жауап береді.',
  'You came here to ask a person to review an AI-marked result. Tell us which essay or Speaking result it is and what you would like checked.':
    'Сіз ЖИ қойған нәтижені адамның қайта қарауын сұрау үшін келдіңіз. Қай эссе немесе Speaking нәтижесі туралы екенін және нені тексеру керек екенін жазыңыз.',

  /* Account > Profile: Download my data */
  'Your data': 'Деректеріңіз',
  'Download a copy of everything your account holds, as one file.': 'Аккаунтыңызда сақталғанның бәрінің көшірмесін бір файл етіп жүктеп алыңыз.',
  'Download my data': 'Деректерімді жүктеп алу',
  'Preparing…': 'Дайындалуда…',
  'Your file is downloading.': 'Файл жүктелуде.',
  'Your file is downloading, but some parts could not be read just now. Try again later for a complete copy.':
    'Файл жүктелуде, бірақ кейбір бөліктерін қазір оқу мүмкін болмады. Толық көшірме алу үшін кейінірек қайталап көріңіз.',
  'Your data could not be read just now. Please try again.': 'Деректеріңізді қазір оқу мүмкін болмады. Қайталап көріңіз.',

  /* Account > Profile: Delete account */
  'Delete account': 'Аккаунтты жою',
  'Removes your account and all your data at once. This cannot be undone.':
    'Аккаунтыңыз бен барлық деректеріңізді бірден жояды. Мұны кері қайтару мүмкін емес.',
  'Delete my account': 'Аккаунтымды жою',
  'Deleting your account removes, immediately and for good: your details, your progress and results, your essays and speaking feedback, your saved items and notes, your study plan, your conversations with Mr EZ and your messages to us. Any access you have paid for ends.':
    'Аккаунтты жою мыналарды бірден және біржола өшіреді: деректеріңіз, үлгеріміңіз бен нәтижелеріңіз, эсселеріңіз бен Speaking талдаулары, сақталған материалдар мен жазбалар, оқу жоспарыңыз, Mr EZ-пен әңгімелеріңіз және бізге жазған хабарламаларыңыз. Төленген қолжетімділік тоқтатылады.',
  'Only a record of each payment is kept, without your name or email, because the law requires sales records to be kept.':
    'Заң сату жазбаларын сақтауды талап ететіндіктен, тек әр төлемнің жазбасы атыңыз бен электрондық поштаңызсыз сақталады.',
  'I understand that my account and all my data will be deleted and cannot be recovered.':
    'Аккаунтым мен барлық деректерімнің жойылатынын және оларды қалпына келтіру мүмкін емес екенін түсінемін.',
  'Deleting…': 'Жойылуда…',
  'Delete my account and all my data': 'Аккаунтым мен барлық деректерімді жою',
  Cancel: 'Бас тарту',

  /* The account-deleted page */
  'Your account has been deleted': 'Аккаунтыңыз жойылды',
  'Your account and all your data have been removed. Thank you for studying with us.':
    'Аккаунтыңыз бен барлық деректеріңіз жойылды. Бізбен бірге оқығаныңызға рахмет.',
  'You can create a new account at any time. It will start empty.': 'Кез келген уақытта жаңа аккаунт аша аласыз. Ол бос күйде басталады.',
  'Back to the home page': 'Басты бетке оралу',

  /* Inside the downloaded file (src/lib/legal/export.ts) */
  'Everything your IELTS is EZ account holds, and what this browser keeps for you, as read when you downloaded this file.':
    'IELTS is EZ аккаунтыңызда сақталғанның бәрі және осы браузердің сіз үшін сақтайтыны, файлды жүктеп алған сәттегі күйі.',
  'Your details from the profile form.': 'Профильдегі деректеріңіз.',
  'Your saved progress and study plan.': 'Сақталған үлгеріміңіз бен оқу жоспарыңыз.',
  'A record of what you studied and when.': 'Нені және қашан оқығаныңыз туралы жазба.',
  'Your personal study plan.': 'Жеке оқу жоспарыңыз.',
  'Your saved words, notes and study preferences.': 'Сақталған сөздеріңіз, жазбаларыңыз және оқу баптауларыңыз.',
  'Your conversations with Mr EZ.': 'Mr EZ-пен әңгімелеріңіз.',
  'The messages in those conversations.': 'Сол әңгімелердегі хабарламалар.',
  'The latest next step Mr EZ suggested.': 'Mr EZ ұсынған соңғы келесі қадам.',
  'Weekly reviews and unit notes from Mr EZ.': 'Mr EZ-тің апталық шолулары мен бөлімдерге жазбалары.',
  'Your trial, if you had one.': 'Сынақ мерзіміңіз, егер ол болса.',
  'What you used during the trial.': 'Сынақ мерзімінде не пайдаланғаныңыз.',
  'Each AI assessment counted against your access.': 'Қолжетімділігіңізден есептелген әр ЖИ тексеруі.',
  'Your periods of access.': 'Қолжетімділік мерзімдеріңіз.',
  'Your purchases and receipts.': 'Сатып алуларыңыз бен түбіртектеріңіз.',
  'The messages you sent us through the support form.': 'Қолдау формасы арқылы бізге жіберген хабарламаларыңыз.',
  'A usage record for each Mr EZ reply (the AI model, its size and cost), used for spending limits.':
    'Mr EZ-тің әр жауабы бойынша пайдалану жазбасы (ЖИ моделі, көлемі және құны), шығын шектеулері үшін қажет.',
  'When each live Speaking interview started and ended, used for the daily limits. Your voice is never stored.':
    'Speaking бойынша әр ауызша сұхбаттың қашан басталып, қашан аяқталғаны, күндік шектеулер үшін қажет. Дауысыңыз ешқашан сақталмайды.',
  'The AI service’s usage figures for each assessment. Never your essay, your audio or the reply.':
    'Әр тексеру бойынша ЖИ сервисінің пайдалану көрсеткіштері. Эссеңіз, жазбаңыз немесе жауап ешқашан сақталмайды.',
  'Kept for spending limits and not readable from your browser. Ask us for a copy if you need it.':
    'Шығын шектеулері үшін сақталады және браузеріңізден оқылмайды. Көшірме қажет болса, бізге жазыңыз.',
  'Kept only on this device. Other devices may hold different items.': 'Тек осы құрылғыда сақталады. Басқа құрылғыларда басқа нәрселер сақталуы мүмкін.',
};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
