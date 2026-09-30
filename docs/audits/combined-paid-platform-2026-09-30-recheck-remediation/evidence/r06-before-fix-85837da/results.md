# R06: rendering mismatches on startup and navigation

Gated production build at http://localhost:4331/ielts-website, payments SIMULATED. **448 page visits, 146 with an uncaught page error or hydration message.**

| Language | Screen | Account | Mode | Visits | With errors | Nav clicks |
|---|---|---|---|---|---|---|
| en | 1440x900 | signed-out | plain | 37 | 8 | 5 |
| en | 1440x900 | trial | plain | 38 | 6 | 5 |
| en | 1440x900 | paid | plain | 37 | 5 | 5 |
| ru | 1440x900 | signed-out | plain | 37 | 6 | 5 |
| ru | 1440x900 | trial | plain | 38 | 10 | 5 |
| ru | 1440x900 | paid | plain | 37 | 9 | 5 |
| en | 1440x900 | signed-out | stress | 37 | 17 | 5 |
| en | 1440x900 | trial | stress | 38 | 22 | 5 |
| en | 1440x900 | paid | stress | 37 | 13 | 5 |
| ru | 1440x900 | signed-out | stress | 37 | 16 | 5 |
| ru | 1440x900 | trial | stress | 38 | 26 | 5 |
| ru | 1440x900 | paid | stress | 37 | 8 | 5 |

## Errors

- en 1440x900 signed-out plain fresh `/plans`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out plain fresh `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out plain fresh `/lessons/reading/paraphrase`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out plain nav-click `/start`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out plain nav-click `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out plain nav-click `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out plain back `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out plain forward `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 trial plain fresh `/plans`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 trial plain nav-click `/start`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 trial plain nav-click `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 trial plain nav-click `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 trial plain back `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 trial plain forward `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 paid plain nav-click `/start`: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 paid plain nav-click `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 paid plain nav-click `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 paid plain back `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 paid plain forward `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 signed-out plain fresh `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 signed-out plain nav-click `/start`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 signed-out plain nav-click `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 signed-out plain nav-click `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 signed-out plain back `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 signed-out plain forward `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 trial plain fresh `/plans`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 trial plain fresh `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 trial plain refresh `/trainers/writing`: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 trial plain refresh `/account`: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 trial plain fresh `/start`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 trial plain nav-click `/start`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 trial plain nav-click `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 trial plain nav-click `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 trial plain back `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 trial plain forward `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 paid plain fresh `/plans`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 paid plain fresh `/trainers/writing`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 paid plain fresh `/trainers/speaking`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 paid plain fresh `/start`: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 paid plain nav-click `/start`: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 paid plain nav-click `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 paid plain nav-click `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 paid plain back `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- ru 1440x900 paid plain forward `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress fresh `/trial`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress fresh `/plans`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress refresh `/plans`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress refresh `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress fresh `/lessons/reading/paraphrase`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress refresh `/lessons/reading/paraphrase`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress fresh `/trainers/writing`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress refresh `/trainers/writing`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress fresh `/trainers/speaking`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress refresh `/trainers/speaking`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress refresh `/start`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress fresh `/learn`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress refresh `/lessons/writing`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress nav-click `/start`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress nav-click `/review`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- en 1440x900 signed-out stress nav-click `/dashboard`: Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
