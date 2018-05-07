// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// Auto show/hide markdown tokens like `##` or `*`
// Works with `hypermd` mode
//

(function (mod) {
  
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require("codemirror/lib/codemirror")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      "codemirror/lib/codemirror"
    ], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function (CodeMirror) {
  "use strict";

  var DEBUG = false

  ///////////////////////////////////////////////////////////////////////////
  /// Some utils


  /**
   * get LineView
   * 
   * @param {object} cm       editor instance
   * @param {number} line     line number since 0
   * @returns {object}
   */
  function getLineView(cm, line) {
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

  function MyStack() {
    this.stack = [null]
    this.top = null
    this.length = 0
  }
  MyStack.prototype.push = function (obj) {
    var stack = this.stack, pos = this.length++
    if (stack.length <= pos + 1) stack.push(obj)
    else stack[pos] = obj
    this.top = obj
  }
  MyStack.prototype.pop = function (obj) {
    var stack = this.stack, pos = this.length--
    var retval = stack[pos]
    stack[pos] = null
    this.top = stack[pos - 1]
    return retval
  }

  ///////////////////////////////////////////////////////////////////////////

  /**
   * TokenHider helps you hide/show CodeMirror tokens
   * 
   * @class
   * @param {CodeMirror.Editor} cm 
   */
  function TokenHider(cm) {
    this.cm = cm
    this.eventBinded = false
    this.tokenTypes = ""
    this.matchRegex = /^$/

    this.TSlines = [] // token-shown line numbers

    // functions that binded to `this`
    this._renderLine = this.renderLine.bind(this)
    this._cursorHandler = this.cursorHandler.bind(this)
  }

  /**
   * Set the token types that TokenHider shall hide/show.
   * @param {string} tokenTypes token types separated by `|`
   */
  TokenHider.prototype.setTokenTypes = function (tokenTypes) {
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

  /**
   * CodeMirror "renderLine" event handler. Fired right after the DOM element is built, 
   * before it is added to the document.
   * 
   * TokenHider shall rebuild its cache here.
   * 
   * @param {CodeMirror.Editor} cm 
   * @param {CodeMirror.LineHandle} line 
   * @param {HTMLPreElement} el 
   */
  TokenHider.prototype.renderLine = function (cm, line, el) {
    var lineNo = line.lineNo()
    var shallShowToken = this.TSlines.indexOf(lineNo) !== -1

    this.adjustLine(el, shallShowToken ? 1 : 0)
  }

  /**
   * Scan one line and retrive infos to show/hide
   * 
   * @param {CodeMirror.LineHandle} line 
   * @param {HTMLPreElement} lineEl 
   */
  TokenHider.prototype.buildLineInfo = function (line, lineEl) {
    // `nodes` are <span> and #text nodes inside this line
    // While enumerating `nodes`, before checking one node, make sure there is no text marked before it (or, is it a markerSpan ?)
    // Note: CodeMirror doesn't merge adjacent text nodes, thus, no need to worry about "plain text with [collapsed invisible mark] inside"
    var nodes = lineEl.children[0].childNodes

    /** @type {{end:number,start:number,string:string,type:string,state:object}[]} */
    var tokens = cm.getLineTokens(line)

    // First, build a sparse array. If a mark starts at char #i, then markers[i] will be it.
    /** @type {{span: HTMLSpanElement, length: number}[]} */
    var markers = new Array(line.text.length)
    for (var i = 0; i < markedSpans.length; i++) {
      var raw_info = line.markedSpans[i] // original info, CodeMirror format
      if (!raw_info.marker.collapsed) continue // we only care about collapsed

      var from = raw_info.from, len = raw_info.to - raw_info.from
      if (markers[from] && markers[from].length >= len) continue // a longer mark already exists

      markers[from] = {
        span: raw_info.marker.widgetNode, // notice: this could be null
        length: len
      }
    }

    // Prepare a stack
    // object inside this stack is
    /** @type {{from:number, to:number, el1:HTMLSpanElement, el2:HTMLSpanElement}} */
    var xspan

    // 2018-04-27 20:48 UTC+8
    // Suddenly I just don't want to go on.
    // So be lazy, stopped
    //-------------------------------------

    // Now, start enumerating nodes
    var ch = 0
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i]
      if (markers[ch]) { // a mark starts from current char!
        ch += markers[ch].length
        if (markers[ch].span === node) continue // whoops, current node is a markedSpan. Skip this node
      }

      var nodeTextLen = node.textContent.length
      ch += nodeTextLen
    }
  }

  /**
   * 
   * @param {CodeMirror.Editor} cm 
   */
  TokenHider.prototype.cursorHandler = function (cm) {
    /** @type {number[]} */
    var lineNums = cm.listSelections().map(function (e) { return e.head.line })
    if (lineNums.length > 1) lineNums.sort()

    /** @type {number[]} */
    var oldTSlines = this.TSlines

    // console.log(lineNums.join(","), "=======OLD=> " , oldTSlines.join(","))

    var diffCount = 0
    var i = 0, j = 0
    while (i < oldTSlines.length && j < lineNums.length) {
      var a = oldTSlines[i], b = lineNums[j]
      if (a < b) {
        // found one line that shall be recovered to hidden
        this.adjustLine(a, 0)
        i++ , diffCount++
      } else if (a === b) {
        // found one line no need to process
        i++ , j++
      } else {
        // found one line whose tokens shall be shown
        this.adjustLine(b, 1)
        j++ , diffCount++
      }
    }

    for (; i < oldTSlines.length; i++) this.adjustLine(oldTSlines[i], 0)
    for (; j < lineNums.length; j++) this.adjustLine(lineNums[j], 1)

    if (diffCount > 0 || oldTSlines.length !== lineNums.length) {
      this.TSlines = lineNums
    }
  }

  /**
   * Change one line's apperance. Call this function when cursor moved!
   * 
   * @param {number|HTMLPreElement} line 
   * @param {0|1} hideOrShow  0=hide all tokens    1=show all tokens
   */
  TokenHider.prototype.adjustLine = function (line, hideOrShow) {
    var pre
    var className = "HyperMD-token-hidden"

    if (typeof (line) === 'number') {
      var lineView = getLineView(this.cm, line)
      if (!lineView) return

      if (lineView.measure) lineView.measure.cache = {}
      pre = lineView.text
    } else {
      pre = line
    }

    // make sure we've get <pre> element.
    // NOTE: inside "cursorActivity" event, <pre> element might not exists
    if (pre) { 
      if (hideOrShow === 0) CodeMirror.addClass(pre, className)
      else if (hideOrShow === 1) CodeMirror.rmClass(pre, className)
    }
  }

  ///////////////////////////////////////////////////////////////////////////

  /** 
   * get TokenHider instance of `cm`. if not exists, create one. 
   * 
   * @returns {TokenHider}
   */
  function getTokenHider(cm) {
    if (!cm.hmd) cm.hmd = {}
    else if (cm.hmd.tokenHider) return cm.hmd.tokenHider

    var tokenHider = new TokenHider(cm)
    cm.hmd.tokenHider = tokenHider
    return tokenHider
  }

  var defaultTokenTypes = "em|code-block|strong|strikethrough|quote|code|header|task|link|escape-char|footref|hmd-stdheader"
  CodeMirror.defineOption("hmdHideToken", "", function (cm, newVal) {
    // complete newCfg with default values
    var hider = getTokenHider(cm)
    if (newVal === "(profile-1)") newVal = defaultTokenTypes

    hider.setTokenTypes(newVal)
    cm.refresh() //force re-render lines
  })
})