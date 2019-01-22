// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// powerful keymap for HyperMD and Markdown modes
//

import * as CodeMirror from "codemirror";
import { cm_t } from "../core/type";
import { repeatStr } from '../core';
import { HyperMDState, TableType } from "../mode/hypermd";

const LoQRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]))(\s*)/,
  emptyLoQRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s*)$/,
  unorderedListRE = /[*+-]\s/;
/**
 * continue list / quote / insert table row
 * start a table
 */
function newlineAndContinue (cm: cm_t) {
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
        if (/^[\s\|]+$/.test(line) && (pos.line === cm.lastLine() || (cm.getStateAfter(pos.line + 1).hmdTable !== table))) {
          // if this is last row and is empty
          // remove this row and insert a new line
          cm.setCursor({ line: pos.line, ch: 0 })
          cm.replaceRange("\n", { line: pos.line, ch: 0 }, { line: pos.line, ch: line.length })
        } else {
          // insert a row below
          const columns = eolState.hmdTableColumns

          let newline = repeatStr("  |  ", columns.length - 1)
          let leading = "\n"
          if (table === TableType.NORMAL) {
            leading += "| "
            newline += " |"
          }

          // There are always nut users!
          if (eolState.hmdTableRow == 0) {
            cm.setCursor({ line: pos.line + 1, ch: cm.getLine(pos.line + 1).length })
          } else {
            cm.setCursor({ line: pos.line, ch: line.length })
          }

          cm.replaceSelection(leading)
          cm.replaceSelection(newline, "start")
        }

        handled = true
        return
      } else if (rangeEmpty && pos.ch >= line.length && !eolState.code && !eolState.hmdInnerMode && /^\|.+\|.+\|$/.test(line)) {
        // current line is   | this | format |
        // let's make a table
        let lineTokens = cm.getLineTokens(pos.line)
        let ans = "|", ans2 = "|"
        for (let i = 1; i < lineTokens.length; i++) { // first token must be "|"
          let token = lineTokens[i]
          if (token.string === "|" && (!token.type || !token.type.trim().length)) {
            ans += " ------- |"
            ans2 += "   |"
          }
        }

        // multi-cursor is meanless for this
        // replacements.push("\n" + ans + "\n" + ans2 + "\n")

        cm.setCursor({ line: pos.line, ch: line.length })
        cm.replaceSelection("\n" + ans + "\n| ")
        cm.replaceSelection(ans2.slice(1) + "\n", "start")
        handled = true
        return
      }
    }

    if (!handled) {
      if (rangeEmpty && line.slice(pos.ch - 2, pos.ch) == "$$" && /math-end/.test(cm.getTokenTypeAt(pos))) {
        // ignore indentations of MathBlock Tex lines
        replacements.push("\n")
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

export default newlineAndContinue
