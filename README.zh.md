<div align="center">

# 🐋 dsh-pajama-whale

**认识一下典型的 DeepSeek Harness 开发者。**

一个穿着蓝色鲸鱼连体衣、玩具大小的同事，住在你的 DSH 窗口里——
在你等待时告诉你智能体在做什么。

[![CI](https://github.com/lubenkov/dsh-pajama-whale/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/lubenkov/dsh-pajama-whale/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/dsh-pajama-whale?label=npm)](https://www.npmjs.com/package/dsh-pajama-whale)
[![downloads](https://img.shields.io/npm/dm/dsh-pajama-whale)](https://www.npmjs.com/package/dsh-pajama-whale)
[![DSH](https://img.shields.io/badge/DSH-%E2%89%A50.2.1--rc.2%20%3C0.3.0--0-4D6BFE)](COMPATIBILITY.md)

[English](README.md) · [中文](README.zh.md)

<img src="https://raw.githubusercontent.com/lubenkov/dsh-pajama-whale/master/docs/demo.gif" width="620" alt="宠物眨眼、被扔到墙上压扁、睡着并打哈欠">

</div>

他首先是个桌面玩具，其次才是状态指示器。推着他在窗口里移动，把他扔向墙壁——
他会平贴在墙上，一直粘在那里，直到你把他拖走。什么都不会坏：没有重力、没有伤害，
也不会对你的代码指指点点。别管他，他就会打瞌睡。

当长回合运行时，可以和他玩。工具开始时，他会掏出笔记本电脑；需要你时，他会冒出思考气泡；
当上下文快用完、回合失败，或者你已经连续工作五十分钟时，他会开口提醒。

无需配置。自身不发起网络请求。整个东西只占用一个 overlay 插槽。

## 安装

**Web**（已在 DSH `0.2.1-rc.2` 上验证）：

```sh
dsh plugin --profile web add dsh-pajama-whale
```

安装最新的 npm 版本；加上 `@0.3.5` 可固定版本。想直接从 GitHub 标签安装？
使用 `dsh plugin --profile web add github:lubenkov/dsh-pajama-whale#v0.3.5`
（需要 `git`）。

**Desktop，从终端安装。** npm 版 `dsh` CLI 拒绝保留的 `desktop` profile。
请先从应用菜单 **Manage dsh Command…** 安装命令，退出应用，然后运行：

```sh
dsh plugin --profile desktop add dsh-pajama-whale
```

之后重新打开应用。

**Desktop，在应用内安装。** 打开 **Plugins** 页面，在那里安装
`dsh-pajama-whale`。保持应用运行，并按照它提示的重启步骤操作。

要移除他：

```sh
dsh plugin --profile <profile> remove dsh-pajama-whale
```

安装时没有构建步骤：美术资源已内联进 `client.js`，所以只需要 `dsh plugin add`——
没有 postinstall 钩子，也没有运行时下载。它是一个纯 UI bundle（没有依赖，
除了它读取的那些之外不使用任何宿主服务）。

**声明兼容 DSH `>=0.2.1-rc.2 <0.3.0-0`**，写在 `engines.dsh` 中。DSH 会在安装和
启动 profile 时强制执行；超出范围会拒绝该 bundle，直到为确切的版本对授予豁免。
列入目录后，市场索引会保存一份自己的范围副本，因此两边需要保持同步。
API 面、豁免命令和优雅降级见 [COMPATIBILITY.md](COMPATIBILITY.md)。

## 和他一起玩

| 你 | 他 |
|---|---|
| 拖动 | 跟随指针。慢慢松开，他就留在原地；快速松开（>120 px/s），他就飞出去。没有重力，不会弹跳。 |
| 拖向墙壁 | 平贴在墙上：四个方向 × 8 帧，帧由你越过边界的距离（最多 110 px）决定；如果是扔出去的，则由撞击速度决定。 |
| 点击 | 在气泡里显示当前上下文压力（未知时显示会话标题），持续 5 秒。 |
| 悬停气泡 | 光标在那里时，显示同样的上下文读数。 |
| 点击气泡 | 打开他正在关注的会话。 |

## 他会跟随智能体

| 会话在做什么 | 他会做什么 |
|---|---|
| 本回合中已运行过工具 | 切换到 `working` 姿势——掏出笔记本电脑，12 帧 |
| 回合运行中，没有工具活动 | `thinking`，20 帧 |
| 回合结束 | 一次 `joy` 爆发 |
| 等待你的批准或回答 | 气泡显示 `?` |
| 上一个回合失败 | 气泡显示 `! error`，持续 6 秒 |
| 上下文压力达到 80 % | 一次 `surprised`；只要仍 ≥80 %，气泡就显示 `context N%`，低于 75 % 后 `surprised` 才会再次触发 |
| 连续工作 50 分钟 | 气泡建议 `take a break?`，持续 9 秒（每 45 分钟重复一次；少于 3 分钟的暂停仍算连续） |
| 安静一分钟 | 以循环的 16 帧 `sleepy` 睡着；当你用光标叫醒他时打哈欠（13 帧）——新的回合会安静地叫醒他 |

<img src="https://raw.githubusercontent.com/lubenkov/dsh-pajama-whale/master/docs/demo-working.gif" width="620" alt="宠物用笔记本电脑工作、思考，然后露出惊讶表情并显示上下文气泡">

空闲时他只会眨眼（75 %）或摇尾巴（25 %），每 1.9–4.5 秒一次，外加罕见的
`hmm…` 想法。一共是 12 张精灵图里的 129 帧。当你拖动他或他贴在墙上时，
姿势和一次性情绪会暂停：压扁帧优先。

### 一个气泡，严格优先级

`hover` / `click` 上下文 → `?` 等待 → `! error` → `take a break?` →
`context N%`（≥80 %）→ 空闲 `hmm…`（3.6 秒，每 70–160 秒）。悬停或点击总是优先，
所以宠物永远不会对你隐藏上下文读数。

## 省电又安静

- **无需构建，无需下载。** 全部 12 张图（2.3 MB WebP、129 帧）都以 data URI
  内联进单个 3.1 MB 的 `client.js`。插件自身不发起任何外部请求。
- **空闲时很省。** 当宠物空闲且没有姿势在播放时，`requestAnimationFrame` 循环会停止。
  精灵帧按各动画自己的速率前进——`sleepy` 8 fps、`yawn` 10 fps、`thinking` 和
  `working` 12 fps、尾巴/joy/`surprised` 14 fps、`blink` 16 fps。呼吸是每 25–40 秒
  一次的约 3.4 秒 CSS 动画。标签页隐藏时浏览器会暂停 `requestAnimationFrame`，
  呼吸也会被显式停止；状态计时器和空闲想法计时器会被浏览器降频，但不会取消。
  在 `prefers-reduced-motion` 下，呼吸和随机情绪会被禁用（姿势动画仍会播放）。
- **从不挡路。** 他只挂载到 `shell.overlay`，在他身体和气泡之外，
  overlay 是 `pointer-events: none`。
- **记住自己的位置。** 位置、贴住的墙和压扁深度保存在 `localStorage`，
  窗口缩放时会做边界钳制。

## 语言与隐私

英语和中文文案通过 `ctx.locale` 跟随“设置 → 语言”（其他语言回退到英语）。
插件只读取会话状态、上下文压力、会话标题和最近的工具活动来选择姿势。
它不向任何地方发送数据，没有遥测，只在你的机器上的 `localStorage` 中保存宠物的位置、
贴住的墙、压扁深度和粘贴标志。

## 如果他没有出现

1. 确认你安装到的 profile 就是你启动的那个。
2. 检查 DSH 版本是否在声明范围内。超出范围时，安装或启动 profile 会拒绝该 bundle；
   只有在接受风险后才授予确切版本豁免（见 [COMPATIBILITY.md](COMPATIBILITY.md)）。
3. 设置 `localStorage['pajama-whale:debug'] = '1'` 并重新加载：气泡会打印实时通道
   （会话 id、插槽钩子、运行状态）。缺失的通道列在
   [COMPATIBILITY.md](COMPATIBILITY.md#degradation) 中——即使没有它们，
   宠物仍会渲染和拖动。

## 开发

Node 20+；只有在重新打包美术资源时才需要带 Pillow 的 Python 3。

```sh
python tools/build-sheets.py   # PNG 帧 -> WebP 精灵条（需要 assets/sprites/）
node tools/build-client.mjs    # 精灵条 -> client.js 的 data URI
node tests/validate.mjs        # 校验包、精灵图、语言包和体积预算
```

CI 在 Node 20 和 24 上运行同样的校验，如果提交的 `client.js` 与其源文件不一致就会失败。

| 路径 | 作用 |
|---|---|
| `src/client.src.js` | 可读的客户端源码，带精灵图占位符 |
| `client.js` | 实际发布的构建产物（内联 data URI） |
| `assets/build/*.webp` | 打包好的精灵图 + `manifest.json` |
| `tools/build-sheets.py` | 打包器（PNG 帧 → WebP 精灵条） |
| `tools/build-client.mjs` | 内联器（精灵条 → `client.js`） |
| `index.js` | 空的宿主半边；宠物只在浏览器侧运行 |

`assets/sprites/`（约 64 MB 的源美术包）没有提交；提交的是打包后的
`assets/build/*.webp`，所以除非你要重画帧，否则永远不需要它。

---

如果这只小鲸鱼让你的 DSH 窗口更可爱，点个 ⭐ 能让更多人发现他：
[github.com/lubenkov/dsh-pajama-whale](https://github.com/lubenkov/dsh-pajama-whale)

## 许可证

代码和美术资源均采用 MIT 许可证。
