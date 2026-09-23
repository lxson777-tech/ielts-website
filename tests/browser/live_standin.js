/* A stand-in for OpenAI's voice service, for the trial journey only
   (t01_trial_journey.py installs it with add_init_script). Never part of
   the site.

   The session request still goes to the REAL live examiner Worker on the
   local backend, which checks the student's sign-in, the begun Speaking
   test and the session count exactly as deployed, and answers with a
   SIMULATED session. The Worker cannot hand back a connection a browser can
   use, so this script answers the page's offer with a real WebRTC peer in
   the same page and plays the examiner over its data channel: the session
   starts, a short Part 1 exchange is transcribed, and the examiner says the
   closing line. Everything after that (the recording, the grade request,
   the report) is the site's own code. Nothing here reaches OpenAI. */
(() => {
  const realFetch = window.fetch.bind(window);
  const state = { creates: [], peers: [] };
  window.__liveStandin = state;

  const isCreate = (url, method) => {
    if (method !== 'POST') return false;
    try {
      return /\/live\/?$/.test(new URL(url, location.href).pathname);
    } catch {
      return false;
    }
  };

  const iceComplete = (pc) =>
    new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const done = () => {
        if (pc.iceGatheringState === 'complete') resolve();
      };
      pc.addEventListener('icegatheringstatechange', done);
      setTimeout(resolve, 4000);
    });

  /* The examiner's side of a short Part 1 interview, about 35 seconds, so
     the recording is long enough to grade (30 seconds). */
  function playInterview(dc, sessionId) {
    const send = (event) => {
      if (dc.readyState === 'open') dc.send(JSON.stringify(event));
    };
    let t = 0;
    const say = (role, text, afterMs) => {
      t += afterMs;
      const at = t;
      setTimeout(() => {
        send({
          type: role === 'examiner' ? 'session.output_transcript.delta' : 'session.input_transcript.delta',
          delta: text,
          start_ms: at,
          end_ms: at + 2000,
        });
      }, at);
    };
    send({ type: 'session.started', session: { id: sessionId } });
    say('examiner', 'Good morning. Let us talk about where you live. Where is your home town?', 1500);
    say('candidate', 'I come from Almaty, a big city in the south of Kazakhstan with mountains around it.', 8000);
    say('examiner', 'What do you like most about living there?', 8000);
    say('candidate', 'I like the mountains, because in winter I can go skiing and in summer I go hiking with friends.', 8000);
    say('examiner', 'Thank you, that is the end of the speaking test.', 11000);
  }

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!isCreate(url, init.method || 'GET')) return realFetch(input, init);

    const body = JSON.parse(String(init.body));
    const record = { plan: body.plan, trialSitting: body.trialSitting ?? null, status: null };
    state.creates.push(record);
    const resp = await realFetch(input, init); // the real Worker decides and counts
    record.status = resp.status;
    if (!resp.ok) return resp;
    const data = await resp.json();

    const peer = new RTCPeerConnection();
    state.peers.push(peer);
    peer.ondatachannel = (ev) => {
      const dc = ev.channel;
      const start = () => playInterview(dc, data.session.id);
      if (dc.readyState === 'open') start();
      else dc.addEventListener('open', start, { once: true });
    };
    /* The examiner's voice: a silent track, so the page has one to play. */
    const audio = new AudioContext();
    const out = audio.createMediaStreamDestination();
    const tone = audio.createOscillator();
    const mute = audio.createGain();
    mute.gain.value = 0;
    tone.connect(mute).connect(out);
    tone.start();
    await peer.setRemoteDescription({ type: 'offer', sdp: body.sdp });
    const track = out.stream.getAudioTracks()[0];
    const transceiver = peer.getTransceivers().find((tr) => tr.receiver.track.kind === 'audio');
    if (transceiver) {
      transceiver.direction = 'sendrecv';
      await transceiver.sender.replaceTrack(track);
    } else {
      peer.addTrack(track, out.stream);
    }
    await peer.setLocalDescription(await peer.createAnswer());
    await iceComplete(peer);
    data.transport = { type: 'webrtc', sdp: peer.localDescription.sdp };
    return new Response(JSON.stringify(data), { status: resp.status, headers: { 'Content-Type': 'application/json' } });
  };
})();
