// Open the side panel when the extension icon is clicked.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("setPanelBehavior:", err));

// Closing the side panel tears down its document instantly, so the cleanup in
// sidepanel.js never runs and the tab stays attached to the debugger – with
// Chrome's "being debugged" bar on it – until the tab is closed. The panel keeps
// a port open for exactly as long as it lives, which makes its disconnect the
// one reliable "panel is gone" signal; the tab it had attached is in session
// storage. An open port also keeps this worker alive, so the listener is still
// around when the disconnect fires.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "sidepanel") return;
  port.onDisconnect.addListener(async () => {
    const { attachedTabId } = await chrome.storage.session.get("attachedTabId");
    if (attachedTabId == null) return;
    await chrome.storage.session.remove("attachedTabId");
    try {
      await chrome.debugger.detach({ tabId: attachedTabId });
    } catch (e) {
      // Tab already closed, or the panel detached before it went away.
    }
  });
});
