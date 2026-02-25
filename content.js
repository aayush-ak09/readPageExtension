// ==============================
// Strict Phone & Email Extraction
// ==============================

// Email regex (kept same – already correct)
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;


// ==============================
// Chrome Extension Messaging
// ==============================

if (typeof chrome !== 'undefined' && chrome.runtime) {

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // Support BOTH message types (safe upgrade)
    if (message.type === "GET_RESULT" || message.type === "GET_PAGE_DATA") {

      const data = extractPageData();
      sendResponse(data);

      return true; // Required in MV3
    }

  });

} else {
  console.error('Chrome extension context not available');
}


// ==============================
// Extract Page Data
// ==============================

function extractPageData() {
  try {

    const pageText = document.body.innerText;

    const phones = extractPhoneNumbers();
    const emails = extractEmails(pageText);

    console.log("Filtered Extracted data:", { phones, emails });

    return { phones, emails };

  } catch (error) {
    console.error('Error extracting page data:', error);
    return { phones: [], emails: [] };
  }
}


// ==============================
// Strict Phone Extraction Logic
// ==============================

function extractPhoneNumbers() {

  const phonePattern = /(\+?\d[\d\s\-().]{8,20}\d)/g;

  const results = [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;

  while ((node = walker.nextNode())) {

    const text = node.nodeValue;

    const matches = text.match(phonePattern);

    if (matches) {
      matches.forEach(num => {

        const cleaned = num.replace(/[\s\-().]/g, '');
        const digits = cleaned.replace(/\D/g, '');

        if (digits.length >= 10 && digits.length <= 15) {
          results.push(cleaned);
        }

      });
    }
  }

  return [...new Set(results)];
}


// ==============================
// Email Extraction
// ==============================

function extractEmails(text) {

  const emailMatches = text.match(EMAIL_REGEX) || [];

  return [...new Set(emailMatches)]
    .filter(e => e && e.trim());

}