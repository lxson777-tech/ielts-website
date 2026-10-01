/* Read actual encoded audio, never the browser's durationMs claim. Reject
   unrecognised or truncated files before spending on transcription. */
export function audioDurationMs(base64: string, mime: string): number {
  let raw: string;
  try { raw = atob(base64); } catch { throw new Error('Invalid audio'); }
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const text = (i: number, n: number) => raw.slice(i, i+n);
  if (/wav/i.test(mime)) {
    if (bytes.length < 44 || text(0,4) !== 'RIFF' || text(8,4) !== 'WAVE') throw new Error('Invalid WAV');
    let rate = 0, size = 0;
    for (let i=12; i+8<=bytes.length;) {
      const n=view.getUint32(i+4,true), name=text(i,4);
      if (i+8+n>bytes.length) throw new Error('Truncated WAV');
      if (name==='fmt ' && n>=16) {
        if (![1,3].includes(view.getUint16(i+8,true))) throw new Error('Unsupported WAV');
        const channels=view.getUint16(i+10,true), hz=view.getUint32(i+12,true), bits=view.getUint16(i+22,true);
        if (channels<1 || channels>2 || hz<8000 || hz>192000 || ![8,16,24,32].includes(bits)) throw new Error('Unsupported WAV format');
        rate=channels*hz*bits/8;
        if (view.getUint32(i+16,true)!==rate || view.getUint16(i+20,true)!==channels*bits/8) throw new Error('Invalid WAV rate');
      }
      if (name==='data') size+=n;
      i+=8+n+(n%2);
    }
    if (!rate || !size) throw new Error('Empty WAV');
    return size/rate*1000;
  }
  if (!/mp3|mpeg/i.test(mime)) throw new Error('Unsupported audio');
  let i=0, ms=0, frames=0;
  if (text(0,3)==='ID3' && bytes.length>=10) {
    i=10+((bytes[6]&127)<<21)+((bytes[7]&127)<<14)+((bytes[8]&127)<<7)+(bytes[9]&127);
    if (bytes[5]&16) i+=10;
  }
  const br1=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320];
  const br2=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
  while (i+4<=bytes.length) {
    if (bytes.length-i===128 && text(i,3)==='TAG') break;
    const a=bytes[i], b=bytes[i+1], c=bytes[i+2];
    if (a!==255 || (b&224)!==224 || ((b>>1)&3)!==1) throw new Error('Invalid MP3 frame');
    const v=(b>>3)&3, sr=(c>>2)&3, bi=c>>4;
    if (v===1 || sr===3 || bi===0 || bi===15) throw new Error('Unsupported MP3');
    const hz=[44100,48000,32000][sr]/(v===3?1:v===2?2:4);
    const bitrate=(v===3?br1:br2)[bi]*1000;
    const length=Math.floor((v===3?144:72)*bitrate/hz)+((c>>1)&1);
    if (i+length>bytes.length) throw new Error('Truncated MP3');
    ms+=(v===3?1152:576)/hz*1000; frames++; i+=length;
  }
  if (!frames) throw new Error('Empty MP3');
  return ms;
}
