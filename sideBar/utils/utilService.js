// utils/utilService.js

// Cache holder (must be shared)
let lastPageData = { phones: [], emails: [], pageUrl: '' };

export function setLastPageData(data) {
  lastPageData = data || { phones: [], emails: [], pageUrl: '' };
}

export function getLastPageData() {
  return lastPageData;
}

// Extract visible data
export function getTemporaryData() {
  const phoneList = document.getElementById("phones");
  const emailList = document.getElementById("emails");

  if (phoneList || emailList) {
    const phones = [];
    const emails = [];

    phoneList?.querySelectorAll("li").forEach(li => {
      const text = li.textContent.trim();
      if (text && text !== "No phones found") phones.push(text);
    });

    emailList?.querySelectorAll("li").forEach(li => {
      const text = li.textContent.trim();
      if (text && text !== "No emails found") emails.push(text);
    });

    return { phones, emails, pageUrl: lastPageData.pageUrl };
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

  if (data?.phones?.length) {
    data.phones.forEach(phone => {
      const li = document.createElement("li");
      li.textContent = phone;
      phoneList.appendChild(li);
    });
  } else {
    phoneList.innerHTML = "<li>No phones found</li>";
  }

  if (data?.emails?.length) {
    data.emails.forEach(email => {
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