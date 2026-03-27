# 🕒 DeepSeek Chat Tracker

[中文](#中文) | [English](#english)

---
<h2 id="中文">🇨🇳 中文介绍</h2>

一个轻量级的 Chrome/Edge 浏览器插件，用于精准记录你在 DeepSeek 网页端每一次对话的具体时间戳和提示词（Prompt），并支持一键导出为 CSV。

**🚀 核心功能**
- **底层拦截**：直接在 MAIN 世界劫持 `XMLHttpRequest (XHR)`，不怕前端改版。
- **精准记录**：自动提取精确到秒的时间和完整 Prompt。
- **本地存储**：数据仅保存在浏览器本地 `chrome.storage.local`，绝对保护隐私。
- **一键导出**：支持导出所有历史记录为 `.csv` 格式，方便复盘分析。

**🛠️ 安装说明 (本地加载)**
1. 下载本项目并解压文件夹。
2. 打开浏览器扩展页面 (`chrome://extensions/` 或 `edge://extensions/`)。
3. 开启右上角的 **“开发者模式”**。
4. 点击 **“加载已解压的扩展程序”**，选择该文件夹即可。

---
<h2 id="english">🇬🇧 English</h2>

A lightweight Chrome/Edge extension to accurately record the exact timestamps and prompts of every conversation on the DeepSeek web interface, supporting one-click CSV export.

**🚀 Core Features**
- **Low-level Interception**: Hijacks `XMLHttpRequest (XHR)` directly, immune to frontend UI updates.
- **Accurate Logging**: Automatically extracts precise timestamps and full prompts.
- **Local Privacy**: Data is stored exclusively in your browser's `chrome.storage.local`.
- **Easy Export**: One-click export of all chat history to a `.csv` file for easy analysis.

**🛠️ Installation (Developer Mode)**
1. Download and unzip this repository.
2. Open the extensions page (`chrome://extensions/` or `edge://extensions/`).
3. Enable **"Developer mode"** in the top right corner.
4. Click **"Load unpacked"** and select the folder.