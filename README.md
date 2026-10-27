# dsh-pajama-whale

A tiny person in a blue-whale onesie who lives in the DeepSeek Harness window.
Drag him around: there is no gravity and no bounce, so a throw sends him
straight into a window edge, where he sticks, squashed flat, until you pull him
off. In his spare time he blinks, wags his tail, laughs, sleeps and shows a
thought cloud with what the agent is doing.

![status cloud](docs/preview.png)

## Install

```sh
dsh plugin add github:lubenkov/dsh-pajama-whale
```

Or install the current working copy with the plugin manager by pointing it at
this directory.

## What it does

- **Drag and throw.** Pointer drag with capture; release with speed to throw.
  No gravity, no bounces.
- **Squash against the window edge.** Four sprite directions (`up`, `right`,
  `left`, `down`) with 8 hand-drawn frames each. The edge he touches stays put,
  and the frame is chosen by how far the pointer overshoots the wall.
- **Emotions.** Blinking (4 frames), tail wag and joy (12 frames each) play on
  their own while he is idle.
- **Thought cloud.** Above his head, in priority order:
  - `?` — the agent waits for approval or an answer;
  - `! error` — the last turn failed;
  - `thinking` / `working` — the current turn is running (with or without a tool
    call so far);
  - `context N%` — context pressure above 80%;
  - `take a break?` — after 50 minutes of continuous work;
  - `z z z` — idle for 8 minutes (2 at night);
  - random idle thoughts every couple of minutes.
  Hover the cloud to see context pressure; click it to open the watched session.
- **Follows the DSH language.** English and Chinese dictionaries ship with the
  plugin and follow Settings → Language; anything else falls back to English.
- **Cheap when idle.** Breathing runs in short 3.4 s sessions every 25–40 s and
  stops completely when the window is hidden, so the compositor stays asleep.
- **Remembers its place.** Position is stored in `localStorage` and clamped on
  window resize.

The pet only occupies the frame-wide overlay slot (`shell.overlay`) and never
blocks clicks outside its own body.

## Development

Requirements: Node 20+, Python 3 with Pillow (only for rebuilding sprites).

```sh
# 1. pack the source frames into WebP strips (needs assets/sprites/)
python tools/build-sheets.py

# 2. inline the strips into the browser module
node tools/build-client.mjs
```

`assets/sprites/` is the generated artwork pack and is not committed because of
its size (about 64 MB). The committed `assets/build/*.webp` strips are the
packed result, and `client.js` is the built artifact that ships to users.

Source of truth:

| Path | Role |
|---|---|
| `src/client.src.js` | readable client source with sheet placeholders |
| `client.js` | built module with inlined WebP data URIs |
| `assets/build/*.webp` | packed sprite sheets |
| `tools/build-sheets.py` | packer (PNG frames -> WebP strips) |
| `tools/build-client.mjs` | inliner (strips -> `client.js`) |
| `index.js` | empty Host half; the pet is browser-side only |

## Artwork

The character and the sprite animations were generated with an external image
model and cleaned up for this pack. See `LICENSE` for the code license; the
artwork ships with the plugin.

## License

MIT
