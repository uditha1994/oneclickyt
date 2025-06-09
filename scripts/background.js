// Background script (minimal for this extension)
chrome.runtime.onInstalled.addListener(() => {
    console.log('OneClickYT installed');
  });
  
  // Context menu for quick access
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'oneclickyt-menu',
      title: 'OneClickYT',
      contexts: ['video']
    });
  }
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'oneclickyt-menu' && tab.url.includes('youtube.com')) {
      chrome.tabs.sendMessage(tab.id, {action: 'showEnhancer'});
    }
  });