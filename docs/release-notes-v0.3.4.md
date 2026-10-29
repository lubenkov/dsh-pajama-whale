# dsh-pajama-whale 0.3.4

A draggable pet in a blue-whale onesie for DeepSeek Harness.

## Highlights

- Drag and throw with no gravity or bounce; he sticks flat to any window edge
  and stays squashed there until you pull him away.
- Agent poses: `thinking` while a turn runs, `working` once a tool has run,
  `joy` when the turn ends, `yawn` when you wake him, and a looping `sleepy`
  after a minute of quiet.
- Thought cloud with strict priority: `?` waiting, `! error`, `take a break?`,
  `context N%` at 80% (with a `surprised` animation), and a rare `hmm…`.
- Click the pet to see the current context for 5 seconds; hover the cloud for
  the same reading; click the cloud to open the session.
- English and Chinese UI, follows the DSH language setting.
- No network calls, no telemetry; only the pet's position is stored locally.
- 129 frames across 12 sprites, inlined into one 3.1 MB `client.js`, so no
  build step and no runtime downloads.

## Install

Web:

```sh
dsh plugin --profile web add github:lubenkov/dsh-pajama-whale#v0.3.4
```

Desktop: use the command installed from **Manage dsh Command…** for
`dsh plugin --profile desktop add …`, or install from **Plugins** inside the
app.

## Compatibility

- Declared `engines.dsh`: `>=0.2.1-rc.2 <0.3.0-0`.
- Verified on DSH `0.2.1-rc.2` (npm CLI, Web) and `0.2.1-rc.3` (Desktop).
- See [COMPATIBILITY.md](COMPATIBILITY.md) for the API surface, graceful
  degradation and version exemptions.

## Changes since 0.3.3

- Guarded the remaining `uiSession` and locale subscriptions.
- Squash frames now always win over one-shot emotions.
- Corrected the Desktop install instructions, frame-rate ranges and market
  index wording.
- Added `screenshots.json` and this release note.
