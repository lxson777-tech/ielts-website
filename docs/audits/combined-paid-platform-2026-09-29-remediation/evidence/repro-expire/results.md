# repro-expire

Base http://localhost:4492/ielts-website, stand-in http://127.0.0.1:8492

**2 of 5 checks passed**

| Combo | Result | Check | Detail |
|---|---|---|---|
| en-1440 | PASS | paid: lesson open |  |
| en-1440 | FAIL | same browser, straight after expiry: lesson locked | IELTS is EZ Today Course Practice Tests Vocabulary EN RU SS Skip to content True / False / Not Given Your full access has ended  Your results and your work are saved. Choose a plan to open the full co |
| en-1440 | FAIL | same browser, after visiting /account: lesson locked | IELTS is EZ Today Course Practice Tests Vocabulary EN RU SS Skip to content True / False / Not Given Your full access has ended  Your results and your work are saved. Choose a plan to open the full co |
| en-1440 | PASS | Today is the trial's/ended view, not full Today |  |
| en-1440 | FAIL | fresh browser after expiry: lesson locked | IELTS is EZ Today Course Practice Tests Vocabulary EN RU SS Skip to content True / False / Not Given Your full access has ended  Your results and your work are saved. Choose a plan to open the full co |
