/* lamejs ships no TypeScript types. This declares only what
   src/lib/speaking/encode.ts actually uses: a mono MP3 encoder that takes
   16-bit PCM samples one 1152-sample chunk at a time. */
declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array): Int8Array;
    flush(): Int8Array;
  }
}

/* lamejs 1.2.1's own package entry (src/js/index.js) is broken under any
   real ES-module bundler, not just one file: about a dozen of its internal
   modules (Lame.js, BitStream.js, Encoder.js, PsyModel.js, Quantize.js,
   QuantizePVT.js, Presets.js, VBRTag.js, NewMDCT.js, LameGlobalFlags.js,
   LameInternalFlags.js) read sibling class names (MPEGMode, Lame,
   BitStream, ATH, Takehiro, ...) as free identifiers without requiring
   them. The original lame.all.js browser bundle papers over this by
   concatenating every file into one shared function scope, where an
   unrequired sibling still resolves as a closure variable; per-file
   CommonJS modules (what a bundler sees) don't share scope that way, so at
   runtime this throws "X is not defined" the first time a Mp3Encoder
   actually runs. src/lib/speaking/lamejsGlobalsShim.ts imports every
   submodule directly and hangs each one onto globalThis under its class
   name before any encoder is constructed, which is what those files were
   already implicitly relying on. This wildcard declaration is what lets
   that shim import each submodule path with a usable type. */
declare module 'lamejs/src/js/*.js' {
  const value: unknown;
  export default value;
}
