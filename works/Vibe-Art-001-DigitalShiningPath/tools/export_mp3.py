#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
export_mp3.py
DSP_Sim以下のambient.wavをambient.mp3へ一括変換し、各index.htmlをMP3優先の<audio>へ差し替える。
"""
import argparse, subprocess, json
from pathlib import Path
from shutil import which

def wav_to_mp3_ffmpeg(wav_path: Path, mp3_path: Path, bitrate="192k"):
    ff = which("ffmpeg") or which("avconv")
    if not ff:
        return False, "ffmpeg/avconv not found"
    cmd = [ff, "-y", "-i", str(wav_path), "-vn", "-ar", "44100", "-ac", "1", "-b:a", bitrate, str(mp3_path)]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    ok = p.returncode == 0 and mp3_path.exists()
    return ok, ("ok" if ok else p.stderr.decode("utf-8", "ignore"))

def wav_to_mp3_pydub(wav_path: Path, mp3_path: Path, bitrate="192k"):
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_wav(str(wav_path))
        audio.export(str(mp3_path), format="mp3", bitrate=bitrate)
        return mp3_path.exists(), "ok" if mp3_path.exists() else "export failed"
    except Exception as e:
        return False, f"pydub failed: {e}"

def patch_html_audio(html_path: Path):
    if not html_path.exists():
        return False
    s = html_path.read_text(encoding="utf-8")
    old = '<audio controls src="ambient.wav" preload="auto" style="width:100%"></audio>'
    new = ('<audio controls preload="auto" style="width:100%">'
           '<source src="ambient.mp3" type="audio/mpeg">'
           '<source src="ambient.wav" type="audio/wav">'
           'お使いのブラウザは音声要素に対応していません。'
           '</audio>')
    if old in s:
        s = s.replace(old, new)
        html_path.write_text(s, encoding="utf-8")
        return True
    return False

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=str, default="./DSP_Sim")
    ap.add_argument("--bitrate", type=str, default="192k")
    args = ap.parse_args()

    root = Path(args.root)
    rows = []
    if not root.exists():
        print("No DSP_Sim found.")
        return

    for d in root.iterdir():
        if not d.is_dir():
            continue
        wav = d / "ambient.wav"
        if wav.exists():
            mp3 = d / "ambient.mp3"
            ok, info = wav_to_mp3_ffmpeg(wav, mp3, bitrate=args.bitrate)
            if not ok:
                ok, info = wav_to_mp3_pydub(wav, mp3, bitrate=args.bitrate)
            patched = patch_html_audio(d / "index.html")
            rows.append({
                "participant": d.name,
                "wav": str(wav),
                "mp3": str(mp3) if mp3.exists() else "",
                "encoder": info if ok else "FAILED",
                "html_updated": patched
            })

    report = root / "mp3_export_report.json"
    report.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(str(report))

if __name__ == "__main__":
    main()
