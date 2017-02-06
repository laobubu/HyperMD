// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// Auto show/hide markdown tokens like `##` or `*`
// Works with `hypermd` mode
//

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

  var DEBUG_PATCHING = false

  /**
   * check if every element in `search` can be found in `bigarray` 
   * 
   * ( search ⊂ bigarray )
   * 
   * [EDGE CASE] if `search` is empty, this will return `false`
   * 
   * @param {any[]} bigarray
   * @param {any[]} search
   * @returns {boolean}
   */
  function arrayContainsArray(bigarray, search) {
    if (!search.length) return false
    var search2 = search.slice(0)
    for (var i = 0; i < bigarray.length; i++) {
      var cmp1 = bigarray[i]
      for (var j = 0; j < search2.length; j++) {
        var cmp2 = search2[j]
        if (cmp1 === cmp2) {
          search2.splice(j--, 1)
        }
      }
    }
    return search2.length === 0
  }

  /**
   * check if there is nonempty intersection of `A` and `B` (, optionally, get the intersection)
   * 
   * ( A ∩ B ≠ ∅ )
   * 
   * [EDGE CASE] if `A` or `B` is empty, return `false`
   * 
   * @param {any[]} A
   * @param {any[]} B
   * @param {boolean} [returns_intersection]   true if you need the content of the intersection. slower
   * @returns {boolean|any[]}
   */
  function arrayIntersection(A, B, returns_intersection) {
    if (!A.length || !B.length) return false

    var search2 = B.slice(0), intersection = []
    for (var i = 0; i < A.length; i++) {
      var cmp1 = A[i]
      for (var j = 0; j < search2.length; j++) {
        var cmp2 = search2[j]
        if (cmp1 === cmp2) {
          if (!returns_intersection) return true
          intersection.push(search2.splice(j--, 1))
        }
      }
    }

    return intersection.length && intersection || false
  }

  /**
   * get class name list
   * 
   * @param {Element} ele
   * @returns {string[]}
   */
  function getClassList(ele) {
    return (ele && ele.className && ele.className.trim().split(/[\s\r\n]+/)) || []
  }

  /**
   * get LineView
   * 
   * @param {object} cm       editor instance
   * @param {number} line     line number since 0
   * @returns {object}
   */
  function getLineView(cm, line) {
    // since some lines might be folded, the following method is unreliable:
    //    return cm.display.view[line - cm.display.viewFrom]
    // thus, use Bisection method to find the line
    // initial: (p2 + p1)/2 = line - p1
    // var p1 = cm.display.viewFrom, p2 = line * 2 - p1 * 3, v, dbgg = 0
    // while (p1 != p2) {
    //   v = ~~((p1 + p2) / 2) //floor
    //   var ret = cm.display.view[v], lno = ret && ret.line.lineNo() || line //dont know what am i doing
    //   if (lno == line) return ret
    //   if (lno > line) p2 = v
    //   if (lno < line) p1 = v
    //   if (dbgg++ == 20) {
    //     debugger
    //   }
    // }
    var i = line - cm.display.viewFrom, v, vl
    if (i >= cm.display.view.length) i = cm.display.view.length - 1
    v = cm.display.view[i]
    if (!v || (vl = v.line.lineNo()) == line) return v
    if (vl < line) {
      while (vl < line && ++i < cm.display.view.length) {
        v = cm.display.view[i]
        if (!v || (vl = v.line.lineNo()) == line) return v
      }
      return null
    }
    if (vl > line) {
      while (vl > line && i--) {
        v = cm.display.view[i]
        if (!v || (vl = v.line.lineNo()) == line) return v
      }
    }
    return null
  }

  /**
   * (for patchFormattingSpan) line style checker
   * 
   * @param {NodeList} spans
   */
  function _IsIndentCodeBlock(spans) {
    if (!(spans.length >= 2 && /^\s+$/.test(spans[0].textContent))) return false
    for (var i = 1; i < spans.length; i++) {
      if (!/\bcm-(?:tab|inline-code)\b/.test(spans[i].className)) return false
    }
    return true
  }


  /** 
   * adding/removing `cm-formatting-hidden` to/from the <span>s that contain Markdown tokens (eg. `### ` or `~~`)
   * 
   * a member of class `HideToken`
   * 
   * @param {object} cm                       CodeMirror editor instance
   * @param {Element} line                    The <pre> element
   * @param {{line:number, ch?:number}} pos   Current cursor position. Nearby Markdown tokens will show up.
   * @param {boolean} [rebuildCache]          Empty cursor position cache data or not. Expensive. (see `cursorCoords`)
   */
  function patchFormattingSpan(cm, line, pos, rebuildCache) {
    if (!line) return

    var line2 = line.children[0]   // the container of <span>s. <pre class="CodeMirror-line"><span style=""> ... real content ...
    var spans = line2.childNodes

    //FIXME: partial-cross-line marks are currently not supported
    var textmark_itered = 0
    var char_itered = 0

    /** @type {HTMLElement} */
    var span = null
    var span_i = 0

    /** @type {{[index:number]: any}} */
    var visible_span_indices = {}

    // // fix setextHeader problem
    // if (spans.length === 1 && 
    //     /\scm-formatting-header\s/.test(spans[0].className) && 
    //     /^\s*(?:\={3,}|-{3,})\s*$/.test(spans[0].textContent)
    // ) {
    //     // turn last line into header
    //     //TODO: use more elegant way to implement this
    //     var last_line = line.parentElement.previousElementSibling.lastElementChild
    //     last_line.firstElementChild.classList.add("cm-header", /cm-header-\d/.exec(spans[0].className))
    // }

    var lineView = getLineView(cm, pos.line)
    var tokenState = lineView && lineView.line.stateAfter ||  // use cached data is much faster
      cm.getTokenAt({ line: pos.line + 1, ch: 0 }).state      // but sometimes the data does not exists.
    var tokenStateBase = tokenState // raw token state from Markdown
    while (tokenStateBase.base) tokenStateBase = tokenStateBase.base

    /////////////////////////////////////////////////////////////
    /// adding className to <pre> for some special lines

    var firstSpanClassList = spans[0] && spans[0].classList
    function findSpanWithClass(className) {
      if (!spans) return null
      for (var i = 0; i < spans.length; i++) {
        var rtn = spans[i]
        if (rtn.classList && rtn.classList.contains(className)) return rtn
      }
      return null
    }

    // adding cm-quote indent placeholder
    if (
      // !firstSpanHasClass('hmd-quote-indent') &&
      tokenStateBase.quote
    ) {
      line.classList.add('hmd-quote-indent')
      line.classList.add('hmd-quote-indent-' + tokenStateBase.quote)
    }

    // adding class to code block (GFM)
    if (tokenStateBase.fencedChars) {
      if (line2.querySelector('.cm-formatting-code-block'))
        line.classList.add('hmd-codeblock-end')
      else
        line.classList.add('hmd-codeblock')
    } else if (line2.querySelector('.cm-formatting-code-block')) {
      line.classList.add('hmd-codeblock-start')
    }

    // adding class to code block (indent)
    if (_IsIndentCodeBlock(spans)) {
      line.classList.add('hmd-codeblock-indent')
      line.classList.add('hmd-codeblock')
    }

    // adding footnote
    if (findSpanWithClass("cm-hmd-footnote")) {
      line.classList.add('hmd-footnote-line')
    }

    // adding class to code block (GFM)
    if (tokenStateBase.listStack && findSpanWithClass("cm-list-" + tokenStateBase.listStack.length)) {
      line.classList.add('hmd-list')
      line.classList.add('hmd-list-' + tokenStateBase.listStack.length)
    }

    // adding header stuff
    var _cnextLineToken = cm.getTokenTypeAt({ line: pos.line + 1, ch: 0 })
    var _hlevel = null
    if (_cnextLineToken && (_hlevel = /hmd-stdheader-(\d)/.exec(_cnextLineToken))) _hlevel = _hlevel[1]
    else if (spans[0] && (_hlevel = /cm-header-(\d)/.exec(spans[0].className))) _hlevel = _hlevel[1]
    if (_hlevel) {
      line.classList.add('hmd-stdheader')
      line.classList.add('hmd-stdheader-' + _hlevel)
    }


    /////////////////////////////////////////////////////////////
    /// Find the span where cursor is on, then hide/show spans

    if (typeof pos.ch === "number") {
      if (DEBUG_PATCHING) console.log("[PATCH] pos = ", pos)

      for (span_i = 0; span_i < spans.length; span_i++) {
        span = spans[span_i]
        if (span.classList && span.classList.contains('CodeMirror-widget')) {
          if (lineView) { //FIXME: remove this and scroll to reproduce the bug
            var local_mark = lineView.line.markedSpans[textmark_itered++]
            char_itered += local_mark.to - local_mark.from
            span = spans[span_i + 1]
          }
        } else {
          var text = span.textContent
          char_itered += text.length
        }
        if (char_itered >= pos.ch) break
      }

      if (DEBUG_PATCHING) console.log("[PATCH] span = ", span, span_i)

      if (span && span.nodeType === Node.ELEMENT_NODE) {
        var classList1 = getClassList(span)

        if (DEBUG_PATCHING) console.log("current span is ", span, "\n with classList: ", classList1.join(", "))

        // if current cursor is on a token, set `span` to the content and re-retrive its class string[]
        if (span.classList.contains('cm-formatting')) {
          visible_span_indices[span_i] = true // if the token is incompleted, it's still visible

          if (arrayContainsArray(classList1, getClassList(span.nextSibling))) {
            span = span.nextSibling
            span_i++
          } else if (arrayContainsArray(classList1, getClassList(span.previousSibling))) {
            span = span.previousSibling
            span_i--
          }

          classList1 = getClassList(span)
          if (DEBUG_PATCHING) console.log("rewind to", span, "\n with classList: ", classList1.join(", "))
        }

        // a trick
        classList1.push('cm-formatting')

        // forward search
        var span_tmp = span, span_tmp_i = span_i
        while (span_tmp_i++ , span_tmp = span_tmp.nextSibling) {
          var classList2 = getClassList(span_tmp)
          visible_span_indices[span_tmp_i] = true

          if (DEBUG_PATCHING) console.log("forward:  adding ", span_tmp, "(" + span_tmp_i + ")")

          if (arrayContainsArray(classList2, classList1)) break
        }

        // backward search
        var span_tmp = span, span_tmp_i = span_i
        while (span_tmp_i-- , span_tmp = span_tmp.previousSibling) {
          var classList2 = getClassList(span_tmp)
          visible_span_indices[span_tmp_i] = true

          if (DEBUG_PATCHING) console.log("backward: adding ", span_tmp, "(" + span_tmp_i + ")")

          if (arrayContainsArray(classList2, classList1)) break
        }
      }
    }

    // ~~TODO: cache status~~  not necessary
    // console.time("hide/show tokens")
    for (var i = 0; i < spans.length; i++) {
      span = spans[i]
      if (
        span.nodeType === Node.ELEMENT_NODE &&
        this.matchRegex.test(span.className)
      ) {
        if (!visible_span_indices[i]) {
          span.classList.add('cm-formatting-hidden')
        } else {
          span.classList.remove('cm-formatting-hidden')
        }
      }
    }
    // console.timeEnd("hide/show tokens")

    if (rebuildCache /* && visible_span_indices_changed */) {
      // remove caches of the chars after the current cursor
      getLineView(cm, pos.line).measure.cache = {}
      // var cache = getLineView(cm, pos.line).measure.cache
      // for (var key in cache) {
      //     var ch = parseInt(key)
      //     if (ch >= pos.ch) delete cache[key]
      // }
    }
  }

  function HideToken(cm) {
    this.cm = cm
    this.eventBinded = false
    this.tokenTypes = ""
    this.matchRegex = /^$/

    this._renderLine = this.renderLine.bind(this)

    this.lastCursorPos = { line: 0, ch: 0 }
    this._cursorHandler = this.cursorHandler.bind(this)
  }

  HideToken.prototype.setTokenTypes = function (tokenTypes) {
    this.tokenTypes = tokenTypes
    this.matchRegex = new RegExp("\\scm-formatting-(" + tokenTypes + ")(?:\\s|$)")

    if (this.eventBinded ^ !!tokenTypes) {
      var cm = this.cm
      if (tokenTypes) {
        cm.on("renderLine", this._renderLine)
        cm.on("cursorActivity", this._cursorHandler)
      } else {
        cm.off("renderLine", this._renderLine)
        cm.off("cursorActivity", this._cursorHandler)
      }
      this.eventBinded = !!tokenTypes
    }
  }

  HideToken.prototype.renderLine = function (cm, line_handle, ele) {
    var pos = cm.getCursor()
    var line = ele
    var linenum = line_handle.lineNo()
    this.patchFormattingSpan(cm, line, (linenum === pos.line) && pos || { line: linenum })
  }

  HideToken.prototype.cursorHandler = function (cm) {
    var pos = cm.getCursor(), lastCursorPos = this.lastCursorPos
    if (lastCursorPos.line !== pos.line) {
      var line = getLineView(cm, lastCursorPos.line)
      if (line) {
        this.patchFormattingSpan(cm, line.text, { line: lastCursorPos.line })
        if (line.measure) line.measure.cache = {}
      }
    }
    var line = getLineView(cm, pos.line)
    if (line) {
      this.patchFormattingSpan(cm, line.text, pos, true)
    }
    this.lastCursorPos = pos
    if (DEBUG_PATCHING) console.log("cursor fly to ", pos)
  }

  HideToken.prototype.patchFormattingSpan = patchFormattingSpan

  /** get Hide instance of `cm`. if not exists, create one. */
  function getHide(cm) {
    if (!cm.hmd) cm.hmd = {}
    else if (cm.hmd.hideToken) return cm.hmd.hideToken

    var fold = new HideToken(cm)
    cm.hmd.hideToken = fold
    return fold
  }

  var defaultTokenTypes = "em|code-block|strong|strikethrough|quote|code|header|task|link|escape-char|footref|hmd-stdheader"
  CodeMirror.defineOption("hmdHideToken", "", function (cm, newVal) {
    // complete newCfg with default values
    var hide = getHide(cm)
    if (newVal === "(profile-1)") newVal = defaultTokenTypes

    hide.setTokenTypes(newVal)
    cm.refresh() //force re-render lines
  })
})