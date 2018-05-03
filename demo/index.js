var demo_page_baseurl = window.location.href.replace(/\?.*$/, '').replace(/\/[^\/]*$/, '/')
var demo_page_lib_baseurl = (/\.github\.|laobubu\.net/.test(location.hostname)) ? "https://cdn.jsdelivr.net/npm/" : "node_modules/"

if (requirejs) requirejs.config({
  // baseUrl: "node_modules/",                   // using local version
  // baseUrl: "https://cdn.jsdelivr.net/npm/",   // or use CDN
  baseUrl: demo_page_lib_baseurl,
  paths: {
    // Some CDNs treat lib files differently. If CodeMirror failed to load, Uncomment this line to fix it:
    // ( see http://stackoverflow.com/questions/36500713/loading-codemirror-with-requirejs-from-cdn )
    // "codemirror/lib": "codemirror/",

    // HyperMD is not from node_modules nor CDN:
    // "hypermd": "./hypermd",
    "hypermd": demo_page_baseurl + "hypermd",
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

  CODEMIRROR_ROOT + 'addon/dialog/dialog',
  CODEMIRROR_ROOT + 'addon/search/search',
  CODEMIRROR_ROOT + 'addon/search/jump-to-line',
  // CODEMIRROR_ROOT + 'keymap/vim',
  HYPERMD_ROOT + 'mode/hypermd',
  HYPERMD_ROOT + 'addon/hide-token',
  HYPERMD_ROOT + 'addon/cursor-debounce',
  HYPERMD_ROOT + 'addon/fold',
  HYPERMD_ROOT + 'addon/fold-math',
  HYPERMD_ROOT + 'addon/readlink',
  HYPERMD_ROOT + 'addon/click',
  HYPERMD_ROOT + 'addon/hover',
  HYPERMD_ROOT + 'addon/paste',
  HYPERMD_ROOT + 'addon/paste-image',
  HYPERMD_ROOT + 'addon/mode-loader',
  HYPERMD_ROOT + 'addon/table-align',
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
      tabSize: 4, // CommonMark specifies tab as 4 spaces
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
      // NOTE: only works when `turndown` is loaded before HyperMD
      hmdPaste: true,

      // (addon) paste-image
      // copy, paste and upload image
      // if you don't need this, passing `false` as option value
      hmdPasteImage: {
        enabled: true,
        uploadTo: 'sm.ms', // can be a function(file, callback) , where file is Blob object and callback is function(imageURL, errorMsg)
        placeholderURL: './hypermd/theme/hypermd-image-uploading.gif',
      },

      // (addon) hide-token
      // hide/show Markdown tokens like `**`
      hmdHideToken: "(profile-1)",

      // (addon) mode-loader
      // auto load mode to highlight code blocks
      // by providing a URL prefix, pointing to your CodeMirror
      // - http://cdn.xxxxx.com/codemirror/v4.xx/
      // - ./node_modules/codemirror/              <- relative to webpage's URL
      // using require.js? do it like this :
      hmdLoadModeFrom: "~codemirror/",

      // (addon) table-align
      // adjust table separators' margin, making table columns aligned
      hmdTableAlign: {
        lineColor: '#999',   // color of vertical lines
        rowsepColor: '#999',  // color of the horizontal line, can be null (means transparent)
      },
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
          myTextarea.value = xmlhttp.responseText
          init_editor()
        }
      }
      xmlhttp.open("GET", url, true)
      xmlhttp.send(null)
    }
  }
})
