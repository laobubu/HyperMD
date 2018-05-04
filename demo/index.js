var is_running_demo = /\.github\.|laobubu\.net/.test(location.hostname)
var demo_page_baseurl = window.location.href.replace(/\?.*$/, '').replace(/\/[^\/]*$/, '/')
var demo_page_lib_baseurl = is_running_demo ? "https://cdn.jsdelivr.net/npm/" : "node_modules/"

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

require([

  // If load libs manually, LOAD THEM IN SEQUENCE!

  ///////////////////////////////////////
  /// Core! Load them first!          ///
  ///////////////////////////////////////

  'codemirror/lib/codemirror',
  'hypermd/hypermd',

  ///////////////////////////////////////
  /// CodeMirror                      ///
  ///////////////////////////////////////

  // Code Highlighting
  // NOTE: HyperMD addon "mode-loader" can load modes automatically
  //       if it's configured properly
  'codemirror/mode/javascript/javascript',  // eg. javascript

  'codemirror/addon/fold/foldcode',
  'codemirror/addon/fold/foldgutter',
  'codemirror/addon/fold/markdown-fold',
  'codemirror/addon/edit/continuelist',

  'codemirror/addon/dialog/dialog',
  'codemirror/addon/search/search',
  'codemirror/addon/search/jump-to-line',

  // Just for fun. Not really useful.
  // 'codemirror/keymap/vim',

  ///////////////////////////////////////
  /// Optional third-party libraries  ///
  ///////////////////////////////////////

  // for addon/hover and more
  // NOTE: if you use require.js, this is optional
  //       because marked is declared as required in the addons' code
  'marked/lib/marked',

  // for addon/paste
  'turndown/dist/turndown',
  'turndown-plugin-gfm/dist/turndown-plugin-gfm',

  // for addon/fold-math
  // NOTE: <script type="text/x-mathjax-config">...</script> is required before loading MathJax
  //       see index.html
  'mathjax/MathJax',

  ///////////////////////////////////////
  /// HyperMD modules                 ///
  ///////////////////////////////////////

  'hypermd/mode/hypermd',

  'hypermd/addon/hide-token',
  'hypermd/addon/cursor-debounce',
  'hypermd/addon/fold',
  'hypermd/addon/fold-math',
  'hypermd/addon/readlink',
  'hypermd/addon/click',
  'hypermd/addon/hover',
  'hypermd/addon/paste',
  'hypermd/addon/paste-image',
  'hypermd/addon/mode-loader',
  'hypermd/addon/table-align',

], function (CodeMirror, HyperMD) {
  'use strict';
  var myTextarea = document.getElementById('demo')

  function init_editor() {
    // HyperMD magic. See document
    var editor = HyperMD.fromTextArea(myTextarea)
    editor.setSize("100%", 500)

    // for debugging
    window.CodeMirror = CodeMirror
    window.HyperMD = HyperMD
    window.editor = editor
    window.cm = editor
  }

  // ajax_load_file is declared in `index2.js`
  // If you don't need it, just init_editor()
  ajax_load_file("README.md", function (text) {
    myTextarea.value = text
    init_editor()
  })
})
