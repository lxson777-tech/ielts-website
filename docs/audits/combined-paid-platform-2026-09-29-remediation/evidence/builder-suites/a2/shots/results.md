# A2 purchase journey (2026-09-29T19:15:22.699504+00:00)

59/61 checks passed

- PASS plans signed out: SIMULATED banner, sign-in to buy (no buy buttons)
- PASS plans signed out: sign-in comes back to /plans [/ielts-website/sign-in?next=%2Fplans]
- PASS student A: trial started
- PASS plans (trial): current access at the top
- PASS plans (trial): both Buy buttons are enabled
- FAIL plans: terms and privacy linked, fixed-period fact stated
- FAIL plans: PurchaseTerms slot present
- PASS plans: calm 'Taking you to payment' while leaving
- PASS provider page is the SIMULATED one
- PASS order created at the server's price and pending [{"id": "0a5ac963-d03e-44f9-9c08-31f0537657ba", "user_id": "b0d83b2b-eefd-470f-9a2a-66a0d5e814ae", "plan_id": "month-1", "amount": 10000, "currency": "KZT", "provider": "simulated", "provider_ref": "sim_0a5ac963d03e44f99c0831f0537657ba", "status": "pending", "created_at": "2026-09-29T19:14:04.017Z", "paid_at": null, "refunded_at": null, "receipt_number": null, "email": "a2-buyer-a-1790709227@example.test"}]
- PASS return page: 'You're in.' after the provider confirmed [paid]
- PASS return page: access-until date matches the server's grant [30 October 2026 | grant 2026-10-29T19:14:04.276Z]
- PASS return page: receipt number and View receipt link
- PASS return page: SIMULATED banner
- PASS return page: reload shows the same answer, no second grant
- PASS return page re-asked the server for access after the payment [4 trial_status calls on the return page (load + after paid)]
- PASS cached access status now says paid (no manual refresh)
- PASS content door: a lesson outside the trial is served to the paid account
- PASS NOTE locked lesson page /lessons/reading/tfng on screen: OPEN
- PASS second browser: signed in, /plans shows paid access with no manual step
- PASS second browser: 'Adds to your current access' shown under each plan
- PASS second browser: content door open too
- PASS account: 'Your access' with end date and what it includes [Your access

What your account can open, and every purchase you have made.

Full access until 30 October 2026
Buying again adds more time after this date. Nothing renews by itself.
Add more time

Full]
- PASS account: history row (plan, amount, Paid) with a receipt link
- PASS receipt: number, date, plan, period, amount, status [SIMULATED payment
No money was taken. This receipt is a local test, not a real one.

IELTS IS EZ
Receipt
Receipt number
2026-000003
Date
30 September 2026
Plan
One month
Access period
30 September 2026 to 30 October 2026
Amount
₸10,000
Status
Paid
Account
a2-buyer-a-1790709227@example.test]
- PASS receipt: simulated receipt says so; no seller block invented
- PASS receipt prints cleanly: only the receipt is visible in print
- PASS receipt: unknown order is a safe 'could not find'
- PASS plans while paid: three months 'adds to' date = current end + 90 days [Three months

₸25,000 total

Save ₸5,000 compared with three monthly purchases.
Adds to your current access, which then runs until 28 January 2027.
Buy three months]
- PASS extend: the new grant starts when the first ends [[{"id": "5e658af6-84e2-4f00-83c1-9178b922fb50", "user_id": "b0d83b2b-eefd-470f-9a2a-66a0d5e814ae", "order_id": "8457ae26-c8cb-423c-9579-04845b7910f5", "plan_id": "month-3", "starts_at": "2026-10-29T19:14:04.276Z", "ends_at": "2027-01-27T19:14:04.276Z", "revoked_at": null, "running": false, "email": "a2-buyer-a-1790709227@example.test"}]]
- PASS extend: return page shows the extended date [SIMULATED payments
This is a local test. No money is taken and nothing here is a real purchase.

PAYMENT CONFIRMED
You’re in.

You have full access until 28 January 2027. Every lesson, test and practi]
- PASS fail: 'Payment was not completed', access unchanged, Try again
- PASS fail: no 'nothing charged' claim on the page
- PASS cancel: 'You cancelled the payment'
- PASS interrupted: /plans shows the unfinished order with Check again and Start again
- PASS interrupted: Check again says it is not confirmed yet
- PASS interrupted: /account shows it too
- PASS interrupted: a later confirmation is picked up by Check again
- PASS return: no order in the link is a safe message
- PASS student B: trial started
- PASS student B: paid, door open
- PASS return: another student's order is 'could not find'
- PASS refund: account shows the order as Refunded and no paid access [Your access

What your account can open, and every purchase you have made.

Your free trial runs until 3 October, 00:14
Full access starts as soon as your payment is confirmed.
View plans

Full access includes The full course and every practice test.]
- PASS refund: the door locks the lesson again
- PASS refund: the receipt says refunded
- PASS expire: account says 'ended on' and results are kept [Your access

What your account can open, and every purchase you have made.

Your full access ended on 30 September 2026
Your results are kept. Choose a plan to continue.
Buy access again

Full access ]
- PASS expire: purchase history still listed
- PASS expire: CTA offers to buy again
- PASS expire: the door no longer serves the paid lesson
- PASS expire: /plans says it ended
- PASS student C (ru, phone): trial started
- PASS ru phone plans: Russian access strip and buttons
- PASS ru phone plans: prices in Russian format
- PASS ru phone plans: SIMULATED banner in Russian
- PASS ru phone plans: no sideways scroll
- PASS ru phone return: 'Готово, вы с нами.'
- PASS ru phone return: 'Перейти к «Сегодня»' primary
- PASS ru phone account: Russian access and history [Ваш доступ

Что открыто в вашем аккаунте, и все ваши покупки.

Полный доступ до 30 октября 2026 г.
Новая покупка добавит время после этой даты. Ничего не продлевается само.
Добавить время

Полный дост]
- PASS ru phone account: no sideways scroll
- PASS ru phone receipt: Russian rows
- PASS ru phone fail: 'Оплата не завершена'
- PASS en phone plans: no sideways scroll