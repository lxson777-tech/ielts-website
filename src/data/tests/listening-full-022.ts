import type { PracticeTest } from '../../lib/tests/schema';

export const listeningFull022: PracticeTest = {
  "id": "listening-full-022",
  "skill": "listening",
  "title": "IELTS Listening Test 22",
  "description": "A full IELTS Listening practice test shared with permission by PracticePTEOnline.",
  "durationMinutes": 40,
  "audioSrc": "/audio/listening/test-022.mp3",
  "source": {
    "name": "PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-listening-test-22/",
    "permission": "Reused with permission from the publisher."
  },
  "parts": [
    {
      "label": "Part 1",
      "stimulus": {
        "kind": "audio",
        "label": "Part 1",
        "src": "/audio/listening/test-022.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"1\" data-question-end=\"5\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 1-5</p><p class=\"listening-source-instruction\">Complete the notes below. Write NO MORE THAN ONE WORD OR A NUMBER.</p></header><div class=\"listening-source-note-block\"><div class=\"listening-source-note-row\">Library application form</div><div class=\"listening-source-note-row\">Surname: Price</div></div><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\">First name: Angela Mary</p><div class=\"listening-source-question-row\" data-question-row=\"1\" role=\"listitem\">Address: apartment 3, 86  <span aria-label=\"Blank for question 1\" class=\"listening-answer-blank\" data-question=\"1\" role=\"img\"><span class=\"listening-answer-number\">(1)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> street, Pimlico</div><div class=\"listening-source-question-row\" data-question-row=\"2\" role=\"listitem\">Post code:  <span aria-label=\"Blank for question 2\" class=\"listening-answer-blank\" data-question=\"2\" role=\"img\"><span class=\"listening-answer-number\">(2)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-support-row\">Telephone: 8763 5142 (home)</div><div class=\"listening-source-question-row\" data-question-row=\"3\" role=\"listitem\"><span aria-label=\"Blank for question 3\" class=\"listening-answer-blank\" data-question=\"3\" role=\"img\"><span class=\"listening-answer-number\">(3)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> (work)</div><div class=\"listening-source-question-row\" data-question-row=\"4\" role=\"listitem\">Driver’s licence number:  <span aria-label=\"Blank for question 4\" class=\"listening-answer-blank\" data-question=\"4\" role=\"img\"><span class=\"listening-answer-number\">(4)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"5\" role=\"listitem\">Date of birth: Day: 24 Month:  <span aria-label=\"Blank for question 5\" class=\"listening-answer-blank\" data-question=\"5\" role=\"img\"><span class=\"listening-answer-number\">(5)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> Year: 1981</div></div></section><section class=\"listening-source-group\" data-question-start=\"6\" data-question-end=\"8\" data-question-type=\"multiple-answer\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 6-8</p><p class=\"listening-source-instruction\">Circle THREE letters A-F.</p></header><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>sport</dd></div><div><dt>B</dt><dd>travel</dd></div><div><dt>C</dt><dd>classics</dd></div><div><dt>D</dt><dd>history</dd></div><div><dt>E</dt><dd>cooking</dd></div><div><dt>F</dt><dd>nature</dd></div></dl></section><section class=\"listening-source-group\" data-question-start=\"9\" data-question-end=\"10\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 9-10</p><p class=\"listening-source-instruction\">Write NO MORE THAN THREE WORDS for each answer.</p></header><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"9\" role=\"listitem\">How much does it cost to join the library? <span aria-label=\"Blank for question 9\" class=\"listening-answer-blank\" data-question=\"9\" role=\"img\"><span class=\"listening-answer-number\">(9)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"10\" role=\"listitem\">When will Angela’s card be ready? <span aria-label=\"Blank for question 10\" class=\"listening-answer-blank\" data-question=\"10\" role=\"img\"><span class=\"listening-answer-number\">(10)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section>"
      },
      "groups": [
        {
          "title": "Questions 1-5",
          "type": "sentence-completion",
          "instructionHtml": "Complete the notes below. Write NO MORE THAN ONE WORD OR A NUMBER.",
          "questions": [
            {
              "id": "q1",
              "textHtml": "Question 1",
              "answer": "bridge"
            },
            {
              "id": "q2",
              "textHtml": "Question 2",
              "answer": "2065"
            },
            {
              "id": "q3",
              "textHtml": "Question 3",
              "answer": "84561307"
            },
            {
              "id": "q4",
              "textHtml": "Question 4",
              "answer": "4040AC"
            },
            {
              "id": "q5",
              "textHtml": "Question 5",
              "answer": "March"
            }
          ],
          "wordLimit": 1
        },
        {
          "title": "Questions 6-8",
          "type": "multiple-answer",
          "instructionHtml": "Circle THREE letters A-F.",
          "questions": [
            {
              "id": "q6",
              "textHtml": "Question 6",
              "answer": [
                "B",
                "E",
                "F"
              ],
              "answerPairId": "test22-q6-q8"
            },
            {
              "id": "q7",
              "textHtml": "Question 7",
              "answer": [
                "B",
                "E",
                "F"
              ],
              "answerPairId": "test22-q6-q8"
            },
            {
              "id": "q8",
              "textHtml": "Question 8",
              "answer": [
                "B",
                "E",
                "F"
              ],
              "answerPairId": "test22-q6-q8"
            }
          ],
          "choices": [
            {
              "value": "A",
              "label": "sport"
            },
            {
              "value": "B",
              "label": "travel"
            },
            {
              "value": "C",
              "label": "classics"
            },
            {
              "value": "D",
              "label": "history"
            },
            {
              "value": "E",
              "label": "cooking"
            },
            {
              "value": "F",
              "label": "nature"
            }
          ],
          "selectCount": 3
        },
        {
          "title": "Questions 9-10",
          "type": "sentence-completion",
          "instructionHtml": "Write NO MORE THAN THREE WORDS for each answer.",
          "questions": [
            {
              "id": "q9",
              "textHtml": "How much does it cost to join the library?",
              "answer": "$20"
            },
            {
              "id": "q10",
              "textHtml": "When will Angela’s card be ready?",
              "answer": "next week"
            }
          ],
          "wordLimit": 3
        }
      ]
    },
    {
      "label": "Part 2",
      "stimulus": {
        "kind": "audio",
        "label": "Part 2",
        "src": "/audio/listening/test-022.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"11\" data-question-end=\"12\" data-question-type=\"multiple-choice\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 11-12</p><p class=\"listening-source-instruction\">Choose the correct letter A, B or C.</p></header><article class=\"listening-source-question\" data-question=\"11\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">11</span>What is one of the new advantages in the dining facilities?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>more students</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>more variety</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>more service</span></li></ol></article><article class=\"listening-source-question\" data-question=\"12\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">12</span>What was one problem with the dining options last year?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>students did not have enough to eat</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>students has to pay too much money</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>students had to eat whatever was served</span></li></ol></article></section><section class=\"listening-source-group\" data-question-start=\"13\" data-question-end=\"14\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 13-14</p><p class=\"listening-source-instruction\">Write NO MORE THAN THREE WORDS for each answer.</p></header><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"13\" role=\"listitem\"><span aria-label=\"Blank for question 13\" class=\"listening-answer-blank\" data-question=\"13\" role=\"img\"><span class=\"listening-answer-number\">(13)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> and pasta are an example of  <span aria-label=\"Additional blank for question 13\" class=\"listening-answer-blank listening-answer-blank-continuation\" role=\"img\"><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> food</div><div class=\"listening-source-question-row\" data-question-row=\"14\" role=\"listitem\">American food consists of  <span aria-label=\"Blank for question 14\" class=\"listening-answer-blank\" data-question=\"14\" role=\"img\"><span class=\"listening-answer-number\">(14)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section><section class=\"listening-source-group\" data-question-start=\"15\" data-question-end=\"18\" data-question-type=\"multiple-choice\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 15-18</p><p class=\"listening-source-instruction\">Choose the correct letter A, B or C.</p></header><article class=\"listening-source-question\" data-question=\"15\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">15</span>Why does the school say the food will be better?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>they hired real chefs</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>The food is more expensive</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>they will make more kinds</span></li></ol></article><article class=\"listening-source-question\" data-question=\"16\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">16</span>When will the dining facilities open and close?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>6 am and 12 pm</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>6 am and 12 am</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>12 pm and 6 pm</span></li><li data-option=\"D\"><span class=\"listening-source-option-key\">D</span><span>12 pm and 6 am</span></li></ol></article><article class=\"listening-source-question\" data-question=\"17\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">17</span>What can students do if they are hungry in the afternoon?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>go out and buy food on the street</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>wait till dinner time</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>go to the student store for snacks</span></li></ol></article><article class=\"listening-source-question\" data-question=\"18\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">18</span>What must you do to eat in the dining facilities if you are not a student?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>purchase a dining facility card</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>purchase meals at the door</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>purchase meals from other students</span></li></ol></article></section><section class=\"listening-source-group\" data-question-start=\"19\" data-question-end=\"20\" data-question-type=\"multiple-answer\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 19-20</p><p class=\"listening-source-instruction\">Select TWO answers.</p></header><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>do not waste food</dd></div><div><dt>B</dt><dd>you may bring friends in to eat</dd></div><div><dt>C</dt><dd>bring your own plates and trays</dd></div><div><dt>D</dt><dd>clean your own plates and trays</dd></div><div><dt>E</dt><dd>don’t litter</dd></div></dl></section>"
      },
      "groups": [
        {
          "title": "Questions 11-12",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A, B or C.",
          "questions": [
            {
              "id": "q11",
              "textHtml": "What is one of the new advantages in the dining facilities?",
              "answer": "B",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q12",
              "textHtml": "What was one problem with the dining options last year?",
              "answer": "C",
              "options": [
                "A",
                "B",
                "C"
              ]
            }
          ]
        },
        {
          "title": "Questions 13-14",
          "type": "sentence-completion",
          "instructionHtml": "Write NO MORE THAN THREE WORDS for each answer.",
          "questions": [
            {
              "id": "q13",
              "textHtml": "and pasta are an example of food",
              "answer": "Pizza, Italian"
            },
            {
              "id": "q14",
              "textHtml": "American food consists of",
              "answer": "hamburgers, hot dogs"
            }
          ],
          "wordLimit": 3
        },
        {
          "title": "Questions 15-18",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A, B or C.",
          "questions": [
            {
              "id": "q15",
              "textHtml": "Why does the school say the food will be better?",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q16",
              "textHtml": "When will the dining facilities open and close?",
              "answer": "B",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q17",
              "textHtml": "What can students do if they are hungry in the afternoon?",
              "answer": "C",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q18",
              "textHtml": "What must you do to eat in the dining facilities if you are not a student?",
              "answer": "B",
              "options": [
                "A",
                "B",
                "C"
              ]
            }
          ]
        },
        {
          "title": "Questions 19-20",
          "type": "multiple-answer",
          "instructionHtml": "Select TWO answers.",
          "questions": [
            {
              "id": "q19",
              "textHtml": "Question 19",
              "answer": [
                "A",
                "D"
              ],
              "answerPairId": "test22-q19-q20"
            },
            {
              "id": "q20",
              "textHtml": "Question 20",
              "answer": [
                "A",
                "D"
              ],
              "answerPairId": "test22-q19-q20"
            }
          ],
          "choices": [
            {
              "value": "A",
              "label": "do not waste food"
            },
            {
              "value": "B",
              "label": "you may bring friends in to eat"
            },
            {
              "value": "C",
              "label": "bring your own plates and trays"
            },
            {
              "value": "D",
              "label": "clean your own plates and trays"
            },
            {
              "value": "E",
              "label": "don't litter"
            }
          ],
          "selectCount": 2
        }
      ]
    },
    {
      "label": "Part 3",
      "stimulus": {
        "kind": "audio",
        "label": "Part 3",
        "src": "/audio/listening/test-022.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"21\" data-question-end=\"25\" data-question-type=\"table-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 21-25</p><p class=\"listening-source-instruction\">Complete the table below. Write NO MORE THAN THREE WORDS for each answer.</p></header><figure class=\"listening-source-table\"><table><thead><tr><th>Forms of dog training</th><th>Examples</th></tr></thead><tbody><tr><td>Obedience training</td><td>– Sit<br/>– <span aria-label=\"Blank for question 21\" class=\"listening-answer-blank\" data-question=\"21\" role=\"img\"><span class=\"listening-answer-number\">(21)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Spoken commands</td><td>– <span aria-label=\"Blank for question 22\" class=\"listening-answer-blank\" data-question=\"22\" role=\"img\"><span class=\"listening-answer-number\">(22)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Guard training</td><td>– Patrolling<br/>– <span aria-label=\"Blank for question 23\" class=\"listening-answer-blank\" data-question=\"23\" role=\"img\"><span class=\"listening-answer-number\">(23)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Attack training</td><td>– Knocking someone down<br/>– <span aria-label=\"Blank for question 24\" class=\"listening-answer-blank\" data-question=\"24\" role=\"img\"><span class=\"listening-answer-number\">(24)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Search training</td><td>– <span aria-label=\"Blank for question 25\" class=\"listening-answer-blank\" data-question=\"25\" role=\"img\"><span class=\"listening-answer-number\">(25)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr></tbody></table></figure></section><section class=\"listening-source-group\" data-question-start=\"26\" data-question-end=\"30\" data-question-type=\"categorisation\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 26-30</p><p class=\"listening-source-instruction\">Write the appropriate letter A-C next to questions 26-30.</p></header><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>small dogs</dd></div><div><dt>B</dt><dd>intelligent dogs</dd></div><div><dt>C</dt><dd>large dogs</dd></div></dl><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"26\" role=\"listitem\">physical training <span aria-label=\"Blank for question 26\" class=\"listening-answer-blank\" data-question=\"26\" role=\"img\"><span class=\"listening-answer-number\">(26)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"27\" role=\"listitem\">search training <span aria-label=\"Blank for question 27\" class=\"listening-answer-blank\" data-question=\"27\" role=\"img\"><span class=\"listening-answer-number\">(27)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"28\" role=\"listitem\">attack training <span aria-label=\"Blank for question 28\" class=\"listening-answer-blank\" data-question=\"28\" role=\"img\"><span class=\"listening-answer-number\">(28)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"29\" role=\"listitem\">barking <span aria-label=\"Blank for question 29\" class=\"listening-answer-blank\" data-question=\"29\" role=\"img\"><span class=\"listening-answer-number\">(29)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"30\" role=\"listitem\">biting <span aria-label=\"Blank for question 30\" class=\"listening-answer-blank\" data-question=\"30\" role=\"img\"><span class=\"listening-answer-number\">(30)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section>"
      },
      "groups": [
        {
          "title": "Questions 21-25",
          "type": "table-completion",
          "instructionHtml": "Complete the table below. Write NO MORE THAN THREE WORDS for each answer.",
          "questions": [
            {
              "id": "q21",
              "textHtml": "Question 21",
              "answer": "stay"
            },
            {
              "id": "q22",
              "textHtml": "Question 22",
              "answer": "speak"
            },
            {
              "id": "q23",
              "textHtml": "Question 23",
              "answer": "barking"
            },
            {
              "id": "q24",
              "textHtml": "Question 24",
              "answer": "biting"
            },
            {
              "id": "q25",
              "textHtml": "Question 25",
              "answer": "sniffing"
            }
          ],
          "wordLimit": 3
        },
        {
          "title": "Questions 26-30",
          "type": "categorisation",
          "instructionHtml": "Write the appropriate letter A-C next to questions 26-30.",
          "questions": [
            {
              "id": "q26",
              "textHtml": "physical training",
              "answer": "C"
            },
            {
              "id": "q27",
              "textHtml": "search training",
              "answer": "B"
            },
            {
              "id": "q28",
              "textHtml": "attack training",
              "answer": "C"
            },
            {
              "id": "q29",
              "textHtml": "barking",
              "answer": "A"
            },
            {
              "id": "q30",
              "textHtml": "biting",
              "answer": "B"
            }
          ]
        }
      ]
    },
    {
      "label": "Part 4",
      "stimulus": {
        "kind": "audio",
        "label": "Part 4",
        "src": "/audio/listening/test-022.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"31\" data-question-end=\"36\" data-question-type=\"table-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 31-36</p><p class=\"listening-source-instruction\">Complete the table below. Write NO MORE THAN TWO WORDS AND/ OR A NUMBER for each answer.</p></header><figure class=\"listening-source-table\"><table><thead><tr><th>Facility</th><th>Location</th><th>Hours</th><th>Items provided</th></tr></thead><tbody><tr><td>Dining hall</td><td>1st floor</td><td><span aria-label=\"Blank for question 31\" class=\"listening-answer-blank\" data-question=\"31\" role=\"img\"><span class=\"listening-answer-number\">(31)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td><td>Food</td></tr><tr><td>Gym and recreational hall</td><td><span aria-label=\"Blank for question 32\" class=\"listening-answer-blank\" data-question=\"32\" role=\"img\"><span class=\"listening-answer-number\">(32)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td><td>10 am to 10 pm</td><td>Treadmills, weight set <span aria-label=\"Blank for question 33\" class=\"listening-answer-blank\" data-question=\"33\" role=\"img\"><span class=\"listening-answer-number\">(33)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Kitchen</td><td><span aria-label=\"Blank for question 34\" class=\"listening-answer-blank\" data-question=\"34\" role=\"img\"><span class=\"listening-answer-number\">(34)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td><td><span aria-label=\"Blank for question 35\" class=\"listening-answer-blank\" data-question=\"35\" role=\"img\"><span class=\"listening-answer-number\">(35)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td><td><span aria-label=\"Blank for question 36\" class=\"listening-answer-blank\" data-question=\"36\" role=\"img\"><span class=\"listening-answer-number\">(36)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>microwave oven, store</td></tr></tbody></table></figure></section><section class=\"listening-source-group\" data-question-start=\"37\" data-question-end=\"40\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 37-40</p><p class=\"listening-source-instruction\">Complete the sentences below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.</p></header><p>37. List three activities that Saturday Morning Outings have included in the past <span aria-label=\"Blank for question 37\" class=\"listening-answer-blank\" data-question=\"37\" role=\"img\"><span class=\"listening-answer-number\">(37)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></p><p>38. There are <span aria-label=\"Blank for question 38\" class=\"listening-answer-blank\" data-question=\"38\" role=\"img\"><span class=\"listening-answer-number\">(38)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> spaces available for the volleyball team.</p><p>39. The first rule of the building: <span aria-label=\"Blank for question 39\" class=\"listening-answer-blank\" data-question=\"39\" role=\"img\"><span class=\"listening-answer-number\">(39)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> must be kept to a minimum after 11 pm. The second rule of the building: All visitors must sign in at the front of the building.</p><p>40. The third rule of the building: <span aria-label=\"Blank for question 40\" class=\"listening-answer-blank\" data-question=\"40\" role=\"img\"><span class=\"listening-answer-number\">(40)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> are not permitted in the building.</p></section>"
      },
      "groups": [
        {
          "title": "Questions 31-36",
          "type": "table-completion",
          "instructionHtml": "Complete the table below. Write NO MORE THAN TWO WORDS AND/ OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q31",
              "textHtml": "Question 31",
              "answer": "7am – 12am"
            },
            {
              "id": "q32",
              "textHtml": "Question 32",
              "answer": "basement"
            },
            {
              "id": "q33",
              "textHtml": "Question 33",
              "answer": "pin-pong tables"
            },
            {
              "id": "q34",
              "textHtml": "Question 34",
              "answer": "2nd floor"
            },
            {
              "id": "q35",
              "textHtml": "Question 35",
              "answer": "24 hours"
            },
            {
              "id": "q36",
              "textHtml": "Question 36",
              "answer": "refrigerator"
            }
          ],
          "wordLimit": 2
        },
        {
          "title": "Questions 37-40",
          "type": "sentence-completion",
          "instructionHtml": "Complete the sentences below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q37",
              "textHtml": "List three activities that Saturday Morning Outings have included in the past",
              "answer": "fishing, hiking, cycling"
            },
            {
              "id": "q38",
              "textHtml": "There are spaces available for the volleyball team.",
              "answer": "20"
            },
            {
              "id": "q39",
              "textHtml": "The first rule of the building: must be kept to a minimum after 11 pm. The second rule of the building: All visitors must sign in at the front of the building.",
              "answer": "noise levels"
            },
            {
              "id": "q40",
              "textHtml": "The third rule of the building: are not permitted in the building.",
              "answer": "alcohol and drugs"
            }
          ],
          "wordLimit": 3
        }
      ]
    }
  ]
};
