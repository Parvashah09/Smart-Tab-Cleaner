// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const timeoutInput = document.getElementById("timeout");
  const saveButton = document.getElementById("save");

const toggleCheckbox = document.getElementById("toggle-active");

chrome.storage.local.get(["isExtensionActive", "inactivityLimit"], (data) => {
  if (data.inactivityLimit) {
    timeoutInput.value = data.inactivityLimit;
  }
  toggleCheckbox.checked = data.isExtensionActive !== false; // default is true
});

toggleCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({ isExtensionActive: toggleCheckbox.checked });
});


saveButton.addEventListener("click", () => {
  const newLimit = parseFloat(timeoutInput.value);

  chrome.storage.local.set({ inactivityLimit: newLimit }, () => {
    chrome.storage.local.get("isExtensionActive", (data) => {
        if (data.isExtensionActive !== false) {
            if(!isNaN(newLimit) && newLimit > 0)
                alert("Saved! Tabs will auto-close after " + newLimit + " minute(s).");
            else alert("Please enter a valid value!")
      } 
      else
        alert("Saved! But the extension is currently paused.");
    });
  });
});
});