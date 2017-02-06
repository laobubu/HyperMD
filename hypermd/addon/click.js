// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// when click with `alt` or `ctrl`, do something special
//

(function (mod) {
  var CODEMIRROR_ROOT = window.CODEMIRROR_ROOT || "codemirror/";
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require(CODEMIRROR_ROOT + "lib/codemirror"),
      require("./readlink")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      CODEMIRROR_ROOT + "lib/codemirror",
      "./readlink"
    ], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function (CodeMirror) {
  "use strict";

  /**
   * Init HyperMD Click addon. Where `this` is the editor instance.
   * 
   * Note: 
   *  if you need a "back" button before a footnote, please 
   * add "HyperMD-goback" into "gutters" option when init editor.
   */
  function init() {
    var cm = this
    if (!cm.hmd) cm.hmd = {}

    /** @type {HTMLDivElement} lineDiv */
    var lineDiv = cm.display.lineDiv

    var hasBackButton = cm.options.gutters.indexOf("HyperMD-goback") != -1

    if (hasBackButton) {
      var bookmark // where the footref is. designed for "back" button
      var backButton = document.createElement("div")
      backButton.className = "HyperMD-goback-button"
      backButton.addEventListener("click", function () {
        cm.setCursor(bookmark.find())
        cm.clearGutter("HyperMD-goback")
        bookmark.clear()
        bookmark = null
      })
      var _tmp1 = cm.display.gutters.children
      _tmp1 = _tmp1[_tmp1.length - 1]
      _tmp1 = _tmp1.offsetLeft + _tmp1.offsetWidth
      backButton.style.width = _tmp1 + "px"
      backButton.style.marginLeft = -_tmp1 + "px"
    }

    function then(func, clientX, clientY) {
      function evhandle(ev) {
        if (Math.abs(ev.clientX - clientX) < 5 && Math.abs(ev.clientY - clientY) < 5) func()
        lineDiv.removeEventListener("mouseup", evhandle, true)
      }
      lineDiv.addEventListener("mouseup", evhandle, true)
    }

    lineDiv.addEventListener("mousedown", function (ev) {
      var target = ev.target, targetClass = target.className
      if (target.nodeName !== "SPAN") return
      if (!(ev.altKey || ev.ctrlKey)) return

      var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY }),
        line = cm.getLineHandle(pos.line), txt = line.text,
        s = line.styles, i = 1, i2
      while (s[i] && s[i] < pos.ch) i += 2
      if (!s[i]) return

      if (/formatting-(?:link-string|footref)/.test(s[i + 1])) i += 2

      // link trace
      if (/cm-(link|url)/.test(targetClass)) {
        var url,   // the URL. title are stripped
          urlIsFinal,  // the URL NOT come from footnotes
          clickOnURL = false // user is clicking a URL/footref, not a link text
        if (/url/.test(s[i + 1]) || /^(?:https?|ftp)\:/.test(txt.substr(s[i - 2], 15)) || txt.charAt(s[i + 2] - 1) == '>') {
          //wow, a pure link
          url = txt.substr(s[i - 2], s[i] - s[i - 2])
          if (/footref/.test(s[i + 1])) url = "^" + url
          urlIsFinal = txt.charAt(s[i]) != ']'
          clickOnURL = true
        } else {
          // a Markdown styled link
          i2 = i += 2
          while (/formatting/.test(s[i + 1]) || !/url/.test(s[i + 1])) {
            if (!s[i]) return
            i2 = i; i += 2
          }
          url = txt.substr(s[i2], s[i] - s[i2])
          urlIsFinal = txt.charAt(s[i]) != ']'
        }

        // now we got the url
        if (!urlIsFinal) {
          var footnote = cm.hmdReadLink(url, pos.line)
          if (!footnote) return
          if ((ev.ctrlKey && clickOnURL) || (/footref/.test(targetClass))) {
            // setTimeout(function(){
            // console.log("foot trace")
            then(function () {
              setTimeout(function () {
                if (hasBackButton) {
                  if (bookmark) {
                    cm.clearGutter("HyperMD-goback")
                    bookmark.clear()
                  }

                  bookmark = cm.setBookmark({ line: pos.line, ch: s[i] })
                  cm.setGutterMarker(footnote.line, "HyperMD-goback", backButton)
                  backButton.innerHTML = pos.line + 1
                }

                cm.setCursor({ line: footnote.line, ch: 0 })
              }, 50)
            }, ev.clientX, ev.clientY)
            // }, 200)
            return
          }
          url = footnote.content
        }

        url = /^\S+/.exec(url)[0]
        if (/^\<.+\>$/.test(url)) url = url.substr(1, url.length - 2) // some legacy Markdown syntax
        if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/.test(url)) url = "mailto:" + url
        else if (/^\d(?:[\d-]+)\d$/.test(url)) url = "tel:" + url.replace(/\D/g, '')

        then(function () {
          window.open(url, "_blank")
        }, ev.clientX, ev.clientY)
        return
      }

      // to-do list checkbox
      if (/cm-formatting-task/.test(targetClass)) {
        then(function () {
          cm.replaceRange(
            target.textContent == "[x]" ? "[ ]" : "[x]",
            { line: pos.line, ch: s[i] - 3 },
            { line: pos.line, ch: s[i] }
          )
        }, ev.clientX, ev.clientY)
      }
    }, true)
  }

  CodeMirror.defineExtension("hmdClickInit", init)
})