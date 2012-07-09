
/* background script:
   - updates badge count
   - starts the viewer tab
*/

String.prototype.startsWith = function(s) {
    return this.indexOf(s) === 0;
};

chrome.browserAction.onClicked.addListener(function(tab) {

    // open result tab
    var url = chrome.extension.getURL('maintab.html#'+tab.id);
    chrome.tabs.create({url:url});

// get debug data:
//    chrome.tabs.sendMessage(tab.id, {}, function(resp){
//        console.debug(JSON.stringify(resp));
//    });

//    chrome.tabs.executeScript(null, {file: "content.js"});
});


// initial page loaded notif from content script:
chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
//    console.log("data");

    update_badge(req);

    sendResponse({});
});


// tab changed - update badge
chrome.tabs.onActivated.addListener(function(tab) {
    var id = tab.tabId;
    console.log('active tab: '+id);

    if (!get_config("tooltip"))
        return;

    // must ask tab.url, not in tab yet!
    chrome.tabs.get(id, function(tab) {
        if (tab.url && !tab.url.startsWith("chrome")) {
            chrome.tabs.sendMessage(id, {}, function(reply){
                update_badge(reply);
            });
        } else {
            // no reply from content script
            chrome.browserAction.setBadgeText({"text":""});
        }
    });
});

console.log('bg loaded');

