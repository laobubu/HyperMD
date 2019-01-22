// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// powerful keymap for HyperMD and Markdown modes
//

import * as CodeMirror from "codemirror"
import { cm_t } from "../core/type"

/**
 * add / delete bracket pair to every selections,
 * or just add left bracket to cursor if nothing selected.
 *
 * This provides a `createStyleToggler`-like feature,
 * but don't rely on HyperMD mode
 *
 * @example
 *     When brackets are "(" and ")" :
 *     (Hello) => Hello   (Selected "(Hello)" or just "Hello")
 *     Hello   => (Hello)
 *
 * @param rightBracket if null, will use leftBracket
 */
function wrapText(cm: cm_t, leftBracket: string, rightBracket?: string) {
  if (cm.getOption("disableInput")) return CodeMirror.Pass

  var selections = cm.listSelections()
  var replacements = new Array(selections.length)
  var insertBeforeCursor = new Array(selections.length)

  var flag0 = false  // replacements changed
  var flag1 = false  // insertBeforeCursor changed
  var flag2 = false  // selections changed

  if (!rightBracket) rightBracket = leftBracket

  var lb_len = leftBracket.length
  var rb_len = rightBracket.length

  for (let i = 0; i < selections.length; i++) {
    replacements[i] = insertBeforeCursor[i] = ""

    var range = selections[i]
    var left = range.head
    var right = range.anchor

    var line = cm.getLine(left.line)

    if (range.empty()) {
      if (left.ch >= lb_len && line.substr(left.ch - lb_len, lb_len) === leftBracket) {
        // wipe out the left bracket
        flag2 = true
        left.ch -= lb_len
      } else {
        // insert left bracket
        flag1 = true
        insertBeforeCursor[i] = leftBracket
      }
      continue
    }

    flag0 = true

    var headAfterAnchor = CodeMirror.cmpPos(left, right) > 0
    if (headAfterAnchor) [right, left] = [left, right]

    var text = cm.getRange(left, right)

    if (left.ch >= lb_len && left.line === right.line) {
      if (line.substr(left.ch - lb_len, lb_len) === leftBracket && line.substr(right.ch, rb_len) === rightBracket) {
        flag2 = true

        right.ch += rb_len
        left.ch -= lb_len

        text = leftBracket + text + rightBracket
      }
    }

    if (text.slice(0, lb_len) === leftBracket && text.slice(-rb_len) === rightBracket) {
      replacements[i] = text.slice(lb_len, -rb_len)
    } else {
      replacements[i] = leftBracket + text + rightBracket
    }
  }

  if (flag2) cm.setSelections(selections)
  if (flag1) cm.replaceSelections(insertBeforeCursor)
  if (flag0) cm.replaceSelections(replacements, "around")
}

export default wrapText
