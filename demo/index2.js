/* global editor, is_running_demo, HyperMD */

// the following code is just for test.
// useless for you.

function hmdModeLineInfo(lineNo) {
  if (lineNo === void 0) lineNo = cm.getCursor().line
  var tokens = cm.getLineTokens(lineNo)
  tokens = tokens.map(function (t) {
    return [t.string, t.type, t.state]
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

!function chooseFileName() {
  /** global demo_filename */

  // playground have fun
  if ("replaceState" in history) history.replaceState({ text: "", title: document.title }, document.title, location.href)

  if (location.hash.substr(0, 3) === '#./') {
    demo_filename = location.hash.substr(1)
    return
  }

  for (var i = 0; i < navigator.languages.length; i++) {
    var lang = navigator.languages[i]

    if (lang === "zh-CN") demo_filename = "./demo/README.zh-CN.md"
    else continue

    break
  }
}()

// Use CDN to load CodeMirror and other stuff
// only works on https://*.github.io/ and https://*.laobubu.net/
// useless for you (maybe)

!function CDNPatch() {
  // do not use relative href for svg, because <base>.href might change

  var svgUses = document.querySelectorAll("use")
  for (var i = 0; i < svgUses.length; i++) {
    var svgUse = svgUses[i]
    var href = svgUse.getAttribute("xlink:href")
    if (!href) continue
    href = demo_page_baseurl + href
    svgUse.setAttribute("xlink:href", href)
  }

  // inject requirejs to display progress.
  // just for fun
  var old_requirejs_load = requirejs.load
  requirejs.load = function (context, moduleId, url) {
    document.getElementById('loadingFileName').textContent = url
    return old_requirejs_load.call(this, context, moduleId, url)
  }

  if (is_running_demo) {
    // Reload CSS from CDN
    var node_modules_RE = /^.*node_modules\//ig
    var styleLinks = Array.prototype.slice.call(document.querySelectorAll("link"))
    styleLinks.forEach(function (link) {
      var href = link.href
      if (!node_modules_RE.test(href)) return
      href = href.replace(node_modules_RE, demo_page_lib_baseurl)

      link.href = href
    })
  }

}()

var $base = document.querySelector('base')

var current_baseuri = "./"
var current_url = ""
var history_op = "pushState"

window.onpopstate = function (ev) {
  var info = ev.state
  if (info && info.title) {
    document.title = info.title
    $base.href = current_baseuri = info.current_baseuri
    editor_area.className = editor_area.className.replace(" loading-file", "")
    editor.setValue(info.text)
  } else if (/^\#\.?\//.test(location.hash)) {
    // oops... bad status
    history_op = "replaceState"
    current_baseuri = "./" // hash path is always relative to index.html
    load_and_update_editor(location.hash.substr(1))
  }
}

function load_and_update_editor(url) {
  var editor_area = document.getElementById("editor_area")
  var clzName = editor_area.className
  editor_area.className = clzName + " loading_file"

  $base.href = demo_page_baseurl // url is always relative to index.html
  ajax_load_file(url, function (text, url) {
    editor_area.className = clzName

    var mat = text.match(/^\#+\s+(.+?)\s*\#*$/m)
    var title = "HyperMD: " + (mat ? (mat[1] + " (" + url + ")") : url)

    document.title = title
    if (history_op in history) history[history_op]({
      text: text,
      title: title,
      current_baseuri: current_baseuri,
    }, title, location.pathname + location.search + "#" + url)
    else location.hash = url

    history_op = "pushState"

    /** global allowDirectOpen */
    if (!allowDirectOpen && /\/docs\//.test(url)) allowDirectOpen = true

    $base.href = current_baseuri // for images in Markdown
    editor.setValue(text)
  })
}

/**
 * Send AJAX request, resolve relative url and update current_baseuri, current_url
 */
function ajax_load_file(url, callback) {
  if (url.charAt(0) === "/") url = "." + url
  else if (url.charAt(0) === ".") url = current_baseuri + url

  var nu
  while ((nu = url.replace(/[^\/]+\/..\//, "./").replace("/./", "/")) !== url) url = nu // resolve
  current_baseuri = (nu.replace(/\/[^\/]+$/, "") || ".") + "/"  // dirname
  current_url = url

  console.log("LOADING", url, current_baseuri)

  var xmlhttp;
  if (window.XMLHttpRequest) { xmlhttp = new XMLHttpRequest() }
  else if (window.ActiveXObject) { xmlhttp = new ActiveXObject("Microsoft.XMLHTTP") }
  if (xmlhttp != null) {
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        callback(xmlhttp.responseText, url)
      }
    }
    xmlhttp.open("GET", url, true)
    xmlhttp.send(null)
  }
}

/**
 * Handler for links like [Try out]
 */
function demo_tryout(info) {
  alert("Bazinga")
}
