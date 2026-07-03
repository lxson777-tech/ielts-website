import type { PracticeTest } from '../../lib/tests/schema';

/* Migrated from lessons/reading-tests-data.js (test id 1) — passage text
   and all 13 answers preserved exactly. */
export const readingTest001: PracticeTest = {
  id: 'reading-001',
  skill: 'reading',
  title: 'Money Transfers by Mobile',
  description: 'Academic Reading passage on Kenya’s M-Pesa mobile money service, with paragraph matching, sentence completion and True/False/Not Given questions.',
  durationMinutes: 60,
  parts: [
    {
      label: 'Passage 1',
      stimulus: {
        kind: 'passage',
        label: 'Reading Passage 1',
        title: 'Money Transfers by Mobile',
        instructionHtml:
          'You should spend about 20 minutes on <strong>Questions 1–13</strong>, which are based on Reading Passage 1 below.',
        paragraphs: [
          {
            label: 'A',
            html: 'The ping of a text message has never sounded so sweet. In what is being touted as a world first, Kenya’s biggest mobile operator is allowing subscribers to send cash to other phone users by SMS. Known as M-Pesa, or mobile money, the service is expected to revolutionise banking in a country where more than 80% of people are excluded from the formal financial sector. Apart from transferring cash — a service much in demand among urban Kenyans supporting relatives in rural areas — customers of the Safaricom network will be able to keep up to 50,000 shillings (£370) in a “virtual account” on their handsets.',
          },
          {
            label: 'B',
            html: 'Developed by Vodafone, which holds a 35% share in Safaricom, M-Pesa was formally launched in Kenya two weeks ago. More than 10,000 people have signed up for the service, with around 8 million shillings transferred so far, mostly in tiny denominations. Safaricom’s executives are confident that growth will be strong in Kenya, and later across Africa. “We are effectively giving people ATM cards without them ever having to open a real bank account,” said Michael Joseph, chief executive of Safaricom, who called the money transfer concept the “next big thing” in mobile telephony.',
          },
          {
            label: 'C',
            html: 'M-Pesa’s process is simple. There is no need for a new handset or SIM card. To send money, you hand over the cash to a registered Safaricom agent — typically a small shop or kiosk — who credits your M-Pesa account. You then text the recipient’s mobile number and a sum in shillings. The recipient gets a text message and goes to their nearest M-Pesa agent, who makes a note of the transaction number given in the text, and hands over the cash minus a small transaction charge. The minimum transfer is 100 shillings (73p); the maximum is 35,000 shillings (£258). These charges are in line with those of money transfer operators, but M-Pesa’s infrastructure costs are much lower.',
          },
          {
            label: 'D',
            html: 'One area in which M-Pesa faces competition is in international money transfers — the business of sending cash from Kenyans living abroad back to their families at home. This market has been dominated by operators such as Moneygram and Western Union, and a company called Mpesa Ltd (no relation to M-Pesa) operates a similar service in South Africa. However, international transfers are not yet a feature of M-Pesa.',
          },
          {
            label: 'E',
            html: 'The system does have weaknesses. Fraud is a concern. If a recipient’s phone is stolen, the thief could cash in any credits in the account. And there is the issue of agent dishonesty — agents could simply pocket the cash. Safaricom is alert to this problem and has put in place safeguards, but it admits these cannot make the system completely foolproof.',
          },
        ],
      },
      groups: [
        {
          title: 'Questions 1–4',
          type: 'paragraph-matching',
          options: ['A', 'B', 'C', 'D', 'E'],
          instructionHtml:
            'The text has 5 paragraphs (<strong>A – E</strong>). Which paragraph contains each of the following pieces of information?',
          questions: [
            { id: 'q1', textHtml: 'A possible security problem', answer: 'E' },
            { id: 'q2', textHtml: 'The cost of using M-Pesa', answer: 'C' },
            { id: 'q3', textHtml: 'An international service similar to M-Pesa', answer: 'D' },
            { id: 'q4', textHtml: 'The fact that most Kenyans do not have a bank account', answer: 'A' },
          ],
        },
        {
          title: 'Questions 5–8',
          type: 'sentence-completion',
          instructionHtml:
            'Complete the following sentences using <em>NO MORE THAN THREE WORDS</em> from the text for each gap.',
          questions: [
            { id: 'q5', before: 'Safaricom is the', after: 'mobile phone company in Kenya.', answer: 'biggest' },
            { id: 'q6', before: 'An M-Pesa account is credited by a registered Safaricom', after: '.', answer: 'agent' },
            { id: 'q7', before: 'The minimum transfer permitted via M-Pesa is', after: 'shillings.', answer: '100' },
            { id: 'q8', before: 'M-Pesa’s', after: 'costs are much lower than those of money transfer operators.', answer: 'infrastructure' },
          ],
        },
        {
          title: 'Questions 9–13',
          type: 'tfng',
          instructionHtml:
            'Do the following statements agree with the information given in Reading Passage 1? Write <strong>True</strong>, <strong>False</strong>, or <strong>Not Given</strong>.',
          questions: [
            { id: 'q9', textHtml: 'M-Pesa was first piloted in Tanzania before its Kenyan launch.', answer: 'Not Given' },
            { id: 'q10', textHtml: 'Safaricom’s executives expect M-Pesa to grow beyond Kenya.', answer: 'True' },
            { id: 'q11', textHtml: 'People who receive M-Pesa transfers are charged a fee when they collect the cash.', answer: 'True' },
            { id: 'q12', textHtml: 'M-Pesa currently offers an international money transfer service.', answer: 'False' },
            { id: 'q13', textHtml: 'Safaricom claims its security measures make M-Pesa completely safe from fraud.', answer: 'False' },
          ],
        },
      ],
    },
  ],
};
