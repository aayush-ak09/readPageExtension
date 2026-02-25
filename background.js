// Open Chrome native Side Panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.error("Error opening side panel:", error);
  }
});


// Handle GET_RESULT message from sidebar and relay to content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === "GET_RESULT") {

      // Get the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          sendResponse({ phones: [], emails: [] });
          return;
        }

        const activeTab = tabs[0];

        // Forward request to content script
        chrome.tabs.sendMessage(
          activeTab.id,
          { type: "GET_RESULT" },
          (response) => {

            if (chrome.runtime.lastError) {
              console.error(
                "Error getting data from content script:",
                chrome.runtime.lastError
              );
              sendResponse({ phones: [], emails: [] });
            } else {
              sendResponse(response || { phones: [], emails: [] });
            }
          }
        );
      });

      // Required for async sendResponse
      return true;
    }
  } catch (error) {
    console.error("Error handling message:", error);
    sendResponse({ phones: [], emails: [] });
  }
});