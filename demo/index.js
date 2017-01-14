var CODEMIRROR_ROOT = "../node_modules/codemirror/";
var HYPERMD_ROOT = "../hypermd/";

var DEBUG_PATCHING = false  // patching: show/hide tokens

requirejs([
    CODEMIRROR_ROOT + 'lib/codemirror',
    CODEMIRROR_ROOT + 'mode/javascript/javascript',
    CODEMIRROR_ROOT + 'addon/fold/foldcode',
    CODEMIRROR_ROOT + 'addon/fold/foldgutter',
    CODEMIRROR_ROOT + 'addon/fold/markdown-fold',
    CODEMIRROR_ROOT + 'addon/edit/continuelist',
    HYPERMD_ROOT + 'mode/hypermd',
    HYPERMD_ROOT + 'addon/hide-token',
    HYPERMD_ROOT + 'addon/cursor-debounce',
    HYPERMD_ROOT + 'addon/fold',
    HYPERMD_ROOT + 'addon/readlink',
    HYPERMD_ROOT + 'addon/click',
    HYPERMD_ROOT + 'addon/hover'
], function (CodeMirror) {
    'use strict';
    var myTextarea = document.getElementById('demo');

    var xmlhttp, url = "README.md";
    if (window.XMLHttpRequest) { xmlhttp = new XMLHttpRequest() }
    else if (window.ActiveXObject) { xmlhttp = new ActiveXObject("Microsoft.XMLHTTP") }
    if (xmlhttp != null) {
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                myTextarea.innerText = xmlhttp.responseText
                editor_init()
            }
        }
        xmlhttp.open("GET", url, true)
        xmlhttp.send(null)
    }

    function editor_init() {
        var editor = CodeMirror.fromTextArea(myTextarea, {
            lineNumbers: true,
            lineWrapping: true,
            theme: "hypermd-light",
            mode: "text/x-hypermd",

            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
            extraKeys: {
                "Enter": "newlineAndIndentContinueMarkdownList"
            },

            hmdCursorDebounce: true,    // optional, since the default value is `true`
            hmdAutoFold: 200            // auto fold delay. 0 = disable
        });

        editor.hmdHideTokenInit()
        editor.hmdClickInit()
        editor.hmdHoverInit()

        window.CodeMirror = CodeMirror
        window.editor = editor
        editor.setSize("100%", 500)
    }
})
