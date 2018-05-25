// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// powerful keymap for HyperMD and Markdown modes
//

import CodeMirror, { Token, Position } from 'codemirror'
import { cm_t } from '../core/type'
import { assign, TokenSeeker, repeat } from '../core';
import { HyperMDState, TableType } from "../mode/hypermd"

/**
  Some codes in this files are from CodeMirror's source code.

  CodeMirror, copyright (c) by Marijn Haverbeke and others
  MIT license: http://codemirror.net/LICENSE

  @see codemirror\addon\edit\continuelist.js
 */

// loq = List Or Quote
const LoQRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]))(\s*)/,
  emptyLoQRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s*)$/,
  unorderedListRE = /[*+-]\s/;
const isRealTableSep = (token: Token) => /hmd-table-sep/.test(token.type) && !/hmd-table-sep-dummy/.test(token.type);

/** continue list / quote / insert table row */
export function newline(cm: cm_t) {
  if (cm.getOption("disableInput")) return CodeMirror.Pass

  const selections = cm.listSelections()
  var replacements: string[] = []

  for (const range of selections) {
    var pos = range.head
    const rangeEmpty = (range as any).empty() as boolean
    const eolState = cm.getStateAfter(pos.line) as HyperMDState

    const line = cm.getLine(pos.line)

    let handled = false

    if (!handled) {
      const inList = eolState.list !== false
      const inQuote = eolState.quote
      let match = LoQRE.exec(line)
      let cursorBeforeBullet = /^\s*$/.test(line.slice(0, pos.ch))

      if (rangeEmpty && (inList || inQuote) && match && !cursorBeforeBullet) {
        handled = true

        if (emptyLoQRE.test(line)) {
          if (!/>\s*$/.test(line)) cm.replaceRange("", { line: pos.line, ch: 0 }, { line: pos.line, ch: pos.ch + 1 });
          replacements.push("\n")
        } else {
          var indent = match[1], after = match[5];
          var numbered = !(unorderedListRE.test(match[2]) || match[2].indexOf(">") >= 0)
          var bullet = numbered ? (parseInt(match[3], 10) + 1) + match[4] : match[2].replace("x", " ")
          replacements.push("\n" + indent + bullet + after)

          if (numbered) incrementRemainingMarkdownListNumbers(cm, pos);
        }
      }
    }

    if (!handled) {
      const table = rangeEmpty ? eolState.hmdTable : TableType.NONE
      if (table != TableType.NONE) {
        if (/^[\s\|]+$/.test(line) && (cm.getStateAfter(pos.line + 1) as HyperMDState).hmdTable !== table) {
          // this is a empty row, end the table
          cm.replaceRange("", { line: pos.line, ch: 0 }, { line: pos.line, ch: line.length })
          replacements.push("\n")
        } else {
          // insert new row
          const lineRemain = line.substr(pos.ch)
          let textOnLeft = ""
          let textOnRight = ""

          const chState = cm.getTokenAt(pos).state as HyperMDState
          let i = 0
          while (i++ < chState.hmdTableCol) textOnLeft += " | "
          i--
          while (i++ < eolState.hmdTableCol) textOnRight += " | "

          if (table === TableType.NORMAL) {
            textOnLeft = textOnLeft.replace(/^\s+/, '')
            textOnRight = textOnRight.replace(/\s+$/, '')
          }

          if (lineRemain.length > 1) {
            cm.replaceRange(lineRemain.slice(1), { line: pos.line, ch: pos.ch + 1 }, { line: pos.line, ch: line.length })
          }

          replacements.push(textOnRight + "\n" + textOnLeft)
        }
        handled = true
      }
    }

    if (!handled) {
      cm.execCommand("newlineAndIndent")
      return
    }
  }

  cm.replaceSelections(replacements)
}

/** unindent or move cursor into prev table cell */
export function shiftTab(cm: cm_t) {
  var selections = cm.listSelections()
  var replacements: string[] = []

  var tokenSeeker = new TokenSeeker(cm)

  for (let i = 0; i < selections.length; i++) {
    var range = selections[i]
    var pos = range.head
    const eolState = cm.getStateAfter(pos.line) as HyperMDState

    if (eolState.hmdTable && eolState.hmdTableRow >= 2) {
      tokenSeeker.setPos(pos.line, pos.ch)
      const isNormalTable = eolState.hmdTable === TableType.NORMAL  // leading and ending | is not omitted
      var line = pos.line
      var lineText = cm.getLine(line)
      var chStart = 0, chEnd = 0
      var rightPipe = tokenSeeker.findPrev(isRealTableSep)

      if (rightPipe) { // prev cell is in this line
        var leftPipe = tokenSeeker.findPrev(isRealTableSep, rightPipe.i_token - 1)
        chStart = leftPipe ? leftPipe.token.end : 0
        chEnd = rightPipe.token.start

        if (chStart == 0 && isNormalTable) chStart += lineText.match(/^\s*\|/)[0].length
      } else { // jump to prev line, last cell
        line--
        lineText = cm.getLine(line)
        tokenSeeker.setPos(line, lineText.length)
        var leftPipe = tokenSeeker.findPrev(isRealTableSep)
        chStart = leftPipe.token.end
        chEnd = lineText.length

        if (isNormalTable) chEnd -= lineText.match(/\|\s*$/)[0].length
      }

      chStart += lineText.slice(chStart).match(/^\s*/)[0].length
      if (chStart > 0 && lineText.substr(chStart - 1, 2) === ' |') chStart--
      chEnd -= lineText.slice(chStart, chEnd).match(/\s*$/)[0].length

      cm.setSelection({ line, ch: chStart }, { line, ch: chEnd })
      return
    }
  }

  cm.execCommand("indentAuto")
}

/** insert tab or move cursor into next table cell */
export function tab(cm: cm_t) {
  var selections = cm.listSelections()
  var replacements: string[] = []

  var tokenSeeker = new TokenSeeker(cm)

  for (let i = 0; i < selections.length; i++) {
    var range = selections[i]
    var pos = range.head
    const rangeEmpty = (range as any).empty() as boolean
    const eolState = cm.getStateAfter(pos.line) as HyperMDState

    let line = cm.getLine(pos.line)

    if (eolState.hmdTable && eolState.hmdTableRow >= 2) {
      // yeah, we are inside a table
      // setCursor and exit current function

      const isNormalTable = eolState.hmdTable === TableType.NORMAL  // leading and ending | is not omitted

      tokenSeeker.setPos(pos.line, pos.ch)
      var nextSep = tokenSeeker.findNext(isRealTableSep, tokenSeeker.i_token)

      /** start of next cell's text */
      let ch = 0
      let lineNo = pos.line

      if (nextSep) {
        // found next separator in current line
        ch = nextSep.token.start + 1 // skip "|"
      } else {
        // Maybe next line?
        ch = 0
        lineNo = pos.line + 1

        const nextEolState = cm.getStateAfter(lineNo) as HyperMDState

        if (!nextEolState.hmdTable) {
          // next line is not a table. let's insert a row!
          line = ""
          if (isNormalTable) { line += "| "; ch += 2 }
          line += repeat(" | ", eolState.hmdTableCol - (isNormalTable ? 2 : 0)).join("")
          if (isNormalTable) line += " |"

          // insert the text
          cm.replaceRange(line + "\n", { ch: 0, line: lineNo }, { ch: 0, line: lineNo })
        } else {
          // locate first row
          line = cm.getLine(lineNo)
          if (isNormalTable) ch = line.indexOf("|") + 1
        }
      }


      ch = ch + line.slice(ch).match(/^\s*/)[0].length // skip spaces
      if (ch > 0 && line.substr(ch - 1, 2) === ' |') ch--

      let chEnd = ch + line.slice(ch).match(/^\S*/)[0].length

      cm.setSelection({ line: lineNo, ch: ch }, { line: lineNo, ch: chEnd })

      return
    }
  }

  cm.execCommand("defaultTab")
}

// Auto-updating Markdown list numbers when a new item is added to the
// middle of a list
function incrementRemainingMarkdownListNumbers(cm, pos) {
  const listRE = LoQRE
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
        if (newNumber === nextNumber) itemNumber = nextNumber + 1;
        if (newNumber > nextNumber) itemNumber = newNumber + 1;
        cm.replaceRange(
          nextLine.replace(listRE, nextIndent + itemNumber + nextItem[4] + nextItem[5]),
          {
            line: nextLineNumber, ch: 0
          }, {
            line: nextLineNumber, ch: nextLine.length
          });
      } else {
        if (startIndent.length > nextIndent.length) return;
        // This doesn't run if the next line immediatley indents, as it is
        // not clear of the users intention (new indented item or same level)
        if ((startIndent.length < nextIndent.length) && (lookAhead === 1)) return;
        skipCount += 1;
      }
    }
  } while (nextItem);
}

assign(CodeMirror.commands, {
  hmdNewline: newline,
  hmdShiftTab: shiftTab,
  hmdTab: tab,
})

const defaultKeyMap = CodeMirror.keyMap["default"]
export var keyMap: CodeMirror.KeyMap = assign({}, defaultKeyMap, {
  "Shift-Tab": "hmdShiftTab",
  "Tab": "hmdTab",
  "Enter": "hmdNewline",
})

keyMap = CodeMirror.normalizeKeyMap(keyMap) as CodeMirror.KeyMap
CodeMirror.keyMap["hypermd"] = keyMap
