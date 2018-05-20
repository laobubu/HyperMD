/* global editor, is_running_demo, HyperMD */

// the following code is just for test.
// useless for you.

function hmdModeLineInfo(lineNo) {
  var tokens = cm.getLineTokens(73)
  tokens = tokens.map(function (t) {
    return [t.string, t.type, t.state.overlay]
  })
  return tokens
}

function click_bind(id, func, event) {
  var btn = document.getElementById(id)
  btn.addEventListener(event || "click", func, false)
}

!function hideSplash() {
  if (!window.editor) return setTimeout(hideSplash, 100)
  document.getElementById('header').setAttribute('style', 'height:1px; overflow:hidden')
}()

!function chooseREADME() {
  /** global demo_README_filename */
  for (var i = 0; i < navigator.languages.length; i++) {
    var lang = navigator.languages[i]

    if (lang === "zh-CN") demo_README_filename = "demo/README.zh-CN.md"
    else continue

    break
  }
}()

// Use CDN to load CodeMirror and other stuff
// only works on https://*.github.io/ and https://*.laobubu.net/
// useless for you (maybe)

!function CDNPatch() {
  if (!is_running_demo) return

  // inject requirejs to display progress.
  // just for fun
  var old_requirejs_load = requirejs.load
  requirejs.load = function (context, moduleId, url) {
    document.getElementById('loadingFileName').textContent = url
    return old_requirejs_load.call(this, context, moduleId, url)
  }

  // now seriously
  // Reload CSS from CDN
  var node_modules_RE = /^.*node_modules\//ig
  var styleLinks = Array.prototype.slice.call(document.querySelectorAll("link"))
  styleLinks.forEach(function (link) {
    var href = link.href
    if (!node_modules_RE.test(href)) return
    href = href.replace(node_modules_RE, demo_page_lib_baseurl)

    link.href = href
  })
}()

function ajax_load_file(url, callback) {
  var xmlhttp;
  if (window.XMLHttpRequest) { xmlhttp = new XMLHttpRequest() }
  else if (window.ActiveXObject) { xmlhttp = new ActiveXObject("Microsoft.XMLHTTP") }
  if (xmlhttp != null) {
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        callback(xmlhttp.responseText)
      }
    }
    xmlhttp.open("GET", url, true)
    xmlhttp.send(null)
  }
}
