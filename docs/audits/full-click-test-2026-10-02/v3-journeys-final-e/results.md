| Section | PASS | FAIL |
|---|---|---|
| e-complimentary | 19 | 0 |
| all | 2 | 0 |

Page errors / hydration messages: 0


PASS [e-complimentary] admin@example.test reaches /admin
PASS [e-complimentary] admin panel shows the student as Free account
PASS [e-complimentary] admin: 'Give free access (30 days)' succeeds
PASS [e-complimentary] student /plans: Free access from your teacher until <date>
PASS [e-complimentary] complimentary: /tests/mock opens (no locked page, no pop-up)
PASS [e-complimentary] complimentary: /writing/checker opens (no locked page, no pop-up)
PASS [e-complimentary] complimentary: /trainers/writing opens (no locked page, no pop-up)
PASS [e-complimentary] complimentary: /speaking/cue-cards opens (no locked page, no pop-up)
PASS [e-complimentary] complimentary allowances are the paid ones (12/6/2/2)
PASS [e-complimentary] admin: Renew adds another 30 days (message, and a second grant in the database)
PASS [e-complimentary] admin panel's Access block shows the renewed end date
PASS [e-complimentary] student /plans shows the later date after Renew
PASS [e-complimentary] admin: Stop (with confirmation) succeeds
PASS [e-complimentary] after Stop the student's paid features are locked
PASS [e-complimentary] after Stop lessons stay readable
PASS [e-complimentary] after Stop /plans shows no running access (free account or 'ended')
PASS [e-complimentary] a normal student sees no admin panel at /admin
PASS [e-complimentary] a normal student calling the admin function directly is refused
PASS [e-complimentary] ... and still has no paid access afterwards
PASS [all] no trial wording on any page visited
PASS [all] zero uncaught page errors or hydration messages
