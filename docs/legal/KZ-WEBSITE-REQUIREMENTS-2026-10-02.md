# What Kazakh law asks of the paid website (research, 2 October 2026)

**Research, not legal advice.** Read from the current official texts (most
amended July to September 2026; official addresses on adilet.zan.kz, read
through its mirror zakon.uchet.kz with the same document codes). Fines use
the 2026 monthly index (MCI) of 4,325 KZT at the small-business rate.
Confidence: confirmed / likely / unclear.

## The three biggest issues

1. **Kazakh language.** Consumer information must be in Kazakh and Russian;
   the site has English and Russian.
2. **Data stored abroad.** Personal data must be stored in a database in
   Kazakhstan; Supabase is abroad.
3. **"No refunds after purchase"** is very likely unenforceable against
   consumers.

## 1. Personal data (Law No. 94-V, as amended 14.09.2026)
https://adilet.zan.kz/rus/docs/Z1300000094

- **Consent** (Art. 7, 8): needed from the student or legal guardian; any
  provable form (a stored tick box is the usual practice; Art. 25 p.2(5)
  proof on request). It must state: operator name and IIN/BIN, the
  student's name, how long consent lasts, third parties, transfer abroad,
  anything made public, and the list of data. Third parties and abroad need
  consent (Art. 7 p.6). **Confirmed.**
- **Minors**: the law gives no age; the Civil Code fills it (under 14 the
  parent acts, Art. 23; 14 to 18 the teenager acts with parental consent,
  Art. 22). Buying the 30 days is a transaction too: parental consent for
  14 to 18 unless paid from own earnings; under 14 the parent buys.
  A tick box on the child's own screen is weak proof; a confirmation sent to
  the parent's phone or email is stronger. **Likely.**
- **Localisation** (Art. 12 p.2; Order 179/НҚ p.13 and p.14, amended
  03.09.2026, https://adilet.zan.kz/rus/docs/V2300032810; collection rules
  p.11, https://adilet.zan.kz/rus/docs/V2000021498): storage in a database,
  server room or data centre in Kazakhstan. The Digital Code (No. 255-VIII,
  July 2026) does not relax it. Practice: the primary database in
  Kazakhstan, copies abroad under the cross-border rules. Supabase in the EU
  or US is very likely non-compliant. **Rule confirmed; applying it to
  sending work to OpenAI for marking: unclear.**
- **Cross-border** (Art. 16): allowed to countries that protect personal
  data, otherwise with consent. No official list found. **Unclear** whether
  the US counts.
- **Notification** (Art. 10-1, 25-1, Law 326-VIII of 24.06.2026): not needed
  under 10,000 data subjects ("small" processor), still exempt as "medium".
  **Confirmed.**
- **Operator duties** (Art. 22, 25): an approved internal list of data
  collected, a written privacy policy, protection measures, deletion when
  the purpose is reached, free access for students to their data; logs,
  integrity checks and encryption for restricted data (Order 179/НҚ p.12).
  **Confirmed.**
- **Student rights and deadlines** (Art. 24, 8 p.7, 25 p.2(8); Rules
  395/НҚ p.16): information within 3 working days; correction, blocking or
  deleting unlawful data within 1 working day; withdrawal of consent within
  15 working days. Digital Code Art. 41: a general right to deletion; data a
  law requires to be kept is locked away instead. **Confirmed.**
- **Automated decisions / AI** (Art. 19-1; Digital Code Art. 43): explain
  automated processing, accept objections within 3 working days. AI band
  scores create no legal rights, so the ban likely does not bite; still say
  the marking is automatic and offer a human review. **Likely.**
- **Breach**: notify the authority within 1 working day (Art. 25 p.2(8);
  Rules 481/НҚ p.4, https://adilet.zan.kz/rus/docs/V2400034919).
  **Confirmed.**
- **Fines** (Administrative Code Art. 79,
  https://adilet.zan.kz/rus/docs/K1400000235): unlawful processing 60 MCI
  (~259,500 KZT); no protection measures 300 MCI (~1,297,500 KZT); same with
  a leak 750 MCI (~3,243,750 KZT); Art. 641 75 MCI. **Confirmed.**

## 2. Consumer protection and e-commerce
Consumer Law (version 20.08.2026) https://adilet.zan.kz/rus/docs/Z100000274_;
Trade Law https://adilet.zan.kz/rus/docs/Z040000544_; Internal Trade Rules
(Order 264) https://adilet.zan.kz/rus/docs/V1500011148

- **Seller details on the site** (Art. 26 p.1, p.4; Art. 33-2 p.2): full
  name, registered as an individual entrepreneur and by which body, address,
  working hours, contact address and phone (on the website itself), plus the
  consumer protection authority's contacts (a link is allowed), the
  pre-court dispute bodies and the right to go to court. Trade Rules p.195
  expect a Kazakh mobile number. IIN is required in the data consent and is
  usually shown. **Confirmed.**
- **The service before purchase** (Art. 25 p.1, 24, Trade Rules p.194):
  what it is, what it includes, the price in tenge, payment procedure,
  conditions; a document proving purchase. **Confirmed.**
- **Fiscal receipts** (Tax Code 2026, Art. 19, 110, 111,
  https://adilet.zan.kz/rus/docs/K2500000214): card payments need a
  registered online cash register and its receipt. **Likely**; confirm with
  an accountant.
- **Public offer** (Civil Code Art. 395 p.5, 396 p.3, 152; Trade Law Art.
  29-1; Trade Rules p.189): the Terms page should become a public offer
  naming the seller and IIN, with what is sold, the price, the 30 days,
  inclusions, how the contract starts, refunds, complaints, contacts.
  **Confirmed.**
- **"No refunds after purchase"** (Civil Code Art. 686 p.1 and 683 p.2:
  the customer may cancel a paid service at any time, paying only the
  seller's actually incurred expenses, and this covers teaching; Consumer
  Law Art. 8-1 p.2(6) lists keeping money for a service not provided as an
  unfair term). Complaints need a reasoned written answer within 10 calendar
  days (Art. 42-4; fine Art. 190 p.5, 10 MCI). **Likely**: replace with a
  refund on request minus what was actually used, with the method stated.

## 3. Language
Consumer Law Art. 24(1), 25 p.3, p.3-1, p.7 (one language or a foreign
language counts as not provided), 26 p.1; Law on Languages Art. 15 (written
deals, so the offer, in Kazakh and Russian) and Art. 21,
https://adilet.zan.kz/rus/docs/Z970000151_. At minimum in Kazakh: plans and
prices, the public offer, the privacy notice and consent wording, seller
details and contacts, buying screens and receipts. The course itself is not
clearly required. **Confirmed** for consumer and offer text.

## 4. Records versus "delete everything immediately"
Tax Code Art. 206 p.3: keep tax records at least 5 years; Accounting Law
Art. 11 (https://adilet.zan.kz/rus/docs/Z070000234_): primary documents for
the legal period, sole traders on the simplified regime included; Data Law
Art. 18 and Digital Code Art. 41 p.3: data a law requires is locked away,
not used; civil limitation 3 years (Civil Code Art. 178). Keep payment
records 5 years (order, date, amount, plan, receipt number, payment
reference, possibly the buyer's name and email as on the receipt, and the
consent record); delete everything else at once. **Confirmed** (5 years),
**likely** (exact list).

As built on 2 October 2026: deletion removes everything at once and keeps
each payment as an anonymous sale (no name, no email). Whether the buyer's
identity must also be kept with the sale is question 8 below.

## 5. Cookies
No Kazakh cookie-banner rule found. The site stores only the sign-in and
progress in the browser: one sentence in the privacy notice is enough.
**Likely.**

## 6. Other
- **Education licence**: individual teaching is not licensed (Education Law
  Art. 37-1 p.2, https://adilet.zan.kz/rus/docs/Z070000319_). Do not call it
  an official or state-recognised course. **Likely.**
- **Age labels**: not required for educational material (Law on protecting
  children from harmful information, Art. 2(1), 15 p.2(6),
  https://adilet.zan.kz/rus/docs/Z1800000169). **Likely.**
- **AI** (AI Law No. 230-VIII, https://adilet.zan.kz/rus/docs/Z2500000230):
  tell users a service uses AI (Art. 21 p.1); label synthetic voice
  imitating a person (p.2, p.3); AI terms readable before use (Art. 15
  p.2(5)); users may refuse AI (Art. 16); fine Art. 641-1, 20 MCI. Label
  Mr EZ, AI feedback and the examiner's AI voice. **Likely.**

## Checklist of website changes

1. Kazakh versions of the plans page, public offer, privacy notice, consent,
   seller details, buying screens and receipts.
2. Seller details block in the footer and on the offer page.
3. Consumer authority information and the right to go to court.
4. Terms become a public offer agreement.
5. Replace "no refunds" with a refund on request minus what was used.
6. Privacy notice rewritten around the required points (who, data, purposes,
   retention, third parties and countries, rights and deadlines, consent
   withdrawal, what is kept after deletion).
7. Stored explicit consent at sign-up, including transfer abroad.
8. Stronger parental consent for under-18s.
9. Account deletion that removes everything except payment records (built).
10. See or download my data; consent withdrawal; human review of an AI
    result.
11. AI labels on Mr EZ, AI feedback and the examiner's voice.
12. Data location: the main database in Kazakhstan, or a lawyer's written
    view first.
13. Online cash register linked to the payment provider.
14. Internal documents: data list, privacy policy, breach procedure, logs
    and encryption for profile data.

## Details the seller must provide

Full registered name (surname, first name, patronymic); trading name; IIN;
date and number of the IE registration notice and the tax office; registered
address and the centre's actual address; Kazakh phone, email, working
hours; tax regime and VAT status; payment provider and online cash register;
where the database will be hosted; retention for each kind of data; the
refund rule.

## Questions for a Kazakh lawyer

1. Does sending essays, speaking audio and tutor messages to OpenAI (US) and
   keeping data in Supabase (abroad) breach Art. 12 and Rules p.13, p.14 if
   a primary copy is kept in Kazakhstan? Is consent to transfer enough? Is
   the US "adequate" under Art. 16?
2. Which data count as "restricted access" (profile, date of birth, phone,
   parent details, voice recordings)?
3. For 14 to 17 year olds: whose consent is needed for data, and what proof
   of parental consent is enough?
4. How to calculate a refund for 30 days of digital access with a fixed
   number of AI assessments (by days, by assessments used, or both)?
5. Does the whole interface need Kazakh, or only consumer information, the
   offer and policies?
6. The exact online cash register setup for card payments through the
   chosen provider.
7. Confirm no education licence or notification is needed.
8. Exactly which payment and consent records must be kept after deletion,
   and for how long.
9. Does AI Law Art. 21 p.2 cover the AI examiner's voice and the Mr EZ
   avatar? What wording is required?
10. The current names and contacts of the personal data authority and the
    consumer protection committee to show on the site.
