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
      var decorateKey = ev.altKey || ev.ctrlKey
      var nodeName = target.nodeName

      var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY }),
        line = cm.getLineHandle(pos.line), text = line.text,
        s = line.styles, i = 1

      while (s[i] && s[i] < pos.ch) i += 2
      if (!s[i]) return

      // now s[i+1] is current clicked token style
      // s[i] is where this token stops

      /**
       * 1: link
       * 2: todo-list line
       */
      var action = 0

      if (nodeName === "SPAN") {
        // open a link
        if (decorateKey && /cm-(?:link|url)/.test(targetClass)) action = 1

        // cursor directly on the checkbox, no need to press Ctrl or Alt key
        if (action === 0 && /cm-formatting-task/.test(targetClass)) action = 2

        // Ctrl+alt clicking a list line
        if (action === 0 && decorateKey && /cm-list/.test(targetClass)) {
          for (var i = 2; i < s.length; i+=2) {
            if (/formatting-task/.test(s[i])) {
              // toggle a todo-item (with ctrl or alt key)
              // this line contains todo checkbox
              action = 2
              break
            }
          }
        }
      }

      if (action === 0) return

      // link trace
      if (action === 1) {
        // find the url

        // find the tail token of current link
        var ti_end = i  // ti == token index
        while (/link|url/.test(s[ti_end + 1])) ti_end += 2
        ti_end -= 2

        // find the beginning token of current link
        var ti_begin = i
        while (/link|url/.test(s[ti_begin + 1])) ti_begin -= 2
        ti_begin += 2

        // find the beginning token of url (usually is [ or ( )
        var ti_urlbegin = ti_end - 2
        while (ti_urlbegin > ti_begin && !/formatting-link(?:-string)?/.test(s[ti_urlbegin + 1])) ti_urlbegin -= 2

        // now get all interesting char positions
        var ch_begin = s[ti_begin - 2] || 0 // char index
        var ch_end = s[ti_end] // last char index + 1
        var ch_separate = s[ti_urlbegin - 2] || 0

        var clickOnURL = pos.ch >= ch_separate && pos.ch <= ch_end
        var url = text.substr(ch_separate + 1, ch_end - ch_separate - 2) // bracket-free url string

        if (!url) return

        // whether `url` is a real url, not a reference
        var isRealURL = /^(?:mailto|tel|https?|ftp|wss?)\:|^[:\.]?\/\/?/i.test(url)

        // now we got the url
        if (!isRealURL) {
          var footnote = cm.hmdReadLink(url, pos.line)
          if (!footnote) return
          if ((ev.ctrlKey && clickOnURL) || (/hmd-footref/.test(targetClass))) {
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

        url = /^\S+/.exec(url)[0] // remove tailing title
        if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/.test(url)) url = "mailto:" + url
        else if (/^\d(?:[\d-]+)\d$/.test(url)) url = "tel:" + url.replace(/\D/g, '')

        then(function () {
          window.open(url, "_blank")
        }, ev.clientX, ev.clientY)
        return
      }

      // to-do list checkbox
      if (action === 2) {
        then(function () {
          var opos = text.indexOf('[') + 1
          cm.replaceRange(
            text.charAt(opos) === "x" ? " " : "x",
            { line: pos.line, ch: opos },
            { line: pos.line, ch: opos + 1 }
          )
        }, ev.clientX, ev.clientY)
      }
    }, true)
  }

  CodeMirror.defineExtension("hmdClickInit", init)
})