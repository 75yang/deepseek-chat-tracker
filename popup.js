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

    // 2. 企业级导出 CSV 逻辑（修复 Excel 乱码/闪退问题）
    // 2. Windows Excel 特供版导出 CSV 逻辑
    document.getElementById('exportBtn').addEventListener('click', () => {
        chrome.storage.local.get({ records: [] }, function(result) {
           if (result.records.length === 0) return alert('没有数据可以导出！');

           // 🌟 修复 1：\uFEFF 解决中文乱码，\r\n 解决 Windows Excel 不识别换行导致闪退的问题
           let csvContent = "\uFEFF主话题,时间,提问内容\r\n";
           
           result.records.forEach(r => {
               let safeTopic = (r.topic || '未知话题').replace(/"/g, '""');
               let safePrompt = r.prompt.replace(/"/g, '""').replace(/[\r\n]+/g, '  ');
               
               // 🌟 修复 2：每一行的结尾也必须使用 \r\n
               csvContent += `"${safeTopic}","${r.timestamp}","${safePrompt}"\r\n`;
           });
           
           const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
           const url = URL.createObjectURL(blob);
           
           const link = document.createElement("a");
           link.setAttribute("href", url);
           link.setAttribute("download", "DeepSeek_Records.csv");
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
           
           // 延迟释放内存，防止某些浏览器还没下载完就被掐断
           setTimeout(() => URL.revokeObjectURL(url), 1000); 
        });
   });
});


