// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE

// Folding images & links

(function (mod) {
  var CODEMIRROR_ROOT = window.CODEMIRROR_ROOT || "codemirror/";
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require(CODEMIRROR_ROOT + "lib/codemirror")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      CODEMIRROR_ROOT + "lib/codemirror"
    ], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function (CodeMirror) {
  "use strict";

  var DEBUG = false

  function processRange(cm, fromLine, toLine) {
    var curpos = cm.getCursor()
    fromLine = ~~fromLine
    toLine = typeof toLine === "number" ? Math.min(~~toLine, cm.lineCount() - 1) : cm.lineCount() - 1
    cm.eachLine(fromLine, toLine + 1, processLine.bind(this, cm, curpos))
  }

  function processLine(cm, curpos, line) {
    var ch = -1, chStyle = ""//, chMarked = false

    if (!line) return

    // const DEBUG = line.lineNo() === 4

    var lineNo = line.lineNo()
    var avoid_ch = (curpos && (lineNo == curpos.line)) ? curpos.ch : -1

    // vars used while iterating chars
    var markedSpans = []
    var mask, maskIndex = 1
    var s = line.styles, sEnd = 0, s$i = 1

    if (line.markedSpans) {
      markedSpans = line.markedSpans.map(function (ms) { return ({ from: ms.from || 0, to: ms.to || line.text.length }) })
      markedSpans = markedSpans.sort(function (a, b) { return (a.from > b.from) })  // sort: small -> big
      if (DEBUG) console.log(JSON.stringify(markedSpans))
    }
    mask = markedSpans[0]

    if (DEBUG) {
      console.log("fold: process line #", lineNo)
    }

    if (!s) {
      if (DEBUG) console.log("fold: empty style at line", lineNo)
      return
      // s = [1], lastchStyle = null, ch = 0
      // //FIXME: too slow. shall do this when need (eg. after mode parsing ?)
      // console.log("oopsLine", lineNo)
      // cm.getLineTokens(lineNo).forEach(function (token) {
      //   ch++
      //   if (token.type !== lastchStyle) {
      //     lastchStyle = token.type
      //     s.push(ch, lastchStyle)
      //   }
      // })
      // s.push(ch, lastchStyle)
      // ch = 0
      // lastchStyle = ""
    }

    var insertSince = -1, urlSince, altSince
    var url, alt, urlIsFinal

    // replace looong URL into an icon
    var insertSince2 = -1
    var lastchStyle

    while (true) {
      // get current chStyle
      ++ch

      if (ch >= sEnd) {
        sEnd = s[s$i++]
        lastchStyle = chStyle
        chStyle = s[s$i++] || ""
        if (typeof sEnd != "number") break //all char are itered
      }

      // if (DEBUG) console.log("fold: iter to ", ch, chStyle)

      // check if current char is in a markedSpans
      // chMarked = false
      if (mask) {
        if (ch >= mask.from && ch <= mask.to) {  /* intersection exists */
          // chMarked = true
          // cannot insert link. reset status machine
          // ch = mask.to + 1
          insertSince = -1
          insertSince2 = -1
          // ch = mask.to 
          if (DEBUG) console.log("  fold: met mask ", mask.from, mask.to)
          continue
        } else {
          while (mask && ch > mask.to) {
            mask = markedSpans[maskIndex++]
          }
        }
      }

      // avoid current cursor
      if (ch === avoid_ch) {
        insertSince = -1
        insertSince2 = -1
        if (DEBUG) console.log("  fold: met avoid ch ", avoid_ch)
        continue
      }

      // status machine
      if (insertSince == -1) {
        if (/\simage-marker/.test(chStyle)) {
          // now start the inserting status
          insertSince = ch
          urlSince = 0
          altSince = 0
          alt = ""
        }
      } else {
        if (/image-alt-text/.test(chStyle)) {
          if (!altSince) {
            // find the start char of alt
            if (!/formatting/.test(chStyle)) altSince = ch
          } else {
            //find the end of alt
            if (/formatting/.test(chStyle)) {
              alt = line.text.substr(altSince, ch - altSince)
            }
          }
        } else if (/url/.test(chStyle)) {
          if (!urlSince) {
            // find the start char of url
            if (!/formatting-link-string/.test(chStyle)) urlSince = ch
          } else {
            //find the end of url
            if (/formatting-link-string/.test(chStyle)) {
              url = line.text.substr(urlSince, ch - urlSince)
              urlIsFinal = line.text[ch] == ")"     // false if meets `![][url_Ref]`

              // console.log("INSERT!", insertSince, urlSince, ch, alt, url, urlIsFinal)
              if (!urlIsFinal && cm.hmdReadLink) {
                var footnote = cm.hmdReadLink(url, lineNo)
                if (footnote) url = footnote.content
              }
              insertImageMark(cm, lineNo, insertSince, ++ch, alt, url)

              // end of the inserting status
              insertSince = -1
            }
          }
        }
      }

      if (insertSince == -1) {
        if (insertSince2 == -1) {
          if (!/image/.test(lastchStyle) && /formatting-link-string/.test(chStyle) && line.text[ch] === "(") {
            // now start the inserting status
            insertSince2 = ch
          }
        } else {
          if (/formatting-link-string/.test(chStyle) && line.text[ch] === ")") {
            url = line.text.substr(insertSince2 + 1, ch - insertSince2 - 1)
            insertLinkMark(cm, lineNo, insertSince2, ++ch, url)
            insertSince2 = -1
          }
        }

      }
    }
  }

  /**
   * move cursor to where marker is 
   * 
   * @param {number} chOffset
   */
  function breakMark(cm, marker, chOffset) {
    var line = marker.lines[0]
    for (var i = 0; i < line.markedSpans.length; i++) {
      var s = line.markedSpans[i]
      if (s.marker === marker) {
        cm.setCursor({ line: line.lineNo(), ch: s.from + ~~chOffset })
        return
      }
    }
  }

  function insertLinkMark(cm, line, ch1, ch2, url) {
    var img = document.createElement("span"), marker, title = ""
    var titleTest = /(\S+)\s+(['"])(.+)\2$/.exec(url)
    if (titleTest) {
      title = titleTest[3]
      url = titleTest[1]
    }
    img.setAttribute("class", "hmd-link-icon")
    img.setAttribute("title", url + "\n" + title)
    img.setAttribute("data-url", url)

    var update_pp2 = { line: line, ch: ch1 + 1 }
    marker = cm.markText({ line: line, ch: ch1 }, { line: line, ch: ch2 }, {
      className: "hmd-fold-link",
      replacedWith: img,
      clearOnEnter: true
    })
    img.addEventListener("click", function (ev) {
      if (ev.ctrlKey || ev.altKey) {
        window.open(url, "_blank")
        ev.preventDefault()
        return
      }
      breakMark(cm, marker, 1)
      cm.focus()
    }, false)
  }

  function insertImageMark(cm, line, ch1, ch2, alt, url) {
    var img = document.createElement("img"), marker
    var update_pp1 = { line: line, ch: ch1 }
    var update_pp2 = { line: line, ch: ch1 + 1 }
    var titleTest = /(\S+)\s+(['"]?)(.+)\2$/.exec(url)
    if (titleTest) {
      img.setAttribute("title", titleTest[3])
      url = titleTest[1]
    }
    img.setAttribute("alt", alt)
    img.setAttribute("class", "hmd-image hmd-image-loading")
    img.addEventListener("load", function () {
      img.classList.remove("hmd-image-loading")
      marker.changed()
    }, false)
    img.addEventListener("error", function() {
      img.classList.remove("hmd-image-loading")
      img.classList.add("hmd-image-error")
      marker.changed()
    })
    img.setAttribute("src", url)
    img.addEventListener("click", function () {
      breakMark(cm, marker, 2)
      cm.focus()
    }, false)

    marker = cm.markText({ line: line, ch: ch1 }, { line: line, ch: ch2 }, {
      className: "hmd-fold-image",
      replacedWith: img,
      clearOnEnter: true
    })

    // if (DEBUG) {
    //   // console.log("INSERT IMAGE", JSON.stringify(cm.getLineHandle(line).markedSpans.map(o => ({ from: o.from, to: o.to }))))
    //   // debugger
    // }
  }

  function Fold(cm) {
    this.cm = cm
    this.delay = 200
    this.timeoutHandle = 0

    this._doFold = this.doFold.bind(this)
  }
  Fold.prototype = {
    doFold: function () {
      var self = this, cm = self.cm
      if (self.timeoutHandle) clearTimeout(self.timeoutHandle)
      self.timeoutHandle = setTimeout(function () {
        self.timeoutHandle = 0
        cm.operation(function () {
          if (DEBUG) console.log("fold: rerender range", cm.display.viewFrom, cm.display.viewTo)
          processRange(cm, cm.display.viewFrom, cm.display.viewTo)
        })
      }, self.delay)
    }
  }

  function initFoldFor(cm) {
    if (!cm.hmd) cm.hmd = {}
    else if (cm.hmd.fold) return

    var fold = new Fold(cm)
    cm.hmd.fold = fold
    fold._doFold()
    return fold
  }

  CodeMirror.defineInitHook(function (cm) { initFoldFor(cm) })

  CodeMirror.defineOption("hmdAutoFold", 200, function (cm, newVal, oldVal) {
    var fold = cm.hmd && cm.hmd.fold || initFoldFor(cm)
    if (oldVal == 'CodeMirror.Init') oldVal = 0
    if ((newVal = ~~newVal) < 0) newVal = 0

    if (oldVal && !newVal) { // close this feature
      cm.off("update", fold._doFold)
      cm.off("cursorActivity", fold._doFold)
    }
    if (!oldVal && newVal) {
      cm.on("update", fold._doFold)
      cm.on("cursorActivity", fold._doFold)
    }
    fold.delay = newVal
  })

  // CodeMirror.defineInitHook(function (cm) {
  //   var fold = new Fold(cm)

  //   if (!cm.hmd) cm.hmd = {}
  //   cm.hmd.fold = fold
  //   fold._doFold()

  //   // //old failed codes
  //   // cm.on("changes", function (cm, changes) {
  //   //   var change = changes[0]
  //   //   cm.operation(processRange.bind(this, cm, change.from.line, change.to.line))
  //   // })
  //   // cm.on("cursorActivity", function (cm) {
  //   //   var pos = cm.getCursor()
  //   //   setTimeout(function () {
  //   //     // cm.operation(function () {
  //   //     if (lastCursorPos && lastCursorPos.line !== pos.line) {
  //   //       processLine(cm, pos, cm.getLineHandle(lastCursorPos.line))
  //   //     }

  //   //     lastCursorPos = pos
  //   //     processLine(cm, pos, cm.getLineHandle(pos.line))
  //   //     if (DEBUG) console.log("fold: cursor to", pos.line, pos.ch, cm.getLineHandle(pos.line).styles && "(line has styles)")
  //   //     // })
  //   //   }, 200)
  //   // })

  // })
})