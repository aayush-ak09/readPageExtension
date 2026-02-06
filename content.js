function scanPage() {
  const text = document.body.innerText;

  const emails =
    text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g) || [];

  const phones =
    text.match(/(\+?\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g) || [];

  chrome.runtime.sendMessage({
    type: "SCAN_RESULT",
    emails: [...new Set(emails)],
    phones: [...new Set(phones)]
  });
}

// Initial scan
scanPage();

// Watch dynamic page changes
const observer = new MutationObserver(scanPage);
observer.observe(document.body, { childList: true, subtree: true });
