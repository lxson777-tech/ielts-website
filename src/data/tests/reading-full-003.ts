import type { PracticeTest } from '../../lib/tests/schema';

const test: PracticeTest = {
  "id": "reading-full-003",
  "skill": "reading",
  "title": "Academic Reading Test 3",
  "description": "A complete three-passage Academic Reading practice test with 40 questions.",
  "durationMinutes": 60,
  "source": {
    "name": "IELTS MASTER / PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-reading-test-317/",
    "permission": "Reused with publisher permission confirmed by Alex on 2026-09-11."
  },
  "parts": [
    {
      "label": "Passage 1",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 1",
        "title": "Do animals dream?",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>Studies using electrodes attached to the heads of sleepers have shown that when we sleep, we do so in two ways that alternate throughout the night. The first is rapid eye movement (REM) or active sleep. During this stage our eyes move, even though our eyelids are closed. Our muscles also twitch slightly, though they are largely paralysed so we don’t hurt ourselves. In contrast, we also engage in non-REM sleep, during which we barely move at all. Most dream states, and certainly those with the most vivid dreams, happen during REM sleep.</span>"
          },
          {
            "html": "<span>There’s some evidence that other mammals may also dream. For example, researchers compared the brain patterns of rats running through a maze when awake with their brain patterns during REM sleep. They found the patterns were very similar and concluded that the sleeping rats were dreaming about going through the maze.</span>"
          },
          {
            "html": "<span>But finding evidence of dreaming in non-mammals has proved more difficult. Their brains are very different from those of humans, and it can often be difficult to record their activity while they are sleeping. Recently, however, researchers succeeded in recording brain activity in sleeping pigeons. As in mammals, the recordings revealed both REM and non-REM sleep. Intriguingly, REM sleep activity was high in brain regions involved in processing visual information, especially images related to physical activities such as flying, which suggests that this may possibly be what the pigeons were dreaming about.</span>"
          },
          {
            "html": "<span>That said, dreaming and REM sleep are unlikely to be universal in the animal kingdom. For example, sponges don’t have brains, so they lack the machinery for dreaming. There are also some animals with unusual sleep patterns. These include whales and dolphins, which do not shut down their entire brain when they sleep, but only half of it, keeping the rest awake. They also show no sign of REM sleep, suggesting that they may only experience non-REM dreams, which are less vivid. This is surprising because we tend to think of whales and dolphins as having complex inner lives. It’s thought that they don’t experience REM sleep because during REM sleep animals are more vulnerable to extremes of temperature.</span>"
          },
          {
            "html": "<span>Nevertheless, in many cases REM sleep does seem to have benefits. Growing evidence from birds and mammals suggests that REM sleep and dreaming are important for forming memories and learning. It is believed that when events are replayed in dreams, this helps to integrate memories into longer-term storage. As soon as animals evolved moderately complex lifestyles, they would have needed to dream in order to manage these lifestyles.</span>"
          },
          {
            "html": "<span>However, we still don’t understand how this outward behaviour relates to internal experience. It seems impossible to know what it is like to be a rat or a pigeon, let alone imagine their dreamscapes. We are quick to interpret the twitching limbs and quiet barks of sleeping dogs, but the truth is that we don’t know if there is an internal experience of chasing rabbits that comes along with that.</span>"
          },
          {
            "html": "<span>Another non-human dreamer offers insight here. In 2019, while making a documentary, David Scheel of Alaska Pacific University in the USA housed an octopus named Heidi in a tank in his living room. At one point, in the middle of the night, Heidi seemed to dream: her limbs and head moved, and her skin rapidly changed colour, as though she was pursuing a crab.</span>"
          },
          {
            "html": "<span>Similarly, a report recently emerged of a sleeping octopus apparently having a nightmare. Costello, as the octopus was called, thrashed around, extended his mantle as if trying to make himself look bigger, and squirted ink as though he were being attacked by a predator. The nightmare study is intriguing, says Scheel, but is only based on one animal. He argues that as well as outward behaviour, brain imaging is needed to show that the octopuses are replaying sequences of activities from their waking lives in dreams.</span>"
          },
          {
            "html": "<span>The trouble is that we will never be able to experience any animal’s dreams. That goes for other humans’ dreams too. But we can try to imagine what these dreamscapes are like by meeting animals on their own terms. For example, vision is the dominant sense for many humans, and so our dreams are heavily visual too. Dogs primarily navigate the world using smell while spiders rely much more on vibrations.</span>"
          },
          {
            "html": "<span>It is likely that dreaming has served multiple purposes since the first complex animals evolved. And if this is the case, it is possible that better understanding of these purposes might shed light on the true purpose of our own dreams.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 1-5",
          "type": "table-completion",
          "instructionHtml": "Complete the table below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 1-5 on your answer sheet.",
          "questions": [
            {
              "id": "q1",
              "answer": "Rats",
              "explanation": "The second paragraph describes research on rats, whose brain patterns while running a maze matched those seen in REM sleep, so ‘Rats’ is the animal in this row of the table.",
              "evidence": "researchers compared the brain patterns of rats running through a maze when awake with their brain patterns during REM sleep"
            },
            {
              "id": "q2",
              "answer": "Visual",
              "explanation": "The third paragraph says REM activity was high in regions ‘processing visual information’, matching the word needed for what the pigeons’ brains were dealing with.",
              "evidence": "REM sleep activity was high in brain regions involved in processing visual information, especially images related to physical activities such as flying"
            },
            {
              "id": "q3",
              "answer": "Half",
              "explanation": "The fourth paragraph says whales and dolphins ‘do not shut down their entire brain… but only half of it, keeping the rest awake’, giving the word for this gap.",
              "evidence": "do not shut down their entire brain when they sleep, but only half of it, keeping the rest awake"
            },
            {
              "id": "q4",
              "answer": "Temperature",
              "explanation": "The fourth paragraph explains they avoid REM sleep because ‘animals are more vulnerable to extremes of temperature’ during it, matching this gap.",
              "evidence": "during REM sleep animals are more vulnerable to extremes of temperature"
            },
            {
              "id": "q5",
              "answer": "Vivid",
              "explanation": "The fourth paragraph says whales and dolphins ‘may only experience non-REM dreams, which are less vivid’, giving the word for this final gap.",
              "evidence": "they may only experience non-REM dreams, which are less vivid"
            }
          ],
          "legendHtml": "<table><tbody><tr><td colspan=\"3\"><span><strong>Research into sleep and dreaming</strong></span></td></tr><tr><td></td><td width=\"198\"><strong><span>Research findings</span></strong></td><td width=\"198\"><strong><span>Comment</span></strong></td></tr><tr><td width=\"198\"><span>Humans</span></td><td width=\"198\"><span>·       humans experience REM sleep and non-REM sleep</span><p><span>·       in REM sleep, the eyes and muscles move</span></p></td><td width=\"198\"></td></tr><tr><td width=\"198\"><span>(1) ………………   </span></td><td width=\"198\"><span>·       similar brain patterns were observed when active and sleeping</span></td><td width=\"198\"><span>indicative of dreaming</span></td></tr><tr><td width=\"198\"><span>Pigeons</span></td><td width=\"198\"><span>·       when sleeping, pigeons displayed activity in parts of the brain that deal with (2) …………. input</span></td><td width=\"198\"><span>may have been dreaming of flying</span></td></tr><tr><td width=\"198\"><span>Whales and dolphins</span></td><td width=\"198\"><span>·       still have (3) ………..their brain awake when they sleep</span><p><span>·       don’t experience REM sleep, as this could affect their sensitivity to<strong>              </strong>(4) <strong>…</strong></span></p></td><td width=\"198\"><span>their dreams are probably not very (5) …………<strong>  </strong></span></td></tr></tbody></table>",
          "wordLimit": 1,
          "table": {
            "rows": [
              [
                "……………… · similar brain patterns were observed when active and sleeping indicative of dreaming Pigeons · when sleeping, pigeons displayed activity in parts of the brain that deal with",
                {
                  "questionId": "q1"
                },
                ""
              ],
              [
                "…………. input may have been dreaming of flying Whales and dolphins · still have",
                {
                  "questionId": "q2"
                },
                ""
              ],
              [
                "………..their brain awake when they sleep · don’t experience REM sleep, as this could affect their sensitivity to",
                {
                  "questionId": "q3"
                },
                ""
              ],
              [
                "… their dreams are probably not very",
                {
                  "questionId": "q4"
                },
                ""
              ],
              [
                "…………",
                {
                  "questionId": "q5"
                },
                ""
              ]
            ]
          }
        },
        {
          "title": "Questions 6-13",
          "type": "tfng",
          "instructionHtml": "Do the following statements agree with the information given in reading passage? In boxes 6-13 on your answer sheet, write",
          "questions": [
            {
              "id": "q6",
              "answer": "True",
              "textHtml": "Dreaming about past experiences helps us to create lasting memories of them",
              "explanation": "The fifth paragraph says ‘when events are replayed in dreams, this helps to integrate memories into longer-term storage’, confirming the statement.",
              "evidence": "when events are replayed in dreams, this helps to integrate memories into longer-term storage"
            },
            {
              "id": "q7",
              "answer": "False",
              "textHtml": "It is now possible to tell what type of dream a dog is having",
              "explanation": "The sixth paragraph admits ‘we don’t know if there is an internal experience… that comes along with’ a dog’s twitching, contradicting the claim that we can now tell what dogs dream about.",
              "evidence": "we don’t know if there is an internal experience of chasing rabbits that comes along with that"
            },
            {
              "id": "q8",
              "answer": "Not given",
              "textHtml": "David Scheel’s documentary was influential on other research into the sleeping patterns of octopuses",
              "explanation": "The passage describes what happened during Scheel’s documentary but never says it influenced other researchers’ work on octopuses, so this is not given."
            },
            {
              "id": "q9",
              "answer": "False",
              "textHtml": "While it was asleep, the octopus called Costello reacted as if it was hunting",
              "explanation": "Costello behaved ‘as though he were being attacked by a predator’, a defensive reaction, not one that suggests he was hunting, contradicting the statement.",
              "evidence": "squirted ink as though he were being attacked by a predator"
            },
            {
              "id": "q10",
              "answer": "True",
              "textHtml": "Scheel believes more research into octopuses’ dreams should be carried out",
              "explanation": "Scheel says brain imaging ‘is needed to show that the octopuses are replaying sequences… in dreams’, implying he believes more research is required.",
              "evidence": "he argues that as well as outward behaviour, brain imaging is needed to show that the octopuses are replaying sequences of activities from their waking lives in dreams"
            },
            {
              "id": "q11",
              "answer": "False",
              "textHtml": "We may soon be able to share the dreams of other human beings",
              "explanation": "The passage says ‘we will never be able to experience any animal’s dreams. That goes for other humans’ dreams too’, directly contradicting the idea that we may soon share human dreams.",
              "evidence": "we will never be able to experience any animal’s dreams. That goes for other humans’ dreams too"
            },
            {
              "id": "q12",
              "answer": "Not given",
              "textHtml": "Hearing may be an important part of the dreams of some animals",
              "explanation": "The passage mentions smell for dogs and vibrations for spiders as dominant senses, but it never discusses hearing in animal dreams, so this is not given."
            },
            {
              "id": "q13",
              "answer": "Not given",
              "textHtml": "Interest in the reasons why humans dream has increased greatly in recent times",
              "explanation": "The passage never discusses whether interest in why humans dream has grown over time, so this is not given."
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>TRUE</dt><dd>if the statement agrees with the information</dd><dt>FALSE</dt><dd>if the statement contradicts the information</dd><dt>NOT GIVEN</dt><dd>if there is no information on this</dd></dl>"
        }
      ]
    },
    {
      "label": "Passage 2",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 2",
        "title": "Mapungubwe Located in southern Africa just below the Limpopo River, the kingdom of Mapungubwe, flourished between the 11th and 13th century CE",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span><strong>A</strong> Mapungubwe, which was one of the first states in southern Africa, was formed by Bantu-speaking peoples who were farmers. The area controlled by the rulers of Mapungubwe had at its heart a large sandstone plateau, which was easily defended due to its inaccessibility. As with other kingdoms in the region of southern Africa, cattle herding and other types of farming brought plenty of food and a surplus that could be traded for needed goods. Archaeology has revealed extensive layers of bones and manure, which indicate that from the 9th century CE there were large cattle herds, the traditional source of political power in southern African communities. The archaeological record for the 10th century shows a marked increase in the number of domesticated cattle in the area as well as cotton cultivation and weaving, as indicated by abundant finds of spindle whorls.</span>"
          },
          {
            "html": "<span><strong>B</strong> The total population of Mapungubwe at its peak in the mid-13th century was around 5,000 people. The chief or king of Mapungubwe was likely the wealthiest individual in the society, and would have owned more cattle and precious materials than anyone else. The king and his advisers dwelt in a stone enclosure composed of stone walls and housing built on the highest level of the community’s territory, a natural sandstone hill which is some 30 metres high and 100 metres in length. Occupation on the hill dates from the 11th century and the entire complex was surrounded by a wooden palisade, as indicated by postholes made in the rock. The rest of the community lived in mud and thatch housing spread out below the hill, although there is one stone structure here. </span><span>This settlement, known as Babandyanalo, covers around 5 hectares (12.3 acres) and predates the hilltop structures.</span>"
          },
          {
            "html": "<span><strong>C</strong> The kings of Mapungubwe were buried at the top of the hill site in a demarcated area away from the dwellings, while other members of the community were buried at the surrounding valley level. A wooden staircase connected the two levels, the sockets for the steps being clearly visible in the sandstone cliff face. There were some grander residences dotted around the outskirts of Babandyanalo, and these probably belonged to male relatives of the king. There are many other smaller but still impressive sites across the Mapungubwe plateau, which are located anywhere from 15 to 100 kilometres from the major hill site. Containing stone residences and walls, they likely belonged to local chiefs who acted as servants to the king.</span>"
          },
          {
            "html": "<span><strong>D</strong> The Mapungubwe plateau has a very high number of carnivore animal remains and ivory splinters, suggesting that the skins of these large animals and ivory elephant tusks were accumulated, probably for trade with coastal areas reached by the Limpopo River. The presence of glass beads, almost certainly from India, indicate there was trade of some sort with other states on the coast who, in turn, traded with merchants travelling from India by sea. Mapungubwe also benefited from locally-sourced copper and the gold trade as it passed from the kingdom of Great Zimbabwe (12-15th century), situated to the north of Mapungubwe, to the coastal city of Kosala. It is likely that trade links led to a strengthening of political authority in order to control and even monopolise these lucrative interregional connections.</span>"
          },
          {
            "html": "<span><strong>E</strong> Archaeological discoveries reveal that pottery was produced on a scale large enough to suggest the presence of professional potters, and is another indicator of the prosperity of Mapungubwe society. Archaeological finds include spherical vessels with short necks, beakers, and bowls, many of which have decorative stamps. There are also ceramic discs, and whistles. In addition, cattle, sheep, and goat figurines, and small figures of highly stylised humans with elongated bodies and short limbs have been found. The figures may have been used in ceremonies as offerings to ancestors, but their precise function is not known. Other discoveries include small jewellery items made from locally sourced copper.</span>"
          },
          {
            "html": "<span><strong>F</strong> Beautifully decorated artefacts made of gold have also been found at Mapungubwe. A type of decoration, found nowhere else except Great Zimbabwe, involved the crafting of gold into small rectangular sheets and carving geometrical patterns into it. These sheets were then used to cover wooden objects (which have not survived) using small tacks, also made of gold. One such object that has been discovered may have been a sceptre, while additional evidence of local gold-working is a rhinoceros figurine made from small hammered sheets, and thousands of small gold beads. These objects were all found at the royal burial site and date to c. 1150. They are the first known indicators that gold had an intrinsic value of its own (as opposed to that of a currency) in southern Africa.</span>"
          },
          {
            "html": "<span><strong>G</strong> The kingdom of Mapungubwe was already in decline by the late 13th century, probably because overpopulation placed too much stress on local resources, a situation that may have been brought to a crisis point by a series of droughts. Trade routes may also have shifted northwards. Certainly, the areas that now prospered were to the north, such as Great Zimbabwe.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 14-19",
          "type": "paragraph-matching",
          "instructionHtml": "Reading passage has seven paragraphs, A-G. Which paragraph contains the following information? Write the correct letter, A-G, in boxes 14-19 on your answer sheet.",
          "questions": [
            {
              "id": "q14",
              "answer": "E",
              "textHtml": "a mention of the uncertainty regarding the purpose of certain objects",
              "explanation": "Paragraph E says of the figurines that ‘their precise function is not known’, matching this heading about uncertain purpose.",
              "evidence": "their precise function is not known"
            },
            {
              "id": "q15",
              "answer": "G",
              "textHtml": "the likelihood that a climatic factor increased the problems Mapungubwe faced",
              "explanation": "Paragraph G says the decline may have been ‘brought to a crisis point by a series of droughts’, a climatic factor.",
              "evidence": "a situation that may have been brought to a crisis point by a series of droughts"
            },
            {
              "id": "q16",
              "answer": "C",
              "textHtml": "a mention of the location where members of the king’s family are thought to have lived",
              "explanation": "Paragraph C says the grander outlying residences ‘probably belonged to male relatives of the king’, matching this heading.",
              "evidence": "some grander residences dotted around the outskirts of Babandyanalo, and these probably belonged to male relatives of the king"
            },
            {
              "id": "q17",
              "answer": "D",
              "textHtml": "a reference to people who brought goods by ship",
              "explanation": "Paragraph D refers to ‘merchants travelling from India by sea’, matching people who brought goods by ship.",
              "evidence": "merchants travelling from India by sea"
            },
            {
              "id": "q18",
              "answer": "B",
              "textHtml": "an estimate of the size to which the Mapungubwe community grew",
              "explanation": "Paragraph B gives the figure that Mapungubwe’s ‘total population at its peak in the mid-13th century was around 5,000 people’.",
              "evidence": "The total population of Mapungubwe at its peak in the mid-13th century was around 5,000 people"
            },
            {
              "id": "q19",
              "answer": "A",
              "textHtml": "a mention of agricultural produce being exchanged for other items",
              "explanation": "Paragraph A says farming ‘brought plenty of food and a surplus that could be traded for needed goods’, matching agricultural produce exchanged for other items.",
              "evidence": "a surplus that could be traded for needed goods"
            }
          ],
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
          "title": "Questions 20-21",
          "type": "multiple-answer",
          "instructionHtml": "and 21 Choose TWO letters, A-E. Write the correct letters in boxes 20 and 21 on your answer sheet",
          "questions": [
            {
              "id": "q20",
              "answer": [
                "B",
                "D"
              ],
              "textHtml": "",
              "answerPairId": "reading-317-q20-q21",
              "explanation": "Paragraph F says the gold objects ‘were all found at the royal burial site’ (B) and that the decoration technique was ‘found nowhere else except Great Zimbabwe’ (D), so B and D are the two correct statements."
            },
            {
              "id": "q21",
              "answer": [
                "B",
                "D"
              ],
              "textHtml": "",
              "answerPairId": "reading-317-q20-q21",
              "explanation": "Paragraph F says the gold objects ‘were all found at the royal burial site’ (B) and that the decoration technique was ‘found nowhere else except Great Zimbabwe’ (D), so B and D are the two correct statements."
            }
          ],
          "legendHtml": "<p><strong><span>Questions 20 and 21</span></strong></p><p><span>The archaeological record reveals information about gold and the kingdom of Mapungubwe. Which TWO pieces of information are mentioned by the writer?</span></p>",
          "selectCount": 2,
          "choices": [
            {
              "value": "A",
              "label": "Not everyone in Mapungubwe used gold as a form of payment"
            },
            {
              "value": "B",
              "label": "Items of gold were placed close to where Mapungubwe kings were buried"
            },
            {
              "value": "C",
              "label": "The most valuable item discovered in Mapungubwe was a sceptre made of gold"
            },
            {
              "value": "D",
              "label": "The way gold was decorated in Mapungubwe was also practised in another kingdom"
            },
            {
              "value": "E",
              "label": "Working with gold was a respected occupation in the Mapungubwe community"
            }
          ],
          "explanationHtml": "<p>Paragraph F says the gold objects ‘were all found at the royal burial site’ (B) and that the decoration technique was ‘found nowhere else except Great Zimbabwe’ (D), so <strong>B</strong> and <strong>D</strong> are the two correct statements.</p>"
        },
        {
          "title": "Questions 22-26",
          "type": "sentence-completion",
          "instructionHtml": "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 22-26 on your answer sheet.",
          "questions": [
            {
              "id": "q22",
              "answer": "Prosperity",
              "explanation": "Paragraph E says large-scale pottery production ‘is another indicator of the prosperity of Mapungubwe society’, matching this gap.",
              "evidence": "is another indicator of the prosperity of Mapungubwe society"
            },
            {
              "id": "q23",
              "answer": "Whistles",
              "explanation": "Paragraph E lists ‘ceramic discs, and whistles’ among the finds, matching this gap.",
              "evidence": "There are also ceramic discs, and whistles"
            },
            {
              "id": "q24",
              "answer": "Bodies",
              "explanation": "Paragraph E describes figures of humans ‘with elongated bodies and short limbs’, matching this gap.",
              "evidence": "small figures of highly stylised humans with elongated bodies and short limbs"
            },
            {
              "id": "q25",
              "answer": "Ancestors",
              "explanation": "Paragraph E suggests the figures ‘may have been used in ceremonies as offerings to ancestors’, matching this gap.",
              "evidence": "The figures may have been used in ceremonies as offerings to ancestors"
            },
            {
              "id": "q26",
              "answer": "Jewellery",
              "explanation": "Paragraph E mentions ‘small jewellery items made from locally sourced copper’, matching this final gap.",
              "evidence": "small jewellery items made from locally sourced copper"
            }
          ],
          "legendHtml": "<p><strong><span>Archaeological discoveries</span></strong></p><p><span>The Mapungubwe community’s (22) ………………….. is indicated by the amount of professionally made pottery discovered at the site. Many of these objects, such as beakers and bowls, are highly decorated and have been marked with stamps. Other finds include round ceramic objects, (23) ………………. and figures of various animals, as well as models of people with stretched (24) …………………. It is possible that these had a role in ceremonies to honour (25) ……………………. In addition, pieces of (26) ………………….. made from a local metal have been found at the site.</span></p>",
          "wordLimit": 1
        }
      ]
    },
    {
      "label": "Passage 3",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 3",
        "title": "Artificial Intelligence",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>In many countries in the West, hysteria about the future of artificial intelligence (AI) is everywhere. There seems to be no shortage of sensationalist news about how AI could cure diseases, accelerate human innovation and improve human creativity. Just looking at the media headlines, you might think that we are already living in a future where AI has infiltrated every aspect of society.</span>"
          },
          {
            "html": "<span>While it is undeniable that AI has opened up a wealth of promising opportunities, it has also led to the emergence of a mindset that can be best described as AI solutionism’. This is the philosophy that, given enough data, machine learning algorithms can solve all of humanity’s problems. But, in fact, instead of supporting AI progress, this mindset actually jeopardises the value of machine intelligence by disregarding important AI safety principles and setting unrealistic expectations about what AI can really do for humanity.</span>"
          },
          {
            "html": "<span>In only a few years, AI solutionism has made its way from the technology evangelists’ mouths in Silicon Valley in California to the minds of government officials and policymakers around the world. The pendulum has swung from the dystopian notion that AI will destroy humanity to the utopian belief that our algorithmic saviour is here.</span>"
          },
          {
            "html": "<span>We are now seeing governments pledge support to national AI initiatives and compete in a technological race to dominate the burgeoning machine-learning sector. While many politicians proclaim the transformative effects of the coming AI revolution’, they fail to realise the complexity around deploying advanced machine learning systems in the real world.</span>"
          },
          {
            "html": "<span>One of the most promising varieties of AI technologies are neural networks. This form of machine learning is loosely modelled on the neuronal structure of the human brain, but on a much smaller scale. But what many politicians do not understand is that simply adding a neural network to a problem will not automatically mean that you’ll find a solution. Similarly, adding a neural network to a system of government does not mean it will be instantaneously more inclusive or fair.</span>"
          },
          {
            "html": "<span>AI systems need a lot of data to function, but the public sector typically does not have the appropriate data infrastructure to support advanced machine learning. Most of the data remains stored in offline archives. The few digitised sources of data that exist tend to be buried in bureaucracy. More often than not, data is spread across different government departments that each require special permissions to be accessed. Above all, the public sector typically lacks the human talent with the right technological capabilities to fully reap the benefits of machine intelligence.</span>"
          },
          {
            "html": "<span>For these reasons, the sensationalism over AI has attracted many critics. Stuart Russell, a professor of computer science at the University of California, Berkeley, has long advocated a more sensible and realistic approach that focuses on simple everyday applications of AI instead of the hypothetical takeover by super-intelligent robots. Similarly, Rodney Brooks, professor of robotics at Massachusetts Institute of Technology, writes that ‘almost all innovations in robotics and AI take far, far, longer to be really widely deployed than people in the field and outside the field imagine’.</span>"
          },
          {
            "html": "<span>One of the many difficulties in deploying machine learning systems is that AI is extremely susceptible to adversarial attacks. This means that a malicious AI can target another AI to make it behave in a certain way, such as forcing it to make wrong predictions. Many researchers have warned against the rolling out of AI without appropriate security standards and defence mechanisms. Still, AI security remains an often overlooked topic when machine learning systems are installed.</span>"
          },
          {
            "html": "<span>If we are to reap the benefits and minimise the potential harms of AI, we must start thinking about how machine learning can be meaningfully applied to specific areas of government, business and society. This means we need to have a discussion about AI ethics and the distrust that many people have towards machine learning.</span>"
          },
          {
            "html": "<span>Most importantly, we need to be aware of the limitations of AI and where people still need to take the lead. Instead of painting an unrealistic picture of the power of AI, it is important to take a step back and separate the actual technological capabilities of AI from fantasy.</span>"
          },
          {
            "html": "<span>The medical profession has also recognised the drawbacks to AI. The IBM Watson for Oncology programme was a piece of AI that was meant to help doctors treat cancer. Even though it was developed to deliver the best recommendations, human experts found it hard to trust the machine. As a result, the AI programme was abandoned in most hospitals where it was trialled.</span>"
          },
          {
            "html": "<span>Similar difficulties arose in the legal domain when algorithms were used in courts in the US to sentence criminals. An algorithm calculated risk assessment scores and advised judges on the sentencing. The system was found to amplify structural racial discrimination and was later abandoned.</span>"
          },
          {
            "html": "<span>There are some crucial lessons here for everyone aiming to boost investments in national AI programmes. These examples demonstrate that there is no AI solution for everything. Using AI simply for the sake of AI may not always be productive or useful, and not every issue is best addressed by applying machine intelligence to it. All solutions come with a cost and not everything that can be automated should be.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 27-29",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter, A, B, C or D. Write the correct letter in boxes 27-29 on your answer sheet.",
          "questions": [
            {
              "id": "q27",
              "answer": "B",
              "textHtml": "What is the writer doing in the first paragraph?",
              "options": [
                "predicting the future impact of Al",
                "describing a public perception of Al",
                "outlining some possible benefits of Al",
                "highlighting the breadth of the influence of Al"
              ],
              "explanation": "The first paragraph describes ‘hysteria about the future of artificial intelligence’ and sensationalist headlines, matching option B, describing a public perception of AI.",
              "evidence": "hysteria about the future of artificial intelligence (AI) is everywhere"
            },
            {
              "id": "q28",
              "answer": "A",
              "textHtml": "When discussing Al solutionism in the second paragraph, the writer",
              "options": [
                "points out a risk involved",
                "specifies its probable origins",
                "mentions its chief supporters",
                "weighs up some pros and cons"
              ],
              "explanation": "The second paragraph warns AI solutionism ‘jeopardises the value of machine intelligence by disregarding important AI safety principles’, matching option A, pointing out a risk.",
              "evidence": "this mindset actually jeopardises the value of machine intelligence by disregarding important AI safety principles"
            },
            {
              "id": "q29",
              "answer": "C",
              "textHtml": "In the fourth paragraph, the writer suggests that many politicians may",
              "options": [
                "have failed to appreciate the true potential of Al initiatives",
                "have misunderstood the function of the machine-learning sector",
                "be unaware of the challenges of implementing national Al initiatives",
                "be too keen to enter the race to dominate the machine-learning sector"
              ],
              "explanation": "The fourth paragraph says politicians ‘do not understand’ that adding a neural network will not automatically solve a problem, matching option C, being unaware of implementation challenges.",
              "evidence": "what many politicians do not understand is that simply adding a neural network to a problem will not automatically mean that you’ll find a solution"
            }
          ]
        },
        {
          "title": "Questions 30-35",
          "type": "matching-features",
          "instructionHtml": "Complete the summary using the list of words, A-l, below. Write the correct letter, A-l, in boxes 30-35 on your answer sheet.",
          "questions": [
            {
              "id": "q30",
              "answer": "F",
              "textHtml": "……………… Most public sector organisations have not set up the necessary",
              "explanation": "The passage says adding a neural network to government ‘does not mean it will be instantaneously more inclusive or fair’, which this summary paraphrases as promoting ‘equality’ (F).",
              "evidence": "adding a neural network to a system of government does not mean it will be instantaneously more inclusive or fair"
            },
            {
              "id": "q31",
              "answer": "G",
              "textHtml": "……………. to manage the huge amount of data required to enable Al to function. Complex bureaucracy is another issue, as each person involved needs",
              "explanation": "The passage says the public sector ‘does not have the appropriate data infrastructure’, matching option G, ‘framework’.",
              "evidence": "the public sector typically does not have the appropriate data infrastructure to support advanced machine learning"
            },
            {
              "id": "q32",
              "answer": "I",
              "textHtml": "………………………………. to access the relevant data, which is often spread across different departments. But the main problem is that few public sector employees have the",
              "explanation": "The passage says departments ‘each require special permissions to be accessed’, matching option I, ‘approval’.",
              "evidence": "each require special permissions to be accessed"
            },
            {
              "id": "q33",
              "answer": "C",
              "textHtml": "………………………………. to take full advantage of machine intelligence. The medical profession experimented with an Al programme, but their experts had little faith in its",
              "explanation": "The passage says the public sector ‘lacks the human talent with the right technological capabilities’, matching option C, ‘skills’.",
              "evidence": "lacks the human talent with the right technological capabilities to fully reap the benefits of machine intelligence"
            },
            {
              "id": "q34",
              "answer": "A",
              "textHtml": "………… , and the programme was abandoned. US courts also abandoned the use of algorithms when it was found that these reflected and magnified the existing",
              "explanation": "The passage says doctors ‘found it hard to trust the machine’, matching option A, ‘reliability’.",
              "evidence": "human experts found it hard to trust the machine"
            },
            {
              "id": "q35",
              "answer": "D",
              "textHtml": "…………….. within the legal profession. A reliability B funding C skills D prejudices E computers F equality G framework H confidentiality I approval",
              "explanation": "The passage says the sentencing algorithm ‘was found to amplify structural racial discrimination’, matching option D, ‘prejudices’.",
              "evidence": "The system was found to amplify structural racial discrimination"
            }
          ],
          "legendHtml": "<p><strong><span>AS in government, medicine and the law</span></strong></p><p><span>Neural networks are a promising area of A! technology for governments. However, many politicians overestimate their capabilities, believing that the mere addition of a neural network will produce solutions and promote (30) ………………</span></p><p><span>Most public sector organisations have not set up the necessary (31) ……………. to manage the huge amount of data required to enable Al to function. Complex bureaucracy is another issue, as each person involved needs (32) ………………………………. to access the relevant data, which is often spread across different departments. But the main problem is that few public sector employees have the (33) ………………………………. to take full advantage of machine intelligence.</span></p><p><span>The medical profession experimented with an Al programme, but their experts had little faith in its (34) ………… , and the programme was abandoned. US courts also abandoned the use of algorithms when it was found that these reflected and magnified the existing (35) …………….. within the legal profession.</span></p><p><span><strong>A</strong> reliability</span><br/>\n<span><strong>B</strong> funding</span><br/>\n<span><strong>C</strong> skills</span><br/>\n<span><strong>D</strong> prejudices</span><br/>\n<span><strong>E</strong> computers</span><br/>\n<span><strong>F</strong> equality</span><br/>\n<span><strong>G</strong> framework</span><br/>\n<span><strong>H</strong> confidentiality</span><br/>\n<span><strong>I</strong> approval</span></p>",
          "options": [
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I"
          ]
        },
        {
          "title": "Questions 36-39",
          "type": "yes-no-notgiven",
          "instructionHtml": "Do the following statements agree with the claims of the writer in reading passage? In boxes 36-39 on your answer sheet, write",
          "questions": [
            {
              "id": "q36",
              "answer": "No",
              "textHtml": "Stuart Russell’s proposals regarding the use of Al are impractical",
              "explanation": "Russell is described as advocating ‘a more sensible and realistic approach that focuses on simple everyday applications’, the opposite of impractical, contradicting the statement.",
              "evidence": "advocated a more sensible and realistic approach that focuses on simple everyday applications of AI"
            },
            {
              "id": "q37",
              "answer": "Not given",
              "textHtml": "Rodney Brooks’ view has attracted unfair criticism from supporters of Al",
              "explanation": "The passage quotes Brooks’ view but never mentions any unfair criticism directed at him, so this is not given."
            },
            {
              "id": "q38",
              "answer": "No",
              "textHtml": "Nowadays, the need to protect Al systems is always taken into account when they are set up",
              "explanation": "The passage says AI security ‘remains an often overlooked topic when machine learning systems are installed’, contradicting the claim that protection is always considered.",
              "evidence": "AI security remains an often overlooked topic when machine learning systems are installed"
            },
            {
              "id": "q39",
              "answer": "Yes",
              "textHtml": "In order to benefit from Al and minimise the harms, we have to explore people’s concerns about its use",
              "explanation": "The passage says ‘we need to have a discussion about AI ethics and the distrust that many people have towards machine learning’, confirming the statement.",
              "evidence": "we need to have a discussion about AI ethics and the distrust that many people have towards machine learning"
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>YES</dt><dd>if the statement agrees with the claims of the writer</dd><dt>NO</dt><dd>if the statement contradicts the claims of the writer</dd><dt>NOT GIVEN</dt><dd>if it is impossible to say what the writer thinks about this</dd></dl>"
        },
        {
          "title": "Question 40",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter. A, B, C or D.",
          "questions": [
            {
              "id": "q40",
              "answer": "B",
              "textHtml": "What would be a suitable subtitle for reading passage?",
              "options": [
                "How to make the most of what Al has to offer",
                "Why Al may not be the answer to our problems",
                "Why governments should not invest in Al systems",
                "How Al could improve the efficiency of the public sector"
              ],
              "explanation": "The final paragraph concludes ‘there is no AI solution for everything’, matching option B, that AI may not be the answer to our problems.",
              "evidence": "there is no AI solution for everything"
            }
          ]
        }
      ]
    }
  ]
};

export default test;
