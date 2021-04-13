
/* View and save config for the extension. */

function init() {

    function save() {
        var c = {};
        c.tooltip  = $("#inptip").get(0).checked;
        c.isredcount  = $("#isredcount").get(0).checked;
        c.redcount  = $("#redcount").val();
        c.limit_beauty  = $("#limit_beauty").val();
        c.limit_inline  = $("#limit_inline").val();
        c.beautify = $("#inpbeautify").get(0).checked;
        c.caching  = $("#inpcache").get(0).checked;
        c.onclick  = $("#inponclick").get(0).checked;
        c.linenum  = $("#inplinenum").get(0).checked;
        c.colorize = true;
        c.hilight = $("#hi").val().split(/\r\n|\r|\n/);
        c.css = $("#css").val();

        save_config(c);
    }

    // save config
    $("input, textarea").change(save);
    $(window).bind("unload", save);

    // read config
    $("#inptip").get(0).checked = get_config("tooltip");
    $("#isredcount").get(0).checked = get_config("isredcount");
    $("#redcount").val(get_config("redcount") || 50);
    $("#limit_beauty").val(get_config("limit_beauty") || 20000);
    $("#limit_inline").val(get_config("limit_inline") || 400);
    $("#inpbeautify").get(0).checked = get_config("beautify");
    $("#inpcache").get(0).checked = get_config("caching");
    $("#inponclick").get(0).checked = get_config("onclick");
    $("#inplinenum").get(0).checked = get_config("linenum");
    $("#hi").val(get_config("hilight").join("\n"));
    $("#css").val(get_config("css"));
}


document.addEventListener('DOMContentLoaded', function() {
    init();
});

