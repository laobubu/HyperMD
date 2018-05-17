// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE

// Folding and rendering with MathJax

(function (mod) {

  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require("codemirror/lib/codemirror"),
      require("./../hypermd"),
      require("codemirror/addon/display/panel")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      "codemirror/lib/codemirror",
      "./../hypermd",
      "codemirror/addon/display/panel"
    ], mod);
  else // Plain browser env
    mod(CodeMirror, HyperMD);
})(function (CodeMirror, HyperMD) {
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
  /// - (static method) isReady()    indicate that the Renderer is ready to execute

  /**
   * The default MathRenderer, using MathJax
   *
   * @param {HTMLDivElement} div container
   * @param {"display"|""} [mode] MathJax Mode
   */
  function MathJaxRenderer(div, mode) {
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

  MathJaxRenderer.isReady = function () {
    if (typeof MathJax === 'undefined') return false

    if (!MathJaxRenderer._mathjax_loading) {
      MathJax.Hub.Register.StartupHook("End", function () {
        // rewrite isReady function, always returns true
        MathJaxRenderer.isReady = function () { return true }
      })
      MathJaxRenderer._mathjax_loading = true
    }

    return false
  }

  MathJaxRenderer.prototype.clear = function () {
    var script = this.script
    script.innerHTML = ''

    if (this.jax) this.jax.Remove()

    this._cleared = true
  }

  /**
   * start rendering a Tex expression
   * @param {string} expr
   */
  MathJaxRenderer.prototype.startRender = function (expr) {
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
  MathJaxRenderer.prototype._TypesetDoneCB = function (finished_expr) {
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
    if (typeof (this.onChanged) === 'function') this.onChanged(this, finished_expr)
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
   * Process one line.
   *
   * @param {{line:number,ch:number}} curpos - avoid current editing formula
   * @param {object} line - lineHandle
   */
  function processLine(cm, curpos, line) {
    if (!line) return

    var lineNo = line.lineNo()
    var updatedPreview = false

    /** every char's style
     * @type {string[]} */
    var tokens = HyperMD.getEveryCharToken(line)

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
      if (!/\bmath-2/.test(tokens.length && tokens[0])) { // not inside multiline Tex block
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
   * @param {CodeMirror.TextMarker} marker
   * @param {number} chOffset >= 1
   */
  function breakMark(cm, marker, chOffset) {
    cm.operation(function () {
      var pos = marker.find().from
      pos = { line: pos.line, ch: pos.ch + ~~chOffset }
      cm.setCursor(pos)
      marker.clear()
    })
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

    var MathRenderer = getFold(cm).MathRenderer || MathJaxRenderer

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
    this.MathRenderer = foldDefaultOption.MathRenderer

    this._timeoutHandle = 0
    this._doFold = this.doFold.bind(this)
    this._rendererReady = false

    // preview panel and renderer

    // div > div2 > Tex
    var div = document.createElement('div')
    div.className = "HyperMD-math-preview HyperMD-math-preview-hidden"

    var divTitle = document.createElement('div')
    divTitle.textContent = this.previewTitle
    divTitle.className = "HyperMD-math-preview-title"
    div.appendChild(divTitle)

    var divSizeKeeper = document.createElement('div')
    divSizeKeeper.setAttribute("style", "float:left;width:1px;")
    div.appendChild(divSizeKeeper)

    var div2 = document.createElement('div')
    div2.className = "HyperMD-math-preview-content"
    div.appendChild(div2)

    // click this panel to close previewer
    div.addEventListener("click", function () {
      self.updatePreview("")
      cm.focus()
    }, false)

    var panel = cm.addPanel && cm.addPanel(div, { position: "bottom", stable: true })

    var MathRenderer = this.MathRenderer || MathJaxRenderer
    var renderer = new MathRenderer(div2, "display")
    renderer.onChanged = function () {
      if (DEBUG) console.log("PANEL CHANGED")
      if (panel && self._pv.last_expr) {
        if (/HyperMD-math-preview-hidden/.test(div.className)) {
          div.className = div.className.replace('HyperMD-math-preview-hidden', '')
        }
        divSizeKeeper.style.height = div2.offsetHeight + 'px'
        panel.changed()
        cm.scrollIntoView(cm.cursorCoords(false, 'local'))
      }
    }

    this._pv = {
      panel: panel,
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
    if (!this._rendererReady) {
      // renderer is not ready, can't render
      this._rendererReady = this.MathRenderer.isReady()
      if (!this._rendererReady) return
    }
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
    if (!pv.panel) return // panel addon unavailable, can't preview
    pv.last_expr = expr

    if (expr) {
      // render Tex
      if (DEBUG) console.log("PANEL start rendering", expr)
      pv.renderer.startRender(expr)
    } else {
      // remove panel
      if (!/HyperMD-math-preview-hidden/.test(pv.div.className)) {
        pv.div.className += " HyperMD-math-preview-hidden"
        pv.panel.changed()
      }
    }

    // cm.focus()
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
    previewTitle: "HyperMD Tex Preview", // title of preview panel
    MathRenderer: MathJaxRenderer, // a constructor function, creating a MathRenderer
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
      } else {
        cm.off("update", fold._doFold)
        cm.off("cursorActivity", fold._doFold)
      }
    }

    // update behavior
    fold._pv.divTitle.textContent = newCfg.previewTitle
    if (!newCfg.preview) fold.updatePreview("") // hide preview if needed

    // update Renderer
    if (newCfg.MathRenderer !== fold.MathRenderer) {
      fold._rendererReady = false
    }

    // if auto-rendering is enabled, but renderer is not ready...
    if (!fold._rendererReady && newCfg.interval) {
      HyperMD.tryToRun(function(){
        if (fold._rendererReady) return true // no need to run
        if (!newCfg.MathRenderer.isReady()) return false

        fold._rendererReady = true
        fold.doFold()

        return true
      })
    }

    // write new values into cm
    for (var k in foldDefaultOption) {
      fold[k] = newCfg[k]
    }
  })

})
