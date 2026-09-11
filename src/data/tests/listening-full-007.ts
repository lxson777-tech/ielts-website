import type { PracticeTest } from '../../lib/tests/schema';

export const listeningFull007: PracticeTest = {
  "id": "listening-full-007",
  "skill": "listening",
  "title": "IELTS Listening Test 7",
  "description": "A full IELTS Listening practice test shared with permission by PracticePTEOnline.",
  "durationMinutes": 40,
  "audioSrc": "/audio/listening/test-007.mp3",
  "source": {
    "name": "PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-listening-test-7/",
    "permission": "Reused with permission from the publisher."
  },
  "parts": [
    {
      "label": "Section 1",
      "stimulus": {
        "kind": "audio",
        "label": "Section 1",
        "src": "/audio/listening/test-007.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"1\" data-question-end=\"2\" data-question-type=\"multiple-choice\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 1-2</p><p class=\"listening-source-instruction\">Choose the correct letter A, B or C.</p></header><article class=\"listening-source-question\" data-question=\"1\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">1</span>In the lobby of the library George saw</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>a group playing music</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>a display of instruments</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>a video about the festival</span></li></ol></article><article class=\"listening-source-question\" data-question=\"2\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">2</span>George wants to sit at the back so they can</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>see well</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>hear clearly</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>pay less</span></li></ol></article><p><strong>Summer music festival booking form</strong></p><p>Name: Goerge O’Neill</p></section><section class=\"listening-source-group\" data-question-start=\"3\" data-question-end=\"10\" data-question-type=\"table-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 3-10</p><p class=\"listening-source-instruction\">Complete the form below. Write NO MORE THAN TWO WORDS OR A NUMBER.</p></header><p>Address: <span aria-label=\"Blank for question 3\" class=\"listening-answer-blank\" data-question=\"3\" role=\"img\"><span class=\"listening-answer-number\">(3)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>Westsea</p><p>Postcode: <span aria-label=\"Blank for question 4\" class=\"listening-answer-blank\" data-question=\"4\" role=\"img\"><span class=\"listening-answer-number\">(4)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></p><p>Telephone: <span aria-label=\"Blank for question 5\" class=\"listening-answer-blank\" data-question=\"5\" role=\"img\"><span class=\"listening-answer-number\">(5)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></p><figure class=\"listening-source-table\"><table><tbody><tr><td><strong>Date</strong></td><td><strong>Event</strong></td><td><strong>Price per ticket</strong></td><td><strong>No. of tickets</strong></td></tr><tr><td>5 June</td><td>Instrumental Group – Guitarinni</td><td>£ 7.50</td><td>2</td></tr><tr><td>17 June</td><td>Singer (price includes <span aria-label=\"Blank for question 6\" class=\"listening-answer-blank\" data-question=\"6\" role=\"img\"><span class=\"listening-answer-number\">(6)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>in the garden</td><td>£ 6</td><td>2</td></tr><tr><td>22 June</td><td><span aria-label=\"Blank for question 7\" class=\"listening-answer-blank\" data-question=\"7\" role=\"img\"><span class=\"listening-answer-number\">(7)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>Anna Ventura</td><td>£ 7</td><td>1</td></tr><tr><td>23 June</td><td>Spanish dance and guitar concert</td><td><span aria-label=\"Blank for question 8\" class=\"listening-answer-blank\" data-question=\"8\" role=\"img\"><span class=\"listening-answer-number\">(8)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> £ </td><td><span aria-label=\"Blank for question 9\" class=\"listening-answer-blank\" data-question=\"9\" role=\"img\"><span class=\"listening-answer-number\">(9)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr></tbody></table><figcaption></figcaption></figure><p><strong>NB:</strong> Children/ students/ senior citizens have <span aria-label=\"Blank for question 10\" class=\"listening-answer-blank\" data-question=\"10\" role=\"img\"><span class=\"listening-answer-number\">(10)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>discount on all tickets</p></section>"
      },
      "groups": [
        {
          "title": "Questions 1-2",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A, B or C.",
          "questions": [
            {
              "id": "q1",
              "textHtml": "In the lobby of the library George saw",
              "answer": "C",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q2",
              "textHtml": "George wants to sit at the back so they can",
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
          "title": "Questions 3-10",
          "type": "table-completion",
          "instructionHtml": "Complete the form below. Write NO MORE THAN TWO WORDS OR A NUMBER.",
          "questions": [
            {
              "id": "q3",
              "textHtml": "Question 3",
              "answer": "48 north avenue"
            },
            {
              "id": "q4",
              "textHtml": "Question 4",
              "answer": "WS62YH"
            },
            {
              "id": "q5",
              "textHtml": "Question 5",
              "answer": "01674553242"
            },
            {
              "id": "q6",
              "textHtml": "Question 6",
              "answer": [
                "drinks",
                "refreshments"
              ]
            },
            {
              "id": "q7",
              "textHtml": "Question 7",
              "answer": [
                "pianist",
                "piano player"
              ]
            },
            {
              "id": "q8",
              "textHtml": "Question 8",
              "answer": "10.50"
            },
            {
              "id": "q9",
              "textHtml": "Question 9",
              "answer": "4"
            },
            {
              "id": "q10",
              "textHtml": "Question 10",
              "answer": "50%"
            }
          ],
          "wordLimit": 2
        }
      ]
    },
    {
      "label": "Section 2",
      "stimulus": {
        "kind": "audio",
        "label": "Section 2",
        "src": "/audio/listening/test-007.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"11\" data-question-end=\"15\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 11-15</p><p class=\"listening-source-instruction\">Complete the sentences below. Write NO MORE THAN TWO WORDS OR A NUMBER.</p></header><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\"><strong>THE DINOSAUR MUSEUM</strong></p><div class=\"listening-source-question-row\" data-question-row=\"11\" role=\"listitem\">The museum closes at <span aria-label=\"Blank for question 11\" class=\"listening-answer-blank\" data-question=\"11\" role=\"img\"><span class=\"listening-answer-number\">(11)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> p.m. on Mondays.</div><div class=\"listening-source-question-row\" data-question-row=\"12\" role=\"listitem\">The museum is not open on <span aria-label=\"Blank for question 12\" class=\"listening-answer-blank\" data-question=\"12\" role=\"img\"><span class=\"listening-answer-number\">(12)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"13\" role=\"listitem\">School groups are met by tour guides in the <span aria-label=\"Blank for question 13\" class=\"listening-answer-blank\" data-question=\"13\" role=\"img\"><span class=\"listening-answer-number\">(13)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"14\" role=\"listitem\">The whole visit takes 90 minutes, including <span aria-label=\"Blank for question 14\" class=\"listening-answer-blank\" data-question=\"14\" role=\"img\"><span class=\"listening-answer-number\">(14)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> minutes for the guided tour.</div><div class=\"listening-source-question-row\" data-question-row=\"15\" role=\"listitem\">There are <span aria-label=\"Blank for question 15\" class=\"listening-answer-blank\" data-question=\"15\" role=\"img\"><span class=\"listening-answer-number\">(15)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> behind the museum where students can have lunch.</div></div></section><section class=\"listening-source-group\" data-question-start=\"16\" data-question-end=\"18\" data-question-type=\"multiple-answer\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 16-18</p><p class=\"listening-source-instruction\">Choose THREE letters A-G.</p></header><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>food</dd></div><div><dt>B</dt><dd>water</dd></div><div><dt>C</dt><dd>cameras</dd></div><div><dt>D</dt><dd>books</dd></div><div><dt>E</dt><dd>bags</dd></div><div><dt>F</dt><dd>pens</dd></div><div><dt>G</dt><dd>worksheets</dd></div></dl></section><section class=\"listening-source-group\" data-question-start=\"19\" data-question-end=\"20\" data-question-type=\"multiple-answer\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 19-20</p><p class=\"listening-source-instruction\">Choose TWO letters A-E.</p></header><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>build model dinosaurs</dd></div><div><dt>B</dt><dd>watch films</dd></div><div><dt>C</dt><dd>draw dinosaurs</dd></div><div><dt>D</dt><dd>find dinosaur eggs</dd></div><div><dt>E</dt><dd>play computer games</dd></div></dl></section>"
      },
      "groups": [
        {
          "title": "Questions 11-15",
          "type": "sentence-completion",
          "instructionHtml": "Complete the sentences below. Write NO MORE THAN TWO WORDS OR A NUMBER.",
          "questions": [
            {
              "id": "q11",
              "textHtml": "The museum closes at p.m. on Mondays.",
              "answer": "1.30"
            },
            {
              "id": "q12",
              "textHtml": "The museum is not open on",
              "answer": "25 December"
            },
            {
              "id": "q13",
              "textHtml": "School groups are met by tour guides in the",
              "answer": "car parking"
            },
            {
              "id": "q14",
              "textHtml": "The whole visit takes 90 minutes, including minutes for the guided tour.",
              "answer": "45"
            },
            {
              "id": "q15",
              "textHtml": "There are behind the museum where students can have lunch.",
              "answer": "tables"
            }
          ],
          "wordLimit": 2
        },
        {
          "title": "Questions 16-18",
          "type": "multiple-answer",
          "instructionHtml": "Choose THREE letters A-G.",
          "questions": [
            {
              "id": "q16",
              "textHtml": "Question 16",
              "answer": [
                "C",
                "F",
                "G"
              ],
              "answerPairId": "test7-q16-q18"
            },
            {
              "id": "q17",
              "textHtml": "Question 17",
              "answer": [
                "C",
                "F",
                "G"
              ],
              "answerPairId": "test7-q16-q18"
            },
            {
              "id": "q18",
              "textHtml": "Question 18",
              "answer": [
                "C",
                "F",
                "G"
              ],
              "answerPairId": "test7-q16-q18"
            }
          ],
          "choices": [
            {
              "value": "A",
              "label": "food"
            },
            {
              "value": "B",
              "label": "water"
            },
            {
              "value": "C",
              "label": "cameras"
            },
            {
              "value": "D",
              "label": "books"
            },
            {
              "value": "E",
              "label": "bags"
            },
            {
              "value": "F",
              "label": "pens"
            },
            {
              "value": "G",
              "label": "worksheets"
            }
          ],
          "selectCount": 3
        },
        {
          "title": "Questions 19-20",
          "type": "multiple-answer",
          "instructionHtml": "Choose TWO letters A-E.",
          "questions": [
            {
              "id": "q19",
              "textHtml": "Question 19",
              "answer": [
                "B",
                "E"
              ],
              "answerPairId": "test7-q19-q20"
            },
            {
              "id": "q20",
              "textHtml": "Question 20",
              "answer": [
                "B",
                "E"
              ],
              "answerPairId": "test7-q19-q20"
            }
          ],
          "choices": [
            {
              "value": "A",
              "label": "build model dinosaurs"
            },
            {
              "value": "B",
              "label": "watch films"
            },
            {
              "value": "C",
              "label": "draw dinosaurs"
            },
            {
              "value": "D",
              "label": "find dinosaur eggs"
            },
            {
              "value": "E",
              "label": "play computer games"
            }
          ],
          "selectCount": 2
        }
      ]
    },
    {
      "label": "Section 3",
      "stimulus": {
        "kind": "audio",
        "label": "Section 3",
        "src": "/audio/listening/test-007.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"21\" data-question-end=\"24\" data-question-type=\"multiple-choice\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 21-24</p><p class=\"listening-source-instruction\">Choose the correct letter A, B or C.</p></header><p><strong>Field Trip Proposal</strong></p><article class=\"listening-source-question\" data-question=\"21\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">21</span>The tutor thinks that Sandra’s proposal</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>should be re-ordered in some parts</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>needs a contents page</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>ought to include more information</span></li></ol></article><article class=\"listening-source-question\" data-question=\"22\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">22</span>The proposal would be easier to follow if Sandra</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>inserted subheadings</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>used more paragraphs</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>shortened her sentences</span></li></ol></article><article class=\"listening-source-question\" data-question=\"23\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">23</span>What was the problem with the formatting on Sandra’s proposal?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>Separate points were not clearly identified</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>The headings were not always clear</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>Page numbering was not used in an appropriate way</span></li></ol></article><article class=\"listening-source-question\" data-question=\"24\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">24</span>Sandra became interested in visiting the Navajo National Park through</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>articles she read</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>movies she saw as a child</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>photographs she found on the internet</span></li></ol></article></section><section class=\"listening-source-group\" data-question-start=\"25\" data-question-end=\"27\" data-question-type=\"multiple-answer\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 25-27</p><p class=\"listening-source-instruction\">Choose THREE letters A-G.</p></header><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>climate change</dd></div><div><dt>B</dt><dd>field trip activities</dd></div><div><dt>C</dt><dd>geographical features</dd></div><div><dt>D</dt><dd>impact of tourism</dd></div><div><dt>E</dt><dd>myths and legends</dd></div><div><dt>F</dt><dd>plant and animal life</dd></div><div><dt>G</dt><dd>social history</dd></div></dl></section><section class=\"listening-source-group\" data-question-start=\"28\" data-question-end=\"30\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 28-30</p><p class=\"listening-source-instruction\">Complete the sentences below. Write ONE WORD OR A NUMBER.</p></header><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"28\" role=\"listitem\">The tribal park covers <span aria-label=\"Blank for question 28\" class=\"listening-answer-blank\" data-question=\"28\" role=\"img\"><span class=\"listening-answer-number\">(28)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> hectares.</div><div class=\"listening-source-question-row\" data-question-row=\"29\" role=\"listitem\">Sandra suggests that they share the <span aria-label=\"Blank for question 29\" class=\"listening-answer-blank\" data-question=\"29\" role=\"img\"><span class=\"listening-answer-number\">(29)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> for transport.</div><div class=\"listening-source-question-row\" data-question-row=\"30\" role=\"listitem\">She says they could also explore the local <span aria-label=\"Blank for question 30\" class=\"listening-answer-blank\" data-question=\"30\" role=\"img\"><span class=\"listening-answer-number\">(30)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section>"
      },
      "groups": [
        {
          "title": "Questions 21-24",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A, B or C.",
          "questions": [
            {
              "id": "q21",
              "textHtml": "The tutor thinks that Sandra’s proposal",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q22",
              "textHtml": "The proposal would be easier to follow if Sandra",
              "answer": "C",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q23",
              "textHtml": "What was the problem with the formatting on Sandra’s proposal?",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q24",
              "textHtml": "Sandra became interested in visiting the Navajo National Park through",
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
          "title": "Questions 25-27",
          "type": "multiple-answer",
          "instructionHtml": "Choose THREE letters A-G.",
          "questions": [
            {
              "id": "q25",
              "textHtml": "Question 25",
              "answer": [
                "B",
                "C",
                "F"
              ],
              "answerPairId": "test7-q25-q27"
            },
            {
              "id": "q26",
              "textHtml": "Question 26",
              "answer": [
                "B",
                "C",
                "F"
              ],
              "answerPairId": "test7-q25-q27"
            },
            {
              "id": "q27",
              "textHtml": "Question 27",
              "answer": [
                "B",
                "C",
                "F"
              ],
              "answerPairId": "test7-q25-q27"
            }
          ],
          "choices": [
            {
              "value": "A",
              "label": "climate change"
            },
            {
              "value": "B",
              "label": "field trip activities"
            },
            {
              "value": "C",
              "label": "geographical features"
            },
            {
              "value": "D",
              "label": "impact of tourism"
            },
            {
              "value": "E",
              "label": "myths and legends"
            },
            {
              "value": "F",
              "label": "plant and animal life"
            },
            {
              "value": "G",
              "label": "social history"
            }
          ],
          "selectCount": 3
        },
        {
          "title": "Questions 28-30",
          "type": "sentence-completion",
          "instructionHtml": "Complete the sentences below. Write ONE WORD OR A NUMBER.",
          "questions": [
            {
              "id": "q28",
              "textHtml": "The tribal park covers hectares.",
              "answer": "12,000"
            },
            {
              "id": "q29",
              "textHtml": "Sandra suggests that they share the for transport.",
              "answer": "horses"
            },
            {
              "id": "q30",
              "textHtml": "She says they could also explore the local",
              "answer": "caves"
            }
          ],
          "wordLimit": 1
        }
      ]
    },
    {
      "label": "Section 4",
      "stimulus": {
        "kind": "audio",
        "label": "Section 4",
        "src": "/audio/listening/test-007.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"31\" data-question-end=\"40\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 31-40</p><p class=\"listening-source-instruction\">Complete the notes below. Write ONE WORD ONLY.</p></header><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\"><strong>GEOGRAPHY</strong></p><p class=\"listening-source-title\">Studying geography helps us to understand:</p><div class=\"listening-source-question-row\" data-question-row=\"31\" role=\"listitem\">• The effects of different processes on the  <span aria-label=\"Blank for question 31\" class=\"listening-answer-blank\" data-question=\"31\" role=\"img\"><span class=\"listening-answer-number\">(31)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> of the Earth</div><div class=\"listening-source-question-row\" data-question-row=\"32\" role=\"listitem\">• The dynamic between  <span aria-label=\"Blank for question 32\" class=\"listening-answer-blank\" data-question=\"32\" role=\"img\"><span class=\"listening-answer-number\">(32)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> and population</div></div><div class=\"listening-source-note-block\"><div class=\"listening-source-note-row\">Two main branches of study:</div><div class=\"listening-source-note-row\">• Physical features</div><div class=\"listening-source-note-row\">• Human lifestyles and their  <span aria-label=\"Blank for question 33\" class=\"listening-answer-blank\" data-question=\"33\" role=\"img\"><span class=\"listening-answer-number\">(33)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div><div class=\"listening-source-note-block\"><div class=\"listening-source-note-row\">Specific study areas:</div><div class=\"listening-source-note-row\">• Biophysical, topographic, political, social, economic, historical and  <span aria-label=\"Blank for question 34\" class=\"listening-answer-blank\" data-question=\"34\" role=\"img\"><span class=\"listening-answer-number\">(34)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> geography and also cartography</div></div><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\">Key point:</p><p class=\"listening-source-title\">• Geography helps us to understand our surroundings and the associated</p><div class=\"listening-source-question-row\" data-question-row=\"35\" role=\"listitem\"><span aria-label=\"Blank for question 35\" class=\"listening-answer-blank\" data-question=\"35\" role=\"img\"><span class=\"listening-answer-number\">(35)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-support-row\">What do the geographers do?</div><div class=\"listening-source-question-row\" data-question-row=\"36\" role=\"listitem\">• Find data e.g. conduct censuses, collect information in the form of  <span aria-label=\"Blank for question 36\" class=\"listening-answer-blank\" data-question=\"36\" role=\"img\"><span class=\"listening-answer-number\">(36)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> using computer and satellite technology</div><div class=\"listening-source-question-row\" data-question-row=\"37\" role=\"listitem\">• Analyse data – identify  <span aria-label=\"Blank for question 37\" class=\"listening-answer-blank\" data-question=\"37\" role=\"img\"><span class=\"listening-answer-number\">(37)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> e.g. cause and effect</div><div class=\"listening-source-support-row\">• Publish findings in the form of:</div><div class=\"listening-source-support-row\">Maps</div><div class=\"listening-source-support-row\">Can show physical features of large and small areas</div><div class=\"listening-source-question-row\" data-question-row=\"38\" role=\"listitem\">But a two-dimensional map will always have some  <span aria-label=\"Blank for question 38\" class=\"listening-answer-blank\" data-question=\"38\" role=\"img\"><span class=\"listening-answer-number\">(38)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-support-row\">Aerial photos</div><div class=\"listening-source-question-row\" data-question-row=\"39\" role=\"listitem\">Can show vegetation problems  <span aria-label=\"Blank for question 39\" class=\"listening-answer-blank\" data-question=\"39\" role=\"img\"><span class=\"listening-answer-number\">(39)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> density, ocean, floor etc.</div></div><div class=\"listening-source-note-block\"><div class=\"listening-source-note-row\"><strong>Landsat pictures sent to receiving stations</strong></div><div class=\"listening-source-note-row\">• Used for monitoring  <span aria-label=\"Blank for question 40\" class=\"listening-answer-blank\" data-question=\"40\" role=\"img\"><span class=\"listening-answer-number\">(40)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> conditions etc.</div></div></section>"
      },
      "groups": [
        {
          "title": "Questions 31-40",
          "type": "sentence-completion",
          "instructionHtml": "Complete the notes below. Write ONE WORD ONLY.",
          "questions": [
            {
              "id": "q31",
              "textHtml": "Question 31",
              "answer": "surface"
            },
            {
              "id": "q32",
              "textHtml": "Question 32",
              "answer": "environment"
            },
            {
              "id": "q33",
              "textHtml": "Question 33",
              "answer": [
                "impact",
                "effects"
              ]
            },
            {
              "id": "q34",
              "textHtml": "Question 34",
              "answer": "urban"
            },
            {
              "id": "q35",
              "textHtml": "Question 35",
              "answer": "problems"
            },
            {
              "id": "q36",
              "textHtml": "Question 36",
              "answer": "images"
            },
            {
              "id": "q37",
              "textHtml": "Question 37",
              "answer": "patterns"
            },
            {
              "id": "q38",
              "textHtml": "Question 38",
              "answer": "distortion"
            },
            {
              "id": "q39",
              "textHtml": "Question 39",
              "answer": "traffic"
            },
            {
              "id": "q40",
              "textHtml": "Question 40",
              "answer": "weather"
            }
          ],
          "wordLimit": 1
        }
      ]
    }
  ]
};
