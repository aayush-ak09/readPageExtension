chrome.action.onClicked.addListener((tab) => {
  try {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" }).catch((error) => {
      console.error('Error sending message to tab:', error);
    });
  } catch (error) {
    console.error('Error in action click listener:', error);
  }
});

// Handle GET_RESULT message from sidebar and relay to content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === "GET_RESULT") {
      // Get the active tab and send message to its content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const activeTab = tabs[0];
          
          // Send message to content script of the active tab
          chrome.tabs.sendMessage(activeTab.id, { type: "GET_RESULT" }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error getting data from content script:', chrome.runtime.lastError);
              sendResponse({ phones: [], emails: [] });
            } else {
              sendResponse(response || { phones: [], emails: [] });
            }
          });
        } else {
          sendResponse({ phones: [], emails: [] });
        }
      });
      
      // Return true to indicate we'll send the response asynchronously
      return true;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ phones: [], emails: [] });
  }
});

