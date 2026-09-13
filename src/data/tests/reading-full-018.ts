import type { PracticeTest } from '../../lib/tests/schema';

const test: PracticeTest = {
  "id": "reading-full-018",
  "skill": "reading",
  "title": "Academic Reading Test 18",
  "description": "A complete three-passage Academic Reading practice test with 40 questions.",
  "durationMinutes": 60,
  "source": {
    "name": "IELTS MASTER / PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-reading-test-300/",
    "permission": "Reused with publisher permission confirmed by Alex on 2026-09-11."
  },
  "parts": [
    {
      "label": "Passage 1",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 1",
        "title": "Wolves, dogs and humans",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>There is no doubt that dogs are the oldest of all species tamed by humans and their domestication was based on a mutually beneficial relationship with man. The conventional view is that the domestication of wolves began between 10,000 and 20,000 years ago. However, a recent ground-breaking paper by a group of international geneticists has pushed this date back by a factor of 10. Led by Dr. Robert Wayne, at the University of California, Los Angeles, the team showed that all dog breeds had only one ancestor, the wolf. They did this by analysing the genetic history through the DNA of 162 wolves from around the world and 140 domestic dogs representing 67 breeds. The research also confirms, for the first time, that dogs are descended only from wolves and do not share DNA with coyotes or jackals. The fact that our companionship with dogs now appears to go back at least 100,000 years means that this partnership may have played an important part in the development of human hunting techniques that developed 70,000 to 90,000 years ago. It also may even have affected the brain development in both species.</span>"
          },
          {
            "html": "<span>The Australian veterinarian David Paxton suggests that in that period of first contact, people did not so much domesticate wolves as wolves domesticated people. Wolves may have started living at the edge of human settlements as scavengers, eating scraps of food and waste. Some learned to live with human beings in a mutually helpful way and gradually evolved into dogs. At the very least, they would have protected human settlements, and given warnings by barking at anything approaching. The wolves that evolved into dogs have been enormously successful in evolutionary terms. They are found everywhere in the inhabited world, hundreds of millions of them. The descendants of the wolves that remained wolves are now sparsely distributed, often in endangered populations.</span>"
          },
          {
            "html": "<span>In return for companionship and food, the early ancestor of the dog assisted humans in tracking, hunting, guarding and a variety of other activities. Eventually humans began to selectively breed these animals for specific traits. Physical characteristics changed and individual breeds began to take shape. As humans wandered across Asia and Europe, they took their dogs along, using them for additional tasks and further breeding them for selected qualities that would better enable them to perform specific duties.</span>"
          },
          {
            "html": "<span>According to Dr. Colin Groves, of the Department of Archaeology and Anthropology at Australian National University, early humans came to rely on dogs’ keen ability to hear, smell and see – allowing certain areas of the human brain to shrink in size relative to other areas. ‘Dogs acted as human’s alarm systems, trackers and hunting aids, garbage disposal facilities, hot-water bottles and children’s guardians and playmates. Humans provided dogs with food and security. This symbiotic relationship was stable for over 100,000 years and intensified into mutual domestication,’ said Dr. Groves. In his opinion, humans domesticated dogs and dogs domesticated humans.</span>"
          },
          {
            "html": "<span>Dr. Groves repealed an assertion made as early as 1914 that humans have some of the same physical characteristics as domesticated animals, the most notable being decreased brain size. The horse experienced a 16 percent reduction in brain size after domestication while pigs’ brains shrank by as much as 34 percent. The estimated brain-size reduction in domesticated dogs varies from 30 percent to 10 percent. Only in the last decade have archaeologists uncovered enough fossil evidence to establish that brain capacity in humans declined in Europe and Africa by at least 10 percent beginning about 10,000 years ago. Dr. Groves believes this reduction may have taken place as the relationship between humans and dogs intensified. The close interaction between the two species allowed for the diminishing of certain human brain functions like smell and hearing.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 1-5",
          "type": "yes-no-notgiven",
          "instructionHtml": "Do the following statements agree with the views of the writer of the passage? Write:",
          "questions": [
            {
              "id": "q1",
              "answer": "No",
              "textHtml": "The co-existence of wolves and humans began 10,000 years ago",
              "explanation": "The recent paper 'pushed this date back by a factor of 10' from the conventional 10,000 to 20,000 years, so co-existence began far earlier, contradicting the statement.",
              "evidence": "pushed this date back by a factor of 10"
            },
            {
              "id": "q2",
              "answer": "No",
              "textHtml": "Dogs, wolves, jackals and coyotes share a common ancestor",
              "explanation": "The passage states dogs 'do not share DNA with coyotes or jackals', directly contradicting the claim of a shared ancestor with those species.",
              "evidence": "do not share DNA with coyotes or jackals"
            },
            {
              "id": "q3",
              "answer": "Yes",
              "textHtml": "Dogs probably influenced the development of human hunting skills",
              "explanation": "The passage says the human-dog partnership 'may have played an important part in the development of human hunting techniques', matching the claim.",
              "evidence": "development of human hunting techniques"
            },
            {
              "id": "q4",
              "answer": "Yes",
              "textHtml": "Dogs evolved from wolves which chose to live with humans",
              "explanation": "Paxton says wolves living near humans 'gradually evolved into dogs' once they chose to live alongside people, matching the claim.",
              "evidence": "gradually evolved into dogs"
            },
            {
              "id": "q5",
              "answer": "Not given",
              "textHtml": "Wolves are a protected species in most parts of the world",
              "explanation": "The passage says wolf descendants are 'often in endangered populations' but never states wolves are a protected species across most of the world."
            }
          ],
          "legendHtml": "<p><span><strong>Questions 1-5</strong></span><br/>\n<span>Do the following statements agree with the views of the writer of the passage? Write:</span></p><p><span><strong>YES</strong>                                if the statement agrees with the views of the writer</span><br/>\n<span><strong>NO</strong>                                  if the statement contradicts the views of the writer</span><br/>\n<span><strong>NOT GIVEN</strong>               if it is impossible to say what the writer thinks about this</span></p><p><span>1. The co-existence of wolves and humans began 10,000 years ago.</span><br/>\n<span>2. Dogs, wolves, jackals and coyotes share a common ancestor.</span><br/>\n<span>3. Dogs probably influenced the development of human hunting skills.</span><br/>\n<span>4. Dogs evolved from wolves which chose to live with humans.</span><br/>\n<span>5. Wolves are a protected species in most parts of the world.</span></p>"
        },
        {
          "title": "Questions 6-8",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A-D.",
          "questions": [
            {
              "id": "q6",
              "answer": "D",
              "textHtml": "How do we know that dogs have been more successful in evolutionary terms than wolves?",
              "options": [
                "Dogs can be trained more easily than wolves",
                "Wolves are stronger than dogs",
                "Humans prefer dogs to wolves",
                "There are more dogs than wolves today"
              ],
              "explanation": "The passage says dogs are found everywhere, 'hundreds of millions of them', while surviving wolves are sparsely distributed, matching D.",
              "evidence": "hundreds of millions of them"
            },
            {
              "id": "q7",
              "answer": "B",
              "textHtml": "As a result of domestication, the size of the human brain has …",
              "options": [
                "increased",
                "decreased",
                "stayed the same",
                "become more complex"
              ],
              "explanation": "Groves found 'brain capacity in humans declined... by at least 10 percent' after domestication began, matching B, decreased.",
              "evidence": "brain capacity in humans declined"
            },
            {
              "id": "q8",
              "answer": "A",
              "textHtml": "What can we infer from the studies of brain size and domestication?",
              "options": [
                "Domestic life is less demanding than surviving in the wild",
                "Animals like living with humans",
                "Domestication has made animals physically weaker",
                "Pigs are less intelligent than dogs"
              ],
              "explanation": "Since humans could rely on dogs' senses, brain areas linked to smell and hearing could shrink because they were no longer needed for survival, supporting inference A.",
              "evidence": "allowing certain areas of the human brain to shrink in size"
            }
          ],
          "legendHtml": "<p><span><strong>Questions 6-8</strong></span><br/>\n<span>Choose the correct letter A-D.</span></p><p><span>6. How do we know that dogs have been more successful in evolutionary terms than wolves?</span><br/>\n<span><strong>A</strong> Dogs can be trained more easily than wolves.</span><br/>\n<span><strong>B</strong> Wolves are stronger than dogs.</span><br/>\n<span><strong>C</strong> Humans prefer dogs to wolves.</span><br/>\n<span><strong>D</strong> There are more dogs than wolves today.</span></p><p><span>7. As a result of domestication, the size of the human brain has …</span><br/>\n<span><strong>A</strong> increased.</span><br/>\n<span><strong>B</strong> decreased</span><br/>\n<span><strong>C</strong> stayed the same.</span><br/>\n<span><strong>D</strong> become more complex.</span></p><p><span>8. What can we infer from the studies of brain size and domestication?</span><br/>\n<span><strong>A</strong> Domestic life is less demanding than surviving in the wild.</span><br/>\n<span><strong>B</strong> Animals like living with humans.</span><br/>\n<span><strong>C</strong> Domestication has made animals physically weaker.</span><br/>\n<span><strong>D</strong> Pigs are less intelligent than dogs.</span></p>"
        },
        {
          "title": "Question 9",
          "type": "sentence-completion",
          "instructionHtml": "Choose TWO WORDS from the passage for the answer.",
          "questions": [
            {
              "id": "q9",
              "answer": "Selectively breed",
              "before": "……………… their animals for the characteristics they wanted",
              "after": "",
              "explanation": "The passage says humans 'began to selectively breed these animals for specific traits', giving the exact two words needed.",
              "evidence": "selectively breed these animals"
            }
          ],
          "legendHtml": "<p><span><strong>Questions 9</strong></span><br/>\n<span>Choose <strong>TWO WORDS</strong> from the passage for the answer.</span></p><p><span>There are many different types of dogs today, because, in early times humans began to (9) ……………… their animals for the characteristics they wanted.</span></p>",
          "wordLimit": 2
        },
        {
          "title": "Questions 10-14",
          "type": "matching-features",
          "instructionHtml": "Match one of the researchers (A-C) to each of the findings (10-14) below.",
          "questions": [
            {
              "id": "q10",
              "answer": "C",
              "textHtml": "studied the brain size of domesticated animals",
              "explanation": "Groves compares brain-size reduction across horses, pigs and dogs after domestication, matching C.",
              "evidence": "The horse experienced a 16 percent reduction in brain size"
            },
            {
              "id": "q11",
              "answer": "B",
              "textHtml": "claims that wolves chose to interact with humans",
              "explanation": "Paxton suggests that 'wolves domesticated people' rather than the reverse, matching B.",
              "evidence": "wolves domesticated people"
            },
            {
              "id": "q12",
              "answer": "A",
              "textHtml": "established a new time frame for domestication of wolves",
              "explanation": "Wayne's team 'pushed this date back by a factor of 10', establishing a new domestication time frame, matching A.",
              "evidence": "pushed this date back by a factor of 10"
            },
            {
              "id": "q13",
              "answer": "C",
              "textHtml": "believes that dogs and humans domesticated each other",
              "explanation": "Groves concludes that 'humans domesticated dogs and dogs domesticated humans', matching C.",
              "evidence": "humans domesticated dogs and dogs domesticated humans"
            },
            {
              "id": "q14",
              "answer": "A",
              "textHtml": "studied the DNA of wolves and dogs",
              "explanation": "Wayne's team worked 'by analysing the genetic history through the DNA of 162 wolves' and domestic dogs, matching A.",
              "evidence": "analysing the genetic history through the DNA of 162 wolves"
            }
          ],
          "legendHtml": "<p><span><strong>Questions 10-14</strong></span><br/>\n<span>Match one of the researchers (A-C) to each of the findings (10-14) below.</span></p><p><span><strong>A</strong> Dr. Wayne</span><br/>\n<span><strong>B</strong> Dr. Paxton</span><br/>\n<span><strong>C</strong> Dr. Groves</span></p><p><span>Example: found the common ancestor of the dog <span><strong>A</strong></span></span></p><p><span>10. studied the brain size of domesticated animals</span><br/>\n<span>11. claims that wolves chose to interact with humans</span><br/>\n<span>12. established a new time frame for domestication of wolves</span><br/>\n<span>13. believes that dogs and humans domesticated each other</span><br/>\n<span>14. studied the DNA of wolves and dogs</span></p>",
          "options": [
            "A",
            "B",
            "C"
          ]
        }
      ]
    },
    {
      "label": "Passage 2",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 2",
        "title": "Crop circles",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>The crop circle phenomenon has puzzled and mystified humanity for many years. The designs just appear, placed carefully in fields of food grains. Some are larger than football fields and highly complex in design and construction. Others are smaller and more primitive. We call them crop circles, but many of them are not circular. Some are elongated abstract designs, a few resemble insects or other known forms, and some are mixtures of lines, circles, and other shapes melded into intricate patterns. Most become visible overnight, though it has been claimed that a few have appeared within a half-hour in broad daylight.</span>"
          },
          {
            "html": "<span>Crop circles have appeared all over the world. About 10,000 instances from various countries have been reported in recent years. The first modern rash of crop circles appeared in Australia in December of 1973. A strange circular imprint appeared in a wheat field near Wokurna, a community southeast of Adelaide. Soon seven swirled circles up to 14 feet in diameter appeared in an oatfield nearby. In December of 1989, an amazing set of circles, ranging from a few inches to a few feet in diameter appeared in the wheat best west of Melbourne. As many as 90 crop circles were found. The best documented and largest modern spread of crop circles began in southern England during the summer of 1980. By the end of 1988, 112 new circles had been formed. At that time circles were being reported worldwide, 305 by the end of 1989. The total grew to an outstanding 1,000 newly-formed circles in 1990. In 1991, 200 to 300 circles were reported. Crop circles have been documented in over 30 countries, including Canada, the former Soviet Union Japan and the United States.</span>"
          },
          {
            "html": "<span>Nine out of ten circles remained simple with broken stems flattened to the ground and swirled. The stalks around the circles remained completely erect. But over the years, crop circles have become much more geometrically intricate. Patterns involved multiple circles, bars, triangles, rings and spurs. Pictorial imagery also appeared. Reliable eyewitnesses have reported seeing unusual lights and hearing unidentifiable sounds while on an early-morning walk in the countryside where a crop circle showed later that day. High-pitched, warbling, noises have been recorded at the site of some crop circles. On several occasions a strange glow or a darker colouring has been seen in the sky over a crop circle. And in more than one instance, the electrical power of small planes flying overhead has been cut off abruptly. While the causal energies do not seem to harm animals, or even insects as far as we can tell, wild creatures tend to avoid the circles. Flocks of birds have been seen to split apart and fly around the perimeter to avoid going directly over a crop circle formation.</span>"
          },
          {
            "html": "<span>Researchers have spent a great deal of time investigating different aspects of crop circles. They try to detect traces of human involvement in the circle-making, test the area of the circle itself for geophysical anomalies, and analyze the field’s grain both from within and outside the circles, searching for differences.</span>"
          },
          {
            "html": "<span>Dr. W. C. Levengood of BLT Research in Cambridge, Massachusetts, has analyzed many grain samples and confirmed, time after time, significant changes at the cellular level of crop circle plants. The plants in front of the circles have elongated cells and blown-out growth nodes. Seeds front the circle plants often show accelerated growth rates when they are sown, and in some instances, quite different-looking plants result. In many instances it appears that a vortex-like energy causes the plants to swirl down, flattening the design into the land. Whatever this energy is, it does not generally inhibit the plants’ growth. They continue to show normal response to the sun, raising upward over several days following the appearance of the circle. Michael Chorost of Duke University found occasions of short-lived radionuclides in the top layer of soil in some of the formations. A British government laboratory found diminished nitrogen and decreased nematode populations as well as decreased water content in the soil of a formation. Researchers have discovered other anomalies as well, such as curious embedded magnetic particles and charred tissue. Some of the plant stalks within the circles show evidence of being exposed to rapid microwave heating.</span>"
          },
          {
            "html": "<span>Scientists have attempted to explain crop circles as a result of natural processes. One popular theory accepted by many mainstream scientists and academics is known as ‘Plasma Vortex Theory’. Developed by Dr. Terence Mearden, it theorizes that electrified air (plasma), on the side of hills, becomes mini-tornadoes and screws down onto the ground, creating the circles. The theory also holds that the electrified air would cause a light to appear above the circle and therefore account for UFO sightings. Although this theory still has considerable support, it has come under fire because of the highly intricate and complex crop circle patterns that have appeared since 1991. Another theory is that the circles are all hoaxes or practical jokes. Major support came to this theory when, on September 9, 1991, two Englishmen claimed to have created approximately 250 crop circles. However, those circles were more rugged than others, and many were already suspect. It is irrational to believe that all crop circles are fake for publicity or other reasons. Many crop circles appeared long before the phenomenon pained large recognition from the public and press. Too many circles and patterns are formed each year in too many countries for them to have been hoaxes. Many crop circles show strange mathematical trails when analyzed.</span>"
          },
          {
            "html": "<span>The crop circle phenomenon is an enigma. Many dollars have been spent by researchers and their associations in an attempt to find a solution to this intriguing puzzle which will continue to haunt humanity until an explanation is found.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 15-19",
          "type": "yes-no-notgiven",
          "instructionHtml": "Do the following statements reflect the claims of the writer of this passage? Write:",
          "questions": [
            {
              "id": "q15",
              "answer": "No",
              "textHtml": "Crop circles only appear in wheat fields",
              "explanation": "The passage gives an example of a circle appearing 'in an oatfield nearby', showing they are not limited to wheat, so this is false.",
              "evidence": "seven swirled circles up to 14 feet in diameter appeared in an oatfield"
            },
            {
              "id": "q16",
              "answer": "Not given",
              "textHtml": "Crop circles have never been documented in tropical countries",
              "explanation": "The passage lists countries such as Canada, Japan and the former Soviet Union but never states whether tropical countries have or have not reported circles."
            },
            {
              "id": "q17",
              "answer": "Yes",
              "textHtml": "The largest number of crop circle reporting in a single year occurred in 1990",
              "explanation": "The passage says 'the total grew to an outstanding 1,000 newly-formed circles in 1990', the highest yearly figure given.",
              "evidence": "outstanding 1,000 newly-formed circles in 1990"
            },
            {
              "id": "q18",
              "answer": "Yes",
              "textHtml": "The patterns of crop circles have become increasingly complex over the years",
              "explanation": "The passage says 'over the years, crop circles have become much more geometrically intricate', confirming the trend.",
              "evidence": "crop circles have become much more geometrically intricate"
            },
            {
              "id": "q19",
              "answer": "No",
              "textHtml": "All crop circles are hoaxes",
              "explanation": "The writer states 'it is irrational to believe that all crop circles are fake', directly contradicting the claim.",
              "evidence": "it is irrational to believe that all crop circles are fake"
            }
          ],
          "legendHtml": "<p><span><strong>Questions 15-19</strong></span><br/>\n<span>Do the following statements reflect the claims of the writer of this passage? Write:</span></p><p><span><strong>YES</strong>                              if the statement agrees with the views of the writer</span><br/>\n<span><strong>NO</strong>                                if the statement contradicts the views of the writer</span><br/>\n<span><strong>NOT GIVEN</strong>             if it is impossible to say what the writer thinks about this</span></p><p><span>15. Crop circles only appear in wheat fields.</span><br/>\n<span>16. Crop circles have never been documented in tropical countries.</span><br/>\n<span>17. The largest number of crop circle reporting in a single year occurred in 1990.</span><br/>\n<span>18. The patterns of crop circles have become increasingly complex over the years.</span><br/>\n<span>19. All crop circles are hoaxes.</span></p>"
        },
        {
          "title": "Questions 20-23",
          "type": "sentence-completion",
          "instructionHtml": "Complete the summary below. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
          "questions": [
            {
              "id": "q20",
              "answer": [
                "southern England",
                "England"
              ],
              "before": "………………, where in a single year, over one hundred circles appeared. Phenomena such as the appearance of strange lights and unusual",
              "after": "",
              "explanation": "The passage says the largest spread 'began in southern England during the summer of 1980', giving the location needed.",
              "evidence": "began in southern England during the summer of 1980"
            },
            {
              "id": "q21",
              "answer": [
                "high-pitched noises",
                "high-pitched sound",
                "noises",
                "sound"
              ],
              "before": "………………. sometimes occur around the sites of crop circles",
              "after": "",
              "explanation": "The passage mentions that 'high-pitched, warbling, noises have been recorded' near some circle sites.",
              "evidence": "High-pitched, warbling, noises have been recorded"
            },
            {
              "id": "q22",
              "answer": [
                "Animals",
                "insects",
                "wild creatures"
              ],
              "before": "………………. are not affected but it has been observed that birds",
              "after": "",
              "explanation": "The passage says 'the causal energies do not seem to harm animals, or even insects', matching the first gap.",
              "evidence": "do not seem to harm animals, or even insects"
            },
            {
              "id": "q23",
              "answer": "Avoid",
              "before": "………………… flying over a formation",
              "after": "",
              "explanation": "Flocks of birds are seen to 'avoid going directly over a crop circle formation', matching the second gap.",
              "evidence": "avoid going directly over a crop circle formation"
            }
          ],
          "legendHtml": "<p><span><strong>Questions 20-23</strong></span><br/>\n<span>Complete the summary below. Choose <strong>NO MORE THAN THREE WORDS</strong> from the passage for each answer.</span></p><p><span>Since the early 1970s, over ten thousand crop circles have been reported around the world, the greatest number in (20) ………………, where in a single year, over one hundred circles appeared. Phenomena such as the appearance of strange lights and unusual (21) ………………. sometimes occur around the sites of crop circles. (22) ………………. are not affected but it has been observed that birds (23) ………………… flying over a formation.</span></p>",
          "wordLimit": 3
        },
        {
          "title": "Questions 24-27",
          "type": "matching-features",
          "instructionHtml": "Use the information in the text to match one scientist (A-C) with each area of study (24-27) listed below.",
          "questions": [
            {
              "id": "q24",
              "answer": "C",
              "textHtml": "changes in the structure of soil within crop circles",
              "explanation": "Chorost 'found occasions of short-lived radionuclides in the top layer of soil', matching C for soil structure changes.",
              "evidence": "short-lived radionuclides in the top layer of soil"
            },
            {
              "id": "q25",
              "answer": "B",
              "textHtml": "accelerated growth of seeds from crop circles",
              "explanation": "Levengood's samples 'show accelerated growth rates when they are sown', matching B for seed growth.",
              "evidence": "often show accelerated growth rates when they are sown"
            },
            {
              "id": "q26",
              "answer": "A",
              "textHtml": "electrical charges in the air around crop circles",
              "explanation": "Mearden's Plasma Vortex Theory involves 'electrified air (plasma)' forming the circles, matching A for electrical charges.",
              "evidence": "electrified air (plasma)"
            },
            {
              "id": "q27",
              "answer": "B",
              "textHtml": "changes in cell structure of plants found in crop circles",
              "explanation": "Levengood 'confirmed... significant changes at the cellular level of crop circle plants', matching B.",
              "evidence": "significant changes at the cellular level of crop circle plants"
            }
          ],
          "legendHtml": "<p><span><strong>Questions 24-27</strong></span><br/>\n<span>Use the information in the text to match one scientist (A-C) with each area of study (24-27) listed below.</span></p><p><span><strong>A</strong> Dr. Mearden</span><br/>\n<span><strong>B</strong> Dr. Levengood</span><br/>\n<span><strong>C</strong> Michael Chorost</span></p><p><span>Example: observations of light in relation to crop circles <span><strong>A</strong></span></span></p><p><span>24. changes in the structure of soil within crop circles</span><br/>\n<span>25. accelerated growth of seeds from crop circles</span><br/>\n<span>26. electrical charges in the air around crop circles</span><br/>\n<span>27. changes in cell structure of plants found in crop circles</span></p>",
          "options": [
            "A",
            "B",
            "C"
          ]
        }
      ]
    },
    {
      "label": "Passage 3",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 3",
        "title": "Are these two reporters on the same planet?",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>An essay by scientist, educator and environmentalist, Dr. David Suzuki</span>"
          },
          {
            "html": "<span>A number of books, articles and television programs have disputed the reality of the claimed hazards of global warming, overpopulation, deforestation and ozone depletion. Two newspaper commentaries show the profound differences of opinion on critical issues affecting the planet.</span>"
          },
          {
            "html": "<span>The first, by Robert Kaplan, has generated both fear and denial. Entitled The Coming Anarchy, the report paints a horrifying picture of the future for humanity. The author suggests that the terrible consequences of the conjunction between exploding human population and surrounding environmental degradation are already visible in Africa and parts of Southeast Asia. As society is destabilised by the AIDS epidemic, government control evaporates, national borders crumble beneath the pressure of environmental refugees and local populations revert to tribalism to settle old scores or defend against fleeing masses and bands of stateless nomads on the move.</span>"
          },
          {
            "html": "<span>Kaplan believes what he has seen in Africa and Southeast Asia is the beginning of a global pattern of disintegration of social, political and economic infrastructure under the impact of ecological degradation, population pressure and disease. As ecosystems collapse, this scenario could sweep the planet, first in Eastern Europe and then the industrialised countries. It is a frightening scenario, built on a serious attempt to project the aftermath of ecological destruction. It comes from a core recognition that the planet is finite and consumption has vast social, political and economic ramifications. It has also generated a great deal of discussion and controversy.</span>"
          },
          {
            "html": "<span>Marcus Gee pronounces Kaplan’s vision ‘dead wrong’ in a major article headlined Apocalypse Deferred. Attacking the ‘doomsayers’, Gee counters with the statistics favoured by believers in the limitless benefits and potential of economic growth. Citing the spectacular improvements in human health, levels of education and literacy, availability of food and length of life even in the developing world, Gee pronounces the fivefold increase in the world economy since 1950 as the cause of this good news. He does concede that immense problems remain, from ethnic nationalism to tropical deforestation to malnutrition to cropland losses but concludes that Kaplan has exaggerated many of the crises and thus missed the broad pattern of progress.</span>"
          },
          {
            "html": "<span>Focusing on statistics of the decline in child mortality and the rise in longevity, food production and adult literacy, Gee reaches the conclusion that things have never been better. Economic indicators, such as the rise in gross world product and total exports show ‘remarkable sustained and dramatic progress’. Life for the majority of the world’s citizens is getting steadily better in almost every category.</span>"
          },
          {
            "html": "<span>Gee’s conclusions rest heavily on economic indicators. He points out the annual 3.9 percent rise in the global economy and the more than doubling of the gross output per person, that has occurred for the past thirty years. World trade has done even better, growing by 6 percent of a product’s price in 1947 to 5 percent today.</span>"
          },
          {
            "html": "<span>Gee skips lightly over such facts as third world debt and the daily toll of 22,000 child deaths from easily preventable diseases. He also fails to mention that during this period the gulf between rich and poor countries has increased. He does acknowledge the threats of loss of topsoil and forests, pollution of the air and contamination of water. However, he concludes that there is little evidence they are serious enough to halt or even reverse human progress. Gee challenges the notion of a population crisis since there have never been as many people so well off. Furthermore, he suggests there will never be a limit to population because more people means more Einsteins to keep making life better.</span>"
          },
          {
            "html": "<span>Gee’s outlook rests on a tiny minority of scientists who have faith in the boundless potential of science and technology to overcome the physical constraints of air, water and soil so that a much larger population can be sustained. His final proof? -the general rise in living standards along with population growth. But the relationship between changes in living standards and population is a correlation, not proof of causal connection. Gee is ignoring basic economic as well as scientific reality.</span>"
          },
          {
            "html": "<span>If we inherit a bank account with a thousand dollars that earns 5% interest annually, we could withdraw fifty dollars or less each year forever. However, suppose we start to increase our withdrawals, say up to sixty dollars, then seventy dollars and more each year. For many years the account would yield cash. But it would be foolish to conclude that we could keep drawing more from the account indefinitely. Yet that is what Gee believes. As ocean fisheries around the world show, we are using up the ecological capital of the planet (biodiversity, air. water, soil) rather than living off the interest. It is a dangerous deception to believe that the human-created artifice called economies can keep the indicators rising as the life support systems of the planet continue to decline.</span>"
          },
          {
            "html": "<span>The value system that dominates most of the popular media promotes the delusion that resources and the economy can continue to expand indefinitely. It also blinds the public to the urgency and credibility of warnings that an environmental crisis confronts us.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 28-33",
          "type": "matching-features",
          "instructionHtml": "Use the information in the passage to match the people (A-C) with the opinions (28-33) listed below. There may be more than one correct answer.",
          "questions": [
            {
              "id": "q28",
              "answer": "C",
              "textHtml": "Our patterns of consumption are using up the ecological capital of the planet",
              "explanation": "Suzuki writes that 'we are using up the ecological capital of the planet', matching C.",
              "evidence": "using up the ecological capital of the planet"
            },
            {
              "id": "q29",
              "answer": "A",
              "textHtml": "Crises beginning in the Third World will spread to developed countries",
              "explanation": "Kaplan predicts the collapse 'could sweep the planet, first in Eastern Europe and then the industrialised countries', matching A.",
              "evidence": "could sweep the planet, first in Eastern Europe and then the industrialised countries"
            },
            {
              "id": "q30",
              "answer": "B",
              "textHtml": "Scientific progress will enable the planet to sustain increased population",
              "explanation": "Gee's optimism rests on faith in 'the boundless potential of science and technology to overcome the physical constraints', matching B.",
              "evidence": "boundless potential of science and technology"
            },
            {
              "id": "q31",
              "answer": "A",
              "textHtml": "Social and political infrastructure worldwide could collapse",
              "explanation": "Kaplan foresees 'disintegration of social, political and economic infrastructure' as ecosystems collapse, matching A.",
              "evidence": "disintegration of social, political and economic infrastructure"
            },
            {
              "id": "q32",
              "answer": [
                "C",
                "A"
              ],
              "textHtml": "Earth’s life support systems are at critical risk",
              "explanation": "Suzuki warns 'the life support systems of the planet continue to decline', a concern he shares with Kaplan's collapse scenario, matching C and A.",
              "evidence": "the life support systems of the planet continue to decline"
            },
            {
              "id": "q33",
              "answer": "B",
              "textHtml": "Environmental problems are not a threat to progress. A R. Kaplan, author of The Coming Anarchy B M. Gee, author of Apocalypse Deferred C D. Suzuki, author of this passage",
              "explanation": "Gee concludes there is 'little evidence they are serious enough to halt or even reverse human progress', matching B.",
              "evidence": "little evidence they are serious enough to halt or even reverse human progress"
            }
          ],
          "legendHtml": "<p><span><strong>Questions 28-33</strong></span><br/>\n<span>Use the information in the passage to match the people (A-C) with the opinions (28-33) listed below. There may be more than one correct answer.</span></p><p><span>28. Our patterns of consumption are using up the ecological capital of the planet.</span><br/>\n<span>29. Crises beginning in the Third World will spread to developed countries.</span><br/>\n<span>30. Scientific progress will enable the planet to sustain increased population.</span><br/>\n<span>31. Social and political infrastructure worldwide could collapse.</span><br/>\n<span>32. Earth’s life support systems are at critical risk.</span><br/>\n<span>33. Environmental problems are not a threat to progress.</span></p><p><span><strong>A</strong> R. Kaplan, author of The Coming Anarchy</span><br/>\n<span><strong>B</strong> M. Gee, author of Apocalypse Deferred</span><br/>\n<span><strong>C</strong> D. Suzuki, author of this passage</span></p>",
          "options": [
            "A",
            "B",
            "C",
            "D"
          ]
        },
        {
          "title": "Questions 34-36",
          "type": "matching-features",
          "instructionHtml": "Choose ONE phrase pom the list below (A-G) to complete each of the following sentences. There are more phrases than questions so you will not use all of them.",
          "questions": [
            {
              "id": "q34",
              "answer": "G",
              "textHtml": "The growth of world trade",
              "explanation": "World trade's growth is described alongside 'the more than doubling of the gross output per person' during economic expansion, matching G.",
              "evidence": "World trade has done even better"
            },
            {
              "id": "q35",
              "answer": "E",
              "textHtml": "The relationship between population and standard of living",
              "explanation": "Suzuki says the living-standards and population link 'is a correlation, not proof of causal connection', matching E.",
              "evidence": "a correlation, not proof of causal connection"
            },
            {
              "id": "q36",
              "answer": "C",
              "textHtml": "Natural resources and the economy A have most benefited developing countries B has led to a drop in the standard of living generally C cannot continue to expand indefinitely D have decreased third world debt E shows a correlation, not cause and effect F pose a threat to human progress G has been accompanied by global economic growth",
              "explanation": "Suzuki's bank account analogy shows it would be 'foolish to conclude that we could keep drawing more from the account indefinitely', meaning resources cannot expand forever, matching C.",
              "evidence": "we could keep drawing more from the account indefinitely"
            }
          ],
          "legendHtml": "<p><span><strong>Questions 34-36</strong></span><br/>\n<span>Choose <strong>ONE</strong> phrase pom the list below (A-G) to complete each of the following sentences. There are more phrases than questions so you will not use all of them.</span></p><p><span>34. The growth of world trade</span><br/>\n<span>35. The relationship between population and standard of living</span><br/>\n<span>36. Natural resources and the economy</span></p><p><span><strong>A</strong> have most benefited developing countries</span><br/>\n<span><strong>B</strong> has led to a drop in the standard of living generally</span><br/>\n<span><strong>C</strong> cannot continue to expand indefinitely</span><br/>\n<span><strong>D</strong> have decreased third world debt</span><br/>\n<span><strong>E</strong> shows a correlation, not cause and effect</span><br/>\n<span><strong>F</strong> pose a threat to human progress</span><br/>\n<span><strong>G</strong> has been accompanied by global economic growth</span></p>",
          "options": [
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G"
          ]
        },
        {
          "title": "Questions 37-40",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A-D.",
          "questions": [
            {
              "id": "q37",
              "answer": "A",
              "textHtml": "Which of the following is NOT stated by Kaplan as a key contributing factor to potential global destabilisation?",
              "options": [
                "political corruption",
                "collapse of ecosystems",
                "population explosion",
                "diseases"
              ],
              "explanation": "Kaplan's factors are AIDS, ecosystem collapse, population pressure and disease; political corruption is never listed among them, so A is correct.",
              "evidence": "government control evaporates"
            },
            {
              "id": "q38",
              "answer": "D",
              "textHtml": "What is the main source of Gee’s optimism?",
              "options": [
                "scientific and technological advances",
                "decreasing Third World debt",
                "the rise in the standard of living worldwide",
                "economic growth"
              ],
              "explanation": "Gee credits 'the fivefold increase in the world economy since 1950' for the good news he reports, matching D.",
              "evidence": "the fivefold increase in the world economy since 1950"
            },
            {
              "id": "q39",
              "answer": "C",
              "textHtml": "Which of the following can we infer about the views of the author of this passage?",
              "options": [
                "He disagrees with both Gee and Kaplan",
                "He supports the views of Gee",
                "His views are closer to those of Kaplan",
                "He thinks both Gee and Kaplan are right"
              ],
              "explanation": "Suzuki accuses Gee of 'ignoring basic economic as well as scientific reality' and backs the ecological-capital warning, showing his view sits closer to Kaplan's, matching C.",
              "evidence": "Gee is ignoring basic economic as well as scientific reality"
            },
            {
              "id": "q40",
              "answer": "A",
              "textHtml": "The main purpose of the author in this passage is …",
              "options": [
                "to alert us to an environmental crisis",
                "to educate the media",
                "to create uncertainty about the future",
                "to challenge current economic theory"
              ],
              "explanation": "The closing paragraph warns that the popular media 'blinds the public to the urgency... of warnings that an environmental crisis confronts us', matching A.",
              "evidence": "an environmental crisis confronts us"
            }
          ],
          "legendHtml": "<p><span><strong>Questions 37-40</strong></span><br/>\n<span>Choose the correct letter A-D.</span></p><p><span>37. Which of the following is NOT stated by Kaplan as a key contributing factor to potential global destabilisation?</span><br/>\n<span><strong>A</strong> political corruption</span><br/>\n<span><strong>B</strong> collapse of ecosystems</span><br/>\n<span><strong>C</strong> population explosion</span><br/>\n<span><strong>D</strong> diseases</span></p><p><span>38. What is the main source of Gee’s optimism?</span><br/>\n<span><strong>A</strong> scientific and technological advances</span><br/>\n<span><strong>B</strong> decreasing Third World debt</span><br/>\n<span><strong>C</strong> the rise in the standard of living worldwide</span><br/>\n<span><strong>D</strong> economic growth</span></p><p><span>39. Which of the following can we infer about the views of the author of this passage?</span><br/>\n<span><strong>A</strong> He disagrees with both Gee and Kaplan.</span><br/>\n<span><strong>B</strong> He supports the views of Gee.</span><br/>\n<span><strong>C</strong> His views are closer to those of Kaplan.</span><br/>\n<span><strong>D</strong> He thinks both Gee and Kaplan are right.</span></p><p><span>40. The main purpose of the author in this passage is …</span><br/>\n<span><strong>A</strong> to alert us to an environmental crisis.</span><br/>\n<span><strong>B</strong> to educate the media.</span><br/>\n<span><strong>C</strong> to create uncertainty about the future.</span><br/>\n<span><strong>D</strong> to challenge current economic theory.</span></p>"
        }
      ]
    }
  ]
};

export default test;
