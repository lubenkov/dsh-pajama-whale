# Compatibility

Declared range: `>=0.2.1-rc.2 <0.3.0-0` (`engines.dsh` in `package.json`).

DSH enforces this range at installation and at profile startup. A version
outside it is refused until you grant an exact-version exemption for that
plugin version and that DSH runtime. Prereleases participate in range
matching, so `<0.3.0-0` is used to exclude every `0.3.0` prerelease as well.

## Verified against

| DSH version | Where it was checked |
|---|---|
| `0.2.1-rc.2` | `@deepseek-ai/dsh` from npm, install and behaviour |
| `0.2.1-rc.3` | DeepSeek Harness desktop runtime, install and behaviour |

## If DSH refuses the range

Installation reports `incompatible-version` with the unmet `engines.dsh`
requirement. Grant an exemption only after accepting the risk, with the exact
plugin and runtime versions:

```sh
dsh plugin --profile <profile> allow-version \
  dsh-pajama-whale@<version> \
  --dsh-version <dsh-version> \
  --accept-risk
```

The grant is stored in the profile's `compatibility.json`; it covers only that
exact pair and is not inherited by plugin or DSH upgrades. Revoke it with
`revoke-version`. In the Web UI the same operation is available through the
plugin manager's version-exemption actions.

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
- Service lookups and snapshot reads are wrapped: if `host.get`, `binding`,
  `getSnapshot`, a projection or a subscription throws, that channel is skipped
  and the pet stays a decoration. The host UI is never blocked by the pet.

To see which channels are live, set
`localStorage['pajama-whale:debug'] = '1'` and reload. The cloud then shows the
detected session id, the `uiSession` id, which slot hooks are present, whether
the session is running, and whether `ctx.get` is callable.

## Updating

When a new DSH release changes a client API: update the range in
`package.json` and in the market index, verify the debug line still shows live
channels, and add the version to the table above.
