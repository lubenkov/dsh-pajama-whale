# Publishing

Everything in this file that needs an account is done by the maintainer. The
repository side is already prepared: `dsh.bundle`, `cordis.patch.yml`, the
`dsh-plugin` topic, the icon, `screenshots.json`, tags and CI.

## Current state

- Repository: <https://github.com/lubenkov/dsh-pajama-whale>
- Default branch: `master`
- Latest release: `v0.3.4`
- npm name `dsh-pajama-whale`: free at the time of writing
- Package: prebuilt `client.js`, no install or build scripts

## 1. npm publish (optional for awesome, needed for Discover)

Publishing makes the plugin appear in the Discover index and gives storefronts
a download figure. It is not required for the awesome list.

```sh
npm login
npm whoami
npm view dsh-pajama-whale version   # expected: 404 until the first publish
npm publish
npm view dsh-pajama-whale version   # expected: 0.3.4
```

Requirements checked by the catalog:

- the published `repository` field points back at this repository (it does);
- `package.json` has a `dsh.bundle` manifest (it does);
- the version matches the tag (`0.3.4`).

If the account uses 2FA, `npm publish` asks for a one-time password. If the
name becomes taken before publishing, scope it instead (`@lubenkov/dsh-pajama-whale`)
and update the install commands in both READMEs.

## 2. GitHub Release for the tag

A release is optional, but it gives users release notes and a stable artifact.

Web UI: **Releases → Draft a new release → Choose tag `v0.3.4`** and use the
notes below.

CLI:

```sh
gh release create v0.3.4 --repo lubenkov/dsh-pajama-whale \
  --title "dsh-pajama-whale 0.3.4" \
  --notes-file docs/release-notes-v0.3.4.md
```

Optional prebuilt tarball (only needed if the storefront should offer a tarball
instead of a source install; the repository already installs without a build
step):

```sh
npm pack
gh release upload v0.3.4 dsh-pajama-whale-0.3.4.tgz
```

If you add a tarball, point the awesome entry at it:

```yaml
tarball: https://github.com/lubenkov/dsh-pajama-whale/releases/download/v0.3.4/dsh-pajama-whale-0.3.4.tgz
```

## 3. Awesome DSH Plugin PR

The list is generated from `data/plugins/`, one YAML file per plugin. Do not
edit the READMEs.

1. Fork <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin>.
2. Add `data/plugins/lubenkov__dsh-pajama-whale.yml`:

```yaml
url: https://github.com/lubenkov/dsh-pajama-whale
name: lubenkov/dsh-pajama-whale
category: fun
description:
  en: 'A draggable pet in a blue-whale onesie: sticks to window edges, squashes flat, blinks, sleeps, and shows agent status in a thought cloud.'
  zh: '一个穿着蓝色鲸鱼连体衣、可拖动的宠物：会贴住窗口边缘、被压扁，会眨眼、睡觉，并用气泡显示智能体状态。'
icon: https://raw.githubusercontent.com/lubenkov/dsh-pajama-whale/master/assets/icon.png
```

The English description contains `: `, so it is quoted; without quotes YAML
reads it as a nested key and CI fails.

3. Commit and open a PR:

```sh
git checkout -b add-dsh-pajama-whale
git add data/plugins/lubenkov__dsh-pajama-whale.yml
git commit -m "Add dsh-pajama-whale"
git push origin add-dsh-pajama-whale
```

PR title: `Add dsh-pajama-whale`. In the body, say what the plugin does, link
the repository and the preview, and mention that it is a `dsh.bundle` package
installed with `dsh plugin add`. One entry per PR; ours is one.

CI checks: entry count, `dsh.bundle` in `package.json`, repository age (older
than one day), `awesome-lint` and README regeneration. A maintainer then checks
that the description matches the code.

## 4. After merge

- The site and the generated index rebuild automatically.
- If npm is published, the Discover card picks up the npm mapping by repository
  URL; no extra field is needed in the YAML.
- dsh-market shows the entry with the icon and `docs/preview.png` screenshot.

## 5. Verification after publishing

```sh
dsh plugin --profile web add dsh-pajama-whale@0.3.4
dsh plugin --profile web remove dsh-pajama-whale
```

Or with the Git install:

```sh
dsh plugin --profile web add github:lubenkov/dsh-pajama-whale#v0.3.4
```

Then open **Plugins → Discover**, search for `pajama`, and check the card,
icon and screenshot.
