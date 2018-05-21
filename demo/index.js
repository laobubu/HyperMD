var is_running_demo = /\.github\.|laobubu\.net/.test(location.hostname)

var demo_page_baseurl = window.location.href.replace(/[\?\#].*$/, '').replace(/\/[^\/]*$/, '/')
var demo_page_lib_baseurl = is_running_demo ? "https://cdn.jsdelivr.net/npm/" : "node_modules/"
var demo_filename = "README.md"

if (requirejs) requirejs.config({
  // baseUrl: "node_modules/",                   // using local version
  // baseUrl: "https://cdn.jsdelivr.net/npm/",   // or use CDN
  baseUrl: demo_page_lib_baseurl,

  paths: {
    // HyperMD is not from node_modules nor CDN:
    // "hypermd": "./",
    "hypermd": demo_page_baseurl + "./",
  },

  // Remove `packages` if you occur errors with CDN
  packages: [
    {
      name: 'codemirror',
      main: 'lib/codemirror'
    },
    {
      name: 'mathjax',
      main: 'MathJax.js'
    },
    {
      name: 'marked',
      main: 'lib/marked'
    }
  ],
  waitSeconds: 15
})

require([

  // If load libs manually, LOAD THEM IN SEQUENCE!

  ///////////////////////////////////////
  /// Core! Load them first!          ///
  ///////////////////////////////////////

  'codemirror/lib/codemirror',
  'hypermd/core',

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

  'codemirror/addon/mode/overlay',
  'codemirror/mode/markdown/markdown',
  'codemirror/mode/gfm/gfm',

  'codemirror/addon/dialog/dialog',
  'codemirror/addon/search/search',
  'codemirror/addon/search/jump-to-line',

  // Just for fun. Not really useful.
  // 'codemirror/keymap/vim',

  ///////////////////////////////////////
  /// Optional third-party libraries  ///
  ///////////////////////////////////////

  // for addon/hover and more
  // NOTE: if you use require.js, this line is optional
  //       because marked is declared as required in the addons' code
  'marked/lib/marked',

  // for addon/paste
  'turndown/dist/turndown',
  'turndown-plugin-gfm/dist/turndown-plugin-gfm',

  // for addon/fold-math
  // NOTE: It's REQUIRED to declare a configuration before loading MathJax:
  //       <script type="text/x-mathjax-config">...</script>
  //       see index.html or docs/examples/ai1.html
  'mathjax/MathJax',

  ///////////////////////////////////////
  /// HyperMD modules                 ///
  ///////////////////////////////////////

  'hypermd/mode/hypermd',

  'hypermd/addon/hide-token',
  'hypermd/addon/cursor-debounce',
  'hypermd/addon/fold',
  'hypermd/addon/fold-math',
  'hypermd/addon/read-link',
  'hypermd/addon/click',
  'hypermd/addon/hover',
  'hypermd/addon/paste',
  'hypermd/addon/insert-file',
  'hypermd/addon/mode-loader',
  'hypermd/addon/table-align',

], function (CodeMirror, HyperMD) {
  'use strict';
  var myTextarea = document.getElementById('demo')

  // HyperMD magic. See https://laobubu.net/HyperMD/docs/
  var editor = HyperMD.fromTextArea(myTextarea, {
    hmdFoldMath: {
      onPreview: function (s) { console.log("Preview math: ", s) },
      onPreviewEnd: function () { console.log("Preview end") }
    },
    hmdClick: clickHandler,
  })
  editor.setSize("100%", "100%")

  // for debugging
  window.CodeMirror = CodeMirror
  window.HyperMD = HyperMD
  window.editor = editor
  window.cm = editor

  // for demo page only:
  document.body.className += " loaded"
  load_and_update_editor(demo_filename)
})

var allowDirectOpen = /directOpen/.test(window.location.search)

function clickHandler(info, cm) {
  if (info.type === "link" || info.type === "url") {
    var url = info.url
    if ((allowDirectOpen || info.ctrlKey || info.altKey) && /\.(?:md|markdown)$/.test(url)) {
      // open a link whose URL is *.md with ajax_load_file
      // and supress HyperMD default behavoir
      load_and_update_editor(url) // see index2.js
      return false
    } else if (allowDirectOpen && url) {
      window.open(url)
      return false
    } else if (/^\[(?:Try out|试试看)\]$/i.test(info.text)) {
      demo_tryout(info) // see index2.js
      return false
    }
  }
}
