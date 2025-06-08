document.addEventListener("DOMContentLoaded", () => {
  const timeoutInput = document.getElementById("timeout");
  const saveButton = document.getElementById("save");
  const toggleCheckbox = document.getElementById("toggle-active");
  const addSiteBtn = document.getElementById("addSiteBtn");
  const ignoreList = document.getElementById("ignoreList");

  let ignoreDomains = [];

  chrome.storage.local.get(["isExtensionActive", "inactivityLimit", "ignoreDomains"], (data) => {
    timeoutInput.value = data.inactivityLimit || "";
    toggleCheckbox.checked = data.isExtensionActive !== false;
    ignoreDomains = (data.ignoreDomains || []).map(d => normalizeDomain(d));
    renderIgnoreList(ignoreDomains);
  });

  addSiteBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].url) return;

      const domain = normalizeDomain(new URL(tabs[0].url).hostname);

      if (!ignoreDomains.includes(domain)) {
        ignoreDomains.push(domain);
        renderIgnoreList(ignoreDomains);
      }
    });
  });

  function normalizeDomain(domain) {
    return domain.replace(/^www\./, "");
  }

  function renderIgnoreList(domains) {
    ignoreList.innerHTML = "";
    domains.forEach((domain) => {
      const li = document.createElement("li");
      li.textContent = domain;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "X";
      removeBtn.addEventListener("click", () => {
        ignoreDomains = ignoreDomains.filter(d => d !== domain);
        renderIgnoreList(ignoreDomains);
      });

      li.appendChild(removeBtn);
      ignoreList.appendChild(li);
    });
  }

  saveButton.addEventListener("click", () => {
    const newLimit = parseFloat(timeoutInput.value);
    const isExtensionActive = toggleCheckbox.checked;

    if (isNaN(newLimit) || newLimit <= 0) {
      alert("Please enter a valid timeout greater than 0.");
      return;
    }

    chrome.storage.local.get("ignoreDomains", (data) => {
      const previousIgnoreList = (data.ignoreDomains || []).map(d => normalizeDomain(d));

      chrome.storage.local.set({
        inactivityLimit: newLimit,
        isExtensionActive,
        ignoreDomains,
      }, () => {
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (!tab.url) return;
            const domain = normalizeDomain(new URL(tab.url).hostname);

            const wasIgnored = previousIgnoreList.includes(domain);
            const isNowIgnored = ignoreDomains.includes(domain);

            if (wasIgnored && !isNowIgnored) {
              chrome.runtime.sendMessage({ action: "resetTimer", tabId: tab.id });
            } else if (!wasIgnored && isNowIgnored) {
              chrome.runtime.sendMessage({ action: "stopTimer", tabId: tab.id });
            }
          });
        });

        alert(isExtensionActive
          ? `Saved! Tabs will auto-close after ${newLimit} minute(s).`
          : "Saved! But the extension is currently paused.");
      });
    });
  });
});
