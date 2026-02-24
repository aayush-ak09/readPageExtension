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

function extractPhoneNumbers(text) {

  const phonePatterns = [

    // 🇮🇳 Indian Mobile (10 digits starting 6-9, optional +91)
    /(\+91[\s-]?)?[6-9]\d{9}\b/g,

    // 🇮🇳 Indian Toll Free (1800xxxxxx including 18001180 series)
    /\b1800[\s-]?\d{3}[\s-]?\d{3}\b/g,

    // 🇦🇺 Australian Numbers
    /(\+61[\s-]?)?(0?[2-478]\d{8})\b/g,

    // 🌍 Generic International (E.164 format)
    /\+\d{8,15}\b/g
  ];

  let results = [];

  phonePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      results.push(...matches);
    }
  });

  // Normalize (remove spaces & dashes)
  results = results.map(num => num.replace(/[\s-]/g, ''));

  // Final strict validation
  results = results.filter(num => {
    const digitsOnly = num.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  });

  // Remove duplicates
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