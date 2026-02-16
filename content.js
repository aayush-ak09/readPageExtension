// Regex patterns for phone and email extraction
const PHONE_REGEX = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|(?:\+\d{1,3}[-.\s]?)?(?:\d{1,4}[-.\s]?){2,3}\d{1,4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Store extracted data
let extractedData = {
  phones: [],
  emails: []
};

// Check if chrome extension context is available
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TOGGLE_SIDEBAR") {
      toggleSidebar();
    } else if (message.type === "GET_RESULT") {
      // Extract and return data
      const data = extractPageData();
      sendResponse(data);
    }
  });
} else {
  console.error('Chrome extension context not available');
}

// Listen for messages from iframe
window.addEventListener("message", (event) => {
  // Accept messages from any origin since we're controlling the iframe
  if (event.data && event.data.type === "CLOSE_SIDEBAR") {
    closeSidebar();
  }
});

// Extract phone numbers and emails from page
function extractPageData() {
  try {
    const pageText = document.body.innerText;
    
    // Extract phones
    const phoneMatches = pageText.match(PHONE_REGEX) || [];
    const phones = [...new Set(phoneMatches)].filter(p => p && p.trim());
    
    // Extract emails
    const emailMatches = pageText.match(EMAIL_REGEX) || [];
    const emails = [...new Set(emailMatches)].filter(e => e && e.trim());
    
    console.log("Extracted data:", { phones, emails });
    
    return {
      phones: phones,
      emails: emails
    };
  } catch (error) {
    console.error('Error extracting page data:', error);
    return {
      phones: [],
      emails: []
    };
  }
}

function closeSidebar() {
  try {
    const sidebar = document.getElementById("aayush-sidebar");
    if (sidebar) {
      // Add fade out animation
      sidebar.style.opacity = "0";
      sidebar.style.transition = "opacity 0.3s ease-out";
      
      // Remove after animation completes
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
    
    // Trigger animation after adding to DOM
    setTimeout(() => {
      if (iframe && iframe.parentNode) {
        iframe.style.opacity = "1";
      }
    }, 10);
  } catch (error) {
    console.error('Error toggling sidebar:', error);
  }
}
