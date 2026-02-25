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
      
              <div class="trigger-status"></div>
          </div>
       </div>
    `;

    viewsContainer.appendChild(view);
  });

  // ============================
  // DEFAULT VIEW
  // ============================
  if (extensions.length > 0) {
    const first = extensions[0];
    switchView(first.id, first.name);
  } else {
    switchView('read-page', 'Page Properties');
  }

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

    if (!ext) return;

    editingExtensionId = extId;

    // Switch to Add Extension view
    switchView("add-extension", "Edit Extension");
    let tenantId = "";

    try {
      const url = new URL(ext.webhook);
      tenantId = url.pathname.split("/").pop();
    } catch (e) {
      console.warn("Invalid webhook format:", ext.webhook);
    }


    // Fill form
    document.getElementById("ext-name").value = ext.name;
    document.getElementById("ext-icon").value = ext.icon;
    document.getElementById("ext-tenant-id").value = tenantId;
    document.getElementById("ext-description").value = ext.description || "";

    // Change button text
    document.querySelector("#add-ext-form button[type='submit']").textContent = "Update Extension";
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

  addBtn.addEventListener("click", () => {
    switchView("add-extension", "Add New Extension");
  });

  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    form.reset();
    editingExtensionId = null;

    document.querySelector("#add-ext-form button[type='submit']").textContent = "Add Extension";
    switchView("read-page", "Page Properties");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addNewExtension();
  });

  // Auto-generate label from extension name
  if (nameInput && iconInput) {
    nameInput.addEventListener('input', (e) => {
      const name = e.target.value.trim();
      if (name.length >= 2) {
        // Get first two letters and convert to uppercase
        const abbreviation = name.substring(0, 2).toUpperCase();
        iconInput.value = abbreviation;
      } else if (name.length === 1) {
        iconInput.value = name.toUpperCase();
      }
    });
  }
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
      alert("This Flow ID is already added.");
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
        document.querySelector(
          "#add-ext-form button[type='submit']"
        ).textContent = "Add Extension";
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
    if (checkedVars.phoneCount) dataObj.phoneCount = temp.phones.length;
    if (checkedVars.emailCount) dataObj.emailCount = temp.emails.length;
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
      // pageUrl: window.location.href,
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

// Build and update preview for an extension from its selected checkboxes
function updatePreviewForExtension(extId) {

  const view = document.querySelector(`.content-view[data-view="${extId}"]`);
  if (!view) return;

  const temp = getTemporaryData();

  const checkedVars = {};
  view.querySelectorAll('.var-checkbox').forEach(cb => {
    checkedVars[cb.getAttribute('data-var')] = cb.checked;
  });
  /* =========================================
    Populate Phones Dropdown (Only Once)
 ========================================= */
  const phonesDropdown = document.getElementById(`phones-dropdown-${extId}`);
  if (phonesDropdown && phonesDropdown.dataset.initialized !== "true" && temp.phones && temp.phones.length > 0) {

    phonesDropdown.dataset.initialized = "true";
    phonesDropdown.innerHTML = "";

    // Controls
    const controls = document.createElement("div");
    controls.className = "dropdown-controls";
    controls.innerHTML = `
    <button type="button" class="select-all-phones">Select All</button>
    <button type="button" class="deselect-all-phones">Deselect All</button>
  `;
    phonesDropdown.appendChild(controls);

    // Items
    temp.phones.forEach(phone => {
      const label = document.createElement("label");
      label.innerHTML = `
    <input type="checkbox" class="phone-item" value="${phone}">
    ${phone}
  `;
      phonesDropdown.appendChild(label);
    });

    // Select All
    controls.querySelector('.select-all-phones').addEventListener('click', () => {
      phonesDropdown.querySelectorAll('.phone-item').forEach(cb => cb.checked = true);
      updatePreviewForExtension(extId);
    });

    // Deselect All
    controls.querySelector('.deselect-all-phones').addEventListener('click', () => {
      phonesDropdown.querySelectorAll('.phone-item').forEach(cb => cb.checked = false);
      updatePreviewForExtension(extId);
    });

    // Individual checkbox change
    phonesDropdown.addEventListener('change', (e) => {
      if (e.target.classList.contains('phone-item')) {
        updatePreviewForExtension(extId);
      }
    });
  }
  /* =========================================
    Populate Emails Dropdown (Only Once)
 ========================================= */
  const emailsDropdown = document.getElementById(`emails-dropdown-${extId}`);

  if (emailsDropdown && emailsDropdown.dataset.initialized !== "true" && temp.emails && temp.emails.length > 0) {

    emailsDropdown.dataset.initialized = "true";
    emailsDropdown.innerHTML = "";

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
  /* =========================================
     Build Payload Data (Using Selected Items)
  ========================================= */
  const dataObj = {};

  if (checkedVars.pageUrl)
    dataObj.pageUrl = window.location.href;

  if (checkedVars.timestamps)
    dataObj.timestamps = new Date().toISOString();

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

  if (checkedVars.phoneCount)
    dataObj.phoneCount = (dataObj.phones || temp.phones).length;

  if (checkedVars.emailCount)
    dataObj.emailCount = (dataObj.emails || temp.emails).length;

  if (checkedVars.description) {
    const descInput = document.getElementById(`desc-input-${extId}`);
    const description = descInput ? descInput.value.trim() : '';
    if (description)
      dataObj.description = description;
  }

  /* =========================================
     Preview Object
  ========================================= */
  const preview = {
    extensionId: extId,
    previewedAt: new Date().toISOString(),
    pageUrl: window.location.href,
    data: dataObj
  };

  const previewEl = document.getElementById(`preview-${extId}`);
  if (previewEl)
    previewEl.textContent = JSON.stringify(preview, null, 2);


  // ===== Update Selected Counts =====

  const phonesCountEl = view.querySelector(`.phones-count[data-ext-id="${extId}"]`);
  const emailsCountEl = view.querySelector(`.emails-count[data-ext-id="${extId}"]`);

  if (phonesCountEl) {
    const selectedPhones = view.querySelectorAll('.phone-item:checked').length;
    phonesCountEl.textContent = selectedPhones;
  }

  if (emailsCountEl) {
    const selectedEmails = view.querySelectorAll('.email-item:checked').length;
    emailsCountEl.textContent = selectedEmails;
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
        // cache latest page data so extension views can read counts even when read-page view is hidden
        lastPageData = response || { phones: [], emails: [], pageUrl: '' };
        displayData(response);

        // update previews/counts for all extension views that have a preview element
        document.querySelectorAll('[id^="preview-"]').forEach(el => {
          const extId = el.id.replace('preview-', '');
          try { updatePreviewForExtension(extId); } catch (e) { /* ignore */ }
        });
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

