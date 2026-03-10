// utils/utilService.js

// Cache holder (must be shared)
let lastPageData = {
  phones: { all: [], unique: [] },
  emails: { all: [], unique: [] },
  pageUrl: ''
};

export function setLastPageData(data) {
  lastPageData = data || {
    phones: { all: [], unique: [] },
    emails: { all: [], unique: [] },
    pageUrl: ''
  };
}

export function getLastPageData() {
  return lastPageData;
}

// Extract visible data
export function getTemporaryData() {
  const phoneList = document.getElementById("phones");
  const emailList = document.getElementById("emails");

  if (phoneList || emailList) {
    const phones = { all: [], unique: [] };
    const emails = { all: [], unique: [] };

    phoneList?.querySelectorAll("li").forEach(li => {
      const text = li.textContent.trim();
      if (text && text !== "No phones found") phones.unique.push(text);
    });

    emailList?.querySelectorAll("li").forEach(li => {
      const text = li.textContent.trim();
      if (text && text !== "No emails found") emails.unique.push(text);
    });

    return {
      phones: { ...lastPageData.phones, unique: phones.unique },
      emails: { ...lastPageData.emails, unique: emails.unique },
      pageUrl: lastPageData.pageUrl
    };
  }

  return lastPageData;
}

// Display page data
export function displayData(data) {
  const phoneList = document.getElementById("phones");
  const emailList = document.getElementById("emails");

  if (!phoneList || !emailList) return;

  phoneList.innerHTML = "";
  emailList.innerHTML = "";

  if (data?.phones?.unique?.length) {
    data.phones.unique.forEach(phone => {
      const li = document.createElement("li");
      li.textContent = phone;
      phoneList.appendChild(li);
    });
  } else {
    phoneList.innerHTML = "<li>No phones found</li>";
  }

  if (data?.emails?.unique?.length) {
    data.emails.unique.forEach(email => {
      const li = document.createElement("li");
      li.textContent = email;
      emailList.appendChild(li);
    });
  } else {
    emailList.innerHTML = "<li>No emails found</li>";
  }
}

export function displayEmptyState() {
  const phoneList = document.getElementById("phones");
  const emailList = document.getElementById("emails");

  if (phoneList) phoneList.innerHTML = "<li>No phones found</li>";
  if (emailList) emailList.innerHTML = "<li>No emails found</li>";
}

// Trigger status UI
export function showStatus(extId, type, message) {
  const statusEl = document.getElementById(`status-${extId}`);
  if (!statusEl) return;

  statusEl.className = `trigger-status ${type}`;
  statusEl.textContent = message;

  setTimeout(() => {
    statusEl.classList.remove("success", "error");
  }, 4000);
}

export function getExtensionById(extId, extensions) {
  if (!Array.isArray(extensions)) return null;
  return extensions.find(ext => ext.id === extId) || null;
}