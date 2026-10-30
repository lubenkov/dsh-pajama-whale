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

Other versions inside the declared range are admitted by that range but were
not verified by the author; only the rows above were run. CI validates
packaging, the build and locale consistency, not a live DSH session.

## Install paths

Tested on 2026-10-30 against the then-current npm release (`0.3.4`), each in a
fresh profile under a temporary `DSH_HOME`.

| Command | Result | Notes |
|---|---|---|
| `dsh plugin --profile test add dsh-pajama-whale` | works | resolves the latest release as `^0.3.4` |
| `dsh plugin --profile test add dsh-pajama-whale@0.3.4` | works | exact `0.3.4` |
| `dsh plugin --profile test add github:lubenkov/dsh-pajama-whale#v0.3.4` | works | needs `git` and HTTPS access to GitHub |
| `dsh plugin --profile desktop add ...` with the npm CLI | refused | `desktop` is reserved; use the command installed from **Manage dsh Command…** or the in-app **Plugins** page |

Each test profile listed `dsh-pajama-whale` under `dsh.profile.bundles`, and
`--dump-config` showed the `pajama-whale` row. The GitHub install was run with
full filesystem access because the sandbox blocked the `git ls-remote` child
process; that is a sandbox restriction, not a plugin requirement.

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
- The service calls made by the pet are wrapped: if `host.get`, `binding`,
  `getSnapshot`, a projection, a `uiSession` read or a subscription throws,
  that channel is skipped and the pet stays a decoration. Failures outside
  those calls, such as a React render error or a host renderer failure, are
  outside this guarantee.

To see which channels are live, set
`localStorage['pajama-whale:debug'] = '1'` and reload. The cloud then shows the
detected session id, the `uiSession` id, which slot hooks are present, whether
the session is running, and whether `ctx.get` is callable.

## Updating

When a new DSH release changes a client API: update the range in
`package.json` and in the market index, verify the debug line still shows live
channels, and add the version to the table above.
