// ==============================
// Strict Phone & Email Extraction
// ==============================

// Email regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Store extracted data
let extractedData = {
  phones: [],
  emails: []
};

// ==============================
// Chrome Extension Messaging
// ==============================
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;
    switch (message.type) {
      case "SCAN_PAGE": {
        try {
          const result = extractPageData();
          sendResponse(result);
        } catch (err) {
          console.error("SCAN_PAGE error:", err);
          sendResponse({ error: true });
        }
        break;
      }
      case "GET_RESULT": {
        try {
          const data = extractPageData();
          sendResponse(data);
        } catch (err) {
          console.error("GET_RESULT error:", err);
          sendResponse({ error: true });
        }
        break;
      }
      default:
        console.warn("Unknown message type:", message.type);
    }
    return true; // keeps message port open
  });
} else {
  console.error("Chrome extension context not available");
}

// ==============================
// Extract Page Data
// ==============================

function extractPageData() {
  try {

    const pageText = document.body.innerText;

    const allPhones = extractPhoneNumbers(pageText, false);
    const uniquePhones = [...new Set(allPhones)];

    const allEmails = extractEmails(pageText, false);
    const uniqueEmails = [...new Set(allEmails)];

    return {
      phones: {
        all: allPhones,
        unique: uniquePhones
      },
      emails: {
        all: allEmails,
        unique: uniqueEmails
      }
    };

  } catch (error) {
    console.error('Error extracting page data:', error);

    return {
      phones: { all: [], unique: [] },
      emails: { all: [], unique: [] }
    };
  }
}

// ==============================
// Strict Phone Extraction Logic
// ==============================

function extractPhoneNumbers(text, unique = true) {

  const phonePattern = /(\+?\d[\d\s\-().]{8,20}\d)/g;

  const results = [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;

  while (node = walker.nextNode()) {

    const text = node.nodeValue;

    const matches = text.match(phonePattern);

    if (matches) {

      matches.forEach(num => {

        const cleaned = num.replace(/[\s\-().]/g, '');
        const digits = cleaned.replace(/\D/g, '');

        if (digits.length >= 10 && digits.length <= 12) {
          results.push(cleaned);
        }

      });

    }

  }

  if (unique) {
    return [...new Set(results)];
  }

  return results;
}

// ==============================
// Email Extraction
// ==============================

function extractEmails(text, unique = true) {

  const emailMatches = text.match(EMAIL_REGEX) || [];

  if (unique) {
    return [...new Set(emailMatches)].filter(e => e && e.trim());
  }

  return emailMatches.filter(e => e && e.trim());

}