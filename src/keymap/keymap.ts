// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// powerful keymap for HyperMD and Markdown modes
//

import * as CodeMirror from "codemirror"
import { cm_t } from "../core/type"
import { TokenSeeker, repeatStr, suggestedEditorConfig } from "../core";
import { HyperMDState } from "../mode/hypermd"

export function createStyleToggler(
  isStyled: (state) => boolean,
  isFormattingToken: (token: CodeMirror.Token) => boolean,
  getFormattingText: (state?) => string
) {
  return function (cm: cm_t) {
    if (cm.getOption("disableInput")) return CodeMirror.Pass

    var ts = new TokenSeeker(cm)
    var selections = cm.listSelections()
    var replacements = new Array(selections.length)

    for (let i = 0; i < selections.length; i++) {
      var range = selections[i]
      var left = range.head
      var right = range.anchor
      var eolState = cm.getStateAfter(left.line)
      const rangeEmpty = (range as any).empty() as boolean

      if (CodeMirror.cmpPos(left, right) > 0) [right, left] = [left, right];
      const rangeText = replacements[i] = rangeEmpty ? "" : cm.getRange(left, right)

      if (rangeEmpty || isStyled(cm.getTokenAt(left).state)) { // nothing selected
        let line = left.line
        ts.setPos(line, left.ch, true)
        let token = ts.lineTokens[ts.i_token]
        let state: HyperMDState = token ? token.state : eolState

        if (!token || /^\s*$/.test(token.string)) {
          token = ts.lineTokens[--ts.i_token] // maybe eol, or current token is space
        }

        let { from, to } = ts.expandRange((token) => token && (isStyled(token.state) || isFormattingToken(token)))

        if (to.i_token === from.i_token) { // current token "word" is not formatted
          let f = getFormattingText()
          if (token && !/^\s*$/.test(token.string)) { // not empty line, not spaces
            let pos1 = { line, ch: token.start }, pos2 = { line, ch: token.end }
            token = from.token
            cm.replaceRange(f + token.string + f, pos1, pos2)

            pos2.ch += f.length
            cm.setCursor(pos2)
            return
          } else {
            replacements[i] = f
          }
        } else { // **wor|d**    **|**   **word|  **|
          if (isFormattingToken(to.token)) {
            cm.replaceRange("", { line, ch: to.token.start }, { line, ch: to.token.end })
          }
          if (from.i_token !== to.i_token && isFormattingToken(from.token)) {
            cm.replaceRange("", { line, ch: from.token.start }, { line, ch: from.token.end })
          }
        }
        continue
      }

      let token = cm.getTokenAt(left)
      let state = token ? token.state : eolState
      let formatter = getFormattingText(state)
      replacements[i] = formatter + rangeText + formatter
    }

    cm.replaceSelections(replacements)
  }
}

const defaultKeyMap = CodeMirror.keyMap["default"]
const modPrefix = defaultKeyMap === CodeMirror.keyMap["macDefault"] ? "Cmd" : "Ctrl"
var keyMap: CodeMirror.KeyMap = {
  "Shift-Tab": "hmdShiftTab",
  "Tab": "hmdTab",
  "Enter": "hmdNewlineAndContinue",
  "Shift-Enter": "hmdNewline",

  [`${modPrefix}-B`]: createStyleToggler(
    state => state.strong,
    token => / formatting-strong /.test(token.type),
    state => repeatStr(state && state.strong || "*", 2)     // ** or __
  ),
  [`${modPrefix}-I`]: createStyleToggler(
    state => state.em,
    token => / formatting-em /.test(token.type),
    state => (state && state.em || "*")
  ),
  [`${modPrefix}-D`]: createStyleToggler(
    state => state.strikethrough,
    token => / formatting-strikethrough /.test(token.type),
    state => "~~"
  ),


  fallthrough: "default",
}

keyMap = CodeMirror.normalizeKeyMap(keyMap) as CodeMirror.KeyMap
CodeMirror.keyMap["hypermd"] = keyMap
suggestedEditorConfig.keyMap = "hypermd"

export default keyMap
