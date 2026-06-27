#!/usr/bin/env python3
"""Generate per-scene MP3 + word-boundary timings via edge-tts."""
import asyncio
import json
import os
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[2]
SCENES_PATH = Path(__file__).parent / "scenes.json"
OUT = ROOT / "docs" / "demo-video" / "output" / "audio"
VOICE = os.environ.get("DEMO_VOICE", "en-IN-PrabhatNeural")
RATE = "-5%"
SKIP_TTS = os.environ.get("SKIP_TTS") == "1"


async def scene_tts(scene_id: str, text: str) -> dict:
    mp3 = OUT / f"{scene_id}.mp3"
    words_json = OUT / f"{scene_id}.words.json"

    if SKIP_TTS and mp3.exists() and words_json.exists():
        return json.loads(words_json.read_text(encoding="utf-8"))

    comm = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    words = []
    audio_chunks = []

    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append(
                {
                    "text": chunk["text"],
                    "offset": chunk["offset"] / 1e7,
                    "duration": chunk["duration"] / 1e7,
                }
            )

    mp3.write_bytes(b"".join(audio_chunks))
    payload = {"id": scene_id, "narration": text, "mp3": str(mp3), "words": words}
    words_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    scenes = json.loads(SCENES_PATH.read_text(encoding="utf-8"))
    results = []
    for scene in scenes:
        payload = await scene_tts(scene["id"], scene["narration"])
        results.append(payload)
        print(f"  {scene['id']}: {len(payload['words'])} words", flush=True)
    manifest = OUT / "manifest.json"
    manifest.write_text(json.dumps(results, indent=2), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
