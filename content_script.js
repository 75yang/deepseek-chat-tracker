console.log("🛡️ DeepSeek Tracker: 究极稳固版 (同步内存防竞态 + 纯净渲染) 已启动");

const defaultTitles = ['DeepSeek', '探索未至之境', 'DeepSeek - 探索未至之境', '探索未至之境 - DeepSeek', '探索未知之境', 'DeepSeek - 探索未知之境', '探索未知之境 - DeepSeek', '新对话', ''];

let globalRecords = [];
chrome.storage.local.get({ records: [] }, function(result) {
    globalRecords = result.records;
});
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.records) {
        globalRecords = changes.records.newValue;
        triggerRender(); 
    }
});

// --- 1. 工业级路由拦截：History API Hooking ---
function hookHistory() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function() {
        originalPushState.apply(this, arguments);
        handleUrlChange(location.pathname);
    };
    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        handleUrlChange(location.pathname);
    };
    window.addEventListener('popstate', () => {
        handleUrlChange(location.pathname);
    });
}
hookHistory();

function handleUrlChange(newPathname) {
    const isValidSession = /^\/a\/chat\/s\/[a-zA-Z0-9-]+/.test(newPathname);
    
    if (isValidSession) {
        let changed = false;
        const now = Date.now();
        // 🌟 修复点1：直接操作内存，消灭读取数据库带来的毫秒级竞态时间差！
        for (let i = globalRecords.length - 1; i >= 0; i--) {
            let r = globalRecords[i];
            if ((!r.sessionId || r.sessionId === '/a/chat' || r.sessionId === '/') && (now - r.id < 60000)) {
                r.sessionId = newPathname;
                changed = true;
            }
        }
        if (changed) chrome.storage.local.set({ records: globalRecords });
    }
}

// --- 2. 标题修复监听 (防污染版) ---
document.addEventListener('DOMContentLoaded', () => {
    let titleObserver = new MutationObserver(() => {
        let newTitle = document.title.replace(/ - DeepSeek/g, '').trim();
        if (newTitle && !defaultTitles.includes(newTitle)) {
            let changed = false;
            globalRecords.forEach(r => {
                // 🌟 修复点2：严格限制，只允许修改当前所在网页的记录！绝不越界污染老记录！
                if (defaultTitles.includes(r.topic) && r.sessionId === location.pathname) {
                    r.topic = newTitle;
                    changed = true;
                }
            });
            if (changed) chrome.storage.local.set({ records: globalRecords });
        }
    });
    const targetNode = document.querySelector('title') || document.head;
    if (targetNode) titleObserver.observe(targetNode, { childList: true, characterData: true, subtree: true });
});

// --- 3. 拦截消息：同步推入内存 ---
window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data || event.data.type !== 'DEEPSEEK_PROMPT_INTERCEPTED') {
        return;
    }
    let currentTitle = document.title.replace(/ - DeepSeek/g, '').trim();
    const newRecord = {
        id: Date.now(), 
        topic: defaultTitles.includes(currentTitle) ? '新对话' : currentTitle,
        timestamp: event.data.timestamp,
        prompt: event.data.prompt,
        sessionId: location.pathname 
    };

    // 🌟 修复点3：发消息时立刻强行塞入内存，为接下来的 URL 绑定保驾护航
    globalRecords.push(newRecord);
    if (globalRecords.length > 1000) globalRecords.shift(); 
    chrome.storage.local.set({ records: globalRecords });
});

// --- 4. 核心对齐：局部精准监听 + 白纸渲染 ---
let renderTimer = null;
let chatObserver = null;

function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderTimestamps, 150); 
}

setInterval(() => {
    const list = document.querySelector('.ds-virtual-list-items');
    if (list && !list.dataset.observed) {
        if (chatObserver) chatObserver.disconnect(); 
        chatObserver = new MutationObserver(triggerRender);
        chatObserver.observe(list, { childList: true, subtree: true, characterData: true });
        list.dataset.observed = 'true';
        triggerRender(); 
    }
}, 1000);

function renderTimestamps() {
    if (globalRecords.length === 0) return;
    const chatContainer = document.querySelector('.ds-virtual-list-items');
    if (!chatContainer) return;

    // 🌟 修复点4：每次渲染前，像擦黑板一样把所有贴上去的时间全部清除！
    // 绝不给任何“错误时间”残留在屏幕上的机会，保证画面永远跟算法对齐。
    const allInjected = chatContainer.querySelectorAll('.ds-wechat-time');
    allInjected.forEach(el => el.remove());

    let currentSessionId = location.pathname;
    const now = Date.now();

    let sessionRecords = globalRecords.filter(r => {
        if (currentSessionId.length > 10 && r.sessionId === currentSessionId) return true;
        if ((currentSessionId === '/a/chat' || currentSessionId === '/') && 
            (!r.sessionId || r.sessionId === '/a/chat' || r.sessionId === '/')) {
            if (now - r.id < 300000) return true; 
        }
        return false;
    });

    if (sessionRecords.length === 0) return;

    const rows = Array.from(chatContainer.querySelectorAll('[data-virtual-list-item-key]'));
    const userRows = rows.filter(row => !row.querySelector('.ds-markdown')); 
    if (userRows.length === 0) return;

    const SEARCH_WINDOW = 50;
    const recentRecords = sessionRecords.slice(-SEARCH_WINDOW);

    let rTexts = userRows.map(row => row.textContent.replace(/\s+/g, ''));
    let dTexts = recentRecords.map(r => r.prompt.replace(/\s+/g, ''));

    let rIdx = 0; 
    let dIdx = 0; 
    const MAX_LOOKAHEAD = 4; 

    while (rIdx < rTexts.length && dIdx < dTexts.length) {
        if (rTexts[rIdx] === dTexts[dIdx]) {
            injectTimeUI(userRows[rIdx], recentRecords[dIdx]);
            rIdx++;
            dIdx++;
        } else {
            let foundMatch = false;
            for (let step = 1; step <= MAX_LOOKAHEAD; step++) {
                if (dIdx + step < dTexts.length && rTexts[rIdx] === dTexts[dIdx + step]) {
                    dIdx += step; 
                    foundMatch = true;
                    break;
                }
            }
            if (!foundMatch) {
                rIdx++;
            }
        }
    }
}

function injectTimeUI(row, record) {
    if (!record || !record.timestamp) return;

    let displayTime = '??:??';
    try {
        const timeParts = record.timestamp.split(':');
        if (timeParts.length >= 2 && !isNaN(parseInt(timeParts[0]))) {
            displayTime = `${timeParts[0]}:${timeParts[1]}`;
        } else if (!isNaN(new Date(record.timestamp))) {
            const d = new Date(record.timestamp);
            displayTime = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        }
    } catch (e) {
        console.error("时间解析失败", e);
    }
    
    const timeWrapper = document.createElement('div');
    timeWrapper.className = 'ds-wechat-time';
    timeWrapper.style.cssText = `
        width: 100%; display: flex; justify-content: center;
        margin: 16px 0 8px 0; user-select: none;
    `;
    
    const timePill = document.createElement('span');
    timePill.textContent = displayTime;
    timePill.style.cssText = `
        background-color: rgba(135, 135, 135, 0.15); color: #999;
        font-size: 12px; padding: 4px 12px; border-radius: 4px;
    `;
    
    timeWrapper.appendChild(timePill);
    row.parentElement.insertBefore(timeWrapper, row);
}