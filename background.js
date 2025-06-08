let INACTIVITY_LIMIT_MINUTES = 0.1;

chrome.storage.local.get(["inactivityLimit"], (data) => {
  if (data.inactivityLimit) {
    INACTIVITY_LIMIT_MINUTES = data.inactivityLimit;
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.inactivityLimit) {
    INACTIVITY_LIMIT_MINUTES = changes.inactivityLimit.newValue;
  }

  if (changes.isExtensionActive) {
    if (changes.isExtensionActive.newValue === false) {
      for (const tabId in tabTimers) {
        clearTimeout(tabTimers[tabId]);
        clearTimeout(warningTimers[tabId]);
      }
      Object.keys(tabTimers).forEach(k => delete tabTimers[k]);
      Object.keys(warningTimers).forEach(k => delete warningTimers[k]);
      Object.keys(inactivityStartTimes).forEach(k => delete inactivityStartTimes[k]);
      console.log("Extension paused: all timers cleared.");
    } else {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id && !tab.pinned && !tab.audible && !tab.active && tab.url) {
            const domain = new URL(tab.url).hostname.replace(/^www\./, "");
            chrome.storage.local.get("ignoreDomains", (data) => {
              if (data.ignoreDomains?.includes(domain)) return;
              inactivityStartTimes[tab.id] = Date.now();
              resetTimer(tab.id);
            });
          }
        });
      });
      console.log("Extension resumed: timers restarted.");
    }
  }

  if (changes.ignoreDomains) {
    const newIgnoreDomains = (changes.ignoreDomains.newValue || []).map(d => d.replace(/^www\./, ""));

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (!tab.url) return;

        const domain = new URL(tab.url).hostname.replace(/^www\./, "");
        if (!newIgnoreDomains.includes(domain)) {
          clearTimeout(tabTimers[tab.id]);
          clearTimeout(warningTimers[tab.id]);
          delete inactivityStartTimes[tab.id];

          inactivityStartTimes[tab.id] = Date.now();
          resetTimer(tab.id);
          console.log(`Timers reset for tab ${tab.id} (${domain}) due to updated ignoreDomains.`);
        }
      });
    });
  }
});

const tabTimers = {};
const warningTimers = {};
const inactivityStartTimes = {};
let lastActiveTabId = null;

chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (lastActiveTabId !== null && lastActiveTabId !== tabId) {
    delete inactivityStartTimes[lastActiveTabId];
    resetTimer(lastActiveTabId);
  }

  clearTimeout(tabTimers[tabId]);
  clearTimeout(warningTimers[tabId]);
  delete inactivityStartTimes[tabId];

  lastActiveTabId = tabId;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    clearTimeout(tabTimers[tabId]);
    clearTimeout(warningTimers[tabId]);
    delete inactivityStartTimes[tabId];
    resetTimer(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTimeout(tabTimers[tabId]);
  clearTimeout(warningTimers[tabId]);
  delete tabTimers[tabId];
  delete warningTimers[tabId];
  delete inactivityStartTimes[tabId];
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith("warn-") && buttonIndex === 0) {
    const tabId = parseInt(notificationId.split("-")[1]);
    if (tabId) {
      clearTimeout(tabTimers[tabId]);
      clearTimeout(warningTimers[tabId]);
      delete inactivityStartTimes[tabId];

      inactivityStartTimes[tabId] = Date.now();
      resetTimer(tabId);
      chrome.notifications.clear(notificationId);
      console.log(`Tab ${tabId} warning overridden, timer reset.`);
    }
  }
});

function resetTimer(tabId) {
  clearTimeout(tabTimers[tabId]);
  clearTimeout(warningTimers[tabId]);

  chrome.storage.local.get(["isExtensionActive", "ignoreDomains"], (data) => {
    if (data.isExtensionActive === false) {
      console.log(`Extension paused, no timer for tab ${tabId}`);
      return;
    }

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab || !tab.url) return;

      const url = tab.url;
      const isSystemTab = url.startsWith("chrome://") || url.startsWith("chrome-devtools://");
      if (isSystemTab) return;

      const domain = new URL(url).hostname.replace(/^www\./, "");
      if (data.ignoreDomains?.includes(domain)) {
        console.log(`Ignoring tab ${tabId} with domain: ${domain}`);
        return;
      }

      const now = Date.now();
      if (!inactivityStartTimes[tabId]) {
        inactivityStartTimes[tabId] = now;
      }

      const elapsedMs = now - inactivityStartTimes[tabId];
      const inactivityLimitMs = INACTIVITY_LIMIT_MINUTES * 60 * 1000;

      if (elapsedMs >= inactivityLimitMs) {
        if (!tab.active && !tab.audible && !tab.pinned) {
          chrome.tabs.remove(tabId, () => {
            console.log(`Tab ${tabId} closed due to inactivity.`);
            delete inactivityStartTimes[tabId];
          });
        }
        return;
      }

      const remainingMs = inactivityLimitMs - elapsedMs;
      const warningTimeMs = Math.max(0, remainingMs - 10000);

      warningTimers[tabId] = setTimeout(() => {
        chrome.storage.local.get("isExtensionActive", (data) => {
          if (data.isExtensionActive === false) return;
          const remainingSeconds = Math.ceil(remainingMs / 1000);
          showWarning(tabId, remainingSeconds >= 10 ? 10 : remainingSeconds);
        });
      }, warningTimeMs);

      tabTimers[tabId] = setTimeout(() => {
        chrome.storage.local.get("isExtensionActive", (data) => {
          if (data.isExtensionActive === false) return;

          chrome.tabs.get(tabId, (t) => {
            if (chrome.runtime.lastError || !t) return;
            if (t.active || t.audible || t.pinned) {
              delete inactivityStartTimes[tabId];
              return;
            }

            chrome.tabs.remove(tabId, () => {
              console.log(`Tab ${tabId} closed after full timeout.`);
              delete inactivityStartTimes[tabId];
            });
          });
        });
      }, remainingMs);
    });
  });
}

function showWarning(tabId, remainingSeconds) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    if (tab.active || tab.audible || tab.pinned) return;

    chrome.notifications.clear(`warn-${tabId}`, () => {
      chrome.notifications.create(`warn-${tabId}`, {
        type: "basic",
        iconUrl: "icon.png",
        title: "Tab Inactive",
        message: `"${tab.title}" will close in ${remainingSeconds} seconds due to inactivity.`,
        buttons: [{ title: "Don't close now" }],
        priority: 2,
      });
    });
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "resetTimer" && typeof message.tabId === "number") {
    resetTimer(message.tabId);
  }
  if (message.action === "stopTimer" && typeof message.tabId === "number") {
    clearTimeout(tabTimers[message.tabId]);
    clearTimeout(warningTimers[message.tabId]);
    delete tabTimers[message.tabId];
    delete warningTimers[message.tabId];
    delete inactivityStartTimes[message.tabId];
    console.log(`Stopped tracking tab ${message.tabId} due to ignore list.`);
  }
});
