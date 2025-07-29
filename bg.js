
/* background script:
   - updates badge count
   - starts the viewer tab
*/

import { update_badge, init_config } from "./config.js";

chrome.action.onClicked.addListener(function(tab) {

    // start viewer tab
    var url = chrome.runtime.getURL('maintab.html#'+tab.id);
    chrome.tabs.create({url:url});
});

function tab_updated(tabid) {
    console.log('active tab: '+tabid);

    if (!tabid)
        return;

    // ask counts from content script
    chrome.tabs.sendMessage(tabid, {"badge":1}, function(reply){
        if (chrome.runtime.lastError) {
            // likely no receiving end yet, fine
        } else {
            update_badge(reply);
        }
    });
}

// tab activity - update badge
chrome.tabs.onActivated.addListener(function(info){
    chrome.tabs.get(info.tabId, function(tab) {
        if (tab && tab.id)
            tab_updated(tab.id);
    });
});
chrome.tabs.onUpdated.addListener(function(tabid, info, tab){
    if (info.status == "complete" && tabid)
        tab_updated(tabid);
});

init_config();

console.log('bg loaded');

