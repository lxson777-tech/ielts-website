"""Import 20 listening tests shared by PracticePTEOnline.

Alex confirmed permission from the publisher on 2026-09-11. This importer
stores source pages in .tmp/listening-source, copies MP3 and diagram assets
into public, and emits PracticeTest records. It keeps visible instructions
and layouts, while removing answer forms, answer keys, scripts, and adverts.

Run from the project root with: python tools/import_listening.py
"""

from __future__ import annotations

from html import escape
from pathlib import Path
import json
import re
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".tmp" / "listening-source"
AUDIO_DIR = ROOT / "public" / "audio" / "listening"
IMAGE_DIR = ROOT / "public" / "pics" / "listening" / "imported"
DATA_DIR = ROOT / "src" / "data" / "tests"
SOURCE_ORIGIN = "https://practicepteonline.com"
SOURCE_TEMPLATE = SOURCE_ORIGIN + "/ielts-listening-test-{n}/"
SOURCE_URLS = {
    # These two numbered pages use older slugs. The apparent `test-6` and
    # `test-15` URLs are WordPress redirects to unrelated tests 60 and 151.
    6: SOURCE_ORIGIN + "/ielts-listening-6/",
    15: SOURCE_ORIGIN + "/listening-15/",
}

# Visible question ranges, in four sections per test. The source has a few
# groups with different answer controls, so this metadata makes the emitted
# records deterministic when the publisher changes surrounding markup.
GROUPS: dict[int, list[list[tuple[int, int, str, str]]]] = {
    # Word-limit sentences below were recovered from the cached source pages
    # (.tmp/listening-source/<n>.html) on 2026-09-13: the original entries for
    # tests 1-5 dropped the publisher's "Write ... WORD(S)..." sentence, which
    # left the emitted records with no wordLimit metadata (word_match below
    # relies on that sentence being present).
    1: [[(1, 5, "sentence-completion", "Complete the table below. Write ONE WORD OR A NUMBER."), (6, 10, "sentence-completion", "Complete the table below. Write ONE WORD OR A NUMBER.")], [(11, 13, "multiple-choice", "Choose the correct letter, A, B or C."), (14, 18, "matching-features", "Choose FIVE answers from the box."), (19, 20, "sentence-completion", "Complete the table below. Write ONE WORD OR A NUMBER.")], [(21, 30, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS OR A NUMBER.")], [(31, 32, "multiple-choice", "Choose the correct letter, A, B or C."), (33, 40, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.")]],
    2: [[(1, 10, "sentence-completion", "Complete the form below. Write ONE WORD AND/OR A NUMBER.")], [(11, 13, "sentence-completion", "Complete the table below. Write NO MORE THAN THREE WORDS."), (14, 16, "multiple-choice", "Choose the correct letter, A, B or C."), (17, 20, "matching-features", "Label the map below.")], [(21, 24, "multiple-choice", "Choose the correct letter, A, B or C."), (25, 30, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS.")], [(31, 40, "sentence-completion", "Complete the notes below. Write ONE WORD ONLY.")]],
    3: [[(1, 10, "sentence-completion", "Complete the notes below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.")], [(11, 16, "sentence-completion", "Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer."), (17, 18, "multiple-choice", "Choose the correct letter, A, B or C."), (19, 20, "multiple-answer", "Choose TWO letters, A-E.")], [(21, 30, "multiple-choice", "Choose the correct letter, A, B or C.")], [(31, 40, "sentence-completion", "Complete the notes below. Write NO MORE THAN THREE WORDS.")]],
    4: [[(1, 10, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS OR A NUMBER.")], [(11, 13, "multiple-choice", "Choose the correct letter, A, B or C."), (14, 20, "matching-features", "Label the map below.")], [(21, 22, "multiple-answer", "Choose TWO letters, A-E."), (23, 24, "multiple-answer", "Choose TWO letters, A-E."), (25, 26, "multiple-choice", "Choose the correct letter, A, B or C."), (27, 30, "sentence-completion", "Complete the flow chart below. Write NO MORE THAN TWO WORDS OR A NUMBER.")], [(31, 36, "matching-features", "Write the correct letter, A, B or C."), (37, 40, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS.")]],
    5: [[(1, 3, "sentence-completion", "Complete the form below. Write ONE WORD OR A NUMBER."), (4, 8, "sentence-completion", "Complete the table below. Write ONE WORD OR A NUMBER."), (9, 10, "multiple-answer", "Choose TWO letters, A-E.")], [(11, 16, "sentence-completion", "Complete the notes below. Write NO MORE THAN THREE WORDS OR A NUMBER."), (17, 20, "sentence-completion", "Complete the table below. Write NO MORE THAN THREE WORDS OR A NUMBER.")], [(21, 26, "multiple-choice", "Choose the correct letter, A, B or C."), (27, 30, "matching-features", "Write the correct letter, A, B or C.")], [(31, 34, "multiple-choice", "Choose the correct letter, A, B or C."), (35, 40, "sentence-completion", "Complete the notes below. Write ONE WORD ONLY.")]],
}

# Tests 6-20 are mapped from the publisher's visible group headings. Keeping
# the exact word limits here makes source drift fail review instead of quietly
# changing what the learner is asked to enter.
GROUPS.update({
    6: [[(1, 5, "sentence-completion", "Complete the form below. Write NO MORE THAN THREE WORDS OR A NUMBER."), (6, 7, "multiple-answer", "Choose TWO letters A-E."), (8, 10, "sentence-completion", "Complete the sentences below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.")], [(11, 15, "sentence-completion", "Complete the sentences below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer."), (16, 20, "sentence-completion", "Complete the summary below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.")], [(21, 25, "sentence-completion", "Complete the summary below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer."), (26, 30, "multiple-choice", "Choose the correct letter A, B or C.")], [(31, 34, "multiple-choice", "Choose the correct letter A, B or C."), (35, 40, "sentence-completion", "Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.")]],
    7: [[(1, 2, "multiple-choice", "Choose the correct letter A, B or C."), (3, 10, "table-completion", "Complete the form below. Write NO MORE THAN TWO WORDS OR A NUMBER.")], [(11, 15, "sentence-completion", "Complete the sentences below. Write NO MORE THAN TWO WORDS OR A NUMBER."), (16, 18, "multiple-answer", "Choose THREE letters A-G."), (19, 20, "multiple-answer", "Choose TWO letters A-E.")], [(21, 24, "multiple-choice", "Choose the correct letter A, B or C."), (25, 27, "multiple-answer", "Choose THREE letters A-G."), (28, 30, "sentence-completion", "Complete the sentences below. Write ONE WORD OR A NUMBER.")], [(31, 40, "sentence-completion", "Complete the notes below. Write ONE WORD ONLY.")]],
    8: [[(1, 6, "sentence-completion", "Complete the form below. Write NO MORE THAN THREE WORDS OR A NUMBER."), (7, 10, "sentence-completion", "Answer the questions below. Write NO MORE THAN TWO WORDS.")], [(11, 14, "multiple-choice", "Choose the correct letter A, B or C."), (15, 17, "diagram-labelling", "Label the plan below. Write NO MORE THAN TWO WORDS."), (18, 20, "table-completion", "Complete the table below. Write NO MORE THAN TWO WORDS.")], [(21, 22, "sentence-completion", "Complete the sentences below. Write NO MORE THAN ONE WORD AND/OR A NUMBER for each answer."), (23, 26, "categorisation", "Write the correct letter, A, B or C, next to questions 23-26."), (27, 30, "table-completion", "Complete the table below. Write NO MORE THAN TWO WORDS.")], [(31, 33, "multiple-choice", "Choose the correct letter A, B or C."), (34, 40, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS.")]],
    9: [[(1, 2, "sentence-completion", "Complete the notes below. Write NO MORE THAN THREE WORDS OR A NUMBER."), (3, 5, "table-completion", "Complete the table below. Write NO MORE THAN TWO WORDS."), (6, 10, "sentence-completion", "Complete the form below. Write NO MORE THAN THREE WORDS OR A NUMBER.")], [(11, 16, "multiple-choice", "Choose the correct letter A, B or C."), (17, 20, "sentence-completion", "Complete the form below. Write ONE WORD ONLY.")], [(21, 22, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS OR A NUMBER."), (23, 25, "diagram-labelling", "Complete the diagram below. Write ONE WORD OR A NUMBER."), (26, 30, "categorisation", "Write the correct letter A, B or C next to questions 26-30.")], [(31, 34, "multiple-choice", "Choose the correct letter A, B or C."), (35, 40, "sentence-completion", "Complete the notes below. Write ONE WORD ONLY.")]],
    10: [[(1, 4, "sentence-completion", "Complete the form below. Write NO MORE THAN ONE WORD AND/OR A NUMBER for each answer."), (5, 7, "multiple-answer", "Choose THREE letters, A-G."), (8, 10, "multiple-choice", "Choose the correct letters, A, B, or C.")], [(11, 12, "sentence-completion", "Complete the information below. Write ONE NUMBER for each answer."), (13, 15, "sentence-completion", "Complete the information below. Write NO MORE THAN TWO WORDS."), (16, 20, "table-completion", "Complete the chart below. Write NO MORE THAN ONE WORD for each answer.")], [(21, 23, "sentence-completion", "Answer the questions below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer."), (24, 30, "sentence-completion", "Complete the outline below. Write NO MORE THAN THREE WORDS for each answer.")], [(31, 40, "table-completion", "Complete the timeline below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.")]],
    11: [[(1, 10, "table-completion", "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.")], [(11, 14, "multiple-choice", "Answer the questions below. Choose the correct letter, A, B, or C."), (15, 20, "table-completion", "Complete the table below. Write NO MORE THAN ONE WORD for each answer.")], [(21, 23, "sentence-completion", "Complete the information below. Write NO MORE THAN TWO WORDS for each answer."), (24, 28, "categorisation", "Write the correct letter, A, B, or C, next to questions 24-28."), (29, 30, "multiple-choice", "Choose the correct letters, A, B, or C.")], [(31, 35, "table-completion", "Complete the chart below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer."), (36, 40, "categorisation", "Write A for black bears or B for grizzly bears.")]],
    12: [[(1, 10, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS AND/ OR A NUMBER for each answer.")], [(11, 15, "matching-features", "Match the creatures to their behavior. Write the correct letter A, B, C or D next to questions 11-15."), (16, 17, "sentence-completion", "Answer the questions below. Write ONE WORD ONLY for each answer."), (18, 20, "sentence-completion", "Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.")], [(21, 23, "multiple-choice", "Choose the correct letter A, B or C."), (24, 25, "sentence-completion", "Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer."), (26, 30, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.")], [(31, 34, "diagram-labelling", "Label the diagrams below. Write NO MORE THAN TWO WORDS for each answer."), (35, 40, "sentence-completion", "Complete the summary below. Write NO MORE THAN TWO WORDS for each answer.")]],
    13: [[(1, 6, "table-completion", "Complete the table below. Write NO MORE THAN THREE WORDS OR A NUMBER for each answer."), (7, 10, "categorisation", "Write the correct letter A, B or C next to questions 7-10.")], [(11, 14, "multiple-choice", "Choose the correct letter A, B or C."), (15, 17, "sentence-completion", "List THREE types of organizations. Write NO MORE THAN THREE WORDS for each answer."), (18, 20, "sentence-completion", "Complete the notes below. Write NO MORE THAN THREE WORDS AND OR A NUMBER for each answer.")], [(21, 23, "sentence-completion", "Answer the questions below. Write NO MORE THAN THREE WORDS for each answer."), (24, 27, "multiple-choice", "Choose the correct letters A-C."), (28, 30, "sentence-completion", "Complete the sentences below. Write ONE WORD ONLY for each answer.")], [(31, 33, "sentence-completion", "Complete the notes below. Write NO MORE THAN THREE WORDS for each answer."), (34, 40, "table-completion", "Complete the table below. Write NO MORE THAN THREE WORDS for each answer.")]],
    14: [[(1, 10, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS OR A NUMBER for each answer.")], [(11, 16, "matching-features", "Choose SIX answers from the box and write the correct letter A-I next to questions 11-16."), (17, 20, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS AND/ OR A NUMBER for each answer.")], [(21, 25, "multiple-choice", "Choose the correct letter A, B or C."), (26, 30, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.")], [(31, 40, "sentence-completion", "Complete the notes below. Write ONE WORD ONLY for each answer.")]],
    15: [[(1, 5, "sentence-completion", "Complete the notes below. Write NO MORE THAN THREE WORDS OR A NUMBER."), (6, 10, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS AND/ OR A NUMBER for each answer.")], [(11, 15, "sentence-completion", "Complete the sentences below. Write NO MORE THAN TWO WORDS AND OR A NUMBER for each answer."), (16, 18, "multiple-choice", "Choose the correct letter A, B or C."), (19, 20, "matching-features", "Match the locations in questions 19-20 with the correct locations on the map.")], [(21, 25, "table-completion", "Complete the table below. Write NO MORE THAN TWO WORDS for each answer."), (26, 30, "multiple-choice", "Choose the correct letter A, B or C.")], [(31, 35, "matching-features", "Match the person with their actions (A-G)."), (36, 40, "sentence-completion", "Complete the summary below. Write NO MORE THAN TWO WORDS for each answer.")]],
    16: [[(1, 5, "table-completion", "Complete the table below using NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer."), (6, 10, "table-completion", "Complete the flow chart below. Write NO MORE THAN ONE WORD for each answer.")], [(11, 11, "multiple-answer", "Choose TWO answers."), (12, 12, "multiple-answer", "Choose TWO answers."), (13, 13, "multiple-answer", "Choose TWO answers."), (14, 14, "multiple-answer", "Choose TWO answers."), (15, 20, "sentence-completion", "Complete the sentences using NO MORE THAN TWO WORDS for each answer.")], [(21, 23, "multiple-answer", "Choose THREE letters A-G."), (24, 26, "matching-features", "Write the correct country letter next to questions 24-26."), (27, 30, "matching-features", "Choose the answers from the options and write the appropriate letter A-I next to questions 27-30.")], [(31, 35, "table-completion", "Complete the table below. Use NO MORE THAN TWO WORDS for each answer."), (36, 40, "categorisation", "Write the correct letter A, B, C, D or E next to questions 36-40.")]],
    17: [[(1, 4, "multiple-choice", "Choose the correct letter A, B or C."), (5, 10, "sentence-completion", "Complete the form below. Write NO MORE THAN TWO WORDS AND/ OR A NUMBER for each answer.")], [(11, 16, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS for each answer."), (17, 20, "table-completion", "Complete the table below. Write NO MORE THAN TWO WORDS for each answer.")], [(21, 23, "multiple-choice", "Choose the correct letter A, B or C."), (24, 28, "sentence-completion", "Complete the notes below. Write NO MORE THAN THREE WORDS for each answer."), (29, 30, "diagram-labelling", "Choose your answers from the box and write the letters A-H next to questions 29-30.")], [(31, 36, "table-completion", "Complete the table below. Write NO MORE THAN TWO WORDS AND OR A NUMBER for each answer."), (37, 40, "sentence-completion", "Complete the summary below. Write NO MORE THAN ONE WORD for each answer.")]],
    18: [[(1, 8, "table-completion", "Complete the table below using NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer."), (9, 10, "sentence-completion", "Complete the notes below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.")], [(11, 14, "multiple-choice", "Choose the correct letter A, B or C."), (15, 20, "table-completion", "Complete the table below. Write NO MORE THAN ONE WORD AND/ OR A NUMBER for each answer.")], [(21, 26, "multiple-choice", "Choose the correct letter A, B or C."), (27, 30, "sentence-completion", "Answer the questions below. Write NO MORE THAN THREE WORDS AND/ OR A NUMBER for each answer.")], [(31, 37, "sentence-completion", "Complete the sentences below. Write NO MORE THAN THREE WORDS for each answer."), (38, 40, "multiple-choice", "Choose the correct letter A, B or C.")]],
    19: [[(1, 10, "sentence-completion", "Complete the notes below. Write NO MORE THAN TWO WORDS OR A NUMBER for each answer.")], [(11, 16, "matching-features", "Complete the flow chart below. Choose SIX answers from the box and write the correct letter A-G next to questions 11-16."), (17, 18, "multiple-answer", "Choose TWO letters, A-E."), (19, 20, "multiple-answer", "Choose TWO letters, A-E.")], [(21, 25, "multiple-choice", "Choose the correct letter, A, B or C."), (26, 30, "matching-features", "Choose FIVE answers from the box and write the correct letter A-G next to questions 26-30.")], [(31, 40, "sentence-completion", "Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.")]],
    20: [[(1, 1, "multiple-choice", "Choose the correct letter A, B or C."), (2, 2, "sentence-completion", "Answer the question with NO MORE THAN TWO WORDS."), (3, 3, "multiple-choice", "Choose the correct letter A, B or C."), (4, 5, "sentence-completion", "Complete the following sentences with ONE WORD OR A NUMBER."), (6, 8, "sentence-completion", "Write NO MORE THAN THREE WORDS for each answer."), (9, 10, "sentence-completion", "Answer the following questions. Write ONE WORD OR A NUMBER for each answer.")], [(11, 13, "sentence-completion", "Complete the following sentences with NO MORE THAN THREE WORDS for each answer."), (14, 14, "multiple-choice", "Choose the correct letter A, B or C."), (15, 15, "sentence-completion", "Complete the following sentence WITH ONE WORD only."), (16, 16, "multiple-choice", "Choose the correct letter A, B or C."), (17, 17, "sentence-completion", "Answer the question with ONE WORD OR A NUMBER only."), (18, 19, "sentence-completion", "Complete the sentence below with ONE WORD only."), (20, 20, "sentence-completion", "Answer the question with ONE WORD only.")], [(21, 23, "multiple-answer", "Choose THREE letters from A-E."), (24, 25, "sentence-completion", "Complete the following sentences with NO MORE THAN TWO WORDS for each answer."), (26, 27, "multiple-choice", "Choose the correct letter A, B or C."), (28, 29, "multiple-answer", "Choose TWO letters from A-E."), (30, 30, "sentence-completion", "Complete the following sentence with NO MORE THAN TWO WORDS.")], [(31, 32, "multiple-answer", "Choose TWO letters from A-E."), (33, 34, "sentence-completion", "Write NO MORE THAN THREE WORDS for each answer."), (35, 35, "multiple-choice", "Choose the correct letter A, B or C."), (36, 40, "sentence-completion", "Complete the sentences with NO MORE THAN THREE WORDS for each answer.")]],
})

MAP_OPTIONS = {
    (1, 2): list("ABCDEFGH"),
    (2, 2): list("ABCDEFGHI"),
    (4, 2): list("ABCDEFGH"),
    (4, 4): list("ABC"),
    (5, 3): list("ABC"),
    (8, 3): list("ABC"),
    (9, 3): list("ABC"),
    (11, 3): list("ABC"),
    (11, 4): list("AB"),
    (12, 2): list("ABCD"),
    (13, 1): list("ABC"),
    (14, 2): list("ABCDEFGHI"),
    (15, 2): list("ABCDEFGHIJKL"),
    (15, 4): list("ABCDEFG"),
    (16, 3): list("ABCDEFGHI"),
    (16, 4): list("ABCDE"),
    (17, 3): list("ABCDEFGH"),
    (19, 2): list("ABCDEFG"),
    (19, 3): list("ABCDEFG"),
}

MULTI_ANSWER_LABELS = {
    (3, 2, 3): [
        "You need to reserve a place",
        "It is free to account holders",
        "You get advice on how to improve your health",
        "It takes place in a special clinic",
        "It is cheaper this month",
    ],
    (4, 3, 1): [
        "He is receiving money from the government",
        "His family are willing to help him",
        "The college is giving him a small grant",
        "His local council is supporting him for a limited period",
        "A former employer is providing partial funding",
    ],
    (4, 3, 2): [
        "She is not sufficiently challenged",
        "The activity interferes with her studies",
        "She does not have enough time",
        "The activity is too demanding physically",
        "She does not think she is any good at the activity",
    ],
    (5, 1, 3): ["museum", "concert hall", "cinema", "sports centre", "swimming pool"],
    (6, 1, 2): ["computer", "computer disks", "dictionary", "translation exercises", "textbooks"],
    (7, 2, 2): ["food", "water", "cameras", "books", "bags", "pens", "worksheets"],
    (7, 2, 3): ["build model dinosaurs", "watch films", "draw dinosaurs", "find dinosaur eggs", "play computer games"],
    (7, 3, 2): ["climate change", "field trip activities", "geographical features", "impact of tourism", "myths and legends", "plant and animal life", "social history"],
    (10, 1, 2): ["art museum", "science museum", "shopping mall", "monument", "post office", "restaurant", "park"],
    (16, 3, 1): ["cans", "cooling tanks", "metal plates", "metal screws", "paint", "satellites", "whole rackets"],
    (19, 2, 2): ["It’s suitable for windy weather.", "The fire is lit below the bottom end of the bamboo.", "The bamboo is cut into equal lengths.", "The oven hangs from a stick.", "It cooks food by steaming it."],
    (19, 2, 3): ["Cooking doesn’t make poisonous fungi edible.", "Edible wild fungi can be eaten without cooking.", "Wild fungi are highly nutritious.", "Some edible fungi look very similar to poisonous varieties.", "Fungi which cannot be identified should only be eaten in small quantities."],
    (20, 3, 1): ["her mother is ill", "the doctor says Ann should do all the cooking and cleaning for her mother", "Ann and her mother cannot pay for extra help", "the neighbours are all too busy to help her mother", "she spends too much time playing computer games"],
    (20, 3, 4): ["they had not been introduced", "they went to different schools", "to prevent them realizing they were there for the experiment they had signed up for", "the other students were in uniform", "the professor did not want them to know each other"],
    (20, 4, 1): ["the media", "the internet", "types of message", "Yahoo", "advertising"],
}

PER_QUESTION_MULTI = {
    11: (["A", "C"], ["is an annual event", "lasts for one week", "is a free event", "happens in spring", "is more than 100 years old"]),
    12: (["A", "C"], ["is situated in Edinburgh", "was built 20 years ago", "regularly participates in the Doors Open event", "is 120 years old", "is open to visitors every day of the year"]),
    13: (["C", "D"], ["take place twice a day", "are more popular on Saturday", "run on Saturday and Sunday", "run four times a day", "finish at half past ten"]),
    14: (["A", "C"], ["must be booked in advance", "are already sold out", "are on sale at the information point", "must be booked online", "are available for from midday"]),
}

# Source groups whose answers may be entered in any order. The same accepted
# pool is placed on every numbered slot and answerPairId prevents duplicates
# from earning extra marks. The mechanism supports both two and three slots.
UNORDERED_RANGES = {
    (3, 19, 20), (4, 21, 22), (4, 23, 24), (5, 9, 10),
    (6, 6, 7), (7, 16, 18), (7, 19, 20), (7, 25, 27),
    (10, 5, 7), (13, 15, 17), (16, 21, 23),
    (19, 17, 18), (19, 19, 20), (20, 6, 8), (20, 21, 23),
    (20, 28, 29), (20, 31, 32),
}

# The publisher page for Test 11 jumps directly from question 13 to question
# 15. Keep q14 as a numbered slot for an honest 1-40 paper, but never score an
# answer to wording and options that the authorized source does not contain.
UNSCORED_SOURCE_QUESTIONS = {(11, 14)}

# Unordered answer groups. Both slots receive the same answer set so the
# player can assign the selections as a pair using answerPairId.
PAIRS = {
    (3, 19): ("test3-q19-q20", ["A", "E"]), (3, 20): ("test3-q19-q20", ["A", "E"]),
    (4, 21): ("test4-q21-q22", ["B", "E"]), (4, 22): ("test4-q21-q22", ["B", "E"]),
    (4, 23): ("test4-q23-q24", ["A", "C"]), (4, 24): ("test4-q23-q24", ["A", "C"]),
    (5, 9): ("test5-q9-q10", ["B", "E"]), (5, 10): ("test5-q9-q10", ["B", "E"]),
}

# Canonical values copied from the publisher's answer panels. Keeping these
# explicit lets the importer detect accidental source-key drift in review.
ANSWERS = {
    1: "300|sunshade|balcony|forest(s)|319|10,000|relative|missed|item|Ludlow|C|A|C|E|H|F|C|G|120|5-12|fishing industry|statistics|note-taking|confidence|ideas|student support|places|general|3 times|25|B|A|glass|insulation|windows|electricity|floor(s)|waste|concrete|15 years".split("|"),
    2: "Bhatt|31 March|nursing|2|meat|bedsit|theatre|mature/ older|town|shared|trees|Friday/ Sunday|farm|C|B|A|A|I|F|E|C|B|B|C|reading|CD|workbooks|timetable/ schedule|alarm|email(s)|central|conversation(s)|effectively|risk(s)|levels|description(s)|technical|change|responsibility|flexible".split("|"),
    3: "answer(ing) phone|Hillsdunne road|library|4.45|national holidays|after 11'o clock|clear voice|think quickly|22 october|Manuja|branch|west|clothing|10|running|bags|A|A|A|E|B|C|B|A|C|B|A|B|C|B|tide(s)|hearing/ ear/ ears|plants and animals|feeding|noise(s)|healthy|group|social|leader|network(s)".split("|"),
    4: "waiter(s)|day off|break|(free) meal|dark (colored)|jacket|28 June|Urwin|12.00 pm/ noon|reference|A|B|B|C|D|G|B|F|A|E|B|E|A|C|B|C|priorities|timetable|(small) tasks|(single) paragraph|C|B|C|A|B|B|animal/ creature|sea/ water level|hunting|creation".split("|"),
    5: "central|600|2 years|garage|garden|study|noisy|595|B|E|classical music concerts|bookshop|planned|1983|city council|363|garden hall|three lives|4.50|faces of China|C|C|A|B|C|A|C|A|B|C|B|B|B|A|combination/ system|safety|attitude|control|factory|skills".split("|"),
}


def fetch(n: int) -> tuple[str, BeautifulSoup, Tag, str]:
    CACHE.mkdir(parents=True, exist_ok=True)
    url = SOURCE_URLS.get(n, SOURCE_TEMPLATE.format(n=n))
    path = CACHE / f"{n}.html"
    if not path.exists() or SOURCE_URLS.get(n) and url not in path.read_text(encoding="utf-8", errors="ignore"):
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        path.write_text(response.text, encoding="utf-8")
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    body = soup.select_one(".entry-content")
    if body is None:
        raise RuntimeError(f"No entry-content found at {url}")
    audio = body.select_one("audio[src]") or body.select_one("audio source[src]")
    audio_src = audio.get("src", "") if audio else ""
    if not audio_src:
        raise RuntimeError(f"No audio found at {url}")
    return url, soup, body, urljoin(url, audio_src.split("?", 1)[0])


def download(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size:
        return
    response = requests.get(url, timeout=120)
    response.raise_for_status()
    path.write_bytes(response.content)


def normalise_answer(value: str) -> list[str]:
    value = " ".join(value.replace("’", "'").split()).strip(" .")
    value = re.sub(r"\s*\(in any order.*$", "", value, flags=re.I).strip()
    infix = re.fullmatch(r"(.*?)\(([A-Za-z]+)\)(.*)", value)
    if infix and (infix.group(1) or infix.group(3)):
        prefix, ending, tail = infix.groups()
        variants = [(prefix + tail).strip(), (prefix + ending + tail).strip()]
    else:
        optional = re.fullmatch(r"\(([^()]+)\)\s+(.+)", value)
        variants = [f"{optional.group(1)} {optional.group(2)}", optional.group(2)] if optional and len(optional.group(1).split()) <= 2 else [value]
    out: list[str] = []
    for variant in variants:
        out.extend(p.strip() for p in re.split(r"\s*/\s*", variant) if p.strip())
    return list(dict.fromkeys(out or [value]))


def parse_answers(n: int, body: Tag) -> list[str]:
    box = body.select_one('[id^="bg-showmore-hidden"]')
    text = " ".join(box.get_text(" ", strip=True).split()) if box else ""
    # Test 16 leaves the standard hidden container empty and puts its key in
    # the paragraph immediately after the Show Answers control.
    if not text:
        show = next((node for node in body.find_all(recursive=False) if node.get_text(" ", strip=True).lower() == "show answers"), None)
        sibling = show.find_next_sibling() if show else None
        text = " ".join(sibling.get_text(" ", strip=True).split()) if sibling else ""
    if not text:
        raise RuntimeError(f"No answer key found for test {n}")
    found = list(re.finditer(r"(?:^|\s)(\d+)\.\s*", text))
    source_numbers = [int(m.group(1)) for m in found]
    if source_numbers != list(range(1, 41)):
        raise RuntimeError(f"Answer key for test {n} does not contain exactly 1-40")
    answers = []
    for i, match in enumerate(found):
        answer = text[match.end():(found[i + 1].start() if i + 1 < len(found) else len(text))].strip(" .�")
        answer = answer.replace("’", "'")
        answer = re.sub(r"\s*\(in any order.*?\)$", "", answer, flags=re.I).strip()
        answers.append(answer)
    if any(not answer for answer in answers):
        raise RuntimeError(f"Answer key for test {n} contains an empty answer")
    if n in ANSWERS and answers != ANSWERS[n]:
        raise RuntimeError(f"Publisher answer key drifted for test {n}")
    ANSWERS[n] = answers
    return answers


def section_nodes(body: Tag) -> list[list[Tag]]:
    children = []
    for child in body.find_all(recursive=False):
        if not isinstance(child, Tag):
            continue
        text = " ".join(child.get_text(" ", strip=True).split())
        if child.name in {"button", "input"} or str(child.get("id", "")).startswith("bg-showmore") or text.lower() == "show answers":
            break
        children.append(child)
    starts = []
    for index, child in enumerate(children):
        text = " ".join(child.get_text(" ", strip=True).split())
        if re.match(r"^(?:Part|Section)\s*\d\s*:?", text, re.I):
            starts.append(index)
    if len(starts) == 3:
        first = next((i for i, child in enumerate(children) if child.get_text(" ", strip=True)), 0)
        if re.match(r"^Questions?\s+1(?:\D|$)", children[first].get_text(" ", strip=True), re.I):
            starts.insert(0, first)
    if len(starts) != 4:
        raise RuntimeError(f"Expected four sections, found {len(starts)}")
    return [children[start:(starts[i + 1] if i + 1 < len(starts) else len(children))] for i, start in enumerate(starts)]


ALLOWED_TAGS = {"p", "div", "span", "strong", "b", "em", "i", "br", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "ul", "ol", "li", "figure", "figcaption", "img", "h2", "h3", "h4"}


def is_duplicate_entry_row(text: str) -> bool:
    """True for source rows that only repeat numbered answer input boxes."""
    compact = re.sub(r"\b(?:and|or)\b|[()\s,&/]", "", text, flags=re.I)
    return bool(compact and re.fullmatch(r"\d{1,2}(?:\d{1,2})+", compact))


TEXT_ENTRY_TYPES = {
    "sentence-completion",
    "table-completion",
    "diagram-labelling",
    "matching-features",
    "categorisation",
}


def answer_blank(soup: BeautifulSoup, number: int, *, continuation: bool = False) -> Tag:
    """Build a visible, non-interactive answer location for the question paper."""
    blank = soup.new_tag("span")
    blank["class"] = "listening-answer-blank" + (" listening-answer-blank-continuation" if continuation else "")
    blank["role"] = "img"
    blank["aria-label"] = (
        f"Additional blank for question {number}" if continuation else f"Blank for question {number}"
    )
    if not continuation:
        blank["data-question"] = str(number)
        marker = soup.new_tag("span")
        marker["class"] = "listening-answer-number"
        marker.string = f"({number})"
        blank.append(marker)
    line = soup.new_tag("span")
    line["class"] = "listening-answer-line"
    line["aria-hidden"] = "true"
    line.string = "\u00a0"
    blank.append(line)
    return blank


def question_refs_before(element: Tag, first: int, last: int) -> list[int]:
    """Find explicit question markers before an input inside its source block.

    Only `(12)` and line-leading `12.` forms count. Prices, dates, percentages,
    times and ranges are deliberately ignored.
    """
    parent = element.find_parent(["p", "td", "li", "div"]) or element.parent
    pieces: list[str] = []
    for descendant in parent.descendants:
        if descendant is element:
            break
        if isinstance(descendant, Tag) and descendant.name == "br":
            pieces.append("\n")
        elif isinstance(descendant, NavigableString):
            if descendant.find_parent(class_="listening-answer-blank") is not None:
                continue
            pieces.append(str(descendant))
    text = "".join(pieces)
    refs: list[int] = []
    for match in re.finditer(r"\(\s*(\d{1,2})\s*\)|(?:^|\n)\s*(\d{1,2})\.(?!\d)", text):
        number = int(match.group(1) or match.group(2))
        if first <= number <= last:
            refs.append(number)
    return refs


def previous_marker(element: Tag, number: int) -> Tag | None:
    parent = element.find_parent(["p", "td", "li", "div"]) or element.parent
    for ancestor in element.parents:
        if ancestor is parent:
            break
        if isinstance(ancestor, Tag) and ancestor.name in {"strong", "b"}:
            for child in list(ancestor.children):
                if isinstance(child, NavigableString) and re.fullmatch(rf"\s*\(\s*{number}\s*\)\s*", str(child)):
                    child.extract()
    candidate: Tag | None = None
    for descendant in parent.descendants:
        if descendant is element:
            break
        if (
            isinstance(descendant, Tag)
            and descendant.name in {"strong", "b"}
            and element not in descendant.descendants
            and re.fullmatch(rf"\(\s*{number}\s*\)", descendant.get_text(" ", strip=True))
        ):
            candidate = descendant
    return candidate


def previous_blank_on_same_line(element: Tag) -> int | None:
    parent = element.find_parent(["p", "td", "li", "div"]) or element.parent
    for previous in element.previous_elements:
        if previous is parent:
            break
        if isinstance(previous, Tag) and previous.name == "br":
            return None
        if isinstance(previous, Tag) and "listening-answer-blank" in previous.get("class", []):
            value = previous.get("data-question")
            return int(value) if value else None
    return None


def replace_text_with_blank(
    soup: BeautifulSoup,
    text_node: NavigableString,
    pattern: re.Pattern[str],
    emitted: set[int],
) -> None:
    """Replace every numbered source dot-run in one text node with real markup."""
    text = str(text_node)
    matches = list(pattern.finditer(text))
    if not matches:
        return
    cursor = 0
    for match in matches:
        if match.start() > cursor:
            text_node.insert_before(NavigableString(text[cursor:match.start()]))
        number = int(match.group("number"))
        between = match.groupdict().get("between") or ""
        text_node.insert_before(answer_blank(soup, number, continuation=number in emitted))
        emitted.add(number)
        if between.strip():
            text_node.insert_before(NavigableString(" " + between.strip() + " "))
        cursor = match.end()
    if cursor < len(text):
        text_node.insert_before(NavigableString(text[cursor:]))
    text_node.extract()


def replace_unlabelled_dot_runs(soup: BeautifulSoup, wrapper: Tag) -> None:
    """Keep a second physical line that belongs to the same numbered answer."""
    pattern = re.compile(r"(?:\.{3,}|…{2,}|·{2,}|_{2,}|-{2,})(?:\s*[.…·_\-]+)*")
    for text_node in list(wrapper.find_all(string=True)):
        if not pattern.search(str(text_node)):
            continue
        number: int | None = None
        for previous in text_node.previous_elements:
            if isinstance(previous, Tag) and previous.name == "br":
                break
            if isinstance(previous, Tag) and "listening-answer-blank" in previous.get("class", []):
                value = previous.get("data-question")
                if value:
                    number = int(value)
                    break
            if previous is text_node.parent:
                break
        if number is None:
            continue
        text = str(text_node)
        cursor = 0
        for match in pattern.finditer(text):
            if match.start() > cursor:
                text_node.insert_before(NavigableString(text[cursor:match.start()]))
            text_node.insert_before(answer_blank(soup, number, continuation=True))
            cursor = match.end()
        if cursor < len(text):
            text_node.insert_before(NavigableString(text[cursor:]))
        text_node.extract()


def split_br_html(tag: Tag) -> list[str]:
    inner = "".join(str(child) for child in tag.contents)
    return [piece.strip() for piece in re.split(r"<br\s*/?>", inner, flags=re.I) if piece.strip()]


def fragment_text(fragment: str) -> str:
    return " ".join(BeautifulSoup(fragment, "html.parser").get_text(" ", strip=True).split())


def append_fragment(soup: BeautifulSoup, target: Tag, fragment: str) -> None:
    parsed = BeautifulSoup(fragment, "html.parser")
    for child in list(parsed.contents):
        target.append(child)


def structure_choice_questions(soup: BeautifulSoup, wrapper: Tag, first: int, last: int) -> None:
    """Turn source paragraphs of prompt + BR-separated options into real rows."""
    for paragraph in list(wrapper.find_all("p")):
        pieces = split_br_html(paragraph)
        if len(pieces) < 3:
            continue
        prompt_index = next(
            (
                index
                for index, piece in enumerate(pieces[:2])
                if re.match(r"\d{1,2}(?:\.(?!\d)|\s)\s*\S", fragment_text(piece))
            ),
            None,
        )
        if prompt_index is None:
            continue
        prompt_text = fragment_text(pieces[prompt_index])
        prompt_match = re.match(r"(\d{1,2})(?:\.(?!\d)|\s)\s*(.*)", prompt_text)
        if not prompt_match:
            continue
        number = int(prompt_match.group(1))
        if not first <= number <= last:
            continue
        options: list[tuple[str, str]] = []
        for piece in pieces[prompt_index + 1:]:
            option_text = fragment_text(piece)
            option_match = re.match(r"([A-I])\s+(.+)", option_text)
            if option_match:
                options.append((option_match.group(1), option_match.group(2)))
        if len(options) < 2:
            continue
        question = soup.new_tag("article")
        question["class"] = "listening-source-question"
        question["data-question"] = str(number)
        prompt = soup.new_tag("p")
        prompt["class"] = "listening-source-prompt"
        number_tag = soup.new_tag("span")
        number_tag["class"] = "listening-source-question-number"
        number_tag.string = str(number)
        prompt.append(number_tag)
        prompt.append(NavigableString(prompt_match.group(2)))
        question.append(prompt)
        option_list = soup.new_tag("ol")
        option_list["class"] = "listening-source-options"
        for label, copy in options:
            item = soup.new_tag("li")
            item["data-option"] = label
            key = soup.new_tag("span")
            key["class"] = "listening-source-option-key"
            key.string = label
            value = soup.new_tag("span")
            value.string = copy
            item.extend([key, value])
            option_list.append(item)
        question.append(option_list)
        if prompt_index:
            title = soup.new_tag("p")
            title["class"] = "listening-source-title"
            append_fragment(soup, title, pieces[0])
            paragraph.insert_before(title)
        paragraph.replace_with(question)


def ensure_choice_questions(soup: BeautifulSoup, wrapper: Tag, first: int, last: int) -> list[int]:
    """Structure image-based MCQs and expose publisher omissions honestly."""
    present = {
        int(question["data-question"])
        for question in wrapper.select("article.listening-source-question[data-question]")
    }
    source_missing: list[int] = []
    for number in range(first, last + 1):
        if number in present:
            continue
        paragraph = next(
            (
                node
                for node in wrapper.find_all("p")
                if re.match(rf"{number}(?:\.(?!\d)|\s)\s*\S", node.get_text(" ", strip=True))
            ),
            None,
        )
        prompt_copy = ""
        if paragraph is not None:
            prompt_copy = re.sub(
                rf"^{number}(?:\.(?!\d)|\s)\s*",
                "",
                paragraph.get_text(" ", strip=True),
                count=1,
            )
        else:
            prompt_copy = "This question is missing from the published question paper."
            source_missing.append(number)
        question = soup.new_tag("article")
        question["class"] = "listening-source-question"
        question["data-question"] = str(number)
        if number in source_missing:
            question["data-source-missing"] = "true"
        prompt = soup.new_tag("p")
        prompt["class"] = "listening-source-prompt"
        number_tag = soup.new_tag("span")
        number_tag["class"] = "listening-source-question-number"
        number_tag.string = str(number)
        prompt.extend([number_tag, NavigableString(prompt_copy)])
        question.append(prompt)
        if paragraph is not None:
            options = soup.new_tag("ol")
            options["class"] = "listening-source-options"
            for label in ("A", "B", "C"):
                item = soup.new_tag("li")
                item["data-option"] = label
                key = soup.new_tag("span")
                key["class"] = "listening-source-option-key"
                key.string = label
                copy = soup.new_tag("span")
                copy.string = "See the labelled option in the question image." if wrapper.find("img") else f"Option {label}"
                item.extend([key, copy])
                options.append(item)
            question.append(options)
        if paragraph is not None:
            paragraph.replace_with(question)
        else:
            wrapper.append(question)
    return source_missing


def structure_numbered_rows(soup: BeautifulSoup, wrapper: Tag, first: int, last: int) -> None:
    """Group BR-separated source prompts as scannable question rows."""
    for paragraph in list(wrapper.find_all("p")):
        pieces = split_br_html(paragraph)
        entries: list[tuple[int | None, str]] = []
        for piece in pieces:
            text = fragment_text(piece)
            match = re.match(r"(\d{1,2})\.(?!\d)\s*(.*)", text)
            if match and first <= int(match.group(1)) <= last:
                # Remove only the line-leading source number. Any prices,
                # dates or percentages in the rest of the row remain intact.
                cleaned = re.sub(r"^\s*\d{1,2}\.(?!\d)\s*", "", piece, count=1)
                entries.append((int(match.group(1)), cleaned))
            elif (piece_soup := BeautifulSoup(piece, "html.parser")).select_one(
                ".listening-answer-blank[data-question]"
            ):
                blank = piece_soup.select_one(".listening-answer-blank[data-question]")
                assert blank is not None
                number = int(blank["data-question"])
                if first <= number <= last:
                    entries.append((number, piece))
            else:
                entries.append((None, piece))
        if sum(number is not None for number, _piece in entries) < 2:
            continue
        block = soup.new_tag("div")
        block["class"] = "listening-source-question-list"
        block["role"] = "list"
        seen_question = False
        for number, piece in entries:
            if number is None:
                supporting = soup.new_tag("p" if not seen_question else "div")
                supporting["class"] = "listening-source-title" if not seen_question else "listening-source-support-row"
                append_fragment(soup, supporting, piece)
                block.append(supporting)
                continue
            seen_question = True
            row = soup.new_tag("div")
            row["class"] = "listening-source-question-row"
            row["role"] = "listitem"
            row["data-question-row"] = str(number)
            append_fragment(soup, row, piece)
            block.append(row)
        paragraph.replace_with(block)


def ensure_matching_rows(wrapper: Tag) -> None:
    """Mark one-line matching prompts that do not share a BR-separated block."""
    for blank in wrapper.select(".listening-answer-blank[data-question]"):
        if blank.find_parent(class_="listening-source-question-row") is not None:
            continue
        if blank.find_parent("table") is not None:
            wrapper_tag = BeautifulSoup("<span></span>", "html.parser").span
            assert wrapper_tag is not None
            wrapper_tag["class"] = "listening-source-question-row listening-source-table-question-row"
            wrapper_tag["role"] = "listitem"
            wrapper_tag["data-question-row"] = str(blank["data-question"])
            blank.wrap(wrapper_tag)
            continue
        container = blank.find_parent("p")
        if container is None:
            continue
        number = str(blank["data-question"])
        container.name = "div"
        classes = list(container.get("class", []))
        if "listening-source-question-row" not in classes:
            classes.append("listening-source-question-row")
        container["class"] = classes
        container["role"] = "listitem"
        container["data-question-row"] = number


def structure_legend(soup: BeautifulSoup, wrapper: Tag) -> None:
    """Convert dense matching legends into a key-and-label list."""
    for paragraph in list(wrapper.find_all("p")):
        strong_letters = [
            node.get_text(" ", strip=True)
            for node in paragraph.find_all(["strong", "b"])
            if re.fullmatch(r"[A-I]", node.get_text(" ", strip=True))
        ]
        if len(strong_letters) < 3:
            continue
        text = " ".join(paragraph.get_text(" ", strip=True).split())
        matches = list(re.finditer(r"(?:^|\s)([A-I])\s+(?=\S)", text))
        entries: list[tuple[str, str]] = []
        for index, match in enumerate(matches):
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            label = text[match.end():end].strip()
            if label:
                entries.append((match.group(1), label))
        if len(entries) < 3:
            continue
        legend = soup.new_tag("dl")
        legend["class"] = "listening-source-legend"
        for key_text, label in entries:
            item = soup.new_tag("div")
            key = soup.new_tag("dt")
            key.string = key_text
            value = soup.new_tag("dd")
            value.string = label
            item.extend([key, value])
            legend.append(item)
        paragraph.replace_with(legend)


def structure_note_blocks(soup: BeautifulSoup, wrapper: Tag) -> None:
    """Give short source form and note lines a stable reading rhythm."""
    for paragraph in list(wrapper.find_all("p")):
        pieces = split_br_html(paragraph)
        if len(pieces) < 2 or any(re.match(r"\d{1,2}\.(?!\d)", fragment_text(piece)) for piece in pieces):
            continue
        if not any("listening-answer-blank" in piece or ":" in fragment_text(piece) or fragment_text(piece).startswith(("•", "-")) for piece in pieces):
            continue
        block = soup.new_tag("div")
        block["class"] = "listening-source-note-block"
        for piece in pieces:
            probe = BeautifulSoup(piece, "html.parser")
            for blank in probe.select(".listening-answer-blank"):
                blank.decompose()
            if not probe.get_text(" ", strip=True) and block.contents:
                block.contents[-1].append(NavigableString(" "))
                append_fragment(soup, block.contents[-1], piece)
                continue
            row = soup.new_tag("div")
            row["class"] = "listening-source-note-row"
            append_fragment(soup, row, piece)
            block.append(row)
        paragraph.replace_with(block)


def remove_duplicate_marker_before_blanks(wrapper: Tag) -> None:
    """Remove a source `(N)` left beside the generated `(N) ______` marker."""
    for blank in wrapper.select(".listening-answer-blank[data-question]"):
        number = blank.get("data-question")
        sibling = blank.previous_sibling
        while isinstance(sibling, Tag) and not sibling.get_text(" ", strip=True):
            previous = sibling.previous_sibling
            sibling.decompose()
            sibling = previous
        if isinstance(sibling, NavigableString):
            cleaned = re.sub(rf"\(\s*{number}\s*\)\s*$", "", str(sibling))
            if cleaned != str(sibling):
                sibling.replace_with(NavigableString(cleaned))
        elif isinstance(sibling, Tag) and re.fullmatch(rf"\(\s*{number}\s*\)", sibling.get_text(" ", strip=True)):
            sibling.decompose()


def remove_placeholder_fragments_after_blanks(wrapper: Tag) -> None:
    """Consume only repeated source filler marks immediately after a blank."""
    for blank in wrapper.select(".listening-answer-blank"):
        sibling = blank.next_sibling
        if not isinstance(sibling, NavigableString):
            continue
        text = str(sibling)
        match = re.match(r"^(\s*)((?:[.…·_\-]+\s*)+)", text)
        if not match:
            continue
        marks = re.sub(r"\s", "", match.group(2))
        if len(marks) < 2:
            continue
        remainder = text[match.end():]
        sibling.replace_with(NavigableString((" " if match.group(1) else "") + remainder))


def sanitise(
    nodes: list[Tag],
    image_paths: dict[str, str],
    first: int,
    last: int,
    kind: str,
) -> tuple[str, list[int]]:
    soup = BeautifulSoup("<div></div>", "html.parser")
    wrapper = soup.div
    assert wrapper is not None
    for original in nodes:
        clone = BeautifulSoup(str(original), "html.parser")
        root = clone.find()
        if root is None:
            continue
        root_text = " ".join(root.get_text(" ", strip=True).split())
        if root.name in {"script", "style", "form", "input", "button", "iframe", "noscript", "audio", "video"} or str(root.get("id", "")).startswith("bg-showmore"):
            continue
        for bad in root.select("script, style, form, button, iframe, noscript, audio, video, [id^='bg-showmore']"):
            bad.decompose()
        for element in [root, *root.find_all(True)]:
            if element.name == "input":
                # Keep source answer controls just long enough to replace them
                # with visible, non-interactive question-paper blanks below.
                continue
            if element.name not in ALLOWED_TAGS:
                element.unwrap()
                continue
            if element.name == "img":
                source = element.get("data-src") or element.get("src") or ""
                local = image_paths.get(source) or image_paths.get(urljoin(SOURCE_ORIGIN, source))
                if local:
                    element.attrs = {"src": local, "alt": element.get("alt") or "Listening question diagram"}
                else:
                    element.decompose()
            else:
                element.attrs = {}
                if element.name == "figure" and element.find("table"):
                    element.attrs = {"class": "listening-source-table"}
                elif element.name == "figure" and element.find("img"):
                    element.attrs = {"class": "listening-source-figure"}
                elif element.name == "ul":
                    element.attrs = {"class": "listening-source-notes"}
                elif element.name == "ol":
                    element.attrs = {"class": "listening-source-options"}
        for text_node in root.find_all(string=True):
            cleaned = re.sub(r"(?<=\w)�(?=\w)", "'", str(text_node)).replace("�", "-")
            text_node.replace_with(cleaned)
        wrapper.append(root)

    # Some publisher tables use dot-runs in the real cells and then repeat a
    # detached grid of empty inputs underneath. Keep the contextual table
    # locations and remove only that proven duplicate grid.
    dotted_questions: set[int] = set()
    dotted_pattern = re.compile(
        r"\(\s*(?P<number>\d{1,2})\s*\)(?P<between>\s*[^A-Za-z0-9()\n]{0,4}?)(?:\.{2,}|…{2,}|·{2,}|_{2,}|-{2,})(?:\s*[.…·_\-]+)*"
    )
    for text_node in wrapper.find_all(string=True):
        for match in dotted_pattern.finditer(str(text_node)):
            number = int(match.group("number"))
            if first <= number <= last:
                dotted_questions.add(number)
    for container in list(wrapper.find_all(["p", "div"])):
        inputs = [node for node in container.find_all("input") if node.get("type", "text").lower() not in {"checkbox", "radio", "hidden"}]
        refs = [int(value) for value in re.findall(r"\((\d{1,2})\)", container.get_text(" ", strip=True))]
        if inputs and refs and is_duplicate_entry_row(container.get_text(" ", strip=True)) and set(refs).issubset(dotted_questions):
            container.decompose()

    emitted: set[int] = set()
    fallback = first
    for source_input in list(wrapper.find_all("input")):
        input_type = source_input.get("type", "text").lower()
        if input_type in {"checkbox", "radio", "hidden"}:
            source_input.decompose()
            continue
        refs = question_refs_before(source_input, first, last)
        same_line_number = previous_blank_on_same_line(source_input) if not refs else None
        number = refs[-1] if refs else (same_line_number or fallback)
        while number in emitted and fallback <= last:
            # Repeated inputs immediately following one explicit marker are a
            # continuation of that answer (for example "knives and forks").
            if refs or same_line_number is not None:
                break
            fallback += 1
            number = fallback
        marker = previous_marker(source_input, number)
        if marker is not None:
            marker.decompose()
        source_input.replace_with(answer_blank(soup, number, continuation=number in emitted))
        emitted.add(number)
        fallback = max(fallback, number + 1)

    # Convert source dot-runs after real inputs, so a detached input grid can
    # never become a second visible answer area for the same table question.
    for text_node in list(wrapper.find_all(string=True)):
        replace_text_with_blank(soup, text_node, dotted_pattern, emitted)
    replace_unlabelled_dot_runs(soup, wrapper)

    # A small number of sources retain a numbered marker but lose the original
    # input in malformed HTML. The marker itself is the semantic location.
    if kind in TEXT_ENTRY_TYPES:
        for number in range(first, last + 1):
            if number in emitted:
                continue
            marker = next(
                (
                    node
                    for node in wrapper.find_all(["strong", "b", "span"])
                    if re.fullmatch(rf"\(\s*{number}\s*\)", node.get_text(" ", strip=True))
                ),
                None,
            )
            if marker is not None:
                marker.replace_with(answer_blank(soup, number))
                emitted.add(number)

    # Maps and diagrams often print their lines and numbers inside the bitmap.
    # A compact keyed area beside the image makes those locations readable and
    # accessible without modifying or guessing positions inside the artwork.
    if kind == "diagram-labelling" and wrapper.find("img"):
        unresolved = [number for number in range(first, last + 1) if number not in emitted]
        if unresolved:
            key = soup.new_tag("div")
            key["class"] = "listening-diagram-key"
            key["aria-label"] = "Diagram answer locations"
            for number in unresolved:
                key.append(answer_blank(soup, number))
                emitted.add(number)
            wrapper.append(key)

    remove_duplicate_marker_before_blanks(wrapper)
    remove_placeholder_fragments_after_blanks(wrapper)
    structure_choice_questions(soup, wrapper, first, last)
    if kind == "multiple-choice":
        ensure_choice_questions(soup, wrapper, first, last)
    structure_numbered_rows(soup, wrapper, first, last)
    if kind in {"matching-features", "categorisation"}:
        ensure_matching_rows(wrapper)
    structure_legend(soup, wrapper)
    structure_note_blocks(soup, wrapper)

    for empty_inline in list(wrapper.select("strong, b, em, i")):
        if not empty_inline.get_text(" ", strip=True) and not empty_inline.find(True):
            empty_inline.decompose()
    for empty in wrapper.select("p, div"):
        if not empty.get_text(" ", strip=True) and not empty.find(["img", "table"]):
            empty.decompose()
    missing = [number for number in range(first, last + 1) if kind in TEXT_ENTRY_TYPES and number not in emitted]
    return "".join(str(child) for child in wrapper.children).strip(), missing


def heading_range(text: str) -> tuple[int, int] | None:
    match = re.search(r"Questions?\s+(\d+)(?:\s*(?:-|and)\s*(\d+))?", text, re.I)
    if not match:
        return None
    first = int(match.group(1))
    last = int(match.group(2) or first)
    return min(first, last), max(first, last)


def content_after_embedded_heading(node: Tag) -> Tag | None:
    """Keep content when a source puts the group heading and task in one P."""
    if node.name != "p":
        return None
    pieces = split_br_html(node)
    while pieces:
        text = fragment_text(pieces[0])
        if re.match(r"^(?:(?:Part|Section)\s*\d\s*:\s*)?Questions?\s+\d", text, re.I):
            pieces.pop(0)
            continue
        if re.match(r"^(?:Complete|Choose|Write|Answer|Label|List|Match)\b", text, re.I):
            pieces.pop(0)
            continue
        break
    if not pieces:
        return None
    parsed = BeautifulSoup("<p></p>", "html.parser")
    paragraph = parsed.p
    assert paragraph is not None
    for index, piece in enumerate(pieces):
        if index:
            paragraph.append(parsed.new_tag("br"))
        append_fragment(parsed, paragraph, piece)
    return paragraph


def semantic_question_html(nodes: list[Tag], metas: list[tuple[int, int, str, str]], image_paths: dict[str, str]) -> str:
    buckets: list[list[Tag]] = [[] for _ in metas]
    current = 0

    def group_index(number: int) -> int | None:
        return next((i for i, (first, last, _kind, _instruction) in enumerate(metas) if first <= number <= last), None)

    for node in nodes:
        text = " ".join(node.get_text(" ", strip=True).split())
        has_visual = node.name == "img" or node.find("img") is not None
        if (not text and not has_visual) or node.name in {"audio", "button", "input"}:
            continue
        detected = heading_range(text)
        if detected and re.match(r"^(?:(?:Part|Section)\s*\d\s*:\s*)?Questions?\s+", text, re.I):
            found = group_index(detected[0])
            if found is not None:
                current = found
            # The generated header preserves the range and full instruction.
            # Test 12 nests its diagram inside the heading paragraph itself.
            if node.find("img") is not None:
                buckets[current].append(node.find("img"))
            remainder = content_after_embedded_heading(node)
            if remainder is not None and (remainder.find("input") is not None or len(split_br_html(remainder)) > 1):
                buckets[current].append(remainder)
            continue
        refs = [int(a or b) for a, b in re.findall(r"\((\d{1,2})\)|(?:^|\s)(\d{1,2})\.(?=\s)", text)]
        if refs:
            found = group_index(refs[0])
            if found is not None:
                current = found
        # Keep source entry rows until sanitise can determine whether they are
        # proven duplicates of contextual dot-runs. Diagram keys and list-only
        # questions often consist of numbers plus inputs and must survive.
        buckets[current].append(node)

    sections = []
    unmapped: list[int] = []
    for meta, bucket in zip(metas, buckets):
        first, last, kind, instruction = meta
        range_label = f"Question {first}" if first == last else f"Questions {first}-{last}"
        content, missing = sanitise(bucket, image_paths, first, last, kind)
        unmapped.extend(missing)
        sections.append(
            f'<section class="listening-source-group" data-question-start="{first}" data-question-end="{last}" data-question-type="{kind}">'
            f'<header class="listening-source-header"><p class="listening-source-range">{range_label}</p>'
            f'<p class="listening-source-instruction">{escape(instruction)}</p></header>{content}</section>'
        )
    if unmapped:
        raise RuntimeError(f"Could not place visible answer blanks for questions {unmapped}")
    return "".join(sections)


def question_text(section: list[Tag]) -> str:
    return " ".join(" ".join(node.get_text(" ", strip=True).split()) for node in section)


def prompt_for(text: str, number: int) -> str:
    # Requiring whitespace (or start of text) before the number avoids taking
    # the end of a range such as `14-20.` as question 20.
    match = re.search(rf"(?:^|\s){number}\.(?!\d)\s+(.*?)(?=\s+\d+\.(?!\d)\s|\s+Questions?\b|\s+(?:Part|Section)\s+\d\b|$)", text, re.I)
    if not match:
        return f"Question {number}"
    prompt = re.split(r"\s+A\s+", match.group(1), maxsplit=1)[0].strip()
    return prompt or f"Question {number}"


def options_for(n: int, section_index: int, group_index: int, kind: str) -> list[str] | None:
    if kind == "matching-features":
        if (n, section_index, group_index) == (16, 3, 2):
            return list("ABCDE")
        return MAP_OPTIONS.get((n, section_index), list("ABCDEFGH"))
    if kind == "multiple-answer":
        return MULTI_ANSWER_LABELS.get((n, section_index, group_index), list("ABCDE"))
    return None


def make_group(n: int, section_index: int, group_index: int, meta: tuple[int, int, str, str], section_text: str) -> dict:
    first, last, kind, instruction = meta
    questions = []
    unordered = (n, first, last) in UNORDERED_RANGES
    pooled_answers = list(dict.fromkeys(
        answer
        for value in ANSWERS[n][first - 1:last]
        for answer in normalise_answer(value)
    )) if unordered else []
    pair_id = f"test{n}-q{first}-q{last}" if unordered else None
    for number in range(first, last + 1):
        accepted = pooled_answers if unordered else normalise_answer(ANSWERS[n][number - 1])
        q: dict[str, object] = {"id": f"q{number}", "textHtml": escape(prompt_for(section_text, number)), "answer": accepted if len(accepted) > 1 else accepted[0]}
        if (n, number) in UNSCORED_SOURCE_QUESTIONS:
            q["scored"] = False
        if kind == "multiple-choice":
            q["options"] = ["A", "B", "C"]
        if pair_id:
            q["answerPairId"] = pair_id
        if n == 16 and number in PER_QUESTION_MULTI:
            correct, _labels = PER_QUESTION_MULTI[number]
            q["answer"] = ", ".join(correct)
            q["multiSelect"] = {"correctValues": correct, "selectCount": 2}
        questions.append(q)
    group_title = f"Question {first}" if first == last else f"Questions {first}-{last}"
    group: dict[str, object] = {"title": group_title, "type": kind, "instructionHtml": escape(instruction), "questions": questions}
    shared = options_for(n, section_index, group_index, kind)
    if shared:
        if kind == "multiple-answer":
            group["choices"] = [{"value": chr(ord("A") + i), "label": option} for i, option in enumerate(shared)]
        else:
            group["options"] = shared
    if kind == "multiple-answer":
        group["selectCount"] = 2 if n == 16 and first == last else last - first + 1
        if n == 16 and first == last:
            _correct, labels = PER_QUESTION_MULTI[first]
            group["choices"] = [{"value": chr(ord("A") + i), "label": label} for i, label in enumerate(labels)]
    word_match = re.search(r"NO MORE THAN\s+(ONE|TWO|THREE|FOUR)\s+WORDS?|\b(ONE|TWO|THREE|FOUR)\s+WORD(?:S)?\s+(?:ONLY|OR|AND)", instruction, re.I)
    if kind in {"sentence-completion", "diagram-labelling", "table-completion"} and word_match:
        word = next(value for value in word_match.groups() if value)
        group["wordLimit"] = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4}[word.upper()]
    return group


def emit_test(n: int) -> str:
    url, _soup, body, audio_url = fetch(n)
    parse_answers(n, body)
    audio_path = AUDIO_DIR / f"test-{n:03d}.mp3"
    download(audio_url, audio_path)
    image_paths: dict[str, str] = {}
    downloaded_images: dict[str, str] = {}
    for image in body.select("img"):
        source = image.get("data-src") or image.get("src") or ""
        if not source or source.startswith("data:"):
            continue
        absolute = urljoin(url, source)
        local_url = downloaded_images.get(absolute)
        if local_url is None:
            unique_index = len(downloaded_images) + 1
            suffix = Path(absolute.split("?", 1)[0]).suffix.lower() or ".png"
            local = IMAGE_DIR / f"test-{n:03d}{'' if unique_index == 1 else f'-{unique_index}'}{suffix}"
            download(absolute, local)
            local_url = f"/pics/listening/imported/{local.name}"
            downloaded_images[absolute] = local_url
        image_paths[source] = local_url
        image_paths[absolute] = local_url
    parts = []
    for section_index, nodes in enumerate(section_nodes(body), 1):
        text = question_text(nodes)
        metas = GROUPS[n][section_index - 1]
        parts.append({"label": f"Part {section_index}", "stimulus": {"kind": "audio", "label": f"Part {section_index}", "src": f"/audio/listening/test-{n:03d}.mp3", "questionHtml": semantic_question_html(nodes, metas, image_paths)}, "groups": [make_group(n, section_index, group_index, m, text) for group_index, m in enumerate(metas, 1)]})
    record = {"id": f"listening-full-{n:03d}", "skill": "listening", "title": f"IELTS Listening Test {n}", "description": "A full IELTS Listening practice test shared with permission by PracticePTEOnline.", "durationMinutes": 40, "audioSrc": f"/audio/listening/test-{n:03d}.mp3", "source": {"name": "PracticePTEOnline", "url": url, "permission": "Reused with permission from the publisher."}, "parts": parts}
    target = DATA_DIR / f"listening-full-{n:03d}.ts"
    target.write_text("import type { PracticeTest } from '../../lib/tests/schema';\n\nexport const listeningFull%03d: PracticeTest = %s;\n" % (n, json.dumps(record, ensure_ascii=False, indent=2)), encoding="utf-8")
    return str(target)


def main() -> None:
    for n in range(1, 21):
        print(f"Wrote {emit_test(n)} (40 answers)")
    print("Imported 20 tests with 800 answer slots and shared-permission source assets.")


if __name__ == "__main__":
    main()
