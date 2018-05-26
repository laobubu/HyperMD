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
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('../core')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', '../core'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.KeyMap = {}),global.CodeMirror,global.HyperMD));
}(this, (function (exports,CodeMirror,core) { 'use strict';

  var CodeMirror__default = 'default' in CodeMirror ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  /**
    Some codes in this files are from CodeMirror's source code.

    CodeMirror, copyright (c) by Marijn Haverbeke and others
    MIT license: http://codemirror.net/LICENSE

    @see codemirror\addon\edit\continuelist.js
   */
  // loq = List Or Quote
  var LoQRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]))(\s*)/, emptyLoQRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s*)$/, unorderedListRE = /[*+-]\s/;
  var isRealTableSep = function (token) { return /hmd-table-sep/.test(token.type) && !/hmd-table-sep-dummy/.test(token.type); };
  /** continue list / quote / insert table row */
  function newlineAndContinue(cm) {
      if (cm.getOption("disableInput"))
          { return CodeMirror__default.Pass; }
      var selections = cm.listSelections();
      var replacements = [];
      for (var i$1 = 0, list = selections; i$1 < list.length; i$1 += 1) {
          var range = list[i$1];

        var pos = range.head;
          var rangeEmpty = range.empty();
          var eolState = cm.getStateAfter(pos.line);
          var line = cm.getLine(pos.line);
          var handled = false;
          if (!handled) {
              var inList = eolState.list !== false;
              var inQuote = eolState.quote;
              var match = LoQRE.exec(line);
              var cursorBeforeBullet = /^\s*$/.test(line.slice(0, pos.ch));
              if (rangeEmpty && (inList || inQuote) && match && !cursorBeforeBullet) {
                  handled = true;
                  if (emptyLoQRE.test(line)) {
                      if (!/>\s*$/.test(line))
                          { cm.replaceRange("", { line: pos.line, ch: 0 }, { line: pos.line, ch: pos.ch + 1 }); }
                      replacements.push("\n");
                  }
                  else {
                      var indent = match[1], after = match[5];
                      var numbered = !(unorderedListRE.test(match[2]) || match[2].indexOf(">") >= 0);
                      var bullet = numbered ? (parseInt(match[3], 10) + 1) + match[4] : match[2].replace("x", " ");
                      replacements.push("\n" + indent + bullet + after);
                      if (numbered)
                          { incrementRemainingMarkdownListNumbers(cm, pos); }
                  }
              }
          }
          if (!handled) {
              var table = rangeEmpty ? eolState.hmdTable : 0 /* NONE */;
              if (table != 0 /* NONE */) {
                  if (/^[\s\|]+$/.test(line) && cm.getStateAfter(pos.line + 1).hmdTable !== table) {
                      // this is a empty row, end the table
                      cm.replaceRange("", { line: pos.line, ch: 0 }, { line: pos.line, ch: line.length });
                      replacements.push("\n");
                  }
                  else {
                      // insert new row
                      var lineRemain = line.substr(pos.ch);
                      var textOnLeft = "";
                      var textOnRight = "";
                      var chState = cm.getTokenAt(pos).state;
                      var i = 0;
                      while (i++ < chState.hmdTableCol)
                          { textOnLeft += " | "; }
                      i--;
                      while (i++ < eolState.hmdTableCol)
                          { textOnRight += " | "; }
                      if (table === 2 /* NORMAL */) {
                          textOnLeft = textOnLeft.replace(/^\s+/, '');
                          textOnRight = textOnRight.replace(/\s+$/, '');
                      }
                      if (lineRemain.length > 1) {
                          cm.replaceRange(lineRemain.slice(1), { line: pos.line, ch: pos.ch + 1 }, { line: pos.line, ch: line.length });
                      }
                      replacements.push(textOnRight + "\n" + textOnLeft);
                  }
                  handled = true;
              }
          }
          if (!handled) {
              cm.execCommand("newlineAndIndent");
              return;
          }
      }
      cm.replaceSelections(replacements);
  }
  /** insert "\n" , or if in list, insert "\n" + indentation */
  function newline(cm) {
      if (cm.getOption("disableInput"))
          { return CodeMirror__default.Pass; }
      var selections = cm.listSelections();
      var replacements = core.repeat("\n", selections.length);
      for (var i = 0; i < selections.length; i++) {
          var range = selections[i];
          var pos = range.head;
          var eolState = cm.getStateAfter(pos.line);
          if (eolState.list !== false) {
              replacements[i] += core.repeatStr(" ", eolState.listStack.slice(-1)[0]);
          }
      }
      cm.replaceSelections(replacements);
  }
  /** unindent or move cursor into prev table cell */
  function shiftTab(cm) {
      var selections = cm.listSelections();
      var tokenSeeker = new core.TokenSeeker(cm);
      for (var i = 0; i < selections.length; i++) {
          var range = selections[i];
          var pos = range.head;
          var eolState = cm.getStateAfter(pos.line);
          if (eolState.hmdTable && eolState.hmdTableRow >= 2) {
              tokenSeeker.setPos(pos.line, pos.ch);
              var isNormalTable = eolState.hmdTable === 2 /* NORMAL */; // leading and ending | is not omitted
              var line = pos.line;
              var lineText = cm.getLine(line);
              var chStart = 0, chEnd = 0;
              var rightPipe = tokenSeeker.findPrev(isRealTableSep);
              if (rightPipe) { // prev cell is in this line
                  var leftPipe = tokenSeeker.findPrev(isRealTableSep, rightPipe.i_token - 1);
                  chStart = leftPipe ? leftPipe.token.end : 0;
                  chEnd = rightPipe.token.start;
                  if (chStart == 0 && isNormalTable)
                      { chStart += lineText.match(/^\s*\|/)[0].length; }
              }
              else { // jump to prev line, last cell
                  line--;
                  lineText = cm.getLine(line);
                  tokenSeeker.setPos(line, lineText.length);
                  var leftPipe = tokenSeeker.findPrev(isRealTableSep);
                  chStart = leftPipe.token.end;
                  chEnd = lineText.length;
                  if (isNormalTable)
                      { chEnd -= lineText.match(/\|\s*$/)[0].length; }
              }
              chStart += lineText.slice(chStart).match(/^\s*/)[0].length;
              if (chStart > 0 && lineText.substr(chStart - 1, 2) === ' |')
                  { chStart--; }
              chEnd -= lineText.slice(chStart, chEnd).match(/\s*$/)[0].length;
              cm.setSelection({ line: line, ch: chStart }, { line: line, ch: chEnd });
              return;
          }
      }
      return CodeMirror__default.Pass;
  }
  /**
   * 1. move cursor into next table cell
   * 2. "defaultTab"
   */
  function tab(cm) {
      var selections = cm.listSelections();
      var tokenSeeker = new core.TokenSeeker(cm);
      for (var i = 0; i < selections.length; i++) {
          var range = selections[i];
          var pos = range.head;
          var rangeEmpty = range.empty();
          var eolState = cm.getStateAfter(pos.line);
          var line = cm.getLine(pos.line);
          if (eolState.hmdTable && eolState.hmdTableRow >= 2) {
              // yeah, we are inside a table
              // setCursor and exit current function
              var isNormalTable = eolState.hmdTable === 2 /* NORMAL */; // leading and ending | is not omitted
              tokenSeeker.setPos(pos.line, pos.ch);
              var nextSep = tokenSeeker.findNext(isRealTableSep, tokenSeeker.i_token);
              /** start of next cell's text */
              var ch = 0;
              var lineNo = pos.line;
              if (nextSep) {
                  // found next separator in current line
                  ch = nextSep.token.start + 1; // skip "|"
              }
              else {
                  // Maybe next line?
                  ch = 0;
                  lineNo = pos.line + 1;
                  var nextEolState = cm.getStateAfter(lineNo);
                  if (!nextEolState.hmdTable) {
                      // next line is not a table. let's insert a row!
                      line = "";
                      if (isNormalTable) {
                          line += "| ";
                          ch += 2;
                      }
                      line += core.repeatStr(" | ", eolState.hmdTableCol - (isNormalTable ? 2 : 0));
                      if (isNormalTable)
                          { line += " |"; }
                      // insert the text
                      cm.replaceRange(line + "\n", { ch: 0, line: lineNo }, { ch: 0, line: lineNo });
                  }
                  else {
                      // locate first row
                      line = cm.getLine(lineNo);
                      if (isNormalTable)
                          { ch = line.indexOf("|") + 1; }
                  }
              }
              ch = ch + line.slice(ch).match(/^\s*/)[0].length; // skip spaces
              if (ch > 0 && line.substr(ch - 1, 2) === ' |')
                  { ch--; }
              var chEnd = ch + line.slice(ch).match(/^\S*/)[0].length;
              cm.setSelection({ line: lineNo, ch: ch }, { line: lineNo, ch: chEnd });
              return;
          }
      }
      cm.execCommand("defaultTab");
  }
  function createStyleToggler(isStyled, isFormattingToken, getFormattingText) {
      return function (cm) {
          var assign;

          if (cm.getOption("disableInput"))
              { return CodeMirror__default.Pass; }
          var ts = new core.TokenSeeker(cm);
          var selections = cm.listSelections();
          var replacements = new Array(selections.length);
          for (var i = 0; i < selections.length; i++) {
              var range = selections[i];
              var left = range.head;
              var right = range.anchor;
              var eolState = cm.getStateAfter(left.line);
              var rangeEmpty = range.empty();
              if (rangeEmpty) { // nothing selected
                  var line = left.line;
                  ts.setPos(line, left.ch, true);
                  var token = ts.lineTokens[ts.i_token];
                  var state = token ? token.state : eolState;
                  replacements[i] = "";
                  if (!token || /^\s*$/.test(token.string)) {
                      token = ts.lineTokens[--ts.i_token]; // maybe eol, or current token is space
                  }
                  var ref = ts.expandRange(function (token) { return token && (isStyled(token.state) || isFormattingToken(token)); });
                  var from = ref.from;
                  var to = ref.to;
                  if (to.i_token === from.i_token) { // current token "word" is not formatted
                      var f = getFormattingText();
                      if (token && !/^\s*$/.test(token.string)) { // not empty line, not spaces
                          var pos1 = { line: line, ch: token.start }, pos2 = { line: line, ch: token.end };
                          token = from.token;
                          cm.replaceRange(f + token.string + f, pos1, pos2);
                          pos2.ch += f.length;
                          cm.setCursor(pos2);
                          return;
                      }
                      else {
                          replacements[i] = f;
                      }
                  }
                  else if (to.token.start === from.token.end) { // stupid situation: **|**
                      cm.replaceRange("", { line: line, ch: from.token.start }, { line: line, ch: to.token.end });
                  }
                  else { // **wor|d**
                      if (isFormattingToken(to.token)) {
                          cm.replaceRange("", { line: line, ch: to.token.start }, { line: line, ch: to.token.end });
                      }
                      if (isFormattingToken(from.token)) {
                          cm.replaceRange("", { line: line, ch: from.token.start }, { line: line, ch: from.token.end });
                      }
                  }
                  continue;
              }
              if (CodeMirror.cmpPos(left, right) > 0)
                  { (assign = [left, right], right = assign[0], left = assign[1]); }
              var token$1 = cm.getTokenAt(left);
              var state$1 = token$1 ? token$1.state : eolState;
              var formatter = getFormattingText(state$1);
              replacements[i] = formatter + cm.getRange(left, right) + formatter;
          }
          cm.replaceSelections(replacements);
      };
  }
  // Auto-updating Markdown list numbers when a new item is added to the
  // middle of a list
  function incrementRemainingMarkdownListNumbers(cm, pos) {
      var listRE = LoQRE;
      var startLine = pos.line, lookAhead = 0, skipCount = 0;
      var startItem = listRE.exec(cm.getLine(startLine)), startIndent = startItem[1];
      do {
          lookAhead += 1;
          var nextLineNumber = startLine + lookAhead;
          var nextLine = cm.getLine(nextLineNumber), nextItem = listRE.exec(nextLine);
          if (nextItem) {
              var nextIndent = nextItem[1];
              var newNumber = (parseInt(startItem[3], 10) + lookAhead - skipCount);
              var nextNumber = (parseInt(nextItem[3], 10)), itemNumber = nextNumber;
              if (startIndent === nextIndent && !isNaN(nextNumber)) {
                  if (newNumber === nextNumber)
                      { itemNumber = nextNumber + 1; }
                  if (newNumber > nextNumber)
                      { itemNumber = newNumber + 1; }
                  cm.replaceRange(nextLine.replace(listRE, nextIndent + itemNumber + nextItem[4] + nextItem[5]), {
                      line: nextLineNumber, ch: 0
                  }, {
                      line: nextLineNumber, ch: nextLine.length
                  });
              }
              else {
                  if (startIndent.length > nextIndent.length)
                      { return; }
                  // This doesn't run if the next line immediatley indents, as it is
                  // not clear of the users intention (new indented item or same level)
                  if ((startIndent.length < nextIndent.length) && (lookAhead === 1))
                      { return; }
                  skipCount += 1;
              }
          }
      } while (nextItem);
  }
  Object.assign(CodeMirror__default.commands, {
      hmdNewlineAndContinue: newlineAndContinue,
      hmdNewline: newline,
      hmdShiftTab: shiftTab,
      hmdTab: tab,
  });
  var defaultKeyMap = CodeMirror__default.keyMap["default"];
  exports.keyMap = {
      "Shift-Tab": "hmdShiftTab",
      "Tab": "hmdTab",
      "Enter": "hmdNewlineAndContinue",
      "Shift-Enter": "hmdNewline",
      "Ctrl-B": createStyleToggler(function (state) { return state.strong; }, function (token) { return / formatting-strong /.test(token.type); }, function (state) { return core.repeatStr(state && state.strong || "*", 2); } // ** or __
      ),
      "Ctrl-I": createStyleToggler(function (state) { return state.em; }, function (token) { return / formatting-em /.test(token.type); }, function (state) { return (state && state.em || "*"); }),
      "Ctrl-D": createStyleToggler(function (state) { return state.strikethrough; }, function (token) { return / formatting-strikethrough /.test(token.type); }, function (state) { return "~~"; }),
      fallthrough: "default",
  };
  exports.keyMap = CodeMirror__default.normalizeKeyMap(exports.keyMap);
  CodeMirror__default.keyMap["hypermd"] = exports.keyMap;

  exports.newlineAndContinue = newlineAndContinue;
  exports.newline = newline;
  exports.shiftTab = shiftTab;
  exports.tab = tab;
  exports.createStyleToggler = createStyleToggler;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
