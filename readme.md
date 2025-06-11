# TabSweeper - Chrome Extension

Smart Tab Cleaner is a Chrome extension designed to automatically close inactive tabs after a user-defined time interval. It helps keep your browser fast and clutter-free by closing tabs that haven't been used recently - without interrupting active work or media playback.

## Overview

This Chrome extension offers a convenient way to manage inactive tabs without affecting important ones. The extension allows users to define inactivity duration and includes several safeties to avoid closing important tabs.

## Features

### Core Functionality

- Automatically closes inactive tabs based on a customizable timeout
- Visual warning popup before closing a tab with an option of not closing the tab for now.
- Timer precision up to seconds (not just minutes)

### Smart Filtering

- **Pinned tabs** are never closed
- **Audible tabs** (e.g., playing audio/video) are preserved
- **Ignorelist** support - specify URLs that should never be closed

### User Controls

- Toggle switch to enable/disable the cleaner anytime
- Interface to set timeout values (minutes and seconds)
- Add or remove URLs from the ignorelist
- Instant update of settings saved using Chrome Storage

### Technical Design

- Uses Chrome Extensions APIs: `tabs`, `storage`, `alarms`, `activeTab`
- Background script handles tab monitoring and timer logic
- Popup interface allows user-friendly configuration

## Usage

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer Mode** (top-right corner).
4. Click **Load Unpacked** and select the extension folder.
5. Use the popup UI to set the inactivity timer and manage ignorelist.
6. The extension will automatically close inactive tabs that:
   - Are not Chrome internal pages
   - Are not pinned
   - Are not playing audio
   - Are not in the ignorelist
   - Have exceeded the set timeout

## 📁 File Structure

```bash
smart-tab-cleaner/
├── background.js        # Tab activity tracking, logic for timer and tab closing
├── popup.html           # UI for settings input
├── popup.js             # JS logic for UI interactions and storage
├── manifest.json        # Chrome extension metadata and permissions
├── icons/               # Folder for extension icons
└── styles.css           # Optional styling for popup UI
```

## Ignorelist

The ignorelist lets you define specific URLs to exclude from being auto-closed. For example:
**youtube.com** or
**mail.google.com**

These domains will never be affected by the cleaner, regardless of inactivity.
The list includes the entire URL, so if you have added a tab with a particular video playing on youtube, the extension will ignore only that tab and not all the tabs with the domain youtube.com.

## Configuration

Settings are stored locally using Chrome's `storage.local` API:

- `inactivityLimit` - time in minutes/seconds
- `ignoreList` - list of URLs to ignore
- `isCleanerEnabled` - toggle for active/inactive state

Settings are retained across browser sessions.

## Future Improvements

- Auto-sync settings across devices using Chrome sync storage
- Statistics dashboard for closed tabs
- Dark mode for popup UI

## Dependencies

- Google Chrome
- No third-party libraries required (uses only native JS + Chrome APIs)

## Author

**Parva Shah**  
[GitHub](https://github.com/Parvashah09)

## Note

Smart Tab Cleaner is designed for personal use and is not affiliated with or endorsed by Google. It's open-source and intended for educational and productivity purposes.