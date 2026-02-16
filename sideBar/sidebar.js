// Storage key for extensions
const EXTENSIONS_STORAGE_KEY = "readPageExtensions";
let tempExtDeleteId = null;

// Load metadata when sidebar loads
document.addEventListener("DOMContentLoaded", () => {
  loadExtensionsFromStorage();
  loadSidebarData();
  setupCloseButton();
  setupAddExtensionModal();
  setupDeleteModal();
  setupIconNavigation();
});

// Load extensions from chrome storage and render them
function loadExtensionsFromStorage() {
  chrome.storage.local.get([EXTENSIONS_STORAGE_KEY], (result) => {
    const extensions = result[EXTENSIONS_STORAGE_KEY] || [];
    renderExtensionIcons(extensions);
  });
}

// Render extension icons dynamically
function renderExtensionIcons(extensions) {
  const container = document.getElementById("extensions-container");
  const viewsContainer = document.getElementById("dynamic-views-container");
  
  container.innerHTML = "";
  viewsContainer.innerHTML = "";
  
  extensions.forEach((ext) => {
    // Create icon button
    const btn = document.createElement("div");
    btn.className = "icon-button";
    btn.setAttribute("data-view", ext.id);
    btn.setAttribute("title", ext.name);
    btn.textContent = ext.icon;
    
    btn.addEventListener("click", () => switchView(ext.id, ext.name));
    container.appendChild(btn);
    
    // Create content view with improved UI
    const view = document.createElement("div");
    view.className = "content-view";
    view.setAttribute("data-view", ext.id);
    view.innerHTML = `
      <div class="ext-card">
        <div class="ext-header">
          <div class="ext-title">
            <span class="ext-icon-large">${ext.icon}</span>
            <span>${ext.name}</span>
          </div>
          <button class="ext-delete-btn" data-ext-id="${ext.id}" data-ext-name="${ext.name}">🗑️</button>
        </div>
        
        <div class="ext-details">
          <strong>🔗 Webhook URL:</strong>
          ${ext.webhook}
        </div>
        
        <button class="ext-trigger-btn" data-ext-id="${ext.id}">
          📤 Send Data to ${ext.name}
        </button>
        
        <div class="trigger-status" id="status-${ext.id}"></div>
      </div>
    `;
    viewsContainer.appendChild(view);
  });
  
  // Add event listeners to delete buttons
  document.querySelectorAll(".ext-delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const extId = btn.getAttribute("data-ext-id");
      const extName = btn.getAttribute("data-ext-name");
      openDeleteModal(extId, extName);
    });
  });
  
  // Add event listeners to trigger buttons
  document.querySelectorAll(".ext-trigger-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const extId = btn.getAttribute("data-ext-id");
      triggerWebhook(extId);
    });
  });
}

// Add extension modal functionality
function setupAddExtensionModal() {
  const modal = document.getElementById("add-ext-modal");
  const form = document.getElementById("add-ext-form");
  const addBtn = document.querySelector(".add-ext-btn");
  const closeButtons = document.querySelectorAll(".modal-close");
  
  addBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });
  
  closeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const parentModal = btn.closest(".modal");
      if (parentModal) {
        parentModal.classList.add("hidden");
      }
    });
  });
  
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addNewExtension();
  });
  
  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });
}

// Delete modal setup
function setupDeleteModal() {
  const modal = document.getElementById("delete-modal");
  const confirmBtn = document.getElementById("confirm-delete");
  
  confirmBtn.addEventListener("click", () => {
    if (tempExtDeleteId) {
      deleteExtension(tempExtDeleteId);
      tempExtDeleteId = null;
    }
    modal.classList.add("hidden");
  });
}

// Open delete modal
function openDeleteModal(extId, extName) {
  tempExtDeleteId = extId;
  const modal = document.getElementById("delete-modal");
  const message = document.getElementById("delete-message");
  message.textContent = `Are you sure you want to delete "${extName}"?`;
  modal.classList.remove("hidden");
}

// Add new extension to storage
function addNewExtension() {
  const name = document.getElementById("ext-name").value.trim();
  const icon = document.getElementById("ext-icon").value.trim();
  const webhook = document.getElementById("ext-webhook").value.trim();
  
  if (!name || !icon || !webhook) {
    alert("Please fill in all fields");
    return;
  }
  
  // Validate webhook URL
  try {
    new URL(webhook);
  } catch {
    alert("Please enter a valid webhook URL");
    return;
  }
  
  chrome.storage.local.get([EXTENSIONS_STORAGE_KEY], (result) => {
    const extensions = result[EXTENSIONS_STORAGE_KEY] || [];
    
    // Create new extension
    const newExt = {
      id: "ext_" + Date.now(),
      name: name,
      icon: icon,
      webhook: webhook,
      createdAt: new Date().toISOString()
    };
    
    extensions.push(newExt);
    
    // Save to storage
    chrome.storage.local.set({ [EXTENSIONS_STORAGE_KEY]: extensions }, () => {
      console.log("Extension added:", newExt);
      
      // Reset form and close modal
      document.getElementById("add-ext-form").reset();
      document.getElementById("add-ext-modal").classList.add("hidden");
      
      // Reload extensions
      loadExtensionsFromStorage();
      setupIconNavigation();
    });
  });
}

// Delete extension
function deleteExtension(extId) {
  chrome.storage.local.get([EXTENSIONS_STORAGE_KEY], (result) => {
    let extensions = result[EXTENSIONS_STORAGE_KEY] || [];
    extensions = extensions.filter(ext => ext.id !== extId);
    
    chrome.storage.local.set({ [EXTENSIONS_STORAGE_KEY]: extensions }, () => {
      console.log("Extension deleted:", extId);
      loadExtensionsFromStorage();
      switchView("read-page", "Read Page");
    });
  });
}

// Get temporary data stored from page
function getTemporaryData() {
  const phones = [];
  const emails = [];
  
  const phoneList = document.getElementById("phones");
  const emailList = document.getElementById("emails");
  
  if (phoneList) {
    phoneList.querySelectorAll("li").forEach(li => {
      const text = li.textContent.trim();
      if (text && text !== "No phones found") {
        phones.push(text);
      }
    });
  }
  
  if (emailList) {
    emailList.querySelectorAll("li").forEach(li => {
      const text = li.textContent.trim();
      if (text && text !== "No emails found") {
        emails.push(text);
      }
    });
  }
  
  return { phones, emails };
}

// Create payload and send to webhook
async function triggerWebhook(extId) {
  chrome.storage.local.get([EXTENSIONS_STORAGE_KEY], async (result) => {
    const extensions = result[EXTENSIONS_STORAGE_KEY] || [];
    const extension = extensions.find(e => e.id === extId);
    
    if (!extension) {
      showStatus(extId, "error", "Extension not found");
      return;
    }
    
    // Get data
    const data = getTemporaryData();
    
    // Create payload
    const payload = {
      extensionId: extension.id,
      extensionName: extension.name,
      extensionIcon: extension.icon,
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
      data: {
        phones: data.phones,
        emails: data.emails,
        phoneCount: data.phones.length,
        emailCount: data.emails.length
      }
    };
    
    try {
      // Send to webhook
      const response = await fetch(extension.webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        showStatus(extId, "success", "✅ Data sent successfully!");
      } else {
        showStatus(extId, "error", `❌ Error: ${response.status}`);
      }
    } catch (error) {
      showStatus(extId, "error", `❌ Error: ${error.message}`);
      console.error("Webhook error:", error);
    }
  });
}

// Show trigger status
function showStatus(extId, type, message) {
  const statusEl = document.getElementById(`status-${extId}`);
  if (statusEl) {
    statusEl.className = `trigger-status ${type}`;
    statusEl.textContent = message;
    
    // Hide after 4 seconds
    setTimeout(() => {
      statusEl.classList.remove("success", "error");
    }, 4000);
  }
}

// Switch between views
function switchView(viewId, title) {
  // Hide all views
  document.querySelectorAll(".content-view").forEach(view => {
    view.classList.remove("active");
  });
  
  // Remove active class from all buttons
  document.querySelectorAll(".icon-button").forEach(btn => {
    btn.classList.remove("active");
  });
  
  // Show selected view
  const selectedView = document.querySelector(`[data-view="${viewId}"].content-view`);
  if (selectedView) {
    selectedView.classList.add("active");
  }
  
  // Activate button
  const selectedBtn = document.querySelector(`[data-view="${viewId}"].icon-button`);
  if (selectedBtn) {
    selectedBtn.classList.add("active");
  }
  
  // Update title
  document.getElementById("content-title").textContent = title;
  
  // Load data if it's the read-page view
  if (viewId === "read-page") {
    loadSidebarData();
  }
}

// Original navigation setup
function setupIconNavigation() {
  const readPageBtn = document.querySelector('[data-view="read-page"].icon-button');
  
  if (readPageBtn) {
    readPageBtn.addEventListener("click", () => {
      switchView("read-page", "Read Page");
    });
  }
}

function setupCloseButton() {
  const closeBtn = document.getElementById("close");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
    };
  }
}

function closeSidebar() {
  try {
    window.parent.postMessage({ type: "CLOSE_SIDEBAR" }, "*");
  } catch (error) {
    console.error('Error closing sidebar:', error);
  }
}

function loadSidebarData() {
  try {
    if (!chrome || !chrome.runtime) {
      console.warn('Chrome runtime not available in sidebar context');
      displayEmptyState();
      return;
    }

    chrome.runtime.sendMessage(
      { type: "GET_RESULT" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Message sending error:', chrome.runtime.lastError.message);
          displayEmptyState();
          return;
        }

        if (!response) {
          displayEmptyState();
          return;
        }

        displayData(response);
      }
    );
  } catch (error) {
    console.error('Error loading sidebar data:', error);
    displayEmptyState();
  }
}

function displayData(data) {
  try {
    const phoneList = document.getElementById("phones");
    const emailList = document.getElementById("emails");

    if (!phoneList || !emailList) {
      console.error('Phone or email list elements not found');
      return;
    }

    phoneList.innerHTML = "";
    emailList.innerHTML = "";

    if (data.phones && data.phones.length > 0) {
      data.phones.forEach(phone => {
        const li = document.createElement("li");
        li.textContent = phone;
        phoneList.appendChild(li);
      });
    } else {
      phoneList.innerHTML = "<li>No phones found</li>";
    }

    if (data.emails && data.emails.length > 0) {
      data.emails.forEach(email => {
        const li = document.createElement("li");
        li.textContent = email;
        emailList.appendChild(li);
      });
    } else {
      emailList.innerHTML = "<li>No emails found</li>";
    }
  } catch (error) {
    console.error('Error displaying data:', error);
  }
}

function displayEmptyState() {
  const phoneList = document.getElementById("phones");
  const emailList = document.getElementById("emails");
  
  if (phoneList) phoneList.innerHTML = "<li>No phones found</li>";
  if (emailList) emailList.innerHTML = "<li>No emails found</li>";
}

