/**
 * CodeMirror-related utils
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */

import * as cm_internal from "./cm_internal"
import { cm_t } from "./type"

export { cm_internal }

/**
 * CodeMirror's `getLineTokens` might merge adjacent chars with same styles,
 * but this one won't.
 *
 * This one will consume more memory.
 *
 * @param {CodeMirror.LineHandle} line
 * @returns {string[]} every char's style
 */
export function getEveryCharToken(line: CodeMirror.LineHandle): string[] {
  var ans = new Array(line.text.length)
  var ss = line.styles
  var i = 0

  if (ss) {
    // CodeMirror already parsed this line. Use cache
    for (let j = 1; j < ss.length; j += 2) {
      let i_to = ss[j], s = ss[j + 1]
      while (i < i_to) ans[i++] = s
    }
  } else {
    // Emmm... slow method
    let cm = line.parent.cm || line.parent.parent.cm || line.parent.parent.parent.cm
    let ss = cm.getLineTokens(line.lineNo())
    for (let j = 0; j < ss.length; j++) {
      let i_to = ss[j].end, s = ss[j].type
      while (i < i_to) ans[i++] = s
    }
  }
  return ans
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
export function expandRange(cm: cm_t, pos: CodeMirror.Position, style: string) {
  var line = pos.line
  var from: CodeMirror.Position = { line, ch: 0 }
  var to: CodeMirror.Position = { line, ch: pos.ch }

  var styleRE = new RegExp("(?:^|\\s)" + style + "(?:\\s|$)")
  var tokens = cm.getLineTokens(line)

  var iSince
  for (iSince = 0; iSince < tokens.length; iSince++) {
    if (tokens[iSince].end >= pos.ch) break
  }
  if (iSince === tokens.length) return null

  for (var i = iSince; i < tokens.length; i++) {
    var token = tokens[i]
    if (styleRE.test(token.type)) to.ch = token.end
    else break
  }

  for (var i = iSince; i >= 0; i--) {
    var token = tokens[i]
    if (!styleRE.test(token.type)) {
      from.ch = token.end
      break
    }
  }

  return { from, to }
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
export function updateCursorDisplay(cm: cm_t, skipCacheCleaning?: boolean) {
  if (!skipCacheCleaning) {
    var lvs = cm.display.view as any[] // LineView s
    for (var lineView of lvs) {
      if (lineView.measure) lineView.measure.cache = {}
    }
  }

  setTimeout(function () {
    cm.display.input.showSelection(cm.display.input.prepareSelection())
  }, 60) // wait for css style
}
