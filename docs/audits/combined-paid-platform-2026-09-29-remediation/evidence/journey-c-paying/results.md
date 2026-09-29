# journey-c-paying

Base http://localhost:4492/ielts-website, stand-in http://127.0.0.1:8492

**113 of 114 checks passed**

| Combo | Result | Check | Detail |
|---|---|---|---|
| en-390 | PASS | signed-out visitor made ZERO /content/pack/ requests | [] |
| en-1440 | PASS | trial started |  |
| en-1440 | PASS | trial account visiting locked pages made ZERO /content/pack/ requests | [] |
| en-1440 | PASS | /plans (trial): both Buy buttons enabled |  |
| en-1440 | PASS | /plans: SIMULATED banner visible |  |
| en-1440 | PASS | /plans: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| en-1440 | PASS | simulated provider page (/__pay) reached, labelled SIMULATED | http://127.0.0.1:8492/__pay/2dd2a782-f888-432a-8296-65c31a1aa258?return=http%3A%2F%2Flocalhost%3A4492%2Fielts-website%2Fplans%2Freturn%3Forder%3D2dd2a782-f888-432a-8296-65c31a1aa258 |
| en-1440 | PASS | /plans/return: 'You're in' after the provider confirmed |  |
| en-1440 | PASS | server: order paid at 10,000 KZT with exactly one grant | {"id": "2dd2a782-f888-432a-8296-65c31a1aa258", "user_id": "71d86208-c1f8-42a5-b853-7809e9120604", "plan_id": "month-1", "amount": 10000, "currency": "KZT", "provider": "simulated", "provider_ref": "si |
| en-1440 | PASS | return page states the access-until date from the server grant | 30 October 2026 |
| en-1440 | PASS | reloading the return page is safe (no second grant) |  |
| en-1440 | PASS | Today is the full Today (not the trial home) |  |
| en-1440 | PASS | previously locked lesson opens (reading/tfng) |  |
| en-1440 | PASS | Writing checker offers the full question choice (Task 1 and Task 2) |  |
| en-1440 | PASS | cue cards open (24 cards) |  |
| en-1440 | PASS | model answer page shows a Band 8 answer |  |
| en-1440 | PASS | band guide shows real steps |  |
| en-1440 | PASS | focused exercise answered and checked start to finish |  |
| en-1440 | PASS | vocabulary review topics open | IELTS is EZ Today Course Practice Tests Vocabulary EN RU SS Skip to content  Dashboard  Vocabulary  Every IELTS topic, i |
| en-1440 | PASS | placement material arrived and can start |  |
| en-1440 | PASS | placement test started |  |
| en-1440 | PASS | placement: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| en-1440 | PASS | paid browsing fetched packs through the door | 25 |
| en-1440 | PASS | account: Your access with end date and a purchase history row | Your access  What your account can open, and every purchase you have made.  Full access until 30 October 2026 Buying again adds more time after this date. Nothing renews by itself. Add more time  Full |
| en-1440 | PASS | account: receipt link present |  |
| en-1440 | PASS | receipt: number, amount and status shown, marked SIMULATED | SIMULATED payment No money was taken. This receipt is a local test, not a real one.  IELTS IS EZ Receipt Receipt number 2026-000018 Date 30 September 2026 Plan One month Access period 30 September 202 |
| en-1440 | PASS | three months extends: new grant starts when the first ends (+90 days) | [{"id": "8b2921b9-59c7-4ef1-868c-fd8fbc966b51", "user_id": "71d86208-c1f8-42a5-b853-7809e9120604", "order_id": "cdfebf92-5a3c-450a-83df-10eac2c9d647", "plan_id": "month-3", "starts_at": "2026-10-29T19 |
| en-1440 | PASS | second fresh browser: signed in and /plans shows paid access |  |
| en-1440 | PASS | second browser: previously locked lesson open |  |
| en-1440 | PASS | second browser: full Today |  |
| en-1440 | PASS | Fail: 'Payment was not completed', access unchanged |  |
| en-1440 | PASS | Cancel: order cancelled on the server and the page says so | cancelled |
| en-1440 | PASS | interrupted: back on /plans the pending order is shown with Check again | /plans |
| en-1440 | PASS | interrupted order is 'pending' on the server, grants unchanged | pending |
| en-1440 | PASS | student B paid: door open for the paid lesson |  |
| en-1440 | PASS | refund: the lesson is locked again on screen |  |
| en-1440 | PASS | refund: the door refuses the paid lesson (403) |  |
| en-1440 | PASS | refund: account shows the order refunded and no paid access | Your access  What your account can open, and every purchase you have made.  Your free trial runs until 3 October, 00:36 Full access starts as soon as your payment is confirmed. View plans  Full access |
| en-1440 | PASS | paid student submitted a paid-only paper (result to keep) |  |
| en-1440 | PASS | expire: account says 'ended on' and results are kept | Your access  What your account can open, and every purchase you have made.  Your full access ended on 30 September 2026 Your results are kept. Choose a plan to continue. Buy access again  Full access  |
| en-1440 | PASS | expire: previously paid lesson locked again |  |
| en-1440 | PASS | expire: saved results still on the report | IELTS is EZ Today Course Practice Tests Vocabulary EN RU SS Skip to content  PROGRESS REPORT  Your progress, one page.  Everything from your account page laid o |
| ru-1440 | PASS | trial started |  |
| ru-1440 | PASS | trial: zero pack requests before buying |  |
| ru-1440 | PASS | /plans: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| ru-1440 | PASS | bought one month: return page confirms |  |
| ru-1440 | PASS | Today is the full Today (not the trial home) |  |
| ru-1440 | PASS | previously locked lesson opens (reading/tfng) |  |
| ru-1440 | PASS | Writing checker offers the full question choice (Task 1 and Task 2) |  |
| ru-1440 | PASS | cue cards open (24 cards) |  |
| ru-1440 | PASS | model answer page shows a Band 8 answer |  |
| ru-1440 | PASS | band guide shows real steps |  |
| ru-1440 | PASS | focused exercise answered and checked start to finish |  |
| ru-1440 | PASS | vocabulary review topics open | IELTS is EZ Сегодня Курс Практика Тесты Словарь EN RU SS Перейти к содержимому  Дашборд  Словарь  Каждая тема IELTS, её  |
| ru-1440 | PASS | placement material arrived and can start |  |
| ru-1440 | PASS | placement: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| ru-1440 | PASS | account: Your access shows full access |  |
| ru-1440 | PASS | account: no sideways scroll | {'clientWidth': 1440, 'scrollWidth': 1440, 'innerWidth': 1440, 'wide': []} |
| en-390 | PASS | trial started |  |
| en-390 | PASS | trial: zero pack requests before buying |  |
| en-390 | PASS | /plans: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| en-390 | PASS | bought one month: return page confirms |  |
| en-390 | PASS | Today is the full Today (not the trial home) |  |
| en-390 | PASS | previously locked lesson opens (reading/tfng) |  |
| en-390 | PASS | Writing checker offers the full question choice (Task 1 and Task 2) |  |
| en-390 | PASS | cue cards open (24 cards) |  |
| en-390 | PASS | model answer page shows a Band 8 answer |  |
| en-390 | PASS | band guide shows real steps |  |
| en-390 | PASS | focused exercise answered and checked start to finish |  |
| en-390 | PASS | vocabulary review topics open | IELTS is EZ EN RU SS Today Course Practice Tests Vocabulary Skip to content  Dashboard  Vocabulary  Every IELTS topic, i |
| en-390 | PASS | placement material arrived and can start |  |
| en-390 | PASS | placement: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| en-390 | PASS | account: Your access shows full access |  |
| en-390 | PASS | account: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| ru-390 | PASS | trial started |  |
| ru-390 | PASS | trial account visiting locked pages made ZERO /content/pack/ requests | [] |
| ru-390 | PASS | /plans (trial): both Buy buttons enabled |  |
| ru-390 | PASS | /plans: SIMULATED banner visible |  |
| ru-390 | PASS | /plans: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| ru-390 | PASS | simulated provider page (/__pay) reached, labelled SIMULATED | http://127.0.0.1:8492/__pay/f19647f7-11e0-4327-b8d1-6e2d8ada1e75?return=http%3A%2F%2Flocalhost%3A4492%2Fielts-website%2Fplans%2Freturn%3Forder%3Df19647f7-11e0-4327-b8d1-6e2d8ada1e75 |
| ru-390 | PASS | /plans/return: 'You're in' after the provider confirmed |  |
| ru-390 | PASS | server: order paid at 10,000 KZT with exactly one grant | {"id": "f19647f7-11e0-4327-b8d1-6e2d8ada1e75", "user_id": "d0d15c41-07fc-47f8-804a-3ae05f073fd5", "plan_id": "month-1", "amount": 10000, "currency": "KZT", "provider": "simulated", "provider_ref": "si |
| ru-390 | PASS | reloading the return page is safe (no second grant) |  |
| ru-390 | PASS | Today is the full Today (not the trial home) |  |
| ru-390 | PASS | previously locked lesson opens (reading/tfng) |  |
| ru-390 | PASS | Writing checker offers the full question choice (Task 1 and Task 2) |  |
| ru-390 | PASS | cue cards open (24 cards) |  |
| ru-390 | PASS | model answer page shows a Band 8 answer |  |
| ru-390 | PASS | band guide shows real steps |  |
| ru-390 | PASS | focused exercise answered and checked start to finish |  |
| ru-390 | PASS | vocabulary review topics open | IELTS is EZ EN RU SS Сегодня Курс Практика Тесты Словарь Перейти к содержимому  Дашборд  Словарь  Каждая тема IELTS, её  |
| ru-390 | PASS | placement material arrived and can start |  |
| ru-390 | PASS | placement test started |  |
| ru-390 | PASS | placement: no sideways scroll | {'clientWidth': 390, 'scrollWidth': 390, 'innerWidth': 390, 'wide': []} |
| ru-390 | PASS | paid browsing fetched packs through the door | 34 |
| ru-390 | PASS | account: Your access with end date and a purchase history row | Ваш доступ  Что открыто в вашем аккаунте, и все ваши покупки.  Полный доступ до 30 октября 2026 г. Новая покупка добавит время после этой даты. Ничего не продлевается само. Добавить время  Полный дост |
| ru-390 | PASS | account: receipt link present |  |
| ru-390 | PASS | receipt: number, amount and status shown, marked SIMULATED | СИМУЛЯЦИЯ оплаты Деньги не списывались. Этот чек из локальной проверки, он не настоящий.  IELTS IS EZ Чек Номер чека 2026-000023 Дата 30 сентября 2026 г. Тариф Один месяц Срок доступа с 30 сентября 20 |
| ru-390 | PASS | three months extends: new grant starts when the first ends (+90 days) | [{"id": "7b00928e-664b-40f3-bc7f-a144b4a2f9b9", "user_id": "d0d15c41-07fc-47f8-804a-3ae05f073fd5", "order_id": "f44cea2f-e543-49e4-aad0-0287d0d8d3c5", "plan_id": "month-3", "starts_at": "2026-10-29T19 |
| ru-390 | PASS | second fresh browser: signed in and /plans shows paid access |  |
| ru-390 | PASS | second browser: previously locked lesson open |  |
| ru-390 | PASS | second browser: full Today |  |
| ru-390 | PASS | Fail: 'Payment was not completed', access unchanged |  |
| ru-390 | PASS | Cancel: order cancelled on the server and the page says so | cancelled |
| ru-390 | PASS | interrupted: back on /plans the pending order is shown with Check again | /plans |
| ru-390 | PASS | interrupted order is 'pending' on the server, grants unchanged | pending |
| ru-390 | PASS | student B paid: door open for the paid lesson |  |
| ru-390 | PASS | refund: the lesson is locked again on screen |  |
| ru-390 | PASS | refund: the door refuses the paid lesson (403) |  |
| ru-390 | PASS | refund: account shows the order refunded and no paid access | Ваш доступ  Что открыто в вашем аккаунте, и все ваши покупки.  Бесплатный пробный период действует до 3 октября, 00:40 Полный доступ откроется, как только оплата будет подтверждена. Посмотреть тарифы  |
| ru-390 | PASS | paid student submitted a paid-only paper (result to keep) |  |
| ru-390 | PASS | expire: account no longer says full access until | Ваш доступ  Что открыто в вашем аккаунте, и все ваши покупки.  Ваш полный доступ закончился 30 сентября 2026 г. Ваши результаты сохранены. Выберите тариф, чтобы продолжить. Купить доступ снова  Полный |
| ru-390 | PASS | expire: previously paid lesson locked again |  |
| ru-390 | FAIL | expire: saved results still on the report | IELTS is EZ EN RU SS Сегодня Курс Практика Тесты Словарь Перейти к содержимому  ОТЧЁТ О ПРОГРЕССЕ  Ваш прогресс на одной странице.  Всё с вашей страницы аккаунт |
