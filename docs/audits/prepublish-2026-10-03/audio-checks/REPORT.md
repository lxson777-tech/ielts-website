# Doubtful Listening answers checked against the recordings (3 October 2026)

Each item was cut from the site's own MP3 (originals untouched) and transcribed on this PC with
faster-whisper large-v3 with word timestamps; spelled names and doubtful words were also run at 0.8x and
0.7x. Segment transcripts are in `transcripts/`. No paid service was used. Times are positions in the
full recording.

| Item | What the recording says | Decision |
|---|---|---|
| Test 18 Q23 | "might be ten minutes. Or even less. Just mini-programmes, say, four to five minutes long." (14:57) | Key B kept. |
| Test 2 Q1 | "A-N-U-B-H-A-T-T", ending heard as "double T" (01:57) | Bhatt is right; note, Russian note, lesson copy and transcript fixed. |
| Test 3 Q2 | "H-I-double-L-S-D-U-double-N-E Road" (02:59) | Hillsdunne is right; note, Russian and transcript fixed. |
| Test 18 Q37 | "opened to the public in 1927" (21:55) | Printed year corrected to 1927; key unchanged. |
| Test 26 table | "a three-seater here, DFD44" (06:32) | Printed code corrected to DFD 44 (not a question). |
| Test 20 Q36 | "because they recognize the brand name and may not even know the name of the company" (21:56) | Printed wording corrected; key unchanged. |
| Test 13 Q19 | "£27.50 per hour for one-to-one lessons, plus £6 for each extra person" (12:03) | Printed "per person" corrected to "per hour"; key unchanged. |
| Test 23 | "Heathcote" (about 02:12) | Printed name corrected from Haethcote. |
| Test 28 | "William Whitfield", "the Whitfield family" (09:11, 09:30, 12:20) | Corrected in all six printed places. |
| Test 29 Q15 | "light snacks will be available all day" (09:02) | Key now "all day" (TWO WORDS limit). |
| Test 22 Q37 | "fishing, hiking, cycling, ice skating, and even going to the beach" (20:53) | Paper says "List three activities": any order now accepted (new `anyOrder` setting in the marker). |
| Test 30 Q4 | "I've enrolled for 20 weeks" (02:40); "about four months" refers to the homestay row | "5 months" removed (never said); "20 weeks" accepted. |
| Test 25 Q38 | "the speed and popularity of airliners" (22:59) | "airlines" removed (a different word, never said). |

Key changes are recorded in `tools/import_listening.py` ANSWER_OVERRIDES with the quoted audio as reason;
`tools/check_answer_overrides.py` reports 0 problems; Russian notes rewritten and checked. `npm test`
2614 of 2614, `npx astro check` 0 errors.

Noted, not changed: Test 2 Q2's note quotes the year of birth as 1972; clips hear both 1972 and 1970. The
key is only the date (31 March), so marking is not affected.
