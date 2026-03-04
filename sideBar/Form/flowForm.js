let editingExtensionId = null;
let switchViewRef = null;

export function initFlowForm(switchViewFn) {
  switchViewRef = switchViewFn;
}

document.addEventListener("DOMContentLoaded", () => {
  fetch("Form/flowForm.html")
    .then((response) => response.text())
    .then((html) => {
      const container = document.querySelector(
        '.content-view[data-view="add-extension"]'
      );
      if (container) {
        container.innerHTML = html;
        initializeFlowForm();
      }
    })
    .catch((err) => console.error("Error loading form HTML:", err));
});

function initializeFlowForm() {
  const form = document.getElementById("add-ext-form");
  const addBtn = document.querySelector(".add-ext-btn");
  const cancelBtn = document.getElementById("cancel-add-ext");
  const nameInput = document.getElementById("ext-name");
  const iconInput = document.getElementById("ext-icon");
  const submitBtn = document.getElementById("ext-submit-btn");

  // Open Add Form
  addBtn?.addEventListener("click", () => {
    editingExtensionId = null;
    form.reset();
    submitBtn.textContent = "Add Extension";
    const title = document.getElementById("form-title");
    if (title) title.textContent = "Add New Extension";
    if (switchViewRef) {
      switchViewRef("add-extension", "Add New Extension");
    }
  });

  // Cancel
  cancelBtn?.addEventListener("click", () => {
    editingExtensionId = null;
    form.reset();
    submitBtn.textContent = "Add Extension";
    const title = document.getElementById("form-title");
    if (title) title.textContent = "Add New Extension";
    switchView("read-page", "Page Properties");
  });

  // Auto generate icon
  nameInput?.addEventListener("input", (e) => {
    const name = e.target.value.trim();
    iconInput.value =
      name.length >= 2
        ? name.substring(0, 2).toUpperCase()
        : name.toUpperCase();
  });

  // Submit
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSubmit();
  });
}


function handleSubmit() {
  const name = document.getElementById("ext-name").value.trim();
  const icon = document.getElementById("ext-icon").value.trim();
  const tenantId = document.getElementById("ext-tenant-id").value.trim();
  const description = document.getElementById("ext-description").value.trim();

  if (!name || !icon || !tenantId || !description) {
    showFormStatus("error", "All fields required");
    return;
  }

  const webhook = `https://flow.datatawk.ai/api/webhooks/trigger/${tenantId}`;

  chrome.storage.local.get(["readPageExtensions"], (result) => {
    let extensions = result.readPageExtensions || [];

    if (editingExtensionId) {
      extensions = extensions.map(ext =>
        ext.id === editingExtensionId
          ? { ...ext, name, icon, tenantId, webhook, description }
          : ext
      );
      editingExtensionId = null;
    } else {
      extensions.push({
        id: "ext_" + Date.now(),
        name,
        icon,
        tenantId,
        webhook,
        description,
        createdAt: new Date().toISOString()
      });
    }

    chrome.storage.local.set(
      { readPageExtensions: extensions },
      () => {
        document.getElementById("add-ext-form").reset();
        document.getElementById("ext-submit-btn").textContent = "Add Extension";
        const title = document.getElementById("form-title");
        if (title) title.textContent = "Add New Extension";
        loadExtensionsFromStorage(() => {
          switchView("read-page", "Page Properties");
        });
      }
    );
  });
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

export function openEditExtension(extId, switchView) {
  chrome.storage.local.get(["readPageExtensions"], (result) => {
    const extensions = result.readPageExtensions || [];
    const ext = extensions.find(e => e.id === extId);

    if (ext) {
      editingExtensionId = extId;

      const nameInput = document.getElementById("ext-name");
      const iconInput = document.getElementById("ext-icon");
      const tenantInput = document.getElementById("ext-tenant-id");
      const descInput = document.getElementById("ext-description");
      const submitBtn = document.getElementById("ext-submit-btn");
      const title = document.getElementById("form-title");

      if (nameInput) nameInput.value = ext.name || "";
      if (iconInput) iconInput.value = ext.icon || "";
      if (tenantInput) tenantInput.value = ext.tenantId || "";
      if (descInput) descInput.value = ext.description || "";

      if (submitBtn) submitBtn.textContent = "Update Extension";
      if (title) title.textContent = "Edit Extension";

      switchView("add-extension", "Edit Extension");
    }
  });
}