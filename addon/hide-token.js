(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('../core')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', '../core'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.HideToken = {}),global.CodeMirror,global.HyperMD));
}(this, (function (exports,CodeMirror,core) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  var DEBUG = true;
  var defaultOption = {
      enabled: false,
      tokenTypes: "em|strong|strikethrough|code|link".split("|"),
  };
  var OptionName = "hmdHideToken";
  CodeMirror.defineOption(OptionName, defaultOption, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || typeof newVal === "boolean") {
          newVal = { enabled: enabled };
      }
      else if (typeof newVal === "string") {
          newVal = { enabled: true, tokenTypes: newVal.split("|") };
      }
      else if (newVal instanceof Array) {
          newVal = { enabled: true, tokenTypes: newVal };
      }
      var newCfg = core.Addon.migrateOption(newVal, defaultOption);
      ///// apply config
      var inst = getAddon(cm);
      inst.ff_enable.setBool(newCfg.enabled);
      ///// write new values into cm
      for (var k in defaultOption)
          { inst[k] = newCfg[k]; }
  });
  //#endregion
  /********************************************************************************** */
  //#region Addon Class
  var hideClassName = "hmd-hidden-token";
  /**
   * 1. when renderLine, add "hmd-hidden-token" to each <span>
   * 2.
   */
  var HideToken = function(cm) {
      var this$1 = this;

      // options will be initialized to defaultOption (if exists)
      // add your code here
      this.cm = cm;
      /** a map storing shown tokens' beginning ch */
      this.shownTokensStart = {};
      this.renderLineHandler = function (cm, line, el) {
          this$1.procLine(line);
      };
      this.cursorActivityHandler = function (doc) {
          var cm = this$1.cm;
          var cpos = cm.getCursor();
          this$1.shownTokensStart = this$1.calcShownTokenStart();
          this$1.procLine(cm.getLineHandle(cpos.line));
      };
      this.ff_enable = new core.FlipFlop(
      /* ON  */ function () {
          cm.on("cursorActivity", this$1.cursorActivityHandler);
          cm.on("renderLine", this$1.renderLineHandler);
      }, 
      /* OFF */ function () {
          cm.off("cursorActivity", this$1.cursorActivityHandler);
          cm.off("renderLine", this$1.renderLineHandler);
      });
  };
  /**
   * fetch cursor position and re-calculate shownTokensStart
   */
  HideToken.prototype.calcShownTokenStart = function () {
      var cm = this.cm;
      var cpos = cm.getCursor();
      var tokenTypes = this.tokenTypes;
      var formattingRE = new RegExp(("\\sformatting-(" + (tokenTypes.join("|")) + ")\\s"));
      var ans = {};
      var lineTokens = cm.getLineTokens(cpos.line);
      var i_cursor = -1;
      var fstack = [];
      var currentType = null;
      var tokens_to_show = [];
      if (DEBUG)
          { console.log("-----------calcShownTokenStart"); }
      // construct fstack until we find current char's position
      // i <- current token index
      for (var i = 0; i < lineTokens.length; i++) {
          var token = lineTokens[i];
          if (i_cursor === -1 && token.end > cpos.ch) {
              i_cursor = i; // token of cursor, is found!
          }
          var mat = token.type && token.type.match(formattingRE);
          if (mat) { // current token is a formatting-* token
              var type = mat[1]; // type without "formatting-"
              if (type !== currentType) {
                  // change the `fstack` (push or pop)
                  // and, if token on cursor is found, stop searching
                  var fstack_top = fstack[fstack.length - 1];
                  if (fstack_top && fstack_top[1] === type) {
                      fstack.pop();
                      if (i_cursor !== -1 || token.end === cpos.ch) {
                          tokens_to_show.push(fstack_top[0], token);
                          break;
                      }
                  }
                  else {
                      fstack.push([token, type]);
                      if (i_cursor !== -1) {
                          // token on cursor, is a beginning formatting token
                          tokens_to_show.push(token);
                          var testRE = new RegExp(("\\sformatting-" + type + "\\s"));
                          if (DEBUG)
                              { console.log("-> cursor token already found. ", token, testRE); }
                          for (i += 1; i < lineTokens.length; i++) {
                              var token2 = lineTokens[i];
                              if (token2.type && testRE.test(token2.type)) {
                                  // found the ending formatting token
                                  tokens_to_show.push(token2);
                                  if (DEBUG)
                                      { console.log(token2, token2.type); }
                                  break;
                              }
                          }
                          break;
                      }
                  }
                  if (DEBUG)
                      { console.log(fstack.map(function (x) { return ((x[0].start) + " " + (x[1])); })); }
                  currentType = type;
              }
          }
          else {
              if (i_cursor !== -1) { // token on cursor, is found
                  if (fstack.length > 0) {
                      // token on cursor, is wrapped by a formatting token
                      var ref = fstack.pop();
                          var token_1 = ref[0];
                          var type$1 = ref[1];
                      var testRE$1 = new RegExp(("\\sformatting-" + type$1 + "\\s"));
                      if (DEBUG)
                          { console.log("cursor is wrapped by ", type$1, token_1, "..."); }
                      tokens_to_show.push(token_1);
                      for (i += 1; i < lineTokens.length; i++) {
                          var token2$1 = lineTokens[i];
                          if (token2$1.type && testRE$1.test(token2$1.type)) {
                              // found the ending formatting token
                              tokens_to_show.push(token2$1);
                              if (DEBUG)
                                  { console.log("to ", token2$1, token2$1.type); }
                              break;
                          }
                      }
                  }
                  break;
              }
              currentType = null;
          }
          if (i_cursor !== -1 && fstack.length === 0)
              { break; } // cursor is not wrapped by formatting-*
      }
      var ans_of_line = ans[cpos.line] = [];
      for (var i$1 = 0, list = tokens_to_show; i$1 < list.length; i$1 += 1) {
          var it = list[i$1];

              ans_of_line.push(it.start);
      }
      return ans;
  };
  /**
   * hide/show <span>s in one line
   * @see this.shownTokensStart
   * @returns apperance changed since which char. -1 means nothing changed.
   */
  HideToken.prototype.procLine = function (line) {
          var this$1 = this;

      var cm = this.cm;
      var lineNo = line.lineNo();
      var lv = core.cm_internal.findViewForLine(cm, lineNo);
      var mapInfo = core.cm_internal.mapFromLineView(lv, line, lineNo);
      var map = mapInfo.map;
      var nodeCount = map.length / 3;
      var startChs = (lineNo in this.shownTokensStart) ? this.shownTokensStart[lineNo].sort(function (a, b) { return (a - b); }) : null;
      var ans = -1;
      for (var idx = 0, i = 0; idx < nodeCount; idx++, i += 3) {
          var start = map[i];
          var end = map[i + 1];
          var text = map[i + 2];
          var span = text.parentElement;
          if (text.nodeType !== Node.TEXT_NODE || !span || !/^span$/i.test(span.nodeName))
              { continue; }
          var spanClass = span.className;
          for (var i$1 = 0, list = this$1.tokenTypes; i$1 < list.length; i$1 += 1) {
              var type = list[i$1];

                  if (type === 'link' && /cm-hmd-footref|cm-hmd-footnote|cm-hmd-barelink/.test(spanClass)) {
                  // ignore footnote names, footrefs, barelinks
                  continue;
              }
              if (spanClass.indexOf("cm-formatting-" + type + " ") === -1)
                  { continue; }
              // found one! decide next action, hide or show?
              var toHide = true;
              if (startChs && startChs.length > 0) {
                  while (startChs[0] < start)
                      { startChs.shift(); } // remove passed chars
                  toHide = (startChs[0] !== start); // hide if not hit
              }
              // hide or show token
              if (toHide) {
                  if (spanClass.indexOf(hideClassName) === -1) {
                      span.className += " " + hideClassName;
                      if (ans === -1)
                          { ans = start; }
                  }
              }
              else {
                  if (spanClass.indexOf(hideClassName) !== -1) {
                      span.className = spanClass.replace(hideClassName, "");
                      if (ans === -1)
                          { ans = start; }
                  }
              }
              break;
          }
      }
      return ans;
  };
  //#endregion
  /** ADDON GETTER (Singleton Pattern): a editor can have only one MyAddon instance */
  var AddonAlias = "hideToken";
  var getAddon = core.Addon.Getter(AddonAlias, HideToken, defaultOption);

  exports.defaultOption = defaultOption;
  exports.HideToken = HideToken;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
