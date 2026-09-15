import type { PracticeTest } from '../../lib/tests/schema';

export const listeningFull025: PracticeTest = {
  "id": "listening-full-025",
  "skill": "listening",
  "title": "IELTS Listening Test 25",
  "description": "A full IELTS Listening practice test shared with permission by PracticePTEOnline.",
  "durationMinutes": 40,
  "audioSrc": "/audio/listening/test-025.mp3",
  "source": {
    "name": "PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-listening-test-25/",
    "permission": "Reused with permission from the publisher."
  },
  "parts": [
    {
      "label": "Section 1",
      "stimulus": {
        "kind": "audio",
        "label": "Section 1",
        "src": "/audio/listening/test-025.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"1\" data-question-end=\"7\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 1-7</p><p class=\"listening-source-instruction\">Complete the form below. Write NO MORE THAN TWO WORDS OR A NUMBER for each answer.</p></header><p><span><strong>Go-travel booking form</strong></span></p><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"1\" role=\"listitem\"><span>Name:  <span aria-label=\"Blank for question 1\" class=\"listening-answer-blank\" data-question=\"1\" role=\"img\"><span class=\"listening-answer-number\">(1)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"2\" role=\"listitem\"><span>Source of enquiry: saw ad in  <span aria-label=\"Blank for question 2\" class=\"listening-answer-blank\" data-question=\"2\" role=\"img\"><span class=\"listening-answer-number\">(2)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> magazine</span></div><div class=\"listening-source-question-row\" data-question-row=\"3\" role=\"listitem\"><span>Holiday reference:  <span aria-label=\"Blank for question 3\" class=\"listening-answer-blank\" data-question=\"3\" role=\"img\"><span class=\"listening-answer-number\">(3)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"4\" role=\"listitem\"><span>Number of people:  <span aria-label=\"Blank for question 4\" class=\"listening-answer-blank\" data-question=\"4\" role=\"img\"><span class=\"listening-answer-number\">(4)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"5\" role=\"listitem\"><span>Preferred departure dates:  <span aria-label=\"Blank for question 5\" class=\"listening-answer-blank\" data-question=\"5\" role=\"img\"><span class=\"listening-answer-number\">(5)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"6\" role=\"listitem\"><span>Number of nights:  <span aria-label=\"Blank for question 6\" class=\"listening-answer-blank\" data-question=\"6\" role=\"img\"><span class=\"listening-answer-number\">(6)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"7\" role=\"listitem\"><span>Type of insurance:  <span aria-label=\"Blank for question 7\" class=\"listening-answer-blank\" data-question=\"7\" role=\"img\"><span class=\"listening-answer-number\">(7)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div></div></section><section class=\"listening-source-group\" data-question-start=\"8\" data-question-end=\"10\" data-question-type=\"multiple-answer\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 8-10</p><p class=\"listening-source-instruction\">Choose THREE letters A-H.</p></header><p><span>Which <strong>THREE</strong> options does the woman want to book?</span></p><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>arts demonstration</dd></div><div><dt>B</dt><dd>dance show</dd></div><div><dt>C</dt><dd>museums trip</dd></div><div><dt>D</dt><dd>bus tour at night</dd></div><div><dt>E</dt><dd>picnic lunches</dd></div><div><dt>F</dt><dd>river trip</dd></div><div><dt>G</dt><dd>room with balcony</dd></div><div><dt>H</dt><dd>trip to mountains</dd></div></dl></section>"
      },
      "groups": [
        {
          "title": "Questions 1-7",
          "type": "sentence-completion",
          "instructionHtml": "Complete the form below. Write NO MORE THAN TWO WORDS OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q1",
              "textHtml": "Question 1",
              "answer": "Anna Grieves"
            },
            {
              "id": "q2",
              "textHtml": "Question 2",
              "answer": "holiday world"
            },
            {
              "id": "q3",
              "textHtml": "Question 3",
              "answer": "FT4551"
            },
            {
              "id": "q4",
              "textHtml": "Question 4",
              "answer": "3"
            },
            {
              "id": "q5",
              "textHtml": "Question 5",
              "answer": "16 August"
            },
            {
              "id": "q6",
              "textHtml": "Question 6",
              "answer": "11"
            },
            {
              "id": "q7",
              "textHtml": "Question 7",
              "answer": "super"
            }
          ],
          "wordLimit": 2
        },
        {
          "title": "Questions 8-10",
          "type": "multiple-answer",
          "instructionHtml": "Choose THREE letters A-H.",
          "questions": [
            {
              "id": "q8",
              "textHtml": "Question 8",
              "answer": [
                "G",
                "A",
                "F"
              ],
              "answerPairId": "test25-q8-q10"
            },
            {
              "id": "q9",
              "textHtml": "Question 9",
              "answer": [
                "G",
                "A",
                "F"
              ],
              "answerPairId": "test25-q8-q10"
            },
            {
              "id": "q10",
              "textHtml": "Question 10",
              "answer": [
                "G",
                "A",
                "F"
              ],
              "answerPairId": "test25-q8-q10"
            }
          ],
          "choices": [
            {
              "value": "A",
              "label": "arts demonstration"
            },
            {
              "value": "B",
              "label": "dance show"
            },
            {
              "value": "C",
              "label": "museums trip"
            },
            {
              "value": "D",
              "label": "bus tour at night"
            },
            {
              "value": "E",
              "label": "picnic lunches"
            },
            {
              "value": "F",
              "label": "river trip"
            },
            {
              "value": "G",
              "label": "room with balcony"
            },
            {
              "value": "H",
              "label": "trip to mountains"
            }
          ],
          "selectCount": 3
        }
      ]
    },
    {
      "label": "Section 2",
      "stimulus": {
        "kind": "audio",
        "label": "Section 2",
        "src": "/audio/listening/test-025.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"11\" data-question-end=\"17\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 11-17</p><p class=\"listening-source-instruction\">Complete the notes below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.</p></header><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\"><span><strong>Run-well charity</strong></span></p><p class=\"listening-source-title\"><span>Background to Run-Well charity</span></p><div class=\"listening-source-question-row\" data-question-row=\"11\" role=\"listitem\"><span>• Set up in  <span aria-label=\"Blank for question 11\" class=\"listening-answer-blank\" data-question=\"11\" role=\"img\"><span class=\"listening-answer-number\">(11)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"12\" role=\"listitem\"><span>• Aim: raise money for the  <span aria-label=\"Blank for question 12\" class=\"listening-answer-blank\" data-question=\"12\" role=\"img\"><span class=\"listening-answer-number\">(12)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div></div><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\"><span>Race details</span></p><div class=\"listening-source-question-row\" data-question-row=\"13\" role=\"listitem\"><span>• Teams to supply own  <span aria-label=\"Blank for question 13\" class=\"listening-answer-blank\" data-question=\"13\" role=\"img\"><span class=\"listening-answer-number\">(13)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"14\" role=\"listitem\"><span>• Teams should  <span aria-label=\"Blank for question 14\" class=\"listening-answer-blank\" data-question=\"14\" role=\"img\"><span class=\"listening-answer-number\">(14)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> together</span></div><div class=\"listening-source-question-row\" data-question-row=\"15\" role=\"listitem\"><span>• Important to bring enough  <span aria-label=\"Blank for question 15\" class=\"listening-answer-blank\" data-question=\"15\" role=\"img\"><span class=\"listening-answer-number\">(15)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"16\" role=\"listitem\"><span>• Race will finish in the  <span aria-label=\"Blank for question 16\" class=\"listening-answer-blank\" data-question=\"16\" role=\"img\"><span class=\"listening-answer-number\">(16)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"17\" role=\"listitem\"><span>• Prizes given by the  <span aria-label=\"Blank for question 17\" class=\"listening-answer-blank\" data-question=\"17\" role=\"img\"><span class=\"listening-answer-number\">(17)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div></div></section><section class=\"listening-source-group\" data-question-start=\"18\" data-question-end=\"20\" data-question-type=\"multiple-answer\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 18-20</p><p class=\"listening-source-instruction\">Choose THREE letters A-H.</p></header><p><span>Which <strong>THREE</strong> ways of raising money for the charity are recommended?</span></p><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>badges</dd></div><div><dt>B</dt><dd>bread and cake stall</dd></div><div><dt>C</dt><dd>swimming event</dd></div><div><dt>D</dt><dd>concert</dd></div><div><dt>E</dt><dd>door to door collecting</dd></div><div><dt>F</dt><dd>picnic</dd></div><div><dt>G</dt><dd>postcards</dd></div><div><dt>H</dt><dd>quiz</dd></div><div><dt>I</dt><dd>second hand sale</dd></div></dl><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"18\" role=\"listitem\"><span> <span aria-label=\"Blank for question 18\" class=\"listening-answer-blank\" data-question=\"18\" role=\"img\"><span class=\"listening-answer-number\">(18)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"19\" role=\"listitem\"><span> <span aria-label=\"Blank for question 19\" class=\"listening-answer-blank\" data-question=\"19\" role=\"img\"><span class=\"listening-answer-number\">(19)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"20\" role=\"listitem\"><span> <span aria-label=\"Blank for question 20\" class=\"listening-answer-blank\" data-question=\"20\" role=\"img\"><span class=\"listening-answer-number\">(20)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div></div></section>"
      },
      "groups": [
        {
          "title": "Questions 11-17",
          "type": "sentence-completion",
          "instructionHtml": "Complete the notes below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.",
          "questions": [
            {
              "id": "q11",
              "textHtml": "Question 11",
              "answer": "1992"
            },
            {
              "id": "q12",
              "textHtml": "Question 12",
              "answer": "hospital"
            },
            {
              "id": "q13",
              "textHtml": "Question 13",
              "answer": "numbers"
            },
            {
              "id": "q14",
              "textHtml": "Question 14",
              "answer": "train"
            },
            {
              "id": "q15",
              "textHtml": "Question 15",
              "answer": "food and drink"
            },
            {
              "id": "q16",
              "textHtml": "Question 16",
              "answer": "main square"
            },
            {
              "id": "q17",
              "textHtml": "Question 17",
              "answer": "minister for health"
            }
          ],
          "wordLimit": 3
        },
        {
          "title": "Questions 18-20",
          "type": "multiple-answer",
          "instructionHtml": "Choose THREE letters A-H.",
          "questions": [
            {
              "id": "q18",
              "textHtml": "Question 18",
              "answer": [
                "C",
                "A",
                "H"
              ],
              "answerPairId": "test25-q18-q20"
            },
            {
              "id": "q19",
              "textHtml": "Question 19",
              "answer": [
                "C",
                "A",
                "H"
              ],
              "answerPairId": "test25-q18-q20"
            },
            {
              "id": "q20",
              "textHtml": "Question 20",
              "answer": [
                "C",
                "A",
                "H"
              ],
              "answerPairId": "test25-q18-q20"
            }
          ],
          "choices": [
            {
              "value": "A",
              "label": "badges"
            },
            {
              "value": "B",
              "label": "bread and cake stall"
            },
            {
              "value": "C",
              "label": "swimming event"
            },
            {
              "value": "D",
              "label": "concert"
            },
            {
              "value": "E",
              "label": "door to door collecting"
            },
            {
              "value": "F",
              "label": "picnic"
            },
            {
              "value": "G",
              "label": "postcards"
            },
            {
              "value": "H",
              "label": "quiz"
            },
            {
              "value": "I",
              "label": "second hand sale"
            }
          ],
          "selectCount": 3
        }
      ]
    },
    {
      "label": "Section 3",
      "stimulus": {
        "kind": "audio",
        "label": "Section 3",
        "src": "/audio/listening/test-025.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"21\" data-question-end=\"26\" data-question-type=\"categorisation\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 21-26</p><p class=\"listening-source-instruction\">What do the students decide about each topic for Joe&#x27;s presentation? Write the correct letter A, B or C next to questions 21-26.</p></header><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>Joe will definitely include this topic</dd></div><div><dt>B</dt><dd>Joe might include this topic</dd></div><div><dt>C</dt><dd>Joe will not include this topic</dd></div></dl><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"21\" role=\"listitem\"><span>21. cultural aspects of naming people <span aria-label=\"Blank for question 21\" class=\"listening-answer-blank\" data-question=\"21\" role=\"img\"><span class=\"listening-answer-number\">(21)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"22\" role=\"listitem\"><span>22. similarities across languages in naming practices <span aria-label=\"Blank for question 22\" class=\"listening-answer-blank\" data-question=\"22\" role=\"img\"><span class=\"listening-answer-number\">(22)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"23\" role=\"listitem\"><span>23. meanings of first names <span aria-label=\"Blank for question 23\" class=\"listening-answer-blank\" data-question=\"23\" role=\"img\"><span class=\"listening-answer-number\">(23)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"24\" role=\"listitem\"><span>24. place names describing geographic features <span aria-label=\"Blank for question 24\" class=\"listening-answer-blank\" data-question=\"24\" role=\"img\"><span class=\"listening-answer-number\">(24)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"25\" role=\"listitem\"><span>25. influence of immigration on place names <span aria-label=\"Blank for question 25\" class=\"listening-answer-blank\" data-question=\"25\" role=\"img\"><span class=\"listening-answer-number\">(25)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"26\" role=\"listitem\"><span>26. origins of names of countries <span aria-label=\"Blank for question 26\" class=\"listening-answer-blank\" data-question=\"26\" role=\"img\"><span class=\"listening-answer-number\">(26)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div></div></section><section class=\"listening-source-group\" data-question-start=\"27\" data-question-end=\"30\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 27-30</p><p class=\"listening-source-instruction\">Complete the summary below. Write NO MORE THAN TWO WORDS for each answer.</p></header><p><span>Researchers showed a group of students many common nouns, brand names and  <span aria-label=\"Blank for question 27\" class=\"listening-answer-blank\" data-question=\"27\" role=\"img\"><span class=\"listening-answer-number\">(27)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> Students found it easier to identify brand names when they were shown in  <span aria-label=\"Blank for question 28\" class=\"listening-answer-blank\" data-question=\"28\" role=\"img\"><span class=\"listening-answer-number\">(28)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> Researchers think that  <span aria-label=\"Blank for question 29\" class=\"listening-answer-blank\" data-question=\"29\" role=\"img\"><span class=\"listening-answer-number\">(29)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> is important in making brand names special within the brain. Brand names create a number of  <span aria-label=\"Blank for question 30\" class=\"listening-answer-blank\" data-question=\"30\" role=\"img\"><span class=\"listening-answer-number\">(30)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> within the brain.</span></p></section>"
      },
      "groups": [
        {
          "title": "Questions 21-26",
          "type": "categorisation",
          "instructionHtml": "What do the students decide about each topic for Joe&#x27;s presentation? Write the correct letter A, B or C next to questions 21-26.",
          "questions": [
            {
              "id": "q21",
              "textHtml": "cultural aspects of naming people",
              "answer": "A"
            },
            {
              "id": "q22",
              "textHtml": "similarities across languages in naming practices",
              "answer": "B"
            },
            {
              "id": "q23",
              "textHtml": "meanings of first names",
              "answer": "A"
            },
            {
              "id": "q24",
              "textHtml": "place names describing geographic features",
              "answer": "C"
            },
            {
              "id": "q25",
              "textHtml": "influence of immigration on place names",
              "answer": "B"
            },
            {
              "id": "q26",
              "textHtml": "origins of names of countries",
              "answer": "A"
            }
          ]
        },
        {
          "title": "Questions 27-30",
          "type": "sentence-completion",
          "instructionHtml": "Complete the summary below. Write NO MORE THAN TWO WORDS for each answer.",
          "questions": [
            {
              "id": "q27",
              "textHtml": "Question 27",
              "answer": "meaningless words"
            },
            {
              "id": "q28",
              "textHtml": "Question 28",
              "answer": "capital letters"
            },
            {
              "id": "q29",
              "textHtml": "Question 29",
              "answer": "color"
            },
            {
              "id": "q30",
              "textHtml": "Question 30",
              "answer": "associations"
            }
          ],
          "wordLimit": 2
        }
      ]
    },
    {
      "label": "Section 4",
      "stimulus": {
        "kind": "audio",
        "label": "Section 4",
        "src": "/audio/listening/test-025.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"31\" data-question-end=\"40\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 31-40</p><p class=\"listening-source-instruction\">Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.</p></header><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\"><span><strong>Gas balloons</strong></span></p><p class=\"listening-source-title\"><span>Uses:</span></p><div class=\"listening-source-question-row\" data-question-row=\"31\" role=\"listitem\"><span>• Instead of  <span aria-label=\"Blank for question 31\" class=\"listening-answer-blank\" data-question=\"31\" role=\"img\"><span class=\"listening-answer-number\">(31)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> in the US civil war</span></div><div class=\"listening-source-question-row\" data-question-row=\"32\" role=\"listitem\"><span>• To make  <span aria-label=\"Blank for question 32\" class=\"listening-answer-blank\" data-question=\"32\" role=\"img\"><span class=\"listening-answer-number\">(32)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"33\" role=\"listitem\"><span>• To  <span aria-label=\"Blank for question 33\" class=\"listening-answer-blank\" data-question=\"33\" role=\"img\"><span class=\"listening-answer-number\">(33)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> for research</span></div><div class=\"listening-source-question-row\" data-question-row=\"34\" role=\"listitem\"><span>• As part of studies of  <span aria-label=\"Blank for question 34\" class=\"listening-answer-blank\" data-question=\"34\" role=\"img\"><span class=\"listening-answer-number\">(34)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div></div><div class=\"listening-source-note-block\"><div class=\"listening-source-note-row\"><span><strong>Hot air balloons</strong></span></div><div class=\"listening-source-note-row\"><span>Create less  <span aria-label=\"Blank for question 35\" class=\"listening-answer-blank\" data-question=\"35\" role=\"img\"><span class=\"listening-answer-number\">(35)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> than gas balloons</span></div></div><div class=\"listening-source-note-block\"><div class=\"listening-source-note-row\"><span><strong>Airships</strong></span></div><div class=\"listening-source-note-row\"><span>Early examples had no  <span aria-label=\"Blank for question 36\" class=\"listening-answer-blank\" data-question=\"36\" role=\"img\"><span class=\"listening-answer-number\">(36)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> for crew</span></div></div><p><span>To be efficient needed a  <span aria-label=\"Blank for question 37\" class=\"listening-answer-blank\" data-question=\"37\" role=\"img\"><span class=\"listening-answer-number\">(37)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></p><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\"><span>Development of large airships stopped because of:</span></p><div class=\"listening-source-question-row\" data-question-row=\"38\" role=\"listitem\"><span>• Success of  <span aria-label=\"Blank for question 38\" class=\"listening-answer-blank\" data-question=\"38\" role=\"img\"><span class=\"listening-answer-number\">(38)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div><div class=\"listening-source-question-row\" data-question-row=\"39\" role=\"listitem\"><span>• Series of  <span aria-label=\"Blank for question 39\" class=\"listening-answer-blank\" data-question=\"39\" role=\"img\"><span class=\"listening-answer-number\">(39)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></div></div><p><span>Recent interest in use for carrying  <span aria-label=\"Blank for question 40\" class=\"listening-answer-blank\" data-question=\"40\" role=\"img\"><span class=\"listening-answer-number\">(40)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></span></p></section>"
      },
      "groups": [
        {
          "title": "Questions 31-40",
          "type": "sentence-completion",
          "instructionHtml": "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.",
          "questions": [
            {
              "id": "q31",
              "textHtml": "Question 31",
              "answer": "spies"
            },
            {
              "id": "q32",
              "textHtml": "Question 32",
              "answer": "maps"
            },
            {
              "id": "q33",
              "textHtml": "Question 33",
              "answer": "collect data"
            },
            {
              "id": "q34",
              "textHtml": "Question 34",
              "answer": "climate"
            },
            {
              "id": "q35",
              "textHtml": "Question 35",
              "answer": "lift"
            },
            {
              "id": "q36",
              "textHtml": "Question 36",
              "answer": "weather protection"
            },
            {
              "id": "q37",
              "textHtml": "Question 37",
              "answer": "framework"
            },
            {
              "id": "q38",
              "textHtml": "Question 38",
              "answer": "airlines"
            },
            {
              "id": "q39",
              "textHtml": "Question 39",
              "answer": "crashes"
            },
            {
              "id": "q40",
              "textHtml": "Question 40",
              "answer": "cargo"
            }
          ],
          "wordLimit": 2
        }
      ]
    }
  ]
};
