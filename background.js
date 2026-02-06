let latestResult = { emails: [], phones: [] };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCAN_RESULT") {
    latestResult = {
      emails: message.emails,
      phones: message.phones
    };
  }

  if (message.type === "GET_RESULT") {
    sendResponse(latestResult);
  }

  return true;
});
