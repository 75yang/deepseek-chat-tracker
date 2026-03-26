chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_PROMPT") {
    const newEntry = message.payload;

    chrome.storage.local.get(["records"], (result) => {
      const records = result.records || [];

      records.push(newEntry);

      chrome.storage.local.set({ records }, () => {
        console.log("Saved:", newEntry);
      });
    });
  }
});