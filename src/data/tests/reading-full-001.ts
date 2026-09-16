import type { PracticeTest } from '../../lib/tests/schema';

const test: PracticeTest = {
  "id": "reading-full-001",
  "skill": "reading",
  "title": "Academic Reading Test 1",
  "description": "A complete three-passage Academic Reading practice test with 40 questions.",
  "durationMinutes": 60,
  "source": {
    "name": "IELTS MASTER / PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-reading-test-319/",
    "permission": "Reused with publisher permission confirmed by Alex on 2026-09-11."
  },
  "parts": [
    {
      "label": "Passage 1",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 1",
        "title": "The problems and benefits created by the spread of the water hyacinth in Kenya",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>Water hyacinth (Eichhornia crassipes), an aquatic plant native to South America, first appeared in countries in Africa in the early 1900s. Scientists there called it the ‘world’s worst aquatic weed’, after it spread from the southernmost tip of Africa in the early 1900s and started obstructing major dams and rivers.</span>"
          },
          {
            "html": "<span>In east Africa the plant arrived with Belgian colonists in Rwanda, who liked the look of its glossy leaves and delicate purple flowers floating in their ponds. But by the 1980s, it had ‘escaped’ out of the country via the Kagera river and made its way downstream to Lake Victoria. There, with no natural predators and perfect temperature conditions, the plant began spreading in the open water, blocking fishing routes and providing a new habitat for disease-carrying mosquitoes.</span>"
          },
          {
            "html": "<span>For the women who smoke fish from the lake to sell it has meant declining income, as the boats that once brought the fish to shore by the hundreds struggle to navigate through the mass of plants. But water hyacinth isn’t their only headache. In order to smoke the fish that they buy, they must gather huge quantities of firewood, sometimes walking as far as 10km each way to collect enough to complete their work. And each day as they cook, they breathe in the thick, grey smoke. About three out of four families in Kenya depend on wood or charcoal to cook their daily meals, and the rate is even higher in rural areas, Kenya’s latest demographic and health survey shows. </span><span>Using solid fuels like these for cooking increases indoor pollution. The World Health Organization estimates that about 14,300 Kenyans die annually as a result of indoor air pollution – most of which is caused by cooking and heating sources.</span>"
          },
          {
            "html": "<span>Some years ago, on the shores of Lake Victoria, huge piles of water hyacinth that villagers had taken out of the water in an attempt to clear it were a common sight. But buried in those decaying waxy leaves was a renewable energy gold mine. It turns out the floating plant isn’t just good at spreading – its foliage also contains a high ratio of carbon to nitrogen. It’s a magic combination that has captivated researchers’ imaginations since as early as the 1980s when, across the world, they began to explore its potential as a biofuel. Just about 4kg of the dried plant would be enough to cater for a large family’s daily energy needs, early research predicted.</span>"
          },
          {
            "html": "<span>In 2014, Nigerian academics announced they had got better yields of biofuel gas when they mixed the plant with chicken manure. A few years later, Kenyan scientists confirmed what their Nigerian peers and others had already found: manure worked to improve the process of converting the weed into gas.</span>"
          },
          {
            "html": "<span>In 2018, the technology came to a village on the shore of Lake Victoria, called Dunga. The project promised a two-for-one solution to the dual menaces of the water hyacinth and dependence on firewood. The community received a pair of donated biogas digesters – machines that would transform a mix of water hyacinth and cow dung into biogas for cooking.</span>"
          },
          {
            "html": "<span>The digesters work a bit like a stomach. The mixture goes in one end – think of it as a mouth – and over the next 20 to 30 days, it goes through a fermentation process and breaks down, giving off gas that comes out the other end. From there, the clean-burning gas is passed through pipes to the point of use, just like traditional domestic gas. In Dunga, the machines produce enough gas to serve about 60% of the village’s population, it is used in domestic stoves and for other household tasks such as purifying water and incubating chicks.</span>"
          },
          {
            "html": "<span>The project is testing whether biogas can provide an effective alternative to firewood and charcoal in rural Kenyan communities. Results indicate that the programme seems to be working. The women who smoke the lake fish are already getting sick less often. Besides, they don’t have to devote a lot of time every day to gathering firewood, which is a great relief. As a result, they’re able to make more money for their families from other enterprises.</span>"
          },
          {
            "html": "<span>Kanyiva Muindi is an epidemiologist and air pollution research fellow at the African Population and Health Research Centre in Nairobi. She says families who switch to the smokeless cooking method could expect fewer respiratory diseases. Women, young girls and children are particularly vulnerable because they are the ones who cook in the kitchen or outside overfires. </span><span>How much better the biogas stoves will be for the community’s health still needs more research, says Dominic Kahumbu Wanjihia, Biogas International’s chief executive. But unless the price of the machines drops, it’s pretty clear that most communities will never be able to afford any, since they sell for about $750.</span>"
          },
          {
            "html": "<span>Kanyiva says affordability is a challenge worth addressing, given the huge health and environmental dangers posed by ‘dirty’ fuels such as wood, charcoal and kerosene. If biogas could become affordable on a large scale, she says it ‘would be life-changing for millions on the African continent and beyond’.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 1-7",
          "type": "tfng",
          "instructionHtml": "Do the following statements agree with the information given in reading passage? In boxes 1-7 on your answer sheet, write",
          "questions": [
            {
              "id": "q1",
              "answer": "True",
              "textHtml": "Water hyacinth was introduced as a decorative plant in east Africa",
              "explanation": "The second paragraph says Belgian colonists in Rwanda ‘liked the look of its glossy leaves and delicate purple flowers’, showing it was valued as an ornamental plant, matching ‘decorative’.",
              "evidence": "who liked the look of its glossy leaves and delicate purple flowers floating in their ponds"
            },
            {
              "id": "q2",
              "answer": "False",
              "textHtml": "Fishermen took some water hyacinth plants to Lake Victoria",
              "explanation": "The passage says the plant ‘escaped’ from Rwanda into Lake Victoria on its own via the Kagera river, not that fishermen carried it there, so this contradicts the text.",
              "evidence": "it had ‘escaped’ out of the country via the Kagera river and made its way downstream to Lake Victoria"
            },
            {
              "id": "q3",
              "answer": "True",
              "textHtml": "It is now difficult to force boats through the thick water hyacinth on Lake Victoria",
              "explanation": "The third paragraph says fishing boats now ‘struggle to navigate through the mass of plants’, confirming that moving boats through the hyacinth is difficult.",
              "evidence": "the boats that once brought the fish to shore by the hundreds struggle to navigate through the mass of plants"
            },
            {
              "id": "q4",
              "answer": "Not given",
              "textHtml": "Chemicals produced by the water hyacinth plants are affecting the numbers offish in Lake Victoria",
              "explanation": "The passage explains hyacinth blocks fishing routes and shelters mosquitoes, but it never mentions any chemicals released by the plant harming fish numbers, so there is no information on this."
            },
            {
              "id": "q5",
              "answer": "Not given",
              "textHtml": "Cooking with charcoal has been proved to be even worse for people’s health than cooking with wood",
              "explanation": "The passage discusses indoor pollution from wood and charcoal together but never compares the two fuels or says charcoal is worse for health, so there is no information on this."
            },
            {
              "id": "q6",
              "answer": "False",
              "textHtml": "People found it impossible to remove much water hyacinth from Lake Victoria",
              "explanation": "The fourth paragraph shows villagers had taken ‘huge piles of water hyacinth’ out of the water, so removal was possible, contradicting the claim that it was impossible.",
              "evidence": "huge piles of water hyacinth that villagers had taken out of the water in an attempt to clear it"
            },
            {
              "id": "q7",
              "answer": "True",
              "textHtml": "Scientists started investigating the possibility of using water hyacinth to generate biogas in the last century",
              "explanation": "The fourth paragraph says researchers began exploring the plant as a biofuel ‘as early as the 1980s’, which falls within the 20th century, the last century.",
              "evidence": "captivated researchers’ imaginations since as early as the 1980s when, across the world, they began to explore its potential as a biofuel"
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>TRUE</dt><dd>if the statement agrees with the information</dd><dt>FALSE</dt><dd>if the statement contradicts the information</dd><dt>NOT GIVEN</dt><dd>if there is no information on this</dd></dl>"
        },
        {
          "title": "Questions 8-10",
          "type": "sentence-completion",
          "instructionHtml": "Complete the flow-chart below. Choose NO MORE THAN TWO WORDS from the passage for each answer. Write your answers in boxes 8-10 on your answer sheet.",
          "questions": [
            {
              "id": "q8",
              "answer": "Cow dung",
              "explanation": "The sixth paragraph explains the digesters turn ‘a mix of water hyacinth and cow dung into biogas’, giving the exact words needed for this gap.",
              "evidence": "would transform a mix of water hyacinth and cow dung into biogas for cooking"
            },
            {
              "id": "q9",
              "answer": "Fermentation",
              "explanation": "The seventh paragraph describes the mixture going ‘through a fermentation process’ before it breaks down and releases gas, matching this gap.",
              "evidence": "over the next 20 to 30 days, it goes through a fermentation process and breaks down"
            },
            {
              "id": "q10",
              "answer": "Pipes",
              "explanation": "The same paragraph states the gas ‘is passed through pipes to the point of use’, giving the word needed here.",
              "evidence": "the clean-burning gas is passed through pipes to the point of use"
            }
          ],
          "legendHtml": "<p><span>Generating biogas for domestic use in Dunga</span><br/>\n<span>• First, place water hyacinth together with some (8) …………….. into a digestor</span><br/>\n<span>• Leave the mixture until the (9) ………… is completed</span><br/>\n<span>• Capture the gas emitted by the digester and use (10) ………….. to transport it to individual homes</span><br/>\n<span>• Then use the gas for cooking as well as making water fit for human consumption</span></p>",
          "wordLimit": 2
        },
        {
          "title": "Questions 11-13",
          "type": "sentence-completion",
          "instructionHtml": "Complete the notes below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 11-13 on your answer sheet.",
          "questions": [
            {
              "id": "q11",
              "answer": "Time",
              "explanation": "The eighth paragraph says the women ‘don’t have to devote a lot of time every day to gathering firewood’, matching this gap about what they no longer need to spend.",
              "evidence": "they don’t have to devote a lot of time every day to gathering firewood"
            },
            {
              "id": "q12",
              "answer": "Money",
              "explanation": "The same paragraph continues that the women ‘are able to make more money for their families from other enterprises’, giving the word for this gap.",
              "evidence": "they’re able to make more money for their families from other enterprises"
            },
            {
              "id": "q13",
              "answer": "Price",
              "explanation": "The ninth paragraph gives the drawback that ‘unless the price of the machines drops’ most communities cannot afford them, matching this gap.",
              "evidence": "unless the price of the machines drops, it’s pretty clear that most communities will never be able to afford any"
            }
          ],
          "legendHtml": "<p><strong><span>Cooking with biogas in Dunga</span></strong></p><p><span>Benefits for the women in the village of cooking with biogas</span><br/>\n<span>• no need for them to spend so much (11) ………………. collecting fuel</span><br/>\n<span>• they can focus on different tasks that bring in (12) ……………</span><br/>\n<span>• they are less likely to experience certain diseases connected to burning wood</span></p><p><strong><span>Drawbacks of changing to biogas</span></strong><br/>\n<span>• the (13) ………………… of the digesters is beyond the reach of most villages</span></p>",
          "wordLimit": 1
        }
      ]
    },
    {
      "label": "Passage 2",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 2",
        "title": "How could multilingualism benefit India’s poorest schoolchildren?",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>The crowded and bustling streets of Delhi teem with life. Stop to listen and, above the din of rickshaws and buses, you’ll hear a multitude of languages, as more than 20 million people go about their daily lives. Many were born and raised here, and many millions more have recently made India’s capital their home, having moved from surrounding neighbourhoods, cities and states or across the country, often in the hope of gaining better jobs and a better life. Some arrive speaking fluent Hindi, the dominant language in Delhi (and the official language of government), but many arrive speaking any number of India’s 22 officially recognised languages, let alone the hundreds of regional languages in a country of more than 1.3 billion people.</span>"
          },
          {
            "html": "<span>A team of researchers led by Professor Ianthi Tsimpli of Cambridge University is currently working on a project collecting data on 1,000 primary-age children in Delhi and the cities of Hyderabad and Bihar. The overriding aim of the four-year project, called ‘Multilingualism and Multiliteracy’, is to find out why in a country where multilingualism is so common (more than 255 million people in India speak at least two languages, and nearly 90 million speak three or more languages), the many benefits of speaking more than one language, observed in schools in Europe for instance, do not apply to many of India’s schoolchildren.</span>"
          },
          {
            "html": "<span>‘Each year across India, 600,000 children are tested, and year after year over 50% of children in Standard 5 [ten-year-olds] cannot read a Standard 2 [seven-year-olds] task fluently, and just under 50% of them cannot solve a Standard 2 subtraction task,’ says Tsimpli. She explains that low educational achievement can lead to many of these students dropping out of school – a problem disproportionately affecting female students.</span>"
          },
          {
            "html": "<span>Tsimpli and her colleagues are investigating whether these low learning outcomes could be caused by an Indian school system where the language that children are taught in often differs from the language used at home. The research project, which focuses on 8 to 11-year- old schoolchildren in rural and urban areas, collects data on whether the schoolchildren live in slum* or non-slum areas. Many of the children have moved from remote, rural areas to urban areas. They are so poor they have to live in slums and, as a result of migration, they may speak languages that are different from the regional language.</span>"
          },
          {
            "html": "<span>Having already tested 1,000 children, the researchers will now embark on retesting them. They intend to look not only at test results, but also at variables such as the standard of schooling, the environment and the teaching practices themselves. It’s possible that one of the causes of low performance is the lack of pupil-centred teaching methods; in many Indian primary schools the teacher dominates and there is little room for independent learning.</span>"
          },
          {
            "html": "<span>Although the findings are at a preliminary stage, Tsimpli and her team have found that the medium of instruction used in schools, especially English, may hold back those children who have little familiarity with, or exposure to, the language before starting school and outside of school life. According to Tsimpli, most of the evidence from this and other projects shows that English instruction for children from low socio-economic areas might not be the best way for them to learn, at least in the first three years of primary education.</span>"
          },
          {
            "html": "<span>‘What we would recommend for everyone, not just low socio-economic status children, would be to start learning in the language they feel comfortable learning in … English can still be used, but perhaps not as the medium of instruction in primary schools. It could, for example, be one of the subjects that are being taught alongside other subjects. We are not suggesting that English be withdrawn – that ship has sailed – but we perhaps have to think more about learner needs. There is perhaps too much uniformity in teaching and less tailoring to the children’s language abilities and needs,’ says Tsimpli.</span>"
          },
          {
            "html": "<span>While the preliminary results show there is no difference in general intelligence among boys and girls from slum areas versus those from urban poor backgrounds, an unanticipated finding has been that children from slum backgrounds do not seem to lag behind children from other urban poor backgrounds – and in some cases outperform them (e.g. in numeracy and literacy tasks). According to the researchers, this unexpected finding may be down to the life experiences of children growing up in slums. They are likely to mature faster and come into closer contact with the numeracy skills essential for day-to-day survival.</span>"
          },
          {
            "html": "<span>The project has already caught the attention of government ministers, who are keen to use the findings of the study to inform and adjust school policy in Delhi and the wider state. ‘They are as keen as us to understand how the challenging context of deprivation can be attenuated when focusing on the languages children learn and use while at school. Our findings don’t mean you’re doomed if you’re poor. It may be that these low learning outcomes are because of the way education is provided in India, with a huge focus on Hindi and English as the mediums of instruction, to the potential detriment of children unfamiliar with those languages,’ explains Tsimpli.</span>"
          },
          {
            "html": "<span>‘Language is central to the way knowledge is transferred – so the medium of instruction is obviously hugely influential. We hope to … show that problem solving, numeracy and literacy can and do improve in children who are educated in a language of instruction they know. The trick may be to bridge school skills with life skills and make use of the richness of a child’s life experience to help them learn in the most effective ways possible,’ says Tsimpli.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 14-19",
          "type": "matching-features",
          "instructionHtml": "Complete the summary using the list of words, A-J, below. Write the correct letter, A-J, in boxes 14-19 on your answer sheet.",
          "questions": [
            {
              "id": "q14",
              "answer": "I",
              "textHtml": "………………… and as you walk through its streets you hear people speaking a variety of languages. Some of them have spent their entire life in Delhi, while others are",
              "explanation": "The opening paragraph describes Delhi’s ‘crowded and bustling streets’ and more than 20 million people, so option I, ‘dense population’, completes the summary.",
              "evidence": "The crowded and bustling streets of Delhi teem with life"
            },
            {
              "id": "q15",
              "answer": "J",
              "textHtml": "……………….. Whether they have come from a",
              "explanation": "The passage notes many people ‘have recently made India’s capital their home’, matching option J, ‘new immigrants’.",
              "evidence": "many millions more have recently made India’s capital their home"
            },
            {
              "id": "q16",
              "answer": "H",
              "textHtml": "……………….. or have travelled from the other side of India, they have all come in search of things such as improved",
              "explanation": "The passage contrasts people who moved from ‘surrounding neighbourhoods, cities and states’ with those from further away, so option H, ‘nearby district’, fits the first group.",
              "evidence": "having moved from surrounding neighbourhoods, cities and states or across the country"
            },
            {
              "id": "q17",
              "answer": "B",
              "textHtml": "………………. A team of researchers led by Professor lanthi Tsimpli of Cambridge University is collecting data on primary-age schoolchildren in Delhi and other Indian cities. The",
              "explanation": "The passage says people came ‘in the hope of gaining better jobs and a better life’, matching option B, ‘employment opportunities’.",
              "evidence": "in the hope of gaining better jobs and a better life"
            },
            {
              "id": "q18",
              "answer": "E",
              "textHtml": "………………. of the research is to discover why multilingual Indian schoolchildren do not experience",
              "explanation": "The second paragraph calls this ‘the overriding aim of the four-year project’, matching option E, ‘primary objective’.",
              "evidence": "The overriding aim of the four-year project"
            },
            {
              "id": "q19",
              "answer": "F",
              "textHtml": "………………….. to those that multilingual schoolchildren in Europe experience. A basic outlook B employment opportunities C wealthy visitors D distant country E primary objective F similar advantages G thriving economy J new immigrants H nearby district I dense population",
              "explanation": "The passage asks why Indian schoolchildren do not get ‘the many benefits’ seen in European schools, matching option F, ‘similar advantages’.",
              "evidence": "the many benefits of speaking more than one language, observed in schools in Europe for instance, do not apply to many of India’s schoolchildren"
            }
          ],
          "legendHtml": "<p><strong><span>Question 14-19</span></strong></p><p><strong><span>Multilingualism in Delhi</span></strong></p><p><span>The city of Delhi has a (14) ………………… and as you walk through its streets you hear people speaking a variety of languages. Some of them have spent their entire life in Delhi, while others are (15) ……………….. Whether they have come from a (16) ……………….. or have travelled from the other side of India, they have all come in search of things such as improved (17) ……………….</span></p><p><span>A team of researchers led by Professor lanthi Tsimpli of Cambridge University is collecting data on primary-age schoolchildren in Delhi and other Indian cities. The (18) ………………. of the research is to discover why multilingual Indian schoolchildren do not experience (19) ………………….. to those that multilingual schoolchildren in Europe experience.</span></p><p><span><strong>A</strong> basic outlook</span><br/>\n<span><strong>B</strong> employment opportunities</span><br/>\n<span><strong>C</strong> wealthy visitors</span><br/>\n<span><strong>D</strong> distant country</span><br/>\n<span><strong>E</strong> primary objective</span><br/>\n<span><strong>F</strong> similar advantages</span><br/>\n<span><strong>G</strong> thriving economy</span><br/>\n<span><strong>J</strong> new immigrants</span><br/>\n<span><strong>H</strong> nearby district</span><br/>\n<span><strong>I</strong> dense population</span></p>",
          "options": [
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J"
          ]
        },
        {
          "title": "Questions 20-23",
          "type": "yes-no-notgiven",
          "instructionHtml": "Do the following statements agree with the claims of the writer in reading passage? In boxes 20-23 on your answer sheet, write",
          "questions": [
            {
              "id": "q20",
              "answer": "No",
              "textHtml": "Ten-year-old Indian schoolchildren tend to perform better in literacy tests than in numeracy tests",
              "explanation": "The third paragraph shows over 50% fail a reading task while just under 50% fail a maths task, so literacy performance is if anything worse, not better, than numeracy, contradicting the statement.",
              "evidence": "over 50% of children in Standard 5 [ten-year-olds] cannot read a Standard 2 [seven-year-olds] task fluently, and just under 50% of them cannot solve a Standard 2 subtraction task"
            },
            {
              "id": "q21",
              "answer": "Not given",
              "textHtml": "Tsimpli had problems convincing some female students to take part in the study",
              "explanation": "The passage says low achievement makes girls more likely to drop out, but it never says Tsimpli had trouble persuading female students to join the study, so this is not given."
            },
            {
              "id": "q22",
              "answer": "Yes",
              "textHtml": "Tsimpli and her team wanted to know if there is a connection between poor academic performance and being taught in an unfamiliar language",
              "explanation": "The fourth paragraph says the researchers are ‘investigating whether these low learning outcomes could be caused by’ a mismatch between school and home language, matching the statement.",
              "evidence": "investigating whether these low learning outcomes could be caused by an Indian school system where the language that children are taught in often differs from the language used at home"
            },
            {
              "id": "q23",
              "answer": "No",
              "textHtml": "The researchers have decided against investigating the impact teaching methodology may have on learning outcomes",
              "explanation": "The fifth paragraph says the team will look ‘also at variables such as… the teaching practices themselves’, so they have not ruled out studying teaching methods, contradicting the statement.",
              "evidence": "they intend to look not only at test results, but also at variables such as the standard of schooling, the environment and the teaching practices themselves"
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>YES</dt><dd>if the statement agrees with the claims of the writer</dd><dt>NO</dt><dd>if the statement contradicts the claims of the writer</dd><dt>NOT GIVEN</dt><dd>if it is impossible to say what the writer thinks about this</dd></dl>"
        },
        {
          "title": "Questions 24-26",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter, A, B, C or D.",
          "questions": [
            {
              "id": "q24",
              "answer": "C",
              "textHtml": "What point does the writer make about primary schools in India in the sixth paragraph?",
              "options": [
                "Exposure to English outside of school is of limited benefit",
                "Children learn English more easily when they are well motivated",
                "Poor children may be disadvantaged further by being instructed in English",
                "There is little consistency across schools with regard to instruction in English"
              ],
              "explanation": "The sixth paragraph says English instruction ‘may hold back those children who have little familiarity with’ the language, matching option C.",
              "evidence": "the medium of instruction used in schools, especially English, may hold back those children who have little familiarity with, or exposure to, the language"
            },
            {
              "id": "q25",
              "answer": "D",
              "textHtml": "What is Tsimpli suggesting when she uses the phrase ‘that ship has sailed’?",
              "options": [
                "The findings of the report may be of little help to some Indian schoolchildren",
                "Instruction in English could be better adapted to the needs of schoolchildren",
                "Schools have had limited success in teaching English as a separate subject",
                "It is too late to remove English completely as a language of instruction in schools"
              ],
              "explanation": "Tsimpli says English will not be withdrawn because ‘that ship has sailed’, meaning it is too late to remove it from schools, matching option D.",
              "evidence": "that ship has sailed"
            },
            {
              "id": "q26",
              "answer": "D",
              "textHtml": "In the eighth paragraph, what do we learn has surprised researchers?",
              "options": [
                "Boys and girls from low socio-economic groups have similar general intelligence levels",
                "The age at which children move into a slum does not affect their academic performance",
                "Slum children and children from other urban poor backgrounds have similar life experiences",
                "The literacy and numeracy skills of slum children are not lower than those of children from other urban poor backgrounds"
              ],
              "explanation": "The eighth paragraph’s ‘unanticipated finding’ is that slum children ‘do not seem to lag behind’ others and sometimes outperform them, matching option D.",
              "evidence": "children from slum backgrounds do not seem to lag behind children from other urban poor backgrounds"
            }
          ]
        }
      ]
    },
    {
      "label": "Passage 3",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 3",
        "title": "The Globemakers: The Curious Story of an Ancient Craft",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>In 2008, Peter Bellerby, who lived in London, wanted to give his father a model globe for his eightieth birthday. What seemed simple enough to start with triggered an almost obsessive, decade-long journey, marked by a series of obstacles that would have deterred anyone less determined. It ended with his establishing the world’s only bespoke globemaking company.</span>"
          },
          {
            "html": "<span>The first surprise in The Globemakers, Bellerby’s account of this impulsive enterprise, is that obtaining such a globe was not simply a matter of a quick online order and a repressed sigh at the shipping costs. After all, contrary to stubbornly held popular views of our ancestors’ geographical ignorance, we have known that the world is spherical since at least the 6th century BCE. The ancient Greek philosopher Plato in his work Phaedo likened it to a leather ball, while the accolade of producing the first recorded globe goes to the ancient Greek philosopher Crates of Mallus, who is said to have made one in around 150 BCE. Surely, Bellerby reasoned, a good-quality globe wouldn’t be difficult to find.</span>"
          },
          {
            "html": "<span>Nearly two millennia later, however, it seemed that the art of globemaking had been largely forgotten. Bellerby came across shoddy commercial versions designed for school classrooms and genuine antiques in auction houses that would have bust his budget. Even his trips to Morocco and India, where surely the knowledge of artisan cartographers had been preserved, drew a blank.</span>"
          },
          {
            "html": "<span>Not one to be easily thwarted, Bellerby decided to make his own good-quality globe. In the process, almost everything that could possibly go wrong did so. Even the shape of the Earth posed a problem, as it is not quite a perfect sphere, but oblate (slightly flattened at the poles). Having decided to compromise and opt for two half-spherical pieces that could be fitted together, he was unable to discover anyone capable of casting moulds with sufficient accuracy to ensure that he would not be left with two half-spheres that were not quite the same circumference. Even after he eventually resolved this issue, extracting these from the moulds resulted in piles of cracked plaster of Paris and clouds of choking dust in the workshop he had set up at the rear of his house.</span>"
          },
          {
            "html": "<span>This series of abortive experiments taught Bellerby a lot about the challenges of making globes, which he communicates here to the reader. Finding just the right way to prise the globes from the mould – a high-end air compressor finally did the trick – and locating the right paper and inks with which to make the gores (the sections of flat sheet mapping that are pasted onto the spherical globe) without the ink seeping out to create a mushy, unreadable mess took months and an alarming chunk out of his bank balance. Bellerby’s frustration at the painstaking process of attaching the gores to the globe surface – after having found a glue with precisely the right adhesive qualities – is palpable. Right at the end of the process, he learnt that the paper had stretched slightly and so the final one overlapped the first by a centimetre (which may not seem a great deal, but when that represents 2 per cent of the Earth’s diameter, it’s equivalent to obliterating the Himalayas or wiping out Chile).</span>"
          },
          {
            "html": "<span>Bellerby’s account of the technical challenges of globe production is interspersed with a series of interludes on great globemakers of the past and cartographic history in general. Purists might wish for more map-making details, but Bellerby clearly found a kindred spirit in Martin Behaim. He was the Nuremberg entrepreneur who in 1492 created the Erdapfel, the world’s oldest surviving globe, beautifully finished by a workshop of painters and other craftsmen, only to find that the explorer Christopher Columbus had stumbled upon the Americas the very same year, rendering his masterpiece instantly out of date. Something of Bellerby’s unflinching ambition is reflected in the even more heroic efforts of the Italian cartographer Vincenzo Coronelli, who, in the seventeenth century, created two globes for Louis XIV of France. It took him twenty years to complete the monstrous pair, whose vast bulk – each with a diameter of around four metres – can still be admired in the National Library of France in Paris.</span>"
          },
          {
            "html": "<span>Although a celebration of the revival of an ancient craft, Bellerby’s book is also a lament for the fading away of centuries-old traditions. When he embarked on his globemaking odyssey, he struggled to find artisans with the skills to make the right moulds for the globes or foundries that could shape the meridians (the metal frames which girdle globes) in just the right way. Although he finally located the right craftsmen, some simply dropping in, serendipitously, to his workshop (by now in more suitable premises than his back room), many of these have now retired or passed away.</span>"
          },
          {
            "html": "<span>Bellerby’s father finally did receive his eightieth birthday present, albeit two years late. Bellerby went on to found a company which now turns out over six hundred globes a year for customers who can have their own tiny village marked or more unusual requests fulfilled. His book, beautifully illustrated with photographs of the various stages of his venture and a few illustrations of historic globes and maps, is hardly a blueprint for commercial success. But it is more than enough to stir up admiration for the craftsmanship of the great mapmakers of the past and the obsessive determination of a modern successor who revived their almost moribund art.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 27-32",
          "type": "matching-features",
          "instructionHtml": "Complete the summary using the list of words, A-J, below. Write the correct letter, A-J, in boxes 27-32 on your answer sheet",
          "questions": [
            {
              "id": "q27",
              "answer": "G",
              "textHtml": "……………… for which he had to overcome",
              "explanation": "The opening paragraph describes the project as ‘an almost obsessive, decade-long journey’ full of obstacles, matching option G, ‘challenging task’.",
              "evidence": "triggered an almost obsessive, decade-long journey, marked by a series of obstacles"
            },
            {
              "id": "q28",
              "answer": "J",
              "textHtml": "…………….. He soon learnt that a straightforward",
              "explanation": "The same sentence lists ‘a series of obstacles that would have deterred anyone less determined’, matching option J, ‘numerous problems’.",
              "evidence": "marked by a series of obstacles that would have deterred anyone less determined"
            },
            {
              "id": "q29",
              "answer": "I",
              "textHtml": "……………….. would not be possible. Some",
              "explanation": "The second paragraph shows buying a globe was ‘not simply a matter of a quick online order’, matching option I, ‘internet purchase’.",
              "evidence": "obtaining such a globe was not simply a matter of a quick online order"
            },
            {
              "id": "q30",
              "answer": "C",
              "textHtml": "………………… that had been intended for",
              "explanation": "The third paragraph mentions ‘shoddy commercial versions designed for school classrooms’, matching option C, ‘inferior makes’.",
              "evidence": "shoddy commercial versions designed for school classrooms"
            },
            {
              "id": "q31",
              "answer": "A",
              "textHtml": "………………. were available, as were some expensive antique globes, but these were beyond his budget. He even travelled to places where people might still have the",
              "explanation": "The same sentence links those inferior globes to being ‘designed for school classrooms’, matching option A, ‘educational use’.",
              "evidence": "shoddy commercial versions designed for school classrooms"
            },
            {
              "id": "q32",
              "answer": "E",
              "textHtml": "…………………….. but Bellerby could not find what he wanted. A educational use B rare materials C inferior makes D product exchange markets E necessary skills F international G challenging task H memorable object I internet purchase J numerous problems",
              "explanation": "The third paragraph says his trips to Morocco and India, ‘where surely the knowledge of artisan cartographers had been preserved, drew a blank’, matching option E, ‘necessary skills’.",
              "evidence": "his trips to Morocco and India, where surely the knowledge of artisan cartographers had been preserved, drew a blank"
            }
          ],
          "legendHtml": "<p><strong><span>A birthday gift</span></strong></p><p><span>Peter Bellerby’s plan to give his father a globe for his birthday was an unexpectedly (27) ……………… for which he had to overcome (28) ……………..</span></p><p><span>He soon learnt that a straightforward (29) ……………….. would not be possible. Some (30) ………………… that had been intended for (31) ………………. were available, as were some expensive antique globes, but these were beyond his budget.</span></p><p><span>He even travelled to places where people might still have the (32) …………………….. but Bellerby could not find what he wanted.</span></p><p><span><strong>A</strong> educational use</span><br/>\n<span><strong>B</strong> rare materials</span><br/>\n<span><strong>C</strong> inferior makes</span><br/>\n<span><strong>D</strong> product exchange markets</span><br/>\n<span><strong>E</strong> necessary skills</span><br/>\n<span><strong>F</strong> international</span><br/>\n<span><strong>G</strong> challenging task</span><br/>\n<span><strong>H</strong> memorable object</span><br/>\n<span><strong>I</strong> internet purchase</span><br/>\n<span><strong>J</strong> numerous problems</span></p>",
          "options": [
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J"
          ]
        },
        {
          "title": "Questions 33-36",
          "type": "yes-no-notgiven",
          "instructionHtml": "Do the following statements agree with the claims of the writer in reading passage? In boxes 33-36 on your answer sheet, write",
          "questions": [
            {
              "id": "q33",
              "answer": "No",
              "textHtml": "The assumption today that people in the past knew very little about geography is correct",
              "explanation": "The second paragraph states we have ‘known that the world is spherical since at least the 6th century BCE’, directly contradicting the popular assumption that ancient people knew little about geography.",
              "evidence": "contrary to stubbornly held popular views of our ancestors’ geographical ignorance, we have known that the world is spherical since at least the 6th century BCE"
            },
            {
              "id": "q34",
              "answer": "Not given",
              "textHtml": "Plato was criticised for saying the world was shaped like a leather ball",
              "explanation": "The passage says Plato compared the world to a leather ball but never mentions any criticism he received for this, so it is not given."
            },
            {
              "id": "q35",
              "answer": "Not given",
              "textHtml": "The globe made by Crates of Mallus was an accurate representation of the known world",
              "explanation": "The passage credits Crates of Mallus with making the first recorded globe but says nothing about how accurate it was, so this is not given."
            },
            {
              "id": "q36",
              "answer": "Yes",
              "textHtml": "Bellerby assumed he would have few problems locating a well-made globe",
              "explanation": "The second paragraph says Bellerby reasoned ‘a good-quality globe wouldn’t be difficult to find’, matching the statement that he expected few problems.",
              "evidence": "Surely, Bellerby reasoned, a good-quality globe wouldn’t be difficult to find"
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>YES</dt><dd>if the statement agrees with the claims of the writer</dd><dt>NO</dt><dd>if the statement contradicts the claims of the writer</dd><dt>NOT GIVEN</dt><dd>if it is impossible to say what the writer thinks about this</dd></dl>"
        },
        {
          "title": "Questions 37-40",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter, A, B, C or D,",
          "questions": [
            {
              "id": "q37",
              "answer": "B",
              "textHtml": "When Bellerby had to attach the gores to the globe surface,",
              "options": [
                "he decided it was best to work quickly",
                "he became aware of an unexpected issue",
                "he was worried about the quality of his materials",
                "he nearly gave up the whole project"
              ],
              "explanation": "The fifth paragraph describes Bellerby learning late in the process that the paper had stretched and the gores overlapped, an unexpected issue with his materials, matching option B.",
              "evidence": "he learnt that the paper had stretched slightly and so the final one overlapped the first by a centimetre"
            },
            {
              "id": "q38",
              "answer": "C",
              "textHtml": "The reviewer mentions other globe makers of the past because",
              "options": [
                "Bellerby was particularly inspired by them",
                "their achievements are not widely known",
                "Bellerby had something in common with each of them",
                "their difficulties could have been avoided"
              ],
              "explanation": "The sixth paragraph says Bellerby ‘found a kindred spirit’ in Behaim and shows shared ambition with Coronelli, so the other globemakers share something with Bellerby, matching option C.",
              "evidence": "Bellerby clearly found a kindred spirit in Martin Behaim"
            },
            {
              "id": "q39",
              "answer": "D",
              "textHtml": "What point is made about Bellerby in the seventh paragraph?",
              "options": [
                "He had long working relationships with numerous craftsmen",
                "He understands the lack of interest in traditional crafts",
                "He appreciates the importance of careful planning",
                "He regrets the loss of many globe-making skills"
              ],
              "explanation": "The seventh paragraph, on the ‘fading away of centuries-old traditions’, shows many skilled craftsmen ‘have now retired or passed away’, matching option D, that Bellerby regrets the loss of skills.",
              "evidence": "a lament for the fading away of centuries-old traditions"
            },
            {
              "id": "q40",
              "answer": "A",
              "textHtml": "What does the reviewer say about Bellerby’s book in the final paragraph?",
              "options": [
                "It does not tell you how to create a profitable business",
                "It overlooks some important mapmakers",
                "It fails to discuss the future of globe-making",
                "It does not give enough details about individual customers"
              ],
              "explanation": "The final paragraph says the book ‘is hardly a blueprint for commercial success’, matching option A, that it does not explain how to run a profitable business.",
              "evidence": "hardly a blueprint for commercial success"
            }
          ]
        }
      ]
    }
  ]
};

export default test;
