import type { PracticeTest } from '../../lib/tests/schema';

const test: PracticeTest = {
  "id": "reading-full-008",
  "skill": "reading",
  "title": "Academic Reading Test 8",
  "description": "A complete three-passage Academic Reading practice test with 40 questions.",
  "durationMinutes": 60,
  "source": {
    "name": "IELTS MASTER / PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-reading-test-310/",
    "permission": "Reused with publisher permission confirmed by Alex on 2026-09-11."
  },
  "parts": [
    {
      "label": "Passage 1",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 1",
        "title": "THE KAKAPO",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>The kakapo is a nocturnal, flightless parrot that is critically endangered and one of New Zealand’s unique treasures</span>"
          },
          {
            "html": "<span>The kakapo, also known as the owl parrot, is a large, forest-dwelling bird, with a pale owl-like face. Up to 64 cm in length, it has predominantly yellow-green feathers, forward-facing eyes, a large grey beak, large blue feet, and relatively short wings and tail. It is the world’s only flightless parrot, and is also possibly one of the world’s longest-living birds, with a reported lifespan of up to 100 years.</span>"
          },
          {
            "html": "<span>Kakapo are solitary birds and tend to occupy the same home range for many years. They forage on the ground and climb high into trees. They often leap from trees and flap their wings, but at best manage a controlled descent to the ground. They are entirely vegetarian, with their diet including the leaves, roots and bark of trees as well as bulbs, and fern fronds.</span>"
          },
          {
            "html": "<span>Kakap6 breed in summer and autumn, but only in years when food is plentiful. Males play no part in incubation or chick-rearing – females alone incubate eggs and feed the chicks. The 1-4 eggs are laid in soil, which is repeatedly turned over before and during incubation. The female kakapo has to spend long periods away from the nest searching for food, which leaves the unattended eggs and chicks particularly vulnerable to predators.</span>"
          },
          {
            "html": "<span>Before humans arrived, kakapo were common throughout New Zealand’s forests. However, this all changed with the arrival of the first Polynesian settlers about 700 years ago. For the early settlers, the flightless kakapo was easy prey. They ate its meat and used its feathers to make soft cloaks. With them came the Polynesian dog and rat, which also preyed on kakapo. By the time European colonisers arrived in the early 1800s, kakapo had become confined to the central North Island and forested parts of the South Island. The fall in kakapo numbers was accelerated by European colonisation. A great deal of habitat was lost through forest clearance, and introduced species such as deer depleted the remaining forests of food. Other predators such as cats, stoats and two more species of rat were also introduced. The kakapo were in serious trouble.</span>"
          },
          {
            "html": "<span>In 1894, the New Zealand government launched its first attempt to save the kakapo. Conservationist Richard Henry led an effort to relocate several hundred of the birds to predator-free Resolution Island in Fiordland. Unfortunately, the island didn’t remain predator free – stoats arrived within six years, eventually destroying the kakapo population. By the mid-1900s, the kakapo was practically a lost species. Only a few clung to life in the most isolated parts of New Zealand.</span>"
          },
          {
            "html": "<span>From 1949 to 1973, the newly formed New Zealand Wildlife Service made over 60 expeditions to find kakapo, focusing mainly on Fiordland. Six were caught, but there were no females amongst them and all but one died within a few months of captivity. In 1974, a new initiative was launched, and by 1977,18 more kakapo were found in Fiordland. However, there were still no females. In 1977, a large population of males was spotted in Rakiura – a large island free from stoats, ferrets and weasels. There were about 200 individuals, and in 1980 it was confirmed females were also present. These birds have been the foundation of all subsequent work in managing the species.</span>"
          },
          {
            "html": "<span>Unfortunately, predation by feral cats on Rakiura Island led to a rapid decline in kakapo numbers. As a result, during 1980-97, the surviving population was evacuated to three island sanctuaries: Codfish Island, Maud Island and Little Barrier Island. However, breeding success was hard to achieve. Rats were found to be a major predator of kakapo chicks and an insufficient number of chicks survived to offset adult mortality. By 1995, although at least 12 chicks had been produced on the islands, only three had survived. The kakapo population had dropped to 51 birds. The critical situation prompted an urgent review of kakapo management in New Zealand.</span>"
          },
          {
            "html": "<span>In 1996, a new Recovery Plan was launched, together with a specialist advisory group called the Kakapo Scientific and Technical Advisory Committee and a higher amount of funding. Renewed steps were taken to control predators on the three islands. Cats were eradicated from Little Barrier Island in 1980, and possums were eradicated from Codfish Island by 1986. However, the population did not start to increase until rats were removed from all three islands, and the birds were more intensively managed. This involved moving the birds between islands, supplementary feeding of adults and rescuing and hand-raising any failing chicks. After the first five years of the Recovery Plan, the population was on target. By 2000, five new females had been produced, and the total population had grown to 62 birds. For the first time, there was cautious optimism for the future of kakapo and by June 2020, a total of 210 birds was recorded.</span>"
          },
          {
            "html": "<span>Today, kakapo management continues to be guided by the kakapo Recovery Plan. Its key goals are: minimise the loss of genetic diversity in the kakapo population, restore or maintain sufficient habitat to accommodate the expected increase in the kakapo population, and ensure stakeholders continue to be fully engaged in the preservation of the species.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 1-6",
          "type": "tfng",
          "instructionHtml": "Do the following statements agree with the information given in reading passage? In boxes 1-6 on your answer sheet, write",
          "questions": [
            {
              "id": "q1",
              "answer": "False",
              "textHtml": "There are other parrots that share the kakapo’s inability to fly",
              "explanation": "Paragraph 2 says the kakapo is the world's only flightless parrot, so no other parrot shares this trait.",
              "evidence": "It is the world’s only flightless parrot, and is also possibly one of the world’s longest-living birds, with a reported lifespan of up to 100 years."
            },
            {
              "id": "q2",
              "answer": "False",
              "textHtml": "Adult kakapo produce chicks every year",
              "explanation": "Paragraph 4 says kakapo breed only in years when food is plentiful, not every year.",
              "evidence": "Kakap6 breed in summer and autumn, but only in years when food is plentiful."
            },
            {
              "id": "q3",
              "answer": "False",
              "textHtml": "Adult male kakapo bring food back to nesting females",
              "explanation": "Paragraph 4 says males play no part in incubation or chick rearing and females alone search for food, so males do not bring food to the nest.",
              "evidence": "Males play no part in incubation or chick-rearing – females alone incubate eggs and feed the chicks."
            },
            {
              "id": "q4",
              "answer": "Not given",
              "textHtml": "The Polynesian rat was a greater threat to the kakapo than Polynesian settlers",
              "explanation": "Paragraph 5 mentions both Polynesian settlers and the rat preying on kakapo but never compares which posed the greater threat."
            },
            {
              "id": "q5",
              "answer": "True",
              "textHtml": "Kakapo were transferred from Rakiura Island to other locations because they were at risk from feral cats",
              "explanation": "Paragraph 8 says predation by feral cats caused a rapid decline, so the population was evacuated to three island sanctuaries.",
              "evidence": "As a result, during 1980-97, the surviving population was evacuated to three island sanctuaries: Codfish Island, Maud Island and Little Barrier Island."
            },
            {
              "id": "q6",
              "answer": "True",
              "textHtml": "One Recovery Plan initiative that helped increase the kakapo population size was caring for struggling young birds",
              "explanation": "Paragraph 9 lists rescuing and hand raising failing chicks among the Recovery Plan actions that helped the population grow.",
              "evidence": "This involved moving the birds between islands, supplementary feeding of adults and rescuing and hand-raising any failing chicks."
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>TRUE</dt><dd>if the statement agrees with the information</dd><dt>FALSE</dt><dd>if the statement contradicts the information</dd><dt>NOT GIVEN</dt><dd>if there is no information on this</dd></dl>"
        },
        {
          "title": "Questions 7-13",
          "type": "sentence-completion",
          "instructionHtml": "Complete the notes below. Choose ONE WORD AND/OR A NUMBER from the passage for each answer. Write your answers in boxes 7-13 on your answer sheet.",
          "questions": [
            {
              "id": "q7",
              "answer": "Bulbs",
              "explanation": "Paragraph 3 lists bulbs among the plant parts that make up the kakapo's diet.",
              "evidence": "They are entirely vegetarian, with their diet including the leaves, roots and bark of trees as well as bulbs, and fern fronds."
            },
            {
              "id": "q8",
              "answer": "Soil",
              "explanation": "Paragraph 4 says kakapo eggs are laid in soil that is repeatedly turned over.",
              "evidence": "The 1-4 eggs are laid in soil, which is repeatedly turned over before and during incubation."
            },
            {
              "id": "q9",
              "answer": "Feathers",
              "explanation": "Paragraph 5 says early settlers used kakapo feathers to make soft cloaks.",
              "evidence": "They ate its meat and used its feathers to make soft cloaks."
            },
            {
              "id": "q10",
              "answer": "Deer",
              "explanation": "Paragraph 5 says introduced deer depleted the forests of the food kakapo needed.",
              "evidence": "A great deal of habitat was lost through forest clearance, and introduced species such as deer depleted the remaining forests of food."
            },
            {
              "id": "q11",
              "answer": "1980",
              "explanation": "Paragraph 7 says females were confirmed present on Rakiura Island in 1980.",
              "evidence": "There were about 200 individuals, and in 1980 it was confirmed females were also present."
            },
            {
              "id": "q12",
              "answer": "Funding",
              "explanation": "Paragraph 9 says the 1996 Recovery Plan came with a higher amount of funding.",
              "evidence": "In 1996, a new Recovery Plan was launched, together with a specialist advisory group called the Kakapo Scientific and Technical Advisory Committee and a higher amount of funding."
            },
            {
              "id": "q13",
              "answer": "Stakeholders",
              "explanation": "Paragraph 10 lists keeping stakeholders fully engaged as a current goal of the Recovery Plan.",
              "evidence": "Its key goals are: minimise the loss of genetic diversity in the kakapo population, restore or maintain sufficient habitat to accommodate the expected increase in the kakapo population, and ensure stakeholders continue to be fully engaged in the preservation of the species."
            }
          ],
          "legendHtml": "<p><strong><span>New Zealand’s kakapo</span></strong></p><p><strong><span>A type of parrot:</span></strong><br/>\n<span>• diet consists of fern fronds, various parts of a tree and (7) ………………</span><br/>\n<span>• nests are created in (8) ……………… where eggs are laid.</span></p><p><strong><span>Arrival of Polynesian settlers</span></strong><br/>\n<span>• the (9) ………… of the kakapo were used to make clothes.</span></p><p><strong><span>Arrival of European colonisers</span></strong><br/>\n<span>• (10) …………… were an animal which they introduced that ate the kakapo’s food sources.</span></p><p><strong><span>Protecting kakapo</span></strong><br/>\n<span>• Richard Henry, a conservationist, tried to protect the kakapo.</span><br/>\n<span>• a definite sighting of female kakapo on Rakiura Island was reported in the year (11) …………….</span><br/>\n<span>• the Recovery Plan included an increase in (12) ……………….</span><br/>\n<span>• a current goal of the Recovery Plan is to maintain the involvement of (13) …………………. in kakapo protection.</span></p>",
          "wordLimit": 1
        }
      ]
    },
    {
      "label": "Passage 2",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 2",
        "title": "To Britain",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>Mark Rowe investigates attempts to reintroduce elms to Britain</span>"
          },
          {
            "html": "<span><strong>A</strong> Around 25 million elms, accounting for 90% of all elm trees in the UK, died during the 1960s and ’70s of Dutch elm disease. In the aftermath, the elm, once so dominant in the British landscape, was largely forgotten. However, there’s now hope the elm may be reintroduced to the countryside of central and southern England. Any reintroduction will start from a very low base. ‘The impact of the disease is difficult to picture if you hadn’t seen what was there before,’ says Matt Elliot of the Woodland Trust. ‘You look at old photographs from the 1960s and it’s only then that you realise the impact [elms had] … They were significant, large trees … then they were gone.’</span>"
          },
          {
            "html": "<span><strong>B</strong> The disease is caused by a fungus that blocks the elms’ vascular (water, nutrient and food transport) system, causing branches to wilt and die. A first epidemic, which occurred in the 1920s, gradually died down, but in the ’70s a second epidemic was triggered by shipments of elm from Canada. The wood came in the form of logs destined for boat building and its intact bark was perfect for the elm bark beetles that spread the deadly fungus. This time, the beetles carried a much more virulent strain that destroyed the vast majority of British elms.</span>"
          },
          {
            "html": "<span><strong>C</strong> Today, elms still exist in the southern English countryside but mostly only in low hedgerows between fields. ‘We have millions of small elms in hedgerows but they get targeted by the beetle as soon as they reach a certain size,’ says Karen Russell, co-author of the report ‘Where we are with elm’. Once the trunk of the elm reaches 10-15 centimetres or so in diameter, it becomes a perfect size for beetles to lay eggs and for the fungus to take hold. Yet mature specimens have been identified, in counties such as Cambridgeshire, that are hundreds of years old, and have mysteriously escaped the epidemic. The key, Russell says, is to identify and study those trees that have survived and work out why they stood tall when millions of others succumbed. Nevertheless, opportunities are limited as the number of these mature survivors is relatively small. ‘What are the reasons for their survival?’ asks Russell. ‘Avoidance, tolerance, resistance? We don’t know where the balance lies between the three. I don’t see how it can be entirely down to luck.’</span>"
          },
          {
            "html": "<span><strong>D</strong> For centuries, elm ran a close second to oak as the hardwood tree of choice in Britain and was in many instances the most prominent tree in the landscape. Not only was elm common in European forests, it became a key component of birch, ash and hazel woodlands. The use of elm is thought to go back to the Bronze Age, when it was widely used for tools. Elm was also the preferred material for shields and early swords. In the 18th century, it was planted more widely and its wood was used for items such as storage crates and flooring. It was also suitable for items that experienced high levels of impact and was used to build the keel of the 19th-century sailing ship Cutty Sark as well as mining equipment.</span>"
          },
          {
            "html": "<span><strong>E</strong> Given how ingrained elm is in British culture, it’s unsurprising the tree has many advocates. Amongst them is Peter Bourne of the National Elm Collection in Brighton. ‘I saw Dutch elm disease unfold as a small boy,’ he says. ‘The elm seemed to be part of rural England, but I remember watching trees just lose their leaves and that really stayed with me.’ Today, the city of Brighton’s elms total about 17,000. Local factors appear to have contributed to their survival. Strong winds from the sea make it difficult for the determined elm bark beetle to attack this coastal city’s elm population. However, the situation is precarious. ‘The beetles can just march in if we’re not careful, as the threat is right on our doorstep,’ says Bourne.</span>"
          },
          {
            "html": "<span><strong>F</strong> Any prospect of the elm returning relies heavily on trees being either resistant to, or tolerant of, the disease. This means a widespread reintroduction would involve existing or new hybrid strains derived from resistant, generally non-native elm species. A new generation of seedlings have been bred and tested to see if they can withstand the fungus by cutting a small slit on the bark and injecting a tiny amount of the pathogen. The effects are very quick,’ says Russell. ‘You return in four to six weeks and trees that are resistant show no symptoms, whereas those that are susceptible show leaf loss and may even have died completely.’</span>"
          },
          {
            "html": "<span><strong>G</strong> All of this raises questions of social acceptance, acknowledges Russell. ‘If we’re putting elm back into the landscape, a small element of it is not native – are we bothered about that?’ For her, the environmental case for reintroducing elm is strong. ‘They will host wildlife, which is a good thing.’ Others are more wary. ‘On the face of it, it seems like a good idea,’ says Elliot. The problem, he suggests, is that, ‘You’re replacing a native species with a horticultural analogue*. You’re effectively cloning.’ There’s also the risk of introducing new diseases. Rather than plant new elms, the Woodland Trust emphasises providing space to those elms that have survived independently. ‘Sometimes the best thing you can do is just give nature time to recover… over time, you might get resistance,’ says Elliot.</span><br/>\n<span>* horticultural analogue: a cultivated plant species that is genetically similar to an existing species</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 14-18",
          "type": "paragraph-matching",
          "instructionHtml": "Reading passage has seven sections, A-G. Which section contains the following information? NB You may use any letter more than once.",
          "questions": [
            {
              "id": "q14",
              "answer": "C",
              "textHtml": "reference to the research problems that arise from there being only a few surviving large elms",
              "explanation": "Paragraph C says the number of surviving mature elms is relatively small, limiting research opportunities.",
              "evidence": "Nevertheless, opportunities are limited as the number of these mature survivors is relatively small."
            },
            {
              "id": "q15",
              "answer": "G",
              "textHtml": "details of a difference of opinion about the value of reintroducing elms to Britain",
              "explanation": "Paragraph G contrasts Russell's support for reintroducing elm with Elliot's wariness about cloning and new disease risks.",
              "evidence": "You’re effectively cloning."
            },
            {
              "id": "q16",
              "answer": "B",
              "textHtml": "reference to how Dutch elm disease was brought into Britain",
              "explanation": "Paragraph B says a second epidemic was triggered by infected elm log shipments from Canada carrying the beetle.",
              "evidence": "A first epidemic, which occurred in the 1920s, gradually died down, but in the ’70s a second epidemic was triggered by shipments of elm from Canada."
            },
            {
              "id": "q17",
              "answer": "E",
              "textHtml": "a description of the conditions that have enabled a location in Britain to escape Dutch elm disease",
              "explanation": "Paragraph E says strong sea winds make it hard for the beetle to reach Brighton's coastal elms.",
              "evidence": "Strong winds from the sea make it difficult for the determined elm bark beetle to attack this coastal city’s elm population."
            },
            {
              "id": "q18",
              "answer": "C",
              "textHtml": "reference to the stage at which young elms become vulnerable to Dutch elm disease",
              "explanation": "Paragraph C says once an elm trunk reaches 10 to 15 centimetres across it becomes a perfect size for the beetle to attack.",
              "evidence": "Once the trunk of the elm reaches 10-15 centimetres or so in diameter, it becomes a perfect size for beetles to lay eggs and for the fungus to take hold."
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
          "title": "Questions 19-23",
          "type": "matching-features",
          "instructionHtml": "Look at the following statements and the list of people below. Match each statement with the correct person, A, B, or C. NB You may use any letter more than once.",
          "questions": [
            {
              "id": "q19",
              "answer": "B",
              "textHtml": "If a tree gets infected with Dutch elm disease, the damage rapidly becomes visible",
              "explanation": "Russell in paragraph F says resistant trees show no symptoms while susceptible ones show leaf loss within weeks, a rapid, visible effect.",
              "evidence": "The effects are very quick,’ says Russell."
            },
            {
              "id": "q20",
              "answer": "A",
              "textHtml": "It may be better to wait and see if the mature elms that have survived continue to flourish",
              "explanation": "Elliot in paragraph G says the best thing may be to give nature time to recover rather than plant new elms.",
              "evidence": "‘Sometimes the best thing you can do is just give nature time to recover… over time, you might get resistance,’ says Elliot."
            },
            {
              "id": "q21",
              "answer": "B",
              "textHtml": "There must be an explanation for the survival of some mature elms",
              "explanation": "Russell in paragraph C says she does not see how survival could be entirely down to luck, implying another explanation must exist.",
              "evidence": "I don’t see how it can be entirely down to luck."
            },
            {
              "id": "q22",
              "answer": "C",
              "textHtml": "We need to be aware that insects carrying Dutch elm disease are not very far away",
              "explanation": "Bourne in paragraph E warns that the beetle threat is right on Brighton's doorstep.",
              "evidence": "‘The beetles can just march in if we’re not careful, as the threat is right on our doorstep,’ says Bourne."
            },
            {
              "id": "q23",
              "answer": "A",
              "textHtml": "You understand the effect Dutch elm disease has had when you see evidence of how prominent the tree once was.",
              "explanation": "Elliot in paragraph A says old photographs only reveal how significant elms once were, showing the scale of the loss.",
              "evidence": "‘You look at old photographs from the 1960s and it’s only then that you realise the impact [elms had] … They were significant, large trees … then they were gone."
            }
          ],
          "legendHtml": "<p><span>A. Matt Elliot</span><br/>\n<span>B. Karen Russell</span><br/>\n<span>C. Peter Bourne</span></p>",
          "options": [
            "A",
            "B",
            "C"
          ]
        },
        {
          "title": "Questions 24-26",
          "type": "sentence-completion",
          "instructionHtml": "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.",
          "questions": [
            {
              "id": "q24",
              "answer": "Oak",
              "explanation": "Paragraph D says elm ran a close second to oak as Britain's preferred hardwood.",
              "evidence": "For centuries, elm ran a close second to oak as the hardwood tree of choice in Britain and was in many instances the most prominent tree in the landscape."
            },
            {
              "id": "q25",
              "answer": "Flooring",
              "explanation": "Paragraph D says 18th century elm wood was used for storage crates and flooring.",
              "evidence": "In the 18th century, it was planted more widely and its wood was used for items such as storage crates and flooring."
            },
            {
              "id": "q26",
              "answer": "Keel",
              "explanation": "Paragraph D says elm was used to build the keel of the Cutty Sark.",
              "evidence": "It was also suitable for items that experienced high levels of impact and was used to build the keel of the 19th-century sailing ship Cutty Sark as well as mining equipment."
            }
          ],
          "legendHtml": "<p><strong><span>Uses of a popular tree</span></strong></p><p><span>For hundreds of years, the only tree that was more popular in Britain than elm was (24) ………… Starting in the Bronze Age, many tools were made from elm and people also used it to make weapons. In the 18th century, it was grown to provide wood for boxes and (25) …………… Due to its strength, elm was often used for mining equipment and the Cutty Sark’s (26) ……………… was also constructed from elm.</span></p>",
          "wordLimit": 1
        }
      ]
    },
    {
      "label": "Passage 3",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 3",
        "title": "How stress affects our judgement",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>Some of the most important decisions of our lives occur while we’re feeling stressed and anxious. From medical decisions to financial and professional ones, we are all sometimes required to weigh up information under stressful conditions. But do we become better or worse at processing and using information under such circumstances?</span>"
          },
          {
            "html": "<span>My colleague and I, both neuroscientists, wanted to investigate how the mind operates under stress, so we visited some local fire stations. Firefighters’ workdays vary quite a bit. Some are pretty relaxed; they’ll spend their time washing the truck, cleaning equipment, cooking meals and reading. Other days can be hectic, with numerous life-threatening incidents to attend to; they’ll enter burning homes to rescue trapped residents, and assist with medical emergencies. These ups and downs presented the perfect setting for an experiment on how people’s ability to use information changes when they feel under pressure.</span>"
          },
          {
            "html": "<span>We found that perceived threat acted as a trigger for a stress reaction that made the task of processing information easier for the firefighters – but only as long as it conveyed bad news.</span>"
          },
          {
            "html": "<span>This is how we arrived at these results. We asked the firefighters to estimate their likelihood of experiencing 40 different adverse events in their life, such as being involved in an accident or becoming a victim of card fraud. We then gave them either good news (that their likelihood of experiencing these events was lower than they’d thought) or bad news (that it was higher) and asked them to provide new estimates.</span>"
          },
          {
            "html": "<span>People are normally quite optimistic – they will ignore bad news and embrace the good. This is what happened when the firefighters were relaxed; but when they were under stress, a different pattern emerged. Under these conditions, they became hyper-vigilant to bad news, even when it had nothing to do with their job (such as learning that the likelihood of card fraud was higher than they’d thought), and altered their beliefs in response. In contrast, stress didn’t change how they responded to good news (such as learning that the likelihood of card fraud was lower than they’d thought).</span>"
          },
          {
            "html": "<span>Back in our lab, we observed the same pattern in students who were told they had to give a surprise public speech, which would be judged by a panel, recorded and posted online. Sure enough, their cortisol levels spiked, their heart rates went up and they suddenly became better at processing unrelated, yet alarming, information about rates of disease and violence.</span>"
          },
          {
            "html": "<span>When we experience stressful events, a physiological change is triggered that causes us to take in warnings and focus on what might go wrong. Brain imaging reveals that this ‘switch’ is related to a sudden boost in a neural signal important for learning, specifically in response to unexpected warning signs, such as faces expressing fear.</span>"
          },
          {
            "html": "<span>Such neural engineering could have helped prehistoric humans to survive. When our ancestors found themselves surrounded by hungry animals, they would have benefited from an increased ability to learn about hazards. In a safe environment, however, it would have been wasteful to be on high alert constantly. So, a neural switch that automatically increases or decreases our ability to process warnings in response to changes in our environment could have been useful. In fact, people with clinical depression and anxiety seem unable to switch away from a state in which they absorb all the negative messages around them.</span>"
          },
          {
            "html": "<span>It is also important to realise that stress travels rapidly from one person to the next. If a co-worker is stressed, we are more likely to tense up and feel stressed ourselves. We don’t even need to be in the same room with someone for their emotions to influence our behaviour. Studies show that if we observe positive feeds on social media, such as images of a pink sunset, we are more likely to post uplifting messages ourselves. If we observe negative posts, such as complaints about a long queue at the coffee shop, we will in turn create more negative posts. In some ways, many of us now live as if we are in danger, constantly ready to tackle demanding emails and text messages, and respond to news alerts and comments on social media. Repeatedly checking your phone, according to a survey conducted by the American Psychological Association, is related to stress. In other words, a pre-programmed physiological reaction, which evolution has equipped us with to help us avoid famished predators, is now being triggered by an online post. Social media posting, according to one study, raises your pulse, makes you sweat, and enlarges your pupils more than most daily activities.</span>"
          },
          {
            "html": "<span>The fact that stress increases the likelihood that we will focus more on alarming messages, together with the fact that it spreads extremely rapidly, can create collective fear that is not always justified. After a stressful public event, such as a natural disaster or major financial crash, there is often a wave of alarming information in traditional and social media, which individuals become very aware of. But that has the effect of exaggerating existing danger. And so, a reliable pattern emerges – stress is triggered, spreading from one person to the next, which temporarily enhances the likelihood that people will take in negative reports, which increases stress further. As a result, trips are cancelled, even if the disaster took place across the globe; stocks are sold, even when holding on is the best thing to do.</span>"
          },
          {
            "html": "<span>The good news, however, is that positive emotions, such as hope, are contagious too, and are powerful in inducing people to act to find solutions. Being aware of the close relationship between people’s emotional state and how they process information can help us frame our messages more effectively and become conscientious agents of change.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 27-30",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter, A, B, C or D.",
          "questions": [
            {
              "id": "q27",
              "answer": "C",
              "textHtml": "In the first paragraph, the writer introduces the topic of the text by",
              "options": [
                "defining some commonly used terms",
                "questioning a widely held assumption",
                "mentioning a challenge faced by everyone",
                "specifying a situation which makes us most anxious"
              ],
              "explanation": "Paragraph 1 says we are all sometimes required to weigh up information under stress, a challenge everyone faces.",
              "evidence": "From medical decisions to financial and professional ones, we are all sometimes required to weigh up information under stressful conditions."
            },
            {
              "id": "q28",
              "answer": "A",
              "textHtml": "What point does the writer make about firefighters in the second paragraph?",
              "options": [
                "The regular changes of stress levels in their working lives make them ideal study subjects",
                "The strategies they use to handle stress are of particular interest to researchers",
                "The stressful nature of their job is typical of many public service professions",
                "Their personalities make them especially well-suited to working under stress"
              ],
              "explanation": "Paragraph 2 says the firefighters' varying stress levels gave the perfect setting for the experiment, making them ideal subjects.",
              "evidence": "These ups and downs presented the perfect setting for an experiment on how people’s ability to use information changes when they feel under pressure."
            },
            {
              "id": "q29",
              "answer": "D",
              "textHtml": "What is the writer doing in the fourth paragraph?",
              "options": [
                "explaining their findings",
                "justifying their approach",
                "setting out their objectives",
                "describing their methodology"
              ],
              "explanation": "Paragraph 4 describes exactly how the estimates were collected and the good or bad news given, which is describing the method used.",
              "evidence": "This is how we arrived at these results."
            },
            {
              "id": "q30",
              "answer": "C",
              "textHtml": "In the seventh paragraph, the writer describes a mechanism in the brain which",
              "options": [
                "enables people to respond more quickly to stressful situations",
                "results in increased ability to control our levels of anxiety",
                "produces heightened sensitivity to indications of external threats",
                "is activated when there is a need to communicate a sense of danger"
              ],
              "explanation": "Paragraph 7 says the stress response boosts a neural signal for learning in response to unexpected warning signs, producing heightened sensitivity to threats.",
              "evidence": "Brain imaging reveals that this ‘switch’ is related to a sudden boost in a neural signal important for learning, specifically in response to unexpected warning signs, such as faces expressing fear."
            }
          ]
        },
        {
          "title": "Questions 31-35",
          "type": "sentence-completion",
          "instructionHtml": "Complete each sentence with the correct ending, A-G, below.",
          "questions": [
            {
              "id": "q31",
              "answer": "B",
              "before": "At times when they were relaxed, the firefighters usually",
              "after": "",
              "explanation": "Paragraph 5 says relaxed people normally ignore bad news, taking little notice of it.",
              "evidence": "People are normally quite optimistic – they will ignore bad news and embrace the good."
            },
            {
              "id": "q32",
              "answer": "G",
              "before": "The researchers noted that when the firefighters were stressed, they",
              "after": "",
              "explanation": "Paragraph 5 says stressed firefighters became hyper vigilant to bad news and revised their estimates upward, thinking something bad was more likely.",
              "evidence": "Under these conditions, they became hyper-vigilant to bad news, even when it had nothing to do with their job (such as learning that the likelihood of card fraud was higher than they’d thought), and altered their beliefs in response."
            },
            {
              "id": "q33",
              "answer": "F",
              "before": "When the firefighters were told good news, they always",
              "after": "",
              "explanation": "Paragraph 5 says stress did not change how firefighters responded to good news, so their behaviour stayed the same regardless of conditions.",
              "evidence": "In contrast, stress didn’t change how they responded to good news (such as learning that the likelihood of card fraud was lower than they’d thought)."
            },
            {
              "id": "q34",
              "answer": "E",
              "before": "The students’ cortisol levels and heart rates were affected when the researchers",
              "after": "",
              "explanation": "Paragraph 6 says students told they had to give a surprise public speech showed spiked cortisol and heart rate, since the speech put them under stress.",
              "evidence": "Back in our lab, we observed the same pattern in students who were told they had to give a surprise public speech, which would be judged by a panel, recorded and posted online."
            },
            {
              "id": "q35",
              "answer": "D",
              "before": "In both experiments, negative information was processed better when the subjects A. made them feel optimistic. B. took relatively little notice of bad news. C. responded to negative and positive information in the same way. D. were feeling under stress. E. put them in a stressful situation. F. behaved in a similar manner, regardless of the circumstances. G. thought it more likely that they would experience something bad",
              "after": "",
              "explanation": "In both experiments, negative information was processed better while the subjects were under stress, as the firefighter and student studies both show."
            }
          ],
          "legendHtml": "<p><span>31. At times when they were relaxed, the firefighters usually</span><br/>\n<span>32. The researchers noted that when the firefighters were stressed, they</span><br/>\n<span>33. When the firefighters were told good news, they always</span><br/>\n<span>34. The students’ cortisol levels and heart rates were affected when the researchers</span><br/>\n<span>35. In both experiments, negative information was processed better when the subjects</span></p><p><span>A. made them feel optimistic.</span><br/>\n<span>B. took relatively little notice of bad news.</span><br/>\n<span>C. responded to negative and positive information in the same way.</span><br/>\n<span>D. were feeling under stress.</span><br/>\n<span>E. put them in a stressful situation.</span><br/>\n<span>F. behaved in a similar manner, regardless of the circumstances.</span><br/>\n<span>G. thought it more likely that they would experience something bad.</span></p>"
        },
        {
          "title": "Questions 36-40",
          "type": "yes-no-notgiven",
          "instructionHtml": "Do the following statements agree with the information given in reading passage?",
          "questions": [
            {
              "id": "q36",
              "answer": "Yes",
              "textHtml": "The tone of the content we post on social media tends to reflect the nature of the posts in our feeds",
              "explanation": "Paragraph 8 says viewing positive posts makes us post more uplifting messages and negative posts make us post more negative ones, matching our tone to our feed.",
              "evidence": "Studies show that if we observe positive feeds on social media, such as images of a pink sunset, we are more likely to post uplifting messages ourselves."
            },
            {
              "id": "q37",
              "answer": "Not given",
              "textHtml": "Phones have a greater impact on our stress levels than other electronic media devices",
              "explanation": "Paragraph 8 links checking your phone to stress but never compares phones with other electronic devices."
            },
            {
              "id": "q38",
              "answer": "No",
              "textHtml": "The more we read about a stressful public event on social media, the less able we are to take the information in",
              "explanation": "Paragraph 9 says stress increases the likelihood we focus more on alarming messages, the opposite of being less able to take information in.",
              "evidence": "The fact that stress increases the likelihood that we will focus more on alarming messages, together with the fact that it spreads extremely rapidly, can create collective fear that is not always justified."
            },
            {
              "id": "q39",
              "answer": "Yes",
              "textHtml": "Stress created by social media posts can lead us to take unnecessary precautions",
              "explanation": "Paragraph 9 says trips get cancelled and stocks sold even when holding on is best, showing stress driven, unnecessary precautions.",
              "evidence": "As a result, trips are cancelled, even if the disaster took place across the globe; stocks are sold, even when holding on is the best thing to do."
            },
            {
              "id": "q40",
              "answer": "Yes",
              "textHtml": "Our tendency to be affected by other people’s moods can be used in a positive way",
              "explanation": "The final paragraph says positive emotions such as hope are also contagious and can drive people to act, a positive use of this tendency.",
              "evidence": "The good news, however, is that positive emotions, such as hope, are contagious too, and are powerful in inducing people to act to find solutions."
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>YES</dt><dd>if the statement agrees with the claims of the writer</dd><dt>NO</dt><dd>if the statement contradicts the claims of the writer</dd><dt>NOT GIVEN</dt><dd>if it is impossible to say what the writer thinks about this</dd></dl>"
        }
      ]
    }
  ]
};

export default test;
