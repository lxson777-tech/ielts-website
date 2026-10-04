# When the account changes on an open page: whose grade, and whose essay

Run on 2026-10-04 against a DEV server at http://localhost:4604/ielts-website, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at http://127.0.0.1:4603. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project: nothing below is evidence about one.

It is the browser half of six fixes. Sections 1 and 2: finding R2-02 of the second Codex
inspection, a grade that came back after the owner changed was written under whoever was signed in
by then. Sections 3 and 4: finding R2B-01 of the second fresh Codex inspection, the essay editor
itself was nobody's, so a student who took over the page could submit the previous student's text,
and a switch inside the 600 ms draft autosave saved it under the newcomer. Section 5: finding R2C-01
of the third Codex inspection, a late grade deleted the draft its student had revised since
submitting. Section 6: finding R2C-04 of the same inspection, a speaking attempt went on after the
page changed hands, so a second student could answer the first student's remaining questions.
Section 7: finding R2D-01 of the Codex inspection of 1701b97, the live examiner's START asked
nothing after its waits, so an account change while the microphone permission was up left the
microphone, a recording and a paid voice session running behind the mock's stopped screen.
Section 8: the last window of that start, inside the connection setup, where the connection
prepared itself for up to ten seconds after the sign-in token was read and then sent the request
that creates the paid voice session without asking again. Section 9: finding R2E-01 of the Codex
inspection of c4a7793, the check inside the setup came too late once that request had SUCCEEDED
(the answer was applied and the examiner's audio started before anything asked again, and the wait
for the session to start could not be reached by the screen), driven with a connection that really
comes up against a loopback peer in the same page. The deterministic half of sections 1 to 7 is
`tests/delayed-grade-owner.test.ts`; of sections 8 and 9, `tests/live-start-cancel.test.ts`.

**Two starts of the dev server.** Sections 1 to 6 drive the recorded speaking trainer on
`/trainers/speaking`, which the site shows only while no live examiner address is configured.
Sections 7, 8 and 9 need one, so they ran against a second start of the same dev server with
`PUBLIC_LIVE_EXAMINER_URL` pointed at a path on the stand-in that the stand-in does not serve, and was
appended below.

**What this run does not cover, and where it is covered instead.** No live interview runs here: the
examiner needs a paid voice session, and the stand-in has none. Sections 7 and 8 start the examiner
as far as it can go without one (its settings and every voice session request are intercepted in the
browser and answered by the run itself) and race the account change against the microphone request,
the connection setup and the voice session request. Section 9 goes one step further without any
service: the voice session request is answered by the run with a real answer made by a second peer
connection inside the page, so the page's connection comes up and the examiner's (test tone) audio
plays, and the account change comes while the session is still starting. No session ever starts: the
loopback peer never says so. What happens once a voice session is up (the suspension mid-interview, the
grading guard after the session is shut down, a grade already requested being kept for its student)
is proven only by `tests/delayed-grade-owner.test.ts`, sections 7 and 8: the same attempt and start
guard the examiner uses, driven with promises resolved by hand, and a source scan of how the examiner
uses them.

**No grader and no model was called.** The essay and speaking grader addresses point at paths the
local stand-in does not serve, and this script intercepts those requests in the browser, holds
them, and answers them with a reply whose every text field reads "SYNTHETIC intercepted reply from f23: no model was called.". The
browser's own client still labels a grade from its remote grader "AI examiner"; in this run that
label sits on a synthetic reply, for synthetic students, on a local stand-in.

Every student, email, password, essay and band here is SYNTHETIC, invented for this run.

## 7. The live examiner's start asks after every wait (Codex R2D-01)

Starting the examiner waits for its settings, for the microphone permission, for a sign-in token and for the voice connection. Before the fix the mock exam's embedded examiner asked nothing after those waits: if the account changed while the permission was still being asked for, the mock took the examiner off screen, and when the permission came back the examiner still kept the microphone, started recording, fetched a token and opened a paid voice session behind the stopped screen. Student J's SYNTHETIC mock sitting is put on its Speaking brief (written straight into J's own store; driving three whole papers first proves nothing more here), the examiner is started against an INTERCEPTED address with no voice service behind it, and the account is changed from a second tab at the two waits that matter: (a) the microphone request held unanswered while J signs out and student K signs up, then answered, with any voice session request that follows HELD so it would stay visible (before the fix that request carried K's token); (b) the voice session request held, then refused with a SYNTHETIC failure after J signs out. (c) repeats (a) on the standalone examiner page with students L and M.

| Check | Result | Observed |
|---|---|---|
| Student J signed up on the local stand-in | PASS | user id ed8809ef-4890-4c71-8497-c2ca4efc1d8f |
| J's sitting is on the Speaking brief and Start is enabled (the settings answered by the intercept) | PASS | Start enabled: True; settings requests answered: 1 |
| (a) J presses Start: the examiner asks for the microphone, and the page's request is held unanswered | PASS | microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connecting screen: True |

_screenshot **mstaylor-21-examiner-mock-microphone-pending.png**: url=`http://localhost:4604/ielts-website/tests/mock`, landmark heading="None"_
| (a) J signs out in the second tab: the mock stops and takes the examiner off screen while the microphone request is still unanswered | PASS | stopped screen: True; examiner still on screen: False; microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; same page (no reload): True |

_screenshot **mstaylor-22-examiner-mock-stopped-microphone-pending.png**: url=`http://localhost:4604/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_
| (a) Student K signs up in the second tab while J's microphone request is still unanswered | PASS | user id c9946d82-fcf1-45fb-9e5e-283ef65d248b; held microphone requests: 1 |
| (a) The microphone answers after the switch: the stream it hands back is stopped at once | PASS | held requests answered now: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0 |
| (a) Nothing follows the late microphone: no recording, no voice session requested (with K's token or anybody's), nothing opened | PASS | recorders started: 0; voice session requests: 0 (whose token: none); peer connections: 0; sockets: 0; same page: True |

_screenshot **mstaylor-23-examiner-mock-after-late-microphone.png**: url=`http://localhost:4604/ielts-website/tests/mock`, landmark heading="This mock exam belongs to another student"_
| (a) J signs back in: the first tab is back on the Speaking brief with the interview marked interrupted (the mock's own suspension, unchanged), and nothing is recording | PASS | signed in as ed8809ef-4890-4c71-8497-c2ca4efc1d8f; brief shown: True; interrupted note: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; same page: True |

_screenshot **mstaylor-24-examiner-mock-back-on-brief.png**: url=`http://localhost:4604/ielts-website/tests/mock`, landmark heading="Speaking"_
| (b) J starts again: the microphone is granted, the recording starts, and the voice session request is held in the browser | PASS | Start enabled: True; request held: True; voice session requests: 1; microphone requests 2, held 0; tracks handed back 2, still live 1; recorders started 1, still recording 1; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0 |

_screenshot **mstaylor-25-examiner-mock-session-request-held.png**: url=`http://localhost:4604/ielts-website/tests/mock`, landmark heading="None"_
| (b) J signs out in the second tab while the request is held: the mock stops, the recording stops and the microphone is released at once | PASS | stopped screen: True; microphone requests 2, held 0; tracks handed back 2, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; same page: True |
| (b) The held request is then refused with a SYNTHETIC failure: nothing more starts (no second request, no socket, the peer connection closed, no new recording, no new microphone request) | PASS | refused: 1; voice session requests in all: 1; microphone requests 2, held 0; tracks handed back 2, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; same page: True |

_screenshot **mstaylor-26-examiner-mock-after-refused-request.png**: url=`http://localhost:4604/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_

**Examiner (mock), first tab console errors:** Failed to load resource: the server responded with a status of 503 (Service Unavailable)

**Examiner (mock), first tab failed/4xx/5xx requests:** 503 http://127.0.0.1:4603/SYNTHETIC-intercepted-live-examiner/

**Examiner (mock), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:4603/auth/v1/logout?scope=local (net::ERR_ABORTED); FAILED http://127.0.0.1:4603/auth/v1/logout?scope=local (net::ERR_ABORTED); FAILED http://127.0.0.1:4603/auth/v1/logout?scope=local (net::ERR_ABORTED)
| (c) Student L opens the standalone examiner, signed in; Start is enabled (the settings answered by the intercept) | PASS | user id 28f22600-a8ba-4d48-9198-15aee2cc2cea; Start enabled: True; settings requests answered: 1 |
| (c) L presses Start: the microphone request is held unanswered | PASS | microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0 |
| (c) L signs out and student M signs up in the second tab, then the microphone answers: the stream is stopped at once, nothing records, no voice session is requested, and the page says the session was closed | PASS | held requests answered after the switch: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; voice session requests: 0; notice shown: True; same page: True |

_screenshot **mstaylor-27-examiner-standalone-after-late-microphone.png**: url=`http://localhost:4604/ielts-website/speaking/examiner`, landmark heading="None"_

**Examiner (standalone), first tab:** no console errors, no failed/4xx/5xx requests.

**Examiner (standalone), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:4603/auth/v1/logout?scope=local (net::ERR_ABORTED)

Every request to the examiner address in this section was answered inside the browser by the run itself: settings with SYNTHETIC values, and every voice session request refused with a SYNTHETIC 503 (at once, or after being held). The 503 lines in the diagnostics above are those refusals. No voice service, model or token service was reached.

## 8. The connection setup asks before the paid request (Codex R2D-01, the last window)

After section 7's fix one window was left inside the connection setup: once the sign-in token has been read, the connection prepares itself for up to ten seconds and then sends the request that creates the paid voice session, and nothing asked again in between (on the Gemini rollback, the same window lies between the ephemeral token request and the voice socket). The setup now asks the examiner's own check right before that request and that socket. A wrapper installed before the page loads HOLDS the connection's offer while it is being prepared, so the account changes inside exactly that window: (a) student N in the mock's examiner, (b) student P on the standalone examiner page, both on the paid path; (c) student R on the standalone page with the Gemini rollback, where the run holds the ephemeral token request instead and answers it with a SYNTHETIC value after the switch. Every voice session request is intercepted in the browser (held, then refused with a SYNTHETIC failure if one ever came), and the wrapper refuses every socket to another host, so nothing in this section can reach a real service even if the fix failed.

| Check | Result | Observed |
|---|---|---|
| Student N signed up on the local stand-in | PASS | user id 3dd7f70e-b0e9-4582-97a6-0f8e8c67dc28 |
| (a) N presses Start in the mock: the microphone is granted, the recording starts, the sign-in token is read, and the connection's offer is held while it is prepared (no voice session request yet) | PASS | Start enabled: True; microphone requests 1, held 0; tracks handed back 1, still live 1; recorders started 1, still recording 1; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; voice session requests: 0 |

_screenshot **mstaylor-28-link-mock-offer-held.png**: url=`http://localhost:4604/ielts-website/tests/mock`, landmark heading="None"_
| (a) N signs out in the second tab while the offer is still held: the mock stops, the recording stops and the microphone is released | PASS | stopped screen: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; voice session requests: 0; same page: True |
| (a) Student O signs up in the second tab while N's offer is still held | PASS | user id 875bc1e9-c313-4876-9a90-069f7340a1e4; held offers: 1 |
| (a) The offer is let go after the switch: the setup asks before its request, so NO voice session request is sent (with N's token or anybody's), the peer connection is closed, and no socket, recording or microphone request follows | PASS | offers let go now: 1; voice session requests: 0 (whose token: none sent); microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 0; sockets refused by the run's wrapper 0; same page: True |

_screenshot **mstaylor-29-link-mock-after-offer-let-go.png**: url=`http://localhost:4604/ielts-website/tests/mock`, landmark heading="This mock exam belongs to another student"_

**Connection setup (mock), first tab:** no console errors, no failed/4xx/5xx requests.

**Connection setup (mock), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:4603/auth/v1/logout?scope=local (net::ERR_ABORTED)
| (b) Student P presses Start on the standalone examiner: recording, the token read, and the connection's offer held (no voice session request yet) | PASS | user id e09aa5fe-492a-4d04-be58-dcabda65b133; Start enabled: True; microphone requests 1, held 0; tracks handed back 1, still live 1; recorders started 1, still recording 1; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; voice session requests: 0 |
| (b) P signs out and student Q signs up in the second tab while the offer is held: the page stops the session and says so, the recording stops and the microphone is released | PASS | user id 1027ba48-bbed-4edc-8986-54cbaf05444a; notice shown: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; same page: True |
| (b) The offer is let go after the switch: NO voice session request is sent, the peer connection is closed, no socket opens, nothing records, and the notice stays | PASS | offers let go now: 1; voice session requests: 0 (whose token: none sent); microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 0; sockets refused by the run's wrapper 0; notice shown: True; same page: True |

_screenshot **mstaylor-30-link-standalone-after-offer-let-go.png**: url=`http://localhost:4604/ielts-website/speaking/examiner`, landmark heading="None"_

**Connection setup (standalone), first tab:** no console errors, no failed/4xx/5xx requests.

**Connection setup (standalone), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:4603/auth/v1/logout?scope=local (net::ERR_ABORTED)
| (c) Student R presses Start on the Gemini rollback: recording, and the request for an ephemeral voice token held in the browser (no socket yet) | PASS | user id a9d04871-a7d9-4ec4-9304-5ac36e5c3fd0; Start enabled: True; token request held: True; microphone requests 1, held 0; tracks handed back 1, still live 1; recorders started 1, still recording 1; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 0, held 0; sockets refused by the run's wrapper 0 |

_screenshot **mstaylor-31-link-gemini-token-request-held.png**: url=`http://localhost:4604/ielts-website/speaking/examiner`, landmark heading="None"_
| (c) R signs out and student S signs up in the second tab while the token request is held: the page stops the session and says so, the recording stops and the microphone is released | PASS | user id f8494af3-864d-4772-b9e9-19eb093ea5e0; notice shown: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 0, held 0; sockets refused by the run's wrapper 0; same page: True |
| (c) The token request is then answered with a SYNTHETIC value: the setup asks before its socket, so NO voice socket is even attempted (the wrapper, which would refuse it, saw none), nothing records, and the notice stays | PASS | answered: 1; token requests in all: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 0, held 0; sockets refused by the run's wrapper 0; notice shown: True; same page: True |

_screenshot **mstaylor-32-link-gemini-after-token.png**: url=`http://localhost:4604/ielts-website/speaking/examiner`, landmark heading="None"_

**Connection setup (Gemini rollback), first tab:** no console errors, no failed/4xx/5xx requests.

**Connection setup (Gemini rollback), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:4603/auth/v1/logout?scope=local (net::ERR_ABORTED)

Every request to the examiner address in section 8 was answered inside the browser by the run itself: settings with SYNTHETIC values, every paid voice session request held and then refused with a SYNTHETIC 503 (0 came in this section), and the Gemini token request answered with a SYNTHETIC value that is no token. The wrapper refuses every socket to another host (0 attempted in (c)), so no voice service, model or token service could be reached.

## 9. A voice session that SUCCEEDS late, then the page changes hands (Codex R2E-01)

Sections 7 and 8 only ever refused the voice session request. Finding R2E-01 is about a request that SUCCEEDS: before the fix the answer was applied before anything asked again, so the examiner's audio started, and while the session then started (up to twenty seconds) the screen could not reach the connection at all; a timeout or an error there also left the session open at the Worker. Here the request succeeds against no real service: the run answers it with a REAL answer made inside the page by a second, loopback peer connection that takes the page's own offer from the intercepted request and sends a test tone, so the page's connection comes up in the same tab and the examiner's audio genuinely plays. The loopback never says the session started, so the page waits in exactly the window the finding names. A wrapper installed before the page loads counts the answers the page applies, the audio it plays (and can hold the playback's own start), the audio contexts it makes, and every call to the Worker's end-session address (intercepted in the browser). (a) the standalone page with the successful answer HELD while student T signs out and U signs up in a second tab, then released; (b) the standalone page with the answer applied and the audio playing when V signs out (then W signs up); (c) the mock's examiner in the same state as (b) when X signs out (then Y signs up), so the mock takes the examiner off screen.

| Check | Result | Observed |
|---|---|---|
| (a) Student T presses Start on the standalone examiner: recording, the token read, the voice session request held in the browser; the run makes a REAL answer to the page's own offer with the loopback peer in the same page (not yet handed back) | PASS | user id 21b33c3a-ae85-4bbf-bcc7-f5cf832de8fa; Start enabled: True; request held: True; real answer made: True; page's peer connections 1, still open 1 (connection state connecting); answers applied by the page 0; page's data channel connecting; loopback peer connecting; audio elements 0, playing 0, starts held 0; audio contexts 1, still running 1; examiner (received) tracks still live 1; microphone tracks 1, still live 1; recorders still recording 1; sockets to other hosts 0 |

_screenshot **mstaylor-33-loopback-standalone-answer-held.png**: url=`http://localhost:4604/ielts-website/speaking/examiner`, landmark heading="None"_
| (a) T signs out in the second tab while the successful answer is still held: the page's connection is closed AT ONCE (not when the request answers), the recording stops, the microphone is released and the page says the session was closed | PASS | page's peer connections 1, still open 0 (connection state closed); answers applied by the page 0; page's data channel closed; loopback peer connecting; audio elements 0, playing 0, starts held 0; audio contexts 1, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; requests still held: 1; notice shown: True; same page: True |
| (a) Student U signs up in the second tab, and the held request then SUCCEEDS with the real answer: the answer is never applied, no audio element is made or played, no track is live, nothing reopens, and the session the request created is ended at the Worker, once | PASS | user id 686c5ea2-9a9d-486d-bb94-5a7999c30c21; answered now: 1; page's peer connections 1, still open 0 (connection state closed); answers applied by the page 0; page's data channel closed; loopback peer disconnected; audio elements 0, playing 0, starts held 0; audio contexts 1, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; sessions ended at the Worker: ['SYNTHETIC-f23-session-175710-T'] (0.0 s after the answer; the sign-out was 6.7 s before the answer); notice shown: True; same page: True |

_screenshot **mstaylor-34-loopback-standalone-after-late-answer.png**: url=`http://localhost:4604/ielts-website/speaking/examiner`, landmark heading="None"_

**Loopback (standalone, answer held), first tab:** no console errors, no failed/4xx/5xx requests.

**Loopback (standalone, answer held), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:4603/auth/v1/logout?scope=local (net::ERR_ABORTED)
| (b) V presses Start on the standalone examiner page; the voice session request SUCCEEDS with the loopback's real answer: the page applies it, the examiner's (test tone) audio starts playing while its own start is held, and the session start is still waiting (the loopback never says the session started), with no session ended yet | PASS | user id 01c9c21c-7fd0-4c45-a6e3-c09282a8190c; Start enabled: True; request held: True; real answer made: True (contains a DTLS fingerprint); page's peer connections 1, still open 1 (connection state connected); answers applied by the page 1; page's data channel open; loopback peer connected; audio elements 1, playing 1, starts held 1; audio contexts 1, still running 1; examiner (received) tracks still live 1; microphone tracks 1, still live 1; recorders still recording 1; sockets to other hosts 0; sessions ended so far: []; connecting screen: True |

_screenshot **mstaylor-35-loopback-standalone-audio-playing.png**: url=`http://localhost:4604/ielts-website/speaking/examiner`, landmark heading="None"_
| (b) V signs out in the second tab 1.7 s after the answer (inside the old 20 s session start): within 2.5 s the page's connection is closed, the examiner audio has stopped, no track is live, the recording has stopped, the page says the session was closed, and the session is ended at the Worker, once | PASS | page's peer connections 1, still open 0 (connection state closed); answers applied by the page 1; page's data channel closed; loopback peer connected; audio elements 1, playing 0, starts held 1; audio contexts 1, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; sessions ended at the Worker: ['SYNTHETIC-f23-session-175710-V'] (0.0 s after the sign-out); notice shown: True; same page: True |

_screenshot **mstaylor-36-loopback-standalone-after-switch.png**: url=`http://localhost:4604/ielts-website/speaking/examiner`, landmark heading="None"_
| (b) Student W signs up in the second tab, and the playback's own start, held until now, is let go: what it makes afterwards is released as well (no audio context left running, nothing playing), nothing reopens, and the session is still ended exactly once | PASS | user id b9ef9fa0-9abe-477e-a0ff-db5e602d884c; held starts let go: 1; page's peer connections 1, still open 0 (connection state closed); answers applied by the page 1; page's data channel closed; loopback peer disconnected; audio elements 1, playing 0, starts held 0; audio contexts 2, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; sessions ended at the Worker: ['SYNTHETIC-f23-session-175710-V']; same page: True |

**Loopback (the standalone examiner page), first tab:** no console errors, no failed/4xx/5xx requests.

**Loopback (the standalone examiner page), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:4603/auth/v1/logout?scope=local (net::ERR_ABORTED)
| (c) X presses Start on the mock's examiner; the voice session request SUCCEEDS with the loopback's real answer: the page applies it, the examiner's (test tone) audio starts playing while its own start is held, and the session start is still waiting (the loopback never says the session started), with no session ended yet | PASS | user id 4b286471-8b56-4914-9065-d5afc079f592; Start enabled: True; request held: True; real answer made: True (contains a DTLS fingerprint); page's peer connections 1, still open 1 (connection state connected); answers applied by the page 1; page's data channel open; loopback peer connected; audio elements 1, playing 1, starts held 1; audio contexts 1, still running 1; examiner (received) tracks still live 1; microphone tracks 1, still live 1; recorders still recording 1; sockets to other hosts 0; sessions ended so far: []; connecting screen: True |

_screenshot **mstaylor-37-loopback-mock-audio-playing.png**: url=`http://localhost:4604/ielts-website/tests/mock`, landmark heading="None"_
| (c) X signs out in the second tab 1.6 s after the answer (inside the old 20 s session start): within 2.5 s the page's connection is closed, the examiner audio has stopped, no track is live, the recording has stopped, the mock stops, and the session is ended at the Worker, once | PASS | page's peer connections 1, still open 0 (connection state closed); answers applied by the page 1; page's data channel closed; loopback peer connected; audio elements 1, playing 0, starts held 1; audio contexts 1, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; sessions ended at the Worker: ['SYNTHETIC-f23-session-175710-X'] (0.0 s after the sign-out); stopped screen: True; same page: True |

_screenshot **mstaylor-38-loopback-mock-after-switch.png**: url=`http://localhost:4604/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_
| (c) Student Y signs up in the second tab, and the playback's own start, held until now, is let go: what it makes afterwards is released as well (no audio context left running, nothing playing), nothing reopens, and the session is still ended exactly once | PASS | user id 7a1a1bca-5b7c-4dd1-941d-152f0a96d8d4; held starts let go: 1; page's peer connections 1, still open 0 (connection state closed); answers applied by the page 1; page's data channel closed; loopback peer disconnected; audio elements 1, playing 0, starts held 0; audio contexts 2, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; sessions ended at the Worker: ['SYNTHETIC-f23-session-175710-X']; same page: True |

**Loopback (the mock's examiner), first tab:** no console errors, no failed/4xx/5xx requests.

**Loopback (the mock's examiner), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:4603/auth/v1/logout?scope=local (net::ERR_ABORTED)

Every request to the examiner address in section 9 was answered inside the browser by the run itself: settings with SYNTHETIC values, each voice session request with a SYNTHETIC session id and a real answer made by a loopback peer connection inside the same page (so the page's connection came up in the same tab, with a test tone as the examiner's voice), and every call to the end-session address counted and answered with a SYNTHETIC reply. No voice service, model or token service was reached, and no session ever started: the loopback never says so.

**Totals:** 34 PASS, 0 FAIL.
