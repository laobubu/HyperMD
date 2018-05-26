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
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror'], factory) :
  (factory((global.HyperMD = {}),global.CodeMirror));
}(this, (function (exports,CodeMirror) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  /**
   * Provides some common PolyFill
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
  if (typeof Object['assign'] != 'function') {
      // Must be writable: true, enumerable: false, configurable: true
      Object.defineProperty(Object, "assign", {
          value: function assign(target, varArgs) {
              var arguments$1 = arguments;

              if (target == null) { // TypeError if undefined or null
                  throw new TypeError('Cannot convert undefined or null to object');
              }
              var to = Object(target);
              for (var index = 1; index < arguments.length; index++) {
                  var nextSource = arguments$1[index];
                  if (nextSource != null) { // Skip over if undefined or null
                      for (var nextKey in nextSource) {
                          // Avoid bugs when hasOwnProperty is shadowed
                          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                              to[nextKey] = nextSource[nextKey];
                          }
                      }
                  }
              }
              return to;
          },
          writable: true,
          configurable: true
      });
  }

  /**
   * Provides some universal utils
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
  /** Simple FlipFlop */
  var FlipFlop = function(on_cb, off_cb, state, subkey) {
      if ( state === void 0 ) state = false;
      if ( subkey === void 0 ) subkey = "enabled";

      this.on_cb = on_cb;
      this.off_cb = off_cb;
      this.state = state;
      this.subkey = subkey;
  };
  /**
   * Update FlipFlop status, and trig callback function if needed
   *
   * @param {T|object} state new status value. can be a object
   * @param {boolean} [toBool] convert retrived value to boolean. default: false
   */
  FlipFlop.prototype.set = function (state, toBool) {
      var newVal = (typeof state === 'object' && state) ? state[this.subkey] : state;
      if (toBool)
          { newVal = !!newVal; }
      if (newVal === this.state)
          { return; }
      if (this.state = newVal)
          { this.on_cb(newVal); }
      else
          { this.off_cb(newVal); }
  };
  FlipFlop.prototype.setBool = function (state) {
      return this.set(state, true);
  };
  /** async run a function, and retry up to N times until it returns true */
  function tryToRun(fn, times, onFailed) {
      times = ~~times || 5;
      var delayTime = 250;
      function nextCycle() {
          if (!times--) {
              if (onFailed)
                  { onFailed(); }
              return;
          }
          try {
              if (fn())
                  { return; }
          }
          catch (e) { }
          setTimeout(nextCycle, delayTime);
          delayTime *= 2;
      }
      setTimeout(nextCycle, 0);
  }
  /**
   * make a debounced function
   *
   * @param {Function} fn
   * @param {number} delay in ms
   */
  function debounce(fn, delay) {
      var deferTask = null;
      var notClearBefore = 0;
      var run = function () { fn(); deferTask = 0; };
      var ans = function () {
          var nowTime = +new Date();
          if (deferTask) {
              if (nowTime < notClearBefore)
                  { return; }
              else
                  { clearTimeout(deferTask); }
          }
          deferTask = setTimeout(run, delay);
          notClearBefore = nowTime + 100; // allow 100ms error
      };
      ans.stop = function () {
          if (!deferTask)
              { return; }
          clearTimeout(deferTask);
          deferTask = 0;
      };
      return ans;
  }
  /**
   * a fallback for new Array(count).fill(data)
   */
  function repeat(item, count) {
      var ans = new Array(count);
      if (ans['fill'])
          { ans['fill'](item); }
      else
          { for (var i = 0; i < count; i++)
              { ans[i] = item; } }
      return ans;
  }
  function repeatStr(item, count) {
      var ans = "";
      while (count-- > 0)
          { ans += item; }
      return ans;
  }

  /**
   * Ready-to-use functions that powers up your Markdown editor
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
  /**
   * Initialize an editor from a <textarea>
   * Calling `CodeMirror.fromTextArea` with recommended HyperMD options
   *
   * @see CodeMirror.fromTextArea
   *
   * @param {HTMLTextAreaElement} textArea
   * @param {object} [config]
   * @returns {cm_t}
   */
  function fromTextArea(textArea, config) {
      var final_config = {
          lineNumbers: true,
          lineWrapping: true,
          theme: "hypermd-light",
          mode: "text/x-hypermd",
          tabSize: 4,
          foldGutter: true,
          gutters: [
              "CodeMirror-linenumbers",
              "CodeMirror-foldgutter",
              "HyperMD-goback" // (addon: click) 'back' button for footnotes
          ],
          keyMap: ("hypermd" in CodeMirror.keyMap) ? "hypermd" : "default",
          hmdInsertFile: {
              byDrop: true,
              byPaste: true
          },
          // (addon) cursor-debounce
          // cheap mouse could make unexpected selection. use this to fix.
          hmdCursorDebounce: true,
          // (addon) hover
          // (dependencies) addon/readlink
          hmdHover: true,
          // (addon) click
          // (dependencies) addon/readlink
          // click to follow links and footnotes
          hmdClick: true,
          // (addon) fold
          // turn images and links into what you want to see
          hmdFold: {
              image: true,
              link: true,
              math: true,
          },
          // (addon) fold-math
          // Tex Formular Rendering. Both `$` and `$$` are supported
          // See src/addon/fold-math.ts, or read the document to learn more
          hmdFoldMath: {
          // renderer: HyperMD.FoldMath.StupidRenderer
          },
          // (addon) paste
          // copy and paste HTML content
          // NOTE: only works when `turndown` is loaded before HyperMD
          hmdPaste: true,
          // (addon) hide-token
          // hide/show Markdown tokens like `**`
          hmdHideToken: true,
          // (addon) mode-loader
          // auto load mode to highlight code blocks
          // by providing a URL prefix, pointing to your CodeMirror
          // - http://cdn.xxxxx.com/codemirror/v4.xx/
          // - ./node_modules/codemirror/              <- relative to webpage's URL
          // using require.js? do it like this :
          hmdLoadModeFrom: "~codemirror/",
          // (addon) table-align
          // adjust table separators' margin, making table columns aligned
          hmdTableAlign: true,
      };
      if (typeof config === 'object') {
          for (var key in config) {
              if (config.hasOwnProperty(key)) {
                  final_config[key] = config[key];
              }
          }
      }
      var cm = CodeMirror.fromTextArea(textArea, final_config);
      return cm;
  }
  /**
   * Turn HyperMD editor into to a normal editor
   *
   * Disable HyperMD visual effects.
   * Interactive addons like click or paste are not affected.
   *
   * @param {cm_t} editor Created by **HyperMD.fromTextArea**
   * @param {string} [theme]
   */
  function switchToNormal(editor, theme) {
      editor.setOption('theme', theme || "default");
      editor.setOption('hmdFold', false); // unfold all folded parts
      editor.setOption('hmdHideToken', false); // stop hiding tokens
      editor.setOption('hmdTableAlign', false); // stop aligining table columns
  }
  /**
   * Revert what `HyperMD.switchToNormal` does
   *
   * @param {cm_t} editor Created by **HyperMD.fromTextArea**
   * @param {string} [theme]
   */
  function switchToHyperMD(editor, theme) {
      editor.setOption('theme', theme || 'hypermd-light');
      editor.setOption('hmdFold', true);
      editor.setOption('hmdHideToken', true);
      editor.setOption('hmdTableAlign', true);
  }

  /**
    The following few functions are from CodeMirror's source code.

    MIT License

    Copyright (C) 2017 by Marijn Haverbeke <marijnh@gmail.com> and others

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

    */
  /**
   * Find the view element corresponding to a given line. Return null when the line isn't visible.
   *
   * @see codemirror\src\measurement\position_measurement.js 5.37.0
   * @param n lineNo
   */
  function findViewIndex(cm, n) {
      if (n >= cm.display.viewTo)
          { return null; }
      n -= cm.display.viewFrom;
      if (n < 0)
          { return null; }
      var view = cm.display.view;
      for (var i = 0; i < view.length; i++) {
          n -= view[i].size;
          if (n < 0)
              { return i; }
      }
  }
  /**
   * Find a line view that corresponds to the given line number.
   *
   * @see codemirror\src\measurement\position_measurement.js 5.37.0
   */
  function findViewForLine(cm, lineN) {
      if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
          { return cm.display.view[findViewIndex(cm, lineN)]; }
      var ext = cm.display.externalMeasured;
      if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
          { return ext; }
  }
  /**
   * Find a line map (mapping character offsets to text nodes) and a
   * measurement cache for the given line number. (A line view might
   * contain multiple lines when collapsed ranges are present.)
   *
   * @see codemirror\src\measurement\position_measurement.js 5.37.0
   */
  function mapFromLineView(lineView, line, lineN) {
      if (lineView.line == line)
          { return { map: lineView.measure.map, cache: lineView.measure.cache, before: false }; }
      for (var i = 0; i < lineView.rest.length; i++)
          { if (lineView.rest[i] == line)
              { return { map: lineView.measure.maps[i], cache: lineView.measure.caches[i], before: false }; } }
      for (var i$1 = 0; i$1 < lineView.rest.length; i$1++)
          { if (lineView.rest[i$1].lineNo() > lineN)
              { return { map: lineView.measure.maps[i$1], cache: lineView.measure.caches[i$1], before: true }; } }
  }

  var cm_internal = /*#__PURE__*/Object.freeze({
    findViewIndex: findViewIndex,
    findViewForLine: findViewForLine,
    mapFromLineView: mapFromLineView
  });

  /**
   * CodeMirror-related utils
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
  /**
   * Useful tool to seek for tokens
   *
   *     var seeker = new TokenSeeker(cm)
   *     seeker.setPos(0, 0) // set to line 0, char 0
   *     var ans = seeker.findNext(/fomratting-em/)
   *
   */
  var TokenSeeker = function(cm) {
      this.cm = cm;
  };
  TokenSeeker.prototype.findNext = function (condition, varg, since) {
      var lineNo = this.lineNo;
      var tokens = this.lineTokens;
      var token = null;
      var i_token = this.i_token + 1;
      var maySpanLines = false;
      if (varg === true) {
          maySpanLines = true;
      }
      else if (typeof varg === 'number') {
          i_token = varg;
      }
      if (since) {
          if (since.line > lineNo) {
              i_token = tokens.length; // just ignore current line
          }
          else if (since.line < lineNo) ;
          else {
              for (; i_token < tokens.length; i_token++) {
                  if (tokens[i_token].start >= since.ch)
                      { break; }
              }
          }
      }
      for (; i_token < tokens.length; i_token++) {
          var token_tmp = tokens[i_token];
          if ((typeof condition === "function") ? condition(token_tmp) : condition.test(token_tmp.type)) {
              token = token_tmp;
              break;
          }
      }
      if (!token && maySpanLines) {
          var cm = this.cm;
          var startLine = Math.max(since ? since.line : 0, lineNo + 1);
          cm.eachLine(startLine, cm.lastLine() + 1, function (line_i) {
              lineNo = line_i.lineNo();
              tokens = cm.getLineTokens(lineNo);
              i_token = 0;
              if (since && lineNo === since.line) {
                  for (; i_token < tokens.length; i_token++) {
                      if (tokens[i_token].start >= since.ch)
                          { break; }
                  }
              }
              for (; i_token < tokens.length; i_token++) {
                  var token_tmp = tokens[i_token];
                  if ((typeof condition === "function") ? condition(token_tmp) : condition.test(token_tmp.type)) {
                      token = token_tmp;
                      return true; // stop `eachLine`
                  }
              }
          });
      }
      return token ? { lineNo: lineNo, token: token, i_token: i_token } : null;
  };
  TokenSeeker.prototype.findPrev = function (condition, varg, since) {
      var lineNo = this.lineNo;
      var tokens = this.lineTokens;
      var token = null;
      var i_token = this.i_token - 1;
      var maySpanLines = false;
      if (varg === true) {
          maySpanLines = true;
      }
      else if (typeof varg === 'number') {
          i_token = varg;
      }
      if (since) {
          if (since.line < lineNo) {
              i_token = -1; // just ignore current line
          }
          else if (since.line > lineNo) ;
          else {
              for (; i_token < tokens.length; i_token++) {
                  if (tokens[i_token].start >= since.ch)
                      { break; }
              }
          }
      }
      if (i_token >= tokens.length)
          { i_token = tokens.length - 1; }
      for (; i_token >= 0; i_token--) {
          var token_tmp = tokens[i_token];
          if ((typeof condition === "function") ? condition(token_tmp) : condition.test(token_tmp.type)) {
              token = token_tmp;
              break;
          }
      }
      if (!token && maySpanLines) {
          var cm = this.cm;
          var startLine = Math.min(since ? since.line : cm.lastLine(), lineNo - 1);
          var endLine = cm.firstLine();
          // cm.eachLine doesn't support reversed searching
          // use while... loop to iterate
          lineNo = startLine + 1;
          while (!token && endLine <= --lineNo) {
              var line_i = cm.getLineHandle(lineNo);
              tokens = cm.getLineTokens(lineNo);
              i_token = 0;
              if (since && lineNo === since.line) {
                  for (; i_token < tokens.length; i_token++) {
                      if (tokens[i_token].start >= since.ch)
                          { break; }
                  }
              }
              if (i_token >= tokens.length)
                  { i_token = tokens.length - 1; }
              for (; i_token >= 0; i_token--) {
                  var token_tmp = tokens[i_token];
                  if ((typeof condition === "function") ? condition(token_tmp) : condition.test(token_tmp.type)) {
                      token = token_tmp;
                      break; // FOUND token !
                  }
              }
          }
      }
      return token ? { lineNo: lineNo, token: token, i_token: i_token } : null;
  };
  /**
   * return a range in which every token has the same style, or meet same condition
   */
  TokenSeeker.prototype.expandRange = function (style, maySpanLines) {
      var cm = this.cm;
      var isStyled;
      if (typeof style === "function") {
          isStyled = style;
      }
      else {
          if (typeof style === "string")
              { style = new RegExp("(?:^|\\s)" + style + "(?:\\s|$)"); }
          isStyled = function (token) { return (token ? style.test(token.type || "") : false); };
      }
      var from = {
          lineNo: this.lineNo,
          i_token: this.i_token,
          token: this.lineTokens[this.i_token]
      };
      var to = Object.assign({}, from);
      // find left
      var foundUnstyled = false, tokens = this.lineTokens, i = this.i_token;
      while (!foundUnstyled) {
          if (i >= tokens.length)
              { i = tokens.length - 1; }
          for (; i >= 0; i--) {
              var token = tokens[i];
              if (!isStyled(token)) {
                  foundUnstyled = true;
                  break;
              }
              else {
                  from.i_token = i;
                  from.token = token;
              }
          }
          if (foundUnstyled || !(maySpanLines && from.lineNo > cm.firstLine()))
              { break; } // found, or no more lines
          tokens = cm.getLineTokens(--from.lineNo);
          i = tokens.length - 1;
      }
      // find right
      var foundUnstyled = false, tokens = this.lineTokens, i = this.i_token;
      while (!foundUnstyled) {
          if (i < 0)
              { i = 0; }
          for (; i < tokens.length; i++) {
              var token$1 = tokens[i];
              if (!isStyled(token$1)) {
                  foundUnstyled = true;
                  break;
              }
              else {
                  to.i_token = i;
                  to.token = token$1;
              }
          }
          if (foundUnstyled || !(maySpanLines && to.lineNo < cm.lastLine()))
              { break; } // found, or no more lines
          tokens = cm.getLineTokens(++to.lineNo);
          i = 0;
      }
      return { from: from, to: to };
  };
  TokenSeeker.prototype.setPos = function (line, ch, precise) {
      if (ch === void 0) {
          ch = line;
          line = this.line;
      }
      else if (typeof line === 'number')
          { line = this.cm.getLineHandle(line); }
      var sameLine = line === this.line;
      var i_token = 0;
      if (precise || !sameLine) {
          this.line = line;
          this.lineNo = line.lineNo();
          this.lineTokens = this.cm.getLineTokens(this.lineNo);
      }
      else {
          // try to speed-up seeking
          i_token = this.i_token;
          var token = this.lineTokens[i_token];
          if (token.start > ch)
              { i_token = 0; }
      }
      var tokens = this.lineTokens;
      for (; i_token < tokens.length; i_token++) {
          if (tokens[i_token].end > ch)
              { break; } // found
      }
      this.i_token = i_token;
  };
  /**
   * CodeMirror's `getLineTokens` might merge adjacent chars with same styles,
   * but this one won't.
   *
   * This one will consume more memory.
   *
   * @param {CodeMirror.LineHandle} line
   * @returns {string[]} every char's style
   */
  function getEveryCharToken(line) {
      var ans = new Array(line.text.length);
      var ss = line.styles;
      var i = 0;
      if (ss) {
          // CodeMirror already parsed this line. Use cache
          for (var j = 1; j < ss.length; j += 2) {
              var i_to = ss[j], s = ss[j + 1];
              while (i < i_to)
                  { ans[i++] = s; }
          }
      }
      else {
          // Emmm... slow method
          var cm = line.parent.cm || line.parent.parent.cm || line.parent.parent.parent.cm;
          var ss$1 = cm.getLineTokens(line.lineNo());
          for (var j$1 = 0; j$1 < ss$1.length; j$1++) {
              var i_to$1 = ss$1[j$1].end, s$1 = ss$1[j$1].type;
              while (i < i_to$1)
                  { ans[i++] = s$1; }
          }
      }
      return ans;
  }
  /**
   * return a range in which every char has the given style (aka. token type).
   * assuming char at `pos` already has the style.
   *
   * the result will NOT span lines.
   *
   * @param style aka. token type
   * @see TokenSeeker if you want to span lines
   */
  function expandRange(cm, pos, style) {
      var line = pos.line;
      var from = { line: line, ch: 0 };
      var to = { line: line, ch: pos.ch };
      var styleRE = new RegExp("(?:^|\\s)" + style + "(?:\\s|$)");
      var tokens = cm.getLineTokens(line);
      var iSince;
      for (iSince = 0; iSince < tokens.length; iSince++) {
          if (tokens[iSince].end >= pos.ch)
              { break; }
      }
      if (iSince === tokens.length)
          { return null; }
      for (var i = iSince; i < tokens.length; i++) {
          var token = tokens[i];
          if (styleRE.test(token.type))
              { to.ch = token.end; }
          else
              { break; }
      }
      for (var i = iSince; i >= 0; i--) {
          var token = tokens[i];
          if (!styleRE.test(token.type)) {
              from.ch = token.end;
              break;
          }
      }
      return { from: from, to: to };
  }
  /**
   * clean line measure caches (if needed)
   * and re-position cursor
   *
   * partially extracted from codemirror.js : function updateSelection(cm)
   *
   * @param {cm_t} cm
   * @param {boolean} skipCacheCleaning
   */
  function updateCursorDisplay(cm, skipCacheCleaning) {
      if (!skipCacheCleaning) {
          var lvs = cm.display.view; // LineView s
          for (var i = 0, list = lvs; i < list.length; i += 1) {
              var lineView = list[i];

              if (lineView.measure)
                  { lineView.measure.cache = {}; }
          }
      }
      setTimeout(function () {
          cm.display.input.showSelection(cm.display.input.prepareSelection());
      }, 60); // wait for css style
  }

  /**
   * Utils for HyperMD addons
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
  var Addon = function(cm) { };
  /** make a Singleton getter */
  function Getter(name, ClassCtor, defaultOption) {
      return function (cm) {
          if (!cm.hmd)
              { cm.hmd = {}; }
          if (!cm.hmd[name]) {
              var inst = new ClassCtor(cm);
              cm.hmd[name] = inst;
              if (defaultOption) {
                  for (var k in defaultOption)
                      { inst[k] = defaultOption[k]; }
              }
              return inst;
          }
          return cm.hmd[name];
      };
  }
  /** Simple version of Object.assign */
  function migrateOption(newVal, defval) {
      var dst = {};
      for (var k in defval) {
          dst[k] = newVal.hasOwnProperty(k) ? newVal[k] : defval[k];
      }
      return dst;
  }

  var addon = /*#__PURE__*/Object.freeze({
    Addon: Addon,
    Getter: Getter,
    migrateOption: migrateOption
  });

  exports.Addon = addon;
  exports.FlipFlop = FlipFlop;
  exports.tryToRun = tryToRun;
  exports.debounce = debounce;
  exports.repeat = repeat;
  exports.repeatStr = repeatStr;
  exports.fromTextArea = fromTextArea;
  exports.switchToNormal = switchToNormal;
  exports.switchToHyperMD = switchToHyperMD;
  exports.cm_internal = cm_internal;
  exports.TokenSeeker = TokenSeeker;
  exports.getEveryCharToken = getEveryCharToken;
  exports.expandRange = expandRange;
  exports.updateCursorDisplay = updateCursorDisplay;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
