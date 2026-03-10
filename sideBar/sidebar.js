import { getTemporaryData, displayData, displayEmptyState, showStatus, setLastPageData, getExtensionById } from "./utils/utilService.js";
import { renderFlows } from "./Flows/render.js";
import { initFlowForm, openEditExtension } from "./Form/flowForm.js";
// Storage key for extensions
const EXTENSIONS_STORAGE_KEY = "readPageExtensions";
let tempExtDeleteId = null;
let extensionsCache = [];
// Load metadata when sidebar loads
document.addEventListener("DOMContentLoaded", () => {
  loadExtensionsFromStorage();
  loadSidebarData();
  setupCloseButton();
  setupDeleteModal();
  initFlowForm(switchView, loadExtensionsFromStorage);
  setupIconNavigation();

  const refreshBtn = document.getElementById("refreshPageBtn");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshPageScan);
  }
});

// Load extensions from chrome storage and render them
function loadExtensionsFromStorage(callback) {
  chrome.storage.local.get([EXTENSIONS_STORAGE_KEY], (result) => {
    extensionsCache = result[EXTENSIONS_STORAGE_KEY] || [];
    console.log("Loaded extensions:", extensionsCache);
    renderFlows(extensionsCache, switchView, openDeleteModal, (extId) => openEditExtension(extId, switchView), updatePreviewForExtension);
    if (typeof callback === "function") {
      callback(extensionsCache);
    }
  });
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

// Delete extension
function deleteExtension(extId) {
  extensionsCache = extensionsCache.filter(ext => ext.id !== extId);
  chrome.storage.local.set(
    { [EXTENSIONS_STORAGE_KEY]: extensionsCache },
    () => {
      renderFlows(extensionsCache, switchView, openDeleteModal, (extId) => openEditExtension(extId, switchView), updatePreviewForExtension);
      switchView("read-page", "Page Properties");
    }
  );
}

function refreshPageScan() {
  try {
    if (!chrome?.runtime?.id) {
      return;
    }

    chrome.runtime.sendMessage(
      { type: "RESCAN_PAGE" },
      (response) => {

        if (chrome.runtime.lastError) {
          return;
        }

        // reload sidebar data after scan
        loadSidebarData();
        updatePhoneEmailLists()
        renderFlows(extensionsCache, switchView, openDeleteModal, (extId) => openEditExtension(extId, switchView), updatePreviewForExtension);
        switchView("read-page", "Page Properties");

        showStatus(chrome.runtime.id, "success", "Page rescan complete");
      }
    );

  } catch (err) {
    console.error("Refresh scan failed:", err);
  }
}

function updatePhoneEmailLists(flowId) {

  const data = getTemporaryData(); // phones + emails from scan

  const phones = data?.phones || [];
  const emails = data?.emails || [];

  const phoneDropdown = document.getElementById(`phones-dropdown-${flowId}`);
  const emailDropdown = document.getElementById(`emails-dropdown-${flowId}`);

  const phoneCount = document.querySelector(`.phones-count[data-flow-id="${flowId}"]`);
  const emailCount = document.querySelector(`.emails-count[data-flow-id="${flowId}"]`);

  if (!phoneDropdown || !emailDropdown) return;

  // clear old items
  phoneDropdown.innerHTML = "";
  emailDropdown.innerHTML = "";

  // update counts
  if (phoneCount) phoneCount.textContent = phones.length;
  if (emailCount) emailCount.textContent = emails.length;

  // render phones
  phones.forEach(phone => {
    const item = document.createElement("label");
    item.innerHTML = `
      <input type="checkbox" class="phone-item" value="${phone}" checked>
      ${phone}
    `;
    phoneDropdown.appendChild(item);
  });

  // render emails
  emails.forEach(email => {
    const item = document.createElement("label");
    item.innerHTML = `
      <input type="checkbox" class="email-item" value="${email}" checked>
      ${email}
    `;
    emailDropdown.appendChild(item);
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

    temp.phones.unique.forEach(phone => {
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

    temp.emails.unique.forEach(email => {
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
    dataObj.phoneCount = `${count}/${temp.phones.unique.length}`;
  }

  if (checkedVars.emailCount) {
    const count = view.querySelectorAll('.email-item:checked').length;
    dataObj.emailCount = `${count}/${temp.emails.unique.length}`;
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
    const selectedCount = view.querySelectorAll('.phone-item:checked').length;
    const totalCount = temp.phones.unique.length;
    phonesCountEl.textContent = `${selectedCount}/${totalCount}`;
  }

  if (emailsCountEl) {
    const selectedCount = view.querySelectorAll('.email-item:checked').length;
    const totalCount = temp.emails.unique.length;
    emailsCountEl.textContent = `${selectedCount}/${totalCount}`;
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

  if (viewId === "read-page") {
    loadSidebarData();
    document.getElementById("contentHeader").innerHTML =
      ` <h3>Page Properties</h3>
      <div class="header-actions">
        <button class="flowActionBTN refresh" id="refreshClick">⟲</button>
      </div>`;
  } else if (viewId === "add-extension") {
    document.getElementById("contentHeader").innerHTML = ` <h3>Add New Flow </h3>`;
  } else {
    const ext = getExtensionById(viewId, extensionsCache);

    document.getElementById("contentHeader").innerHTML =
      `<div class="header-title">
          <h2>${ext?.icon || ""}</h2>
          <h3>${title}</h3>
          </div>
          <div class="header-actions">
            <button class="flowActionBTN refresh" id="refreshClick">⟲</button>
            <button class="flowActionBTN edit" id="editClick">✏️</button>
            <button class="flowActionBTN delete" id="deleteClick">🗑️</button>
          </div>`;
  }
  const editBtn = document.getElementById("editClick");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      openEditExtension(viewId, switchView);
    });
  }

  const deleteBtn = document.getElementById("deleteClick");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      openDeleteModal(viewId, ext?.name || "Flow");
    });
  }
  const refreshBtn = document.getElementById("refreshClick");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshPageScan);
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
    chrome.runtime.sendMessage({ type: "CLOSE_SIDEPANEL" });
  } catch (error) {
    console.error("Error requesting side panel close:", error);
  }
}

function loadSidebarData() {

  try {

    // 🔒 Check if extension context is still valid
    if (!chrome?.runtime?.id) {
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
