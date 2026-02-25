// ==============================
// Strict Phone & Email Extraction
// ==============================

// Email regex (kept same – already correct)
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Store extracted data
let extractedData = {
  phones: [],
  emails: []
};

// ==============================
// Chrome Extension Messaging
// ==============================

if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TOGGLE_SIDEBAR") {
      toggleSidebar();
    } else if (message.type === "GET_RESULT") {
      const data = extractPageData();
      sendResponse(data);
    }
  });
} else {
  console.error('Chrome extension context not available');
}

// Listen for iframe messages
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLOSE_SIDEBAR") {
    closeSidebar();
  }
});

// ==============================
// Extract Page Data
// ==============================

function extractPageData() {
  try {
    const pageText = document.body.innerText;

    const phones = extractPhoneNumbers(pageText);
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

  // Scan text nodes individually to prevent merging
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
  return [...new Set(emailMatches)].filter(e => e && e.trim());
}

// ==============================
// Sidebar Controls
// ==============================

function closeSidebar() {
  try {
    const sidebar = document.getElementById("aayush-sidebar");
    if (sidebar) {
      sidebar.style.opacity = "0";
      sidebar.style.transition = "opacity 0.3s ease-out";

      setTimeout(() => {
        if (sidebar && sidebar.parentNode) {
          sidebar.remove();
        }
      }, 300);
    }
  } catch (error) {
    console.error('Error closing sidebar:', error);
  }
}

function toggleSidebar() {
  try {
    const existing = document.getElementById("aayush-sidebar");

    if (existing) {
      closeSidebar();
      return;
    }

    if (!chrome || !chrome.runtime) {
      console.error('Extension context lost');
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.id = "aayush-sidebar";
    iframe.src = chrome.runtime.getURL("sidebar/sidebar.html");
    iframe.sandbox.add("allow-same-origin");
    iframe.sandbox.add("allow-scripts");
    iframe.sandbox.add("allow-forms");

    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.right = "0";
    iframe.style.width = "400px";
    iframe.style.height = "100vh";
    iframe.style.border = "none";
    iframe.style.zIndex = "999999";
    iframe.style.boxShadow = "-4px 0 15px rgba(0,0,0,0.2)";
    iframe.style.opacity = "0";
    iframe.style.transition = "opacity 0.3s ease-in";

    document.body.appendChild(iframe);

    setTimeout(() => {
      if (iframe && iframe.parentNode) {
        iframe.style.opacity = "1";
      }
    }, 10);

  } catch (error) {
    console.error('Error toggling sidebar:', error);
  }
}