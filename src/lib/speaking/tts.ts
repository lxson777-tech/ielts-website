/* Free browser text-to-speech. Phase 1 of the Speaking checker calls this
   directly (no avatar yet); the avatar wrapper added later reuses the same
   speechSynthesis call for its actual audible voice while separately driving
   lip-sync from a silent, heuristically-timed buffer — this module is the
   one place that owns "say this out loud". */

export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

export function cancelSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}
