
/* background script:
   - updates badge count
   - starts the viewer tab
*/

chrome.browserAction.onClicked.addListener(function(tab) {

    // start viewer tab
    var url = chrome.extension.getURL('maintab.html#'+tab.id);
    chrome.tabs.create({url:url});
});

function tab_updated(tab) {
    console.log('active tab: '+tab.id);

    if (!get_config("tooltip"))
        return;

    // ask counts from content script
    chrome.tabs.sendMessage(tab.id, {"badge":1}, function(reply){
        update_badge(reply);
    });
}

// tab activity - update badge
chrome.tabs.onActivated.addListener(function(info){
    chrome.tabs.get(info.tabId, function(tab) {
        tab_updated(tab);
    });
});
chrome.tabs.onUpdated.addListener(function(tabid, info, tab){
    if (info.status == "complete")
        tab_updated(tab);
});

console.log('bg loaded');

