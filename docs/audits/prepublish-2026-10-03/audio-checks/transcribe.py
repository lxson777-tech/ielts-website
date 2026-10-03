"""Cut short clips from the local listening MP3s and transcribe them with
faster-whisper (local, free). Never modifies the original audio.

    python transcribe.py jobs.json MODEL

Copy this file and the jobs*.json files into .tmp/audio/ (git-ignored) and
run it from there: it finds the repository two folders up, writes the clips
to .tmp/audio/clips/ and the transcripts to .tmp/audio/out/. Used on
3 October 2026 with MODEL = large-v3 (int8, CPU) to settle the doubtful Listening keys.
"""
import json, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
AUDIO = ROOT / "public" / "audio" / "listening"
CLIPS = HERE / "clips"; CLIPS.mkdir(exist_ok=True)
OUT = HERE / "out"; OUT.mkdir(exist_ok=True)


def secs(t):
    if isinstance(t, (int, float)):
        return float(t)
    m, s = t.split(":")
    return int(m) * 60 + float(s)


def fmt(t):
    m = int(t // 60); s = t - m * 60
    return f"{m:02d}:{s:05.2f}"


def main():
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
    model_name = sys.argv[2]
    only = set(sys.argv[3:])
    from faster_whisper import WhisperModel
    t0 = time.time()
    model = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=10)
    print(f"model {model_name} loaded in {time.time()-t0:.0f}s", flush=True)
    for job in jobs:
        if only and job["name"] not in only:
            continue
        src = AUDIO / f"test-{job['test']:03d}.mp3"
        start, end = secs(job["start"]), secs(job["end"])
        for tempo in job.get("tempos", [1.0]):
            for pi, prompt in enumerate([None] + job.get("prompts", [])):
                tag = f"{job['name']}_t{int(tempo*100)}" + (f"_p{pi}" if prompt else "")
                clip = CLIPS / f"{job['name']}_t{int(tempo*100)}.wav"
                if not clip.exists():
                    af = ["-af", f"atempo={tempo}"] if tempo != 1.0 else []
                    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(start), "-to", str(end),
                                    "-i", str(src), "-ac", "1", "-ar", "16000", *af, str(clip)], check=True)
                t1 = time.time()
                segs, _info = model.transcribe(str(clip), language="en", beam_size=5, word_timestamps=True,
                                               condition_on_previous_text=False, initial_prompt=prompt,
                                               vad_filter=False, temperature=0.0)
                lines = [f"# {job['name']}: test {job['test']} audio {fmt(start)}-{fmt(end)}, model {model_name}, "
                         f"speed x{tempo}" + (f", prompt: {prompt!r}" if prompt else ", no prompt"), ""]
                for s in segs:
                    a = start + s.start * tempo; b = start + s.end * tempo
                    lines.append(f"[{fmt(a)}-{fmt(b)}] {s.text.strip()}")
                    words = " ".join(f"{w.word.strip()}@{fmt(start + w.start*tempo)}" for w in (s.words or []))
                    lines.append(f"    words: {words}")
                text = "\n".join(lines) + "\n"
                (OUT / f"{tag}.txt").write_text(text, encoding="utf8")
                print(text, f"({time.time()-t1:.0f}s)", flush=True)


if __name__ == "__main__":
    main()
