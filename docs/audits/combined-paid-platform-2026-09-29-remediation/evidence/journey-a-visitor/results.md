# journey-a-visitor

Base http://localhost:4441/ielts-website, stand-in http://127.0.0.1:8841

**139 of 139 checks passed**

| Combo | Result | Check | Detail |
|---|---|---|---|
| en-1440 | PASS | sales page opens in English for an English device with nothing stored | en |
| en-1440 | PASS | RU switch: page Russian and choice stored | ru ru |
| en-1440 | PASS | EN switch back: page English and choice stored | en en |
| en-1440 | PASS | sales page: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| en-1440 | PASS | questionnaire: plan generated in the chosen language | YOUR SUGGESTED STARTING PLAN  Your Band 7.0 goal. Your first 3 days.  Start with reading, the section you want most help with. Set aside 15 minutes each day. Le |
| en-1440 | PASS | questionnaire: plan has three days | YOUR SUGGESTED STARTING PLAN  Your Band 7.0 goal. Your first 3 days.  Start with reading, the section you want most help with. Set aside 15 minutes each day. Learn one method, practise it, then try a  |
| en-1440 | PASS | questionnaire: trial link carries the answers | /ielts-website/trial?journey=1&band=7&skill=reading&focus=method&time=15 |
| en-1440 | PASS | pricing: 10,000 and 25,000 KZT shown in local format | Your first 3 days. On us.  Get to know your study space before you pay. Sign up to start. No payment card required.  One place to prepare.  Three days to try your study space: one lesson and one test  |
| en-1440 | NOTE | NOTE pricing button 'Choose one month' as a visitor -> url ; status line: 'Paid access lasts one or three months and then simply ends: it never renews automatically. There are no refunds after purchase, so the free three-day trial is y' |  |
| en-1440 | PASS | pricing button leads somewhere sensible (sign-up/trial/plans or an explained status) |  |
| en-1440 | PASS | language still the chosen one after pricing | en |
| en-1440 | PASS | FAQ: trial wording says Speaking Part 1 (not 'full test in each section') | BEFORE YOUR FIRST STEP  A few things you might wonder. How does the 3-day free trial work? +  Sign up to try Academic IELTS preparation for three days. No payment card is required. Your trial includes |
| en-1440 | PASS | footer: Privacy, Terms and Ask a person links present | {'privacy': '/ielts-website/privacy', 'terms': '/ielts-website/terms', 'support': '/ielts-website/support?reason=footer'} |
| en-1440 | PASS | footer privacy: opens (HTTP 200), heading 'How your information is used', language kept | en |
| en-1440 | PASS | footer privacy: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| en-1440 | PASS | footer terms: opens (HTTP 200), heading 'The terms, in plain words', language kept | en |
| en-1440 | PASS | footer terms: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| en-1440 | PASS | footer support: opens (HTTP 200), heading 'Ask a person', language kept | en |
| en-1440 | PASS | footer support: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| en-1440 | PASS | Ask a person: a form a signed-out visitor can use (message box and email) |  |
| en-1440 | PASS | start trial: /trial opens in the chosen language | /trial en |
| en-1440 | PASS | trial offer states Academic IELTS and Speaking Part 1 before sign-up |  |
| en-1440 | PASS | sign-up: opened from the trial, language kept | /sign-up en |
| en-1440 | PASS | sign-up: explains what is asked next and links to privacy | Next, we ask for a few details about you, such as your name, date of birth and phone number. Only you and the person who |
| en-1440 | PASS | sign-up: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| en-1440 | PASS | profile: required profile follows sign-up, language kept | /profile en |
| en-1440 | PASS | profile: explanation visible (why, who sees it, link to privacy) | Only you and the person who runs the site can see these details. Why we ask for each one |
| en-1440 | PASS | profile: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| en-1440 | PASS | profile: saved |  |
| en-1440 | PASS | Before you begin: back on /trial with the Start button, language kept | /trial en Start my 3-day trial |
| en-1440 | PASS | Before you begin: the clock starts only on Start (said on the page) | IELTS is EZ Today Course Practice Tests Vocabulary EN RU SS Skip to content Before you begin  Your three days start when |
| en-1440 | PASS | no trial yet before pressing Start | None |
| en-1440 | PASS | Start: trial begins on the server and Today opens in the chosen language | /dashboard en {'user_id': 'e8790a1f-0b00-4fa9-926a-a24d1fb269a0', 'started_at': '2026-09-29T19:35:12.773Z', 'ends_at': '2026-10-02T19:35:12.773Z', 'questionnaire': {'band': ' |
| en-1440 | PASS | questionnaire answers kept with the trial | {'band': '7', 'time': '15', 'focus': 'method', 'skill': 'reading'} |
| en-1440 | PASS | language stored throughout | en |
| en-1440 | PASS | Today: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| ru-1440 | PASS | sales page opens in English for an English device with nothing stored | en |
| ru-1440 | PASS | RU switch: page Russian and choice stored | ru ru |
| ru-1440 | PASS | sales page: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| ru-1440 | PASS | questionnaire: plan generated in the chosen language | ПРЕДЛОЖЕННЫЙ ПЛАН НА СТАРТ  Ваша цель: балл 7.0. Ваши первые 3 дня.  Начните с Reading: здесь вам больше всего нужна помощь. Уделяйте занятиям 15 минут в день.  |
| ru-1440 | PASS | questionnaire: plan has three days | ПРЕДЛОЖЕННЫЙ ПЛАН НА СТАРТ  Ваша цель: балл 7.0. Ваши первые 3 дня.  Начните с Reading: здесь вам больше всего нужна помощь. Уделяйте занятиям 15 минут в день. Изучите один метод, отработайте его, зат |
| ru-1440 | PASS | questionnaire: trial link carries the answers | /ielts-website/trial?journey=1&band=7&skill=reading&focus=method&time=15 |
| ru-1440 | PASS | pricing: 10,000 and 25,000 KZT shown in local format | Первые 3 дня за наш счёт.  Познакомьтесь с учебным пространством до оплаты. Чтобы начать, зарегистрируйтесь. Банковская карта не нужна.  Всё для подготовки в одном месте.  Три дня, чтобы попробовать у |
| ru-1440 | NOTE | NOTE pricing button 'Выбрать один месяц' as a visitor -> url ; status line: 'Платный доступ действует один или три месяца и просто заканчивается: автоматического продления нет. После покупки деньги не возвращаются, поэтому бесплатные три' |  |
| ru-1440 | PASS | pricing button leads somewhere sensible (sign-up/trial/plans or an explained status) |  |
| ru-1440 | PASS | language still the chosen one after pricing | ru |
| ru-1440 | PASS | FAQ: trial wording says Speaking Part 1 (not 'full test in each section') | ПЕРЕД ПЕРВЫМ ШАГОМ  Несколько вопросов, которые могут возникнуть. Как работает бесплатный пробный период на 3 дня? +  Зарегистрируйтесь и готовьтесь к Academic IELTS три дня бесплатно. Банковская карт |
| ru-1440 | PASS | footer: Privacy, Terms and Ask a person links present | {'privacy': '/ielts-website/privacy', 'terms': '/ielts-website/terms', 'support': '/ielts-website/support?reason=footer'} |
| ru-1440 | PASS | footer privacy: opens (HTTP 200), heading 'Как используются ваши данные', language kept | ru |
| ru-1440 | PASS | footer privacy: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| ru-1440 | PASS | footer terms: opens (HTTP 200), heading 'Условия простыми словами', language kept | ru |
| ru-1440 | PASS | footer terms: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| ru-1440 | PASS | footer support: opens (HTTP 200), heading 'Спросить человека', language kept | ru |
| ru-1440 | PASS | footer support: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| ru-1440 | PASS | Ask a person: a form a signed-out visitor can use (message box and email) |  |
| ru-1440 | PASS | start trial: /trial opens in the chosen language | /trial ru |
| ru-1440 | PASS | trial offer states Academic IELTS and Speaking Part 1 before sign-up |  |
| ru-1440 | PASS | sign-up: opened from the trial, language kept | /sign-up ru |
| ru-1440 | PASS | sign-up: explains what is asked next and links to privacy | Дальше мы попросим несколько данных о вас: имя, дату рождения и номер телефона. Их видите только вы и тот, кто ведёт сай |
| ru-1440 | PASS | sign-up: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| ru-1440 | PASS | profile: required profile follows sign-up, language kept | /profile ru |
| ru-1440 | PASS | profile: explanation visible (why, who sees it, link to privacy) | Эти данные видите только вы и тот, кто ведёт сайт. Зачем нужен каждый пункт |
| ru-1440 | PASS | profile: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| ru-1440 | PASS | profile: saved |  |
| ru-1440 | PASS | Before you begin: back on /trial with the Start button, language kept | /trial ru Начать 3 дня бесплатно |
| ru-1440 | PASS | Before you begin: the clock starts only on Start (said on the page) | IELTS is EZ Сегодня Курс Практика Тесты Словарь EN RU SS Перейти к содержимому Перед началом  Три дня начнутся, когда вы |
| ru-1440 | PASS | no trial yet before pressing Start | None |
| ru-1440 | PASS | Start: trial begins on the server and Today opens in the chosen language | /dashboard ru {'user_id': 'eb9c74fd-b8e6-492e-9cdf-64e26d16a375', 'started_at': '2026-09-29T19:36:15.669Z', 'ends_at': '2026-10-02T19:36:15.669Z', 'questionnaire': {'band': ' |
| ru-1440 | PASS | questionnaire answers kept with the trial | {'band': '7', 'time': '15', 'focus': 'method', 'skill': 'reading'} |
| ru-1440 | PASS | language stored throughout | ru |
| ru-1440 | PASS | Today: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| en-390 | PASS | sales page opens in English for an English device with nothing stored | en |
| en-390 | PASS | RU switch: page Russian and choice stored | ru ru |
| en-390 | PASS | EN switch back: page English and choice stored | en en |
| en-390 | PASS | sales page: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| en-390 | PASS | questionnaire: plan generated in the chosen language | YOUR SUGGESTED STARTING PLAN  Your Band 7.0 goal. Your first 3 days.  Start with reading, the section you want most help with. Set aside 15 minutes each day. Le |
| en-390 | PASS | questionnaire: plan has three days | YOUR SUGGESTED STARTING PLAN  Your Band 7.0 goal. Your first 3 days.  Start with reading, the section you want most help with. Set aside 15 minutes each day. Learn one method, practise it, then try a  |
| en-390 | PASS | questionnaire: trial link carries the answers | /ielts-website/trial?journey=1&band=7&skill=reading&focus=method&time=15 |
| en-390 | PASS | pricing: 10,000 and 25,000 KZT shown in local format | Your first 3 days. On us.  Get to know your study space before you pay. Sign up to start. No payment card required.  One place to prepare.  Three days to try your study space: one lesson and one test  |
| en-390 | NOTE | NOTE pricing button 'Choose one month' as a visitor -> url ; status line: 'Paid access lasts one or three months and then simply ends: it never renews automatically. There are no refunds after purchase, so the free three-day trial is y' |  |
| en-390 | PASS | pricing button leads somewhere sensible (sign-up/trial/plans or an explained status) |  |
| en-390 | PASS | language still the chosen one after pricing | en |
| en-390 | PASS | FAQ: trial wording says Speaking Part 1 (not 'full test in each section') | BEFORE YOUR FIRST STEP  A few things you might wonder. How does the 3-day free trial work? +  Sign up to try Academic IELTS preparation for three days. No payment card is required. Your trial includes |
| en-390 | PASS | footer: Privacy, Terms and Ask a person links present | {'privacy': '/ielts-website/privacy', 'terms': '/ielts-website/terms', 'support': '/ielts-website/support?reason=footer'} |
| en-390 | PASS | footer privacy: opens (HTTP 200), heading 'How your information is used', language kept | en |
| en-390 | PASS | footer privacy: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| en-390 | PASS | footer terms: opens (HTTP 200), heading 'The terms, in plain words', language kept | en |
| en-390 | PASS | footer terms: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| en-390 | PASS | footer support: opens (HTTP 200), heading 'Ask a person', language kept | en |
| en-390 | PASS | footer support: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| en-390 | PASS | Ask a person: a form a signed-out visitor can use (message box and email) |  |
| en-390 | PASS | start trial: /trial opens in the chosen language | /trial en |
| en-390 | PASS | trial offer states Academic IELTS and Speaking Part 1 before sign-up |  |
| en-390 | PASS | sign-up: opened from the trial, language kept | /sign-up en |
| en-390 | PASS | sign-up: explains what is asked next and links to privacy | Next, we ask for a few details about you, such as your name, date of birth and phone number. Only you and the person who |
| en-390 | PASS | sign-up: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| en-390 | PASS | profile: required profile follows sign-up, language kept | /profile en |
| en-390 | PASS | profile: explanation visible (why, who sees it, link to privacy) | Only you and the person who runs the site can see these details. Why we ask for each one |
| en-390 | PASS | profile: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| en-390 | PASS | profile: saved |  |
| en-390 | PASS | Before you begin: back on /trial with the Start button, language kept | /trial en Start my 3-day trial |
| en-390 | PASS | Before you begin: the clock starts only on Start (said on the page) | IELTS is EZ EN RU SS Today Course Practice Tests Vocabulary Skip to content Before you begin  Your three days start when |
| en-390 | PASS | no trial yet before pressing Start | None |
| en-390 | PASS | Start: trial begins on the server and Today opens in the chosen language | /dashboard en {'user_id': '87d42884-f748-4f2e-a6ed-311df79de707', 'started_at': '2026-09-29T19:37:13.586Z', 'ends_at': '2026-10-02T19:37:13.586Z', 'questionnaire': {'band': ' |
| en-390 | PASS | questionnaire answers kept with the trial | {'band': '7', 'time': '15', 'focus': 'method', 'skill': 'reading'} |
| en-390 | PASS | language stored throughout | en |
| en-390 | PASS | Today: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| ru-390 | PASS | sales page opens in English for an English device with nothing stored | en |
| ru-390 | PASS | RU switch: page Russian and choice stored | ru ru |
| ru-390 | PASS | sales page: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| ru-390 | PASS | questionnaire: plan generated in the chosen language | ПРЕДЛОЖЕННЫЙ ПЛАН НА СТАРТ  Ваша цель: балл 7.0. Ваши первые 3 дня.  Начните с Reading: здесь вам больше всего нужна помощь. Уделяйте занятиям 15 минут в день.  |
| ru-390 | PASS | questionnaire: plan has three days | ПРЕДЛОЖЕННЫЙ ПЛАН НА СТАРТ  Ваша цель: балл 7.0. Ваши первые 3 дня.  Начните с Reading: здесь вам больше всего нужна помощь. Уделяйте занятиям 15 минут в день. Изучите один метод, отработайте его, зат |
| ru-390 | PASS | questionnaire: trial link carries the answers | /ielts-website/trial?journey=1&band=7&skill=reading&focus=method&time=15 |
| ru-390 | PASS | pricing: 10,000 and 25,000 KZT shown in local format | Первые 3 дня за наш счёт.  Познакомьтесь с учебным пространством до оплаты. Чтобы начать, зарегистрируйтесь. Банковская карта не нужна.  Всё для подготовки в одном месте.  Три дня, чтобы попробовать у |
| ru-390 | NOTE | NOTE pricing button 'Выбрать один месяц' as a visitor -> url ; status line: 'Платный доступ действует один или три месяца и просто заканчивается: автоматического продления нет. После покупки деньги не возвращаются, поэтому бесплатные три' |  |
| ru-390 | PASS | pricing button leads somewhere sensible (sign-up/trial/plans or an explained status) |  |
| ru-390 | PASS | language still the chosen one after pricing | ru |
| ru-390 | PASS | FAQ: trial wording says Speaking Part 1 (not 'full test in each section') | ПЕРЕД ПЕРВЫМ ШАГОМ  Несколько вопросов, которые могут возникнуть. Как работает бесплатный пробный период на 3 дня? +  Зарегистрируйтесь и готовьтесь к Academic IELTS три дня бесплатно. Банковская карт |
| ru-390 | PASS | footer: Privacy, Terms and Ask a person links present | {'privacy': '/ielts-website/privacy', 'terms': '/ielts-website/terms', 'support': '/ielts-website/support?reason=footer'} |
| ru-390 | PASS | footer privacy: opens (HTTP 200), heading 'Как используются ваши данные', language kept | ru |
| ru-390 | PASS | footer privacy: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| ru-390 | PASS | footer terms: opens (HTTP 200), heading 'Условия простыми словами', language kept | ru |
| ru-390 | PASS | footer terms: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| ru-390 | PASS | footer support: opens (HTTP 200), heading 'Спросить человека', language kept | ru |
| ru-390 | PASS | footer support: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| ru-390 | PASS | Ask a person: a form a signed-out visitor can use (message box and email) |  |
| ru-390 | PASS | start trial: /trial opens in the chosen language | /trial ru |
| ru-390 | PASS | trial offer states Academic IELTS and Speaking Part 1 before sign-up |  |
| ru-390 | PASS | sign-up: opened from the trial, language kept | /sign-up ru |
| ru-390 | PASS | sign-up: explains what is asked next and links to privacy | Дальше мы попросим несколько данных о вас: имя, дату рождения и номер телефона. Их видите только вы и тот, кто ведёт сай |
| ru-390 | PASS | sign-up: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| ru-390 | PASS | profile: required profile follows sign-up, language kept | /profile ru |
| ru-390 | PASS | profile: explanation visible (why, who sees it, link to privacy) | Эти данные видите только вы и тот, кто ведёт сайт. Зачем нужен каждый пункт |
| ru-390 | PASS | profile: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| ru-390 | PASS | profile: saved |  |
| ru-390 | PASS | Before you begin: back on /trial with the Start button, language kept | /trial ru Начать 3 дня бесплатно |
| ru-390 | PASS | Before you begin: the clock starts only on Start (said on the page) | IELTS is EZ EN RU SS Сегодня Курс Практика Тесты Словарь Перейти к содержимому Перед началом  Три дня начнутся, когда вы |
| ru-390 | PASS | no trial yet before pressing Start | None |
| ru-390 | PASS | Start: trial begins on the server and Today opens in the chosen language | /dashboard ru {'user_id': '137bfb58-a47a-4823-a997-1bcd2dc71fcf', 'started_at': '2026-09-29T19:38:11.516Z', 'ends_at': '2026-10-02T19:38:11.516Z', 'questionnaire': {'band': ' |
| ru-390 | PASS | questionnaire answers kept with the trial | {'band': '7', 'time': '15', 'focus': 'method', 'skill': 'reading'} |
| ru-390 | PASS | language stored throughout | ru |
| ru-390 | PASS | Today: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| all | PASS | a signed-out visitor / new trial account made ZERO /content/pack/ requests | {'visitor-en-1440': 0, 'visitor-ru-1440': 0, 'visitor-en-390': 0, 'visitor-ru-390': 0} |
