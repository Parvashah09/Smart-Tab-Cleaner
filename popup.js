document.addEventListener("DOMContentLoaded", () => {
  const timeoutInput = document.getElementById("timeout");
  const saveButton = document.getElementById("save");
  const toggleCheckbox = document.getElementById("toggle-active");
  const addSiteBtn = document.getElementById("addSiteBtn");
  const ignoreList = document.getElementById("ignoreList");

  let ignoreDomains = [];

  // Load settings initially
  chrome.storage.local.get(["isExtensionActive", "inactivityLimit", "ignoreDomains"], (data) => {
    timeoutInput.value = data.inactivityLimit || "";
    toggleCheckbox.checked = data.isExtensionActive !== false;
    ignoreDomains = data.ignoreDomains || [];
    renderIgnoreList(ignoreDomains);
  });

  function renderIgnoreList(list) {
  ignoreList.innerHTML = "";
  list.forEach(({ url, title }) => {
    const li = document.createElement("li");
    li.classList.add("ignore-item");  // add class for styling

    let domain;
    try {
      domain = new URL(url).origin;
    } catch {
      domain = "";
    }

    const favicon = document.createElement("img");
    favicon.classList.add("favicon");
    favicon.src = domain ? `${domain}/favicon.ico` : "";
    favicon.alt = "";
    
    const titleSpan = document.createElement("span");
    titleSpan.classList.add("ignore-title");
    titleSpan.textContent = title || url;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "X";
    removeBtn.classList.add("remove-btn");
    removeBtn.addEventListener("click", () => {
      ignoreDomains = ignoreDomains.filter(item => item.url !== url);
      updateIgnoreDomains();
    });

    li.appendChild(favicon);
    li.appendChild(titleSpan);
    li.appendChild(removeBtn);
    ignoreList.appendChild(li);
  });
}


function updateIgnoreDomains() {
  chrome.storage.local.get("ignoreDomains", (data) => {
    const previous = data.ignoreDomains || [];

    chrome.storage.local.set({ ignoreDomains }, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (!tab.url) return;

          const wasIgnored = previous.some(item => item.url === tab.url);
          const isNowIgnored = ignoreDomains.some(item => item.url === tab.url);

          if (wasIgnored && !isNowIgnored) {
            chrome.runtime.sendMessage({ action: "resetTimer", tabId: tab.id });
          } else if (!wasIgnored && isNowIgnored) {
            chrome.runtime.sendMessage({ action: "stopTimer", tabId: tab.id });
          }
        });
      });

      renderIgnoreList(ignoreDomains);
    });
  });
}


  addSiteBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length || !tabs[0].url) return;

    const url = tabs[0].url;
    const title = tabs[0].title;

    // Check if URL already exists
    if (!ignoreDomains.some(item => item.url === url)) {
      ignoreDomains.push({ url, title });
      updateIgnoreDomains();
    }
  });
});


  toggleCheckbox.addEventListener("change", () => {
    const isExtensionActive = toggleCheckbox.checked;
    chrome.storage.local.set({ isExtensionActive });
  });

  saveButton.addEventListener("click", () => {
    const newLimit = parseFloat(timeoutInput.value);
    if (isNaN(newLimit) || newLimit <= 0) {
      alert("Please enter a valid timeout value greater than 0.");
      return;
    }
    chrome.storage.local.set({ inactivityLimit: newLimit });
  });
});
//This is working properly!!!