import type { PracticeTest } from '../../lib/tests/schema';

export const listeningFull006: PracticeTest = {
  "id": "listening-full-006",
  "skill": "listening",
  "title": "IELTS Listening Test 6",
  "description": "A full IELTS Listening practice test shared with permission by PracticePTEOnline.",
  "durationMinutes": 40,
  "audioSrc": "/audio/listening/test-006.mp3",
  "source": {
    "name": "PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-listening-6/",
    "permission": "Reused with permission from the publisher."
  },
  "parts": [
    {
      "label": "Part 1",
      "stimulus": {
        "kind": "audio",
        "label": "Part 1",
        "src": "/audio/listening/test-006.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"1\" data-question-end=\"5\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 1-5</p><p class=\"listening-source-instruction\">Complete the form below. Write NO MORE THAN THREE WORDS OR A NUMBER.</p></header><p>Complete the form below. Write <strong>NO MORE THAN THREE WORDS OR A NUMBER.</strong></p><p><strong>BORGHEIMER LANGUAGE COURSES INFORMATION</strong></p><p>Course Level – 3/ lower intermediate</p><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"1\" role=\"listitem\">Customer’s name: <span aria-label=\"Blank for question 1\" class=\"listening-answer-blank\" data-question=\"1\" role=\"img\"><span class=\"listening-answer-number\">(1)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"2\" role=\"listitem\">Maximum class size: <span aria-label=\"Blank for question 2\" class=\"listening-answer-blank\" data-question=\"2\" role=\"img\"><span class=\"listening-answer-number\">(2)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"3\" role=\"listitem\">Hours of study per day (weekdays): <span aria-label=\"Blank for question 3\" class=\"listening-answer-blank\" data-question=\"3\" role=\"img\"><span class=\"listening-answer-number\">(3)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"4\" role=\"listitem\">Most expensive accommodation: <span aria-label=\"Blank for question 4\" class=\"listening-answer-blank\" data-question=\"4\" role=\"img\"><span class=\"listening-answer-number\">(4)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"5\" role=\"listitem\">First Berlin course begins: <span aria-label=\"Blank for question 5\" class=\"listening-answer-blank\" data-question=\"5\" role=\"img\"><span class=\"listening-answer-number\">(5)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section><section class=\"listening-source-group\" data-question-start=\"6\" data-question-end=\"7\" data-question-type=\"multiple-answer\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 6-7</p><p class=\"listening-source-instruction\">Choose TWO letters A-E.</p></header><p>Which <strong>TWO</strong> things does he need to buy for the course?</p><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>computer</dd></div><div><dt>B</dt><dd>computer disks</dd></div><div><dt>C</dt><dd>dictionary</dd></div><div><dt>D</dt><dd>translation exercises</dd></div><div><dt>E</dt><dd>textbooks</dd></div></dl></section><section class=\"listening-source-group\" data-question-start=\"8\" data-question-end=\"10\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 8-10</p><p class=\"listening-source-instruction\">Complete the sentences below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.</p></header><p>8. Without the student discount, the course costs <span aria-label=\"Blank for question 8\" class=\"listening-answer-blank\" data-question=\"8\" role=\"img\"><span class=\"listening-answer-number\">(8)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> Euros.</p><p>9. Payment can be made by credit card or by <span aria-label=\"Blank for question 9\" class=\"listening-answer-blank\" data-question=\"9\" role=\"img\"><span class=\"listening-answer-number\">(9)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></p><p>10. To get a free course you need to find <span aria-label=\"Blank for question 10\" class=\"listening-answer-blank\" data-question=\"10\" role=\"img\"><span class=\"listening-answer-number\">(10)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> other people.</p></section>"
      },
      "groups": [
        {
          "title": "Questions 1-5",
          "type": "sentence-completion",
          "instructionHtml": "Complete the form below. Write NO MORE THAN THREE WORDS OR A NUMBER.",
          "questions": [
            {
              "id": "q1",
              "textHtml": "Question 1",
              "answer": "John Petterson"
            },
            {
              "id": "q2",
              "textHtml": "Question 2",
              "answer": "12"
            },
            {
              "id": "q3",
              "textHtml": "Question 3",
              "answer": "5"
            },
            {
              "id": "q4",
              "textHtml": "Question 4",
              "answer": "Bed and breakfast"
            },
            {
              "id": "q5",
              "textHtml": "Question 5",
              "answer": "8th June"
            }
          ],
          "wordLimit": 3
        },
        {
          "title": "Questions 6-7",
          "type": "multiple-answer",
          "instructionHtml": "Choose TWO letters A-E.",
          "questions": [
            {
              "id": "q6",
              "textHtml": "Question 6",
              "answer": [
                "C",
                "E"
              ],
              "answerPairId": "test6-q6-q7"
            },
            {
              "id": "q7",
              "textHtml": "Question 7",
              "answer": [
                "C",
                "E"
              ],
              "answerPairId": "test6-q6-q7"
            }
          ],
          "choices": [
            {
              "value": "A",
              "label": "computer"
            },
            {
              "value": "B",
              "label": "computer disks"
            },
            {
              "value": "C",
              "label": "dictionary"
            },
            {
              "value": "D",
              "label": "translation exercises"
            },
            {
              "value": "E",
              "label": "textbooks"
            }
          ],
          "selectCount": 2
        },
        {
          "title": "Questions 8-10",
          "type": "sentence-completion",
          "instructionHtml": "Complete the sentences below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q8",
              "textHtml": "Without the student discount, the course costs Euros.",
              "answer": "550"
            },
            {
              "id": "q9",
              "textHtml": "Payment can be made by credit card or by",
              "answer": "Bank transfer"
            },
            {
              "id": "q10",
              "textHtml": "To get a free course you need to find other people.",
              "answer": "Five"
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
        "src": "/audio/listening/test-006.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"11\" data-question-end=\"15\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 11-15</p><p class=\"listening-source-instruction\">Complete the sentences below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.</p></header><p>11. Ministers and officials put the <span aria-label=\"Blank for question 11\" class=\"listening-answer-blank\" data-question=\"11\" role=\"img\"><span class=\"listening-answer-number\">(11)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> of the agriculture business first.</p><p>12. Hormones make cattle <span aria-label=\"Blank for question 12\" class=\"listening-answer-blank\" data-question=\"12\" role=\"img\"><span class=\"listening-answer-number\">(12)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> thus making meat production more profitable.</p><p>13. The use of hormones was banned over <span aria-label=\"Blank for question 13\" class=\"listening-answer-blank\" data-question=\"13\" role=\"img\"><span class=\"listening-answer-number\">(13)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> ago in Europe.</p><p>14. The USA and Canada asked the WTO to declare the ban <span aria-label=\"Blank for question 14\" class=\"listening-answer-blank\" data-question=\"14\" role=\"img\"><span class=\"listening-answer-number\">(14)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></p><p>15. A Danish study shows that hormones are over <span aria-label=\"Blank for question 15\" class=\"listening-answer-blank\" data-question=\"15\" role=\"img\"><span class=\"listening-answer-number\">(15)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>more dangerous than was previously thought.</p></section><section class=\"listening-source-group\" data-question-start=\"16\" data-question-end=\"20\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 16-20</p><p class=\"listening-source-instruction\">Complete the summary below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.</p></header><p><strong>Lack of testing</strong></p><p>The government has not been testing beef which is <span aria-label=\"Blank for question 16\" class=\"listening-answer-blank\" data-question=\"16\" role=\"img\"><span class=\"listening-answer-number\">(16)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> much to the anger of Mr. Verral. About <span aria-label=\"Blank for question 17\" class=\"listening-answer-blank\" data-question=\"17\" role=\"img\"><span class=\"listening-answer-number\">(17)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> of the beef which British people eat comes from abroad, some of it from Brazil, a country which on paper does not allow the use of <span aria-label=\"Blank for question 18\" class=\"listening-answer-blank\" data-question=\"18\" role=\"img\"><span class=\"listening-answer-number\">(18)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> However, when some EU inspectors visited a Brazilian farm, they found a <span aria-label=\"Blank for question 19\" class=\"listening-answer-blank\" data-question=\"19\" role=\"img\"><span class=\"listening-answer-number\">(19)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> of the banned substance. This is not the first food scandal we have had in this country. Several months ago, a well-known chocolate company found out its sweets were contaminated with <span aria-label=\"Blank for question 20\" class=\"listening-answer-blank\" data-question=\"20\" role=\"img\"><span class=\"listening-answer-number\">(20)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> of salmonella.</p></section>"
      },
      "groups": [
        {
          "title": "Questions 11-15",
          "type": "sentence-completion",
          "instructionHtml": "Complete the sentences below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q11",
              "textHtml": "Ministers and officials put the of the agriculture business first.",
              "answer": "Profits"
            },
            {
              "id": "q12",
              "textHtml": "Hormones make cattle thus making meat production more profitable.",
              "answer": "Grow faster"
            },
            {
              "id": "q13",
              "textHtml": "The use of hormones was banned over ago in Europe.",
              "answer": "20 years"
            },
            {
              "id": "q14",
              "textHtml": "The USA and Canada asked the WTO to declare the ban",
              "answer": "Illegal"
            },
            {
              "id": "q15",
              "textHtml": "A Danish study shows that hormones are over more dangerous than was previously thought.",
              "answer": "200 times"
            }
          ],
          "wordLimit": 3
        },
        {
          "title": "Questions 16-20",
          "type": "sentence-completion",
          "instructionHtml": "Complete the summary below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q16",
              "textHtml": "Question 16",
              "answer": "Imported"
            },
            {
              "id": "q17",
              "textHtml": "Question 17",
              "answer": "40%"
            },
            {
              "id": "q18",
              "textHtml": "Question 18",
              "answer": [
                "hormones",
                "growth hormones"
              ]
            },
            {
              "id": "q19",
              "textHtml": "Question 19",
              "answer": "Large stockpile"
            },
            {
              "id": "q20",
              "textHtml": "Question 20",
              "answer": "A rare form"
            }
          ],
          "wordLimit": 3
        }
      ]
    },
    {
      "label": "Part 3",
      "stimulus": {
        "kind": "audio",
        "label": "Part 3",
        "src": "/audio/listening/test-006.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"21\" data-question-end=\"25\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 21-25</p><p class=\"listening-source-instruction\">Complete the summary below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.</p></header><p><strong>High achievers</strong></p><p>Although it is thought that people who bring work home every night would be top achievers, they tend to peak early and then go into <span aria-label=\"Blank for question 21\" class=\"listening-answer-blank\" data-question=\"21\" role=\"img\"><span class=\"listening-answer-number\">(21)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> High achievers work hard, but within <span aria-label=\"Blank for question 22\" class=\"listening-answer-blank\" data-question=\"22\" role=\"img\"><span class=\"listening-answer-number\">(22)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> It is also important to choose <span aria-label=\"Blank for question 23\" class=\"listening-answer-blank\" data-question=\"23\" role=\"img\"><span class=\"listening-answer-number\">(23)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> you enjoy. Top achievers spend over <span aria-label=\"Blank for question 24\" class=\"listening-answer-blank\" data-question=\"24\" role=\"img\"><span class=\"listening-answer-number\">(24)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> of their working hours doing work they prefer. They want <span aria-label=\"Blank for question 25\" class=\"listening-answer-blank\" data-question=\"25\" role=\"img\"><span class=\"listening-answer-number\">(25)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> not just external rewards.</p></section><section class=\"listening-source-group\" data-question-start=\"26\" data-question-end=\"30\" data-question-type=\"multiple-choice\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 26-30</p><p class=\"listening-source-instruction\">Choose the correct letter A, B or C.</p></header><article class=\"listening-source-question\" data-question=\"26\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">26</span>Top achievers take risks</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>without worrying about the consequences</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>only if they are assured of success</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>even if they face possible failure</span></li></ol></article><article class=\"listening-source-question\" data-question=\"27\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">27</span>Very often perfectionists</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>turn out to be top achievers</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>don’t get many results</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>are not hard working</span></li></ol></article><article class=\"listening-source-question\" data-question=\"28\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">28</span>When top achievers make mistakes</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>they ignore the fact</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>they get angry with themselves</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>they learn from the experience</span></li></ol></article><article class=\"listening-source-question\" data-question=\"29\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">29</span>Top achievers tend to be people who</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>work well with others</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>prefer to work alone</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>complicate matters</span></li></ol></article><article class=\"listening-source-question\" data-question=\"30\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">30</span>Loners</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>want to do everything themselves</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>are free of the compulsion to be perfect</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>take no notice of rivals</span></li></ol></article></section>"
      },
      "groups": [
        {
          "title": "Questions 21-25",
          "type": "sentence-completion",
          "instructionHtml": "Complete the summary below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q21",
              "textHtml": "Question 21",
              "answer": "Decline"
            },
            {
              "id": "q22",
              "textHtml": "Question 22",
              "answer": "Strict limits"
            },
            {
              "id": "q23",
              "textHtml": "Question 23",
              "answer": "A career"
            },
            {
              "id": "q24",
              "textHtml": "Question 24",
              "answer": "Two-thirds"
            },
            {
              "id": "q25",
              "textHtml": "Question 25",
              "answer": "Internal satisfaction"
            }
          ],
          "wordLimit": 3
        },
        {
          "title": "Questions 26-30",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A, B or C.",
          "questions": [
            {
              "id": "q26",
              "textHtml": "Top achievers take risks",
              "answer": "C",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q27",
              "textHtml": "Very often perfectionists",
              "answer": "B",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q28",
              "textHtml": "When top achievers make mistakes",
              "answer": "C",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q29",
              "textHtml": "Top achievers tend to be people who",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q30",
              "textHtml": "Loners",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
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
        "src": "/audio/listening/test-006.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"31\" data-question-end=\"34\" data-question-type=\"multiple-choice\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 31-34</p><p class=\"listening-source-instruction\">Choose the correct letter A, B or C.</p></header><article class=\"listening-source-question\" data-question=\"31\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">31</span>Exposure to bright light</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>stopped production of melatonin in patients</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>increased the production of melatonin in many patients</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>caused people to crave sweet things</span></li></ol></article><article class=\"listening-source-question\" data-question=\"32\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">32</span>Melatonin’s role in SAD is</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>not considered that important</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>now fully understood</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>not fully understood</span></li></ol></article><article class=\"listening-source-question\" data-question=\"33\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">33</span>Subsyndromal SAD</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>is more common than SAD</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>has approximately the same number of sufferers as SAD</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>is far less common than SAD</span></li></ol></article><article class=\"listening-source-question\" data-question=\"34\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">34</span>You would expect the typical SAD sufferer to be</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>a 45 year old man</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>a 16 year old girl</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>a 25 year old women</span></li></ol></article></section><section class=\"listening-source-group\" data-question-start=\"35\" data-question-end=\"40\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 35-40</p><p class=\"listening-source-instruction\">Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.</p></header><p>35. Depression probably has a <span aria-label=\"Blank for question 35\" class=\"listening-answer-blank\" data-question=\"35\" role=\"img\"><span class=\"listening-answer-number\">(35)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> as it seems to run in the family.</p><p>36. Many SAD sufferers have a <span aria-label=\"Blank for question 36\" class=\"listening-answer-blank\" data-question=\"36\" role=\"img\"><span class=\"listening-answer-number\">(36)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> craving.</p><p>37. Serotonin has a <span aria-label=\"Blank for question 37\" class=\"listening-answer-blank\" data-question=\"37\" role=\"img\"><span class=\"listening-answer-number\">(37)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> effect on the brain.</p><p>38. The serotonin system of the brain cannot regulate itself well during <span aria-label=\"Blank for question 38\" class=\"listening-answer-blank\" data-question=\"38\" role=\"img\"><span class=\"listening-answer-number\">(38)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></p><p>39. Some neurotransmitters may be <span aria-label=\"Blank for question 39\" class=\"listening-answer-blank\" data-question=\"39\" role=\"img\"><span class=\"listening-answer-number\">(39)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> in certain cases.</p><p>40. Many SAD patients put on fat in late autumn, just as <span aria-label=\"Blank for question 40\" class=\"listening-answer-blank\" data-question=\"40\" role=\"img\"><span class=\"listening-answer-number\">(40)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></p></section>"
      },
      "groups": [
        {
          "title": "Questions 31-34",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A, B or C.",
          "questions": [
            {
              "id": "q31",
              "textHtml": "Exposure to bright light",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q32",
              "textHtml": "Melatonin’s role in SAD is",
              "answer": "C",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q33",
              "textHtml": "Subsyndromal SAD",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q34",
              "textHtml": "You would expect the typical SAD sufferer to be",
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
          "title": "Questions 35-40",
          "type": "sentence-completion",
          "instructionHtml": "Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.",
          "questions": [
            {
              "id": "q35",
              "textHtml": "Depression probably has a as it seems to run in the family.",
              "answer": "Genetic component"
            },
            {
              "id": "q36",
              "textHtml": "Many SAD sufferers have a craving.",
              "answer": "Carbohydrate"
            },
            {
              "id": "q37",
              "textHtml": "Serotonin has a effect on the brain.",
              "answer": "Soothing"
            },
            {
              "id": "q38",
              "textHtml": "The serotonin system of the brain cannot regulate itself well during",
              "answer": [
                "winter",
                "the winter"
              ]
            },
            {
              "id": "q39",
              "textHtml": "Some neurotransmitters may be in certain cases.",
              "answer": "Inadequate"
            },
            {
              "id": "q40",
              "textHtml": "Many SAD patients put on fat in late autumn, just as",
              "answer": "Hibernations"
            }
          ],
          "wordLimit": 2
        }
      ]
    }
  ]
};
