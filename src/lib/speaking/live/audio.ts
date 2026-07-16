/* Browser audio plumbing for the live examiner. Two independent halves:

   MicCapture — an AudioWorklet taps the microphone, the main thread
   downsamples to the 16 kHz little-endian PCM16 the Live API requires and
   hands over base64 chunks (~128 ms each). A mute flag drops chunks during
   Part 2 preparation so the model never hears prep-time mumbling.

   ExaminerPlayback — the model streams 24 kHz PCM16 back; chunks are queued
   gap-free on a dedicated 24 kHz AudioContext. flush() drops everything
   scheduled (used when the model is interrupted mid-sentence). Both halves
   expose a 0-1 level for the talking-orb animation. */

const TARGET_IN_RATE = 16000;
const OUT_RATE = 24000;
const CHUNK_SAMPLES = 2048; // per worklet post, at the context's native rate

/* Registered from a Blob URL so no separate static worklet file has to be
   shipped and path-resolved through Astro's build. */
const WORKLET_SOURCE = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() { super(); this.parts = []; this.length = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length > 0) {
      this.parts.push(new Float32Array(ch));
      this.length += ch.length;
      if (this.length >= ${CHUNK_SAMPLES}) {
        const all = new Float32Array(this.length);
        let o = 0;
        for (const p of this.parts) { all.set(p, o); o += p.length; }
        this.port.postMessage(all, [all.buffer]);
        this.parts = []; this.length = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
`;

function floatTo16kPcmBase64(samples: Float32Array, fromRate: number): string {
  // At 16 kHz already (the normal path — see MicCapture.start) this is a
  // straight PCM16 conversion. Otherwise fall back to linear-interpolation
  // resampling; crude (no anti-alias filter), but only browsers that ignore
  // the requested context rate ever hit it.
  const ratio = fromRate / TARGET_IN_RATE;
  const outLen = ratio === 1 ? samples.length : Math.floor(samples.length / ratio);
  const bytes = new Uint8Array(outLen * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < outLen; i++) {
    let s: number;
    if (ratio === 1) {
      s = samples[i]!;
    } else {
      const pos = i * ratio;
      const i0 = Math.floor(pos);
      const i1 = Math.min(i0 + 1, samples.length - 1);
      s = samples[i0]! + (samples[i1]! - samples[i0]!) * (pos - i0);
    }
    const clamped = Math.max(-1, Math.min(1, s));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(bin);
}

export class MicCapture {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private levelNow = 0;
  /** While true, captured chunks are dropped instead of delivered. */
  muted = false;

  async start(stream: MediaStream, onChunk: (base64Pcm16k: string) => void): Promise<void> {
    // Ask for a 16 kHz context so the browser does the downsampling with a
    // proper anti-alias filter. The old approach (default 48 kHz context +
    // linear-interp decimation) aliased high frequencies into the speech
    // band, which measurably hurt the examiner's speech recognition,
    // especially for accented speech. Browsers that don't honour the rate
    // fall back to the manual resampler in floatTo16kPcmBase64.
    try {
      this.ctx = new AudioContext({ sampleRate: TARGET_IN_RATE });
    } catch {
      this.ctx = new AudioContext();
    }
    await this.ctx.resume(); // iOS: must be inside/after a user gesture
    const workletUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
    try {
      await this.ctx.audioWorklet.addModule(workletUrl);
    } finally {
      URL.revokeObjectURL(workletUrl);
    }
    this.source = this.ctx.createMediaStreamSource(stream);
    this.node = new AudioWorkletNode(this.ctx, 'pcm-capture');
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      const samples = e.data;
      let sum = 0;
      for (let i = 0; i < samples.length; i += 16) sum += samples[i]! * samples[i]!;
      this.levelNow = Math.min(1, Math.sqrt(sum / (samples.length / 16)) * 4);
      if (!this.muted && this.ctx) onChunk(floatTo16kPcmBase64(samples, this.ctx.sampleRate));
    };
    this.source.connect(this.node);
    // Worklets only run while connected toward the destination; a zero-gain
    // node keeps the graph alive without echoing the mic to the speakers.
    const silent = this.ctx.createGain();
    silent.gain.value = 0;
    this.node.connect(silent).connect(this.ctx.destination);
  }

  /** 0-1 microphone loudness right now (0 while muted). */
  level(): number {
    return this.muted ? 0 : this.levelNow;
  }

  async stop(): Promise<void> {
    this.node?.disconnect();
    this.source?.disconnect();
    if (this.ctx && this.ctx.state !== 'closed') await this.ctx.close();
    this.node = null;
    this.source = null;
    this.ctx = null;
  }
}

export class ExaminerPlayback {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartAt = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private levelBuf: Uint8Array<ArrayBuffer> | null = null;

  async start(): Promise<void> {
    this.ctx = new AudioContext({ sampleRate: OUT_RATE });
    await this.ctx.resume();
    this.gain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.levelBuf = new Uint8Array(this.analyser.frequencyBinCount);
    this.gain.connect(this.analyser).connect(this.ctx.destination);
  }

  /** Queues one base64 PCM16@24kHz chunk to play gap-free after the last. */
  enqueue(base64: string): void {
    if (!this.ctx || !this.gain) return;
    const bin = atob(base64);
    const view = new DataView(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) view.setUint8(i, bin.charCodeAt(i));
    const sampleCount = Math.floor(bin.length / 2);
    if (sampleCount === 0) return;
    const buffer = this.ctx.createBuffer(1, sampleCount, OUT_RATE);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) data[i] = view.getInt16(i * 2, true) / 0x8000;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.gain);
    const startAt = Math.max(this.ctx.currentTime, this.nextStartAt);
    src.start(startAt);
    this.nextStartAt = startAt + buffer.duration;
    this.activeSources.add(src);
    src.onended = () => this.activeSources.delete(src);
  }

  /** Drops everything queued — the model was interrupted mid-sentence. */
  flush(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    this.activeSources.clear();
    this.nextStartAt = 0;
  }

  /** True while queued audio is still playing out. */
  isSpeaking(): boolean {
    return !!this.ctx && this.nextStartAt > this.ctx.currentTime;
  }

  /** Resolves once everything currently queued has played out. */
  async waitUntilDone(): Promise<void> {
    while (this.isSpeaking()) await new Promise((r) => setTimeout(r, 150));
  }

  /** 0-1 output loudness right now, for the orb. */
  level(): number {
    if (!this.analyser || !this.levelBuf || !this.isSpeaking()) return 0;
    this.analyser.getByteFrequencyData(this.levelBuf);
    let sum = 0;
    for (let i = 0; i < this.levelBuf.length; i++) sum += this.levelBuf[i]!;
    return Math.min(1, sum / this.levelBuf.length / 96);
  }

  async stop(): Promise<void> {
    this.flush();
    if (this.ctx && this.ctx.state !== 'closed') await this.ctx.close();
    this.ctx = null;
    this.gain = null;
    this.analyser = null;
  }
}
