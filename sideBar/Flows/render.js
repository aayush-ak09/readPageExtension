// sideBar/Flows/render.js

import { getTemporaryData, showStatus } from "../utils/utilService.js";

export function renderFlows(
    flows,
    switchView,
    openDeleteModal,
    openEditExtension,
    updatePreviewForExtension
) {
    const container = document.getElementById("extensions-container");
    const viewsContainer = document.getElementById("dynamic-views-container");

    container.innerHTML = "";
    viewsContainer.innerHTML = "";

    flows.forEach((flow) => {

        // LEFT ICON
        const btn = document.createElement("div");
        btn.className = "icon-button";
        btn.setAttribute("data-view", flow.id);
        btn.setAttribute("title", flow.name);
        btn.textContent = flow.icon;
        btn.addEventListener("click", () => switchView(flow.id, flow.name));
        container.appendChild(btn);

        // RIGHT VIEW
        const view = document.createElement("div");
        view.className = "content-view";
        view.setAttribute("data-view", flow.id);

        view.innerHTML = `
      <div class="ext-card">

        <div class="ext-header">
          <div class="ext-title">
            <span class="ext-icon-large">${flow.icon}</span>
            <span>${flow.name}</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="flow-edit-btn" data-flow-id="${flow.id}">✏️</button>
            <button class="flow-delete-btn" data-flow-id="${flow.id}" data-name="${flow.name}">🗑️</button>
          </div>
        </div>

        ${flow.description ? `
          <div class="extension-description"
               style="margin:8px 0 15px;font-size:13px;color:#666;">
            ${flow.description}
          </div>
        ` : ""}

        <div class="section">
          <h4>Variables</h4>
          <ul class="var-list-vertical">

            <li class="var-group">
              <div class="var-header">
                <label>
                  <input type="checkbox" class="var-checkbox" data-var="phones" checked>
                  Phones (<span class="count phones-count" data-flow-id="${flow.id}">0</span>)
                </label>
                <button type="button" class="dropdown-toggle"
                        data-type="phones"
                        data-flow-id="${flow.id}">⌄</button>
              </div>
              <div class="dropdown-list hidden" id="phones-dropdown-${flow.id}"></div>
            </li>

            <li class="var-group">
              <div class="var-header">
                <label>
                  <input type="checkbox" class="var-checkbox" data-var="emails" checked>
                  Emails (<span class="count emails-count" data-flow-id="${flow.id}">0</span>)
                </label>
                <button type="button" class="dropdown-toggle"
                        data-type="emails"
                        data-flow-id="${flow.id}">⌄</button>
              </div>
              <div class="dropdown-list hidden" id="emails-dropdown-${flow.id}"></div>
            </li>

            <li>
              <label>
                <input type="checkbox" class="var-checkbox" data-var="timestamps">
                Timestamps
              </label>
            </li>

            <li>
              <label>
                <input type="checkbox" class="var-checkbox" data-var="description">
                Description (Optional)
              </label>
            </li>

          </ul>
        </div>

        <div class="section description-section hidden" id="desc-section-${flow.id}">
          <label class="section-label">📝 Description:</label>
          <textarea
            id="desc-input-${flow.id}"
            class="description-input"
            maxlength="500"
            placeholder="Enter description (optional)">
          </textarea>
          <span class="char-count">
            <span id="char-count-${flow.id}">0</span>/500
          </span>
        </div>

        <div class="ext-bottom-actions">
          <button class="payload-toggle" data-flow-id="${flow.id}">
            View payload...
          </button>
          <div class="payload-preview hidden" id="preview-${flow.id}"></div>

          <button class="flow-trigger-btn" data-flow-id="${flow.id}">
            📤 Send Data to ${flow.name}
          </button>

          <div class="trigger-status" id="status-${flow.id}"></div>
        </div>

      </div>
    `;

        viewsContainer.appendChild(view);
    });

    attachFlowEvents(openDeleteModal, openEditExtension, updatePreviewForExtension);
}

// ------------------------------------------------------

function attachFlowEvents(openDeleteModal, openEditExtension, updatePreviewForExtension) {

    // DELETE
    document.querySelectorAll(".flow-delete-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openDeleteModal(
                btn.getAttribute("data-flow-id"),
                btn.getAttribute("data-name")
            );
        });
    });

    // EDIT
    document.querySelectorAll(".flow-edit-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openEditExtension(btn.getAttribute("data-flow-id"));
        });
    });

    // DROPDOWN
    document.querySelectorAll(".dropdown-toggle").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-flow-id");
            const type = btn.getAttribute("data-type");
            const dropdown = document.getElementById(`${type}-dropdown-${id}`);
            dropdown?.classList.toggle("hidden");
        });
    });

    // VARIABLE CHECKBOX
    document.querySelectorAll(".var-checkbox").forEach(cb => {
        cb.addEventListener("change", () => {
            const view = cb.closest(".content-view");
            if (!view) return;

            const id = view.getAttribute("data-view");

            if (cb.dataset.var === "description") {
                const section = document.getElementById(`desc-section-${id}`);
                cb.checked
                    ? section?.classList.remove("hidden")
                    : section?.classList.add("hidden");
            }

            updatePreviewForExtension(id);
        });
    });

    // DESCRIPTION COUNT
    document.querySelectorAll(".description-input").forEach(textarea => {
        const id = textarea.id.replace("desc-input-", "");
        const counter = document.getElementById(`char-count-${id}`);

        textarea.addEventListener("input", e => {
            if (counter) counter.textContent = e.target.value.length;
            updatePreviewForExtension(id);
        });
    });

    // PAYLOAD TOGGLE
    document.querySelectorAll(".payload-toggle").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-flow-id");
            const preview = document.getElementById(`preview-${id}`);
            const hidden = preview?.classList.toggle("hidden");

            btn.textContent = hidden ? "View payload..." : "Hide payload...";
            updatePreviewForExtension(id);
        });
    });

    // TRIGGER
    document.querySelectorAll(".flow-trigger-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            triggerFlow(btn.getAttribute("data-flow-id"));
        });
    });
}

// ------------------------------------------------------

async function triggerFlow(flowId) {
    chrome.storage.local.get(["readPageExtensions"], async (result) => {
        const flows = result.readPageExtensions || [];
        const flow = flows.find(f => f.id === flowId);
        if (!flow) return;

        const view = document.querySelector(`.content-view[data-view="${flowId}"]`);
        if (!view) return;

        const dataObj = {};

        // Phones
        if (view.querySelector('[data-var="phones"]')?.checked) {
            const selectedPhones = [];
            view.querySelectorAll('.phone-item:checked').forEach(cb => {
                selectedPhones.push(cb.value);
            });
            dataObj.phones = selectedPhones;
        }

        // Emails
        if (view.querySelector('[data-var="emails"]')?.checked) {
            const selectedEmails = [];
            view.querySelectorAll('.email-item:checked').forEach(cb => {
                selectedEmails.push(cb.value);
            });
            dataObj.emails = selectedEmails;
        }

        // Timestamps
        if (view.querySelector('[data-var="timestamps"]')?.checked) {
            dataObj.timestamps = new Date().toISOString();
        }

        // Description
        if (view.querySelector('[data-var="description"]')?.checked) {
            const descInput = document.getElementById(`desc-input-${flowId}`);
            if (descInput?.value.trim()) {
                dataObj.description = descInput.value.trim();
            }
        }

        const payload = {
            flowId: flow.id,
            flowName: flow.name,
            sentAt: new Date().toISOString(),
            data: dataObj
        };

        try {
            const res = await fetch(flow.webhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            res.ok
                ? showStatus(flowId, "success", "✅ Sent successfully")
                : showStatus(flowId, "error", `❌ ${res.status}`);

        } catch (err) {
            showStatus(flowId, "error", err.message);
        }
    });
}