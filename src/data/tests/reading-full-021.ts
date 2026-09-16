import type { PracticeTest } from '../../lib/tests/schema';

const test: PracticeTest = {
  "id": "reading-full-021",
  "skill": "reading",
  "title": "Academic Reading Test 21",
  "description": "A complete three-passage Academic Reading practice test with 40 questions.",
  "durationMinutes": 60,
  "source": {
    "name": "IELTS MASTER / PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-reading-test-297/",
    "permission": "Reused with publisher permission confirmed by Alex on 2026-09-11."
  },
  "parts": [
    {
      "label": "Passage 1",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 1",
        "title": "Please hold the line",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>Nearly all of us know what it’s like to be put on ‘musical hold’. Call almost any customer service number, and you can expect to hear at least a few bars of boring elevator music before an operator picks up. The question is: do you hang up or do you keep holding? That may depend on your gender and what type of music is playing, according to research reported by University of Cincinnati Associate Professor of Marketing, James Kellaris.</span>"
          },
          {
            "html": "<span>Kellaris, who has studied the effects of music on consumers for more than 12 years, teamed with Sigma Research Management Group to evaluate the effects of ‘hold music’ for a company that operates a customer service line.</span>"
          },
          {
            "html": "<span>The researchers tested four types of ‘on-hold’ music with 71 of the company’s clients, 30 of them women. Light jazz, classical, rock and the company’s current format of adult alternative (a mix of contemporary styles) were all tested. The sample included individual consumers, small business and large business segments. Participants were asked to imagine calling a customer assistance line and being placed on hold. They were then exposed to ‘on-hold’ music via headsets and asked to estimate how long it played. Their reactions and comments were also solicited and quantified by the researchers.</span>"
          },
          {
            "html": "<span>Service providers, of course don’t want you to have to wait on hold, but if you do, they want it to be a pleasant experience for you. But Kellaris’ conclusions may hold some distressing news for companies. No matter what music was played, the time spent ‘on hold’ was generally overestimated. The actual wait in the study was 6 minutes, but the average estimate was 7 minutes and 6 seconds.</span>"
          },
          {
            "html": "<span>He did find some good news for the client who hired him. The kind of music they’re playing now, alternative, is probably their best choice. Two things made it a good choice. First, it did not produce significantly more positive or negative reactions in people. Second, males and females were less polarised in their reactions to this type of music.</span>"
          },
          {
            "html": "<span>Kellaris’ other findings, however, make the state of musical hold a little less firm: time spent ‘on hold’ seemed slightly shorter when light jazz was played, but the effect of music format differed for men and women. Among the males, the wait seemed shortest when classical music was played. Among the females, the wait seemed longest when classical music was played. This may be related to differences in attention levels and musical preferences.</span>"
          },
          {
            "html": "<span>In general, classical music evoked the most positive reactions among males; light jazz evoked the most positive reactions (and shortest waiting time estimates) among females. Rock was the least preferred across both gender groups and produced the longest waiting time estimates. ‘The rock music’s driving beat kind of aggravates people calling customer assistance with a problem,’ said Kellaris. ‘The more positive the reaction to the music, the shorter the waiting time seemed to be. So maybe time does tend to fly when you’re having fun, even if you’re on musical hold,’ Kellaris joked.</span>"
          },
          {
            "html": "<span>But unfortunately for companies operating on-hold lines, men and women have different ideas about what music is ‘fun’. ‘The possible solution,’ Kellaris joked, ‘might be for the recorded message to say: if you’re a male, please press one; if you’re a female, please press two. If you are in a bad mood, please hang up and try later.’</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 1-2",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A-D.",
          "questions": [
            {
              "id": "q1",
              "answer": "D",
              "textHtml": "The researchers concluded that",
              "options": [
                "subjects underestimated the time spent ’on hold’",
                "it is better for companies not to use any ‘on-hold’ music",
                "light jazz was the most acceptable music overall",
                "both gender and type of music influence callers’ reaction"
              ],
              "explanation": "The sixth paragraph shows that the type of music changed how long the wait felt, and that the effect was different for men and women, so both things matter. Option A is tempting, but the fourth paragraph says the wait was generally overestimated, not underestimated.",
              "evidence": "but the effect of music format differed for men and women"
            },
            {
              "id": "q2",
              "answer": "A",
              "textHtml": "The researchers recommended that",
              "options": [
                "their client continue to play alternative music",
                "four types of music should be offered to people ‘on hold’",
                "advertising is preferable to music",
                "women can be kept waiting for longer than men"
              ],
              "explanation": "The fifth paragraph says the alternative music the client already plays is probably the best choice, so the advice is to keep it. Option C is tempting because light jazz did well, but it only worked best with women, not with everyone.",
              "evidence": "The kind of music they’re playing now, alternative, is probably their best choice."
            }
          ]
        },
        {
          "title": "Questions 3-7",
          "type": "sentence-completion",
          "instructionHtml": "Choose the type of music from the list A-D below which corresponds to the findings of the study.",
          "questions": [
            {
              "id": "q3",
              "answer": "C",
              "before": "music preferred by men",
              "after": "",
              "explanation": "The seventh paragraph says classical music produced the most positive reactions among males, so classical is the men’s favourite. Light jazz is the tempting choice, but that was the music women reacted best to.",
              "evidence": "In general, classical music evoked the most positive reactions among males"
            },
            {
              "id": "q4",
              "answer": "D",
              "before": "longest waiting time estimate (both sexes)",
              "after": "",
              "explanation": "The seventh paragraph says rock produced the longest waiting time estimates and was the least liked by both men and women, so it fits ‘both sexes’.",
              "evidence": "Rock was the least preferred across both gender groups and produced the longest waiting time estimates."
            },
            {
              "id": "q5",
              "answer": "D",
              "before": "music to avoid on telephone hold",
              "after": "",
              "explanation": "The seventh paragraph quotes Kellaris saying rock music annoys people who are already calling with a problem, so it is the music a company should keep off its hold line.",
              "evidence": "The rock music’s driving beat kind of aggravates people calling customer assistance with a problem"
            },
            {
              "id": "q6",
              "answer": "A",
              "before": "music to use if clients are mostly women",
              "after": "",
              "explanation": "The seventh paragraph says light jazz gave women the most positive reactions and the shortest waiting time estimates, so it suits a mostly female client base. Classical is the trap here, because for women the wait seemed longest with classical.",
              "evidence": "light jazz evoked the most positive reactions (and shortest waiting time estimates) among females"
            },
            {
              "id": "q7",
              "answer": "B",
              "before": "best choice of ‘on-hold’ music overall",
              "after": "",
              "explanation": "The fifth paragraph says alternative is probably the best choice because it did not push reactions strongly either way and men and women reacted to it in similar ways, which makes it the safest music overall.",
              "evidence": "males and females were less polarised in their reactions to this type of music"
            }
          ],
          "legendHtml": "<p><span>A. light jazz</span><br/>\n<span>B. alternative</span><br/>\n<span>C. classical</span><br/>\n<span>D. rock</span></p><p><span>3. music preferred by men</span><br/>\n<span>4. longest waiting time estimate (both sexes)</span><br/>\n<span>5. music to avoid on telephone hold</span><br/>\n<span>6. music to use if clients are mostly women</span><br/>\n<span>7. best choice of ‘on-hold’ music overall</span></p>"
        },
        {
          "title": "Questions 8-13",
          "type": "yes-no-notgiven",
          "instructionHtml": "Do the following statements agree with the claims of the writer? Write",
          "questions": [
            {
              "id": "q8",
              "answer": "Yes",
              "textHtml": "Businesses want to minimise the time spent ‘on hold’",
              "explanation": "The fourth paragraph opens by saying service providers do not want callers to wait on hold at all, which agrees with the idea that businesses want that waiting time kept as short as possible.",
              "evidence": "Service providers, of course don’t want you to have to wait on hold"
            },
            {
              "id": "q9",
              "answer": "Yes",
              "textHtml": "The research sample consisted of real clients of a company",
              "explanation": "The third paragraph says the four types of music were tested on 71 of the company’s own clients, so the people in the study really were the company’s customers.",
              "evidence": "The researchers tested four types of ‘on-hold’ music with 71 of the company’s clients"
            },
            {
              "id": "q10",
              "answer": "No",
              "textHtml": "The sample consisted of equal numbers of men and women",
              "explanation": "The third paragraph gives 71 clients with 30 of them women, so there were more men than women and the numbers were not equal.",
              "evidence": "71 of the company’s clients, 30 of them women"
            },
            {
              "id": "q11",
              "answer": "Not given",
              "textHtml": "Advertising is considered a poor alternative to ‘on-hold’ music",
              "explanation": "The passage only compares different kinds of hold music with each other. It never mentions advertising on the telephone line at all, so we cannot tell what the writer thinks about it."
            },
            {
              "id": "q12",
              "answer": "No",
              "textHtml": "The consumer service company surveyed was playing classical music",
              "explanation": "The fifth paragraph says the music the company plays now is alternative, not classical, so the statement contradicts the passage.",
              "evidence": "The kind of music they’re playing now, alternative, is probably their best choice."
            },
            {
              "id": "q13",
              "answer": "No",
              "textHtml": "Researchers asked subjects only to estimate the length of time they waited ‘on hold’",
              "explanation": "The third paragraph says the researchers also collected and measured the callers’ reactions and comments, so estimating the time was not the only thing subjects were asked to do.",
              "evidence": "Their reactions and comments were also solicited and quantified by the researchers."
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>YES</dt><dd>if the statement agrees with the views of the writer</dd><dt>NO</dt><dd>if the statement contradicts the views of the writer</dd><dt>NOT GIVEN</dt><dd>if it is impossible to say what the writer thinks about this</dd></dl>"
        }
      ]
    },
    {
      "label": "Passage 2",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 2",
        "title": "Did tea and beer bring about industrialisation?",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span><strong>A</strong>. Alan Macfarlane thinks he could rewrite history. The professor of anthropological science at King’s College, Cambridge has, like other historians, spent decades trying to understand the enigma of the Industrial Revolution. Why did this particular important event – the world-changing birth of industry – happen in Britain? And why did it happen at the end of the 18th century?</span>"
          },
          {
            "html": "<span><strong>B</strong>. Macfarlane compares the question to a puzzle. He claims that there were about 20 different factors and all of them needed to be present before the revolution could happen. The chief conditions are to be found in history textbooks. For industry to ‘take off, there needed to be the technology and power to drive factories, large urban populations to provide cheap labour, easy transport to move goods around, an affluent middle-class willing to buy mass-produced objects, a market-driven economy, and a political system that allowed this to happen. While this was the case for England, other nations, such as Japan, Holland and France also met some of these criteria. All these factors must have been necessary but not sufficient to cause the revolution. Holland had everything except coal, while China also had many of these factors. Most historians, however, are convinced that one or two missing factors are needed to solve the puzzle.</span>"
          },
          {
            "html": "<span><strong>C</strong>. The missing factors, he proposes, are to be found in every kitchen cupboard. Tea and beer, two of the nation’s favourite drinks, drove the revolution. Tannin, the active ingredient in tea, and hops, used in making beer, both contain antiseptic properties. This, plus the fact that both are made with boiled water, helped prevent epidemics of waterborne diseases, such as dysentery, in densely populated urban areas.</span>"
          },
          {
            "html": "<span><strong>D</strong>. Historians had noticed one interesting factor around the mid-18th century that required explanation. Between about 1650 and 1740, the population was static. But then there was a burst in population. The infant mortality rate halved in the space of 20 years, and this happened in both rural areas and cities, and across all classes. Four possible causes have been suggested. There could have been a sudden change in the viruses and bacteria present at that time, but this is unlikely. Was there a revolution in medical science? But this was a century before Lister introduced antiseptic surgery. Was there a change in environmental conditions? There were improvements in agriculture that wiped out malaria, but these were small gains. Sanitation did not become widespread until the 19th century. The only option left was food. But the height and weight statistics show a decline. So the food got worse. Efforts to explain this sudden reduction in child deaths appeared to draw a blank.</span>"
          },
          {
            "html": "<span><strong>E</strong>. This population burst seemed to happen at just the right time to provide labour for the Industrial Revolution. But why? When the Industrial Revolution started, it was economically efficient to have people crowded together forming towns and cities. But with crowded living conditions comes disease, particularly from human waste. Some research in the historical records revealed that there was a change in the incidence of waterborne disease at that time, especially dysentery. Macfarlane deduced that whatever the British were drinking must have been important in controlling disease. They drank beer and ale. For a long time, the English were protected by the strong antibacterial agent in hops, which were added to make beer last. But in the late 17th century a tax was introduced on malt. The poor turned to water and gin, and in the 1720s the mortality rate began to rise again. Then it suddenly dropped again. What was the cause?</span>"
          },
          {
            "html": "<span><strong>F</strong>. Macfarlane looked to Japan, which was also developing large cities about the same time, and also had no sanitation. Waterborne diseases in the Japanese population were far fewer than those in Britain. Could it be the prevalence of tea in their culture? That was when Macfarlane thought about the role of tea in Britain. The history of tea in Britain provided an extraordinary coincidence of dates. Tea was relatively expensive until Britain started direct trade with China in the early 18th century. By the 1740s, about the time that infant mortality was falling, the drink was common. Macfarlane guesses that the fact that water had to be boiled, together with the stomach-purifying properties of tea so eloquently described in Buddhist texts, meant that the breast milk provided by mothers was healthier than it had ever been. No other European nation drank tea so often as the British, which, by Macfarlane’s logic, pushed the other nations out of the race for the Industrial Revolution.</span>"
          },
          {
            "html": "<span><strong>G</strong>. But, if tea is a factor in the puzzle, why didn’t this cause an industrial revolution in Japan? Macfarlane notes that in the 17th century, Japan had large cities, high literacy rates and even a futures market. However, Japan decided against a work-based revolution, by giving up labour-saving devices, even animals, to avoid putting people out of work. Astonishingly, the nation that we now think of as one of the most technologically advanced, entered the 19th century having almost abandoned the wheel. While Britain was undergoing the Industrial Revolution, Macfarlane notes wryly, Japan was undergoing an industrious one.</span>"
          },
          {
            "html": "<span><strong>H</strong>. The Cambridge academic considers the mystery solved. He adds that he thinks the UN should encourage aid agencies to take tea to the world’s troublespots, along with rehydration sachets and food rations.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 14-18",
          "type": "matching-headings",
          "instructionHtml": "The passage has 8 sections A-H. Choose the most suitable headings for paragraphs B-F from the list of headings below. Write the appropriate numbers (i-x).",
          "questions": [
            {
              "id": "q14",
              "answer": "ix",
              "textHtml": "Section B",
              "explanation": "Section B lists the conditions a country needed before industry could take off, such as technology, cheap labour, transport and a market economy. Heading iii is tempting because Holland and France appear, but they are only quick comparisons, not the topic.",
              "evidence": "He claims that there were about 20 different factors and all of them needed to be present before the revolution could happen."
            },
            {
              "id": "q15",
              "answer": "ii",
              "textHtml": "Section C",
              "explanation": "Section C is where Macfarlane offers his answer to the puzzle set up in Section B, saying the missing factors are tea and beer. Heading v is tempting because disease is mentioned, but the drinks and disease link is developed later in Section E.",
              "evidence": "The missing factors, he proposes, are to be found in every kitchen cupboard."
            },
            {
              "id": "q16",
              "answer": "iv",
              "textHtml": "Section D",
              "explanation": "Section D describes how a long period of no growth was followed by a sudden jump in population, with infant deaths halving in 20 years. Heading ii does not fit because this section sets out a new question rather than offering a solution.",
              "evidence": "But then there was a burst in population."
            },
            {
              "id": "q17",
              "answer": "v",
              "textHtml": "Section E",
              "explanation": "Section E links what the British drank, first beer with hops and later gin and water, to the rise and fall of waterborne disease. Heading vi is tempting because gin appears, but gin is only one step in the story, not the section’s subject.",
              "evidence": "Macfarlane deduced that whatever the British were drinking must have been important in controlling disease."
            },
            {
              "id": "q18",
              "answer": "i",
              "textHtml": "Section F",
              "explanation": "Section F moves from Japan to Britain to explain why tea mattered so much, including the boiled water and healthier breast milk. Heading viii is the trap, because Japan is only the clue that led him to tea.",
              "evidence": "That was when Macfarlane thought about the role of tea in Britain."
            }
          ],
          "legendHtml": "<p><span>There are more headings than sections so you will not use all of them.</span></p><p><span>i. The significance of tea drinking</span><br/>\n<span>ii. Possible solution to the puzzle</span><br/>\n<span>iii. Industry in Holland and France</span><br/>\n<span>iv. Significant population increase</span><br/>\n<span>v. The relationship between drinks and disease</span><br/>\n<span>vi. Gin drinking and industrialisation</span><br/>\n<span>vii. Dysentery prevention in Japan and Holland</span><br/>\n<span>viii. Japan’s waterborne diseases</span><br/>\n<span>ix. Preconditions necessary for Industrial Revolution</span><br/>\n<span>x. Introduction</span></p>",
          "options": [
            "i",
            "ii",
            "iii",
            "iv",
            "v",
            "vi",
            "vii",
            "viii",
            "ix",
            "x"
          ]
        },
        {
          "title": "Questions 19-22",
          "type": "table-completion",
          "instructionHtml": "Complete the table using NO MORE THAN THREE WORD S from the passage.",
          "questions": [
            {
              "id": "q19",
              "answer": [
                "Tax",
                "tax on malt",
                "malt tax"
              ],
              "explanation": "Section E says a tax was put on malt in the late 17th century, which is what made beer expensive and pushed poor people towards water and gin.",
              "evidence": "But in the late 17th century a tax was introduced on malt."
            },
            {
              "id": "q20",
              "answer": "Tea",
              "explanation": "Section F says tea was expensive until direct trade with China began in the early 18th century, and by the 1740s the drink was common, so tea is the drink that spread.",
              "evidence": "Tea was relatively expensive until Britain started direct trade with China in the early 18th century."
            },
            {
              "id": "q21",
              "answer": [
                "Waterborne diseases",
                "dysentery"
              ],
              "explanation": "Section C says tea and beer helped stop epidemics of waterborne diseases such as dysentery in crowded towns, so these are the deaths that fell in the cities.",
              "evidence": "helped prevent epidemics of waterborne diseases, such as dysentery, in densely populated urban areas"
            },
            {
              "id": "q22",
              "answer": "Boiled",
              "explanation": "Section C says both drinks are made with boiled water, and that this, together with the antiseptic ingredients, prevented disease, so the missing word is ‘boiled’.",
              "evidence": "the fact that both are made with boiled water"
            }
          ],
          "legendHtml": "<table><tbody><tr><td width=\"132\"><span><strong>Century</strong></span></td><td width=\"165\"><span><strong>Social change in Britain</strong></span></td><td width=\"148\"><span><strong>Reason</strong></span></td><td width=\"148\"><span><strong>Effect on population</strong></span></td></tr><tr><td width=\"132\"><span>Mid 17<sup>th</sup> century</span></td><td width=\"165\"><span>main drinks were still beer and ale</span></td><td width=\"148\"><span>Imps helped to make beer last longer</span></td><td width=\"148\"><span>no significant change</span></td></tr><tr><td width=\"132\"><span>Late 17<sup>th</sup> century</span></td><td width=\"165\"><span>gin becomes more popular, especially with poor people</span></td><td width=\"148\"><span>beer becomes expensive because of (19) ……….</span></td><td width=\"148\"><span>mortality rate goes up</span></td></tr><tr><td width=\"132\"><span>Early 18<sup>th</sup> century</span></td><td width=\"165\"><span>(20) ……….. drinking starts to become widespread</span></td><td width=\"148\"><span>Britain starts trade with China</span></td><td width=\"148\"><span>mortality rate goes down</span></td></tr><tr><td width=\"132\"><span>Mid 18<sup>th</sup> century</span></td><td width=\"165\"><span>decline in urban deaths caused by (21) ……….</span></td><td width=\"148\"><span>(22) …………. water used for tea and beer; antibacterial qualities of tannin</span></td><td width=\"148\"><span>infant mortality rate goes down by half</span></td></tr></tbody></table>",
          "wordLimit": 3,
          "table": {
            "rows": [
              [
                "………. mortality rate goes up Early 18 th century",
                {
                  "questionId": "q19"
                },
                ""
              ],
              [
                "……….. drinking starts to become widespread Britain starts trade with China mortality rate goes down Mid 18 th century decline in urban deaths caused by",
                {
                  "questionId": "q20"
                },
                ""
              ],
              [
                "………",
                {
                  "questionId": "q21"
                },
                ""
              ],
              [
                "…………. water used for tea and beer; antibacterial qualities of tannin infant mortality rate goes down by half",
                {
                  "questionId": "q22"
                },
                ""
              ]
            ]
          }
        },
        {
          "title": "Questions 23-25",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A-D.",
          "questions": [
            {
              "id": "q23",
              "answer": "C",
              "textHtml": "In 1740 there was a population explosion in Britain because",
              "options": [
                "large numbers of people moved to live in cities",
                "larger quantities of beer were drunk",
                "of the health protecting qualities of beer and tea",
                "of the Industrial Revolution"
              ],
              "explanation": "Section C says tannin in tea and hops in beer both have antiseptic properties, which stopped the waterborne diseases that were killing babies, and Section D shows infant deaths halving. Option B is tempting, but beer drinking actually fell after the malt tax, and it was the protective qualities, not the amount, that mattered.",
              "evidence": "Tannin, the active ingredient in tea, and hops, used in making beer, both contain antiseptic properties."
            },
            {
              "id": "q24",
              "answer": "D",
              "textHtml": "According to the author, the Japanese did not industrialise because they didn’t",
              "options": [
                "like drinking beer",
                "It want animals to work",
                "Iike using wheels",
                "want unemployment"
              ],
              "explanation": "Section G says Japan turned down a work-based revolution and gave up labour-saving machines so that people would not lose their jobs. Options B and C are tempting, but giving up animals and the wheel was the result of that decision, not the reason for it.",
              "evidence": "Japan decided against a work-based revolution, by giving up labour-saving devices, even animals, to avoid putting people out of work."
            },
            {
              "id": "q25",
              "answer": "B",
              "textHtml": "Macfarlane thinks he has discovered why",
              "options": [
                "the British drink beer and tea",
                "industrialisation happened in Britain when if did",
                "the Japanese did not drink beet",
                "sanitation wasn’t widespread until the 19th century"
              ],
              "explanation": "Section A sets the puzzle as why the Industrial Revolution happened in Britain and why at the end of the 18th century, and Section H says he considers that mystery solved. Option A is the trap, because tea and beer are his explanation, not the thing he set out to explain.",
              "evidence": "The Cambridge academic considers the mystery solved."
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
        "title": "Team based learning",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>With the globalisation of information technology (IT) and worldwide access to the Internet, people from all areas of learning are finding themselves using some form of information technology in the workplace. The corporate world has seen a boom in the use of IT tools, but conversely, not enough people with IT skills that can enter the workplace and be productive with minimal on-the-job training.</span>"
          },
          {
            "html": "<span>A recent issue of the New York Times reports that many companies are looking for smart students who may have a budding interest in IT. Some companies, trying to encourage students to attend interviews, provide good salary packages and challenging work environments. For example, one American IT consulting company offers high salaries, annual bonuses, and immediate stock options to potential recruits. It also brings in 25 to 40 prospective applicants at a time for a two-day visit to the company. This time includes interviews, team exercises and social events. The idea behind the team exercises is that the applicants get to see that they will be working with other smart people doing really interesting things, rather than sitting alone writing code.</span>"
          },
          {
            "html": "<span>In the past 10 years, employers have seen marked benefits from collaborative projects in product development. Apart from the work environment, there is also a similar body of research indicating that small team-based instruction can lead to different kinds of desirable educational results. In order to prepare IT graduates to meet these workplace requirements, colleges and universities are also beginning to include team-based educational models.</span>"
          },
          {
            "html": "<span>One of the leaders in promoting team-based education is the American Intercontinental University (AIU), which has campuses worldwide. AIU offers programs in IT with a major portion of the curriculum based on team projects. AIU has a large body of international students and students from different educational backgrounds. This team-based learning gives the students a sense of social and technical support within the group, and allows students firsthand experience of both potential successes and of inherent problems encountered when working with others.</span>"
          },
          {
            "html": "<span>Team-oriented instruction has not been the common mode of delivery in traditional college settings. However, since most college graduates who choose to go into an IT work environment will encounter some form of teamwork at work, it is to their advantage that they are educated using collaborative learning and that they are taught the tools needed to work with different people in achieving common goals or objectives.</span>"
          },
          {
            "html": "<span>In team-based learning, students spend a large part of their in-class time working in permanent and heterogeneous teams. Most teams are made up of individuals with different socio-cultural backgrounds and varying skill levels. Team activities concentrate on using rather than just learning concepts, whilst student grades are a combination of overall team performance and peer evaluation of individual team members.</span>"
          },
          {
            "html": "<span>In a team-based environment, the teacher takes on the role of a facilitator and manager of learning, instead of just providing information to passive students. The facilitator/teacher also guides the team in identifying their goals and establishing standards of team performance. Team exercises then help the students to improve their problem-solving skills by applying theory to simulated real-world situations. Working as a team allows students to adopt new roles and empowers them to control their own learning. Students in teams are taught to use each other as resources and accept the responsibility of managing tasks.</span>"
          },
          {
            "html": "<span>Team members must also study assigned material individually to ensure their preparation for classes. There are individual assessment tests to measure if students have not only read the assigned material, but also understand the concepts of the module, and can apply them to given problems. Additional team assessment tests present a problem for discussion and require consensus, helping students learn critical communication skills. This also enables them to deal with conflicts between members before they escalate to crises. Team presentations (written or verbal) allow the team to focus and build cohesion, with team members sharing the responsibility for presenting and persuading the audience to accept their viewpoint. Feedback on how the team is functioning with task management, team dynamics and overall work is given by the facilitator. Team exercises that are application-oriented help students experience the practical application of concepts and learn from other students’ perspectives.</span>"
          },
          {
            "html": "<span>Team-based classrooms are especially beneficial in colleges with international students. Since this type of learning encourages people to listen and communicate with others, share problems, resolve personal conflicts, and manage their time and resources, it is a great environment for students who are in a new social situation. Since social interaction plays an important role during teamwork, team learning has an added advantage for students who are not comfortable in traditional classroom settings. It allows students from different cultures to understand their differences and use them productively. This type of learning environment also allows students to express themselves freely in a team context, rather than feeling singled out as when answering questions in a traditional classroom.</span>"
          },
          {
            "html": "<span>This learning model was designed to better prepare students for today’s global workplace. Students are encouraged to explore ideas together, to build communication skills and achieve superior results. It is likely that employers will increasingly seek out students with these skills as we move into the future.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 26-32",
          "type": "sentence-completion",
          "instructionHtml": "Complete the summary below. Choose your answers from the box below the summary.",
          "questions": [
            {
              "id": "q26",
              "answer": "Exceeds",
              "explanation": "The first paragraph says there are not enough people with IT skills to enter the workplace and be productive straight away, so demand for applicants is greater than supply, which is what ‘exceeds’ means.",
              "evidence": "not enough people with IT skills that can enter the workplace and be productive with minimal on-the-job training"
            },
            {
              "id": "q27",
              "answer": "Current",
              "explanation": "The gap needs an adjective describing how computer technology is used today, and the first paragraph says people in all areas of learning are now using it, so ‘current’ fits. ‘Previous’ would say the opposite of what the passage describes.",
              "evidence": "people from all areas of learning are finding themselves using some form of information technology in the workplace"
            },
            {
              "id": "q28",
              "answer": "Employers",
              "explanation": "It is the companies doing the hiring that struggle to find ready-trained people, as the second paragraph shows with companies searching for smart students, so the word needed is ‘employers’, not ‘employees’.",
              "evidence": "many companies are looking for smart students who may have a budding interest in IT"
            },
            {
              "id": "q29",
              "answer": "Financial",
              "explanation": "The second paragraph lists high salaries, annual bonuses and stock options, which are all money rewards, so the inducements offered alongside income are ‘financial’ ones.",
              "evidence": "one American IT consulting company offers high salaries, annual bonuses, and immediate stock options to potential recruits"
            },
            {
              "id": "q30",
              "answer": "Activities",
              "explanation": "The second paragraph says the two-day visit includes interviews, team exercises and social events, so the group things used in selection are ‘activities’.",
              "evidence": "This time includes interviews, team exercises and social events."
            },
            {
              "id": "q31",
              "answer": "Candidates",
              "explanation": "The second paragraph says the company brings in 25 to 40 prospective applicants at a time, and ‘candidates’ is the word for people applying. ‘Employees’ is wrong because they have not been hired yet.",
              "evidence": "It also brings in 25 to 40 prospective applicants at a time for a two-day visit to the company."
            },
            {
              "id": "q32",
              "answer": "Environment",
              "explanation": "The second paragraph says companies offer challenging work environments and want applicants to see what working there is really like, so the working ‘environment’ is what is being shown.",
              "evidence": "Some companies, trying to encourage students to attend interviews, provide good salary packages and challenging work environments."
            }
          ],
          "legendHtml": "<p><span>Although IT is one of the leading career choice made by graduates today, the industry’s demand for qualified applicants (26) …………….. the supply of skilled IT personnel. Despite the (27) …………….. widespread use of computer technology in all areas of life, (28) …………….. face difficulties recruiting people whose education has equipped them to commence working productively without further training. Several business organisations now offer income and other (29) ……………… inducements to potential employees. They also include group (30) ……………… in their selection procedures, often inviting up to forty (31) ……………. to their company for the two-day visit. In this way the company can demonstrate the reality of the working (32) ……… which is more likely to involve challenging co-operative projects than individualised tasks.</span></p><p><strong><span>List of words</span></strong></p><table><tbody><tr><td width=\"119\"><span>Exceeds</span></td><td width=\"119\"><span>Extracts</span></td><td width=\"119\"><span>Choices</span></td><td width=\"119\"><span>Candidates</span></td><td width=\"119\"><span>Employees</span></td></tr><tr><td width=\"119\"><span>Admiration</span></td><td width=\"119\"><span>Previous</span></td><td width=\"119\"><span>Financial</span></td><td width=\"119\"><span>Employment</span></td><td width=\"119\"><span>Regularity</span></td></tr><tr><td width=\"119\"><span>Advantages</span></td><td width=\"119\"><span>Employers</span></td><td width=\"119\"><span>Environment</span></td><td width=\"119\"><span>Activities</span></td><td width=\"119\"><span>Current</span></td></tr></tbody></table>"
        },
        {
          "title": "Questions 33-37",
          "type": "yes-no-notgiven",
          "instructionHtml": "Do the following statements reflect the views of the writer of the passage? Write",
          "questions": [
            {
              "id": "q33",
              "answer": "No",
              "textHtml": "The American Intercontinental University includes team-based learning in all its courses on all its campuses",
              "explanation": "The fourth paragraph says AIU runs IT programs where a major portion of the curriculum uses team projects, which is narrower than every course on every campus, so the statement goes further than the writer does.",
              "evidence": "AIU offers programs in IT with a major portion of the curriculum based on team projects."
            },
            {
              "id": "q34",
              "answer": "No",
              "textHtml": "The composition of teams is changed regularly",
              "explanation": "The sixth paragraph says students work in permanent teams, which means the same people stay together, contradicting the idea that the teams are changed regularly.",
              "evidence": "students spend a large part of their in-class time working in permanent and heterogeneous teams"
            },
            {
              "id": "q35",
              "answer": "No",
              "textHtml": "Theoretical problems are the most important team activity",
              "explanation": "The sixth paragraph says team activities focus on using concepts rather than just learning them, and the seventh adds that theory is applied to real world situations, so theoretical problems are not the main activity.",
              "evidence": "Team activities concentrate on using rather than just learning concepts"
            },
            {
              "id": "q36",
              "answer": "Yes",
              "textHtml": "The team members participate in assessment of other team members",
              "explanation": "The sixth paragraph says grades combine overall team performance with peer evaluation, so students really do help assess the other members of their team.",
              "evidence": "student grades are a combination of overall team performance and peer evaluation of individual team members"
            },
            {
              "id": "q37",
              "answer": "Not given",
              "textHtml": "International students prefer traditional classroom learning to team-based learning",
              "explanation": "The ninth paragraph says team classrooms suit international students well, but it never says what those students themselves prefer, so there is no way to know the writer’s view on this comparison."
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>YES</dt><dd>if the statement agrees with the views of the writer</dd><dt>NO</dt><dd>if the statement contradicts the views of the writer</dd><dt>NOT GIVEN</dt><dd>if it is impossible to say what the writer thinks about this</dd></dl>"
        },
        {
          "title": "Questions 38-40",
          "type": "sentence-completion",
          "instructionHtml": "Choose one phrase from the list of phrases A-H below to complete each of the following sentences.",
          "questions": [
            {
              "id": "q38",
              "answer": "D",
              "before": "Students’ work is assessed",
              "after": "",
              "explanation": "The sixth paragraph says grades combine team performance with peer evaluation, and the eighth adds individual assessment tests, so all three kinds of marking apply. Option B is the trap, because individual tests are only one part of the picture.",
              "evidence": "student grades are a combination of overall team performance and peer evaluation of individual team members"
            },
            {
              "id": "q39",
              "answer": "F",
              "before": "The teams make a joint presentation",
              "after": "",
              "explanation": "The eighth paragraph says team presentations build cohesion and share the job of presenting and persuading, which is group work, and the seventh says exercises apply theory to real world problems. Option C is tempting, but the team persuades an outside audience together rather than competing inside the group.",
              "evidence": "allow the team to focus and build cohesion, with team members sharing the responsibility for presenting"
            },
            {
              "id": "q40",
              "answer": "E",
              "before": "The need to achieve consensus assists A. to compete with other teams as judged by the facilitator. B. by individual tests and exams. C. to see who has the strongest point of view in the group. D. individually, by their peers and as a team. E. in the development of communication skills. F. to practise working as a group while putting theory into practice. G. to assist international and non-traditional students. H. in getting to know new friends and colleagues",
              "after": "",
              "explanation": "The eighth paragraph says the team tests require consensus and that this helps students learn critical communication skills, which matches option E directly.",
              "evidence": "require consensus, helping students learn critical communication skills"
            }
          ],
          "legendHtml": "<p><span>38. Students’ work is assessed</span><br/>\n<span>39. The teams make a joint presentation</span><br/>\n<span>40. The need to achieve consensus assists</span></p><p><span>A. to compete with other teams as judged by the facilitator.</span><br/>\n<span>B. by individual tests and exams.</span><br/>\n<span>C. to see who has the strongest point of view in the group.</span><br/>\n<span>D. individually, by their peers and as a team.</span><br/>\n<span>E. in the development of communication skills.</span><br/>\n<span>F. to practise working as a group while putting theory into practice.</span><br/>\n<span>G. to assist international and non-traditional students.</span><br/>\n<span>H. in getting to know new friends and colleagues.</span></p>"
        }
      ]
    }
  ]
};

export default test;
