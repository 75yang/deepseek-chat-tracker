console.log("🚀 DeepSeek Tracker: XHR 深度拦截器已就位 (含话题抓取)！");

const XHR = XMLHttpRequest.prototype;
const originalOpen = XHR.open;
const originalSend = XHR.send;

XHR.open = function(method, url) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, arguments);
};

XHR.send = function(postData) {
    try {
        if (this._method === 'POST' && this._url && this._url.includes('/api/v0/chat/completion')) {
            if (postData) {
                const body = JSON.parse(postData);
                
                if (body && body.prompt) {
                    const userPrompt = body.prompt;
                    const now = new Date();
                    const timestamp = now.toLocaleString('zh-CN', { hour12: false });

                    // 🌟 新增逻辑：获取当前网页标题作为主话题
                    // DeepSeek 的标题通常是 "话题名称 - DeepSeek"，我们把后缀去掉
                    let topicName = document.title.replace(/ - DeepSeek/g, '').trim();
                    if (topicName === 'DeepSeek' || !topicName) {
                        topicName = '新对话'; // 如果还没生成标题，就叫新对话
                    }

                    console.log(`✅ 抓取成功 | 话题: [${topicName}] | 时间: ${timestamp}`);

                    window.postMessage({
                        type: 'DEEPSEEK_PROMPT_INTERCEPTED',
                        prompt: userPrompt,
                        timestamp: timestamp,
                        topic: topicName  // 🌟 把话题一起发出去
                    }, '*');
                }
            }
        }
    } catch (e) {
        console.error("❌ 拦截器内部发生错误:", e);
    }
    
    return originalSend.apply(this, arguments);
};