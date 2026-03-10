chrome.action.onClicked.addListener((tab) => {
  try {
    chrome.sidePanel.open({
      windowId: tab.windowId
    });
  } catch (error) {
    console.error("Error opening side panel:", error);
  }
});

// Handle GET_RESULT message from sidebar and relay to content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === "CLOSE_SIDEPANEL") {
      if (sender.tab && sender.tab.id) {
        chrome.sidePanel.setOptions({
          tabId: sender.tab.id,
          enabled: false
        });
      }
      return;
    }
    if (message.type === "RESCAN_PAGE") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "SCAN_PAGE" },
          (response) => {
            sendResponse(response);
          }
        );
      });
      return true;
    }


    if (message.type === "GET_RESULT") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const activeTab = tabs[0];
          chrome.tabs.sendMessage(activeTab.id, { type: "GET_RESULT" }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error getting data from content script:", chrome.runtime.lastError);
              sendResponse({ phones: [], emails: [] });
            } else {
              sendResponse(response || { phones: [], emails: [] });
            }
          });
        } else {
          sendResponse({ phones: [], emails: [] });
        }
      });
      return true;
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ phones: [], emails: [] });
  }
});