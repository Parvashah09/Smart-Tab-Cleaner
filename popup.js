document.addEventListener("DOMContentLoaded", () => {
  const minutesInput = document.getElementById("minutes");
  const secondsInput = document.getElementById("seconds");
  const saveButton = document.getElementById("save");
  const toggleCheckbox = document.getElementById("toggle-active");
  const addSiteBtn = document.getElementById("addSiteBtn");
  const ignoreList = document.getElementById("ignoreList");

  let ignoreDomains = [];

  // Load settings initially
  chrome.storage.local.get(["isExtensionActive", "inactivityLimit", "ignoreDomains"], (data) => {
    const limit = data.inactivityLimit || 0.1;
    const totalSeconds = limit * 60;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    minutesInput.value = minutes;
    secondsInput.value = seconds;
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
    const minutes = parseInt(minutesInput.value, 10) || 0;
    const seconds = parseInt(secondsInput.value, 10) || 0;

    const error = document.getElementById("timeoutError");
    const setTime = document.getElementById("setTime");
    if (minutes === 0 && seconds === 0) {
      error.style.display = "block"
      return;
    }
    error.style.display = "none"
    const totalLimitInMinutes = (minutes * 60 + seconds) / 60;
    chrome.storage.local.set({ inactivityLimit: totalLimitInMinutes });
    chrome.runtime.sendMessage({ action: "resetAllTabTimers" });
    if(minutes === 0){
      if(seconds === 1) setTime.innerHTML = `${seconds} second saved as inactivity time.`
      else setTime.innerHTML = `${seconds} seconds saved as inactivity time.`
    }
    else if(minutes === 1){
      if(seconds === 1) setTime.innerHTML = `${minutes} minute ${seconds} second saved as inactivity time.`
      else setTime.innerHTML = `${minutes} minute ${seconds} seconds saved as inactivity time.`
    }
    else{
      if(seconds === 1) setTime.innerHTML = `${minutes} minutes ${seconds} second saved as inactivity time.`
      else setTime.innerHTML = `${minutes} minutes ${seconds} seconds saved as inactivity time.`
    }
    setTime.style.display = "block";
    function hidediv(){
      setTime.style.display = "none";
    }
    setTimeout(hidediv, 2000);
  });
});