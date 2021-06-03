
/* js for source viewer tab */

// script+css nodes of DOM provided by content script are stored here
var data = {};

// is whole file currently displayed?
var is_whole_file;

// id of target tab
var tabid;


function init() {

    tabid = parseInt(location.hash.slice(1));

    ask_page_data();

    // view sources
    $("ol").on("click", "a", function(){
        var a = $(this);
        if (a.attr("title"))
            return true; // html viewsource link

        var li = a.closest("li");
        $("ol>li").removeClass("sel");
        li.addClass("sel");

        is_whole_file = false;
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
        is_whole_file = false;
        show_src();
        return false;
    });
    $(window).keydown(function(e) {
//        console.debug("d1", e.keyCode, e);
        if (e.keyCode == 66) {
            $("#beautify").trigger("click");
        }
        else if (e.keyCode == 78) {
            $("body").toggleClass("nolinenum");
            setTimeout(insert_line_numbers, 10);
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

    if (get_config("linenum"))
        $("body").removeClass("nolinenum");
    else
        $("body").addClass("nolinenum");

    // scroll handler to beautify whole file
    var w = $(window);
    w.scroll(function() {
        var top = w.scrollTop();
        if (top > 0 && $("body").height() <= (w.height() + top)) {
            // at bottom
            show_src(null, true);
        }
    });
    // anchor to beautify whole file
    $("#src").on("click", "#viewwhole", function() {
        show_src(null, true);
        return false;
    });

    // copy to clipboard
    $("#copy2clip").click(function(){
        $("body").addClass("wait2");

        setTimeout(function(){
            var item = show_src(null, true);
            if (item) {
                var s = item.pretty || item.data || item.inline;
                copy2clipboard(s);
            }

            $("body").removeClass("wait2");
        }, 10);

        return false;
    });

}

// init phase2, after tree populated
function init2() {

    // for calculating line height
    $("#src code").html("<span>&nbsp;</span>");

    setTimeout(function() {
        line_height = $("#src code span").height();

        // show html node initially
        $("#htmllist li >a").eq(0).trigger("click");
    }, 10);
}

function ask_page_data() {
    // call content script: ask js+css nodes
    if (window.chrome && chrome.tabs) {
        // ask to return onclick handlers too?
        var show_onclick = get_config("onclick");

        chrome.tabs.sendMessage(tabid, {"showonclick":show_onclick},
                                data_received);
    } else {
        // while developing
        data_received(debugdata);
    }
}

// shows the source in given <li>
function show_src(li, show_whole_file) {
//    console.debug("show_src " + li + show_whole_file);

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

    // js or css array?
    var arr;
    var ol = li.parent();
    var lang = "";
    if (ol.get(0).id == "jslist") {
        arr = data.js;
        lang = "javascript";
    } else if (ol.get(0).id == "htmllist") {
        arr = data.html;
        lang = "xml";
    } else if (ol.get(0).id == "jsonlist") {
        arr = data.json;
        lang = "json";
    } else if (ol.get(0).id == "otherlist") {
        arr = data.other;
        lang = "xml";
    }else {
        arr = data.css;
        lang = "css";
    }

    $("#src>code").removeClass("language-javascript language-css language-xml").addClass("language-"+lang);

    var item = arr[index];

    if (item.src) {
        // external node
        if (item.data != undefined)
            build_item(item, lang, show_whole_file);
        else
            load_data(item);

        $("#fname").text(item.src);
    } else {
        // inline node
        build_item(item, lang, show_whole_file);

        $("#fname").text(item.count? data.url : item.onclick ? "ONCLICK" : "INLINE");
    }

    if (!$("body").hasClass("nolinenum"))
        setTimeout(insert_line_numbers, 10);

    return item;
}

// shows the sources of a loaded node
function build_item(item, lang, show_whole_file) {
    if (is_whole_file)
        return;

    console.debug("build_item " + lang + " whole=" + is_whole_file);

    // large file, to show only first part?
    var s = item.data || item.inline;
    var MAX_SIZE = get_config("limit_beauty") || 20000;
    if (!show_whole_file && s.length > MAX_SIZE) {
        s = s.substr(0, MAX_SIZE);
        is_whole_file = false;
    } else {
        is_whole_file = true;
    }

    var pos = $(window).scrollTop();

    // called when source beautified
    var onFinish = function(txt) {
        $("#src>code").html(txt);

        if (!is_whole_file) {
            $("#src>code").append("\n\n<a id='viewwhole' href='#'>View all</a>");
        }

        // remember scroll pos
        if (!show_whole_file) {
            // chrome fix: scroll to top first
            window.scrollTo(0, 0);
        } else {
            window.scrollTo(0, pos);
        }
    };

    // prettify?
    if ($("#beautify").hasClass("sel")) {
        s = s.trim();

        if (lang.indexOf("css") >= 0)
            s = css_beautify(s);
        else if (lang.indexOf("xml") >= 0)
            s = html_beautify(s);
        else
            s = js_beautify(s);
    }

    item.pretty = s;

    // colorize?
    if (get_config("colorize")) {
        if (show_whole_file)
            $("body").addClass("wait2");

        setTimeout(function(){
            hljs.configure({classPrefix: ''});
            var result = hljs.highlight(lang, s, true);
            onFinish(hljs.fixMarkup(result.value));
            $("body").removeClass("wait2");
        }, 10);
    } else {
        onFinish(s);
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

    if (item.imported)
        s += " <span class='dynamic'>@IMPORT</span>";
    else if (item.dynamic)
        s += " <span class='dynamic'>INJECTED</span>";

    if (item.count) {
        // single html item
        s += ", "+item.count+ " nodes ";
        // remove view-source: Chrome no longer supports
        //s += "<a href='view-source:"+data.url+"' target='_blank' title='View sources before Javascript runs'>View&nbsp;original</a>";
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
                $("#src>code").text("HTTP Error " + xhr.status);
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
        var err = chrome.extension.lastError;

        // still loading page?
        chrome.tabs.get(tabid, function(tab) {
            if (tab.status == "complete" && err) {
                // can't show this page
                $("#src>code").text("Error: Access is denied to chrome:// and Chrome Store pages");
                return;
            }
            // target page not yet loaded, ask again
            $("#src>code").text("Page loading...");
            setTimeout(ask_page_data, 500);
        });
        return;

    } else if (resp.err) {
        // some error occurred
        $("body").addClass("err");
        $("#src>code").text(resp.err);
        return;
    }

    // remember data
    data = resp;

    // set badge for this source tab too
    update_badge(data);

    // set title
    var url = remove_url_prefix(resp.url);
    $("title").text("SRC "+url);

    var jscount = resp.js.length;
    var csscount = resp.css.length;
    var json_count = resp.json.length;
    var other_count = resp.other.length;
    var jsinline = 0;
    var json_inline = 0;
    var other_inline = 0;
    var cssinline = 0;
    var onclickcount = 0;

    var i, item;

    // html
    for (i = 0; i < resp.html.length; i++) {
        item = resp.html[i];
        add_item($("#htmllist"), item);
        update_li_text(item);
    }
    // js
    for (i = 0; i < jscount; i++) {
        item = resp.js[i];

        add_item($("#jslist"), item);
        if (item.onclick)
            onclickcount += 1;
        else if (!item.src)
            jsinline += 1;
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

    // json
    for (i = 0; i < json_count; i++) {
        item = resp.json[i];

        add_item($("#jsonlist"), item);
        if (item.onclick)
            onclickcount += 1;
        else if (!item.src)
            json_inline += 1;
        update_li_text(item);
    }
    // other
    for (i = 0; i < other_count; i++) {
        item = resp.other[i];

        add_item($("#otherlist"), item);
        if (item.onclick)
            onclickcount += 1;
        else if (!item.src)
            other_inline += 1;
        update_li_text(item);
    }


    // update counts
    $("#jstotal").text(jscount-onclickcount);
    $("#jsext").text(jscount-onclickcount-jsinline);
    $("#jsin").text(jsinline);
    $("#csstotal").text(csscount);
    $("#cssext").text(csscount-cssinline);
    $("#cssin").text(cssinline);

    $("#jsontotal").text(resp.json.length);
    $("#jsonext").text(json_count-json_inline);
    $("#jsonin").text(json_inline);

    $("#othertotal").text(other_count);
    $("#otherext").text(other_count-other_inline);
    $("#otherin").text(other_inline);

    init2();
}


// builds and adds a source item to a <ol>
function add_item(ol, item) {
    var s;

    if (item.src)
        s = "<li><a href='"+item.src+"'>"+emphasize_name(item.src);
    else if (item.count)
        s = "<li><a href='#'>"+remove_url_prefix(data.url);
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
    url = remove_url_prefix(url);

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

window.addEventListener('load', function() {
    init();
});

// fills #src ol to have N items of <li>
function insert_line_numbers() {
    $("#src ol").empty();
    var nums = [];
    var count = calculate_line_count();

    for (var i = 0; i < count; i++) {
        nums.push("<li/>");
    }
    $("#src ol").html(nums.join(""));
}

var line_height = 0;

function calculate_line_count() {
    // can't count linefeeds since pre-wrap can also wrap lines
//    var s = $("#src code").text();
//    return s.split("\n").length;

    // let's just calculate lines by box height
    var h = $("#src code").height();

    if (!line_height)
        return 1;

    return h/line_height - 1;
}

// removes "http://"
function remove_url_prefix(url) {
    if (url.startsWith("http://"))
        url = url.substr(7);
    else if (url.startsWith("https://"))
        url = url.substr(8);
    return url;
}

// copy text to clipboard
function copy2clipboard(txt) {
    var copyFrom = document.createElement("textarea");
    copyFrom.textContent = txt;
    var body = document.getElementsByTagName('body')[0];
    body.appendChild(copyFrom);
    copyFrom.select();
    document.execCommand('copy');
    body.removeChild(copyFrom);
}

