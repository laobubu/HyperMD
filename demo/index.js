var is_running_demo = /\.github\.|laobubu\.net/.test(location.hostname)

var demo_page_baseurl = window.location.href.replace(/[\?\#].*$/, '').replace(/\/[^\/]+$/, '/')
var demo_page_lib_baseurl = is_running_demo ? "https://cdn.jsdelivr.net/npm/" : (demo_page_baseurl + "node_modules/")
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
    { name: 'codemirror', main: 'lib/codemirror.js' },
    { name: 'mathjax', main: 'MathJax.js' },
    { name: 'katex', main: 'dist/katex.min.js' },
    { name: 'marked', main: 'lib/marked.js' },
    { name: 'turndown', main: 'lib/turndown.browser.umd.js' },
    { name: 'turndown-plugin-gfm', main: 'dist/turndown-plugin-gfm.js' },
  ],
  waitSeconds: 15
})

require([
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

  ///////////////////////////////////////
  /// HyperMD modules                 ///
  ///////////////////////////////////////

  'hypermd/mode/hypermd', // ESSENTIAL

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

  'hypermd/keymap/hypermd',

  /////////////////////////////////////////////
  /// PowerPack with third-party libraries  ///
  /////////////////////////////////////////////

  'hypermd/powerpack/hover-with-marked',

  'hypermd/powerpack/fold-math-with-katex',
  // 'hypermd/powerpack/fold-math-with-mathjax',

  'hypermd/powerpack/paste-with-turndown',
  'turndown-plugin-gfm',

], function (CodeMirror, HyperMD) {
  'use strict';
  var myTextarea = document.getElementById('demo')

  // HyperMD magic. See https://laobubu.net/HyperMD/docs/
  var editor = HyperMD.fromTextArea(myTextarea, {
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

  // Preview Tex Math formula
  // @see demo/math-preview.js
  init_math_preview(editor)
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
