if (requirejs) requirejs.config({
    paths: {
        "codemirror": "./node_modules/codemirror/",
        "hypermd": "./hypermd/"
    },
    waitSeconds: 15
})

// Using requirejs's "path" option (see above)
var CODEMIRROR_ROOT = window.CODEMIRROR_ROOT = "codemirror/";
var HYPERMD_ROOT = window.HYPERMD_ROOT = "hypermd/";

require([
    CODEMIRROR_ROOT + 'lib/codemirror',
    CODEMIRROR_ROOT + 'mode/javascript/javascript',
    CODEMIRROR_ROOT + 'addon/fold/foldcode',
    CODEMIRROR_ROOT + 'addon/fold/foldgutter',
    CODEMIRROR_ROOT + 'addon/fold/markdown-fold',
    CODEMIRROR_ROOT + 'addon/edit/continuelist',
    // CODEMIRROR_ROOT + 'keymap/vim',
    HYPERMD_ROOT + 'mode/hypermd',
    HYPERMD_ROOT + 'addon/hide-token',
    HYPERMD_ROOT + 'addon/cursor-debounce',
    HYPERMD_ROOT + 'addon/fold',
    HYPERMD_ROOT + 'addon/fold-math',
    HYPERMD_ROOT + 'addon/readlink',
    HYPERMD_ROOT + 'addon/click',
    HYPERMD_ROOT + 'addon/hover',
    HYPERMD_ROOT + 'addon/paste'
], function (CodeMirror) {
    'use strict';
    var myTextarea = document.getElementById('demo')

    // init_editor()
    ajax_load_file_then_init_editor("README.md")

    function init_editor() {
        var editor = CodeMirror.fromTextArea(myTextarea, {
            lineNumbers: true,
            lineWrapping: true,
            theme: "hypermd-light",
            mode: "text/x-hypermd",
            // keyMap: "vim",     // just for fun

            foldGutter: true,
            gutters: [
                "CodeMirror-linenumbers",
                "CodeMirror-foldgutter",
                "HyperMD-goback"  // (addon: click) 'back' button for footnotes
            ],
            extraKeys: {
                "Enter": "newlineAndIndentContinueMarkdownList"
            },

            // (addon) cursor-debounce
            // cheap mouse could make unexpected selection. use this to fix.
            hmdCursorDebounce: true,

            // (addon) fold
            // turn images and links into what you want to see
            hmdAutoFold: 200,

            // (addon) fold-math
            // MathJax support. Both `$` and `$$` are supported
            hmdFoldMath: {
                interval: 200,      // auto folding interval
                preview: true       // providing a preview while composing math
            },

            // (addon) paste
            // copy and paste HTML content
            hmdPaste: true,
            
            // (addon) hide-token
            // hide/show Markdown tokens like `**`
            hmdHideToken: "(profile-1)"
        })

        // (addon) hover
        // (dependencies) addon/readlink
        // tooltips on footnotes
        editor.hmdHoverInit()

        // (addon) click
        // (dependencies) addon/readlink
        // click to follow links and footnotes
        editor.hmdClickInit()

        window.CodeMirror = CodeMirror
        window.editor = editor
        editor.setSize("100%", 500)
    }

    function ajax_load_file_then_init_editor(url) {
        var xmlhttp;
        if (window.XMLHttpRequest) { xmlhttp = new XMLHttpRequest() }
        else if (window.ActiveXObject) { xmlhttp = new ActiveXObject("Microsoft.XMLHTTP") }
        if (xmlhttp != null) {
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    myTextarea.innerText = xmlhttp.responseText
                    init_editor()
                }
            }
            xmlhttp.open("GET", url, true)
            xmlhttp.send(null)
        }
    }
})
