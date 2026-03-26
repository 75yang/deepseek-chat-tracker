console.log("🛡️ DeepSeek Tracker: 纯逻辑配对版 (彻底解决返回消失与重名冒领) 已启动");

const defaultTitles = [
    'DeepSeek', 
    '探索未至之境', 
    'DeepSeek - 探索未至之境', 
    '探索未至之境 - DeepSeek', 
    '探索未知之境', 
    'DeepSeek - 探索未知之境', 
    '探索未知之境 - DeepSeek', 
    '新对话', 
    ''
];

let globalRecords = [];
chrome.storage.local.get({ records: [] }, function(result) {
    globalRecords = result.records;
});
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.records) {
        globalRecords = changes.records.newValue;
    }
});

// --- 1. 网址切换监控：锁定当前真实 Session ID ---
let currentPathname = location.pathname;
setInterval(() => {
    if (currentPathname !== location.pathname) {
        const newPathname = location.pathname;
        if (currentPathname === '/a/chat' || currentPathname === '/' || currentPathname === '') {
            chrome.storage.local.get({ records: [] }, function(result) {
                let changed = false;
                const now = Date.now();
                result.records.forEach(r => {
                    if ((!r.sessionId || r.sessionId === '/a/chat' || r.sessionId === '/') && (now - r.id < 60000)) {
                        r.sessionId = newPathname;
                        changed = true;
                    }
                });
                if (changed) {
                    chrome.storage.local.set({ records: result.records });
                }
            });
        }
        currentPathname = newPathname;
    }
}, 500);

// --- 2. 标题修复监听 ---
document.addEventListener('DOMContentLoaded', () => {
    let titleObserver = new MutationObserver(() => {
        let newTitle = document.title.replace(/ - DeepSeek/g, '').trim();
        if (newTitle && !defaultTitles.includes(newTitle)) {
            chrome.storage.local.get({ records: [] }, function(result) {
                let changed = false;
                result.records.forEach(r => {
                    if (defaultTitles.includes(r.topic)) {
                        r.topic = newTitle;
                        changed = true;
                    }
                });
                if (changed) chrome.storage.local.set({ records: result.records });
            });
        }
    });
    const targetNode = document.querySelector('title') || document.head;
    if (targetNode) titleObserver.observe(targetNode, { childList: true, characterData: true, subtree: true });
});

// --- 3. 拦截消息：只存数据，不再去页面找什么鬼身份证了 ---
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

// --- 4. 核心黑科技：数学逻辑“从下往上配对引擎” ---
setInterval(() => {
    if (globalRecords.length === 0) return;

    const chatContainer = document.querySelector('.ds-virtual-list-items');
    if (!chatContainer) return;
    
    // 清理幽灵标签
    const allInjected = chatContainer.querySelectorAll('.ds-wechat-time');
    allInjected.forEach(el => {
        if (!el.nextElementSibling || !el.nextElementSibling.hasAttribute('data-virtual-list-item-key')) {
            el.remove(); 
        }
    });

    let currentTitle = document.title.replace(/ - DeepSeek/g, '').trim();
    if (defaultTitles.includes(currentTitle)) currentTitle = '新对话';
    let currentSessionId = location.pathname;

    let sessionRecords = globalRecords.filter(r => {
        if (r.sessionId === currentSessionId) return true;
        if ((!r.sessionId || r.sessionId === '/a/chat' || r.sessionId === '/') && r.topic === currentTitle) return true;
        return false;
    });

    if (sessionRecords.length === 0) return;

    // 🌟 第一步：把数据库里的记录按“纯文本”分门别类装好
    let dbGroups = {};
    sessionRecords.forEach(r => {
        let cleanText = r.prompt.replace(/\s+/g, '');
        if (!dbGroups[cleanText]) dbGroups[cleanText] = [];
        dbGroups[cleanText].push(r);
    });

    // 🌟 第二步：把屏幕上的用户提问气泡也按“纯文本”分门别类
    const rows = Array.from(chatContainer.querySelectorAll('[data-virtual-list-item-key]'));
    const userRows = rows.filter(row => !row.querySelector('.ds-markdown')); // 排除 AI 的回答

    let rowGroups = {};
    userRows.forEach(row => {
        let cleanText = row.textContent.replace(/\s+/g, '');
        if (!rowGroups[cleanText]) rowGroups[cleanText] = [];
        rowGroups[cleanText].push(row);
    });

    // 🌟 第三步：同名同姓的，开始“从下往上（由新到旧）”配对连连看！
    for (let text in rowGroups) {
        let rList = rowGroups[text]; // 屏幕上的气泡（从上到下）
        let dList = dbGroups[text] || []; // 数据库的时间（从旧到新）

        // 指针指向最新的一条（即数组的最后一个元素）
        let rIndex = rList.length - 1;
        let dIndex = dList.length - 1;

        // 只要气泡和时间都有剩余，就配对贴上去
        while(rIndex >= 0 && dIndex >= 0) {
            let row = rList[rIndex];
            let record = dList[dIndex];

            let hasInjectedTime = row.previousElementSibling && row.previousElementSibling.classList.contains('ds-wechat-time');

            if (!hasInjectedTime) {
                const timeParts = record.timestamp.split(':');
                const displayTime = timeParts[0] + ':' + timeParts[1]; 
                
                const timeWrapper = document.createElement('div');
                timeWrapper.className = 'ds-wechat-time';
                timeWrapper.style.cssText = `
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    margin: 16px 0 8px 0;
                    user-select: none;
                `;
                
                const timePill = document.createElement('span');
                timePill.textContent = displayTime;
                timePill.style.cssText = `
                    background-color: rgba(135, 135, 135, 0.15);
                    color: #999;
                    font-size: 12px;
                    padding: 4px 12px;
                    border-radius: 4px;
                `;
                
                timeWrapper.appendChild(timePill);
                row.parentElement.insertBefore(timeWrapper, row);
            }

            // 配对成功一对，同时往上移一位，继续配对
            rIndex--;
            dIndex--;
        }
    }
}, 1000);