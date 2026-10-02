# V4: rendering mismatches on startup and navigation (free-account states)

Gated production build at http://localhost:4441/ielts-website, payments SIMULATED. **385 page visits, 21 with an uncaught page error or hydration message.**

| Language | Screen | Account | Mode | Visits | With errors | Nav clicks |
|---|---|---|---|---|---|---|
| en | 1440x900 | signed-out | plain | 52 | 0 | 5 |
| ru | 1440x900 | signed-out | plain | 52 | 0 | 5 |
| en | 390x844 | signed-out | plain | 52 | 0 | 5 |
| ru | 390x844 | signed-out | plain | 52 | 0 | 5 |
| en | 1440x900 | signed-out | stress | 52 | 0 | 5 |
| ru | 1440x900 | signed-out | stress | 52 | 0 | 5 |
| en | 390x844 | signed-out | stress | 52 | 0 | 5 |

## Errors

- en 1440x900 free plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 1440x900 paid plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 1440x900 complimentary plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- ru 1440x900 free plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- ru 1440x900 paid plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- ru 1440x900 complimentary plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 390x844 free plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 390x844 paid plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 390x844 complimentary plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- ru 390x844 free plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- ru 390x844 paid plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- ru 390x844 complimentary plain setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 1440x900 free stress setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 1440x900 paid stress setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 1440x900 complimentary stress setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- ru 1440x900 free stress setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- ru 1440x900 paid stress setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- ru 1440x900 complimentary stress setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 390x844 free stress setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 390x844 paid stress setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

- en 390x844 complimentary stress setup ``: run did not complete: Page.wait_for_selector: Timeout 40000ms exceeded.
Call log:
  - waiting for locator("#profile-firstName") to be visible

