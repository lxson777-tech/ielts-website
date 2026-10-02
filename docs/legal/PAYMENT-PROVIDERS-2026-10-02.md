# Payment providers for IELTS is EZ (research, 2 October 2026)

Web research only (provider pages and developer docs); nothing was signed up
for. Case: a Kazakh sole trader (ИП) selling 30 days of online access for
12,990 KZT, paid once, to students mostly in Kazakhstan paying in tenge.

## Three findings that matter more than the choice of provider

1. **Fiscal receipts are required.** Card payments online need a fiscal
   (cash-register) receipt sent to the tax office through an OFD (an
   authorised receipt operator). The seller is responsible, not the payment
   provider; some providers handle it, others need a separate online cash
   register such as Webkassa. Sources: new Tax Code No. 214-VIII (from
   1 January 2026, via uppersetup.com, 21 Sep 2026); Bank Ombudsman,
   bank-ombudsman.kz (26 Sep 2025). Confirm with an accountant.
2. **The free github.io address is likely to be refused.** Halyk requires a
   Kazakh .kz domain; Freedom Pay requires a paid domain and paid hosting. A
   .kz domain must itself be hosted on equipment inside Kazakhstan (nic.kz
   rules, Order No. 38/НҚ of 13 March 2018, p.16), which GitHub Pages and
   Cloudflare are not.
3. **Kaspi Pay is the cheapest (0.95% for private courses + 1,950 KZT a
   month) but publishes no website integration.** Kaspi Gold cards can still
   pay on any other provider's card page.

## Comparison (fee on one 12,990 KZT sale at the published rate)

| Provider | Sole trader? | Published card fee | Fee on 12,990 | Webhook / test mode / API refunds | Fiscal receipts | Possible blocker |
|---|---|---|---|---|---|---|
| Halyk ePay | Yes | 2.5% Halyk cards, 3% other banks, 4% Amex | 325 to 390 | Yes / Yes / Yes | Halyk says yes | .kz domain and a public offer |
| Freedom Pay | Yes | 3.5% (min 25) "Light" | 455 | Yes, with retries / Yes / Yes | Yes, separate contract | Paid domain and paid hosting |
| TipTop Pay (ex-CloudPayments KZ) | Yes | "from 2.5%", per client | ~325+ | Yes / Yes / Yes | Yes, 3,000 KZT/month (yearly) | None found |
| Bereke Bank | Yes | 2.0% (min 25) | 260 | Yes / Yes / Yes | Not stated | Probably a Bereke account (unconfirmed) |
| ioka | Not stated | 2.9% | 377 | Yes / Yes / Yes | Unconfirmed | None found |
| Robokassa KZ | Yes | 2.7% to 3.9% + 250 KZT per withdrawal | 351 to 507 | Yes / Yes / Yes | Free, included | Tenge prices, refund rules, contacts on site |
| Forte Bank | Yes | 2.5%; foreign cards 4% (min 350), third-party source | 325 (520) | Not checked | Not checked | Unconfirmed |
| Kaspi Pay | Yes, in the app | 0.95% + 1,950 KZT/month | 123 | No public docs | Kaspi Kassa, free | No published website integration |
| Stripe | No | n/a | n/a | n/a | n/a | Kazakhstan not supported |
| PayPal | Account possible | n/a | n/a | n/a | No | No tenge, no fiscal receipts |

Sources (provider pages, as read on 2 October 2026):
halykbank.kz/en/business/payment/epay, epayment.kz/en-US/docs,
halykbank.kz/index.php/knowledge_base/entity/55; freedompay.kz,
freedompay.kz/docs/merchant-api/pay, docs.freedompay.kz/api-11621013,
freedompay.kz/blog/kak-podklyuchit-freedompay; tiptoppay.kz/internet-ekvairing,
developers.tiptoppay.kz, cloudpayments.kz/online-kassa, cloudpayments.kz/faq;
berekebank.kz/ru/small_business/acquiring, sandbox.berekebank.kz;
ioka.kz/ru/pricing, ioka.kz/docs; robokassa.kz/tarify, docs.robokassa.kz;
bank.kz/ekvajring/internet-v-fortebank (third party); kaspi.kz/webpay/partnership,
guide.kaspi.kz/partner/ru/account/opening/q258; stripe.com/global.

## Recommendation (research view)

1. **Halyk ePay** as the main provider: lowest published fees among the
   well-documented ones, every technical need covered, says it handles
   fiscal receipts. Needs a .kz domain, which means hosting the public site
   in Kazakhstan.
2. **Freedom Pay**, the fastest to set up: self sign-up for sole traders,
   published fee, the most robust notifications (retried every 30 minutes
   for 2 hours), refunds by API. 3.5%, and needs a paid domain and hosting.
3. **TipTop Pay**, the least affected by the current setup: relaxed website
   rules, published cash-register price, excellent docs, wide foreign card
   support; the fee is negotiated.

Kaspi later: apply, and ask whether they give official documentation that
tells our server when a payment succeeds.

## What providers ask the website to show

- Seller details: full sole-trader name, IIN/BIN, address, phone, email.
- A public offer (the contract terms posted on the site).
- What is sold, with prices in tenge; how and when access is delivered.
- Refund, cancellation and complaints rules.
- A privacy policy and consent to the handling of personal data.
- A working site on https, a paid domain and paid hosting (Freedom Pay);
  a .kz domain (Halyk).
- The site never collects card details itself (it does not: the provider's
  page does).
