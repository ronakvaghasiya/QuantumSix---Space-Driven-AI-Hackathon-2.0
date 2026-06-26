#!/usr/bin/env python3
"""
Generate RepoPilot AI demo video with AI voice narration (edge-tts) + screenshots.

Usage:
  .venv-video/bin/python scripts/generate-demo-video.py
  npm run demo:video

Output:
  docs/RepoPilot_AI_Demo_Video.mp4
"""
from __future__ import annotations

import asyncio
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
SCREENSHOTS = ROOT / "docs" / "screenshots"
OUT_DIR = ROOT / "docs" / "demo-video"
OUT_VIDEO = ROOT / "docs" / "RepoPilot_AI_Demo_Video.mp4"
NARRATION_JSON = SCRIPTS / "demo-narration.json"

W, H = 1920, 1080
FPS = 30
BG = "0x0f172a"


def ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    for name in ("ffmpeg", "avconv"):
        p = shutil.which(name)
        if p:
            return p
    raise RuntimeError(
        "ffmpeg not found. Run: .venv-video/bin/pip install imageio-ffmpeg edge-tts Pillow"
    )


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"Command failed:\n{' '.join(cmd)}\n{r.stderr[-4000:]}")


def probe_duration(ffmpeg: str, path: Path) -> float:
    r = subprocess.run([ffmpeg, "-i", str(path)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", r.stderr)
    if m:
        h, mnt, s = m.groups()
        return int(h) * 3600 + int(mnt) * 60 + float(s)
    raise RuntimeError(f"Cannot probe duration: {path}")


def probe_image_size(ffmpeg: str, path: Path) -> tuple[int, int]:
    r = subprocess.run([ffmpeg, "-i", str(path)], capture_output=True, text=True)
    m = re.search(r", (\d+)x(\d+)", r.stderr)
    if not m:
        raise RuntimeError(f"Cannot probe image: {path}")
    return int(m.group(1)), int(m.group(2))


def make_title_card_png(title: str, subtitle: str, out: Path) -> None:
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (W, H), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)
    try:
        font_lg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
    except OSError:
        font_lg = ImageFont.load_default()
        font_sm = font_lg

    draw.text((W // 2, H // 2 - 80), title, fill=(34, 197, 94), font=font_lg, anchor="mm")
    draw.text((W // 2, H // 2 + 40), subtitle, fill=(255, 255, 255), font=font_sm, anchor="mm")
    draw.text((W // 2, H - 80), "From a Prompt to Production", fill=(148, 163, 184), font=font_sm, anchor="mm")
    img.save(out)


def make_image_clip(ffmpeg: str, image: Path, audio: Path, out: Path) -> None:
    duration = probe_duration(ffmpeg, audio) + 0.35
    iw, ih = probe_image_size(ffmpeg, image)
    scaled_h = int(ih * W / iw)

    if scaled_h <= H:
        vf = (
            f"scale={W}:{H}:force_original_aspect_ratio=decrease,"
            f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={BG}"
        )
        run([
            ffmpeg, "-y", "-loop", "1", "-i", str(image), "-i", str(audio),
            "-vf", vf, "-c:v", "libx264", "-tune", "stillimage", "-c:a", "aac",
            "-b:a", "192k", "-pix_fmt", "yuv420p", "-t", f"{duration:.2f}", str(out),
        ])
    else:
        scroll = scaled_h - H
        vf = (
            f"scale={W}:-2,"
            f"crop={W}:{H}:0:"
            f"'min({scroll}\\,t*{scroll}/{duration:.2f})'"
        )
        run([
            ffmpeg, "-y", "-loop", "1", "-framerate", str(FPS), "-i", str(image),
            "-i", str(audio), "-vf", vf, "-c:v", "libx264", "-c:a", "aac",
            "-b:a", "192k", "-pix_fmt", "yuv420p", "-t", f"{duration:.2f}", str(out),
        ])


def make_title_clip(ffmpeg: str, title: str, audio: Path, out: Path) -> None:
    png = out.with_suffix(".png")
    make_title_card_png("RepoPilot AI", title, png)
    make_image_clip(ffmpeg, png, audio, out)
    png.unlink(missing_ok=True)


async def synthesize_scene(
    ffmpeg: str, scene: dict, idx: int, work: Path, voice: str, rate: str
) -> Path:
    import edge_tts

    audio = work / f"{idx:02d}-{scene['id']}.mp3"
    clip = work / f"{idx:02d}-{scene['id']}.mp4"
    communicate = edge_tts.Communicate(scene["narration"], voice, rate=rate)
    await communicate.save(str(audio))

    image_name = scene.get("image")
    if image_name:
        img = SCREENSHOTS / image_name
        if not img.exists():
            raise FileNotFoundError(f"Screenshot missing: {img}")
        make_image_clip(ffmpeg, img, audio, clip)
    else:
        make_title_clip(ffmpeg, scene.get("title", "Demo"), audio, clip)

    print(f"  ✓ Scene {idx:02d}: {scene['id']} ({probe_duration(ffmpeg, clip):.1f}s)")
    return clip


def concat_clips(ffmpeg: str, clips: list[Path], out: Path) -> None:
    lst = out.parent / "concat.txt"
    with lst.open("w") as f:
        for c in clips:
            f.write(f"file '{c.resolve()}'\n")
    run([
        ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
        "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", str(out),
    ])
    lst.unlink(missing_ok=True)


async def main_async() -> None:
    if not NARRATION_JSON.exists():
        raise FileNotFoundError(NARRATION_JSON)

    cfg = json.loads(NARRATION_JSON.read_text())
    voice = cfg.get("voice", "en-IN-NeerjaNeural")
    rate = cfg.get("rate", "+5%")
    scenes = cfg["scenes"]

    ffmpeg = ffmpeg_exe()
    print(f"Using ffmpeg: {ffmpeg}")
    print(f"Voice: {voice} | Scenes: {len(scenes)}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    work = OUT_DIR / "segments"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir()

    clips: list[Path] = []
    for i, scene in enumerate(scenes, 1):
        clip = await synthesize_scene(ffmpeg, scene, i, work, voice, rate)
        clips.append(clip)

    print("\nMerging segments...")
    concat_clips(ffmpeg, clips, OUT_VIDEO)

    downloads = Path.home() / "Downloads" / "RepoPilot_AI_Demo_Video.mp4"
    try:
        shutil.copy2(OUT_VIDEO, downloads)
        print(f"Copied: {downloads}")
    except OSError:
        pass

    size_mb = OUT_VIDEO.stat().st_size / (1024 * 1024)
    total_s = probe_duration(ffmpeg, OUT_VIDEO)
    print(f"\nDone: {OUT_VIDEO}")
    print(f"Duration: {int(total_s // 60)}m {int(total_s % 60)}s | Size: {size_mb:.1f} MB")


def main() -> None:
    try:
        asyncio.run(main_async())
    except KeyboardInterrupt:
        sys.exit(1)


if __name__ == "__main__":
    main()
