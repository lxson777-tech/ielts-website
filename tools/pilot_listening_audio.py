"""Throwaway pilot: generate Section 1 of listening-full-001 as audio via
Gemini TTS, so we can listen to it and tune voice/accent/pacing before
building the real tools/generate_listening_audio.py.

Run from project root:
    python tools/pilot_listening_audio.py

Output: .tmp/pilot-listening-s1.wav
"""

import base64
import re
import time
import wave

import requests

from utils import require_env, tmp_path

MODEL = "gemini-2.5-flash-preview-tts"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

SAMPLE_RATE = 24000
SAMPLE_WIDTH = 2  # 16-bit
CHANNELS = 1
SILENCE_MS_BETWEEN_TURNS = 400

# (speaker, voice, style_prefix) — two distinct voices/accents so the two
# characters are easy to tell apart by ear.
VOICES = {
    "Receptionist": ("Kore", "Say in a warm, professional Southern English (RP) accent, at a natural brisk customer-service pace:"),
    "Caller": ("Puck", "Say in a friendly, casual Northern English accent, at a natural conversational pace:"),
}

# Section 1 transcript, from src/data/tests/listening-full-001.ts (original
# content already written for this site).
TURNS = [
    ("Receptionist", "Good morning, Redwood Leisure Centre, how can I help you?"),
    ("Caller", "Oh hello, I'd like to book my daughter in for swimming lessons, please."),
    ("Receptionist", "Of course. Could I take her name first?"),
    ("Caller", "Yes, it's Isla Marchetti. That's M-A-R-C-H-E-T-T-I."),
    ("Receptionist", "Thank you. And how old is Isla?"),
    ("Caller", "She's seven."),
    ("Receptionist", "Great, that puts her in our Improvers group rather than the beginners. Do you have a preferred day?"),
    ("Caller", "Thursdays would be best for us, if that's possible."),
    ("Receptionist", "Let me check... yes, we have a Thursday class at half past four."),
    ("Caller", "That sounds perfect."),
    ("Receptionist", "Lovely. The Improvers course runs for eight weeks and costs sixty-five pounds in total."),
    ("Caller", "Ok, and when does the course actually start?"),
    ("Receptionist", "The next course starts on the ninth of September."),
    ("Caller", "Great. Do I need to bring anything on the first day?"),
    ("Receptionist", "Just a swimming costume and a towel — we provide all the kickboards and floats. Could I take a contact number, in case we need to reach you?"),
    ("Caller", "Yes, it's oh-seven-seven-double-oh, two-two-six, eight-nine-four."),
    ("Receptionist", "Thank you. And finally, could I take the name of someone we should contact in an emergency, other than yourself?"),
    ("Caller", "That would be my husband, Marco Marchetti."),
    ("Receptionist", "Perfect, that's everything I need. We'll see Isla on the ninth of September."),
]


def synth_turn(api_key: str, speaker: str, text: str) -> bytes:
    voice, style = VOICES[speaker]
    body = {
        "contents": [{"parts": [{"text": f"{style} {text}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    max_attempts = 6
    for attempt in range(1, max_attempts + 1):
        resp = requests.post(
            URL,
            headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
            json=body,
            timeout=60,
        )
        if resp.status_code == 200:
            break
        if resp.status_code == 429 and attempt < max_attempts:
            m = re.search(r"retry in ([\d.]+)s", resp.text)
            wait = float(m.group(1)) + 2 if m else 20.0
            print(f"      rate limited, waiting {wait:.0f}s (attempt {attempt}/{max_attempts})...")
            time.sleep(wait)
            continue
        raise SystemExit(f"Gemini TTS error {resp.status_code} for {speaker!r}: {resp.text[:500]}")
    data = resp.json()
    try:
        b64 = data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
    except (KeyError, IndexError):
        raise SystemExit(f"Unexpected response shape for {speaker!r}: {data}")
    return base64.b64decode(b64)


def main():
    env = require_env("GEMINI_API_KEY")
    api_key = env["GEMINI_API_KEY"]

    silence = b"\x00\x00" * int(SAMPLE_RATE * SILENCE_MS_BETWEEN_TURNS / 1000)
    chunks = []
    for i, (speaker, text) in enumerate(TURNS, 1):
        print(f"  [{i}/{len(TURNS)}] {speaker}: {text[:60]}{'...' if len(text) > 60 else ''}")
        chunks.append(synth_turn(api_key, speaker, text))
        if i < len(TURNS):
            chunks.append(silence)

    out_path = tmp_path("pilot-listening-s1.wav")
    with wave.open(str(out_path), "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(b"".join(chunks))

    print(f"\nDone. Wrote {out_path}")


if __name__ == "__main__":
    main()
