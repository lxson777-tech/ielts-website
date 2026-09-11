import type { PracticeTest } from '../../lib/tests/schema';

export const listeningFull009: PracticeTest = {
  "id": "listening-full-009",
  "skill": "listening",
  "title": "IELTS Listening Test 9",
  "description": "A full IELTS Listening practice test shared with permission by PracticePTEOnline.",
  "durationMinutes": 40,
  "audioSrc": "/audio/listening/test-009.mp3",
  "source": {
    "name": "PracticePTEOnline",
    "url": "https://practicepteonline.com/ielts-listening-test-9/",
    "permission": "Reused with permission from the publisher."
  },
  "parts": [
    {
      "label": "Section 1",
      "stimulus": {
        "kind": "audio",
        "label": "Section 1",
        "src": "/audio/listening/test-009.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"1\" data-question-end=\"2\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 1-2</p><p class=\"listening-source-instruction\">Complete the notes below. Write NO MORE THAN THREE WORDS OR A NUMBER.</p></header><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\">Type of job required: Part-time</p><div class=\"listening-source-question-row\" data-question-row=\"1\" role=\"listitem\">Student is studying  <span aria-label=\"Blank for question 1\" class=\"listening-answer-blank\" data-question=\"1\" role=\"img\"><span class=\"listening-answer-number\">(1)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"2\" role=\"listitem\">Student is in the  <span aria-label=\"Blank for question 2\" class=\"listening-answer-blank\" data-question=\"2\" role=\"img\"><span class=\"listening-answer-number\">(2)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> year of the course.</div></div></section><section class=\"listening-source-group\" data-question-start=\"3\" data-question-end=\"5\" data-question-type=\"table-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 3-5</p><p class=\"listening-source-instruction\">Complete the table below. Write NO MORE THAN TWO WORDS.</p></header><figure class=\"listening-source-table\"><table><tbody><tr><td><strong>Position available</strong></td><td><strong>Where</strong></td><td><strong>Problem</strong></td></tr><tr><td>Receptionist</td><td>In the <span aria-label=\"Blank for question 3\" class=\"listening-answer-blank\" data-question=\"3\" role=\"img\"><span class=\"listening-answer-number\">(3)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td><td>Evening lectures</td></tr><tr><td><span aria-label=\"Blank for question 4\" class=\"listening-answer-blank\" data-question=\"4\" role=\"img\"><span class=\"listening-answer-number\">(4)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td><td>In the child care centre</td><td>Too early</td></tr><tr><td>Clerical assistant</td><td>In the <span aria-label=\"Blank for question 5\" class=\"listening-answer-blank\" data-question=\"5\" role=\"img\"><span class=\"listening-answer-number\">(5)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td><td>Evening lectures</td></tr></tbody></table></figure></section><section class=\"listening-source-group\" data-question-start=\"6\" data-question-end=\"10\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 6-10</p><p class=\"listening-source-instruction\">Complete the form below. Write NO MORE THAN THREE WORDS OR A NUMBER.</p></header><p><strong>Student Details</strong></p><figure class=\"listening-source-table\"><table><tbody><tr><td>Name:</td><td>Anita Newman</td></tr><tr><td>Address:</td><td><span aria-label=\"Blank for question 6\" class=\"listening-answer-blank\" data-question=\"6\" role=\"img\"><span class=\"listening-answer-number\">(6)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td> </td><td>Room no. <span aria-label=\"Blank for question 7\" class=\"listening-answer-blank\" data-question=\"7\" role=\"img\"><span class=\"listening-answer-number\">(7)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Other skills:</td><td>Speaks some Japanese</td></tr><tr><td>Position available:</td><td><span aria-label=\"Blank for question 8\" class=\"listening-answer-blank\" data-question=\"8\" role=\"img\"><span class=\"listening-answer-number\">(8)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>at the English language centre</td></tr><tr><td>Duties:</td><td>Respond to enquiries and <span aria-label=\"Blank for question 9\" class=\"listening-answer-blank\" data-question=\"9\" role=\"img\"><span class=\"listening-answer-number\">(9)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Time of interview:</td><td>Friday at <span aria-label=\"Blank for question 10\" class=\"listening-answer-blank\" data-question=\"10\" role=\"img\"><span class=\"listening-answer-number\">(10)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>am</td></tr></tbody></table></figure></section>"
      },
      "groups": [
        {
          "title": "Questions 1-2",
          "type": "sentence-completion",
          "instructionHtml": "Complete the notes below. Write NO MORE THAN THREE WORDS OR A NUMBER.",
          "questions": [
            {
              "id": "q1",
              "textHtml": "Question 1",
              "answer": "busines"
            },
            {
              "id": "q2",
              "textHtml": "Question 2",
              "answer": "third"
            }
          ],
          "wordLimit": 3
        },
        {
          "title": "Questions 3-5",
          "type": "table-completion",
          "instructionHtml": "Complete the table below. Write NO MORE THAN TWO WORDS.",
          "questions": [
            {
              "id": "q3",
              "textHtml": "Question 3",
              "answer": "sports centre"
            },
            {
              "id": "q4",
              "textHtml": "Question 4",
              "answer": "cleaner"
            },
            {
              "id": "q5",
              "textHtml": "Question 5",
              "answer": "library"
            }
          ],
          "wordLimit": 2
        },
        {
          "title": "Questions 6-10",
          "type": "sentence-completion",
          "instructionHtml": "Complete the form below. Write NO MORE THAN THREE WORDS OR A NUMBER.",
          "questions": [
            {
              "id": "q6",
              "textHtml": "Question 6",
              "answer": "international house"
            },
            {
              "id": "q7",
              "textHtml": "Question 7",
              "answer": "B659"
            },
            {
              "id": "q8",
              "textHtml": "Question 8",
              "answer": "office assistant"
            },
            {
              "id": "q9",
              "textHtml": "Question 9",
              "answer": "answer phone"
            },
            {
              "id": "q10",
              "textHtml": "Question 10",
              "answer": "11.30"
            }
          ],
          "wordLimit": 3
        }
      ]
    },
    {
      "label": "Section 2",
      "stimulus": {
        "kind": "audio",
        "label": "Section 2",
        "src": "/audio/listening/test-009.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"11\" data-question-end=\"16\" data-question-type=\"multiple-choice\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 11-16</p><p class=\"listening-source-instruction\">Choose the correct letter A, B or C.</p></header><p class=\"listening-source-title\"><strong>SPONSORED WALKING HOLIDAY</strong></p><article class=\"listening-source-question\" data-question=\"11\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">11</span>On the holiday, you will be walking for</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>6 days</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>8 days</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>10 days</span></li></ol></article><article class=\"listening-source-question\" data-question=\"12\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">12</span>What proportion of the sponsorship money goes to charity?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>See the labelled option in the question image.</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>See the labelled option in the question image.</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>See the labelled option in the question image.</span></li></ol></article><figure class=\"listening-source-figure\"><img alt=\"Listening question diagram\" src=\"/pics/listening/imported/test-009.png\"/></figure><p> <strong>A</strong><br/> <strong>B</strong><br/> <strong>C</strong></p><article class=\"listening-source-question\" data-question=\"13\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">13</span>Each walker’s sponsorship money goes to one</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>student</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>teacher</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>school</span></li></ol></article><article class=\"listening-source-question\" data-question=\"14\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">14</span>When you start the trek you must be</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>interested in getting fit</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>already quite fit</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>already very fit</span></li></ol></article><article class=\"listening-source-question\" data-question=\"15\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">15</span>As you walk you will carry</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>all of your belongings</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>some of your belongings</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>none of your belongings</span></li></ol></article><article class=\"listening-source-question\" data-question=\"16\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">16</span>The Semira Region has a long tradition of</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>making carpets</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>weaving blankets</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>carving wood</span></li></ol></article></section><section class=\"listening-source-group\" data-question-start=\"17\" data-question-end=\"20\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 17-20</p><p class=\"listening-source-instruction\">Complete the form below. Write ONE WORD ONLY.</p></header><p><strong>ITINERARY</strong></p><figure class=\"listening-source-table\"><table><tbody><tr><td>Day 1</td><td>Arrive in Kishba</td></tr><tr><td>Day 2</td><td>Rest day</td></tr><tr><td>Day 3</td><td>Spend all day in a <span aria-label=\"Blank for question 17\" class=\"listening-answer-blank\" data-question=\"17\" role=\"img\"><span class=\"listening-answer-number\">(17)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Day 4</td><td>Visit a school</td></tr><tr><td>Day 5</td><td>Rest day</td></tr><tr><td>Day 6</td><td>See a <span aria-label=\"Blank for question 18\" class=\"listening-answer-blank\" data-question=\"18\" role=\"img\"><span class=\"listening-answer-number\">(18)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span>with old carvings</td></tr><tr><td>Day 7</td><td>Rest day</td></tr><tr><td>Day 8</td><td>Swim in a <span aria-label=\"Blank for question 19\" class=\"listening-answer-blank\" data-question=\"19\" role=\"img\"><span class=\"listening-answer-number\">(19)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Day 9</td><td>Visit a <span aria-label=\"Blank for question 20\" class=\"listening-answer-blank\" data-question=\"20\" role=\"img\"><span class=\"listening-answer-number\">(20)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></td></tr><tr><td>Day 10</td><td>Depart from Kishba</td></tr></tbody></table></figure></section>"
      },
      "groups": [
        {
          "title": "Questions 11-16",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A, B or C.",
          "questions": [
            {
              "id": "q11",
              "textHtml": "On the holiday, you will be walking for",
              "answer": "B",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q12",
              "textHtml": "What proportion of the sponsorship money goes to charity?",
              "answer": "C",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q13",
              "textHtml": "Each walker’s sponsorship money goes to one",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q14",
              "textHtml": "When you start the trek you must be",
              "answer": "C",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q15",
              "textHtml": "As you walk you will carry",
              "answer": "B",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q16",
              "textHtml": "The Semira Region has a long tradition of",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
            }
          ]
        },
        {
          "title": "Questions 17-20",
          "type": "sentence-completion",
          "instructionHtml": "Complete the form below. Write ONE WORD ONLY.",
          "questions": [
            {
              "id": "q17",
              "textHtml": "Question 17",
              "answer": "forest"
            },
            {
              "id": "q18",
              "textHtml": "Question 18",
              "answer": "temple"
            },
            {
              "id": "q19",
              "textHtml": "Question 19",
              "answer": "waterfall"
            },
            {
              "id": "q20",
              "textHtml": "Question 20",
              "answer": "village"
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
        "src": "/audio/listening/test-009.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"21\" data-question-end=\"22\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 21-22</p><p class=\"listening-source-instruction\">Complete the notes below. Write NO MORE THAN TWO WORDS OR A NUMBER.</p></header><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\"><strong>OCEAN RESEARCH</strong></p><p class=\"listening-source-title\">The Robotic Float Project</p><div class=\"listening-source-question-row\" data-question-row=\"21\" role=\"listitem\">• Float is shaped like a  <span aria-label=\"Blank for question 21\" class=\"listening-answer-blank\" data-question=\"21\" role=\"img\"><span class=\"listening-answer-number\">(21)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"22\" role=\"listitem\">• Scientists from  <span aria-label=\"Blank for question 22\" class=\"listening-answer-blank\" data-question=\"22\" role=\"img\"><span class=\"listening-answer-number\">(22)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> have worked on the projects so far</div></div></section><section class=\"listening-source-group\" data-question-start=\"23\" data-question-end=\"25\" data-question-type=\"diagram-labelling\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 23-25</p><p class=\"listening-source-instruction\">Complete the diagram below. Write ONE WORD OR A NUMBER.</p></header><figure class=\"listening-source-figure\"><img alt=\"Listening question diagram\" src=\"/pics/listening/imported/test-009-2.png\"/></figure><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"23\" role=\"listitem\"><span aria-label=\"Blank for question 23\" class=\"listening-answer-blank\" data-question=\"23\" role=\"img\"><span class=\"listening-answer-number\">(23)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"24\" role=\"listitem\"><span aria-label=\"Blank for question 24\" class=\"listening-answer-blank\" data-question=\"24\" role=\"img\"><span class=\"listening-answer-number\">(24)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"25\" role=\"listitem\"><span aria-label=\"Blank for question 25\" class=\"listening-answer-blank\" data-question=\"25\" role=\"img\"><span class=\"listening-answer-number\">(25)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section><section class=\"listening-source-group\" data-question-start=\"26\" data-question-end=\"30\" data-question-type=\"categorisation\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 26-30</p><p class=\"listening-source-instruction\">Write the correct letter A, B or C next to questions 26-30.</p></header><p>In what time period can data from the float projects help with the following things?<br/>Write the correct letter A, B or C next to questions 26-30.</p><div class=\"listening-source-question-list\" role=\"list\"><div class=\"listening-source-question-row\" data-question-row=\"26\" role=\"listitem\">understanding of El Nino <span aria-label=\"Blank for question 26\" class=\"listening-answer-blank\" data-question=\"26\" role=\"img\"><span class=\"listening-answer-number\">(26)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"27\" role=\"listitem\">understanding of climate change <span aria-label=\"Blank for question 27\" class=\"listening-answer-blank\" data-question=\"27\" role=\"img\"><span class=\"listening-answer-number\">(27)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"28\" role=\"listitem\">naval rescues <span aria-label=\"Blank for question 28\" class=\"listening-answer-blank\" data-question=\"28\" role=\"img\"><span class=\"listening-answer-number\">(28)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"29\" role=\"listitem\">sustainable fishing practices <span aria-label=\"Blank for question 29\" class=\"listening-answer-blank\" data-question=\"29\" role=\"img\"><span class=\"listening-answer-number\">(29)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"30\" role=\"listitem\">crop selection <span aria-label=\"Blank for question 30\" class=\"listening-answer-blank\" data-question=\"30\" role=\"img\"><span class=\"listening-answer-number\">(30)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div><dl class=\"listening-source-legend\"><div><dt>A</dt><dd>At present</dd></div><div><dt>B</dt><dd>In the near future</dd></div><div><dt>C</dt><dd>In the long term future</dd></div></dl></section>"
      },
      "groups": [
        {
          "title": "Questions 21-22",
          "type": "sentence-completion",
          "instructionHtml": "Complete the notes below. Write NO MORE THAN TWO WORDS OR A NUMBER.",
          "questions": [
            {
              "id": "q21",
              "textHtml": "Question 21",
              "answer": "cigar"
            },
            {
              "id": "q22",
              "textHtml": "Question 22",
              "answer": "13 countries"
            }
          ],
          "wordLimit": 2
        },
        {
          "title": "Questions 23-25",
          "type": "diagram-labelling",
          "instructionHtml": "Complete the diagram below. Write ONE WORD OR A NUMBER.",
          "questions": [
            {
              "id": "q23",
              "textHtml": "Question 23",
              "answer": "activated"
            },
            {
              "id": "q24",
              "textHtml": "Question 24",
              "answer": "50km"
            },
            {
              "id": "q25",
              "textHtml": "Question 25",
              "answer": "temperature"
            }
          ],
          "wordLimit": 1
        },
        {
          "title": "Questions 26-30",
          "type": "categorisation",
          "instructionHtml": "Write the correct letter A, B or C next to questions 26-30.",
          "questions": [
            {
              "id": "q26",
              "textHtml": "understanding of El Nino",
              "answer": "A"
            },
            {
              "id": "q27",
              "textHtml": "understanding of climate change",
              "answer": "C"
            },
            {
              "id": "q28",
              "textHtml": "naval rescues",
              "answer": "A"
            },
            {
              "id": "q29",
              "textHtml": "sustainable fishing practices",
              "answer": "B"
            },
            {
              "id": "q30",
              "textHtml": "crop selection",
              "answer": "C"
            }
          ]
        }
      ]
    },
    {
      "label": "Section 4",
      "stimulus": {
        "kind": "audio",
        "label": "Section 4",
        "src": "/audio/listening/test-009.mp3",
        "questionHtml": "<section class=\"listening-source-group\" data-question-start=\"31\" data-question-end=\"34\" data-question-type=\"multiple-choice\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 31-34</p><p class=\"listening-source-instruction\">Choose the correct letter A, B or C.</p></header><p class=\"listening-source-title\"><strong>Hotels and Tourist Industry</strong></p><article class=\"listening-source-question\" data-question=\"31\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">31</span>According to the speaker, how might a guest feel when staying in a luxury hotel?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>impressed with the facilities</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>depressed by the experience</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>concerned at the high costs</span></li></ol></article><article class=\"listening-source-question\" data-question=\"32\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">32</span>According to recent research, luxury hotels overlook the need to</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>provide for the demands of important guests</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>create a comfortable environment</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>offer an individual and personal welcome</span></li></ol></article><article class=\"listening-source-question\" data-question=\"33\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">33</span>The company focused their research on</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>a wide variety of hotels</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>large, luxury hotel chains</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>exotic holiday hotels</span></li></ol></article><article class=\"listening-source-question\" data-question=\"34\"><p class=\"listening-source-prompt\"><span class=\"listening-source-question-number\">34</span>What is the impact of the outside environment on a hotel guest?</p><ol class=\"listening-source-options\"><li data-option=\"A\"><span class=\"listening-source-option-key\">A</span><span>It has a considerable effect</span></li><li data-option=\"B\"><span class=\"listening-source-option-key\">B</span><span>It has a very limited effect</span></li><li data-option=\"C\"><span class=\"listening-source-option-key\">C</span><span>It has no effect whatsoever</span></li></ol></article></section><section class=\"listening-source-group\" data-question-start=\"35\" data-question-end=\"40\" data-question-type=\"sentence-completion\"><header class=\"listening-source-header\"><p class=\"listening-source-range\">Questions 35-40</p><p class=\"listening-source-instruction\">Complete the notes below. Write ONE WORD ONLY.</p></header><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\">A company providing luxury serviced apartments aims to:</p><div class=\"listening-source-question-row\" data-question-row=\"35\" role=\"listitem\">• cater specifically for  <span aria-label=\"Blank for question 35\" class=\"listening-answer-blank\" data-question=\"35\" role=\"img\"><span class=\"listening-answer-number\">(35)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> travellers</div><div class=\"listening-source-question-row\" data-question-row=\"36\" role=\"listitem\">• provide a stylish  <span aria-label=\"Blank for question 36\" class=\"listening-answer-blank\" data-question=\"36\" role=\"img\"><span class=\"listening-answer-number\">(36)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> for guests to use</div><div class=\"listening-source-question-row\" data-question-row=\"37\" role=\"listitem\">• set a trend throughout the  <span aria-label=\"Blank for question 37\" class=\"listening-answer-blank\" data-question=\"37\" role=\"img\"><span class=\"listening-answer-number\">(37)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> which becomes permanent</div></div><div class=\"listening-source-question-list\" role=\"list\"><p class=\"listening-source-title\">Traditional holiday hotels attract people by:</p><div class=\"listening-source-question-row\" data-question-row=\"38\" role=\"listitem\">• offering the chance to  <span aria-label=\"Blank for question 38\" class=\"listening-answer-blank\" data-question=\"38\" role=\"img\"><span class=\"listening-answer-number\">(38)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span> their ordinary routine life</div><div class=\"listening-source-question-row\" data-question-row=\"39\" role=\"listitem\">• making sure that they are cared for in all respects – like a  <span aria-label=\"Blank for question 39\" class=\"listening-answer-blank\" data-question=\"39\" role=\"img\"><span class=\"listening-answer-number\">(39)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div><div class=\"listening-source-question-row\" data-question-row=\"40\" role=\"listitem\">• leaving small treats in their rooms – e.g. cosmetics or  <span aria-label=\"Blank for question 40\" class=\"listening-answer-blank\" data-question=\"40\" role=\"img\"><span class=\"listening-answer-number\">(40)</span><span aria-hidden=\"true\" class=\"listening-answer-line\"> </span></span></div></div></section>"
      },
      "groups": [
        {
          "title": "Questions 31-34",
          "type": "multiple-choice",
          "instructionHtml": "Choose the correct letter A, B or C.",
          "questions": [
            {
              "id": "q31",
              "textHtml": "According to the speaker, how might a guest feel when staying in a luxury hotel?",
              "answer": "B",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q32",
              "textHtml": "According to recent research, luxury hotels overlook the need to",
              "answer": "B",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q33",
              "textHtml": "The company focused their research on",
              "answer": "A",
              "options": [
                "A",
                "B",
                "C"
              ]
            },
            {
              "id": "q34",
              "textHtml": "What is the impact of the outside environment on a hotel guest?",
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
          "instructionHtml": "Complete the notes below. Write ONE WORD ONLY.",
          "questions": [
            {
              "id": "q35",
              "textHtml": "Question 35",
              "answer": "business"
            },
            {
              "id": "q36",
              "textHtml": "Question 36",
              "answer": "kitchen"
            },
            {
              "id": "q37",
              "textHtml": "Question 37",
              "answer": "world"
            },
            {
              "id": "q38",
              "textHtml": "Question 38",
              "answer": "escape"
            },
            {
              "id": "q39",
              "textHtml": "Question 39",
              "answer": "baby"
            },
            {
              "id": "q40",
              "textHtml": "Question 40",
              "answer": "chocolate"
            }
          ],
          "wordLimit": 1
        }
      ]
    }
  ]
};
