document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.sendMessage({ type: "GET_RESULT" }, (data) => {
    const phoneList = document.getElementById("phones");
    const emailList = document.getElementById("emails");

    phoneList.innerHTML = "";
    emailList.innerHTML = "";

    data.phones.forEach(phone => {
      const li = document.createElement("li");
      li.textContent = phone;
      phoneList.appendChild(li);
    });

    data.emails.forEach(email => {
      const li = document.createElement("li");
      li.textContent = email;
      emailList.appendChild(li);
    });
  });
});
