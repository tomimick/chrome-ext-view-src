
/* content script - loaded with all pages */

// mark initial nodes
var data = build_response(get_js(true), get_css(true));
// 1.0.1: no need to update counts from here
//chrome.extension.sendRequest(data);


// bg calls us, asking data
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    // count scripts, css
    var data = build_response(get_js(), get_css());

    // get html too
    data.html = [{"inline":get_dom(), "count":document.getElementsByTagName('*').length}];

    sendResponse(data);
});

// builds response object
function build_response(js, css) {
    var data = {"url":location.href, "js":js, "css":css };
    return data;
}

// get body as string
function get_dom() {
    return document.documentElement.outerHTML;
}

// enumerate JS scripts in page
function get_js(mark_initial) {
    var a = [];
    var i, node;

    var nodes = document.getElementsByTagName("script");
    for(i=0; i<nodes.length; i++){
        node = nodes[i];
        if (!node.type || node.type == "text/javascript")
            pick_node(node, a, mark_initial);
    }
    return a;
}

// enumerate CSS in page
function get_css(mark_initial) {
    var a = [];
    var i, node;

    /* XXX: get links and styles in order? */

    var styles = document.getElementsByTagName("link");
    for(i=0; i<styles.length; i++){
        node = styles[i];
        if (node.rel == "stylesheet" || node.type == "text/css")
            pick_node(node, a, mark_initial);
    }

    styles = document.getElementsByTagName("style");
    for(i=0; i<styles.length; i++){
        node = styles[i];
        pick_node(node, a, mark_initial);
    }

    return a;
}

// picks element's src-url or inline content
function pick_node(node, array, mark_initial) {
    // skip extension scripts
    var src = node.href || node.src;
    if (src && startsWith(""+src, "chrome-extension:"))
        return;

    var item;
    if (src)
        item = {"src":src};
    else
        item = {"inline":node.innerText};

    // mark initially loaded elems
    if (mark_initial)
        node._xinit = true;

    if (!node._xinit)
        item["dynamic"] = true;

    array.push(item);
}

function startsWith(s, sub) {
    return s.indexOf(sub) === 0;
}

