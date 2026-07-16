// Open the side panel when the extension icon is clicked.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("setPanelBehavior:", err));
