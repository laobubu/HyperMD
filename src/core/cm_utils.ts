/**
 * CodeMirror-related utils
 */

import { cm_t } from "./type"
import { Token, Position, cmpPos } from "codemirror"
import * as cm_internal from "./cm_internal"

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
 * @see TokenSeeker if you want to span lines
 */
export function expandRange(cm: cm_t, pos: CodeMirror.Position, style: string | ((token: Token) => boolean)) {
  var line = pos.line
  var from: CodeMirror.Position = { line, ch: 0 }
  var to: CodeMirror.Position = { line, ch: pos.ch }

  var styleFn = typeof style === "function" ? style : false
  var styleRE = (!styleFn) && new RegExp("(?:^|\\s)" + style + "(?:\\s|$)")
  var tokens = cm.getLineTokens(line)

  var iSince
  for (iSince = 0; iSince < tokens.length; iSince++) {
    if (tokens[iSince].end >= pos.ch) break
  }
  if (iSince === tokens.length) return null

  for (var i = iSince; i < tokens.length; i++) {
    var token = tokens[i]
    if (styleFn ? styleFn(token) : styleRE.test(token.type)) to.ch = token.end
    else break
  }

  for (var i = iSince; i >= 0; i--) {
    var token = tokens[i]
    if (!(styleFn ? styleFn(token) : styleRE.test(token.type))) {
      from.ch = token.end
      break
    }
  }

  return { from, to }
}

export { cmpPos }

export type RangeLike = { anchor: Position; head: Position; }
export type OrderedRange = [Position, Position]

/**
 * Get ordered range from `CodeMirror.Range`-like object or `[Position, Position]`
 *
 * In an ordered range, The first `Position` must NOT be after the second.
 */
export function orderedRange(range: [Position, Position] | RangeLike): OrderedRange {
  if ('anchor' in range) range = [range.head, range.anchor]
  if (cmpPos(range[0], range[1]) > 0) return [range[1], range[0]]
  else return [range[0], range[1]]
}

/**
 * Check if two range has intersection.
 *
 * @param range1 ordered range 1  (start <= end)
 * @param range2 ordered range 2  (start <= end)
 */
export function rangesIntersect(range1: OrderedRange, range2: OrderedRange): boolean {
  const [from1, to1] = range1
  const [from2, to2] = range2

  return !(cmpPos(to1, from2) < 0 || cmpPos(from1, to2) > 0)
}
