
/* content script - loaded with all pages
 * (plain js for speed, no zepto.js here)
 * */

// mark initial nodes (not injected)
var data = build_response(null);


// bg calls us, asking data
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // count html, scripts, css
    var data = build_response(request);
    sendResponse(data);
});

// builds response object
function build_response(request) {
    var arr_html = [], arr_js = [], arr_css = [];

    var is_initial = !request;

    try {
        get_js(arr_js, arr_html, is_initial, request ? request.showonclick : false);
        get_css(arr_css, is_initial);

        var response = {"url":location.href, "js":arr_js, "css":arr_css };

        // get html body + template scripts
        if (request && !request.badge) {
            response.html = [{"inline":get_dom(),
                "count":document.getElementsByTagName('*').length}];
                for (var i = 0; i < arr_html.length ; i++) {
                    response.html.push(arr_html[i]);
                }
        }
    } catch (e) {
        return {"err": ""+e};
    }

    return response;
}

// get body as string
function get_dom() {
//    return document.documentElement.outerHTML;

    // truncate long scripts+styles in HTML, they are listed separately

    var dupNode = document.documentElement.cloneNode(true);

    function truncate(nodes) {
        var MAXLEN = 400;
        var i, s;
        for(i=0; i<nodes.length; i++){
            s = nodes[i].innerHTML;
            if (s && s.length > MAXLEN)
                nodes[i].innerHTML = s.substr(0, MAXLEN) + " truncated "+s.length+"bytes...";
        }
    }

    truncate(dupNode.getElementsByTagName("script"));
    truncate(dupNode.getElementsByTagName("style"));

    return dupNode.outerHTML;
}

// enumerate JS scripts in page
// returns 2 arrays: js and html content
function get_js(a, a_html, mark_initial, show_onclick) {
    var i, node;

    var nodes = document.getElementsByTagName("script");
    for(i=0; i<nodes.length; i++){
        node = nodes[i];
        if (!node.type || node.type == "text/javascript")
            pick_node(node, a, mark_initial);
        else if (node.type == "text/template"
            || node.type == "text/x-template"
            || node.type == "text/html")
            pick_node(node, a_html, mark_initial);
    }
    // inline onclick-handlers
    if (show_onclick) {
        nodes = document.getElementsByTagName("*");
        for(i=0; i<nodes.length; i++){
            node = nodes[i];
            if (node.getAttribute("onclick")) {
                var item = pick_node(node, a, mark_initial);
                var s = "/* " + node.tagName.toLowerCase();
                if (node.id)
                    s += "#"+node.id;
                if (node.className)
                    s += "."+node.className;
                s += ".onclick = */\n";
                item.inline = s + node.getAttribute("onclick");
                item.src = null;
                item.dynamic = false;
                item.onclick = true;
            }
        }
    }
}

// enumerate CSS in page
function get_css(a, mark_initial) {
    var i;

	var csslist = document.styleSheets;
	for(i = 0; i < csslist.length; i++){
		var css = csslist[i];

		pick_node(css.ownerNode, a, mark_initial);

		parse_cssrules(css, a, mark_initial, 0);
	}

/*
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
    }*/
}

// parse "@import file.css" declarations in given css file
function parse_cssrules(cssNode, a, mark_initial, depth) {
	if (depth > 10 || !cssNode)
        return;

    var rules = cssNode.cssRules;
    if (rules) {
        for (var i =0; i < rules.length; i++) {
            var rule = rules[i];

            if (rule instanceof CSSImportRule) {
                var s = rule.styleSheet;
                var item = pick_node({'href':s.href}, a, mark_initial);
                item.imported = true;
                parse_cssrules(rule.styleSheet, a, mark_initial, depth+1);
            }
        }
    }
}

// picks element's src-url or inline content
function pick_node(node, array, mark_initial) {
    // skip extension scripts
    var src = node.href || node.src;
    if (src && startsWith(""+src, "chrome-extension:"))
        return null;

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
    return item;
}

function startsWith(s, sub) {
    return s.indexOf(sub) === 0;
}

