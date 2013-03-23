
/* js for source viewer tab */

// script+css nodes of DOM provided by content script are stored here
var data = {};


function init() {

    // call content script: ask js+css nodes
    if (window.chrome && chrome.tabs) {
        var tabid = location.hash.slice(1);
        tabid = parseInt(tabid);

        // ask to return onclick handlers too?
        var show_onclick = get_config("onclick");

        chrome.tabs.sendMessage(tabid, {"showonclick":show_onclick}, data_received);
    } else {
        // while developing
        data_received(debugdata);
    }

    // view sources
    $("ol").on("click", "a", function(){
        var a = $(this);
        if (a.attr("title"))
            return true; // html viewsource link

        var li = a.closest("li");
        $("ol>li").removeClass("sel");
        li.addClass("sel");

        show_src(li);
        return false;
    });

    // show options
    $("#options").click(function(){
        chrome.tabs.create({url:"options.html"});
        return false;
    });

    // toggle beautify
    $("#beautify").click(function(){
        $(this).toggleClass("sel");
        show_src();
        return false;
    });
    $(window).keydown(function(e) {
//        console.debug("d1", e.keyCode, e);
        if (e.keyCode == 66) {
            $("#beautify").trigger("click");
        }
    });

    // inject custom css
    var css = get_config("css");
    if (css)
        $("body").append("<style>"+css+"</style>");

    // set initial beautify mode
    if (get_config("beautify")) {
        $("#beautify").addClass("sel");
    }

}

// init phase2, after tree populated
function init2() {
    setTimeout(function() {
        // show html node initially
        $("#htmllist li >a").trigger("click");
    }, 10);
}


// shows the source in given <li>
function show_src(li) {
    if (!li) {
        // find active li
        li = $("li[class~=sel]");
        if (!li)
            return;
    }

    var index = li.index();

    $("body").removeClass("err");

    if (index < 0)
        return;

    $("#src").html("<code></code>");

    // js or css array?
    var arr;
    var ol = li.parent();
    var cls = "";
    if (ol.get(0).id == "jslist") {
        arr = data.js;
        cls = "language-javascript brush:js";
    } else if (ol.get(0).id == "htmllist") {
        arr = data.html;
        cls = "language-html brush:html";
    } else {
        arr = data.css;
        cls = "language-css brush:css";
    }

    // provide language hint for prettify
    //$("#src>code").removeClass("xml language-javascript language-html language-css").addClass(cls);
    
    $("#src>code").addClass(cls);

    var item = arr[index];

    if (item.src) {
        // external node
        if (item.data != undefined)
            build_item(item, cls);
        else
            load_data(item);

        $("#fname").text(item.src);
    } else {
        // inline node
        build_item(item, cls);

        $("#fname").text(item.count? data.url : item.onclick ? "ONCLICK" : "INLINE");
    }

}

// shows the sources of a loaded node
function build_item(item, lang) {
    var s = item.data || item.inline;

    // prettify?
    if ($("#beautify").hasClass("sel")) {
        if (lang.indexOf( "language-css")!=-1)
            s = css_beautify(s);
        else if (lang.indexOf("language-html")!=-1)
            s = style_html(s);
        else
            s = js_beautify(s);
    }

    $("#src>code").text(s);

    // colorize?
    if (get_config("colorize")) {
        $("body").addClass("wait");

        $("pre").hide(); // makes prettify faster

        setTimeout(function(){
//            prettyPrint();

            //hljs.highlightBlock($("pre>code").get(0));
            SyntaxHighlighter.config.tagName='code'
            //SyntaxHighlighter.highlight($("pre>code").get(0));
			SyntaxHighlighter.highlight();
            $("body").removeClass("wait");
            $("pre").show();
        }, 10);
    }
}

// updates length info of a loaded node
function update_li_text(item, header) {
    var s = "";
    if (item.src) {
        if (item.data != undefined)
            s = numberWithCommas(item.data.length)+" bytes";
    } else {
        s = numberWithCommas(item.inline.length)+" bytes";
    }

    if (item.dynamic)
        s += " <span class='dynamic'>INJECTED</span>";

    if (item.count) {
        // single html item
        s += ", "+item.count+ " nodes ";
        s += "<a href='view-source:"+data.url+"' target='_blank' title='View sources before Javascript runs'>View&nbsp;original</a>";
    }

    if (header) {
        s += " <span class='cache'> "+header+"</span>";
    }

    item.li.find("p").html(s);
}

// loads a source file
function load_data(item) {
//    console.debug("load "+item.src);

    $("body").addClass("wait");

    var xhr = new XMLHttpRequest();
    xhr.open('GET', item.src, true);

    xhr.onreadystatechange = function(event) {
        if (xhr.readyState == 4) {
            $("body").removeClass("wait");

            if (xhr.status === 200) {
                // cache file content
                item.data = xhr.responseText;

                var header = null;
                if (get_config("caching"))
                    header = pick_caching_header(xhr);

                show_src();
                update_li_text(item, header);
            } else {
                $("body").addClass("err");
            }
        }
    };
    xhr.send(null);
}

// picks caching information of src file
function pick_caching_header(xhr) {
    var h = "Expires";
    var val = xhr.getResponseHeader(h);
    if (!val) {
        h = "Cache-Control";
        val = xhr.getResponseHeader(h);
    }
    if (!val) {
        h = "Age";
        val = xhr.getResponseHeader(h);
    }

    if (val)
        return h+": "+val;
}


// js+css data received from content script
function data_received(resp) {
    if (!resp) {
        // target page didn't have our content script
        $("body").addClass("err");

//        chrome.browserAction.setBadgeText({"text":"Err"});
        return;
    }

    // remember data
    data = resp;

    // set badge for this source tab too
    update_badge(data);

    $("title").text("SRC "+resp.url);

    var jscount = resp.js.length;
    var csscount = resp.css.length;
    var jsinline = 0;
    var cssinline = 0;
    var onclickcount = 0;

    var i, item;

    // js
    for (i = 0; i < jscount; i++) {
        item = resp.js[i];

        add_item($("#jslist"), item);
/*        if (!item.src && !item.onclick) */
        if (!item.src)
            jsinline += 1;

//        if (item.onclick)
//            onclickcount += 1;

        update_li_text(item);
    }
    // css
    for (i = 0; i < csscount; i++) {
        item = resp.css[i];
        add_item($("#csslist"), item);
        if (!item.src)
            cssinline += 1;
        update_li_text(item);
    }
    // single html
    item = resp.html[0];
    add_item($("#htmllist"), item);
    update_li_text(item);


    // update counts
    $("#jstotal").text(jscount-onclickcount);
    $("#jsext").text(jscount-onclickcount-jsinline);
    $("#jsin").text(jsinline);
    $("#csstotal").text(csscount);
    $("#cssext").text(csscount-cssinline);
    $("#cssin").text(cssinline);

    init2();
}


// builds and adds a source item to a <ol>
function add_item(ol, item) {
    var s;

    if (item.src)
        s = "<li><a href='"+item.src+"'>"+emphasize_name(item.src);
    else if (item.count)
        s = "<li><a href='#'>"+data.url;
    else if (item.onclick)
        s = "<li><a href='#'>ONCLICK: <span></span>";
    else
        s = "<li><a href='#'>INLINE: <span></span>";
    s += "</a><p></p></li>";

    var li = $(s);
    if (!item.src) {
        li.addClass("inline");
        li.find("span").text(item.inline.substr(0,80));
    }
    if (item.dynamic)
        li.addClass("dynamic");
    if (item.src && config_is_hilighted(item.src))
        li.addClass("hi");

    item.li = li;

    ol.append(li);
}

// emphasizes the file name part of the url
function emphasize_name(url) {
    var len = url.length;
    var i = url.lastIndexOf("/");
    var s;
    if (i == len-1)
        return url;
    else if (i < 0)
        return "<b>"+url+"</b>";
    else
        return url.substr(0,i+1) + "<b>&#8203;" + url.substr(i+1) + "</b>";
    // zero-width space above, breaks line if needed
}

//http://stackoverflow.com/questions/2901102/how-to-print-number-with-commas-as-thousands-separators-in-javascript
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

document.addEventListener('DOMContentLoaded', function() {
    init();
});

