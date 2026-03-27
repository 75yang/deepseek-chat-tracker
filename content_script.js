console.log("🛡️ DeepSeek Tracker: 满级架构版 (History API + 局部监听 + 双指针 O(N) 对齐) 已启动");

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

// --- 1. 工业级路由拦截：History API Hooking (0 性能损耗) ---
// 彻底抛弃全局 MutationObserver 猜路由，直接拦截底层 API
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
    // 废弃脆弱的 length > 10，改用严谨的正则匹配 DeepSeek 的真实 Session URL
    const isValidSession = /^\/a\/chat\/s\/[a-zA-Z0-9-]+/.test(newPathname);
    
    if (isValidSession) {
        chrome.storage.local.get({ records: [] }, function(result) {
            let changed = false;
            const now = Date.now();
            for (let i = result.records.length - 1; i >= 0; i--) {
                let r = result.records[i];
                // 绑定过去 60 秒内无家可归的记录
                if ((!r.sessionId || r.sessionId === '/a/chat' || r.sessionId === '/') && (now - r.id < 60000)) {
                    r.sessionId = newPathname;
                    changed = true;
                    break; 
                }
            }
            if (changed) chrome.storage.local.set({ records: result.records });
        });
    }
}

// --- 2. 拦截消息：极简入库 ---
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

    chrome.storage.local.get({ records: [] }, function(result) {
        const records = result.records;
        if (records.length > 1000) records.shift(); 
        records.push(newRecord);
        chrome.storage.local.set({ records: records });
    });
});

// --- 3. 性能优化：局部精准监听 (拒绝全局 DOM 污染) ---
let renderTimer = null;
let chatObserver = null;

function triggerRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderTimestamps, 150); // 150ms 黄金防抖
}

// 极其轻量的 1s 轮询，只为了“寻找”容器，找到后立刻转为局部事件监听
setInterval(() => {
    const list = document.querySelector('.ds-virtual-list-items');
    if (list && !list.dataset.observed) {
        if (chatObserver) chatObserver.disconnect(); // 防止僵尸监听器内存泄漏
        
        chatObserver = new MutationObserver(triggerRender);
        // 仅仅监听这一个 DOM 节点，彻底释放浏览器 V8 引擎的压力
        chatObserver.observe(list, { childList: true, subtree: true, characterData: true });
        list.dataset.observed = 'true';
        triggerRender(); 
    }
}, 1000);

// --- 4. 核心对齐：O(N) 贪心双指针 + 容错前瞻窗口 ---
function renderTimestamps() {
    if (globalRecords.length === 0) return;
    const chatContainer = document.querySelector('.ds-virtual-list-items');
    if (!chatContainer) return;

    // 清理幽灵节点（极其严谨：只删我们自己注入的类名，绝不误伤 React 的原生节点）
    const allInjected = chatContainer.querySelectorAll('.ds-wechat-time');
    allInjected.forEach(el => {
        if (!el.nextElementSibling || !el.nextElementSibling.hasAttribute('data-virtual-list-item-key')) {
            el.remove(); 
        }
    });

    let currentSessionId = location.pathname;
    const now = Date.now();

    // 严密的数据反腐层 (Anti-corruption Layer)：时间结界
    let sessionRecords = globalRecords.filter(r => {
        if (currentSessionId.length > 10 && r.sessionId === currentSessionId) return true;
        if ((currentSessionId === '/a/chat' || currentSessionId === '/') && 
            (!r.sessionId || r.sessionId === '/a/chat' || r.sessionId === '/')) {
            if (now - r.id < 300000) return true; // 5分钟结界
        }
        return false;
    });

    if (sessionRecords.length === 0) return;

    const rows = Array.from(chatContainer.querySelectorAll('[data-virtual-list-item-key]'));
    const userRows = rows.filter(row => !row.querySelector('.ds-markdown')); 
    if (userRows.length === 0) return;

    // 限制搜索窗口，取数据库最近 50 条
    const SEARCH_WINDOW = 50;
    const recentRecords = sessionRecords.slice(-SEARCH_WINDOW);

    let rTexts = userRows.map(row => row.textContent.replace(/\s+/g, ''));
    let dTexts = recentRecords.map(r => r.prompt.replace(/\s+/g, ''));

    // 🌟 核心算法降维：O(N) 双指针 + 容错前瞻 (Lookahead)
    let rIdx = 0; // 屏幕气泡指针
    let dIdx = 0; // 数据库指针
    const MAX_LOOKAHEAD = 4; // 允许最多跨越 4 条由于跨设备导致的不一致数据

    while (rIdx < rTexts.length && dIdx < dTexts.length) {
        if (rTexts[rIdx] === dTexts[dIdx]) {
            // 完美匹配，执行时间注入
            injectTimeUI(userRows[rIdx], recentRecords[dIdx]);
            rIdx++;
            dIdx++;
        } else {
            // 发生错位（如手机发送导致 DB 缺失，或滚动导致屏幕缺失）
            // 启动前瞻探针，在数据库后方寻找是否有匹配的节点
            let foundMatch = false;
            for (let step = 1; step <= MAX_LOOKAHEAD; step++) {
                if (dIdx + step < dTexts.length && rTexts[rIdx] === dTexts[dIdx + step]) {
                    dIdx += step; // 数据库指针快进追平
                    foundMatch = true;
                    break;
                }
            }

            if (!foundMatch) {
                // 如果前瞻也找不到，说明这是个完全陌生的气泡（例如纯用手机发的消息）
                // 屏幕指针直接跳过，不予贴图，防止乱戴帽子
                rIdx++;
            }
        }
    }
}

// 独立的 UI 渲染函数，保持逻辑纯粹
function injectTimeUI(row, record) {
    let hasInjectedTime = row.previousElementSibling && row.previousElementSibling.classList.contains('ds-wechat-time');
    if (hasInjectedTime || !record || !record.timestamp) return;

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