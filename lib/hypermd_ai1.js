(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('codemirror/mode/gfm/gfm'), require('codemirror/addon/mode/overlay'), require('marked')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', 'codemirror/mode/gfm/gfm', 'codemirror/addon/mode/overlay', 'marked'], factory) :
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
      var newVal = typeof state === 'object' ? state[this.subkey] : state;
      if (toBool)
          { newVal = !!newVal; }
      if (newVal === this.state)
          { return; }
      if (this.state = newVal)
          { this.on_cb(this); }
      else
          { this.off_cb(this); }
  };
  FlipFlop.prototype.setBool = function (state) {
      return this.set(state, true);
  };
  /**
   * execute a function, and async retry if it doesn't returns true
   */
  function tryToRun(fn, times) {
      times = ~~times || 5;
      var delayTime = 250;
      function nextCycle() {
          if (!times--)
              { return; }
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
          // (addon) fold
          // turn images and links into what you want to see
          hmdAutoFold: 200,
          // (addon) fold-math
          // MathJax support. Both `$` and `$$` are supported
          hmdFoldMath: {
              interval: 200,
              preview: true // providing a preview while composing math
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
      // (addon) click
      // (dependencies) addon/readlink
      // click to follow links and footnotes
      if (typeof cm['hmdClickInit'] === 'function')
          { cm.hmdClickInit(); }
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
      // stop auto folding
      editor.setOption('hmdAutoFold', 0);
      editor.setOption('hmdFoldMath', false);
      // unfold all folded parts
      setTimeout(function () {
          var marks = editor.getAllMarks();
          for (var i = 0; i < marks.length; i++) {
              var mark = marks[i];
              if (/^hmd-/.test(mark.className))
                  { mark.clear(); }
          }
      }, 200); // FIXME: the timeout is not determined
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
      editor.setOption('hmdAutoFold', 200);
      editor.setOption('hmdFoldMath', { interval: 200, preview: true });
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
  var listRE = /^\s*(?:[*\-+]|[0-9]+([.)]))\s+/; // this regex is from CodeMirror's sourcecode
  var tableTitleSepRE = /^\s*\|?(?:\s*\:?\s*\-+\s*\:?\s*\|)*\s*\:?\s*\-+\s*\:?\s*\|?\s*$/; // find  |:-----:|:-----:| line
  var insideValues = {
      math: 1,
      listSpace: 2,
      tableTitleSep: 4,
  };
  var nstyleValues = {
      /* ....xxxx [standalone]  */ DEL: 0x01, EM: 0x02, STRONG: 0x04, ESCAPE: 0x08,
      /* ####.... link relative */ LINK: 0x10, BARELINK: 0x20, FOOTREF: 0x30, FOOTREF_BEGIN: 0x40, FOOTNOTE_NAME: 0x50,
  };
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
              if (state.inside === insideValues.math) {
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
                          state.inside = insideValues.tableTitleSep;
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
                      state.inside = insideValues.listSpace;
                      state.extra = 0;
                  }
              }
              // following `if (state.listSpaceStack.length !== 0 || stream.match(listRE, false))` 's status
              if (state.inside === insideValues.listSpace) {
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
                  case insideValues.tableTitleSep:
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
                  state.inside = insideValues.math;
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
              // if nstyle changes, do `return` at once
              var nstyle = state.nstyle;
              var ns_link = nstyle & 0xF0;
              var ans = "";
              // current style is ....
              if (ns_link !== 0) {
                  switch (ns_link) {
                      case nstyleValues.FOOTNOTE_NAME:
                          ans += "hmd-footnote ";
                          break;
                      case nstyleValues.FOOTREF_BEGIN:
                          ans += "hmd-footref-lead ";
                      case nstyleValues.FOOTREF:
                          ans += "hmd-footref ";
                      case nstyleValues.BARELINK:
                          ans += "hmd-barelink ";
                      // case nstyleValues.LINK:  // HyperMD mode doesn't care about normal link
                  }
              }
              ///////////////////////////////////////
              /// start changing nstyle (if needed)
              /// exiting escape
              if (nstyle & nstyleValues.ESCAPE) {
                  ans += "hmd-escape hmd-escape-char ";
                  state.nstyle -= nstyleValues.ESCAPE;
                  stream.next();
                  return ans;
              }
              /// entering escape?
              if (stream.match(/^\\(?=.)/)) {
                  // found the backslash
                  state.nstyle |= nstyleValues.ESCAPE;
                  ans += "formatting-hmd-escape hmd-escape hmd-escape-backslash ";
                  return ans;
              }
              /// enter/exit a link/footref/bare-link/footnote
              if (ns_link === 0) {
                  if (stream.match(/^\[([^\]]+)\]/, false)) {
                      /// found a start
                      stream.next();
                      if (atBeginning && stream.match(/^(?:[^\]]+)\]\:/, false)) {
                          // found a beginning of footnote
                          state.nstyle |= nstyleValues.FOOTNOTE_NAME;
                          ans += "hmd-footnote line-HyperMD-footnote ";
                      }
                      else if (stream.match(/^(?:[^\]]+)\](?:[^\[\(]|$)/, false)) {
                          // a [bare link] could be a [^footref]
                          if (stream.peek() === '^') {
                              state.nstyle |= nstyleValues.FOOTREF_BEGIN;
                              ans += "hmd-barelink hmd-footref ";
                          }
                          else {
                              state.nstyle |= nstyleValues.BARELINK;
                              ans += "hmd-barelink ";
                          }
                      }
                      else {
                          state.nstyle |= nstyleValues.LINK;
                      }
                      return ans;
                  }
              }
              else {
                  // current is inside a link
                  switch (ns_link) {
                      case nstyleValues.FOOTREF_BEGIN:
                          // caught the "^"
                          state.nstyle = nstyle & ~0xF0 | nstyleValues.FOOTREF;
                          stream.next();
                          return ans;
                      case nstyleValues.FOOTREF:
                      case nstyleValues.BARELINK:
                      case nstyleValues.LINK:
                          if (stream.eat(']')) {
                              state.nstyle = nstyle & ~0xF0;
                              return ans;
                          }
                      case nstyleValues.FOOTNOTE_NAME:
                          if (stream.match(']:')) {
                              state.nstyle = nstyle & ~0xF0;
                              return ans;
                          }
                  }
              }
              /// skip some normal Markdown inline stuff
              if (stream.match("**")) {
                  state.nstyle ^= nstyleValues.STRONG;
                  return ans;
              }
              if (stream.match("__")) {
                  state.nstyle ^= nstyleValues.STRONG;
                  return ans;
              }
              if (stream.match(/^[*_]/)) {
                  state.nstyle ^= nstyleValues.EM;
                  return ans;
              }
              if (stream.match("~~")) {
                  state.nstyle ^= nstyleValues.DEL;
                  return ans;
              }
              /// finally, if nothing changed, move on
              stream.next();
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
  var HelperName = "hmdReadLink";
  var HelperObject = function (footNoteName, line) {
      return getAddon$1(this).read(footNoteName, line);
  };
  CodeMirror.defineExtension(HelperName, HelperObject);

  var readLink = /*#__PURE__*/Object.freeze({
    ReadLink: ReadLink,
    getAddon: getAddon$1
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
      if (!(target.nodeName == "SPAN" &&
          /cm-hmd-barelink\b/.test(className) &&
          !/cm-formatting\b/.test(className))) {
          this.hideInfo();
          return;
      }
      var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY });
      var url = target.textContent;
      if (/cm-hmd-footref-lead/.test(className))
          { url = "^" + target.nextElementSibling.textContent; }
      else if (/cm-hmd-footref/.test(className))
          { url = "^" + url; }
      var footnote = cm.hmdReadLink(url, pos.line);
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

  // All in one HyperMD bundle!

  exports.InsertFile = insertFile;
  exports.ReadLink = readLink;
  exports.Hover = hover;
  exports.Addon = Addon$1;
  exports.FlipFlop = FlipFlop;
  exports.tryToRun = tryToRun;
  exports.debounce = debounce;
  exports.fromTextArea = fromTextArea;
  exports.switchToNormal = switchToNormal;
  exports.switchToHyperMD = switchToHyperMD;
  exports.getEveryCharToken = getEveryCharToken;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
