// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// powerful keymap for HyperMD and Markdown modes
//

import * as CodeMirror from "codemirror"
import { cm_t } from "../core/type"
import { TokenSeeker } from "../core";
import { HyperMDState, TableType } from "../mode/hypermd"

const ListRE = /^(\s*)([*+-]\s|(\d+)([.)]))(\s*)/;
const isRealTableSep = (token: CodeMirror.Token) =>
  /hmd-table-sep/.test(token.type) && !/hmd-table-sep-dummy/.test(token.type);

/** unindent or move cursor into prev table cell */
function shiftTab(cm: cm_t) {
  var selections = cm.listSelections()

  var tokenSeeker = new TokenSeeker(cm)

  for (let i = 0; i < selections.length; i++) {
    var range = selections[i]
    var left = range.head
    var right = range.anchor

    const rangeEmpty = (range as any).empty() as boolean
    if (!rangeEmpty && CodeMirror.cmpPos(left, right) > 0) [right, left] = [left, right];
    else if (right === left) { right = range.anchor = { ch: left.ch, line: left.line }; }
    const eolState = cm.getStateAfter(left.line) as HyperMDState

    if (eolState.hmdTable) {
      tokenSeeker.setPos(left.line, left.ch)
      const isNormalTable = eolState.hmdTable === TableType.NORMAL  // leading and ending | is not omitted
      var line = left.line
      var lineText = cm.getLine(line)
      var chStart = 0, chEnd = 0
      var rightPipe = tokenSeeker.findPrev(isRealTableSep)

      if (rightPipe) { // prev cell is in this line
        var leftPipe = tokenSeeker.findPrev(isRealTableSep, rightPipe.i_token - 1)
        chStart = leftPipe ? leftPipe.token.end : 0
        chEnd = rightPipe.token.start

        if (chStart == 0 && isNormalTable) chStart += lineText.match(/^\s*\|/)[0].length
      } else { // jump to prev line, last cell
        if (eolState.hmdTableRow == 0) return // no more row before
        if (eolState.hmdTableRow == 2) line-- // skip row #1 (| ----- | ----- |)

        line--
        lineText = cm.getLine(line)
        tokenSeeker.setPos(line, lineText.length)
        var leftPipe = tokenSeeker.findPrev(isRealTableSep)
        chStart = leftPipe.token.end
        chEnd = lineText.length

        if (isNormalTable) chEnd -= lineText.match(/\|\s*$/)[0].length
      }

      if (lineText.charAt(chStart) === " ") chStart += 1
      if (chStart > 0 && lineText.substr(chStart - 1, 2) === ' |') chStart--
      if (lineText.charAt(chEnd - 1) === " ") chEnd -= 1

      cm.setSelection({ line, ch: chStart }, { line, ch: chEnd })
      return
    } else if (eolState.listStack.length > 0) {
      let lineNo = left.line

      while (!ListRE.test(cm.getLine(lineNo))) { // beginning line has no bullet? go up
        lineNo--
        let isList = cm.getStateAfter(lineNo).listStack.length > 0
        if (!isList) { lineNo++; break }
      }

      let lastLine = cm.lastLine()
      let tmp: RegExpExecArray

      for (; lineNo <= right.line && (tmp = ListRE.exec(cm.getLine(lineNo))); lineNo++) {
        let listStack = cm.getStateAfter(lineNo).listStack as number[]
        let listLevel = listStack.length

        let spaces = 0
        if (listLevel == 1) {
          // maybe user wants to trimLeft?
          spaces = tmp[1].length
        } else {
          // make bullets right-aligned
          spaces = (listStack[listLevel - 1] - (listStack[listLevel - 2] || 0))
        }

        killIndent(cm, lineNo, spaces)

        // if current list item is multi-line...
        while (++lineNo <= lastLine) {
          if (/*corrupted */ cm.getStateAfter(lineNo).listStack.length !== listLevel) { lineNo = Infinity; break }
          if (/*has bullet*/ ListRE.test(cm.getLine(lineNo))) { lineNo--; break }
          killIndent(cm, lineNo, spaces)
        }
      }

      return
    }
  }

  cm.execCommand("indentLess")
}

function killIndent(cm: cm_t, lineNo: number, spaces: number) {
  if (!spaces || spaces < 0) return
  let oldSpaces = /^ */.exec(cm.getLine(lineNo))[0].length
  if (oldSpaces < spaces) spaces = oldSpaces
  if (spaces > 0) cm.replaceRange("", { line: lineNo, ch: 0 }, { line: lineNo, ch: spaces })
}

export default shiftTab
