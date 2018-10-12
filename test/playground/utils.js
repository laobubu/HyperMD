'use strict'

/** @typedef {typeof import("../..")} HyperMD_Module */
/** @typedef {typeof import("vue").default} Vue_Module */
/** @typedef {typeof import("./float-win/float-win")} FloatWin_Class */

/** @type {CodeMirror.Editor} */  var editor = null

/** @type {HyperMD_Module} */ var HyperMD = null
/** @type {Vue_Module} */     var Vue = null
/** @type {FloatWin_Class} */  var FloatWin = null

/** All args can be overwritten via location.search */
var defaultArgs = {
  theme: "hypermd-light",
  file: "/README.md",
  plugins: "hypermd-katex=index.js;katex=dist/katex.min.js",
}

var args = (function () {
  var ans = { ...defaultArgs }

  let s = location.search, e = /[?&]([-\w]+)(?:=([^&]*))?/g, t
  while (t = e.exec(s)) {
    let name = t[1], value = t[2]
    if (value) ans[name] = decodeURIComponent(value)
  }

  return ans
})();

const fetch_text = (url) => fetch(url).then(x => x.text()).catch(err => "# Error\n\nCan't fetch " + url);

function refreshCSS() {
  let links = document.querySelectorAll('link')
  for (let link of links) {
    if (link.rel !== 'stylesheet') continue
    if (/^https?:|node_modules/.test(link.href)) continue
    link.href += "?r=" + Math.random()
  }
  editor.refresh()
  console.log("refreshed css")
}

function deepClone(o) {
  return JSON.parse(JSON.stringify(o))
}
