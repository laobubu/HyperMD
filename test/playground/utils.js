'use strict'

/** @typedef {typeof import("../..")} HyperMD_Module */

/** @type {CodeMirror.Editor} */
var editor = null

/** @type {HyperMD_Module} */
var HyperMD = null

var args = {
  theme: "hypermd-light",
  file: "/README.md",
}

!function () { // fill args
  let s = location.search, e = /[?&]([-\w]+)(?:=([^&]*))?/g, t
  while (t = e.exec(s)) {
    let name = t[1], value = t[2]
    if (value) args[name] = decodeURIComponent(value)
  }
}();

const fetch_text = (url) => fetch(url).then(x => x.text()).catch(err => "# Error\n\nCan't fetch " + url);
