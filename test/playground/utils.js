'use strict'

/** @typedef {typeof import("../..")} HyperMD_Module */
/** @typedef {typeof import("vue").default} Vue_Module */
/** @typedef {typeof import("./float-win/float-win")} FloatWin_Class */

/** @type {CodeMirror.Editor} */  var editor = null

/** @type {HyperMD_Module} */ var HyperMD = null
/** @type {Vue_Module} */     var Vue = null
/** @type {FloatWin_Class} */  var FloatWin = null

/** All args can be overwritten via location.hash */
var defaultArgs = {
  file: "./test.md",
  plugins: "hypermd-katex=index.js;katex=dist/katex.min.js",
}

/** @type {Record<string, string>} */
var args = (function () {
  var ans = { ...defaultArgs }

  let s = location.hash, e = /#([^#=]+)(?:=([^#]*))/g, t
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
    if (/^https:|node_modules/.test(link.href)) continue
    link.href += "?r=" + Math.random()
  }
  editor.refresh()
  console.log("refreshed css")
}

function deepClone(o) {
  return JSON.parse(JSON.stringify(o))
}

function elt(tag, attrs, content) {
  var el = document.createElement(tag)
  if (attrs) for (var attr in attrs) {
    let val = attrs[attr]
    el.setAttribute(attr, "" + val);
  }
  if (typeof content === 'string') el.textContent = content;
  else if (content && content.length > 0) [].slice.call(content).forEach(child => el.appendChild(child));
  return el;
}

function displayRequireJSError(err) {
  var errBox = document.getElementById('requirejs-error')
  var txtBox = errBox.querySelector('textarea')
  var reloadBtn = errBox.querySelector('button')
  var preBox = errBox.querySelector('pre')

  errBox.style.display = 'block'

  txtBox.value = args.plugins.replace(/;/g, '\n')
  preBox.textContent = err.toString() + "\n\n\n" + JSON.stringify(err, null, 2)

  reloadBtn.onclick = function () {
    var newPart = txtBox.value.trim().replace(/[\r\n]+/g, ';')
    var newHash = location.hash.replace(/#plugins=[^#]*/, '#plugins=' + encodeURIComponent(newPart))
    location.hash = newHash
    location.reload()
  }

  console.error(err)
}
