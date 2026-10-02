# Vocabulary lessons: pre-publishing review, 3 October 2026

Scope: the vocabulary overview, the linking-words lesson, the 35 topic lessons (English and Russian),
the Word of the Day bank (`src/data/words.ts`), the vocabulary list (`src/data/vocabulary.ts`) and the
Russian strings for the review modes (`src/lib/i18n/dict/ru/learning-vocab.ts`).

How it was checked: every lesson pair was read in full (four read-only helpers took nine lessons each,
I read the overview, linking words, the word bank and the data files myself and checked every helper
finding against the file before applying it). A script also compared every table row in English and
Russian (same headwords, same examples, same order), every word that appears in two lessons, and every
word in the Word of the Day bank against the lesson that teaches it.

What was already right: no placeholders, no broken HTML, no dashes, every lesson has its 20 words
(18 for linking words), and English and Russian rows line up everywhere. No word had two different
meanings in two places. Two words (algorithm, automation) were worded differently in the Technology
and AI lessons and in the word bank; they now have one wording everywhere.

Rules followed: no headword was renamed (a word is the key a student's review progress is stored
under, so renaming one would reset it); the inline answer format was kept; every Russian file whose
English changed has a fresh source hash and passes `node tools/lesson-ru.mjs check`.

In the list below, "both" means the same English text sits in the English and the Russian file
(examples, collocations and exercises stay English in the Russian lesson by design) and was changed in both.

## Fixes

### Overview (`vocabulary.html`, `ru/vocabulary.html`)
1. The note said "Each topic teaches twenty words", but the linking-words lesson in the same list has
   eighteen. Added one sentence saying linking words are the exception (eighteen, grouped by function), with its Russian.
2. A sentence fragment ("...year after year. Including fast-growing ones like AI...") joined into one sentence, EN and RU.
3. RU: "каждый из которых оценивается поровну" (stiff) now "и все четыре имеют одинаковый вес";
   "когда первые начинают получаться" now "когда первые десять станут привычными".

### Linking words (`vocabulary-conjunctions`)
4. although: "at the start or middle of a clause" was wrong (although starts its clause); now "at the start or in the middle of the sentence". EN and RU.
5. nevertheless: "contrasts with what was just said, often to concede a counter-argument" had the logic backwards; now "a point that is still true despite what was just said, often after conceding a counter-argument". EN, RU, word bank.
6. owing to: "typically at the start of a sentence" overstated a rule; now "often". EN, RU, word bank.
7. RU: "в официальном письме" (means "in an official letter") now "в формальной письменной речи".
8. RU: three definitions said "после которой/которого" so the grammar pointed at the wrong noun (despite, in order to, due to); now "после этого оборота".
9. Exercise item 2: "as a result" fits as well as "consequently"; the key now accepts both. Item 4: "as long as" accepted with "provided that". Item 7: "As long as" accepted with "Since". Both files.

### Environment
10. fossil fuels: the meaning was a sentence plus a capitalised fragment (a removed dash); now "non-renewable energy sources such as coal, oil and gas". EN, RU, word bank.
11. Exercise item 2 said emissions must fall "by at least 50% by 2050", which understates the IPCC position (about 43% by 2030 for 1.5°C); now "cut by almost half by 2030 to limit global warming to 1.5°C", and "carbon" accepted beside "greenhouse gas". Both.
12. RU carbon footprint and carbon tax: two word-for-word renderings made natural.

### Education
13. The exercise instruction listed only the answers to items 1 to 5; it now lists all ten. EN and RU.
14. Item 9 key "student loan" did not fit "their ___" after "Many graduates"; now "student loans". Both.
15. equality of opportunity: the meaning was limited to education; now "the same chances, in education and in life, whatever their background". EN, RU, word bank.
16. "In most countries compulsory education ends at sixteen" is not reliably true; now "In many countries". Both.
17. RU academic achievement: "квалификациями" is a false friend; now "дипломами и сертификатами".

### Work
18. Key Collocations listed "climb the career ladder" and "be made redundant" twice; the second copies removed. Both.
19. Item 4 key "redundancy" after "widespread"; now "redundancies". Both.
20. minimum wage: "the lowest hourly pay" is UK-only (Kazakhstan sets a monthly minimum); now "the lowest pay (per hour or per month)". EN, RU, word bank.
21. RU unemployment rate: "трудоспособного населения" (working-age population) was the wrong idea; now "рабочей силы (экономически активного населения)".
22. RU gig economy, four-day work week, transferable skills: three clumsy or ambiguous definitions made natural.

### Health
23. Item 1 "A increasingly" now "An increasingly". Both.
24. The instruction said "choose the correct word" but items 6 to 10 have no choices; it now says which items are which. EN and RU.
25. Collocations had "strain the healthcare system" next to "put a strain on the healthcare system"; the first is now "boost / strengthen the immune system". Both.
26. obesity: "that risks health" is not English; now "so much body fat that their health is at risk". EN and word bank.
27. RU preventable disease, preventive medicine (a sentence that needed a dash), waiting list (case): fixed.

### Food
28. "healthier for the soil" now "better for the soil". Both.
29. balanced diet: the meaning described eating, not a diet; now "a diet that contains the right amounts...". EN and RU.
30. RU processed food, food security, intensive farming: three literal renderings made natural.

### Transport
31. traffic congestion: the meaning described roads rather than the situation; now "a situation in which roads are so full...". EN and RU.
32. RU emissions standards: "законные" (lawful) now "установленные законом"; RU low-emission zone: it said the vehicles pay; now the owners pay.

### Leisure
33. Items 1 and 9: "unwind" and "recharge my batteries" fit both gaps; each key now accepts both. Both.
34. escapism: defined as entertainment, but it is the act of escaping; now "a way of forgetting the problems of everyday life, usually through entertainment or fantasy". EN and RU.
35. leisure industry: "businesses that provide ... hotels" now "businesses involved in". EN and RU.
36. RU pastime and documentary: made natural.

### People
37. "the most hard-working colleague" now "the hardest-working colleague". Both.
38. charismatic: "attractive" reads as good-looking; now "having a strong personal charm that attracts and influences others". EN and RU.
39. RU generous, reliable, sense of humour: three literal renderings made natural.

### Hometown and places
40. Item 1: "deprived" fits as well as "run-down"; key accepts both. Both.
41. Collocation "be located / be situated in" was split so "be located" had no preposition; now "be located / be situated in the north of the country". Both.
42. deprived area "services are weak" now "services are poor"; local identity "makes a place itself" now "makes a place different from anywhere else". EN and RU.
43. RU bustling, scenery, cosmopolitan, well-connected: four literal renderings made natural.

### Childhood
44. RU grow up: "вырасти из" reads as "outgrow"; now "взрослеть, становиться взрослым".
45. formative years example called them "a stage of education"; now "shape us more than any later stage of life". Both.

### Weather
46. Item 6 "Short, dark winters" contradicted the definition ("short, dark days of winter"); now "The short, dark days of winter". Both.

### Music, film and TV
47. Item 1 "critically panned by reviewers" (says it twice): "by reviewers" removed. Item 6 "Despite huge advertising" now "Despite a huge advertising campaign". Item 9 now "More and more new drama is funded by streaming platforms". Both.
48. "the country's best-known cultural export" / "most successful" softened to "one of the best-known cultural exports" / "a hugely successful" (K-pop is the obvious rival). Both.
49. dubbing: "replacing speech with another language" now "with a recording in another language". EN and RU.
50. RU typecast (was a noun for an adjective) and soundtrack ("программе" now "телепередаче").

### Books
51. Collocation bold split "be well / widely read" read as "be well"; now "be well read / widely read". Both.
52. Item 10 "are both genre fiction" (uncountable) now "both count as genre fiction". Example "strengthens the concentration span" now "your concentration span". Both.
53. RU imagination (circular definition) and out of print (tautology): fixed.

### Sport
54. RU competitive sport: a comma stood where a removed dash was, breaking the sentence; rephrased.
55. Item 7: "endurance" (also taught) fits as well as "stamina"; key accepts both. Both.
56. RU national pride: wrong case; now "чувство гордости за свою страну и уважения к ней".

### Society
57. Item 1's key ("migration / movement. Accept relocation") was not a word from the lesson; the item now gaps "globalisation". Both.
58. ageing population: defined as a "shift" though it names a population; now "a population in which the proportion of elderly people is increasing". EN, RU, word bank.
59. "promote" headed two bullets; the second is now "foster social cohesion". Both.
60. RU multiculturalism, marginalised groups, social cohesion: three unnatural renderings fixed.

### Crime and law
61. probation example described parole ("released after serving half her sentence"), contradicting the lesson's own definition; now "She was given two years' probation instead of a prison sentence", and the collocation "be released on probation" now "be put on probation". Both.
62. juvenile delinquency: "criminal behaviour committed" (behaviour is not committed); now "crime committed by young people". EN and word bank.
63. "socioeconomic factors are the root cause" now "root causes" in the example, the exercise and the word bank. Item 3's "among first-time young offenders" (said twice) now "in deprived neighbourhoods". Both.
64. RU law enforcement: said "responsible for obeying the law"; now "за обеспечение соблюдения закона".

### Government and economy
65. "allocate public funds" and "allocate funds / resources to" were the same collocation twice; the second is now "raise / lower taxes". Both.
66. Item 5 was close to circular ("a rising GDP is the clearest sign of economic growth"); now "Economic growth is usually measured by the change in a country's ___". Both.
67. RU austerity measures: "политика ... принимаемая" now "меры ... обычно в период экономических трудностей".

### Money
68. RU debt said the opposite of the English (money a person OWES rather than money owed TO them); now "деньги, которые нужно вернуть другому человеку, банку или компании".
69. RU luxury goods, value for money, impulse buying, cashless society, consumer rights: five literal renderings made natural.

### Artificial intelligence
70. automation now worded as in Technology and the word bank ("the use of machines or software to perform tasks previously done by humans"), EN and RU.
71. RU algorithmic bias: "выделяют" (single out) now "получают преимущество".

### Social media
72. influencer example only used the word inside "influencer marketing"; now "Brands now pay influencers to promote their products to young followers." Both, and word bank.
73. RU cyberbullying (wrong case after "угрожать"), digital footprint, attention span, online community: fixed.

### Media and advertising
74. tabloid: "short stories" means fiction; now "a popular newspaper with short, simple articles that focuses on celebrities and scandal". EN and RU.
75. Essay phrase "because they cannot recognise persuasion" now "because they cannot yet recognise when they are being persuaded". Both.
76. RU advertising campaign and public broadcaster: made natural.

### Travel
77. "boost the local economy" appeared twice in the collocations; the second is now "attract / draw tourists". Both.
78. Item 9 "Resorts ... without an income in winter" clashed with the lesson's ski-resort example; now "Beach resorts". Both.
79. RU off the beaten track (mixed adverb and noun) and peak season ("напряжённое" now "загруженное").

### Housing
80. RU housing shortage ("домов" now "жилья"), property market ("купли-продажи"), urban regeneration ("застройку" now "реконструкции").

### Family
81. "raise / bring up a child" was listed twice; the second is now "start a family". "juggle work and family commitments" repeated "juggle work and family life"; now "strengthen family bonds". Both.
82. Essay phrase "filial responsibility has shifted to the state" made no sense (it is by definition the children's duty); now "responsibility for elderly care has increasingly shifted from children to the state". Both.
83. RU role model (wrong case), quality time, adolescence: fixed.

### Language
84. foreign language: "not spoken in your own country" is wrong (English is spoken in Kazakhstan and is still foreign there); now "not your first language and not normally spoken in your own country". EN and RU.
85. Item 2 "it is classed as" had nothing for "it" to refer to; now "the island's native language is now classed as". Item 7 now "proof of English proficiency". Both.
86. RU mother tongue: "выучивает" now "усваивает".

### Arts, science, animals
87. RU arts thought-provoking: made natural.
88. Science item 6: "evidence" (main table) fits as well as "empirical data"; key accepts both. Both.
89. RU animals animal welfare (grammar) and rewilding ("восстановление популяций").

### Business
90. Item 3 "small firms employ most of the population" (children and pensioners do not work) now "most of the workforce". Both.
91. Item 8 described offshoring ("moving production abroad") under the key "outsourcing", which the lesson defines as paying another company; the sentence now describes paying a foreign supplier. Both.
92. "part of every large firm's strategy" now "most large firms' strategies". Both.
93. RU customer service (agreement), bankruptcy (no subject), outsourcing: fixed.

### Traditions
94. Item 3 "Graduation and marriage are both a rite of passage that marks" now "both rites of passage that mark"; item 6 accepts "handed down" (taught in the collocations) with "passed down"; example "rather than written" now "rather than written down". Both.
95. RU communal (stray comma), national holiday, ceremony ("официальное" now "торжественное").

### Fashion
96. designer label: defined as clothing, but the example uses it as the brand name; now "the name of a famous fashion designer or company, or clothes sold under that name". EN and RU.
97. peer pressure to conform: widened to "dress and behave like the people around you". EN and RU.
98. "Mass-produced clothing is cheap but poorly made" now "often poorly made"; item 8 "turn away trainers" now "turn away anyone wearing trainers". Both.
99. RU self-expression: made natural.

### Volunteering
100. Item 10 had four lesson words that fit; now "The cancer ___ raises most of its money..." so only "charity" fits. Donation example softened from a universal claim. Both.
101. RU good cause ("морально оправдана" means justified), make a difference, work experience: fixed.

### Ageing
102. "Dementia will affect one in three people over eighty" was wrong (UK figures: about one in six over 80); now "Dementia affects about one in six people over eighty". Both.
103. "experience that cannot be trained quickly" now "gained quickly"; the mobility example softened to "can isolate older people as much as illness does". Both.
104. RU intergenerational: "затрагивающий" (affecting) now "объединяющий".

### Success
105. recognition: defined as "public", while item 10 says "Quiet recognition"; now "acknowledgement and appreciation". EN and RU.
106. Item 1 accepts "determination / hard work" (both taught) with "perseverance"; "meets setbacks" now "runs into setbacks" in the example and item 2; "the daily routine that reaches it" now "that gets you there". Both.
107. RU reward ("взамен за" mixes two fixed phrases) and hard work: fixed.

### Technology
108. The exercise instruction said "Match each word to its definition", but there is no word list and items 6 to 10 are gap fills; it now says what each half asks. EN and RU. Item 1 had two answers ("surveillance / algorithm") for a definition neither fitted; it is now the lesson's own definition of surveillance with one answer. Both.
109. Item 6 "Video cassettes became obsolete once films could be streamed" is historically wrong (DVDs replaced them); now "once DVDs arrived". Both.
110. Collocation "become / render something obsolete" ("become" takes no object) now "become obsolete / render something obsolete". Both.
111. artificial intelligence: "tasks requiring human-level intelligence" overstated; now "tasks that normally require human intelligence". EN, RU, word bank.
112. algorithm and automation now worded the same as in the AI lesson and word bank. EN and RU.
113. RU obsolete, cutting-edge, user-friendly (wrong part of speech or gender), surveillance ("плотное" now "пристальное"): fixed.

### All Russian topic lessons
114. The Russian line under "Go Further" had three different wordings for the same English sentence; the ten odd ones now use the wording the other 25 use.

### Word bank (`src/data/words.ts`)
Kept in step with the lessons above (items 5, 6, 10, 15, 20, 26, 58, 62, 63, 72, 111, 112). It also had
`visa restrictions` with the example "Loosened visa restrictions have led to..."; left as it is because
the travel lesson uses the same sentence and it is acceptable English.

`src/data/vocabulary.ts` and `src/lib/i18n/dict/ru/learning-vocab.ts`: read, nothing wrong apart from
the three card blurbs below, which I did not change because their Russian lives in a file I do not own.

## Left for Alex

- **Three headwords use American forms** next to British spelling: "four-day work week" (Work; the same
  lesson's phrase says "shorter working week"), "off the beaten path" (Places; Travel teaches "off the
  beaten track"), and "concentration span" (Books; "attention span" is more usual and is taught in
  Social Media). I did not rename them because a student's review progress is stored under the word
  itself, so renaming would reset it for anyone who has started that card. All three are understood and
  used in British English too. If you want them changed, it is a one-line change each plus the matching exercise key.
- **"Repeating the same basic words caps Lexical Resource at Band 6"** (overview) is a teaching
  simplification of the public descriptors (Band 7 asks for "less common lexical items"). I left it.
- **Linking words exercise** still has seven items while every topic has ten. Not wrong, just shorter.

## Seen but outside my files

- `src/lib/i18n/dict/ru/course-data.ts` lines 271-272, 279-280, 311-312, with the matching English in
  `src/data/vocabulary.ts` (the card blurbs; both files must change together or the Russian card falls back to English):
  - "Every Speaking test opens with your hometown." Not accurate: Part 1 opens with familiar topics
    (home, work or studies, interests), often "Do you work or study?". Suggested: "Many Speaking tests
    open with your hometown." RU: "Многие Speaking начинаются с вопросов о родном городе."
  - "Around 1 in 10 Task 2 essays." (Crime) and "The fastest-growing essay theme of 2026." (AI) are
    statistics with no source. Suggested: "A frequent Task 2 topic." / "One of the fastest-growing essay themes."
- `src/components/LearningDashboard.tsx` line 268 comment says "36 topics" (it counts linking words as
  a topic). The headline is computed, so nothing is wrong on screen; mentioned only so nobody "fixes" the overview count.

## Tests

`npm test`: 2481 tests, 2481 pass, 0 fail. `node tools/lesson-ru.mjs check --all`:
76 checked, 0 with problems. `npx astro check`: 0 errors, 0 warnings.
