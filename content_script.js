console.log("🛡️ DeepSeek Tracker: 数据接收器已启动 (支持话题分类)！");

window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data || event.data.type !== 'DEEPSEEK_PROMPT_INTERCEPTED') {
        return;
    }

    // 🌟 新增 topic 字段
    const newRecord = {
        topic: event.data.topic || '未知话题', 
        timestamp: event.data.timestamp,
        prompt: event.data.prompt
    };

    chrome.storage.local.get({ records: [] }, function(result) {
        const records = result.records;
        if (records.length > 1000) records.shift(); 
        records.push(newRecord);
        chrome.storage.local.set({ records: records }, function() {
            console.log('💾 数据已安全存入！', newRecord);
        });
    });
});