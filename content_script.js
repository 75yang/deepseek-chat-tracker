console.log("🛡️ DeepSeek Tracker: 微信居中时间版 (终极源码解析版) 已启动");

const defaultTitles = ['DeepSeek', '探索未知之境', 'DeepSeek - 探索未知之境', '探索未知之境 - DeepSeek', '新对话', ''];

// --- 1. 标题自动修复监听 ---
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

// --- 2. 接收消息并存储 ---
window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data || event.data.type !== 'DEEPSEEK_PROMPT_INTERCEPTED') {
        return;
    }

    let currentTitle = document.title.replace(/ - DeepSeek/g, '').trim();
    const newRecord = {
        id: Date.now(), 
        topic: defaultTitles.includes(currentTitle) ? '新对话' : currentTitle,
        timestamp: event.data.timestamp,
        prompt: event.data.prompt
    };

    chrome.storage.local.get({ records: [] }, function(result) {
        const records = result.records;
        if (records.length > 1000) records.shift(); 
        records.push(newRecord);
        chrome.storage.local.set({ records: records });
    });

    injectTimeWeChatStyle(event.data.prompt, event.data.timestamp);
});

// --- 3. 核心黑科技：基于真实源码的精确节点注入 ---
function injectTimeWeChatStyle(promptText, fullTimestamp) {
    const timeParts = fullTimestamp.split(':');
    const displayTime = timeParts[0] + ':' + timeParts[1]; 
    
    let attempts = 0;
    const timer = setInterval(() => {
        attempts++;
        let targetTextNode = null;
        
        // 🌟 修复 1：只在主聊天区寻找，完美避开右侧导航栏
        const chatContainer = document.querySelector('.ds-virtual-list-items') || document.body;

        const walker = document.createTreeWalker(chatContainer, NodeFilter.SHOW_TEXT, null, false);
        let textNode;
        while (textNode = walker.nextNode()) {
            if (textNode.nodeValue.trim() === promptText.trim()) {
                let parent = textNode.parentElement;
                // 如果这个文字的祖先没有被盖过章，说明是新消息！
                if (parent && !parent.closest('[data-time-added="true"]')) {
                    targetTextNode = textNode;
                    break;
                }
            }
        }

        if (targetTextNode) {
            clearInterval(timer);
            
            // 🌟 修复 2：根据你提供的 HTML 源码，精准抓取“每一行独立消息”的真实外壳
            let messageRow = targetTextNode.parentElement.closest('[data-virtual-list-item-key]');

            if (messageRow) {
                // 给这一行独立消息盖章，证明处理过了，以后不再打扰
                messageRow.setAttribute('data-time-added', 'true');

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
                
                // 完美插入在这行消息的正上方！
                messageRow.parentElement.insertBefore(timeWrapper, messageRow);
            }
            
        } else if (attempts > 10) {
            clearInterval(timer); 
        }
    }, 500); 
}