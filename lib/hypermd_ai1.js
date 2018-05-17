(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('codemirror/mode/gfm/gfm'), require('codemirror/addon/mode/overlay'), require('marked'), require('mathjax'), require('codemirror/mode/meta')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', 'codemirror/mode/gfm/gfm', 'codemirror/addon/mode/overlay', 'marked', 'mathjax', 'codemirror/mode/meta'], factory) :
  (factory((global.HyperMD = {}),global.CodeMirror,null,null,global.marked));
}(this, (function (exports,CodeMirror,gfm,overlay,marked) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;
  marked = marked && marked.hasOwnProperty('default') ? marked['default'] : marked;

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
          extraKeys: {
              "Enter": "newlineAndIndentContinueMarkdownList"
          },
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
          hmdHideToken: "(profile-1)",
          // (addon) mode-loader
          // auto load mode to highlight code blocks
          // by providing a URL prefix, pointing to your CodeMirror
          // - http://cdn.xxxxx.com/codemirror/v4.xx/
          // - ./node_modules/codemirror/              <- relative to webpage's URL
          // using require.js? do it like this :
          hmdLoadModeFrom: "~codemirror/",
          // (addon) table-align
          // adjust table separators' margin, making table columns aligned
          hmdTableAlign: {
              lineColor: '#999',
              rowsepColor: '#999',
          },
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
      // unfold all folded parts
      editor.setOption('hmdFold', false);
      // stop hiding tokens
      editor.setOption('hmdHideToken', '');
      // stop aligining table columns
      editor.setOption('hmdTableAlign', false);
  }
  /**
   * Revert what `HyperMD.switchToNormal` does
   *
   * @param {cm_t} editor Created by **HyperMD.fromTextArea**
   * @param {string} [theme]
   */
  function switchToHyperMD(editor, theme) {
      editor.setOption('theme', theme || 'hypermd-light');
      editor.setOption('hmdFold', true); // TODO: add math here
      editor.setOption('hmdHideToken', '(profile-1)');
      editor.setOption('hmdTableAlign', { lineColor: '#999', rowsepColor: '#999' });
  }

  /**
   * CodeMirror-related utils
   *
   * @internal Part of HyperMD core.
   *
   * You shall NOT import this file; please import "core" instead
   */
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
   * @see exapndRange2 if you want to span lines
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
          // // only process affected lines?
          // var lines = []
          // var vfrom = cm.display.viewFrom, vto = cm.display.viewTo
          // var selections = cm.listSelections()
          // var line
          // for (var i = 0; i < selections.length; i++) {
          //   line = selections[i].head.line; if (line >= vfrom && line <= vto && lines.indexOf(line) === -1) lines.push(line)
          //   line = selections[i].anchor.line; if (line >= vfrom && line <= vto && lines.indexOf(line) === -1) lines.push(line)
          // }
          var lvs = cm.display.view; // LineView s
          for (var i = 0; i < lvs.length; i++) {
              // var j = lines.indexOf(lvs[i].line.lineNo())
              // if (j === -1) continue
              if (lvs[i].measure)
                  { lvs[i].measure.cache = {}; }
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

  var Addon$1 = /*#__PURE__*/Object.freeze({
    Addon: Addon,
    Getter: Getter,
    migrateOption: migrateOption
  });

  // CodeMirror, copyright (c) by laobubu
  var possibleTokenChars = "`\\[]()<>_*~$|^@:!#+\""; // chars that could form a token (like "**" or "`")
  var meanlessCharsRE = new RegExp("^[^\\" + possibleTokenChars.split("").join("\\") + "]+"); // RegExp that match one or more meanless chars
  var listRE = /^\s*(?:[*\-+]|[0-9]+([.)]))\s+/; // this regex is from CodeMirror's sourcecode
  var tableTitleSepRE = /^\s*\|?(?:\s*\:?\s*\-+\s*\:?\s*\|)*\s*\:?\s*\-+\s*\:?\s*\|?\s*$/; // find  |:-----:|:-----:| line
  /** these styles only need 1 bit to record the status */
  var nstyleStandalone = [
      1 /* DEL */,
      2 /* EM */,
      4 /* STRONG */,
      8 ];
  /** style strings */
  var HMDStyles = {};
  HMDStyles[8 /* ESCAPE */] = "hmd-escape ";
  HMDStyles[256 /* LINK */] = "hmd-link ";
  HMDStyles[512 /* LINK_URL */] = "hmd-link-url ";
  HMDStyles[768 /* BARELINK */] = "hmd-barelink ";
  HMDStyles[1024 /* FOOTREF */] = "hmd-barelink hmd-footref ";
  HMDStyles[1280 /* FOOTREF_BEGIN */] = "hmd-barelink hmd-footref hmd-footref-lead ";
  HMDStyles[1536 /* FOOTNOTE_NAME */] = "hmd-footnote line-HyperMD-footnote ";
  CodeMirror.defineMode("hypermd", function (config, modeConfig) {
      function startState() {
          return {
              atBeginning: true,
              insideCodeFence: false,
              quoteLevel: 0,
              nstyle: 0,
              table: null,
              tableCol: 0,
              tableRow: 0,
              inside: null,
              listSpaceStack: [],
              // NOTICE: listSpaceStack[0] could be 0, (eg. ordered list, or " - "'s leading space is missing)
              //         if meet the situation, do not return any token, otherwise CodeMirror would crash
              prevLineIsEmpty: false,
              extra: null,
          };
      }
      var hypermdOverlay = {
          startState: startState,
          copyState: function(s) {
              return {
                  // structure of `s` is defined in startState; do a deep copy for it
                  atBeginning: s.atBeginning,
                  insideCodeFence: s.insideCodeFence,
                  quoteLevel: s.quoteLevel,
                  nstyle: s.nstyle,
                  table: s.table,
                  tableCol: s.tableCol,
                  tableRow: s.tableRow,
                  inside: s.inside,
                  listSpaceStack: s.listSpaceStack && s.listSpaceStack.slice(),
                  prevLineIsEmpty: s.prevLineIsEmpty,
                  extra: s.extra
              };
          },
          blankLine: function(s) {
              s.atBeginning = true;
              s.prevLineIsEmpty = true;
              s.quoteLevel = 0;
              s.listSpaceStack = [];
              s.table = null;
              s.tableCol = 0;
              s.tableRow = 0;
              s.nstyle = 0;
              if (s.insideCodeFence)
                  { return "line-HyperMD-codeblock line-background-HyperMD-codeblock-bg"; }
              return null;
          },
          token: function(stream, state) {
              state.combineTokens = null;
              var start = stream.pos;
              var tmp;
              if (state.inside === 1 /* math */) {
                  if ((start === 0 || stream.string.charAt(start - 1) !== "\\") &&
                      stream.match(state.extra)) {
                      state.inside = null;
                      return "formatting formatting-math formatting-math-end math math-" + state.extra.length;
                  }
                  stream.next();
                  return "math math-" + state.extra.length;
              }
              //////////////////////////////////////////////////////////////////
              /// start process one raw line
              if (start === 0) {
                  // Now we are at the beginning of current line
                  state.atBeginning = true;
                  if (state.table) {
                      state.tableCol = 0;
                      state.tableRow++;
                      if (state.tableRow === 1 && tableTitleSepRE.test(stream.string)) {
                          // this line is  |:-----:|:-----:|
                          // HyperMD must handle it, otherwise CodeMirror will treat `:---:` as emoji
                          state.inside = 4 /* tableTitleSep */;
                      }
                      else {
                          state.inside = null;
                      }
                  }
                  var indentation = stream.indentation();
                  /**
                   * ```c++
                   * ^we are here (if !insideCodeFence)
                   *
                   * ```
                   * ^or here (if insideCodeFence)
                   */
                  if (stream.match(/^```/)) { // toggle state for codefence
                      state.combineTokens = true;
                      state.insideCodeFence = !state.insideCodeFence;
                      var fence_type = state.insideCodeFence ? 'begin' : 'end';
                      return "line-HyperMD-codeblock line-background-HyperMD-codeblock-bg line-HyperMD-codeblock-" + fence_type;
                  }
                  /**
                   * if insideCodeFence, nothing to process.
                   */
                  if (state.insideCodeFence) {
                      stream.skipToEnd();
                      state.combineTokens = true;
                      return "line-HyperMD-codeblock line-background-HyperMD-codeblock-bg";
                  }
                  //FIXME: tranditional code block is buggy and shall be deprecated!
                  /**
                   * this is a tranditional code block
                   *
                   *     #include <stdio.h>
                   * ^we are here and we can see lots of space
                   *
                   * note that we can't detect the program's language, so, no need to set `state.combineTokens = true`
                   */
                  if (state.listSpaceStack.length === 0 && indentation >= 4) {
                      stream.skipToEnd();
                      return "line-HyperMD-codeblock line-background-HyperMD-codeblock-indented-bg";
                  }
                  /**
                   * StdHeader
                   * -----------
                   * ^we are here
                   *
                   * Note: since we can't go back and modify header title text's style
                   *       the only remedy is writing some CSS rules, targeting .hmd-stdheader-line
                   */
                  if (/^(?:-{3,}|={3,})$/.test(stream.string) && !state.prevLineIsEmpty) {
                      var _hlevel = ((stream.string.charAt(0) == '=') ? 1 : 2);
                      stream.skipToEnd();
                      return 'formatting line-HyperMD-header-line line-HyperMD-header-line-' + _hlevel;
                  }
                  // since now prevLineIsEmpty is useless
                  // this is not blankLine function, so this line is not empty. mark it for the next line
                  state.prevLineIsEmpty = false;
                  /**
                   * > > blockquote! we are at the beginning !
                   * ^we are here
                   *
                   * When a style is prefixed by "line-" , CodeMirror will call addLineClass
                   */
                  if (stream.match(/^\>\s*/)) {
                      var quoteLevel = 1;
                      while (stream.match(/^\s*\>\s*/))
                          { quoteLevel++; }
                      state.quoteLevel = quoteLevel;
                      return ("formatting formatting-quote formatting-quote-" + quoteLevel +
                          " quote quote-" + quoteLevel +
                          " line-HyperMD-quote line-HyperMD-quote-" + quoteLevel);
                  }
                  else if (state.quoteLevel) {
                      /**
                       * > block support such
                       *   syntax
                       * ^ we are here.
                       *
                       */
                      stream.next();
                      state.combineTokens = true;
                      return "line-HyperMD-quote line-HyperMD-quote-" + state.quoteLevel;
                  }
                  /**
                   * ## Header
                   * ^we are here
                   *
                   */
                  if (stream.match(/^(#+)(?:\s|$)/)) {
                      state.combineTokens = true;
                      return "line-HyperMD-header line-HyperMD-header-" + stream.string.match(/^#+/)[0].length;
                  }
                  /**
                   * this is a list
                   *
                   * Note: list checking must be the last step of `if (start === 0) { ... }` ; it doesn't jump out this function
                   */
                  if (state.listSpaceStack.length !== 0 || stream.match(listRE, false)) {
                      // rebuild state.listSpaceStack
                      var zero_leading = state.listSpaceStack[0] === 0;
                      for (var i = zero_leading ? 1 : 0; i < state.listSpaceStack.length; i++) {
                          if (indentation > 0)
                              { indentation -= state.listSpaceStack[i]; }
                          else {
                              state.listSpaceStack.splice(i);
                              break;
                          }
                      }
                      if (indentation > 0) {
                          // new nested level
                          state.listSpaceStack.push(indentation);
                      }
                      // for situations like ordered list whose beginning char is not a space
                      if (state.listSpaceStack.length === 0) {
                          state.listSpaceStack.push(0);
                      }
                      // finished listSpaceStack, now we shall get into it and treat every indent(spaces) as a token
                      state.inside = 2 /* listSpace */;
                      state.extra = 0;
                  }
              }
              // following `if (state.listSpaceStack.length !== 0 || stream.match(listRE, false))` 's status
              if (state.inside === 2 /* listSpace */) {
                  var listLevel = state.listSpaceStack.length;
                  var firstMet = state.extra === 0;
                  var ans = "";
                  if (firstMet && state.listSpaceStack[0] === 0) {
                      if (listLevel === 1) {
                          // oops, this is level-1 list without indentation!
                          // do some dirty job to add HyperMD styles
                          state.inside = null;
                          state.extra = null;
                          state.combineTokens = true;
                          if (!stream.match(listRE))
                              { stream.next(); }
                          return "line-HyperMD-list-line line-HyperMD-list-line-1";
                      }
                      // skip this virtual token. see listSpaceStack's comment above
                      state.extra++;
                      ans += "hmd-list-indent-virtual ";
                  }
                  var indent_to_eat = state.listSpaceStack[state.extra];
                  var corrupted = false;
                  while (indent_to_eat > 0) {
                      var next_ch = stream.next();
                      if (next_ch === "\t")
                          { indent_to_eat -= 4; }
                      else if (next_ch === " ")
                          { indent_to_eat -= 1; }
                      else {
                          // FIXME: User made a corrupted indent. How to solve?
                          state.inside = null;
                          state.extra = null;
                          corrupted = true;
                          break;
                      }
                  }
                  //FIXME: deal with indent_to_eat < 0
                  ans += "hmd-list-indent hmd-list-indent-" + (state.extra + 1);
                  if (firstMet)
                      { ans += " line-HyperMD-list-line line-HyperMD-list-line-" + listLevel; }
                  if (corrupted)
                      { ans += " hmd-list-indent-corrupted"; }
                  if (++state.extra >= listLevel) {
                      // this is the last indenting space, going to exit "listSpace" status
                      state.inside = null;
                      state.extra = null;
                  }
                  state.combineTokens = true;
                  return ans;
              }
              //////////////////////////////////////////////////////////////////
              /// now list bullets and quote indents are gone. Enter the content.
              var atBeginning = state.atBeginning; // whether is at beginning (ignoreing `#`, `>` and list bullets)
              if (atBeginning && /\S/.test(stream.peek()))
                  { state.atBeginning = false; }
              // then just normal inline stuffs
              // usually we just add some extra styles to CodeMirror's result
              state.combineTokens = true;
              switch (state.inside) {
                  case 4 /* tableTitleSep */:
                      /// tableTitleSep line doesn't need any styling
                      if (stream.match(/^(?:\:\s*)?-+(?:\s*\:)?/)) {
                          state.combineTokens = false;
                          return "hmd-table-title-dash line-HyperMD-table-row line-HyperMD-table-rowsep ";
                      }
                      break;
              }
              /// inline code
              if (stream.match(/^`[^`]*`?/)) {
                  return null; // inline code are ignored by hypermd
              }
              /// inline math
              tmp = stream.match(/^\${1,2}/);
              if (tmp && (tmp[0] === '$$' || // `$$` may span lines
                  /[^\\]\$/.test(stream.string.substr(start + 1)) // `$` can't. there must be another `$` after current one
              )) {
                  state.inside = 1 /* math */;
                  state.extra = tmp[0];
                  state.combineTokens = false;
                  return "formatting formatting-math formatting-math-begin math math-" + state.extra.length; // inline code are ignored by hypermd
              }
              ////////////////////////////////////////////////////////////////////////////////////////
              /// possible table
              /// NOTE: only the pipe chars whose nstyle === 0 can construct a table
              ///       no need to worry about nstyle stuff
              if (state.nstyle === 0 && stream.eat('|')) {
                  var ans = "";
                  if (!state.table) {
                      if (!/^\s*\|/.test(stream.string) && !tableTitleSepRE.test(stream.lookAhead(1))) {
                          // a leading pipe char (|) or an extra |:-----:|:-----:| line
                          // is required, but not found, thus we can't establish a table
                          return null;
                      }
                      // this is a new table!
                      state.table = "T" + stream.lineOracle.line;
                      state.tableRow = 0;
                      ans += "line-HyperMD-table-title ";
                      if (tableTitleSepRE.test(stream.lookAhead(1))) {
                          // a |:-----:|:----:| line exists
                          ans += "line-HyperMD-table-title-has_rowsep ";
                      }
                  }
                  if (state.tableCol === 0) {
                      ans += "line-HyperMD-table_" + state.table + " ";
                      ans += "line-HyperMD-table-row line-HyperMD-table-row-" + state.tableRow + " ";
                  }
                  ans += "hmd-table-sep hmd-table-sep-" + state.tableCol + " ";
                  state.tableCol++;
                  return ans;
              }
              ///////////////////////////////////////////////////////////////////
              // now process mixable (non-exclusive) styles
              var nstyle = state.nstyle;
              var ns_link = nstyle & 65280 /* _link_mask */;
              var ans = "";
              // initialize style string by `nstyle`
              for (var i$1 = 0, list = nstyleStandalone; i$1 < list.length; i$1 += 1)
                  {
                  var s = list[i$1];

                  if (nstyle & s)
                      { ans += HMDStyles[s];
              } }
              if (ns_link)
                  { ans += HMDStyles[ns_link]; }
              ///////////////////////////////////////////////////////////////////
              // Update nstyle if needed
              //
              // NOTE:
              // 0. when activating a nstyle (usually `state.nstyle |= xxx`),
              //    do not forget `ans += HMDStyles[xxx]`
              // 1. once nstyle changes, no matter activating or de-activating,
              //    you MUST `return ans` immediately!
              { /// LINK related
                  if (ns_link === 0) {
                      // try to find a beginning
                      if (stream.match(/^\[([^\]]+)\]/, false)) {
                          // found! now decide `ns_link`
                          stream.next();
                          if (atBeginning && stream.match(/^(?:[^\]]+)\]\:/, false)) {
                              // found a beginning of footnote
                              ns_link = 1536 /* FOOTNOTE_NAME */;
                          }
                          else if (stream.match(/^(?:[^\]]+)\](?:[^\[\(]|$)/, false)) {
                              // find a bare link
                              if (stream.peek() === '^') {
                                  // a [bare link] could be a [^footref]
                                  ns_link = 1280 /* FOOTREF_BEGIN */;
                              }
                              else {
                                  ns_link = 768 /* BARELINK */;
                              }
                          }
                          else {
                              // find a normal link text
                              ns_link = 256 /* LINK */;
                          }
                          // apply changes and prevent further HyperMD parsing work
                          state.nstyle |= ns_link;
                          ans += HMDStyles[ns_link];
                          return ans;
                      }
                  }
                  else {
                      // current is inside a link. check if we shall change status
                      // making any change to `ns_link` will prevent further HyperMD parsing work
                      var new_ns_link = null;
                      switch (ns_link) {
                          case 1280 /* FOOTREF_BEGIN */:
                              // caught the "^"
                              new_ns_link = 1024 /* FOOTREF */;
                              stream.next();
                              break;
                          case 1024 /* FOOTREF */:
                          case 768 /* BARELINK */:
                              if (stream.eat(']'))
                                  { new_ns_link = 0; }
                              break;
                          case 1536 /* FOOTNOTE_NAME */:
                              if (stream.match(']:'))
                                  { new_ns_link = 0; }
                              break;
                          case 256 /* LINK */:
                              // entering LINK_URL status because the next char must be ( , which is guranteed.
                              if (stream.eat(']'))
                                  { new_ns_link = 512 /* LINK_URL */; }
                              break;
                          case 512 /* LINK_URL */:
                              if (stream.match(/^"(?:[^"\\]|\\.)*"/)) ;
                              else if (stream.eat(')')) {
                                  // find the tail
                                  new_ns_link = 0;
                              }
                              break;
                      }
                      if (new_ns_link !== null) {
                          // apply changes and prevent further HyperMD parsing work
                          state.nstyle = nstyle & ~65280 /* _link_mask */ | new_ns_link;
                          return ans;
                      }
                  }
              }
              { /// ESCAPE related
                  if (nstyle & 8 /* ESCAPE */) {
                      stream.next();
                      state.nstyle -= 8 /* ESCAPE */;
                      return ans;
                  }
                  /// entering escape?
                  if (stream.match(/^\\(?=.)/)) {
                      // found the backslash
                      state.nstyle |= 8 /* ESCAPE */;
                      ans += HMDStyles[8 /* ESCAPE */];
                      ans += "hmd-escape-backslash ";
                      return ans;
                  }
              }
              { /// DEL, EM, STRONG etc. simple styles
                  // since these styles are not coverd by HMDStyles,
                  // we can do it simplier: change nstyle and return immediatly
                  if (stream.match("**")) {
                      state.nstyle ^= 4 /* STRONG */;
                      return ans;
                  }
                  if (stream.match("__")) {
                      state.nstyle ^= 4 /* STRONG */;
                      return ans;
                  }
                  if (stream.match(/^[*_]/)) {
                      state.nstyle ^= 2 /* EM */;
                      return ans;
                  }
                  if (stream.match("~~")) {
                      state.nstyle ^= 1 /* DEL */;
                      return ans;
                  }
              }
              ///////////////////////////////////////////////////////////////////
              // Finally, if nothing changed, move on
              if (!stream.match(meanlessCharsRE))
                  { stream.next(); }
              return (ans.length !== 0 ? ans : null);
          }
      };
      var gfmConfig = {
          name: "gfm",
          highlightFormatting: true,
          tokenTypeOverrides: {
              hr: "line-HyperMD-hr hr",
              // HyperMD needs to know the level of header/indent. using tokenTypeOverrides is not enough
              // header: "line-HyperMD-header header",
              // quote: "line-HyperMD-quote quote",
              list1: "list-1",
              list2: "list-2",
              list3: "list-3",
              code: "inline-code",
              gitHubSpice: false
          },
      };
      for (var attr in modeConfig) {
          gfmConfig[attr] = modeConfig[attr];
      }
      gfmConfig["name"] = "gfm"; // must be this
      var finalMode = CodeMirror.overlayMode(CodeMirror.getMode(config, gfmConfig), hypermdOverlay);
      // // now deal with indent method
      // var baseIndent = finalMode.indent;
      // finalMode.indent = function (state, textAfter) {
      //   console.log("INDENT", arguments)
      //   return baseIndent ? baseIndent(state, textAfter) : CodeMirror.Pass
      // }
      return finalMode;
  }, "gfm");
  CodeMirror.defineMIME("text/x-hypermd", "hypermd");

  // HyperMD, copyright (c) by laobubu
  /** a spinning gif image (16x16) */
  var spinGIF = '';
  var errorPNG = '';
  /**
   * send data to url
   *
   * @param method default: "POST"
   */
  function ajaxUpload(url, form, callback, method) {
      var xhr = new XMLHttpRequest();
      var formData = new FormData();
      for (var name in form)
          { formData.append(name, form[name]); }
      xhr.onreadystatechange = function () {
          if (4 == this.readyState) {
              var ret = xhr.responseText;
              try {
                  ret = JSON.parse(xhr.responseText);
              }
              catch (err) { }
              if (/^20\d/.test(xhr.status + "")) {
                  callback(ret, null);
              }
              else {
                  callback(null, ret);
              }
          }
      };
      xhr.open(method || 'POST', url, true);
      // xhr.setRequestHeader("Content-Type", "multipart/form-data");
      xhr.send(formData);
  }
  /**
   * Default FileHandler
   *
   * accepts images, uploads to https://sm.ms and inserts as `![](image_url)`
   */
  var DefaultFileHandler = function (files, action) {
      var unfinishedCount = 0;
      var placeholderForAll = document.createElement("div");
      placeholderForAll.className = "HyperMD-insertFile-dfh-placeholder";
      action.setPlaceholder(placeholderForAll);
      /** @type {{name:string, url:string, placeholder:HTMLImageElement, blobURL:string}[]} */
      var uploads = [];
      var supportBlobURL = typeof URL !== 'undefined';
      for (var i = 0; i < files.length; i++) {
          var file = files[i];
          if (!/image\//.test(file.type))
              { continue; }
          var blobURL = supportBlobURL ? URL.createObjectURL(file) : spinGIF;
          var name = file.name.match(/[^\\\/]+\.\w+$/)[0];
          var url = null;
          var placeholder = document.createElement("img");
          placeholder.onload = action.resize; // img size changed
          placeholder.className = "HyperMD-insertFile-dfh-uploading";
          placeholder.src = blobURL;
          placeholderForAll.appendChild(placeholder);
          uploads.push({
              blobURL: blobURL, name: name, url: url, placeholder: placeholder,
          });
          unfinishedCount++;
          // now start upload image. once uploaded, `finishImage(index, url)` shall be called
          Upload_SmMs(file, uploads.length - 1);
      }
      return unfinishedCount > 0;
      function finishImage(index, url) {
          uploads[index].url = url;
          var placeholder = uploads[index].placeholder;
          placeholder.className = "HyperMD-insertFile-dfh-uploaded";
          placeholder.src = url || errorPNG;
          if (supportBlobURL)
              { URL.revokeObjectURL(uploads[index].blobURL); }
          if (--unfinishedCount === 0) {
              var texts = uploads.map(function (it) { return ("![" + (it.name) + "](" + (it.url) + ")"); });
              action.finish(texts.join("\n"));
          }
      }
      function Upload_SmMs(file, index) {
          ajaxUpload('https://sm.ms/api/upload', {
              smfile: file,
              format: 'json'
          }, function (o, e) {
              var imgURL = (o && o.code == 'success') ? o.data.url : null;
              finishImage(index, imgURL);
          });
      }
  };
  var defaultOption = {
      byDrop: true,
      byPaste: true,
      fileHandler: DefaultFileHandler,
  };
  var InsertFile = function(cm) {
      var this$1 = this;

      this.byPaste = defaultOption.byPaste;
      this.byDrop = defaultOption.byDrop;
      this.fileHandler = defaultOption.fileHandler;
      this.pasteHandle = function (cm, ev) {
          if (!this$1.doInsert(ev.clipboardData || window['clipboardData']))
              { return; }
          ev.preventDefault();
      };
      this.dropHandle = function (cm, ev) {
          var self = this$1, cm = this$1.cm, result = false;
          cm.operation(function () {
              var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY });
              cm.setCursor(pos);
              result = self.doInsert(ev.dataTransfer);
          });
          if (!result)
              { return; }
          ev.preventDefault();
      };
      // Use FlipFlop to bind/unbind status
      this.ff_paste = new FlipFlop(
      /* ON  */ function () { return this$1.cm.on("paste", this$1.pasteHandle); },
      /* OFF */ function () { return this$1.cm.off("paste", this$1.pasteHandle); });
      this.ff_drop = new FlipFlop(
      /* ON  */ function () { return this$1.cm.on("drop", this$1.pasteHandle); },
      /* OFF */ function () { return this$1.cm.off("drop", this$1.pasteHandle); });
      this.cm = cm;
  };
  /**
   * upload files to the current cursor.
   *
   * @param {DataTransfer} data
   * @returns {boolean} data is accepted or not
   */
  InsertFile.prototype.doInsert = function (data) {
      var cm = this.cm;
      if (!data || !data.files || 0 === data.files.length)
          { return false; }
      var files = data.files;
      // only consider one format
      var fileHandlers = (typeof this.fileHandler === 'function') ? [this.fileHandler] : this.fileHandler;
      var handled = false;
      cm.operation(function () {
          var pos = cm.getCursor();
          var placeholderContainer = document.createElement("span");
          var marker = cm.markText(pos, { line: pos.line, ch: pos.ch + 1 }, {
              replacedWith: placeholderContainer,
              clearOnEnter: false,
              handleMouseEvents: false,
          });
          var action = {
              finish: function (text, cursor) { return cm.operation(function () {
                  pos = marker.find().from;
                  cm.replaceRange(text, pos, pos);
                  marker.clear();
                  if (typeof cursor === 'number')
                      { cm.setCursor({
                          line: pos.line,
                          ch: pos.ch + cursor,
                      }); }
              }); },
              setPlaceholder: function (el) {
                  if (placeholderContainer.childNodes.length > 0)
                      { placeholderContainer.removeChild(placeholderContainer.firstChild); }
                  placeholderContainer.appendChild(el);
                  marker.changed();
              },
              resize: function() {
                  marker.changed();
              }
          };
          for (var i = 0; i < fileHandlers.length; i++) {
              var fn = fileHandlers[i];
              if (fn(files, action)) {
                  handled = true;
                  break;
              }
          }
          if (!handled)
              { marker.clear(); }
      });
      return handled;
  };
  /** HYPERMD ADDON DECLARATION */
  var AddonAlias = "insertFile";
  var AddonClassCtor = InsertFile;
  var OptionName = "hmdInsertFile";
  var getAddon = Getter(AddonAlias, AddonClassCtor);
  CodeMirror.defineOption(OptionName, false, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || newVal === true) {
          newVal = { byDrop: enabled, byPaste: enabled };
      }
      else if (typeof newVal === 'function' || newVal instanceof Array) {
          newVal = { byDrop: enabled, byPaste: enabled, fileHandler: newVal };
      }
      else if (typeof newVal !== 'object') {
          throw new Error("[HyperMD] wrong hmdInsertFile option value");
      }
      var newCfg = migrateOption(newVal, defaultOption);
      ///// apply config
      var inst = getAddon(cm);
      inst.ff_paste.setBool(newCfg.byPaste);
      inst.ff_drop.setBool(newCfg.byDrop);
      ///// write new values into cm
      for (var k in defaultOption)
          { inst[k] = newCfg[k]; }
  });

  var insertFile = /*#__PURE__*/Object.freeze({
    ajaxUpload: ajaxUpload,
    DefaultFileHandler: DefaultFileHandler,
    InsertFile: InsertFile,
    defaultOption: defaultOption,
    getAddon: getAddon
  });

  // HyperMD, copyright (c) by laobubu
  var ReadLink = function(cm) {
      var this$1 = this;

      this.cm = cm;
      this.cache = {};
      cm.on("changes", debounce(function () { return this$1.rescan(); }, 500));
      this.rescan();
  };
  /**
   * get link footnote content like
   *
   * ```markdown
   *  [icon]: http://laobubu.net/icon.png
   * ```
   *
   * @param footNoteName case-insensive name, without "[" or "]"
   * @param line     current line. if not set, the first definition will be returned
   */
  ReadLink.prototype.read = function (footNoteName, line) {
      var defs = this.cache[footNoteName.trim().toLowerCase()] || [];
      var def;
      if (typeof line !== "number")
          { line = 1e9; }
      for (var i = 0; i < defs.length; i++) {
          def = defs[i];
          if (def.line > line)
              { break; }
      }
      return def;
  };
  /**
   * Scan content and rebuild the cache
   */
  ReadLink.prototype.rescan = function () {
      var cm = this.cm;
      var cache = (this.cache = {});
      cm.eachLine(function (line) {
          var txt = line.text, mat = /^(?:>\s+)*>?\s{0,3}\[([^\]]+)\]:\s*(.+)$/.exec(txt);
          if (mat) {
              var key = mat[1].trim().toLowerCase(), content = mat[2];
              if (!cache[key])
                  { cache[key] = []; }
              cache[key].push({
                  line: line.lineNo(),
                  content: content,
              });
          }
      });
  };
  /** HYPERMD ADDON DECLARATION */
  var AddonAlias$1 = "readLink";
  var AddonClassCtor$1 = ReadLink;
  var getAddon$1 = Getter(AddonAlias$1, AddonClassCtor$1);
  /** HYPERMD HELPER DECLARATION */
  function readLink(footNoteName, line) {
      return getAddon$1(this).read(footNoteName, line);
  }
  /**
   *
   * @param content eg. `http://laobubu.net/page "The Page"` or just a URL
   */
  function splitLink(content) {
      // remove title part (if exists)
      content = content.trim();
      var url = content, title = "";
      var mat = content.match(/^(\S+)\s+("(?:[^"\\]+|\\.)+"|[^"\s].*)/);
      if (mat) {
          url = mat[1];
          title = mat[2];
          if (title.charAt(0) === '"')
              { title = title.substr(1, title.length - 2).replace(/\\"/g, '"'); }
      }
      return { url: url, title: title };
  }
  CodeMirror.defineExtension("hmdReadLink", readLink);
  CodeMirror.defineExtension("hmdSplitLink", splitLink);

  var readLink$1 = /*#__PURE__*/Object.freeze({
    ReadLink: ReadLink,
    getAddon: getAddon$1,
    splitLink: splitLink
  });

  // HyperMD, copyright (c) by laobubu
  /********************************************************************************** */
  /** STATIC METHODS */
  /** if `marked` exists, use it; else, return safe html */
  function text2html(text) {
      if (typeof marked === 'function')
          { return marked(text); }
      return "<pre>" + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/  /g, ' &nbsp;') + "</pre>";
  }
  var defaultOption$1 = {
      enabled: false,
      xOffset: 10,
  };
  var OptionName$1 = "hmdHover";
  CodeMirror.defineOption(OptionName$1, false, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || typeof newVal === "boolean") {
          newVal = { enabled: enabled };
      }
      var newCfg = migrateOption(newVal, defaultOption$1);
      ///// apply config
      var inst = getAddon$2(cm);
      inst.ff_enable.setBool(newCfg.enabled);
      ///// write new values into cm
      for (var k in defaultOption$1)
          { inst[k] = newCfg[k]; }
  });
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias$2 = "hover";
  var Hover = function(cm) {
      var this$1 = this;

      this.cm = cm;
      var lineDiv = cm.display.lineDiv;
      this.lineDiv = lineDiv;
      var tooltip = document.createElement("div"), tooltipContent = document.createElement("div"), tooltipIndicator = document.createElement("div");
      tooltip.setAttribute("style", "position:absolute;z-index:99");
      tooltip.setAttribute("class", "HyperMD-hover");
      tooltip.setAttribute("cm-ignore-events", "true");
      tooltipContent.setAttribute("class", "HyperMD-hover-content");
      tooltip.appendChild(tooltipContent);
      tooltipIndicator.setAttribute("class", "HyperMD-hover-indicator");
      tooltip.appendChild(tooltipIndicator);
      this.tooltipDiv = tooltip;
      this.tooltipContentDiv = tooltipContent;
      this.tooltipIndicator = tooltipIndicator;
      var evhandler = this.mouseenter.bind(this);
      this.ff_enable = new FlipFlop(
      /* ON  */ function () { lineDiv.addEventListener("mouseenter", evhandler, true); },
      /* OFF */ function () { lineDiv.removeEventListener("mouseenter", evhandler, true); this$1.hideInfo(); });
  };
  Hover.prototype.mouseenter = function (ev) {
      var cm = this.cm, target = ev.target;
      var className = target.className;
      if (target == this.tooltipDiv || (target.compareDocumentPosition && (target.compareDocumentPosition(this.tooltipDiv) & 8) == 8)) {
          return;
      }
      if (target.nodeName !== "SPAN" || !/cm-hmd-barelink\b/.test(className)) {
          this.hideInfo();
          return;
      }
      var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY });
      var footnote = null;
      var range = expandRange(cm, pos, "hmd-barelink");
      if (range) {
          var text = cm.getRange(range.from, range.to);
          text = text.substr(1, text.length - 2);
          if (text)
              { footnote = cm.hmdReadLink(text, pos.line); }
      }
      if (!footnote) {
          this.hideInfo();
          return;
      }
      this.showInfo(text2html(footnote.content), target);
  };
  Hover.prototype.showInfo = function (html, relatedTo) {
      var b1 = relatedTo.getBoundingClientRect();
      var b2 = this.lineDiv.getBoundingClientRect();
      var tdiv = this.tooltipDiv;
      var xOffset = this.xOffset;
      this.tooltipContentDiv.innerHTML = html;
      tdiv.style.left = (b1.left - b2.left - xOffset) + 'px';
      this.lineDiv.appendChild(tdiv);
      var b3 = tdiv.getBoundingClientRect();
      if (b3.right > b2.right) {
          xOffset = b3.right - b2.right;
          tdiv.style.left = (b1.left - b2.left - xOffset) + 'px';
      }
      tdiv.style.top = (b1.top - b2.top - b3.height) + 'px';
      this.tooltipIndicator.style.marginLeft = xOffset + 'px';
  };
  Hover.prototype.hideInfo = function () {
      if (this.tooltipDiv.parentElement == this.lineDiv) {
          this.lineDiv.removeChild(this.tooltipDiv);
      }
  };
  var getAddon$2 = Getter(AddonAlias$2, Hover, defaultOption$1);

  var hover = /*#__PURE__*/Object.freeze({
    text2html: text2html,
    defaultOption: defaultOption$1,
    Hover: Hover,
    getAddon: getAddon$2
  });

  // HyperMD, copyright (c) by laobubu
  var defaultClickHandler = function (info, cm) {
      var text = info.text;
      var type = info.type;
      var url = info.url;
      var pos = info.pos;
      if (type === 'url' || type === 'link') {
          var footnoteRef = text.match(/\[[^\[\]]+\]$/); // bare link test. assume no escaping char inside
          if (footnoteRef && info.altKey) {
              // extract footnote part (with square brackets), then jump to the footnote
              text = footnoteRef[0];
              type = "footref";
          }
          else if ((info.ctrlKey || info.altKey) && url) {
              // just open URL
              window.open(url, "_blank");
          }
      }
      if (type === 'todo') {
          var ref = expandRange(cm, pos, "formatting-task");
          var from = ref.from;
          var to = ref.to;
          var text$1 = cm.getRange(from, to);
          text$1 = (text$1 === '[ ]') ? '[x]' : '[ ]';
          cm.replaceRange(text$1, from, to);
      }
      if (type === 'footref') {
          // Jump to FootNote
          var footnote_name = text.substr(1, text.length - 2);
          var footnote = cm.hmdReadLink(footnote_name, pos.line);
          if (footnote) {
              makeBackButton(cm, footnote.line, pos);
              cm.setCursor({ line: footnote.line, ch: 0 });
          }
      }
  };
  /**
   * Display a "go back" button. Requires "HyperMD-goback" gutter set.
   *
   * maybe not useful?
   *
   * @param line where to place the button
   * @param anchor when user click the back button, jumps to here
   */
  var makeBackButton = (function () {
      var bookmark = null;
      function updateBookmark(cm, pos) {
          if (bookmark) {
              cm.clearGutter("HyperMD-goback");
              bookmark.clear();
          }
          bookmark = cm.setBookmark(pos);
      }
      /**
       * Make a button, bind event handlers, but not insert the button
       */
      function makeButton(cm) {
          var hasBackButton = cm.options.gutters.indexOf("HyperMD-goback") != -1;
          if (!hasBackButton)
              { return null; }
          var backButton = document.createElement("div");
          backButton.className = "HyperMD-goback-button";
          backButton.addEventListener("click", function () {
              cm.setCursor(bookmark.find());
              cm.clearGutter("HyperMD-goback");
              bookmark.clear();
              bookmark = null;
          });
          var _tmp1 = cm.display.gutters.children;
          _tmp1 = _tmp1[_tmp1.length - 1];
          _tmp1 = _tmp1.offsetLeft + _tmp1.offsetWidth;
          backButton.style.width = _tmp1 + "px";
          backButton.style.marginLeft = -_tmp1 + "px";
          return backButton;
      }
      return function (cm, line, anchor) {
          var backButton = makeButton(cm);
          if (!backButton)
              { return; }
          backButton.innerHTML = (anchor.line + 1) + "";
          updateBookmark(cm, anchor);
          cm.setGutterMarker(line, "HyperMD-goback", backButton);
      };
  })();
  var defaultOption$2 = {
      enabled: false,
      handler: null,
  };
  var OptionName$2 = "hmdClick";
  CodeMirror.defineOption(OptionName$2, false, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || typeof newVal === "boolean") {
          newVal = { enabled: enabled };
      }
      else if (typeof newVal === "function") {
          newVal = { enabled: true, handler: newVal };
      }
      var newCfg = migrateOption(newVal, defaultOption$2);
      ///// apply config
      var inst = getAddon$3(cm);
      inst.ff_enable.setBool(newCfg.enabled);
      ///// write new values into cm
      for (var k in defaultOption$2)
          { inst[k] = newCfg[k]; }
  });
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias$3 = "click";
  var Click = function(cm) {
      var this$1 = this;

      this.cm = cm;
      /**
       * Unbind _mouseUp, then call ClickHandler if mouse not bounce
       */
      this._mouseUp = function (ev) {
          var cinfo = this$1._cinfo;
          this$1.lineDiv.removeEventListener("mouseup", this$1._mouseUp, false);
          if (Math.abs(ev.clientX - cinfo.clientX) > 5 || Math.abs(ev.clientY - cinfo.clientY) > 5)
              { return; }
          if (typeof this$1.handler === 'function' && this$1.handler(cinfo, this$1.cm) === false)
              { return; }
          defaultClickHandler(cinfo, this$1.cm);
      };
      /**
       * Try to construct ClickInfo and bind _mouseUp
       */
      this._mouseDown = function (ev) {
          var button = ev.button;
          var clientX = ev.clientX;
          var clientY = ev.clientY;
          var ctrlKey = ev.ctrlKey;
          var altKey = ev.altKey;
          var shiftKey = ev.shiftKey;
          var cm = this$1.cm;
          if (ev.target.tagName === "PRE")
              { return; }
          var pos = cm.coordsChar({ left: clientX, top: clientY });
          var range;
          var styles = " " + cm.getTokenTypeAt(pos) + " ";
          var mat;
          var type = null;
          var text, url;
          if (mat = styles.match(/\s(image|link|url)\s/)) {
              // Could be a image, link, bare-link, footref, footnote, plain url, plain url w/o angle brackets
              type = mat[1];
              range = expandRange(cm, pos, type);
              var isBareLink = /\shmd-barelink\s/.test(styles);
              if (/^(?:image|link)$/.test(type) && !isBareLink) {
                  // CodeMirror breaks [text] and (url)
                  // Let HyperMD mode handle it!
                  var tmp_range = expandRange(cm, { line: pos.line, ch: range.to.ch + 1 }, "url");
                  range.to = tmp_range.to;
              }
              text = cm.getRange(range.from, range.to);
              // now extract the URL. boring job
              var t = text.replace(/^\!?\[/, '');
              if ((mat = t.match(/[^\\]\]\((.+)\)$/)) // .](url) image / link without ref
              ) {
                  // remove title part (if exists)
                  url = splitLink(mat[1]).url;
              }
              else if ((mat = t.match(/[^\\]\]\[(.+)\]$/)) || // .][ref] image / link with ref
                  (mat = text.match(/^\[(.+)\](?:\:\s*)?$/)) // [barelink] or [^ref] or [footnote]:
              ) {
                  if (isBareLink && mat[1].charAt(0) === '^')
                      { type = 'footref'; }
                  var t2 = cm.hmdReadLink(mat[1], pos.line);
                  if (!t2)
                      { url = null; }
                  else {
                      // remove title part (if exists)
                      url = splitLink(t2.content).url;
                  }
              }
              else if ((mat = text.match(/^\<(.+)\>$/)) || // <http://laobubu.net>
                  (mat = text.match(/^\((.+)\)$/)) || // (http://laobubu.net)
                  (mat = [null, text]) // http://laobubu.netlast possibility: plain url w/o < >
              ) {
                  url = mat[1];
              }
          }
          else if (styles.match(/\sformatting-task\s/)) {
              // TO-DO checkbox
              type = "todo";
              range = expandRange(cm, pos, "formatting-task");
              range.to.ch = cm.getLine(pos.line).length;
              text = cm.getRange(range.from, range.to);
              url = null;
          }
          if (type !== null) {
              this$1._cinfo = {
                  type: type, text: text, url: url, pos: pos,
                  button: button, clientX: clientX, clientY: clientY,
                  ctrlKey: ctrlKey, altKey: altKey, shiftKey: shiftKey,
              };
              this$1.lineDiv.addEventListener('mouseup', this$1._mouseUp, false);
          }
      };
      this.lineDiv = cm.display.lineDiv;
      this.ff_enable = new FlipFlop(
      /* ON  */ function () { this$1.lineDiv.addEventListener("mousedown", this$1._mouseDown, false); },
      /* OFF */ function () { this$1.lineDiv.removeEventListener("mousedown", this$1._mouseDown, false); });
  };
  /** ADDON GETTER: Only one addon instance allowed in a editor */
  var getAddon$3 = Getter(AddonAlias$3, Click, defaultOption$2);

  var click = /*#__PURE__*/Object.freeze({
    defaultClickHandler: defaultClickHandler,
    defaultOption: defaultOption$2,
    Click: Click,
    getAddon: getAddon$3
  });

  // HyperMD, copyright (c) by laobubu
  var getTurndownService = (function () {
      var service = null;
      return function () {
          if (!service && typeof TurndownService === 'function') {
              var opts = {
                  "headingStyle": "atx",
                  "hr": "---",
                  "bulletListMarker": "*",
                  "codeBlockStyle": "fenced",
                  "fence": "```",
                  "emDelimiter": "*",
                  "strongDelimiter": "**",
                  "linkStyle": "inlined",
                  "linkReferenceStyle": "collapsed"
              };
              service = new TurndownService(opts);
              if (typeof turndownPluginGfm !== 'undefined') {
                  service.use(turndownPluginGfm.gfm);
              }
          }
          return service;
      };
  })();
  var defaultConvertor = function (html) {
      var turndownService = getTurndownService();
      if (turndownService)
          { return turndownService.turndown(html); }
      return null;
  };
  /********************************************************************************** */
  /** ADDON OPTIONS */
  var OptionName$3 = "hmdPaste";
  CodeMirror.defineOption(OptionName$3, false, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || typeof newVal === "boolean") {
          newVal = defaultConvertor;
      }
      ///// apply config
      var inst = getAddon$4(cm);
      inst.ff_enable.setBool(enabled);
      inst.convertor = newVal;
  });
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias$4 = "paste";
  var Paste = function(cm) {
      var this$1 = this;

      // add your code here
      this.cm = cm;
      this.convertor = defaultConvertor;
      this.pasteHandler = function (cm, ev) {
          var cd = ev.clipboardData || window['clipboardData'];
          var convertor = this$1.convertor;
          if (!convertor || !cd || cd.types.indexOf('text/html') == -1)
              { return; }
          var result = convertor(cd.getData('text/html'));
          if (!result)
              { return; }
          cm.operation(cm.replaceSelection.bind(cm, result));
          ev.preventDefault();
      };
      this.ff_enable = new FlipFlop(
      /* ON  */ function () { cm.on('paste', this$1.pasteHandler); },
      /* OFF */ function () { cm.off('paste', this$1.pasteHandler); });
  };
  /** ADDON GETTER: Only one addon instance allowed in a editor */
  var getAddon$4 = Getter(AddonAlias$4, Paste);

  var paste = /*#__PURE__*/Object.freeze({
    defaultConvertor: defaultConvertor,
    Paste: Paste,
    getAddon: getAddon$4
  });

  // HyperMD, copyright (c) by laobubu
  var DEBUG = false;
  var builtinFolder = {
      image: function(stream, token) {
          var cm = stream.cm;
          var imgRE = /\bimage-marker\b/;
          var urlRE = /\bformatting-link-string\b/; // matches the parentheses
          if (imgRE.test(token.type) && token.string === "!") {
              var lineNo = stream.lineNo;
              // find the begin and end of url part
              var url_begin = stream.findNext(urlRE);
              var url_end = stream.findNext(urlRE, url_begin.i_token + 1);
              var from = { line: lineNo, ch: token.start };
              var to = { line: lineNo, ch: url_end.token.end };
              var rngReq = stream.requestRange(from, to);
              if (rngReq === RequestRangeResult.OK) {
                  var url;
                  var title;
                  { // extract the URL
                      var rawurl = cm.getRange(// get the URL or footnote name in the parentheses
                      { line: lineNo, ch: url_begin.token.start + 1 }, { line: lineNo, ch: url_end.token.start });
                      if (url_end.token.string === "]") {
                          var tmp = cm.hmdReadLink(rawurl, lineNo);
                          if (!tmp)
                              { return null; } // Yup! bad URL?!
                          rawurl = tmp.content;
                      }
                      url = splitLink(rawurl).url;
                  }
                  { // extract the title
                      title = cm.getRange({ line: lineNo, ch: from.ch + 2 }, { line: lineNo, ch: url_begin.token.start - 1 });
                  }
                  var img = document.createElement("img");
                  var marker = cm.markText(from, to, {
                      collapsed: true,
                      replacedWith: img,
                  });
                  img.addEventListener('load', function () {
                      img.classList.remove("hmd-image-loading");
                      marker.changed();
                  }, false);
                  img.addEventListener('error', function () {
                      img.classList.remove("hmd-image-loading");
                      img.classList.add("hmd-image-error");
                      marker.changed();
                  }, false);
                  img.addEventListener('click', function () { return breakMark(cm, marker); }, false);
                  img.className = "hmd-image hmd-image-loading";
                  img.src = url;
                  img.title = title;
                  return marker;
              }
              else {
                  if (DEBUG) {
                      console.log("[image]FAILED TO REQUEST RANGE: ", rngReq);
                  }
              }
          }
          return null;
      },
      link: function(stream, token) {
          var cm = stream.cm;
          var urlRE = /\bformatting-link-string\b/; // matches the parentheses
          var endTest = function (token) { return (urlRE.test(token.type) && token.string === ")"); };
          if (token.string === "(" && urlRE.test(token.type) && // is URL left parentheses
              (stream.i_token === 0 || !/\bimage/.test(stream.lineTokens[stream.i_token - 1].type)) // not a image URL
          ) {
              var lineNo = stream.lineNo;
              var url_end = stream.findNext(endTest);
              var from = { line: lineNo, ch: token.start };
              var to = { line: lineNo, ch: url_end.token.end };
              var rngReq = stream.requestRange(from, to);
              if (rngReq === RequestRangeResult.OK) {
                  var text = cm.getRange(from, to);
                  var ref = splitLink(text.substr(1, text.length - 2));
                  var url = ref.url;
                  var title = ref.title;
                  var img = document.createElement("span");
                  img.setAttribute("class", "hmd-link-icon");
                  img.setAttribute("title", url + "\n" + title);
                  img.setAttribute("data-url", url);
                  var marker = cm.markText(from, to, {
                      collapsed: true,
                      replacedWith: img,
                  });
                  img.addEventListener('click', function () { return breakMark(cm, marker); }, false);
                  return marker;
              }
              else {
                  if (DEBUG) {
                      console.log("[link]FAILED TO REQUEST RANGE: ", rngReq);
                  }
              }
          }
          return null;
      },
  };
  /********************************************************************************** */
  /** UTILS */
  /** break a TextMarker, move cursor to where marker is */
  function breakMark(cm, marker, chOffset) {
      cm.operation(function () {
          var pos = marker.find().from;
          pos = { line: pos.line, ch: pos.ch + ~~chOffset };
          cm.setCursor(pos);
          cm.focus();
          marker.clear();
      });
  }
  var defaultOption$3 = {
      image: false,
      link: false,
      customFolders: {},
  };
  var OptionName$4 = "hmdFold";
  CodeMirror.defineOption(OptionName$4, false, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || typeof newVal === "boolean") {
          // enable/disable all builtinFolder
          newVal = {};
          for (var type in builtinFolder)
              { newVal[type] = enabled; }
      }
      var newCfg = migrateOption(newVal, defaultOption$3);
      ///// apply config
      var inst = getAddon$5(cm);
      for (var type$1 in builtinFolder)
          { inst.setBuiltinStatus(type$1, newVal[type$1]); }
      if (typeof newVal.customFolders !== "object")
          { newVal.customFolders = {}; }
      var customFolderTypes = [];
      for (var key in newVal.customFolders) {
          if (newVal.customFolders.hasOwnProperty(key)) {
              customFolderTypes.push(key);
              if (!(key in inst.folded))
                  { inst.folded[key] = []; }
          }
      }
      //TODO: shall we clear disappeared folder's legacy?
      inst.customFolderTypes = customFolderTypes;
      ///// start a fold
      inst.startFold();
  });
  var RequestRangeResult;
  (function (RequestRangeResult) {
      // Use string values because in TypeScript, string enum members do not get a reverse mapping generated at all.
      // Otherwise the generated code looks ugly
      RequestRangeResult["OK"] = "ok";
      RequestRangeResult["CURSOR_INSIDE"] = "ci";
      RequestRangeResult["HAS_MARKERS"] = "hm";
  })(RequestRangeResult || (RequestRangeResult = {}));
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias$5 = "fold";
  var Fold = function(cm) {
      var this$1 = this;

      this.cm = cm;
      // stores builtin Folder status with FlipFlops
      this.ff_builtin = {};
      /** Folder's output goes here */
      this.folded = {};
      /// END OF APIS THAT EXPOSED TO FolderFunc
      ///////////////////////////////////////////////////////////////////////////////////////////
      /**
       * Fold everything! (This is a debounced, and `this`-binded version)
       */
      this.startFold = debounce(this.startFoldImmediately.bind(this), 100);
      /** stores every affected lineNo */
      this._quickFoldHint = [];
      cm.on("changes", function (cm, changes) {
          var fromLine = changes.reduce(function (prev, curr) { return Math.min(prev, curr.from.line); }, cm.lastLine());
          this$1.startFold();
      });
      cm.on("cursorActivity", function (cm) {
          this$1.startQuickFold();
      });
  };
  /** Update a builtin folder's status, and fold/unfold */
  Fold.prototype.setBuiltinStatus = function (type, status) {
      if (!(type in builtinFolder))
          { return; }
      var ff = this.ff_builtin[type];
      if (!ff) { //whoops, the FlipFlop not created
          ff = new FlipFlop(this.startFold, this.clear.bind(this, type));
          this.ff_builtin[type] = ff;
      }
      ff.setBool(status);
  };
  Fold.prototype.findNext = function (condition, varg, since) {
      var lineNo = this.lineNo;
      var tokens = this.lineTokens;
      var token = null;
      var i_token;
      if (varg === true && !since) {
          since = { line: lineNo + 1, ch: 0 };
      }
      else if (varg === false && since) {
          if (since.line !== lineNo)
              { return null; }
          for (i_token = 0; i_token < tokens.length; i_token++) {
              if (tokens[i_token].start >= since.ch)
                  { break; }
          }
      }
      else if (typeof varg === 'number') {
          i_token = varg;
      }
      else {
          i_token = this.i_token + 1;
      }
      for (; i_token < tokens.length; i_token++) {
          var token_tmp = tokens[i_token];
          if ((typeof condition === "function") ? condition(token_tmp) : condition.test(token_tmp.type)) {
              token = token_tmp;
              break;
          }
      }
      if (!token && varg === true) {
          var cm = this.cm;
          cm.eachLine(since.line, cm.lastLine() + 1, function (line_i) {
              lineNo = line_i.lineNo();
              tokens = cm.getLineTokens(lineNo);
              i_token = 0;
              if (lineNo === since.line) {
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
  /** Update `Fold` stream's current position */
  Fold.prototype.setPos = function (line, ch, precise) {
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
   * Check if a range is foldable and update _quickFoldHint
   *
   * NOTE: this function is always called after `_quickFoldHint` reset by `startFoldImmediately`
   */
  Fold.prototype.requestRange = function (from, to) {
      var cm = this.cm, cmpPos = CodeMirror.cmpPos;
      var cursorPos = cm.getCursor();
      var markers = cm.findMarks(from, to);
      var ans = RequestRangeResult.OK;
      if (markers.length !== 0)
          { ans = RequestRangeResult.HAS_MARKERS; }
      else if (cmpPos(cursorPos, from) >= 0 && cmpPos(cursorPos, to) <= 0)
          { ans = RequestRangeResult.CURSOR_INSIDE; }
      if (ans !== RequestRangeResult.OK)
          { this._quickFoldHint.push(from.line); }
      return ans;
  };
  /**
   * Fold everything!
   *
   * @param toLine last line to fold. Inclusive
   */
  Fold.prototype.startFoldImmediately = function (fromLine, toLine) {
          var this$1 = this;

      var cm = this.cm;
      fromLine = fromLine || cm.firstLine();
      toLine = (toLine || cm.lastLine()) + 1;
      this._quickFoldHint = [];
      this.setPos(fromLine, 0, true);
      cm.eachLine(fromLine, toLine, function (line) {
          var lineNo = line.lineNo();
          if (lineNo < this$1.lineNo)
              { return; } // skip current line...
          else if (lineNo > this$1.lineNo)
              { this$1.setPos(lineNo, 0); } // hmmm... maybe last one is empty line
          var charMarked = new Array(line.text.length);
          {
              // populate charMarked array.
              // @see CodeMirror's findMarksAt
              var lineMarkers = line.markedSpans;
              if (lineMarkers) {
                  for (var i = 0; i < lineMarkers.length; ++i) {
                      var span = lineMarkers[i];
                      var spanFrom = span.from == null ? 0 : span.from;
                      var spanTo = span.to == null ? charMarked.length : span.to;
                      for (var j = spanFrom; j < spanTo; j++)
                          { charMarked[j] = true; }
                  }
              }
          }
          var tokens = this$1.lineTokens;
          while (this$1.i_token < tokens.length) {
              var token = tokens[this$1.i_token];
              var type;
              var marker = null;
              var tokenFoldable = true;
              {
                  for (var i$1 = token.start; i$1 < token.end; i$1++) {
                      if (charMarked[i$1]) {
                          tokenFoldable = false;
                          break;
                      }
                  }
              }
              if (tokenFoldable) {
                  // try built-in folders
                  for (type in this$1.ff_builtin) {
                      if (this$1.ff_builtin[type].state && (marker = builtinFolder[type](this$1, token)))
                          { break; }
                  }
                  if (!marker) {
                      // try custom folders
                      for (var i$2 = 0, list = this$1.customFolderTypes; i$2 < list.length; i$2 += 1) {
                          type = list[i$2];

                              if (marker = this$1.customFolders[type](this$1, token))
                              { break; }
                      }
                  }
              }
              if (!marker) {
                  // this token not folded. check next
                  this$1.i_token++;
              }
              else {
                  var ref = marker.find();
                      var from = ref.from;
                      var to = ref.to;
                  (this$1.folded[type] || (this$1.folded[type] = [])).push(marker);
                  marker.on('clear', function (from, to) {
                      var markers = this$1.folded[type];
                      var idx;
                      if (markers && (idx = markers.indexOf(marker)) !== -1)
                          { markers.splice(idx, 1); }
                      this$1._quickFoldHint.push(from.line);
                  });
                  if (DEBUG) {
                      console.log("[FOLD] New marker ", type, from, to, marker);
                  }
                  if (to.line !== lineNo) {
                      this$1.setPos(to.line, to.ch);
                      return; // nothing left in this line
                  }
                  else {
                      this$1.setPos(to.ch); // i_token will be updated by this.setPos()
                  }
              }
          }
      });
  };
  /**
   * Start a quick fold: only process recent `requestRange`-failed ranges
   */
  Fold.prototype.startQuickFold = function () {
      var hint = this._quickFoldHint;
      if (hint.length === 0)
          { return; }
      var from = hint[0], to = from;
      for (var i = 0, list = hint; i < list.length; i += 1) {
          var lineNo = list[i];

              if (from > lineNo)
              { from = lineNo; }
          if (to < lineNo)
              { to = lineNo; }
      }
      this.startFold.stop();
      this.startFoldImmediately(from, to);
  };
  /**
   * Clear one type of folded TextMarkers
   *
   * @param type builtin folder type ("image", "link" etc) or custom fold type
   */
  Fold.prototype.clear = function (type) {
      var folded = this.folded[type];
      if (!folded || !folded.length)
          { return; }
      for (var i = 0, list = folded; i < list.length; i += 1) {
          var marker = list[i];

              marker.clear();
      }
      folded.splice(0);
  };
  /**
   * Clear all folding result
   */
  Fold.prototype.clearAll = function () {
          var this$1 = this;

      for (var type in this$1.folded) {
          var folded = this$1.folded[type];
          for (var i = 0, list = folded; i < list.length; i += 1) {
              var marker = list[i];

                  marker.clear();
          }
          folded.splice(0);
      }
  };
  /** ADDON GETTER: Only one addon instance allowed in a editor */
  var getAddon$5 = Getter(AddonAlias$5, Fold, defaultOption$3 /** if has options */);

  var fold = /*#__PURE__*/Object.freeze({
    builtinFolder: builtinFolder,
    breakMark: breakMark,
    defaultOption: defaultOption$3,
    get RequestRangeResult () { return RequestRangeResult; },
    Fold: Fold,
    getAddon: getAddon$5
  });

  // HyperMD, copyright (c) by laobubu
  var DEBUG$1 = false;
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
      var foldMathAddon = getAddon$6(cm);
      var reqAns = stream.requestRange(from, to);
      if (reqAns !== RequestRangeResult.OK) {
          if (reqAns === RequestRangeResult.CURSOR_INSIDE)
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
      if (DEBUG$1) {
          console.log("insert", p1, p2, expression);
      }
      var marker = cm.markText(p1, p2, {
          className: "hmd-fold-math",
          replacedWith: span,
          clearOnEnter: true
      });
      span.addEventListener("click", function () { return breakMark(cm, marker, tokenLength); }, false);
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
      tryToRun(function () {
          if (DEBUG$1)
              { console.log("[MATH] Trying to render ", expression); }
          if (!mathRenderer.isReady())
              { return false; }
          mathRenderer.startRender(expression);
          return true;
      }, 5, function () {
          marker.clear();
          if (DEBUG$1) {
              console.log("[MATH] engine always not ready. faild to render ", expression, p1);
          }
      });
      return marker;
  }
  //////////////////////////////////////////////////////////////////
  ///
  builtinFolder["math"] = MathFolder; // inject fold's builtinFolders! Not cool but it works
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
      switch (MathJaxRenderer._mathjax_loading) {
          case 2:
              this.isReady = function () { return true; };
              return true;
          case 0:
              if (typeof MathJax !== 'undefined') {
                  MathJax.Hub.Register.StartupHook("End", function () {
                      MathJaxRenderer._mathjax_loading = 2;
                  });
                  MathJaxRenderer._mathjax_loading = 1;
              }
          default:
              return false;
      }
  };
  MathJaxRenderer._mathjax_loading = 0; // 0= not loaded  1= loading  2= ready
  var defaultOption$4 = {
      renderer: null /*StupidRenderer*/,
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
      this.ff_pv = new FlipFlop(
      /** CHANGED */ function (expr) { this$1.onPreview && this$1.onPreview(expr); },
      /** HIDE*/ function () { this$1.onPreviewEnd && this$1.onPreviewEnd(); }, null);
      for (var k in defaultOption$4)
          { this$1[k] = defaultOption$4[k]; }
  };
  var OptionName$5 = "hmdFoldMath";
  CodeMirror.defineOption(OptionName$5, defaultOption$4, function (cm, newVal) {
      var newCfg = defaultOption$4;
      if (typeof newVal === 'object') {
          newCfg = migrateOption(newVal, defaultOption$4);
      }
      else {
          console.warn("[HyperMD FoldMath] wrong option format. If you want to stop folding math. set options.hmdFold.math = false");
      }
      var inst = getAddon$6(cm);
      for (var k in newCfg)
          { inst[k] = newCfg[k]; }
  });
  var AddonAlias$6 = "foldMath";
  var getAddon$6 = Getter(AddonAlias$6, FoldMath, defaultOption$4);

  var foldMath = /*#__PURE__*/Object.freeze({
    MathFolder: MathFolder,
    insertMathMark: insertMathMark,
    StupidRenderer: StupidRenderer,
    MathJaxRenderer: MathJaxRenderer,
    defaultOption: defaultOption$4,
    getAddon: getAddon$6
  });

  // HyperMD, copyright (c) by laobubu
  /********************************************************************************** */
  /** ADDON OPTIONS */
  var OptionName$6 = "hmdLoadModeFrom";
  CodeMirror.defineOption(OptionName$6, false, function (cm, newVal) {
      var enabled = !!newVal;
      ///// apply config
      var inst = getAddon$7(cm);
      inst.ff_enable.setBool(enabled);
      inst.source = newVal;
  });
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias$7 = "modeLoader";
  var ModeLoader = function(cm) {
      var this$1 = this;

      // add your code here
      this.cm = cm;
      this.source = "./node_modules/codemirror/"; // url prefix
      this._loadingModes = {};
      /**
       * CodeMirror "renderLine" event handler
       */
      this.rlHandler = function (cm, line) {
          var lineNo = line.lineNo();
          var text = line.text || "", mat = text.match(/^```\s*(\S+)/);
          if (mat) { // seems found one code fence
              var lang = mat[1];
              var modeInfo = CodeMirror.findModeByName(lang);
              var modeName = modeInfo && modeInfo.mode;
              if (modeName && !(modeName in CodeMirror.modes)) {
                  // a not-loaded mode is found!
                  // now we shall load mode `modeName`
                  this$1.startLoadMode(modeName, lineNo);
              }
          }
      };
      this.ff_enable = new FlipFlop(
      /* ON  */ function () { cm.on("renderLine", this$1.rlHandler); },
      /* OFF */ function () { cm.off("renderLine", this$1.rlHandler); });
  };
  /** trig a "change" event on one line */
  ModeLoader.prototype.touchLine = function (lineNo) {
      var line = this.cm.getLineHandle(lineNo);
      var lineLen = line.text.length;
      this.cm.replaceRange(line.text.charAt(lineLen - 1), { line: lineNo, ch: lineLen - 1 }, { line: lineNo, ch: lineLen });
  };
  /**
   * load a mode, then refresh editor
   *
   * @param  mode
   * @param  line >=0 : add into waiting queue<0 : load and retry up to `-line` times
   */
  ModeLoader.prototype.startLoadMode = function (mode, line) {
      var linesWaiting = this._loadingModes;
      var self = this;
      if (line >= 0 && mode in linesWaiting) {
          linesWaiting[mode].push(line);
          return;
      }
      // start load a mode
      if (line >= 0)
          { linesWaiting[mode] = [line]; }
      var successCb = function () {
          console.log("[HyperMD] mode-loader loaded " + mode);
          var lines = linesWaiting[mode];
          self.cm.operation(function () {
              for (var i = 0; i < lines.length; i++) {
                  self.touchLine(lines[i]);
              }
          });
          delete linesWaiting[mode];
      };
      var errorCb = function () {
          console.warn("[HyperMD] mode-loader failed to load mode " + mode + " from ", url);
          if (line === -1) {
              // no more chance
              return;
          }
          console.log("[HyperMD] mode-loader will retry loading " + mode);
          setTimeout(function () {
              self.startLoadMode(mode, line >= 0 ? -3 : (line + 1));
          }, 1000);
      };
      var url = this.source + "mode/" + mode + "/" + mode + ".js";
      if (typeof requirejs === 'function' && url.charAt(0) === "~") {
          // require.js
          requirejs([
              url.slice(1, -3) ], successCb);
      }
      else {
          // trandition loadScript
          var script = document.createElement('script');
          script.onload = successCb;
          script.onerror = errorCb;
          script.src = url;
          document.head.appendChild(script);
      }
  };
  /** ADDON GETTER: Only one addon instance allowed in a editor */
  var getAddon$7 = Getter(AddonAlias$7, ModeLoader);

  var modeLoader = /*#__PURE__*/Object.freeze({
    ModeLoader: ModeLoader,
    getAddon: getAddon$7
  });

  // HyperMD, copyright (c) by laobubu
  /********************************************************************************** */
  // Some parameter LGTM
  var silenceDuration = 100, distance = 5;
  /********************************************************************************** */
  /** ADDON OPTIONS */
  var OptionName$7 = "hmdCursorDebounce";
  CodeMirror.defineOption(OptionName$7, false, function (cm, newVal) {
      var enabled = !!newVal;
      ///// apply config
      var inst = getAddon$8(cm);
      inst.ff_enable.setBool(enabled);
  });
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias$8 = "cursorDebounce";
  var CursorDebounce = function(cm) {
      var this$1 = this;

      // add your code here
      this.cm = cm;
      this.mouseDownHandler = function (cm, ev) {
          this$1.lastX = ev.clientX;
          this$1.lastY = ev.clientY;
          var supressor = this$1.mouseMoveSuppress;
          document.addEventListener("mousemove", supressor, true);
          if (this$1.lastTimeout)
              { clearTimeout(this$1.lastTimeout); }
          this$1.lastTimeout = setTimeout(function () {
              document.removeEventListener("mousemove", supressor, true);
              this$1.lastTimeout = null;
          }, silenceDuration);
      };
      this.mouseMoveSuppress = function (ev) {
          if ((Math.abs(ev.clientX - this$1.lastX) <= distance) && (Math.abs(ev.clientY - this$1.lastY) <= distance))
              { ev.stopPropagation(); }
      };
      this.ff_enable = new FlipFlop(
      /* ON  */ function () { cm.on('mousedown', this$1.mouseDownHandler); },
      /* OFF */ function () { cm.off('mousedown', this$1.mouseDownHandler); });
  };
  /** ADDON GETTER: Only one addon instance allowed in a editor */
  var getAddon$8 = Getter(AddonAlias$8, CursorDebounce);

  var cursorDebounce = /*#__PURE__*/Object.freeze({
    CursorDebounce: CursorDebounce,
    getAddon: getAddon$8
  });

  // All in one HyperMD bundle!

  exports.InsertFile = insertFile;
  exports.ReadLink = readLink$1;
  exports.Hover = hover;
  exports.Click = click;
  exports.Paste = paste;
  exports.Fold = fold;
  exports.FoldMath = foldMath;
  exports.ModeLoader = modeLoader;
  exports.CursorDebounce = cursorDebounce;
  exports.Addon = Addon$1;
  exports.FlipFlop = FlipFlop;
  exports.tryToRun = tryToRun;
  exports.debounce = debounce;
  exports.fromTextArea = fromTextArea;
  exports.switchToNormal = switchToNormal;
  exports.switchToHyperMD = switchToHyperMD;
  exports.getEveryCharToken = getEveryCharToken;
  exports.expandRange = expandRange;
  exports.updateCursorDisplay = updateCursorDisplay;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
