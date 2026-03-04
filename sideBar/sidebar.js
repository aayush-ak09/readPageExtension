import { getTemporaryData, displayData, displayEmptyState, showStatus, setLastPageData } from "./utils/utilService.js";
import { renderFlows } from "./Flows/render.js";
import { initFlowForm, openEditExtension } from "./Form/flowForm.js";
// Storage key for extensions
const EXTENSIONS_STORAGE_KEY = "readPageExtensions";
let tempExtDeleteId = null;
// last extracted page data cached so extension views can read counts even when read-page view is hidden
let lastPageData = { phones: [], emails: [], pageUrl: '' };
// Load metadata when sidebar loads
document.addEventListener("DOMContentLoaded", () => {
  loadExtensionsFromStorage();
  loadSidebarData();
  setupCloseButton();
  setupDeleteModal();
  initFlowForm(switchView);
  setupIconNavigation();
});

// Load extensions from chrome storage and render them
function loadExtensionsFromStorage(callback) {
  chrome.storage.local.get([EXTENSIONS_STORAGE_KEY], (result) => {
    const extensions = result[EXTENSIONS_STORAGE_KEY] || [];
    renderFlows(extensions, switchView, openDeleteModal, (extId) => openEditExtension(extId, switchView), updatePreviewForExtension);
    if (callback && typeof callback === 'function') {
      callback();
    }
  });
}


// Add extension inline form functionality


// Delete modal setup
function setupDeleteModal() {
  const modal = document.getElementById("delete-modal");
  const confirmBtn = document.getElementById("confirm-delete");
  const closeBtns = document.querySelectorAll(".modal-close");

  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      if (tempExtDeleteId) {
        deleteExtension(tempExtDeleteId);
        tempExtDeleteId = null;
      }
      modal.classList.add("hidden");
    });
  }

  // Handle Cancel and X
  closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tempExtDeleteId = null;
      modal.classList.add("hidden");
    });
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

// Delete extension
function deleteExtension(extId) {
  chrome.storage.local.get([EXTENSIONS_STORAGE_KEY], (result) => {
    let extensions = result[EXTENSIONS_STORAGE_KEY] || [];
    extensions = extensions.filter(ext => ext.id !== extId);

    chrome.storage.local.set({ [EXTENSIONS_STORAGE_KEY]: extensions }, () => {
      console.log("Extension deleted:", extId);
      loadExtensionsFromStorage();
      switchView("read-page", "Page Properties");
    });
  });
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
    const temp = getTemporaryData();

    // Read selected vars from the extension's content view checkboxes
    const view = document.querySelector(`.content-view[data-view="${extId}"]`);
    const checkedVars = {};
    if (view) {
      view.querySelectorAll('.var-checkbox').forEach(cb => {
        checkedVars[cb.getAttribute('data-var')] = cb.checked;
      });
    }

    const dataObj = {};
    // if (checkedVars.pageUrl) dataObj.pageUrl = window.location.href;
    if (checkedVars.timestamps) dataObj.timestamps = new Date().toISOString();
    if (checkedVars.phones) {
      const selectedPhones = [];
      view.querySelectorAll('.phone-item:checked').forEach(cb => {
        selectedPhones.push(cb.value);
      });
      dataObj.phones = selectedPhones;
    }

    if (checkedVars.emails) {
      const selectedEmails = [];
      view.querySelectorAll('.email-item:checked').forEach(cb => {
        selectedEmails.push(cb.value);
      });
      dataObj.emails = selectedEmails;
    }
    if (checkedVars.description) {
      const descInput = document.getElementById(`desc-input-${extId}`);
      const description = descInput ? descInput.value.trim() : '';
      if (description) dataObj.description = description;
    }

    const payload = {
      extensionId: extension.id,
      extensionName: extension.name,
      extensionIcon: extension.icon,
      sentAt: new Date().toISOString(),
      data: dataObj
    };

    // update preview
    const previewEl = document.getElementById(`preview-${extId}`);
    if (previewEl) previewEl.textContent = JSON.stringify(payload, null, 2);

    try {
      const response = await fetch(extension.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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


function initializeDropdowns(extId) {

  const view = document.querySelector(`.content-view[data-view="${extId}"]`);
  if (!view) return;

  const temp = getTemporaryData();

  // ===========================
  // PHONES
  // ===========================
  const phonesDropdown = document.getElementById(`phones-dropdown-${extId}`);
  if (phonesDropdown && !phonesDropdown.dataset.initialized) {

    phonesDropdown.dataset.initialized = "true";

    const controls = document.createElement("div");
    controls.className = "dropdown-controls";
    controls.innerHTML = `
      <button type="button" class="select-all-phones">Select All</button>
      <button type="button" class="deselect-all-phones">Deselect All</button>
    `;
    phonesDropdown.appendChild(controls);

    temp.phones.forEach(phone => {
      const label = document.createElement("label");
      label.innerHTML = `
        <input type="checkbox" class="phone-item" value="${phone}">
        ${phone}
      `;
      phonesDropdown.appendChild(label);
    });

    controls.querySelector('.select-all-phones').addEventListener('click', () => {
      phonesDropdown.querySelectorAll('.phone-item').forEach(cb => cb.checked = true);
      updatePreviewForExtension(extId);
    });

    controls.querySelector('.deselect-all-phones').addEventListener('click', () => {
      phonesDropdown.querySelectorAll('.phone-item').forEach(cb => cb.checked = false);
      updatePreviewForExtension(extId);
    });

    phonesDropdown.addEventListener('change', (e) => {
      if (e.target.classList.contains('phone-item')) {
        updatePreviewForExtension(extId);
      }
    });
  }

  // ===========================
  // EMAILS
  // ===========================
  const emailsDropdown = document.getElementById(`emails-dropdown-${extId}`);
  if (emailsDropdown && !emailsDropdown.dataset.initialized) {

    emailsDropdown.dataset.initialized = "true";

    const controls = document.createElement("div");
    controls.className = "dropdown-controls";
    controls.innerHTML = `
      <button type="button" class="select-all-emails">Select All</button>
      <button type="button" class="deselect-all-emails">Deselect All</button>
    `;
    emailsDropdown.appendChild(controls);

    temp.emails.forEach(email => {
      const label = document.createElement("label");
      label.innerHTML = `
        <input type="checkbox" class="email-item" value="${email}">
        ${email}
      `;
      emailsDropdown.appendChild(label);
    });

    controls.querySelector('.select-all-emails').addEventListener('click', () => {
      emailsDropdown.querySelectorAll('.email-item').forEach(cb => cb.checked = true);
      updatePreviewForExtension(extId);
    });

    controls.querySelector('.deselect-all-emails').addEventListener('click', () => {
      emailsDropdown.querySelectorAll('.email-item').forEach(cb => cb.checked = false);
      updatePreviewForExtension(extId);
    });

    emailsDropdown.addEventListener('change', (e) => {
      if (e.target.classList.contains('email-item')) {
        updatePreviewForExtension(extId);
      }
    });
  }
}



// Build and update preview for an extension from its selected checkboxes
function updatePreviewForExtension(extId) {

  const view = document.querySelector(`.content-view[data-view="${extId}"]`);
  if (!view) return;

  const temp = getTemporaryData();

  // ================================
  // Read Selected Main Variables
  // ================================
  const checkedVars = {};
  view.querySelectorAll('.var-checkbox').forEach(cb => {
    checkedVars[cb.getAttribute('data-var')] = cb.checked;
  });

  // ================================
  // Build Payload Data
  // ================================
  const dataObj = {};

  if (checkedVars.pageUrl) {
    dataObj.pageUrl = window.location.href;
  }

  if (checkedVars.timestamps) {
    dataObj.timestamps = new Date().toISOString();
  }

  if (checkedVars.phones) {
    const selectedPhones = [];
    view.querySelectorAll('.phone-item:checked').forEach(cb => {
      selectedPhones.push(cb.value);
    });
    dataObj.phones = selectedPhones;
  }

  if (checkedVars.emails) {
    const selectedEmails = [];
    view.querySelectorAll('.email-item:checked').forEach(cb => {
      selectedEmails.push(cb.value);
    });
    dataObj.emails = selectedEmails;
  }

  if (checkedVars.phoneCount) {
    const count = view.querySelectorAll('.phone-item:checked').length;
    dataObj.phoneCount = count;
  }

  if (checkedVars.emailCount) {
    const count = view.querySelectorAll('.email-item:checked').length;
    dataObj.emailCount = count;
  }

  if (checkedVars.description) {
    const descInput = document.getElementById(`desc-input-${extId}`);
    const description = descInput ? descInput.value.trim() : '';
    if (description) {
      dataObj.description = description;
    }
  }

  // ================================
  // Update Preview
  // ================================
  const preview = {
    extensionId: extId,
    previewedAt: new Date().toISOString(),
    pageUrl: window.location.href,
    data: dataObj
  };

  const previewEl = document.getElementById(`preview-${extId}`);
  if (previewEl) {
    previewEl.textContent = JSON.stringify(preview, null, 2);
  }

  // ================================
  // Update Selected Counts in UI
  // ================================
  const phonesCountEl = view.querySelector(`.phones-count[data-flow-id="${extId}"]`);

  const emailsCountEl = view.querySelector(`.emails-count[data-flow-id="${extId}"]`);
  if (phonesCountEl) {
    phonesCountEl.textContent =
      view.querySelectorAll('.phone-item:checked').length;
  }

  if (emailsCountEl) {
    emailsCountEl.textContent =
      view.querySelectorAll('.email-item:checked').length;
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

  if (viewId !== "read-page" && viewId !== "add-extension") {
    initializeDropdowns(viewId);
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
      switchView("read-page", "Page Properties");
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

    // 🔒 Check if extension context is still valid
    if (!chrome?.runtime?.id) {
      console.warn("Extension context invalidated. Please reload extension.");
      displayEmptyState();
      return;
    }

    chrome.runtime.sendMessage(
      { type: "GET_RESULT" },
      (response) => {

        // 🔒 Handle runtime errors safely
        if (chrome.runtime.lastError) {
          console.warn("Runtime error:", chrome.runtime.lastError.message);
          displayEmptyState();
          return;
        }

        if (!response) {
          displayEmptyState();
          return;
        }

        // Cache latest page data
        setLastPageData(response);
        displayData(response);

        // 🔄 Update all extension previews safely
        document.querySelectorAll('[id^="preview-"]').forEach(el => {
          const extId = el.id.replace('preview-', '');
          try {
            updatePreviewForExtension(extId);
          } catch (err) {
            console.warn("Preview update failed for:", extId, err);
          }
        });
      }
    );

  } catch (error) {
    console.error("Error loading sidebar data:", error);
    displayEmptyState();
  }
}
