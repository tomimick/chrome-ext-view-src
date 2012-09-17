
/* Get and set configuration for this extension. */

/* Configuration is persisted to localstorage. */


// get config value for key
function get_config(key) {
//    console.debug("get_config", key);

    // is config initialized?
    if (localStorage.init == undefined)
        _init_config();

    var s = localStorage.c || '""';
    var c = JSON.parse(s);
    return c[key];
}

// set whole config, c is an object
function save_config(c) {
    console.debug("save_config", c);

    localStorage.c = JSON.stringify(c);

    localStorage.init = "1"; // init done
}

// initialize config
function _init_config() {
    console.debug("_init_config");

    var c = {};
    c.beautify = true;
    c.tooltip  = true;
    c.colorize = true;
    c.caching = false;
    c.hilight = ["//www.google-analytics.com",
                 "//ajax.googleapis.com",
                 "//connect.facebook.net",
                 "//widgets.twimg.com",
                 "//platform.twitter.com"];

    // css from file
    c.css = load_file("css.ini");

    save_config(c);
}

// should this url be hilighted?
function config_is_hilighted(url) {
    var arr = get_config("hilight");

    for (var i = 0; i < arr.length; i++) {
    	if (arr[i] && url.match(arr[i]))
            return true;
    }
    return false;
}

// load a local file
function load_file(fname) {
    try {
        xhr = new XMLHttpRequest();
        xhr.open("GET", fname, false);
        xhr.send(null);
        return xhr.responseText;
    } catch (e) {
        console.debug("ERR load_file");
        return "//ERR "+fname;
    }
}

// update icon badge with counts - max 4 chars!
// (here in config.js since no util.js yet exists)
function update_badge(data) {
    if (!get_config("tooltip"))
        return;

    var txt = "";
    if (data) {
        var jscount = data.js.length;
        var csscount = data.css.length;
        txt = ""+jscount+" "+csscount;
    }

    chrome.browserAction.setBadgeText({"text":txt});
}


/* insert JSON encoded reply here for debugging */
var debugdata = null;

