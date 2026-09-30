# Mr EZ's help buttons: signed-in students only

Run on 2026-09-30 against a DEV server at http://127.0.0.1:4388/ielts-website, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at http://127.0.0.1:8835. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project or the real tutor: nothing below is evidence
about either. Every tutor reply here is the stand-in's own, and the page labels it simulated.

What changed (30 September 2026): "Explain this differently", "Show me an example" and
"Give me a hint" now exist only while a student is signed in. A visitor who is not signed in gets
no button and no note in their place; a sign-in shows them on the open page without a reload, and
a sign-out takes them away. The deterministic half is `tests/help-signed-in-only.test.ts`.

Every student, email and password here is SYNTHETIC, invented for this run.

## 1. Signed out, English

A fresh browser, nobody signed in, on a build where accounts ARE configured (the stand-in), which is the production situation for a visitor.

| Check | Result | Observed |
|---|---|---|
| [English, signed out] the lesson page has run its script and the account has answered | PASS | html lang="en", teaching blocks stamped=4, workspace menu offers Sign in=True |
| [English, signed out] the lesson page shows no help button under any block, none on the quick check, and no note in their place | PASS | help controls of any kind=0, block rows=0, quick-check hints=0, fallback note text found=none |

_screenshot **helpgate-01-lesson-signed-out-en-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_

_screenshot **helpgate-01-lesson-signed-out-en-phone.png**: url=`http://127.0.0.1:4388/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_
| [English, signed out] the guided exercise has loaded its six questions and shows no hint button and no note | PASS | answer controls=6, help controls of any kind=0, fallback note text found=none |

_screenshot **helpgate-02-exercise-signed-out-en-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_

_screenshot **helpgate-02-exercise-signed-out-en-phone.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| [English, signed out] the guided written task has loaded and shows no hint or example button and no note | PASS | answer box present=True, help controls of any kind=0, fallback note text found=none |

_screenshot **helpgate-02b-written-task-signed-out-en-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_

**Signed out, English:** no console errors, no failed/4xx/5xx requests.

## 2. Signed out, Russian

The same three pages, requested with ?lang=ru.

| Check | Result | Observed |
|---|---|---|
| [Russian, signed out] the lesson page has run its script and the account has answered | PASS | html lang="ru", teaching blocks stamped=4, workspace menu offers Sign in=True |
| [Russian, signed out] the lesson page shows no help button under any block, none on the quick check, and no note in their place | PASS | help controls of any kind=0, block rows=0, quick-check hints=0, fallback note text found=none |

_screenshot **helpgate-03-lesson-signed-out-ru-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_

_screenshot **helpgate-03-lesson-signed-out-ru-phone.png**: url=`http://127.0.0.1:4388/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_
| [Russian, signed out] the guided exercise has loaded its six questions and shows no hint button and no note | PASS | answer controls=6, help controls of any kind=0, fallback note text found=none |

_screenshot **helpgate-04-exercise-signed-out-ru-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: практика с подсказками"_

_screenshot **helpgate-04-exercise-signed-out-ru-phone.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: практика с подсказками"_
| [Russian, signed out] the guided written task has loaded and shows no hint or example button and no note | PASS | answer box present=True, help controls of any kind=0, fallback note text found=none |

_screenshot **helpgate-04b-written-task-signed-out-ru-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: практика с подсказками"_

**Signed out, Russian:** no console errors, no failed/4xx/5xx requests.

## 3. Sign in and out on an open lesson page

The lesson page stays open throughout; the student signs in, and later out, from a second tab of the same browser, the way a student's other tab would.

| Check | Result | Observed |
|---|---|---|
| Before signing in, the open lesson page shows no help button | PASS | teaching blocks stamped=4, help controls=0 |

**Signed in from a second tab** as a synthetic student (stand-in user id `d5d214d6-0c3f-408e-b1ca-8c98fbbf35d3`).
| The help buttons appear on the SAME open lesson page the moment the student signs in, with no reload | PASS | block help rows=4 for 4 stamped blocks, same document (never reloaded)=True |
| One help row per teaching block, each with 'Explain this differently' and 'Show me an example' | PASS | rows=4, explain buttons=4, example buttons=4 |
| The lesson quick check gains its hint buttons on the same page | PASS | quick-check hint buttons=12 |

_screenshot **helpgate-05-lesson-signed-in-no-reload-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_
| A press of 'Explain this differently' gets a reply from the stand-in, labelled simulated (never shown as a live one) | PASS | reply="Simulated tutor reply from the local dev server. No AI was called and nothing was charged. A real hint is built from the exact lesson block you are reading, your own answer and the hints you have already had, and it neve", note="Simulated, not a real Mr EZ reply.", labelled simulated=True |
| The press went to the tutor as one lesson-help request, sent with the student's own token | PASS | tutor requests seen: [{"task": "lesson-help", "kind": "explain", "blockId": "b0-a85c2686", "bearer": true}] |

_close-up screenshot **helpgate-06-lesson-simulated-reply-closeup.png**_
| Signed in, the guided exercise offers its hint buttons (one per question before answering) | PASS | hint buttons=6 |

_screenshot **helpgate-07-exercise-signed-in-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_

_screenshot **helpgate-07-exercise-signed-in-phone.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-guided`, landmark heading="Matching Headings: guided practice"_
| Signed in, the independent check still offers no help button at all (the assessment boundary is unchanged) | PASS | answer controls=6, help controls=0 |

_screenshot **helpgate-08-check-signed-in-no-help-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/reading-matching-headings-check-a`, landmark heading="Matching Headings: independent check"_
| Signed in, the guided written task offers its hint and example buttons before an attempt | PASS | hint buttons=1, example buttons=1 |

_screenshot **helpgate-08b-written-task-signed-in-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_
| Signed out in a second tab: every help button, and the reply, leave the open lesson page, with no reload | PASS | second tab shows Sign in=True, help controls left on the open page=0 (block rows=0, quick-check hints=0, replies=0), same document=True |
| Nothing is put in their place, and the lesson itself is untouched | PASS | fallback note text found=none, teaching blocks still stamped=4 of 4 |
| The open page's own menu agrees the student is signed out | PASS | workspace menu offers Sign in on the lesson page |

_screenshot **helpgate-09-lesson-after-sign-out-desktop.png**: url=`http://127.0.0.1:4388/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_

**Signed-in journey:** no console errors, no failed/4xx/5xx requests.

**Totals:** 20 PASS, 0 FAIL.
