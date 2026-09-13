import type { PracticeTest } from '../../lib/tests/schema';

export const listeningFull010: PracticeTest = {
  "id": "listening-full-010",
  "skill": "listening",
  "title": "IELTS Listening Test 10",
  "description": "A full IELTS Listening practice test shared with permission by PracticePTEOnline.",
  "durationMinutes": 40,
  "audioSrc": "/audio/listening/test-010.mp3",
  "source": {
    "name": "PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-listening-test-10/",
    "permission": "Reused with permission from the publisher."
  },
  "parts": [
    {
      "label": "Section 1",
      "stimulus": {
        "kind": "audio",
        "label": "Section 1",
        "src": "/audio/listening/test-010.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"1\" data-question-end=\"4\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 1-4</p><p class=\"listening-source-instruction\">Complete the form below. Write NO MORE THAN ONE WORD AND/OR A NUMBER for each answer.</p></header><p><strong>GRANDVIEW HOTEL</strong></p><figure class=\"listening-source-table\"><table><tbody><tr><td>Arrival date:</td><td><span aria-label=\"Blank for question 1\" class=\"listening-answer-blank\" data-question=\"1\" role=\"img\"><span class=\"listening-answer-number\">(1)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>13th, number of nights:2</td></tr><tr><td>Number of guests:</td><td><span aria-label=\"Blank for question 2\" class=\"listening-answer-blank\" data-question=\"2\" role=\"img\"><span class=\"listening-answer-number\">(2)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Guest name:</td><td>Roxanne <span aria-label=\"Blank for question 3\" class=\"listening-answer-blank\" data-question=\"3\" role=\"img\"><span class=\"listening-answer-number\">(3)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Credit card number:</td><td><span aria-label=\"Blank for question 4\" class=\"listening-answer-blank\" data-question=\"4\" role=\"img\"><span class=\"listening-answer-number\">(4)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr></tbody></table></figure></section><section class=\"listening-source-group\" data-question-start=\"5\" data-question-end=\"7\" data-question-type=\"multiple-answer\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 5-7</p><p class=\"listening-source-instruction\">Choose THREE letters, A-G.</p></header><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>art museum</dd></div><div><dt>B</dt><dd>science museum</dd></div><div><dt>C</dt><dd>shopping mall</dd></div><div><dt>D</dt><dd>monument</dd></div><div><dt>E</dt><dd>post office</dd></div><div><dt>F</dt><dd>restaurant</dd></div><div><dt>G</dt><dd>park</dd></div></dl></section><section class=\"listening-source-group\" data-question-start=\"8\" data-question-end=\"10\" data-question-type=\"multiple-choice\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 8-10</p><p class=\"listening-source-instruction\">Choose the correct letters, A, B, or C.</p></header><article class=\"listening-source-question\" data-question=\"8\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">8</span>When will the caller arrive at the airport?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>In the morning</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>In the afternoon</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>At night</span></li></ol></article><article class=\"listening-source-question\" data-question=\"9\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">9</span>How will the caller get to the hotel?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>Subway</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>Bus</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>Taxi</span></li></ol></article><article class=\"listening-source-question\" data-question=\"10\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">10</span>What time does the hotel front desk close?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>10:00</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>12:00</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>2:00</span></li></ol></article></section>"
      },
      "groups": [
        {
          "title": "Questions 1-4",
          "type": "sentence-completion",
          "instructionHtml": "Complete the form below. Write NO MORE THAN ONE WORD AND/OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q1",
              "textHtml": "Question 1",
              "answer": "february"
            },
            {
              "id": "q2",
              "textHtml": "Question 2",
              "answer": "one"
            },
            {
              "id": "q3",
              "textHtml": "Question 3",
              "answer": "Wilson"
            },
            {
              "id": "q4",
              "textHtml": "Question 4",
              "answer": "2336189872"
            }
          ],
          "wordLimit": 1
        },
        {
          "title": "Questions 5-7",
          "type": "multiple-answer",
          "instructionHtml": "Choose THREE letters, A-G.",
          "questions": [
            {
              "id": "q5",
              "textHtml": "Question 5",
              "answer": [
                "C",
                "F",
                "G"
              ],
              "answerPairId": "test10-q5-q7"
            },
            {
              "id": "q6",
              "textHtml": "Question 6",
              "answer": [
                "C",
                "F",
                "G"
              ],
              "answerPairId": "test10-q5-q7"
            },
            {
              "id": "q7",
              "textHtml": "Question 7",
              "answer": [
                "C",
                "F",
                "G"
              ],
              "answerPairId": "test10-q5-q7"
            }
          ],
          "choices": [
            {
              "value": "A",
              "label": "art museum"
            },
            {
              "value": "B",
              "label": "science museum"
            },
            {
              "value": "C",
              "label": "shopping mall"
            },
            {
              "value": "D",
              "label": "monument"
            },
            {
              "value": "E",
              "label": "post office"
            },
            {
              "value": "F",
              "label": "restaurant"
            },
            {
              "value": "G",
              "label": "park"
            }
          ],
          "selectCount": 3
        },
        {
          "title": "Questions 8-10",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letters, A, B, or C.",
          "questions": [
            {
              "id": "q8",
              "textHtml": "When will the caller arrive at the airport?",
              "answer": "C",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q9",
              "textHtml": "How will the caller get to the hotel?",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q10",
              "textHtml": "What time does the hotel front desk close?",
              "answer": "C",
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
      "label": "Section 2",
      "stimulus": {
        "kind": "audio",
        "label": "Section 2",
        "src": "/audio/listening/test-010.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"11\" data-question-end=\"12\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 11-12</p><p class=\"listening-source-instruction\">Complete the information below. Write ONE NUMBER for each answer.</p></header><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\"><strong>City Tours</strong></p><p class=\"listening-source-title\">Fare Information</p><div class=\"listening-source-question-row\" data-question-row=\"11\" role=\"listitem\">Adult All-Day Pass:  $ <span aria-label=\"Blank for question 11\" class=\"listening-answer-blank\" data-question=\"11\" role=\"img\"><span class=\"listening-answer-number\">(11)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"12\" role=\"listitem\">Children ages 5—12 All-Day Pass:  $ <span aria-label=\"Blank for question 12\" class=\"listening-answer-blank\" data-question=\"12\" role=\"img\"><span class=\"listening-answer-number\">(12)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div><p>Children under age 5: Free</p></section><section class=\"listening-source-group\" data-question-start=\"13\" data-question-end=\"15\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 13-15</p><p class=\"listening-source-instruction\">Complete the information below. Write NO MORE THAN TWO WORDS.</p></header><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\">Starting point: Tour Bus Office</p><div class=\"listening-source-question-row\" data-question-row=\"13\" role=\"listitem\">First stop:  <span aria-label=\"Blank for question 13\" class=\"listening-answer-blank\" data-question=\"13\" role=\"img\"><span class=\"listening-answer-number\">(13)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-support-row\">Second stop: Fishing Docks</div><div class=\"listening-source-question-row\" data-question-row=\"14\" role=\"listitem\">Third Stop:  <span aria-label=\"Blank for question 14\" class=\"listening-answer-blank\" data-question=\"14\" role=\"img\"><span class=\"listening-answer-number\">(14)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-support-row\">Fourth Stop: Shopping District</div><div class=\"listening-source-question-row\" data-question-row=\"15\" role=\"listitem\">Fifth Stop:  <span aria-label=\"Blank for question 15\" class=\"listening-answer-blank\" data-question=\"15\" role=\"img\"><span class=\"listening-answer-number\">(15)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section><section class=\"listening-source-group\" data-question-start=\"16\" data-question-end=\"20\" data-question-type=\"table-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 16-20</p><p class=\"listening-source-instruction\">Complete the chart below. Write NO MORE THAN ONE WORD for each answer.</p></header><figure class=\"listening-source-table\"><table><tbody><tr><td><strong>Place</strong></td><td><strong>Activity</strong></td></tr><tr><td>First stop</td><td>Enjoy the <span aria-label=\"Blank for question 16\" class=\"listening-answer-blank\" data-question=\"16\" role=\"img\"><span class=\"listening-answer-number\">(16)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>of the bay</td></tr><tr><td>Second stop</td><td>Look at the <span aria-label=\"Blank for question 17\" class=\"listening-answer-blank\" data-question=\"17\" role=\"img\"><span class=\"listening-answer-number\">(17)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Third stop</td><td><span aria-label=\"Blank for question 18\" class=\"listening-answer-blank\" data-question=\"18\" role=\"img\"><span class=\"listening-answer-number\">(18)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>fish</td></tr><tr><td>Fourth stop</td><td>Purchase <span aria-label=\"Blank for question 19\" class=\"listening-answer-blank\" data-question=\"19\" role=\"img\"><span class=\"listening-answer-number\">(19)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Fifth stop</td><td>Visit the <span aria-label=\"Blank for question 20\" class=\"listening-answer-blank\" data-question=\"20\" role=\"img\"><span class=\"listening-answer-number\">(20)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr></tbody></table></figure></section>"
      },
      "groups": [
        {
          "title": "Questions 11-12",
          "type": "sentence-completion",
          "instructionHtml": "Complete the information below. Write ONE NUMBER for each answer.",
          "questions": [
            {
              "id": "q11",
              "textHtml": "Question 11",
              "answer": "18"
            },
            {
              "id": "q12",
              "textHtml": "Question 12",
              "answer": "9"
            }
          ]
        },
        {
          "title": "Questions 13-15",
          "type": "sentence-completion",
          "instructionHtml": "Complete the information below. Write NO MORE THAN TWO WORDS.",
          "questions": [
            {
              "id": "q13",
              "textHtml": "Question 13",
              "answer": "hill park"
            },
            {
              "id": "q14",
              "textHtml": "Question 14",
              "answer": "bay bridge"
            },
            {
              "id": "q15",
              "textHtml": "Question 15",
              "answer": "green street"
            }
          ],
          "wordLimit": 2
        },
        {
          "title": "Questions 16-20",
          "type": "table-completion",
          "instructionHtml": "Complete the chart below. Write NO MORE THAN ONE WORD for each answer.",
          "questions": [
            {
              "id": "q16",
              "textHtml": "Question 16",
              "answer": "view"
            },
            {
              "id": "q17",
              "textHtml": "Question 17",
              "answer": "boats"
            },
            {
              "id": "q18",
              "textHtml": "Question 18",
              "answer": "eat"
            },
            {
              "id": "q19",
              "textHtml": "Question 19",
              "answer": "baskets"
            },
            {
              "id": "q20",
              "textHtml": "Question 20",
              "answer": "theatre"
            }
          ],
          "wordLimit": 1
        }
      ]
    },
    {
      "label": "Section 3",
      "stimulus": {
        "kind": "audio",
        "label": "Section 3",
        "src": "/audio/listening/test-010.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"21\" data-question-end=\"23\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 21-23</p><p class=\"listening-source-instruction\">Answer the questions below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.</p></header><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"21\" role=\"listitem\">When is the research project due? <span aria-label=\"Blank for question 21\" class=\"listening-answer-blank\" data-question=\"21\" role=\"img\"><span class=\"listening-answer-number\">(21)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"22\" role=\"listitem\">Where will the students conduct the interviews? <span aria-label=\"Blank for question 22\" class=\"listening-answer-blank\" data-question=\"22\" role=\"img\"><span class=\"listening-answer-number\">(22)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"23\" role=\"listitem\">How many interviews will they complete all together? <span aria-label=\"Blank for question 23\" class=\"listening-answer-blank\" data-question=\"23\" role=\"img\"><span class=\"listening-answer-number\">(23)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section><section class=\"listening-source-group\" data-question-start=\"24\" data-question-end=\"30\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 24-30</p><p class=\"listening-source-instruction\">Complete the outline below. Write NO MORE THAN THREE WORDS for each answer.</p></header><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"24\" role=\"listitem\">A. Read  <span aria-label=\"Blank for question 24\" class=\"listening-answer-blank\" data-question=\"24\" role=\"img\"><span class=\"listening-answer-number\">(24)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"25\" role=\"listitem\">B.  <span aria-label=\"Blank for question 25\" class=\"listening-answer-blank\" data-question=\"25\" role=\"img\"><span class=\"listening-answer-number\">(25)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"26\" role=\"listitem\">C. Get  <span aria-label=\"Blank for question 26\" class=\"listening-answer-blank\" data-question=\"26\" role=\"img\"><span class=\"listening-answer-number\">(26)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"27\" role=\"listitem\">D.  <span aria-label=\"Blank for question 27\" class=\"listening-answer-blank\" data-question=\"27\" role=\"img\"><span class=\"listening-answer-number\">(27)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"28\" role=\"listitem\">E. Get together to  <span aria-label=\"Blank for question 28\" class=\"listening-answer-blank\" data-question=\"28\" role=\"img\"><span class=\"listening-answer-number\">(28)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"29\" role=\"listitem\">F. Prepare  <span aria-label=\"Blank for question 29\" class=\"listening-answer-blank\" data-question=\"29\" role=\"img\"><span class=\"listening-answer-number\">(29)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"30\" role=\"listitem\">G. Give  <span aria-label=\"Blank for question 30\" class=\"listening-answer-blank\" data-question=\"30\" role=\"img\"><span class=\"listening-answer-number\">(30)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section>"
      },
      "groups": [
        {
          "title": "Questions 21-23",
          "type": "sentence-completion",
          "instructionHtml": "Answer the questions below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q21",
              "textHtml": "When is the research project due?",
              "answer": "in three weeks"
            },
            {
              "id": "q22",
              "textHtml": "Where will the students conduct the interviews?",
              "answer": "a shopping mall"
            },
            {
              "id": "q23",
              "textHtml": "How many interviews will they complete all together?",
              "answer": "thirty"
            }
          ],
          "wordLimit": 3
        },
        {
          "title": "Questions 24-30",
          "type": "sentence-completion",
          "instructionHtml": "Complete the outline below. Write NO MORE THAN THREE WORDS for each answer.",
          "questions": [
            {
              "id": "q24",
              "textHtml": "Question 24",
              "answer": "a government study"
            },
            {
              "id": "q25",
              "textHtml": "Question 25",
              "answer": "design the questionnaire"
            },
            {
              "id": "q26",
              "textHtml": "Question 26",
              "answer": "professor's approval"
            },
            {
              "id": "q27",
              "textHtml": "Question 27",
              "answer": "conduct interviews"
            },
            {
              "id": "q28",
              "textHtml": "Question 28",
              "answer": "analyse the results"
            },
            {
              "id": "q29",
              "textHtml": "Question 29",
              "answer": "charts"
            },
            {
              "id": "q30",
              "textHtml": "Question 30",
              "answer": "class presentation"
            }
          ],
          "wordLimit": 3
        }
      ]
    },
    {
      "label": "Section 4",
      "stimulus": {
        "kind": "audio",
        "label": "Section 4",
        "src": "/audio/listening/test-010.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"31\" data-question-end=\"40\" data-question-type=\"table-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 31-40</p><p class=\"listening-source-instruction\">Complete the timeline below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.</p></header><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"31\" role=\"listitem\">1832  <span aria-label=\"Blank for question 31\" class=\"listening-answer-blank\" data-question=\"31\" role=\"img\"><span class=\"listening-answer-number\">(31)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"32\" role=\"listitem\">In her teens Alcott worked to  <span aria-label=\"Blank for question 32\" class=\"listening-answer-blank\" data-question=\"32\" role=\"img\"><span class=\"listening-answer-number\">(32)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"33\" role=\"listitem\">At age 17 Alcott wrote  <span aria-label=\"Blank for question 33\" class=\"listening-answer-blank\" data-question=\"33\" role=\"img\"><span class=\"listening-answer-number\">(33)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"34\" role=\"listitem\"><span aria-label=\"Blank for question 34\" class=\"listening-answer-blank\" data-question=\"34\" role=\"img\"><span class=\"listening-answer-number\">(34)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> Alcott enlisted as an army nurse.</div><div class=\"listening-source-question-row\" data-question-row=\"35\" role=\"listitem\"><span aria-label=\"Blank for question 35\" class=\"listening-answer-blank\" data-question=\"35\" role=\"img\"><span class=\"listening-answer-number\">(35)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> Alcott published her letters in a book called Hospital Sketches.</div><div class=\"listening-source-question-row\" data-question-row=\"36\" role=\"listitem\"><span aria-label=\"Blank for question 36\" class=\"listening-answer-blank\" data-question=\"36\" role=\"img\"><span class=\"listening-answer-number\">(36)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> Alcott returned from her trip to Europe.</div><div class=\"listening-source-question-row\" data-question-row=\"37\" role=\"listitem\"><span aria-label=\"Blank for question 37\" class=\"listening-answer-blank\" data-question=\"37\" role=\"img\"><span class=\"listening-answer-number\">(37)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> Alcott published Little Women.</div><div class=\"listening-source-question-row\" data-question-row=\"38\" role=\"listitem\">1879  <span aria-label=\"Blank for question 38\" class=\"listening-answer-blank\" data-question=\"38\" role=\"img\"><span class=\"listening-answer-number\">(38)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> died.</div><div class=\"listening-source-question-row\" data-question-row=\"39\" role=\"listitem\"><span aria-label=\"Blank for question 39\" class=\"listening-answer-blank\" data-question=\"39\" role=\"img\"><span class=\"listening-answer-number\">(39)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> Alcott set up a home for her family in Boston.</div><div class=\"listening-source-question-row\" data-question-row=\"40\" role=\"listitem\">1888  <span aria-label=\"Blank for question 40\" class=\"listening-answer-blank\" data-question=\"40\" role=\"img\"><span class=\"listening-answer-number\">(40)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section>"
      },
      "groups": [
        {
          "title": "Questions 31-40",
          "type": "table-completion",
          "instructionHtml": "Complete the timeline below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q31",
              "textHtml": "Question 31",
              "answer": "Alcott was born"
            },
            {
              "id": "q32",
              "textHtml": "Question 32",
              "answer": "support her family"
            },
            {
              "id": "q33",
              "textHtml": "Question 33",
              "answer": "her first novel"
            },
            {
              "id": "q34",
              "textHtml": "Question 34",
              "answer": "1862"
            },
            {
              "id": "q35",
              "textHtml": "Question 35",
              "answer": "after the war"
            },
            {
              "id": "q36",
              "textHtml": "Question 36",
              "answer": "1866"
            },
            {
              "id": "q37",
              "textHtml": "Question 37",
              "answer": "1868"
            },
            {
              "id": "q38",
              "textHtml": "Question 38",
              "answer": "May"
            },
            {
              "id": "q39",
              "textHtml": "Question 39",
              "answer": "1882"
            },
            {
              "id": "q40",
              "textHtml": "Question 40",
              "answer": "Alcott died"
            }
          ],
          "wordLimit": 3
        }
      ]
    }
  ]
};
