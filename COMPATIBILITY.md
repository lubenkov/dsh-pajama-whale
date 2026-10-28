# Compatibility

Declared range: `>=0.2.1-rc.2 <0.3.0` (`engines.dsh` in `package.json`).

## Verified against

| DSH version | Where it was checked |
|---|---|
| `0.2.1-rc.2` | `@deepseek-ai/dsh` from npm, install and behaviour |
| `0.2.1-rc.3` | DeepSeek Harness desktop runtime, install and behaviour |

DSH does not read `engines.dsh` from a plugin's `package.json`; the field is
declarative. The plugin market index carries the same range per version and
shows compatibility from it.

## APIs used

| Integration | Required | Used for |
|---|---|---|
| `shell.overlay` slot | yes | mounting the pet |
| `ctx.locale` | no | English/Chinese strings, falls back to English |
| slot props `useSessions`, `useSessionStatus` | no | current session and running state |
| `uiSession` service | no | fallback source for session id and status |
| `ctx.sessions.binding(id)` with `contextPressure`, `title`, `eventSource` | no | context percentage, session title, tool activity |
| `uiWorkspace.openSession` | no | opening the watched session from the cloud |

## Degradation

- No session channels: the pet still renders, drags and squashes; the cloud
  keeps only the idle thought.
- No locale service: English strings.
- No `uiWorkspace`: clicking the cloud does nothing.
- No slot standard props: the pet uses `uiSession` and `sessions.binding`.
- Any thrown integration error is contained; the pet never blocks the host UI.

To see which channels are live, set
`localStorage['pajama-whale:debug'] = '1'` and reload. The cloud then shows the
detected session id, the `uiSession` id, which slot hooks are present, whether
the session is running, and whether `ctx.get` works.

## Updating

When a new DSH release changes a client API: update the range here and in the
market index, verify the debug line still shows live channels, and add the
version to the table above.
