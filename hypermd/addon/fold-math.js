// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE

// Folding and rendering with MathJax

(function (mod) {
  var CODEMIRROR_ROOT = window.CODEMIRROR_ROOT || "codemirror/";
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require(CODEMIRROR_ROOT + "lib/codemirror"),
      require(CODEMIRROR_ROOT + "addon/display/panel")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      CODEMIRROR_ROOT + "lib/codemirror",
      CODEMIRROR_ROOT + "addon/display/panel"
    ], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function (CodeMirror) {
  "use strict";

  var DEBUG = false


  ///////////////////////////////////////////////////////////////////////////////////
  /// MathRenderer Class
  /// Controlling one Tex widget
  ///
  /// Your MathRenderer must have:
  /// - constructor(div_container, mode)
  /// - startRender(expr)
  /// - clear()
  /// - onChanged   (property, points to a callback function, called when a rendering work is done)

  /**
   * The default MathRenderer, using MathJax
   * 
   * @param {HTMLDivElement} div container
   * @param {"display"|""} [mode] MathJax Mode
   */
  function MathRenderer(div, mode) {
    var script = document.createElement("script")
    script.setAttribute("type", mode ? 'math/tex; mode=' + mode : 'math/tex')
    div.appendChild(script)

    this.div = div
    this.mode = mode
    this.script = script
    this.jax = null

    this.onChanged = null

    this._cleared = false
    this._renderingExpr = "" // Currently rendering expr
  }

  MathRenderer.prototype.clear = function () {
    var script = this.script
    script.innerHTML = ''

    if (this.jax) this.jax.Remove()

    this._cleared = true
  }

  /**
   * start rendering a Tex expression
   * @param {string} expr 
   */
  MathRenderer.prototype.startRender = function (expr) {
    if (this._cleared) {
      return
    }

    if (this._renderingExpr) {
      // A new rendering job comes, while previous one is still in progress
      // Do rendering later, in _TypesetDoneCB function
      this._renderingExpr = expr
      return
    }

    this._renderingExpr = expr

    var script = this.script
    script.innerHTML = expr

    if (this.jax) {
      MathJax.Hub.Queue(
        ["Text", this.jax, expr],
        ["_TypesetDoneCB", this, expr]
      )
    } else {
      this.jax = MathJax.Hub.getJaxFor(script)
      MathJax.Hub.Queue(
        ["Typeset", MathJax.Hub, script],
        ["_TypesetDoneCB", this, expr]
      )
    }
  }

  /**
   * When MathJax finishes rendering, it shall call this function
   * 
   * @private
   */
  MathRenderer.prototype._TypesetDoneCB = function (finished_expr) {
    if (this._cleared) {
      return
    }

    if (this._renderingExpr !== finished_expr) {
      // Current finished rendering job is out-of-date
      // re-render with newest Tex expr
      var expr_new = this._renderingExpr
      this._renderingExpr = ""
      this.startRender(expr_new)
      return
    }

    // Rendering finished. Nothing wrong
    this._renderingExpr = ""
    if (typeof (this.onChanged) === 'function') this.onChanged(this)
  }

  ///////////////////////////////////////////////////////////////////////////////////

  function processRange(cm, fromLine, toLine) {
    var curpos = cm.getCursor()
    fromLine = ~~fromLine
    toLine = typeof toLine === "number" ? Math.min(~~toLine, cm.lineCount() - 1) : cm.lineCount() - 1
    cm.eachLine(fromLine, toLine + 1, processLine.bind(this, cm, curpos))
  }

  /**
   * Compare two positions, return 0 if they are the same, a negative
   * number when a is less, and a positive number otherwise.
   */
  function cmp(a, b) { return a.line - b.line || a.ch - b.ch }

  /**
   * find next token's position.
   * 
   * @param {RegExp|function} condition if regex, test the token.type; if function, test `token` object. see `tokens`
   * @param {{line:number,ch:number}} [from]
   * @returns {{line:number,ch:number,token:{end:number,start:number,string:string,type:string}}} pos or null
   */
  function findToken(cm, condition, from) {
    var beginCh = from && from.ch || 0
    var isFunc = typeof condition === 'function'
    var lineCount = cm.lineCount()

    for (var line = from && from.line || 0; line < lineCount; line++) {
      /** @type {{end:number,start:number,string:string,type:string}[]} */
      var tokens = cm.getLineTokens(line)

      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i], match = false
        if (!token || token.start < beginCh) continue

        if (isFunc) match = condition(token)
        else match = condition.test(token.type)

        if (match) {
          return { line: line, ch: token.start, token: token }
        }
      }

      beginCh = 0
    }

    return null
  }

  /**
   * CodeMirror's getLineTokens might merge chars with same styles, but this won't.
   * 
   * This one will consume more memory.
   * 
   * @param {LineHandle} line 
   * @returns {string[]}
   */
  function getEveryCharToken(line) {
    var ans = new Array(line.text.length)
    var ss = line.styles
    var i = 0

    if (ss) {
      // CodeMirror already parsed this line. Use cache
      for (var j = 1; j < ss.length; j += 2) {
        var i_to = ss[j], s = ss[j + 1]
        while (i < i_to) ans[i++] = s
      }
    } else {
      // Emmm... slow method
      var cm = line.parent.cm || line.parent.parent.cm || line.parent.parent.parent.cm
      ss = cm.getLineTokens(line.lineNo())
      for (var j = 0; j < ss.length; j ++) {
        var i_to = ss[j].end, s = ss[j].type
        while (i < i_to) ans[i++] = s
      }
    }
    return ans
  }

  window.getEveryCharToken = getEveryCharToken

  /**
   * Process one line.
   * 
   * @param {{line:number,ch:number}} curpos - avoid current editing formula
   * @param {object} line - lineHandle
   */
  function processLine(cm, curpos, line) {
    if (!line) return

    var lineNo = line.lineNo()
    var updatedPreview = false

    /** every char's style @type {string[]} */
    var tokens = getEveryCharToken(line)

    // we shall avoid processing marked texts
    if (line.markedSpans) {
      for (var ch = 0; ch < line.markedSpans.length; ch++) {
        var mark = line.markedSpans[ch]
        if (!mark.marker.collapsed) continue

        // note: `mark.to === null` means this marker spans lines
        var end = mark.to === null ? (tokens.length - 1) : mark.to
        for (var j = mark.from; j <= end; j++) {
          tokens[j] = null
        }
      }
    }

    // now start searching for unmarked maths
    for (var ch = 0; ch < tokens.length; ch++) {
      var token = tokens[ch]
      if (!token) {
        while (++ch < tokens.length && !tokens[ch]); // if chars are marked, skip them
        if (ch >= tokens.length) break // whoops, no more char in this line

        token = tokens[ch]
      }

      if (/formatting-math-begin/.test(token)) {
        // found beginning
        var mathLevel = ~~ /\bmath-(\d+)/.exec(token)[1]
        var beginPos = { line: lineNo, ch: ch }

        // searching for the end
        var endPos = findToken(cm, /formatting-math-end/, beginPos)
        if (!endPos) {
          if (DEBUG) console.log("Failed to find end of math , sicne ", beginPos)
          continue
        }
        endPos.ch += mathLevel

        // extract the Tex expression
        var expr
        if (endPos.line === lineNo) {
          // same line, extract expr with substr
          expr = line.text.substr(ch + mathLevel, endPos.ch - ch - mathLevel * 2)
        } else {
          expr = cm.getRange(beginPos, endPos)
          expr = expr.slice(mathLevel, -mathLevel)  // strip "$" or "$$"
        }
        if (DEBUG) console.log("Found math at ", beginPos, endPos, expr)

        // inserMathMark or updatePreview
        if (cmp(curpos, beginPos) >= 0 && cmp(curpos, endPos) <= 0) {
          // cursor is inside this math block
          // we shall do preview, instead of insertMathMark
          updatePreview(cm, line, expr)
          updatedPreview = true
        } else {
          // everything is good. insertMathMark
          var className = "cm-math-" + mathLevel
          insertMathMark(cm, beginPos, endPos, expr, className)
        }

        // skip processed chars
        if (endPos.line !== lineNo) break // nothing left in this line
        else ch = endPos.ch
      }
    }

    // hide preview panel if necessary
    if (lineNo === curpos.line) {
      if (!/\bmath-2/.test(tokens.length && tokens[0] && tokens[0].type)) { // not inside multiline Tex block
        if (!updatedPreview) { // not trigged updatePreview
          // then, hide it
          updatePreview(cm, line, "")
        }
      }
    }
  }

  /**
   * move cursor to where marker is 
   * 
   * @param {number} chOffset >= 1
   */
  function breakMark(cm, marker, chOffset) {
    var line = marker.lines[0], ms = line.markedSpans
    for (var i = 0; i < ms.length; i++) {
      var s = ms[i]
      if (s.marker === marker) {
        cm.setCursor({ line: line.lineNo(), ch: s.from + ~~chOffset })
        return
      }
    }
  }

  function insertMathMark(cm, p1, p2, expression, className) {
    var span = document.createElement("span"), marker
    span.setAttribute("class", "hmd-fold-math " + className || '')
    span.setAttribute("title", expression)

    if (DEBUG) console.log("insert", p1, p2, expression)

    marker = cm.markText(p1, p2, {
      className: "hmd-fold-math",
      replacedWith: span,
      clearOnEnter: true
    })
    span.addEventListener("click", function (ev) {
      breakMark(cm, marker, 1)
      cm.focus()
    }, false)

    var mathRenderer = new MathRenderer(span, "")
    mathRenderer.onChanged = function () { marker.changed() }
    marker.on("clear", function () { mathRenderer.clear() })
    mathRenderer.startRender(expression)
  }

  /**
   * show / hide a math preview.
   * 
   * @param {object|number} line
   * @param {string} [expr] expression
   */
  function updatePreview(cm, line, expr) {
    if (DEBUG) console.log("math-preview: ", expr)

    var hostAddon = cm.hmd.foldMath
    if (hostAddon.preview) hostAddon.updatePreview(expr)
  }

  function Fold(cm) {
    var self = this

    this.cm = cm
    this.interval = foldDefaultOption.interval
    this.preview = foldDefaultOption.preview
    this.previewTitle = foldDefaultOption.previewTitle

    this._timeoutHandle = 0
    this._doFold = this.doFold.bind(this)

    // preview panel and renderer

    // div > div2 > Tex
    var div = document.createElement('div')
    div.className = "HyperMD-math-preview"

    var divSizeKeeper = document.createElement('div')
    divSizeKeeper.style.cssFloat = "left"
    div.appendChild(divSizeKeeper)

    var divTitle = document.createElement('div')
    divTitle.textContent = this.previewTitle
    divTitle.className = "HyperMD-math-preview-title"
    div.appendChild(divTitle)

    var div2 = document.createElement('div')
    div2.className = "HyperMD-math-preview-content"
    div.appendChild(div2)

    // click this panel to close previewer
    div.addEventListener("click", function () {
      self.updatePreview("")
      cm.focus()
    }, false)

    var renderer = new MathRenderer(div2, "display")
    renderer.onChanged = function () {
      if (DEBUG) console.log("PANEL CHANGED")
      if (self._pv.panel) {
        divSizeKeeper.style.height = (divTitle.offsetHeight + div2.offsetHeight) + 'px'
        self._pv.panel.changed()
      }
    }

    this._pv = {
      panel: null,
      div: div,
      divTitle: divTitle,
      div2: div2,
      renderer: renderer,
      last_expr: null,
    }
  }

  /**
   * Process every visible line , fold and render Tex expressions
   */
  Fold.prototype.doFold = function () {
    var self = this, cm = self.cm
    if (self._timeoutHandle) clearTimeout(self._timeoutHandle)
    self._timeoutHandle = setTimeout(function () {
      self._timeoutHandle = 0
      cm.operation(function () {
        processRange(cm, cm.display.viewFrom, cm.display.viewTo)
      })
    }, self.interval)
  }

  /**
   * Update preview, or close preview panel (if `!expr`)
   * 
   * NOTE: calling this function will force to show a panel, even if `this.preview === false`.
   * 
   * @param {string|null} expr 
   */
  Fold.prototype.updatePreview = function (expr) {
    var pv = this._pv, cm = this.cm

    if (expr === pv.last_expr) return
    pv.last_expr = expr

    if (expr) {
      // (optionally) create panel
      if (!pv.panel) {
        pv.panel = cm.addPanel(pv.div, { position: "bottom", stable: true })
      }
      // render Tex
      if (DEBUG) console.log("PANEL start rendering", expr)
      pv.renderer.startRender(expr)
    } else {
      // remove panel
      if (pv.panel) {
        pv.panel.clear()
        pv.panel = null
      }
    }

    cm.focus()
    cm.scrollIntoView(cm.getCursor('head'))
  }

  /////////////////////////////////////////////////////////////////////////////////////

  /** get Fold instance of `cm`. if not exists, create one. */
  function getFold(cm) {
    if (!cm.hmd) cm.hmd = {}
    else if (cm.hmd.foldMath) return cm.hmd.foldMath

    var fold = new Fold(cm)
    cm.hmd.foldMath = fold
    return fold
  }

  var foldDefaultOption = { // exposed options. also see Fold class.
    interval: 0,    // auto rendering interval, 0 = off
    preview: false,  // provide a preview while inputing a formula
    previewTitle: "HyperMD Tex Previewer. Click to Close", // title of preview panel
  }

  CodeMirror.defineOption("hmdFoldMath", foldDefaultOption, function (cm, newVal, oldVal) {
    // complete newCfg with default values
    var fold = getFold(cm)
    var newCfg = {}

    for (var k in foldDefaultOption) {
      newCfg[k] = newVal.hasOwnProperty(k) ? newVal[k] : foldDefaultOption[k]
    }

    // on/off auto features
    if (!fold.interval !== !newCfg.interval) {
      if (newCfg.interval) { // auto render is enabled
        cm.on("update", fold._doFold)
        cm.on("cursorActivity", fold._doFold)
        MathJax.Hub.Register.StartupHook("End", function () {
          fold._doFold()
        })
      } else {
        cm.off("update", fold._doFold)
        cm.off("cursorActivity", fold._doFold)
      }
    }

    // update behavior
    fold._pv.divTitle.textContent = newCfg.previewTitle
    if (!newCfg.preview) fold.updatePreview("") // hide preview if needed

    // write new values into cm
    for (var k in foldDefaultOption) {
      fold[k] = newCfg[k]
    }
  })

})