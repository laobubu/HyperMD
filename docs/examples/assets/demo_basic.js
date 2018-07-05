// This file configures RequireJS for most demos
// also provides some useful utils

/////////////////////////////////////////////////////////////
/// PLEASE READ basic-requirejs.html                      ///
/////////////////////////////////////////////////////////////

requirejs.config({
  // baseUrl: "node_modules/",                   // using local version
  baseUrl: "https://cdn.jsdelivr.net/npm/",   // or use CDN

  // Remove this, if you are using HyperMD outside "HyperMD" online demo site
  paths: {
    "hypermd": location.href.substr(0, location.href.indexOf('docs/examples/')) + ".",
    "Raphael": "raphael", // flowchart.js bug
  },

  // Remove this, if you occur errors with CDN
  packages: requirejs_packages, // see: ../../demo/requirejs_packages.js

  // You may add more RequireJS config
  waitSeconds: 30
})






/////////////////////////////////////////////////////////
/// Following is njq (No jQuery) lib

function __(selector, parent) {
  return (parent || document).querySelector(selector)
}
(function ($p) {
  /// DOM
  $p.on = function (el, ev, fun, capture) {
    if (el = typeof el === 'string' ? document.querySelector(el) : el)
      el.addEventListener(ev, fun, !!capture)
  }
  $p.off = function (el, ev, fun, capture) {
    if (el = typeof el === 'string' ? document.querySelector(el) : el)
      el.removeEventListener(ev, fun, !!capture)
  }
  $p.attr = function (el, name, val) {
    if (val !== void 0) el.setAttribute(name, val)
    else return el.getAttribute(name)
  }
  $p.elt = function (tag, attrs, text) {
    var el = document.createElement(tag);
    if (attrs) for (var attr in attrs) el.setAttribute(attr, attrs[attr]);
    if (text) el.textContent = text;
    return el
  }
})(__);

/////////////////////////////////////////////////////////
/// Might be useful...

function demo_loaded(CodeMirror, HyperMD, editor) {
  // hide loading info
  __('#loadingSplash').style.display = 'none'

  // to debug the editor easily. expose it to global
  window['editor'] = editor

  editor.setSize(null, "900px") // set height
  editor.focus()

  // bind events
  __.on("#toNormal", 'click', function () {
    HyperMD.switchToNormal(editor)
  })

  __.on("#toHyperMD", 'click', function () {
    HyperMD.switchToHyperMD(editor)
  })
}
