let INACTIVITY_LIMIT_MINUTES = .1;

chrome.storage.local.get("inactivityLimit", (data) => {
  if (data.inactivityLimit) {
    INACTIVITY_LIMIT_MINUTES = data.inactivityLimit;
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.inactivityLimit) {
    INACTIVITY_LIMIT_MINUTES = changes.inactivityLimit.newValue;

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id && !tab.pinned && !tab.audible && !tab.active) {
          resetTimer(tab.id);
        }
      });
    });
  }
});
const tabTimers = {};

let lastActiveTabId = null;

chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (lastActiveTabId !== null && lastActiveTabId !== tabId) {
    resetTimer(lastActiveTabId);
  }

  clearTimeout(tabTimers[tabId]);

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;

    if (!tab.url || tab.url.startsWith('chrome://') || tab.url === 'about:blank') return;

    resetTimer(tabId);
  });

  lastActiveTabId = tabId;
});




chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab)=>{
    if(changeInfo.status === "complete"){
        resetTimer(tabId);
    }
});

chrome.tabs.onRemoved.addListener((tabId)=>{
    clearTimeout(tabTimers[tabId]);
    delete tabTimers[tabId];
});


function resetTimer(tabId) {

    clearTimeout(tabTimers[tabId]);

  chrome.storage.local.get("isExtensionActive", (data) => {

    if (data.isExtensionActive === false) {
      console.log("Extension paused, no timer for tab " + tabId);
      return;
    }

    const warningTime =
      Math.max(0, INACTIVITY_LIMIT_MINUTES * 60 - 10) * 1000;

    setTimeout(() => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        if (tab.active || tab.audible || tab.pinned) return;

        chrome.notifications.create(`warn-${tabId}`, {
          type: "basic",
          iconUrl: "icon.png",
          title: "Tab Inactive",
          message: `"${tab.title}" will close in 10 seconds due to inactivity.`,
          priority: 2
        });
      });
    }, warningTime);

    tabTimers[tabId] = setTimeout(() => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) return;
        if (tab.active || tab.audible || tab.pinned) return;

        chrome.tabs.remove(tabId, () =>
          console.log(`Tab ${tabId} was closed due to inactivity.`)
        );
      });
    }, INACTIVITY_LIMIT_MINUTES * 60 * 1000);
  });
}