document.addEventListener('DOMContentLoaded', function() {
    const listDiv = document.getElementById('list');

    // 1. 读取并展示数据
    chrome.storage.local.get({ records: [] }, function(result) {
        const records = result.records;
        
        if (records.length === 0) {
            listDiv.innerHTML = '<div class="empty">暂无对话记录，快去和大模型聊聊吧~</div>';
            return;
        }

        records.reverse().forEach(record => {
            const item = document.createElement('div');
            item.className = 'record';
            
            // 处理老数据没有 topic 的情况
            const displayTopic = record.topic || '未知话题';

            // 🌟 将话题渲染到界面上
            item.innerHTML = `
                <div class="header-row">
                    <span class="topic" title="${displayTopic}">📁 ${displayTopic}</span>
                    <span class="time">🕒 ${record.timestamp}</span>
                </div>
                <div class="prompt">${record.prompt}</div>
            `;
            listDiv.appendChild(item);
        });
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('确定要清空所有记录吗？')) {
            chrome.storage.local.set({ records: [] }, () => {
                listDiv.innerHTML = '<div class="empty">记录已清空</div>';
            });
        }
    });

    // 2. 导出 CSV 逻辑（新增主话题列）
    document.getElementById('exportBtn').addEventListener('click', () => {
         chrome.storage.local.get({ records: [] }, function(result) {
            if (result.records.length === 0) return alert('没有数据可以导出！');

            let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
            // 🌟 表头新增主话题
            csvContent += "主话题,时间,提问内容\n";
            
            result.records.forEach(r => {
                let safeTopic = (r.topic || '未知话题').replace(/"/g, '""');
                let safePrompt = r.prompt.replace(/"/g, '""');
                // 🌟 将话题写入 CSV 对应列
                csvContent += `"${safeTopic}","${r.timestamp}","${safePrompt}"\n`;
            });
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "DeepSeek_Records.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
         });
    });
});