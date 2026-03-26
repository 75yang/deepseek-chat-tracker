# 🕒 DeepSeek Chat Tracker

[中文](#中文) | [English](#english)

---
<h2 id="中文">🇨🇳 中文介绍</h2>

一个轻量级的 Chrome/Edge 浏览器插件，用于精准记录你在 DeepSeek 网页端每一次对话的具体时间戳、所属话题和提示词（Prompt），**并在聊天界面直观显示**，支持一键导出为 CSV。

**🚀 核心功能**
- **UI 时间显示 (✨New)**：在网页聊天界面的每条提问上方，自动注入类似微信风格的居中时间戳。
- **自动话题追踪 (✨New)**：自动抓取并同步当前对话的真实话题名称。
- **底层拦截**：直接在 MAIN 世界劫持 `XMLHttpRequest (XHR)`，不怕前端改版。
- **本地存储**：数据仅保存在浏览器本地 `chrome.storage.local`，绝对保护隐私。
- **一键导出**：支持导出所有历史记录为 `.csv` 格式，方便复盘分析。

**🛠️ 安装说明 (本地加载)**
1. 下载本项目并解压文件夹。
2. 打开浏览器扩展页面 (`chrome://extensions/` 或 `edge://extensions/`)。
3. 开启右上角的 **“开发者模式”**。
4. 点击 **“加载已解压的扩展程序”**，选择该文件夹即可。

---
<h2 id="english">🇬🇧 English</h2>

A lightweight Chrome/Edge extension to accurately record the exact timestamps, topics, and prompts of every conversation on the DeepSeek web interface, **display them directly in the chat**, and support one-click CSV export.

**🚀 Core Features**
- **In-UI Timestamps (✨New)**: Automatically injects WeChat-style centered timestamps above each message directly in the chat interface.
- **Topic Tracking (✨New)**: Automatically fetches and syncs the real chat topic names.
- **Low-level Interception**: Hijacks `XMLHttpRequest (XHR)` directly, immune to frontend UI updates.
- **Local Privacy**: Data is stored exclusively in your browser's `chrome.storage.local`.
- **Easy Export**: One-click export of all chat history to a `.csv` file for easy analysis.

**🛠️ Installation (Developer Mode)**
1. Download and unzip this repository.
2. Open the extensions page (`chrome://extensions/` or `edge://extensions/`).
3. Enable **"Developer mode"** in the top right corner.
4. Click **"Load unpacked"** and select the folder.