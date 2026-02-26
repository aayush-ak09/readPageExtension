// Storage key for extensions
const EXTENSIONS_STORAGE_KEY = "readPageExtensions";
let tempExtDeleteId = null;
// last extracted page data cached so extension views can read counts even when read-page view is hidden
let lastPageData = { phones: [], emails: [], pageUrl: '' };
let editingExtensionId = null;

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
function loadExtensionsFromStorage(callback) {
  chrome.storage.local.get([EXTENSIONS_STORAGE_KEY], (result) => {
    const extensions = result[EXTENSIONS_STORAGE_KEY] || [];
    renderExtensionIcons(extensions);
    // Call optional callback after rendering
    if (callback && typeof callback === 'function') {
      callback();
    }
  });
}

//#region Render extension
function renderExtensionIcons(extensions) {
  const container = document.getElementById("extensions-container");
  const viewsContainer = document.getElementById("dynamic-views-container");

  container.innerHTML = "";
  viewsContainer.innerHTML = "";

  extensions.forEach((ext) => {

    // ============================
    // ICON BUTTON
    // ============================
    const btn = document.createElement("div");
    btn.className = "icon-button";
    btn.setAttribute("data-view", ext.id);
    btn.setAttribute("title", ext.name);
    btn.textContent = ext.icon;
    btn.addEventListener("click", () => switchView(ext.id, ext.name));
    container.appendChild(btn);

    // ============================
    // EXTENSION VIEW
    // ============================
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
          <div style="display:flex; gap:8px;">
            <button class="ext-edit-btn" data-ext-id="${ext.id}">✏️</button>
            <button class="ext-delete-btn" data-ext-id="${ext.id}"data-ext-name="${ext.name}">🗑️</button>
          </div>
        </div>

        ${ext.description ? `
          <div class="extension-description" 
               style="margin: 8px 0 15px; font-size: 13px; color: #666;">
            ${ext.description}
          </div>
        ` : ""}

        <div class="section">
          <h4>Variables</h4>
          <ul class="var-list-vertical">
            <li class="var-group">
              <div class="var-header">
               <label>
                 <input type="checkbox" class="var-checkbox" data-var="phones" checked>Phones (<span class="count phones-count" data-ext-id="${ext.id}">0</span>)
               </label>
                <button type="button" class="dropdown-toggle" data-type="phones" data-ext-id="${ext.id}">⌄</button>
             </div>
             <div class="dropdown-list hidden"id="phones-dropdown-${ext.id}"></div>
            </li>
            <li class="var-group">
              <div class="var-header">
                <label>
                  <input type="checkbox" class="var-checkbox" data-var="emails" checked>
                  Emails (<span class="count emails-count" data-ext-id="${ext.id}">0</span>)
                </label>
                <button type="button"class="dropdown-toggle"data-type="emails"data-ext-id="${ext.id}">⌄</button>
              </div>
              <div class="dropdown-list hidden" id="emails-dropdown-${ext.id}"></div>
            </li>            
            <li><label><input type="checkbox" class="var-checkbox" data-var="timestamps"> Timestamps</label></li>
            <li><label><input type="checkbox" class="var-checkbox" data-var="description"> Description (Optional)</label></li>
          </ul>
        </div>

        <div class="section description-section hidden" id="desc-section-${ext.id}">
          <label for="desc-input-${ext.id}" class="section-label">📝 Description:</label>
          <textarea id="desc-input-${ext.id}" 
                    class="description-input" 
                    placeholder="Enter description for this action (optional - e.g., 'Lead generation inquiry', 'Customer support', etc.)"
                    maxlength="500"></textarea>
          <span class="char-count">
            <span id="char-count-${ext.id}">0</span>/500
          </span>
        </div>

          <div class="ext-bottom-actions">
              <button class="payload-toggle" data-ext-id="${ext.id}">View payload...</button>
              
              <div class="payload-preview hidden" id="preview-${ext.id}"></div>
      
              <button class="ext-trigger-btn" data-ext-id="${ext.id}">📤 Send Data to ${ext.name}</button>
      
              <div class="trigger-status" id="status-${ext.id}"></div>
          </div>
       </div>
    `;

    viewsContainer.appendChild(view);
  });

  // ============================
  // DEFAULT VIEW
  // ============================
  switchView('read-page', 'Page Properties');

  // ============================
  // EXISTING LISTENERS (UNCHANGED)
  // ============================

  document.querySelectorAll(".ext-delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const extId = btn.getAttribute("data-ext-id");
      const extName = btn.getAttribute("data-ext-name");
      openDeleteModal(extId, extName);
    });
  });

  document.querySelectorAll(".ext-edit-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const extId = btn.getAttribute("data-ext-id");
      openEditExtension(extId);
    });
  });

  document.querySelectorAll(".ext-trigger-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      console.warn("Triggering webhook for extension ID:", btn.getAttribute("data-ext-id"));
      const extId = btn.getAttribute("data-ext-id");
      triggerWebhook(extId);
    });
  });

  document.querySelectorAll('.var-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const viewEl = cb.closest('.content-view');
      if (!viewEl) return;
      const id = viewEl.getAttribute('data-view');

      if (cb.getAttribute('data-var') === 'description') {
        const descSection = document.getElementById(`desc-section-${id}`);
        if (descSection) {
          cb.checked
            ? descSection.classList.remove('hidden')
            : descSection.classList.add('hidden');
        }
      }

      updatePreviewForExtension(id);
    });
  });

  document.querySelectorAll('.dropdown-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewEl = btn.closest('.content-view');
      const extId = viewEl.getAttribute('data-view');
      const type = btn.getAttribute('data-type');
      const dropdown = document.getElementById(`${type}-dropdown-${extId}`);
      dropdown.classList.toggle('hidden');
    });
  });
  document.querySelectorAll('.description-input').forEach(textarea => {
    const extId = textarea.id.replace('desc-input-', '');
    const charCountEl = document.getElementById(`char-count-${extId}`);

    textarea.addEventListener('input', (e) => {
      if (charCountEl) charCountEl.textContent = e.target.value.length;
      const viewEl = textarea.closest('.content-view');
      if (!viewEl) return;
      const id = viewEl.getAttribute('data-view');
      updatePreviewForExtension(id);
    });
  });

  document.querySelectorAll('.payload-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const extId = btn.getAttribute('data-ext-id');
      const preview = document.getElementById(`preview-${extId}`);
      if (!preview) return;

      const isHidden = preview.classList.toggle('hidden');

      if (!isHidden) {
        updatePreviewForExtension(extId);
        btn.textContent = 'Hide payload...';
      } else {
        btn.textContent = 'View payload...';
      }
    });
  });

  document.querySelectorAll('.content-view').forEach(view => {
    const id = view.getAttribute('data-view');
    updatePreviewForExtension(id);
  });
}


// #region openEdit extention form 
function openEditExtension(extId) {

  chrome.storage.local.get([EXTENSIONS_STORAGE_KEY], function (result) {

    const extensions = result[EXTENSIONS_STORAGE_KEY] || [];
    const ext = extensions.find(e => e.id === extId);

    if (!ext) {
      console.warn("Extension not found:", extId);
      return;
    }

    // Set editing mode
    editingExtensionId = extId;

    // Switch to Add/Edit view
    switchView("add-extension", "Edit Extension");

    // Extract Flow ID from webhook
    let tenantId = "";

    try {
      const url = new URL(ext.webhook);
      tenantId = url.pathname.split("/").pop();
    } catch (e) {
      console.warn("Invalid webhook format:", ext.webhook);
    }

    // Wait one tick to ensure view is rendered
    setTimeout(() => {

      // Fill form fields
      const nameInput = document.getElementById("ext-name");
      const iconInput = document.getElementById("ext-icon");
      const tenantInput = document.getElementById("ext-tenant-id");
      const descInput = document.getElementById("ext-description");

      if (nameInput) nameInput.value = ext.name || "";
      if (iconInput) iconInput.value = ext.icon || "";
      if (tenantInput) tenantInput.value = tenantId || "";
      if (descInput) descInput.value = ext.description || "";

      // Change submit button text
      const submitBtn = document.getElementById("ext-submit-btn");
      if (submitBtn) {
        submitBtn.textContent = "Update Extension";
      }

    }, 0);

  });
}
// #endregion

// Add extension inline form functionality
function setupAddExtensionModal() {

  const form = document.getElementById("add-ext-form");
  const addBtn = document.querySelector(".add-ext-btn");
  const cancelBtn = document.getElementById("cancel-add-ext");
  const nameInput = document.getElementById("ext-name");
  const iconInput = document.getElementById("ext-icon");
  const submitBtn = document.getElementById("ext-submit-btn");

  // ===============================
  // ➕ Add Extension Button Click
  // ===============================
  addBtn.addEventListener("click", () => {

    // Clear editing mode
    editingExtensionId = null;

    // Reset form
    if (form) form.reset();

    // Reset submit button text
    if (submitBtn) {
      submitBtn.textContent = "Add Extension";
    }

    switchView("add-extension", "Add New Extension");
  });

  // ===============================
  // ❌ Cancel Button Click
  // ===============================
  cancelBtn.addEventListener("click", (e) => {

    e.preventDefault();

    // Reset editing mode
    editingExtensionId = null;

    // Reset form
    if (form) form.reset();

    // Reset submit button text
    if (submitBtn) {
      submitBtn.textContent = "Add Extension";
    }

    switchView("read-page", "Page Properties");
  });

  // ===============================
  // 📨 Form Submit
  // ===============================
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addNewExtension();
  });

  // ===============================
  // 🔤 Auto-generate Label from Name
  // ===============================
  if (nameInput && iconInput) {
    nameInput.addEventListener("input", (e) => {

      const name = e.target.value.trim();

      if (name.length >= 2) {
        iconInput.value = name.substring(0, 2).toUpperCase();
      } else if (name.length === 1) {
        iconInput.value = name.toUpperCase();
      } else {
        iconInput.value = "";
      }

    });
  }
}

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

function showFormStatus(type, message) {
  const el = document.getElementById("form-status");
  if (!el) return;

  el.className = `form-status ${type}`;
  el.textContent = message;

  setTimeout(() => {
    el.textContent = "";
    el.className = "form-status";
  }, 4000);
}



// Add new extension to storage
function addNewExtension() {
  const name = document.getElementById("ext-name").value.trim();
  const icon = document.getElementById("ext-icon").value.trim();
  const tenantId = document.getElementById("ext-tenant-id").value.trim();
  const description = document.getElementById("ext-description").value.trim();

  if (!name || !icon || !tenantId || !description) {
    alert("Please fill in all fields");
    return;
  }

  const webhook = `https://flow.datatawk.ai/api/webhooks/trigger/${tenantId}`;

  try {
    new URL(webhook);
  } catch (e) {
    alert("Invalid Flow ID");
    return;
  }

  chrome.storage.local.get([EXTENSIONS_STORAGE_KEY], (result) => {
    let extensions = result[EXTENSIONS_STORAGE_KEY] || [];

    // 🚨 Prevent duplicate tenant IDs (except when editing same one)
    const duplicate = extensions.find(ext =>
      ext.tenantId === tenantId &&
      ext.id !== editingExtensionId
    );

    if (duplicate) {
      showFormStatus("error", "This Flow ID is already added.");
      return;
    }

    if (editingExtensionId) {
      // =========================
      // UPDATE MODE
      // =========================
      extensions = extensions.map(ext => {
        if (ext.id === editingExtensionId) {
          return {
            ...ext,
            name,
            icon,
            tenantId,
            webhook,
            description,
            updatedAt: new Date().toISOString()
          };
        }
        return ext;
      });

      editingExtensionId = null;

    } else {
      // =========================
      // CREATE MODE
      // =========================
      const newExt = {
        id: "ext_" + Date.now(),
        name,
        icon,
        tenantId,
        webhook,
        description,
        createdAt: new Date().toISOString()
      };
      extensions.push(newExt);
    }

    chrome.storage.local.set(
      { [EXTENSIONS_STORAGE_KEY]: extensions },
      () => {
        document.getElementById("add-ext-form").reset();
        const submitBtn = document.querySelector("#add-ext-form button[type='submit']");
        if (submitBtn) {
          submitBtn.textContent = "Add Extension";
        }
        loadExtensionsFromStorage(() => {
          switchView("read-page", "Page Properties");
        });
      }
    );
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
      switchView("read-page", "Page Properties");
    });
  });
}

// Get temporary data stored from page
function getTemporaryData() {
  // Prefer reading the visible lists in the read-page view; if they are not present
  // (because the user is viewing an extension panel), fall back to the cached
  // `lastPageData` from the most recent `loadSidebarData` call.
  const phoneList = document.getElementById("phones");
  const emailList = document.getElementById("emails");

  if (phoneList || emailList) {
    const phones = [];
    const emails = [];

    if (phoneList) {
      phoneList.querySelectorAll("li").forEach(li => {
        const text = li.textContent.trim();
        if (text && text !== "No phones found") phones.push(text);
      });
    }

    if (emailList) {
      emailList.querySelectorAll("li").forEach(li => {
        const text = li.textContent.trim();
        if (text && text !== "No emails found") emails.push(text);
      });
    }

    return { phones, emails, pageUrl: lastPageData.pageUrl };
  }

  // fallback to cached data
  return {
    phones: Array.isArray(lastPageData.phones) ? lastPageData.phones : [],
    emails: Array.isArray(lastPageData.emails) ? lastPageData.emails : [],
    pageUrl: lastPageData.pageUrl || ''
  };
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
  const phonesCountEl = view.querySelector(`.phones-count[data-ext-id="${extId}"]`);
  const emailsCountEl = view.querySelector(`.emails-count[data-ext-id="${extId}"]`);

  if (phonesCountEl) {
    phonesCountEl.textContent =
      view.querySelectorAll('.phone-item:checked').length;
  }

  if (emailsCountEl) {
    emailsCountEl.textContent =
      view.querySelectorAll('.email-item:checked').length;
  }
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
        lastPageData = response || { phones: [], emails: [], pageUrl: '' };

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

