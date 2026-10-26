#!/usr/bin/env python3
"""Build the WebP sprite sheets used by the browser client.

The hand-cut PNG frames live in ``assets/sprites/`` (a generated pack that is
not committed because of its size). This script packs each animation into a
horizontal WebP strip in ``assets/build/``; ``tools/build-client.mjs`` then
inlines those strips into ``client.js`` as data URIs.

    python tools/build-sheets.py
    node tools/build-client.mjs

Requires Pillow.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "sprites"
OUT = ROOT / "assets" / "build"

CELL_W, CELL_H = 288, 361
QUALITY = 80

# name -> (source frame count, playback fps, frame stride, loop)
EMOTIONS = {
    "blink": (4, 16, 1, False),
    "tail_wag": (12, 14, 1, True),
    "joy": (12, 14, 1, True),
}


def sheet(paths: list[Path], name: str) -> int:
    strip = Image.new("RGBA", (CELL_W * len(paths), CELL_H), (0, 0, 0, 0))
    for index, path in enumerate(paths):
        frame = Image.open(path).convert("RGBA").resize((CELL_W, CELL_H), Image.LANCZOS)
        strip.alpha_composite(frame, (index * CELL_W, 0))
    out = OUT / name
    strip.save(out, "WEBP", quality=QUALITY, method=6)
    return out.stat().st_size


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(
            f"missing sprite pack at {SRC}; it is not committed, ask the author for it"
        )
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0

    for direction in ("up", "right", "left", "down"):
        files = [SRC / direction / f"{direction}_{i:02d}.png" for i in range(8)]
        size = sheet(files, f"squash-{direction}.webp")
        total += size
        print(f"squash-{direction}.webp: 8 frames, {size} bytes")

    for name, (count, _fps, stride, _loop) in EMOTIONS.items():
        files = [SRC / "emotions" / name / f"{name}_{i:02d}.png" for i in range(0, count, stride)]
        size = sheet(files, f"emo-{name}.webp")
        total += size
        print(f"emo-{name}.webp: {len(files)} frames, {size} bytes")

    manifest = {
        "cell": [CELL_W, CELL_H],
        "squash": {direction: 8 for direction in ("up", "right", "left", "down")},
        "emotions": {
            name: {"frames": count // stride, "fps": fps, "loop": loop}
            for name, (count, fps, stride, loop) in EMOTIONS.items()
        },
        "neutral_bbox": [69, 68, 716, 1049],
        "frame": [896, 1123],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(f"total {total} bytes ({total / 1024 / 1024:.2f} MiB)")


if __name__ == "__main__":
    main()
