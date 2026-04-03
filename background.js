// Enable opening the side panel by clicking the extension's action icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Log when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Mini-IDE extension installed');
});
