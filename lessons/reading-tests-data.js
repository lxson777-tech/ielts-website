/* ─────────────────────────────────────────────────────────────────────────
   IELTS Reading Tests — Data File
   To add a new test: append an object to READING_TESTS following the same
   structure. The test player and lesson card grid are generated automatically.

   Question group types:
     "paragraph-matching"   → select dropdown, options field required
     "sentence-completion"  → inline text input, q.before / q.after required
     "tfng"                 → select True / False / Not Given
     "multiple-choice"      → radio A/B/C/D, q.options array required
   ───────────────────────────────────────────────────────────────────────── */

var READING_TESTS = [
  {
    id: 1,
    title: 'Money Transfers by Mobile',
    topic: 'Academic Reading',
    time: 60,
    passage: {
      label: 'Reading Passage 1',
      title: 'Money Transfers by Mobile',
      instruction: 'You should spend about 20 minutes on <strong>Questions 1–13</strong>, which are based on Reading Passage 1 below.',
      paragraphs: [
        {
          label: 'A',
          text: 'The ping of a text message has never sounded so sweet. In what is being touted as a world first, Kenya\'s biggest mobile operator is allowing subscribers to send cash to other phone users by SMS. Known as M-Pesa, or mobile money, the service is expected to revolutionise banking in a country where more than 80% of people are excluded from the formal financial sector. Apart from transferring cash — a service much in demand among urban Kenyans supporting relatives in rural areas — customers of the Safaricom network will be able to keep up to 50,000 shillings (£370) in a "virtual account" on their handsets.'
        },
        {
          label: 'B',
          text: 'Developed by Vodafone, which holds a 35% share in Safaricom, M-Pesa was formally launched in Kenya two weeks ago. More than 10,000 people have signed up for the service, with around 8 million shillings transferred so far, mostly in tiny denominations. Safaricom\'s executives are confident that growth will be strong in Kenya, and later across Africa. "We are effectively giving people ATM cards without them ever having to open a real bank account," said Michael Joseph, chief executive of Safaricom, who called the money transfer concept the "next big thing" in mobile telephony.'
        },
        {
          label: 'C',
          text: 'M-Pesa\'s process is simple. There is no need for a new handset or SIM card. To send money, you hand over the cash to a registered Safaricom agent — typically a small shop or kiosk — who credits your M-Pesa account. You then text the recipient\'s mobile number and a sum in shillings. The recipient gets a text message and goes to their nearest M-Pesa agent, who makes a note of the transaction number given in the text, and hands over the cash minus a small transaction charge. The minimum transfer is 100 shillings (73p); the maximum is 35,000 shillings (£258). These charges are in line with those of money transfer operators, but M-Pesa\'s infrastructure costs are much lower.'
        },
        {
          label: 'D',
          text: 'One area in which M-Pesa faces competition is in international money transfers — the business of sending cash from Kenyans living abroad back to their families at home. This market has been dominated by operators such as Moneygram and Western Union, and a company called Mpesa Ltd (no relation to M-Pesa) operates a similar service in South Africa. However, international transfers are not yet a feature of M-Pesa.'
        },
        {
          label: 'E',
          text: 'The system does have weaknesses. Fraud is a concern. If a recipient\'s phone is stolen, the thief could cash in any credits in the account. And there is the issue of agent dishonesty — agents could simply pocket the cash. Safaricom is alert to this problem and has put in place safeguards, but it admits these cannot make the system completely foolproof.'
        }
      ]
    },
    groups: [
      {
        title: 'Questions 1–4',
        type: 'paragraph-matching',
        options: ['A', 'B', 'C', 'D', 'E'],
        instruction: 'The text has 5 paragraphs (<strong>A – E</strong>). Which paragraph contains each of the following pieces of information?',
        questions: [
          { id: 'q1', text: 'A possible security problem', answer: 'E' },
          { id: 'q2', text: 'The cost of using M-Pesa', answer: 'C' },
          { id: 'q3', text: 'An international service similar to M-Pesa', answer: 'D' },
          { id: 'q4', text: 'The fact that most Kenyans do not have a bank account', answer: 'A' }
        ]
      },
      {
        title: 'Questions 5–8',
        type: 'sentence-completion',
        instruction: 'Complete the following sentences using <em>NO MORE THAN THREE WORDS</em> from the text for each gap.',
        questions: [
          { id: 'q5',  before: 'Safaricom is the',                                  after: 'mobile phone company in Kenya.',                                        answer: 'biggest'        },
          { id: 'q6',  before: 'An M-Pesa account is credited by a registered Safaricom', after: '.',                                                               answer: 'agent'          },
          { id: 'q7',  before: 'The minimum transfer permitted via M-Pesa is',       after: 'shillings.',                                                           answer: '100'            },
          { id: 'q8',  before: 'M-Pesa\'s',                                          after: 'costs are much lower than those of money transfer operators.',          answer: 'infrastructure' }
        ]
      },
      {
        title: 'Questions 9–13',
        type: 'tfng',
        instruction: 'Do the following statements agree with the information given in Reading Passage 1? Write <strong>True</strong>, <strong>False</strong>, or <strong>Not Given</strong>.',
        questions: [
          { id: 'q9',  text: 'M-Pesa was first piloted in Tanzania before its Kenyan launch.',                        answer: 'Not Given' },
          { id: 'q10', text: 'Safaricom\'s executives expect M-Pesa to grow beyond Kenya.',                            answer: 'True'      },
          { id: 'q11', text: 'People who receive M-Pesa transfers are charged a fee when they collect the cash.',      answer: 'True'      },
          { id: 'q12', text: 'M-Pesa currently offers an international money transfer service.',                       answer: 'False'     },
          { id: 'q13', text: 'Safaricom claims its security measures make M-Pesa completely safe from fraud.',         answer: 'False'     }
        ]
      }
    ]
  }

  /* ── Add more tests below, following the same structure ── */

];
