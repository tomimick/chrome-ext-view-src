
/* Get and set configuration for this extension. */

/* Configuration is persisted to extension storage. */

// myconfig variable here mirrors chrome.storage
let myconfig = {};

// init myconfig, caller must wait for promise
export function init_config() {
    return new Promise(function(resolve) {
        chrome.storage.sync.get('conf').then(data => {

            if (!data.conf) {
                _init_config().then(() => resolve(null))
            } else {
                myconfig = data.conf;
                resolve(null);
            }
        });
    });
}

// get config value for key
export function get_config(key) {
    return myconfig[key];
}

// set whole config, c is an object
export function save_config(c) {
    //console.debug("save_config", c);

    myconfig = c;

    chrome.storage.sync.set({'conf':c});
}

// initialize config
function _init_config() {
    console.debug("_init_config");

    let c = {};
    c.beautify = true;
    c.tooltip  = true;
    c.isredcount = true;
    c.colorize = true;
    c.caching = false;
    c.onclick = false;
    c.linenum = true;
    c.hilight = ["//www.google-analytics.com",
                 "//ajax.googleapis.com",
                 "//connect.facebook.net",
                 "//widgets.twimg.com",
                 "//platform.twitter.com"];

    // read css from file
    return fetch("default.css")
        .then((response) => response.text())
        .then((text) => {
            c.css = text
            save_config(c);
        })
}

// should this url be hilighted?
export function config_is_hilighted(url) {
    var arr = get_config("hilight");

    for (var i = 0; i < arr.length; i++) {
    	if (arr[i] && url.match(arr[i]))
            return true;
    }
    return false;
}


// update icon badge with counts - max 4 chars!
// (here in config.js since no util.js yet exists)
export function update_badge(data) {

    var txt = "";
    var jscount = 0;
    if (data) {
        jscount = data.js.length;
//        var csscount = data.css.length;
        txt = ""+jscount;
    }

    chrome.action.setBadgeText({"text":txt});

    // colorize red?
    var isred = false;
    if (get_config("isredcount")) {
        var level = parseInt(get_config("redcount") || 50);
        isred = jscount >= level ? true : false;
    }

    var col = isred ? "#a00" : "#777";
    chrome.action.setBadgeBackgroundColor({"color":col});
}
