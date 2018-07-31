// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// powerful keymap for HyperMD and Markdown modes
//

import { Token, cmpPos } from "codemirror"
import { cm_t } from "../core/type"
import { TokenSeeker, repeatStr } from "../core";
import { HyperMDState, TableType } from "../mode/hypermd"

const ListRE = /^(\s*)([*+-]\s|(\d+)([.)]))(\s*)/;
const isRealTableSep = (token: Token) =>
  /hmd-table-sep/.test(token.type) && !/hmd-table-sep-dummy/.test(token.type);

/**
 * 1. for tables, move cursor into next table cell, and maybe insert a cell
 * 2.
 */
function tab(cm: cm_t) {
  var selections = cm.listSelections()
  var beforeCur: string[] = []
  var afterCur: string[] = []
  var selected: string[] = []

  var addIndentTo: Record<string, string> = {}  // {lineNo: stringIndent}

  var tokenSeeker = new TokenSeeker(cm)

  /** indicate previous 4 variable changed or not */
  var flag0 = false, flag1 = false, flag2 = false, flag3 = true

  function setBeforeCur(text) { beforeCur[i] = text; if (text) flag1 = true }
  function setAfterCur(text) { afterCur[i] = text; if (text) flag2 = true }
  function setSelected(text) { selected[i] = text; if (text) flag3 = true }

  for (var i = 0; i < selections.length; i++) {
    beforeCur[i] = afterCur[i] = selected[i] = ""

    var range = selections[i]
    var left = range.head
    var right = range.anchor

    const rangeEmpty = (range as any).empty() as boolean
    if (!rangeEmpty && cmpPos(left, right) > 0) [right, left] = [left, right];
    else if (right === left) { right = range.anchor = { ch: left.ch, line: left.line }; }

    const eolState = cm.getStateAfter(left.line) as HyperMDState

    let line = cm.getLine(left.line)

    if (eolState.hmdTable) {
      // yeah, we are inside a table

      flag0 = true // cursor will move

      const isNormalTable = eolState.hmdTable === TableType.NORMAL
      const columns = eolState.hmdTableColumns

      tokenSeeker.setPos(left.line, left.ch)

      const nextCellLeft = tokenSeeker.findNext(isRealTableSep, tokenSeeker.i_token)
      if (!nextCellLeft) { // already last cell
        const lineSpan = eolState.hmdTableRow === 0 ? 2 : 1 // skip |---|---| line

        if ((left.line + lineSpan) > cm.lastLine() || cm.getStateAfter(left.line + lineSpan).hmdTable != eolState.hmdTable) {
          // insert a row after this line
          left.ch = right.ch = line.length
          let newline = repeatStr("  |  ", columns.length - 1)

          // There are always nut users!
          if (eolState.hmdTableRow === 0) {
            right.line = left.line += 1
            right.ch = left.ch = cm.getLine(left.line).length
          }

          if (isNormalTable) {
            setBeforeCur("\n| ")
            setAfterCur(newline + " |")
          } else {
            setBeforeCur("\n")
            setAfterCur(newline.trimRight())
          }
          setSelected("")
        } else {
          // move cursor to next line, first cell
          right.line = left.line += lineSpan
          tokenSeeker.setPos(left.line, 0)

          const line = tokenSeeker.line.text
          const dummySep = isNormalTable && tokenSeeker.findNext(/hmd-table-sep-dummy/, 0)
          const nextCellRight = tokenSeeker.findNext(/hmd-table-sep/, dummySep ? dummySep.i_token + 1 : 1)

          left.ch = dummySep ? dummySep.token.end : 0
          right.ch = nextCellRight ? nextCellRight.token.start : line.length
          if (right.ch > left.ch && line.charAt(left.ch) === " ") left.ch++
          if (right.ch > left.ch && line.charAt(right.ch - 1) === " ") right.ch--
          setSelected(right.ch > left.ch ? cm.getRange(left, right) : "")
        }
      } else {
        const nextCellRight = tokenSeeker.findNext(/hmd-table-sep/, nextCellLeft.i_token + 1)

        left.ch = nextCellLeft.token.end
        right.ch = nextCellRight ? nextCellRight.token.start : line.length
        if (right.ch > left.ch && line.charAt(left.ch) === " ") left.ch++
        if (right.ch > left.ch && line.charAt(right.ch - 1) === " ") right.ch--
        setSelected(right.ch > left.ch ? cm.getRange(left, right) : "")
      }
      // console.log("selected cell", left.ch, right.ch, selected[i])
    } else if (eolState.listStack.length > 0) {
      // add indent to current line
      let lineNo = left.line

      let tmp: RegExpMatchArray // ["  * ", "  ", "* "]

      while (!(tmp = ListRE.exec(cm.getLine(lineNo)))) { // beginning line has no bullet? go up
        lineNo--
        let isList = cm.getStateAfter(lineNo).listStack.length > 0
        if (!isList) { lineNo++; break }
      }

      let firstLine = cm.firstLine()
      let lastLine = cm.lastLine()

      for (; lineNo <= right.line && (tmp = ListRE.exec(cm.getLine(lineNo))); lineNo++) {
        let eolState = cm.getStateAfter(lineNo) as HyperMDState
        let listStack = eolState.listStack
        let listStackOfPrevLine = cm.getStateAfter(lineNo - 1).listStack
        let listLevel = listStack.length
        let spaces: string = ""

        // avoid uncontinuous list levels
        if (lineNo > firstLine && listLevel <= listStackOfPrevLine.length) {
          if (listLevel == listStackOfPrevLine.length) {
            // tmp[1] is existed leading spaces
            // listStackOfPrevLine[listLevel-1] is desired indentation
            spaces = repeatStr(" ", listStackOfPrevLine[listLevel - 1] - tmp[1].length)
          } else {
            // make bullets right-aligned
            // tmp[0].length is end pos of current bullet
            spaces = repeatStr(" ", listStackOfPrevLine[listLevel] - tmp[0].length)
          }
        }

        addIndentTo[lineNo] = spaces

        // if current list item is multi-line...
        while (++lineNo <= lastLine) {
          if (/*corrupted */ cm.getStateAfter(lineNo).listStack.length !== listLevel) { lineNo = Infinity; break }
          if (/*has bullet*/ ListRE.test(cm.getLine(lineNo))) { lineNo--; break }
          addIndentTo[lineNo] = spaces
        }
      }

      if (!rangeEmpty) {
        flag3 = false; break // f**k
      }
    } else {
      // emulate Tab
      if (rangeEmpty) {
        setBeforeCur("    ")
      } else {
        setSelected(cm.getRange(left, right))
        for (let lineNo = left.line; lineNo <= right.line; lineNo++) {
          if (!(lineNo in addIndentTo)) addIndentTo[lineNo] = "    "
        }
      }
    }
  }

  // if (!(flag0 || flag1 || flag2 || flag3)) return cm.execCommand("defaultTab")
  // console.log(flag0, flag1, flag2, flag3)

  for (let lineNo in addIndentTo) {
    if (addIndentTo[lineNo]) cm.replaceRange(addIndentTo[lineNo], { line: ~~lineNo, ch: 0 });
  }
  if (flag0) cm.setSelections(selections)
  if (flag1) cm.replaceSelections(beforeCur)
  if (flag2) cm.replaceSelections(afterCur, "start")
  if (flag3) cm.replaceSelections(selected, "around")
}

export default tab
