import type { PracticeTest } from '../../lib/tests/schema';

const test: PracticeTest = {
  "id": "reading-full-010",
  "skill": "reading",
  "title": "Academic Reading Test 10",
  "description": "A complete three-passage Academic Reading practice test with 40 questions.",
  "durationMinutes": 60,
  "source": {
    "name": "IELTS MASTER / PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-reading-test-308/",
    "permission": "Reused with publisher permission confirmed by Alex on 2026-09-11."
  },
  "parts": [
    {
      "label": "Passage 1",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 1",
        "title": "THE SMART CARD",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>The invention of the microchip in the 1960s revolutionised the computer industry. Microchips are also used in thousands of other products, including smart cards. These look and function like the familiar magnetic-stripe credit cards, but they have a microchip embedded inside them that can store information. The smart card was the brainchild of two French inventors, Roland Moreno and Michel Ugon, who developed the technology in the mid-1970s. The first cards were tested in several French cities in the early 1980s and the technology was subsequently adopted by banks throughout Europe. Smart cards are now a part of everyday life in Europe, where they are used for a wide range of purposes, including paying for public transport, making small purchases over the counter, and banking by telephone. The European Union has adopted the technology as the standard for all its future credit cards.</span>"
          },
          {
            "html": "<span>Smart cards are only just beginning to be introduced in the United States, where the older magnetic-stripe technology is still the norm. The new technology is considered to be much more secure than the magnetic-stripe card, which is vulnerable to fraud. The microchip embedded in the smart card can be programmed to allow the cardholder to access many different systems. One card can be used for various types of banking transactions, for example, and as a phone card. It can also serve as an electronic purse, storing a cash balance for small purchases and recording phone and ATM transactions. It can also be used as a security pass to give the cardholder access to restricted areas.</span>"
          },
          {
            "html": "<span>The smart card may well replace keys, money, and identity cards in the future. In the United States, the Department of Defense has provided smart cards to its 4.3 million employees, and the Department of Energy is planning to do the same. Many of the nation’s hospitals and health-care facilities are also adopting the technology.</span>"
          },
          {
            "html": "<span>One of the most significant uses of the smart card is in providing people with access to their own health records. In France, for example, everyone now has a smart card containing a complete medical history, which can be accessed immediately by a doctor or pharmacist. The card, which is the size of a credit card, has a microchip embedded in it that contains the patient’s medical history, including allergies, blood type, and details of any current medical conditions. The card also contains information about the patient’s health-insurance provider. The card can be used to store medical records, prescriptions, and details of medical appointments.</span>"
          },
          {
            "html": "<span>In the United States, the Health Insurance Portability and Accountability Act (HIPAA) is driving the demand for smart cards. The Act requires health-care providers to protect the privacy of patients’ medical information and to take measures to protect the security of sensitive information. Smart cards are considered one of the best ways of meeting these requirements.</span>"
          },
          {
            "html": "<span>The technology is also being used to improve the security of the US passport card. The card is a wallet-sized document that can be used instead of the traditional passport booklet when US citizens cross the border by land or sea between the United States and Canada, Mexico, the Caribbean, or Bermuda. The card has a microchip embedded in it that contains a unique number linking the card to a government database containing the cardholder’s personal information.</span>"
          },
          {
            "html": "<span>Smart cards are also used in public-transport systems around the world. In Hong Kong, for example, the Octopus card is used by millions of commuters every day. The card is a plastic smart card containing a microchip that can be loaded with cash and used to pay for travel on the city’s underground railway system. The card can also be used on buses, ferries, and trams, and even in car parks and convenience stores.</span>"
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
              "answer": "False",
              "textHtml": "The smart card was developed by two French inventors in the 1960s",
              "explanation": "Paragraph 1 says the smart card technology was developed in the mid 1970s, not the 1960s.",
              "evidence": "The smart card was the brainchild of two French inventors, Roland Moreno and Michel Ugon, who developed the technology in the mid-1970s."
            },
            {
              "id": "q2",
              "answer": "True",
              "textHtml": "The microchips in smart cards can store information",
              "explanation": "Paragraph 1 says the embedded microchip can store information.",
              "evidence": "These look and function like the familiar magnetic-stripe credit cards, but they have a microchip embedded inside them that can store information."
            },
            {
              "id": "q3",
              "answer": "Not given",
              "textHtml": "The European Union wants all its citizens to use smart cards",
              "explanation": "Paragraph 1 says the EU adopted the technology as the standard for future credit cards but never says it wants all citizens to use smart cards."
            },
            {
              "id": "q4",
              "answer": "True",
              "textHtml": "The US Department of Defense has provided smart cards to its employees",
              "explanation": "Paragraph 3 says the Department of Defense has provided smart cards to its 4.3 million employees.",
              "evidence": "In the United States, the Department of Defense has provided smart cards to its 4."
            },
            {
              "id": "q5",
              "answer": "False",
              "textHtml": "The US Department of Energy has developed a smart card for its employees",
              "explanation": "Paragraph 3 says the Department of Energy 'is planning to do the same', which means it has not done it yet. A claim that it has already developed a card for its employees is therefore contradicted by the passage.",
              "evidence": "In the United States, the Department of Defense has provided smart cards to its 4.3 million employees, and the Department of Energy is planning to do the same."
            },
            {
              "id": "q6",
              "answer": "True",
              "textHtml": "In France, people’s medical records are stored on a smart card",
              "explanation": "Paragraph 4 says everyone in France now has a smart card containing a complete medical history, which is exactly what the statement says.",
              "evidence": "In France, for example, everyone now has a smart card containing a complete medical history, which can be accessed immediately by a doctor or pharmacist."
            },
            {
              "id": "q7",
              "answer": "True",
              "textHtml": "The Health Insurance Portability and Accountability Act requires health-care providers to protect patients’ privacy",
              "explanation": "Paragraph 5 says HIPAA requires health care providers to protect the privacy of patients' medical information.",
              "evidence": "The Act requires health-care providers to protect the privacy of patients’ medical information and to take measures to protect the security of sensitive information."
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>TRUE</dt><dd>if the statement agrees with the information</dd><dt>FALSE</dt><dd>if the statement contradicts the information</dd><dt>NOT GIVEN</dt><dd>if there is no information on this</dd></dl>"
        },
        {
          "title": "Questions 8-13",
          "type": "sentence-completion",
          "instructionHtml": "Complete the notes below. Choose NO MORE THAN THREE WORDS AND/OR A NUMBER from the passage for each answer. Write your answers in boxes 8-13 on your answer sheet.",
          "questions": [
            {
              "id": "q8",
              "answer": "Medical appointments",
              "explanation": "Paragraph 4 says the French card can store medical records, prescriptions and details of medical appointments.",
              "evidence": "The card can be used to store medical records, prescriptions, and details of medical appointments."
            },
            {
              "id": "q9",
              "answer": "Prescriptions",
              "explanation": "Paragraph 4 lists prescriptions among the things the French health card can store.",
              "evidence": "The card can be used to store medical records, prescriptions, and details of medical appointments."
            },
            {
              "id": "q10",
              "answer": "Unique number",
              "explanation": "Paragraph 6 says the US passport card's chip holds a unique number linking it to a government database.",
              "evidence": "The card has a microchip embedded in it that contains a unique number linking the card to a government database containing the cardholder’s personal information."
            },
            {
              "id": "q11",
              "answer": "Buses",
              "explanation": "Paragraph 7 says Hong Kong's Octopus card can also be used on buses, ferries and trams.",
              "evidence": "The card can also be used on buses, ferries, and trams, and even in car parks and convenience stores."
            },
            {
              "id": "q12",
              "answer": "Ferries",
              "explanation": "Paragraph 7 says Hong Kong's Octopus card can also be used on buses, ferries and trams.",
              "evidence": "The card can also be used on buses, ferries, and trams, and even in car parks and convenience stores."
            },
            {
              "id": "q13",
              "answer": "Trams",
              "explanation": "Paragraph 7 says Hong Kong's Octopus card can also be used on buses, ferries and trams.",
              "evidence": "The card can also be used on buses, ferries, and trams, and even in car parks and convenience stores."
            }
          ],
          "legendHtml": "<p><span><strong>THE SMART CARD</strong></span></p><p><span><strong>Functions of smart cards<br/>\n</strong></span><span>– store information<br/>\n</span><span>– allow the cardholder to access different systems</span></p><p><span><strong>Different uses of smart cards<br/>\n</strong></span><span>– to make small purchases<br/>\n</span><span>– to record phone and ATM transactions<br/>\n</span><span>– as a security pass</span></p><p><span><strong>Use of smart cards in France<br/>\n</strong></span><span>– to provide people with access to their own health records<br/>\n</span><span>– to store medical records and details about (8) ………………….<br/>\n</span><span>– to store (9) …………………</span></p><p><span><strong>Use of smart cards in the United States<br/>\n</strong></span><span>– to improve the security of the US passport card<br/>\n</span><span>– to provide a (10) …………………. between the card and a government database</span></p><p><span><strong>Use of smart cards in Hong Kong<br/>\n</strong></span><span>– to pay for travel on the city’s underground railway system<br/>\n</span><span>– to pay for travel on (11) ………………….. , (12) ……………….. and (13) …………….</span></p>",
          "wordLimit": 3
        }
      ]
    },
    {
      "label": "Passage 2",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 2",
        "title": "GENE THERAPY",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span><strong>A</strong> Gene therapy is the introduction of genes into existing cells to prevent or cure a wide range of diseases. The most common form of gene therapy involves using DNA that encodes a functional, therapeutic gene to replace a mutated gene. Gene therapy was first conceptualised in 1972, with the authors urging caution before commencing human gene therapy studies. The first attempt, an unsuccessful one, at modifying human DNA was performed in 1980 by Martin Cline. The first successful nuclear gene transfer in humans, approved by the National Institutes of Health, was performed in May 1989. The first therapeutic use of gene transfer as well as the first direct insertion of human DNA into the nuclear genome was performed by French Anderson in a trial starting in September 1990. The first commercial gene therapy, Gendicine, was approved in China in 2003 for the treatment of certain cancers. In 2011, Neovasculgen was registered in Russia as the first-in-class gene-therapy drug for treatment of peripheral artery disease, including critical limb ischemia. In 2012, Glybera, a treatment for a rare inherited disorder, lipoprotein lipase deficiency, was approved by the European Commission.</span>"
          },
          {
            "html": "<span><strong>B</strong> Although the technology is still in its infancy, it has been used with some success. It is a potential therapy for a number of diseases (such as cystic fibrosis, sickle cell anaemia, adrenoleukodystrophy and haemophilia) as well as several inherited retinal diseases. Current gene therapy has primarily focused on treating individuals by targeting the therapy to somatic (body) cells, such as bone marrow cells. Gene therapy may be classified into the two following types:</span>"
          },
          {
            "html": "<span>Somatic gene therapy: In somatic gene therapy, the therapeutic genes are transferred into the somatic cells (cells that do not make sperm or eggs) of a patient. Any modifications and effects will be restricted to the individual patient only, and will not be inherited by the patient’s offspring or later generations. Somatic gene therapy represents mainstream basic and clinical research, in which therapeutic DNA is used to treat disease.</span>"
          },
          {
            "html": "<span>Germline gene therapy: In germline gene therapy, germ cells (sperm or eggs) are modified by the introduction of functional genes, which are ordinarily integrated into their genomes. The change due to therapy would therefore be heritable and would be passed on to later generations. In some jurisdictions, germline gene therapy is the only feasible option for some diseases; however, this option is fraught with many bio-ethical considerations. For the present, germline gene therapy is prohibited for application in human beings, at least for the foreseeable future, in most countries.</span>"
          },
          {
            "html": "<span><strong>C</strong> Gene therapy may be classified into two types, ex vivo and in vivo, on the basis of the method of delivery of genes. Ex vivo gene therapy involves the transfer of genes in cultured cells and reinsertion of the genetically altered cells back into the patient. In vivo gene therapy is the direct delivery of genes into the cells of a particular tissue in the body. The in vivo gene delivery can be divided into two categories: the therapeutic gene is directly injected into the body tissues; the therapeutic DNA is delivered to the target cells through the circulation.</span>"
          },
          {
            "html": "<span><strong>D</strong> Gene therapy uses sections of DNA (usually genes) to treat or prevent disease. The DNA is carefully selected to correct the effect of a mutated gene that is causing disease. The technique was first developed in 1972 but has, so far, had limited success in treating human diseases. For example, in 1999, 18-year-old Jesse Gelsinger died after undergoing gene therapy for ornithine transcarbamylase deficiency, and in 2002 it was reported that two children treated for X-linked severe combined immunodeficiency (X-SCID) in a clinical trial in 1999 had developed leukaemia. However, more than 1,800 gene therapy clinical trials have been conducted since the technique was first developed. Gene therapy can be used to modify cells inside or outside the body. When it’s done inside the body, a doctor will inject the vector carrying the gene directly into the patient. This method is useful when only certain tissues require correction. When it’s done outside the body, doctors will take a sample of the patient’s cells and expose them to the vector in a laboratory. The corrected cells are then returned to the patient. This approach is more useful when only a few cells need to be corrected.</span>"
          },
          {
            "html": "<span><strong>E</strong> Gene therapy has the potential to eliminate and prevent hereditary diseases such as cystic fibrosis and is a possible cure for heart disease, AIDS and cancer. The technology is still in its infancy. If the defects in the gene are corrected, these diseases could be treated. Gene therapy could have the potential to cure many genetic disorders. However, there are concerns that the wide range use of gene therapy in human beings is not safe.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 14-18",
          "type": "paragraph-matching",
          "instructionHtml": "Questions 14-18",
          "questions": [
            {
              "id": "q14",
              "answer": "A",
              "textHtml": "a reference to a person who resisted the use of gene therapy on humans",
              "explanation": "Paragraph A says the 1972 authors urged caution before starting human gene therapy studies.",
              "evidence": "Gene therapy was first conceptualised in 1972, with the authors urging caution before commencing human gene therapy studies."
            },
            {
              "id": "q15",
              "answer": "A",
              "textHtml": "a reference to the early failure of a gene therapy trial",
              "explanation": "Paragraph A says Martin Cline's 1980 attempt at modifying human DNA was unsuccessful.",
              "evidence": "The first attempt, an unsuccessful one, at modifying human DNA was performed in 1980 by Martin Cline."
            },
            {
              "id": "q16",
              "answer": "C",
              "textHtml": "a reference to different methods of delivering gene therapy",
              "explanation": "Paragraph C explains ex vivo and in vivo as the two methods of delivering gene therapy.",
              "evidence": "Gene therapy may be classified into two types, ex vivo and in vivo, on the basis of the method of delivery of genes."
            },
            {
              "id": "q17",
              "answer": "B",
              "textHtml": "a reference to the ethical concerns surrounding inheritable gene therapy",
              "explanation": "Paragraph B says germline gene therapy is fraught with many bio-ethical considerations since changes would be heritable.",
              "evidence": "In some jurisdictions, germline gene therapy is the only feasible option for some diseases; however, this option is fraught with many bio-ethical considerations."
            },
            {
              "id": "q18",
              "answer": "D",
              "textHtml": "mention of the total recorded attempts to apply gene therapy in clinical research",
              "explanation": "Paragraph D says more than 1,800 gene therapy clinical trials have been conducted since the technique began.",
              "evidence": "However, more than 1,800 gene therapy clinical trials have been conducted since the technique was first developed."
            }
          ],
          "legendHtml": "<p><span>Reading passage 2 has five sections, A-E. Which section contains the following information? Write the correct letter, A-E, in boxes 14-18 on your answer sheet. NB: You may use any letter more than once</span></p>",
          "options": [
            "A",
            "B",
            "C",
            "D",
            "E"
          ]
        },
        {
          "title": "Questions 19-22",
          "type": "sentence-completion",
          "instructionHtml": "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer. Write your answers in boxes 19-22 on your answer sheet.",
          "questions": [
            {
              "id": "q19",
              "answer": "Somatic",
              "explanation": "Paragraph B says somatic gene therapy targets a patient's own body cells for gene replacement.",
              "evidence": "Gene therapy may be classified into the two following types: Somatic gene therapy: In somatic gene therapy, the therapeutic genes are transferred into the somatic cells (cells that do not make sperm or eggs) of a patient."
            },
            {
              "id": "q20",
              "answer": "Generations",
              "explanation": "Paragraph B says effects of somatic therapy are not inherited by offspring or later generations.",
              "evidence": "Any modifications and effects will be restricted to the individual patient only, and will not be inherited by the patient’s offspring or later generations."
            },
            {
              "id": "q21",
              "answer": "Diseases",
              "explanation": "Paragraph B says germline therapy may be the only option for some diseases despite being banned in most countries.",
              "evidence": "In some jurisdictions, germline gene therapy is the only feasible option for some diseases; however, this option is fraught with many bio-ethical considerations."
            },
            {
              "id": "q22",
              "answer": [
                "Reinsertion",
                "Reinserted"
              ],
              "explanation": "Paragraph C says ex vivo gene therapy involves the reinsertion of the genetically altered cells back into the patient. The gap comes straight after 'the', so it needs the noun 'reinsertion'.",
              "evidence": "Ex vivo gene therapy involves the transfer of genes in cultured cells and reinsertion of the genetically altered cells back into the patient."
            }
          ],
          "legendHtml": "<p><span><strong>TYPES OF GENE THERAPY</strong></span><span><strong> </strong></span></p><p><span>Gene therapy can be classified as either somatic or germline. In somatic gene therapy, the (19) ……………. cells of a patient are targeted for gene replacement. The effects of the therapy will not be passed down to future (20) ……………… However, in germline gene therapy, the DNA of a patient’s sperm or egg cells is altered. This means that any changes will be passed down to future generations. Although this type of gene therapy is not permitted in humans in most countries, it may be the only possible cure for people with certain (21) …………………In addition, gene therapy can be classified as either ex vivo or in vivo. In ex vivo gene therapy, the genes are altered outside the patient’s body before the (22) ……………….. into the patient. In vivo gene therapy involves injecting the therapeutic DNA directly into the patient’s body.</span></p>",
          "wordLimit": 1
        },
        {
          "title": "Questions 23-26",
          "type": "tfng",
          "instructionHtml": "Do the following statements agree with the information given in reading passage? In boxes 23-26 on your answer sheet, write",
          "questions": [
            {
              "id": "q23",
              "answer": "True",
              "textHtml": "The first gene therapy trial on humans was unsuccessful",
              "explanation": "Paragraph A says Martin Cline's first attempt at modifying human DNA was unsuccessful.",
              "evidence": "The first attempt, an unsuccessful one, at modifying human DNA was performed in 1980 by Martin Cline."
            },
            {
              "id": "q24",
              "answer": "Not given",
              "textHtml": "So far, gene therapy has only been used on adults",
              "explanation": "The passage never states the ages of the patients treated, so whether gene therapy has only been used on adults is not stated."
            },
            {
              "id": "q25",
              "answer": "Not given",
              "textHtml": "X-SCID is more common in boys than girls",
              "explanation": "Paragraph D mentions two children who developed leukaemia after X-SCID treatment but never compares how common the condition is in boys versus girls."
            },
            {
              "id": "q26",
              "answer": "True",
              "textHtml": "The corrected cells are then returned to the patient",
              "explanation": "Paragraph D says the corrected cells are then returned to the patient after being treated outside the body.",
              "evidence": "The corrected cells are then returned to the patient."
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>TRUE</dt><dd>if the statement agrees with the information</dd><dt>FALSE</dt><dd>if the statement contradicts the information</dd><dt>NOT GIVEN</dt><dd>if there is no information on this</dd></dl>"
        }
      ]
    },
    {
      "label": "Passage 3",
      "stimulus": {
        "kind": "passage",
        "label": "Reading Passage 3",
        "title": "THE MYTH OF LEARNING STYLES",
        "instructionHtml": "You should spend about 20 minutes on this passage and its questions.",
        "paragraphs": [
          {
            "html": "<span>The idea that teaching methods should match a student’s particular learning style — their personal way of learning — is popular with teachers and students alike. But the evidence suggests it may not be helpful.</span>"
          },
          {
            "html": "<span>The concept of learning styles is one of the most influential — and widely criticized — theories in education. It is the idea that each person finds it easier to learn through a particular method of instruction. Some people, for example, are thought to learn better when they’re taught visually; others, when instruction is auditory, or through movement, and so on.</span>"
          },
          {
            "html": "<span>The idea is popular in part because it reflects the intuition of teachers and students. Everyone knows from personal experience that some kinds of learning feel easier than others, and that they may prefer one way of learning over another. And it is also popular because it claims to be based on science. The idea of learning styles was developed in the 1970s, as psychologists and educational theorists were trying to understand how people learn. The idea that different people learn information in different ways was appealing, and it soon became clear that many people had strong preferences about how they liked information to be presented. In a typical research study, one group of students might be classified as ‘visual learners’, while another group would be classified as ‘auditory learners’. All the students would then be asked to learn something, with half the visual learners being taught visually, and half being taught aurally. The auditory learners would also be split into the two groups. If the theory was correct, the visual learners should do better when taught visually, and the auditory learners should do better when taught aurally.</span>"
          },
          {
            "html": "<span>But that’s not what psychologists found. As early as 2004, a review of the evidence by cognitive scientists found that the great majority of studies did not provide any evidence supporting the idea that matching the material to a student’s particular learning style was helpful. More recently, a team of psychologists led by Daniel Willingham at the University of Virginia has examined the evidence for learning styles again. They found that the vast majority of studies either found no evidence for the theory, or actually contradicted it. As the researchers point out, people may have preferences about how they learn, but that doesn’t mean that they will learn better when the teaching matches those preferences.</span>"
          },
          {
            "html": "<span>There are several possible explanations for these findings. One is that some students might not actually have a ‘style’ that is strong enough to affect their learning. Another possibility is that students do have preferences about how they learn, but these preferences don’t affect their learning. A third possibility is that students do have preferences, and these preferences do affect their learning, but only because they have learned less well through other methods in the past.</span>"
          },
          {
            "html": "<span>But the most likely explanation is that different ways of learning are useful for learning different things. For example, learning to drive a car involves a mix of visual learning (such as watching the instructor), auditory learning (listening to instructions), and hands-on learning (actually driving the car). In a 2009 article in the journal Psychological Science in the Public Interest, psychologists Harold Pashler, Mark McDaniel, Doug Rohrer and Robert Bjork argued that the learning-styles approach is not only unsupported by science, but may actually be harmful, because it leads teachers to teach students in ways that are not very effective. For example, a student who is a ‘visual learner’ might be encouraged to learn only through visual materials, and never to practice learning by listening, reading or acting.</span>"
          },
          {
            "html": "<span>The idea of learning styles is also harmful because it can give students the impression that they have fixed, or fixed amounts of, intelligence. In recent years, a great deal of research has shown that people’s attitudes to learning can have a large impact on how much they learn. For example, students who believe that intelligence is fixed, and that they are either smart or stupid and there is nothing they can do about it, tend to do less well than students who believe that intelligence can change, and that they can become smarter by working hard at their studies. Similarly, students who have been told that they are ‘visual learners’ might put less effort into tasks that are based on reading or listening. This is particularly worrying because research has shown that students who use a mix of learning methods often learn more effectively than those who stick to their ‘style’.</span>"
          },
          {
            "html": "<span>Despite the lack of evidence for learning styles, the idea is still very popular. A 2014 study of more than 400 teachers in the UK and the Netherlands found that more than 90 percent of them believed that people learn better if they are taught in their preferred learning style, and that the majority of them used learning styles as a method of instruction. In the US, a 2017 survey of more than 300 teachers found that 96 percent of them agreed with the idea of learning styles, and 24 percent of them used it to guide their teaching.</span>"
          },
          {
            "html": "<span>The idea of learning styles is also popular among students. In a 2018 study, researchers asked more than 600 students in the US about their beliefs about learning. They found that 93 percent of them agreed with the idea of learning styles, and that 78 percent of them said that they had a particular learning style.</span>"
          },
          {
            "html": "<span>The evidence is clear: matching teaching to a student’s particular learning style is unlikely to lead to better learning. It may in fact be holding students back.</span>"
          }
        ]
      },
      "groups": [
        {
          "title": "Questions 27-31",
          "type": "yes-no-notgiven",
          "instructionHtml": "Do the following statements agree with the claims of the writer in reading passage? In boxes 27-31 on your answer sheet, write",
          "questions": [
            {
              "id": "q27",
              "answer": "Yes",
              "textHtml": "Teachers and students’ personal experiences contribute to the popularity of the learning styles concept",
              "explanation": "Paragraph 3 says the idea is popular partly because it reflects the personal experience of teachers and students.",
              "evidence": "The idea is popular in part because it reflects the intuition of teachers and students."
            },
            {
              "id": "q28",
              "answer": "Not given",
              "textHtml": "Research into learning styles was popular in the 1970s",
              "explanation": "Paragraph 3 says the idea was developed in the 1970s but never says research into it was popular then."
            },
            {
              "id": "q29",
              "answer": "No",
              "textHtml": "Psychologists found evidence for the idea of learning styles as early as 2004",
              "explanation": "Paragraph 4 says a 2004 review found the great majority of studies did not support the theory, the opposite of finding evidence for it.",
              "evidence": "As early as 2004, a review of the evidence by cognitive scientists found that the great majority of studies did not provide any evidence supporting the idea that matching the material to a student’s particular learning style was helpful."
            },
            {
              "id": "q30",
              "answer": "No",
              "textHtml": "The team of psychologists led by Daniel Willingham found evidence for the idea of learning styles",
              "explanation": "Paragraph 4 says Willingham's team found most studies showed no evidence for learning styles or actually contradicted the theory.",
              "evidence": "They found that the vast majority of studies either found no evidence for the theory, or actually contradicted it."
            },
            {
              "id": "q31",
              "answer": "Yes",
              "textHtml": "Students may learn better when they are taught using methods they are not familiar with",
              "explanation": "Paragraph 8 says students who mix learning methods often learn more effectively than those who stick to one preferred style.",
              "evidence": "This is particularly worrying because research has shown that students who use a mix of learning methods often learn more effectively than those who stick to their ‘style’."
            }
          ],
          "legendHtml": "<dl class=\"legend-key\"><dt>YES</dt><dd>if the statement agrees with the views of the writer</dd><dt>NO</dt><dd>if the statement contradicts the views of the writer</dd><dt>NOT GIVEN</dt><dd>if it is impossible to say what the writer thinks about this</dd></dl>"
        },
        {
          "title": "Questions 32-35",
          "type": "matching-features",
          "instructionHtml": "Complete the summary using the list of words, A-F, below. Write the correct letter, A-F, in boxes 32-35 on your answer sheet.",
          "questions": [
            {
              "id": "q32",
              "answer": "E",
              "textHtml": "………………. to affect their learning. Another possibility is that students may have preferences about how they learn, but these do not affect their",
              "explanation": "Paragraph 5 says some students may not have a style strong enough to affect their learning, matching the word preference in the summary.",
              "evidence": "One is that some students might not actually have a ‘style’ that is strong enough to affect their learning."
            },
            {
              "id": "q33",
              "answer": "D",
              "textHtml": "…………………. A third possibility is that students’ preferences do affect their learning, but only because they have learned less well through other methods in the past. The most likely explanation is that different ways of learning are useful for learning different things. For example, learning to drive a car involves visual learning, auditory learning and",
              "explanation": "Paragraph 5 says students may have preferences that simply do not affect their learning.",
              "evidence": "Another possibility is that students do have preferences about how they learn, but these preferences don’t affect their learning."
            },
            {
              "id": "q34",
              "answer": "C",
              "textHtml": "…………………. The learning-styles approach is not only unsupported by science, but may actually be",
              "explanation": "Paragraph 6 gives driving a car as an example combining visual, auditory and hands-on learning.",
              "evidence": "For example, learning to drive a car involves a mix of visual learning (such as watching the instructor), auditory learning (listening to instructions), and hands-on learning (actually driving the car)."
            },
            {
              "id": "q35",
              "answer": "A",
              "textHtml": "……………. A harmful B ability C hands-on learning D learning E preference F useful",
              "explanation": "Paragraph 6 says the learning styles approach may actually be harmful because it leads to less effective teaching.",
              "evidence": "In a 2009 article in the journal Psychological Science in the Public Interest, psychologists Harold Pashler, Mark McDaniel, Doug Rohrer and Robert Bjork argued that the learning-styles approach is not only unsupported by science, but may actually be harmful, because it leads teachers to teach students in ways that are not very effective."
            }
          ],
          "legendHtml": "<p><span><strong>EXPLANATIONS FOR THE FINDINGS</strong></span></p><p><span>One explanation is that some students might not have a strong enough (32) ………………. to affect their learning. Another possibility is that students may have preferences about how they learn, but these do not affect their (33) …………………. A third possibility is that students’ preferences do affect their learning, but only because they have learned less well through other methods in the past.</span></p><p><span>The most likely explanation is that different ways of learning are useful for learning different things. For example, learning to drive a car involves visual learning, auditory learning and (34) ………………….</span></p><p><span>The learning-styles approach is not only unsupported by science, but may actually be (35) …………….</span></p><p><span><strong>A</strong> harmful<br/>\n</span><span><strong>B</strong> ability<br/>\n</span><span><strong>C</strong> hands-on learning<br/>\n</span><span><strong>D</strong> learning<br/>\n</span><span><strong>E</strong> preference<br/>\n</span><span><strong>F</strong> useful</span></p>",
          "options": [
            "A",
            "B",
            "C",
            "D",
            "E",
            "F"
          ]
        },
        {
          "title": "Questions 36-40",
          "type": "sentence-completion",
          "instructionHtml": "Questions 36-40",
          "questions": [
            {
              "id": "q36",
              "answer": "Intelligence",
              "explanation": "Paragraph 7 says learning styles can give students a fixed idea about their level of intelligence.",
              "evidence": "The idea of learning styles is also harmful because it can give students the impression that they have fixed, or fixed amounts of, intelligence."
            },
            {
              "id": "q37",
              "answer": [
                "Changeable",
                "Changing"
              ],
              "explanation": "Paragraph 7 says students who believe that intelligence can change tend to do better than those who think it is fixed. The gap follows 'is', so it needs an adjective: 'changeable' or 'changing'.",
              "evidence": "For example, students who believe that intelligence is fixed, and that they are either smart or stupid and there is nothing they can do about it, tend to do less well than students who believe that intelligence can change, and that they can become smarter by working hard at their studies."
            },
            {
              "id": "q38",
              "answer": "Visual",
              "explanation": "Paragraph 8 says students told they are visual learners might not try as hard at reading or listening tasks.",
              "evidence": "In a typical research study, one group of students might be classified as ‘visual learners’, while another group would be classified as ‘auditory learners’."
            },
            {
              "id": "q39",
              "answer": "Mix",
              "explanation": "Paragraph 8 says students who use a mix of learning methods often learn more effectively.",
              "evidence": "This is particularly worrying because research has shown that students who use a mix of learning methods often learn more effectively than those who stick to their ‘style’."
            },
            {
              "id": "q40",
              "answer": [
                "Style",
                "Learning style"
              ],
              "explanation": "The paragraph on the 2018 study says 78 percent of students said they had a particular learning style. The instruction allows one word only, so the answer to write is 'style'.",
              "evidence": "They found that 93 percent of them agreed with the idea of learning styles, and that 78 percent of them said that they had a particular learning style."
            }
          ],
          "legendHtml": "<p><span>Complete the sentences below. Choose <strong>ONE WORD ONLY</strong> from the passage for each answer. Write your answers in boxes 36-40 on your answer sheet.</span></p><p><span>The idea of learning styles can give students the wrong idea about their level of (36) …………………. Students who believe that intelligence is (37) ………………… tend to do better than other students.</span></p><p><span>Students who have been told that they are (38) …………………… learners might not try so hard to learn by reading or listening.</span></p><p><span>Research has shown that students who use a (39) ………………….. of learning methods often learn more effectively.</span></p><p><span>In a 2018 study, 78 percent of students said that they had a particular (40) …………………</span></p>",
          "wordLimit": 1
        }
      ]
    }
  ]
};

export default test;
