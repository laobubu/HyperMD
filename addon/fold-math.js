/*!
 * HyperMD, copyright (c) by laobubu
 * Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
 *
 * Break the Wall between writing and preview, in a Markdown Editor.
 *
 * HyperMD makes Markdown editor on web WYSIWYG, based on CodeMirror
 *
 * Homepage: http://laobubu.net/HyperMD/
 * Issues: https://github.com/laobubu/HyperMD/issues
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('../core'), require('./fold')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', '../core', './fold'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.FoldMath = {}),global.CodeMirror,global.HyperMD,global.HyperMD.Fold));
}(this, (function (exports,CodeMirror,core,fold) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  var DEBUG = false;
  /**
   * Detect if a token is a beginning of Math, and fold it!
   *
   * @see FolderFunc in ./fold.ts
   */
  var MathFolder = function (stream, token) {
      var mathBeginRE = /formatting-math-begin\b/;
      if (!mathBeginRE.test(token.type))
          { return null; }
      var cm = stream.cm;
      var line = stream.lineNo;
      var maySpanLines = /math-2\b/.test(token.type); // $$ may span lines!
      var tokenLength = maySpanLines ? 2 : 1; // "$$" or "$"
      // CodeMirror GFM mode split "$$" into two tokens, so do a extra check.
      if (tokenLength == 2 && token.string.length == 1) {
          if (DEBUG)
              { console.log("[FoldMath] $$ is splitted into 2 tokens"); }
          var nextToken = stream.lineTokens[stream.i_token + 1];
          if (!nextToken || !mathBeginRE.test(nextToken.type))
              { return null; }
      }
      // Find the position of the "$" tail and compose a range
      var end_info = stream.findNext(/formatting-math-end\b/, maySpanLines);
      var from = { line: line, ch: token.start };
      var to;
      if (end_info) {
          to = { line: end_info.lineNo, ch: end_info.token.start + tokenLength };
      }
      else if (maySpanLines) {
          // end not found, but this is a multi-line math block.
          // fold to the end of doc
          var lastLineNo = cm.lastLine();
          to = { line: lastLineNo, ch: cm.getLine(lastLineNo).length };
      }
      else {
          // Hmm... corrupted math ?
          return null;
      }
      // Range is ready. request the range
      var expr_from = { line: from.line, ch: from.ch + tokenLength };
      var expr_to = { line: to.line, ch: to.ch - tokenLength };
      var expr = cm.getRange(expr_from, expr_to).trim();
      var foldMathAddon = getAddon(cm);
      var reqAns = stream.requestRange(from, to);
      if (reqAns !== fold.RequestRangeResult.OK) {
          if (reqAns === fold.RequestRangeResult.CURSOR_INSIDE)
              { foldMathAddon.ff_pv.set(expr); } // try to trig preview event
          return null;
      }
      // Now let's make a math widget!
      var marker = insertMathMark(cm, from, to, expr, tokenLength, "math-" + tokenLength);
      foldMathAddon.ff_pv.set(null); // try to hide preview
      return marker;
  };
  /**
   * Insert a TextMarker, and try to render it with configured MathRenderer.
   */
  function insertMathMark(cm, p1, p2, expression, tokenLength, className) {
      var span = document.createElement("span");
      span.setAttribute("class", "hmd-fold-math " + (className || ''));
      span.setAttribute("title", expression);
      var mathPlaceholder = document.createElement("span");
      mathPlaceholder.setAttribute("class", "hmd-fold-math-placeholder");
      mathPlaceholder.textContent = expression;
      span.appendChild(mathPlaceholder);
      if (DEBUG) {
          console.log("insert", p1, p2, expression);
      }
      var marker = cm.markText(p1, p2, {
          className: "hmd-fold-math",
          replacedWith: span,
          clearOnEnter: true
      });
      span.addEventListener("click", function () { return fold.breakMark(cm, marker, tokenLength); }, false);
      // const foldMathAddon = getAddon(cm)
      var Renderer = cm.hmd.foldMath.renderer || (typeof MathJax === 'undefined' ? StupidRenderer : MathJaxRenderer);
      var mathRenderer = new Renderer(span, "");
      mathRenderer.onChanged = function () {
          if (mathPlaceholder) {
              span.removeChild(mathPlaceholder);
              mathPlaceholder = null;
          }
          marker.changed();
      };
      marker.on("clear", function () { mathRenderer.clear(); });
      marker["mathRenderer"] = mathRenderer;
      core.tryToRun(function () {
          if (DEBUG)
              { console.log("[MATH] Trying to render ", expression); }
          if (!mathRenderer.isReady())
              { return false; }
          mathRenderer.startRender(expression);
          return true;
      }, 5, function () {
          marker.clear();
          if (DEBUG) {
              console.log("[MATH] engine always not ready. faild to render ", expression, p1);
          }
      });
      return marker;
  }
  //////////////////////////////////////////////////////////////////
  ///
  fold.builtinFolder["math"] = MathFolder; // inject fold's builtinFolders! Not cool but it works
  //////////////////////////////////////////////////////////////////
  /// Stupid MATH ENGINE
  var StupidRenderer = function(container, mode) {
      var this$1 = this;

      this.container = container;
      var img = document.createElement("img");
      img.setAttribute("class", "hmd-stupid-math");
      img.addEventListener("load", function () { if (this$1.onChanged)
          { this$1.onChanged(this$1.last_expr); } }, false);
      this.img = img;
      container.appendChild(img);
  };
  StupidRenderer.prototype.startRender = function (expr) {
      this.last_expr = expr;
      this.img.src = "https://latex.codecogs.com/gif.latex?" + encodeURIComponent(expr);
  };
  StupidRenderer.prototype.clear = function () {
      this.container.removeChild(this.img);
  };
  /** indicate that if the Renderer is ready to execute */
  StupidRenderer.prototype.isReady = function () {
      return true; // I'm always ready!
  };
  var MathJaxRenderer = function(div, mode) {
      this.div = div;
      this.mode = mode;
      this.onChanged = null;
      this.jax = null;
      this._cleared = false;
      this._renderingExpr = ""; // Currently rendering expr
      var script = document.createElement("script");
      script.setAttribute("type", mode ? 'math/tex; mode=' + mode : 'math/tex');
      div.appendChild(script);
      this.script = script;
  };
  MathJaxRenderer.prototype.clear = function () {
      var script = this.script;
      script.innerHTML = '';
      if (this.jax)
          { this.jax.Remove(); }
      this._cleared = true;
  };
  MathJaxRenderer.prototype.startRender = function (expr) {
      if (this._cleared) {
          return;
      }
      if (this._renderingExpr) {
          // A new rendering job comes, while previous one is still in progress
          // Do rendering later, in _TypesetDoneCB function
          this._renderingExpr = expr;
          return;
      }
      this._renderingExpr = expr;
      var script = this.script;
      script.innerHTML = expr;
      if (this.jax) {
          MathJax.Hub.Queue(["Text", this.jax, expr], ["_TypesetDoneCB", this, expr]);
      }
      else {
          this.jax = MathJax.Hub.getJaxFor(script);
          MathJax.Hub.Queue(["Typeset", MathJax.Hub, script], ["_TypesetDoneCB", this, expr]);
      }
  };
  /** Callback for MathJax when typeset is done*/
  MathJaxRenderer.prototype._TypesetDoneCB = function (finished_expr) {
      if (this._cleared) {
          return;
      }
      if (this._renderingExpr !== finished_expr) {
          // Current finished rendering job is out-of-date
          // re-render with newest Tex expr
          var expr_new = this._renderingExpr;
          this._renderingExpr = "";
          this.startRender(expr_new);
          return;
      }
      // Rendering finished. Nothing wrong
      this._renderingExpr = "";
      if (typeof (this.onChanged) === 'function')
          { this.onChanged(finished_expr); }
  };
  MathJaxRenderer.prototype.isReady = function () {
      return typeof MathJax === 'object' && MathJax.isReady;
  };
  var defaultOption = {
      renderer: null,
      onPreview: null,
      onPreviewEnd: null,
  };
  /**
   * This is not a real addon.
   *
   * If you want to stop folding math. set options.hmdFold.math = false
   */
  var FoldMath = function(cm) {
      var this$1 = this;

      this.cm = cm;
      /** Use a FlipFlop to emit events! How smart I am! */
      this.ff_pv = new core.FlipFlop(
      /** CHANGED */ function (expr) { this$1.onPreview && this$1.onPreview(expr); }, 
      /** HIDE*/ function () { this$1.onPreviewEnd && this$1.onPreviewEnd(); }, null);
      // options will be initialized to defaultOption (if exists)
  };
  var OptionName = "hmdFoldMath";
  CodeMirror.defineOption(OptionName, defaultOption, function (cm, newVal) {
      var newCfg = defaultOption;
      if (typeof newVal === 'object') {
          newCfg = core.Addon.migrateOption(newVal, defaultOption);
      }
      else {
          console.warn("[HyperMD FoldMath] wrong option format. If you want to stop folding math. set options.hmdFold.math = false");
      }
      var inst = getAddon(cm);
      for (var k in newCfg)
          { inst[k] = newCfg[k]; }
  });
  var AddonAlias = "foldMath";
  var getAddon = core.Addon.Getter(AddonAlias, FoldMath, defaultOption);

  exports.MathFolder = MathFolder;
  exports.insertMathMark = insertMathMark;
  exports.StupidRenderer = StupidRenderer;
  exports.MathJaxRenderer = MathJaxRenderer;
  exports.defaultOption = defaultOption;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
