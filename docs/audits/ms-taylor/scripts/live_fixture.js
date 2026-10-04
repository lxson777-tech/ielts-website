/* A stand-in for the live examiner service and the speaking grader, for the
   Ms. Taylor screenshots only (4 October 2026). Installed with
   add_init_script; never part of the site. Nothing here reaches any AI
   service or any Worker: every request the page makes to the live examiner
   or the speaking grader is answered inside the page.

   - GET  <live>/          the provider config: openai, sign-in required.
   - POST <live>/          a SIMULATED session: a real WebRTC peer in this
                           page answers the offer, and plays a short scripted
                           Part 1 over the data channel. Her "voice" is a
                           quiet tone whose loudness rises and falls like
                           syllables while each examiner line is spoken, so
                           the page's own speaking detector and level meter
                           see her talking and her mouth moves.
   - POST <live>/direct, /end, /report   accepted and ignored.
   - POST <grader>         a fixed assessment whose every comment says
                           SIMULATED. It is not a grade.

   Everything after that (captions, the closing line, the recording, the
   report, Mr EZ beside the band) is the site's own code. */
(() => {
  const realFetch = window.fetch.bind(window);
  const state = { creates: 0, directs: [], graded: 0 };
  window.__msTaylorFixture = state;
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const path = (url) => {
    try {
      return new URL(url, location.href).pathname;
    } catch {
      return '';
    }
  };

  const realBeacon = navigator.sendBeacon?.bind(navigator);
  if (realBeacon) {
    navigator.sendBeacon = (url, data) => (/\/live\//.test(path(url)) ? true : realBeacon(url, data));
  }

  const iceComplete = (pc) =>
    new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') resolve();
      });
      setTimeout(resolve, 4000);
    });

  const LINES = [
    ['examiner', 'Good afternoon. My name is Ms. Taylor, and I am your examiner today. Can you tell me your full name, please?', 1500, 5200],
    ['candidate', 'My name is Aruzhan Bekova.', 7400],
    ['examiner', 'Thank you. Now, let us talk about your home town. Where is your home town?', 5200, 4200],
    ['candidate', 'I come from Almaty, a big city in the south of Kazakhstan with mountains all around it.', 8600],
    ['examiner', 'What do you like most about living there?', 9200, 2800],
    ['candidate', 'I like the mountains, because in winter I can go skiing and in summer I go hiking with my friends.', 7600],
    ['examiner', 'Thank you, that is the end of the speaking test.', 11000, 3000],
  ];

  function play(dc, sessionId, voice) {
    const send = (event) => {
      if (dc.readyState === 'open') dc.send(JSON.stringify(event));
    };
    send({ type: 'session.started', session: { id: sessionId } });
    let t = 0;
    for (const [role, text, after, talkMs] of LINES) {
      t += after;
      const at = t;
      setTimeout(() => {
        if (role === 'examiner') voice(talkMs);
        send({
          type: role === 'examiner' ? 'session.output_transcript.delta' : 'session.input_transcript.delta',
          delta: text,
          start_ms: at,
          end_ms: at + 2000,
        });
      }, at);
    }
  }

  async function createSession(body) {
    state.creates += 1;
    const sessionId = `simulated-${Date.now()}`;
    const peer = new RTCPeerConnection();
    const audio = new AudioContext();
    const out = audio.createMediaStreamDestination();
    const tone = audio.createOscillator();
    tone.frequency.value = 196;
    const level = audio.createGain();
    level.gain.value = 0;
    tone.connect(level).connect(out);
    tone.start();
    /* While she "speaks": loudness that rises and falls about five times a
       second, with short gaps between words. */
    const voice = (ms) => {
      const now = audio.currentTime;
      const g = level.gain;
      g.cancelScheduledValues(now);
      let t = now;
      while (t < now + ms / 1000) {
        const peak = 0.12 + Math.random() * 0.3;
        g.setTargetAtTime(peak, t, 0.03);
        g.setTargetAtTime(0.01 + Math.random() * 0.03, t + 0.11 + Math.random() * 0.06, 0.03);
        t += 0.18 + Math.random() * 0.12;
      }
      g.setTargetAtTime(0, t, 0.02);
    };
    peer.ondatachannel = (ev) => {
      const dc = ev.channel;
      const start = () => play(dc, sessionId, voice);
      if (dc.readyState === 'open') start();
      else dc.addEventListener('open', start, { once: true });
    };
    await peer.setRemoteDescription({ type: 'offer', sdp: body.sdp });
    const track = out.stream.getAudioTracks()[0];
    const tr = peer.getTransceivers().find((x) => x.receiver.track.kind === 'audio');
    if (tr) {
      tr.direction = 'sendrecv';
      await tr.sender.replaceTrack(track);
    } else {
      peer.addTrack(track, out.stream);
    }
    await peer.setLocalDescription(await peer.createAnswer());
    await iceComplete(peer);
    /* Hold a moment on "joining the call", as a real connection does. */
    await new Promise((r) => setTimeout(r, 2500));
    return json(
      { provider: 'openai', model: 'simulated', session: { id: sessionId }, transport: { type: 'webrtc', sdp: peer.localDescription.sdp } },
      201,
    );
  }

  const SIM = 'SIMULATED for the screenshots, not a grade.';
  const criterion = (band, what) => ({
    band,
    comment: `${SIM} ${what}`,
    tip: `${SIM} One thing to try next.`,
  });
  const ASSESSMENT = {
    criteria: {
      fluencyCoherence: criterion(6, 'Fluency and coherence.'),
      lexicalResource: criterion(6, 'Vocabulary.'),
      grammaticalRange: criterion(6, 'Grammar.'),
      pronunciation: criterion(7, 'Pronunciation.'),
    },
    moments: [{ quote: 'I come from Almaty', note: SIM }],
    strengths: [`${SIM} A strength.`],
    improvements: [`${SIM} An improvement.`],
    actionPlan: [`${SIM} Step one.`, `${SIM} Step two.`, `${SIM} Step three.`],
  };

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
    const p = path(url);
    if (/\/live\/?$/.test(p)) {
      if (method === 'GET') return json({ provider: 'openai', model: 'simulated', backendModel: null, requiresSignIn: true });
      if (method === 'POST') return createSession(JSON.parse(String(init.body)));
    }
    if (/\/live\/(direct|end|report)$/.test(p)) {
      if (p.endsWith('/direct')) state.directs.push(JSON.parse(String(init.body || '{}')).cue?.type ?? null);
      return json({ ok: true });
    }
    if (/\/grade-speaking\/?$/.test(p) && method === 'POST') {
      state.graded += 1;
      await new Promise((r) => setTimeout(r, 2500));
      return json(ASSESSMENT);
    }
    return realFetch(input, init);
  };
})();
