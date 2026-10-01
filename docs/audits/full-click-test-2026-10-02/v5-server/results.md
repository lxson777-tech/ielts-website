| Section | PASS | FAIL |
|---|---|---|
| content-gate | 33 | 0 |
| ai-workers | 6 | 0 |
| trial-retired | 1 | 0 |

Page errors / hydration messages: 0


PASS [content-gate] signed-out: GET /content/lesson/reading-tfng?locale=en -> 401 sign-in-required
PASS [content-gate] signed-out: GET /content/lesson/reading-tfng?locale=ru -> 401 sign-in-required
PASS [content-gate] signed-out: GET /content/practice/practice-reading-tfng -> 401 sign-in-required
PASS [content-gate] signed-out: GET /content/example/writing-opinion -> 401 sign-in-required
PASS [content-gate] signed-out: GET /content/test/reading-full-001 -> 401 sign-in-required
PASS [content-gate] signed-out: GET /content/test/listening-full-001 -> 401 sign-in-required
PASS [content-gate] signed-out: GET /content/prompt/pte-wt-103-task2 -> 401 sign-in-required
PASS [content-gate] signed-out: GET /content/model/pte-wt-103-task2 -> 401 sign-in-required
PASS [content-gate] signed-out: GET /content/pack/cue-cards -> 401 sign-in-required
PASS [content-gate] signed-out: GET /content/pack/band-guides -> 401 sign-in-required
PASS [content-gate] signed-out: GET /content/pack/focused-exercises -> 401 sign-in-required
PASS [content-gate] free: GET /content/lesson/reading-tfng?locale=en -> 200
PASS [content-gate] free: GET /content/lesson/reading-tfng?locale=ru -> 200
PASS [content-gate] free: GET /content/practice/practice-reading-tfng -> 200
PASS [content-gate] free: GET /content/example/writing-opinion -> 200
PASS [content-gate] free: GET /content/test/reading-full-001 -> 402 paid-required
PASS [content-gate] free: GET /content/test/listening-full-001 -> 402 paid-required
PASS [content-gate] free: GET /content/prompt/pte-wt-103-task2 -> 402 paid-required
PASS [content-gate] free: GET /content/model/pte-wt-103-task2 -> 402 paid-required
PASS [content-gate] free: GET /content/pack/cue-cards -> 402 paid-required
PASS [content-gate] free: GET /content/pack/band-guides -> 402 paid-required
PASS [content-gate] free: GET /content/pack/focused-exercises -> 402 paid-required
PASS [content-gate] paid: GET /content/lesson/reading-tfng?locale=en -> 200
PASS [content-gate] paid: GET /content/lesson/reading-tfng?locale=ru -> 200
PASS [content-gate] paid: GET /content/practice/practice-reading-tfng -> 200
PASS [content-gate] paid: GET /content/example/writing-opinion -> 200
PASS [content-gate] paid: GET /content/test/reading-full-001 -> 200
PASS [content-gate] paid: GET /content/test/listening-full-001 -> 200
PASS [content-gate] paid: GET /content/prompt/pte-wt-103-task2 -> 200
PASS [content-gate] paid: GET /content/model/pte-wt-103-task2 -> 200
PASS [content-gate] paid: GET /content/pack/cue-cards -> 200
PASS [content-gate] paid: GET /content/pack/band-guides -> 200
PASS [content-gate] paid: GET /content/pack/focused-exercises -> 200
PASS [ai-workers] signed-out: essay grader -> 401 (SIMULATED grade)
PASS [ai-workers] free: essay grader -> 402 paid-required (SIMULATED grade)
PASS [ai-workers] paid: essay grader -> 200 (SIMULATED grade)
PASS [ai-workers] free: POST /grade-speaking refused with 402 paid-required
PASS [ai-workers] free: POST /live refused with 402 paid-required
PASS [ai-workers] free: POST /tutor refused with 402 paid-required
PASS [trial-retired] free: trial_start is refused (trial retired)
