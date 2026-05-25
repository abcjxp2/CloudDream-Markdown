# 云梦Markdown

云梦Markdown 是一个面向 macOS 的轻量 Markdown 查看器。它默认保持纯预览体验，需要编辑时再显式进入编辑模式，避免误改原文件。

当前主线是 SwiftUI 原生 macOS 版本，使用系统 WebKit 渲染 Markdown，不再随应用打包 Electron 运行时。

## 功能

- 打开、拖拽查看本地 `.md` / `.markdown` 文件
- 接近 Codex/GitHub 风格的 Markdown 预览
- 支持浅色、深色、跟随系统主题，默认跟随系统
- 支持文档内搜索
- 支持右键复制、链接打开、复制链接
- 显式编辑模式，支持保存和另存为
- 文件保存后自动刷新预览

## 开发运行

### SwiftUI 原生版

```bash
scripts/package-swift-mac.sh
open release-swift/云梦Markdown.app
```

原生版打包产物会生成在：

```text
release-swift/云梦Markdown.app
```

### Electron 旧版

```bash
npm install
npm start -- sample.md
```

Electron 旧版仍保留在仓库中，便于对照体验。

## 打包 Electron 旧版

```bash
npm run package
```

打包产物会生成在：

```text
release/云梦Markdown.app
```

## 常用快捷键

| 快捷键 | 功能 |
|---|---|
| `Command+O` | 打开 Markdown 文件 |
| `Command+F` | 聚焦搜索框 |
| `Command+E` | 进入/退出编辑模式 |
| `Command+S` | 编辑模式下保存 |
| `Command+Shift+S` | 编辑模式下另存为 |

## 编辑模式

默认打开文件后只显示预览。需要修改文件时，使用菜单 `编辑 -> 进入编辑模式` 或 `Command+E` 进入源码编辑。

退出编辑、打开新文件或关闭窗口时，如果存在未保存修改，应用会先提示确认，避免误丢内容。

## 说明

当前仓库包含 macOS SwiftUI 原生版、iPhone/iPad SwiftUI 版，以及保留用于对照的 Electron 旧版。

## iPhone / iPad

```bash
open ios/CloudDreamMarkdown.xcodeproj
```

iOS 版支持打开 `.md` / `.markdown`、默认预览、显式编辑、保存、另存为、搜索，以及跟随系统 / 浅色 / 深色外观。

命令行验证代码构建可用：

```bash
xcodebuild -project ios/CloudDreamMarkdown.xcodeproj -scheme CloudDreamMarkdown -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build CODE_SIGNING_ALLOWED=NO ASSETCATALOG_COMPILER_APPICON_NAME='' ASSETCATALOG_COMPILER_SKIP_APP_STORE_DEPLOYMENT=YES
```

本机当前 Xcode 26.5 SDK 与已安装 iOS 26.4 模拟器运行时不匹配，直接跑指定模拟器时会卡在 AppIcon 裁剪；安装匹配运行时或用 Xcode 选择可用目标后即可继续真机/归档流程。
