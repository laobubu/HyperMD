/**
 * CodeMirror-related utils
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */

import * as cm_internal from "./cm_internal"
import { cm_t } from "./type"
import { Token, Position, cmpPos } from "codemirror"

export { cm_internal }

type TokenSeekResult = TokenSeeker.ResultType

/**
 * Useful tool to seek for tokens
 *
 *     var seeker = new TokenSeeker(cm)
 *     seeker.setPos(0, 0) // set to line 0, char 0
 *     var ans = seeker.findNext(/fomratting-em/)
 *
 */
export class TokenSeeker {
  constructor(public cm: cm_t) {

  }

  line: CodeMirror.LineHandle
  lineNo: number
  lineTokens: Token[]    // always same as cm.getLineTokens(line)
  i_token: number                   // current token's index

  /**
   * Find next Token that matches the condition AFTER current token (whose index is `i_token`), or SINCE a given position
   *
   * This function will NOT make the stream precede! Use `setPos` to change position.
   *
   * @param condition a RegExp to check token.type, or a function check the Token
   * @param maySpanLines by default the searching will not span lines
   */
  findNext(condition: TokenSeeker.ConditionType, maySpanLines?: boolean, since?: Position): TokenSeekResult

  /**
   * In current line, find next Token that matches the condition SINCE the token with given index
   *
   * This function will NOT make the stream precede! Use `setPos` to change position.
   *
   * @param condition a RegExp to check token.type, or a function check the Token
   * @param i_token_since default: i_token+1 (the next of current token)
   */
  findNext(condition: TokenSeeker.ConditionType, i_token_since: number): TokenSeekResult


  findNext(condition: TokenSeeker.ConditionType, varg?: boolean | number, since?: Position): TokenSeekResult {
    var lineNo = this.lineNo
    var tokens = this.lineTokens
    var token: Token = null

    var i_token: number = this.i_token + 1
    var maySpanLines = false

    if (varg === true) {
      maySpanLines = true
    } else if (typeof varg === 'number') {
      i_token = varg
    }

    if (since) {
      if (since.line > lineNo) {
        i_token = tokens.length // just ignore current line
      } else if (since.line < lineNo) {
        // hmmm... we shall NEVER go back
      } else {
        for (; i_token < tokens.length; i_token++) {
          if (tokens[i_token].start >= since.ch) break
        }
      }
    }

    for (; i_token < tokens.length; i_token++) {
      let token_tmp = tokens[i_token]
      if ((typeof condition === "function") ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)) {
        token = token_tmp
        break
      }
    }

    if (!token && maySpanLines) {
      const cm = this.cm
      const startLine = Math.max(since ? since.line : 0, lineNo + 1)
      cm.eachLine(startLine, cm.lastLine() + 1, (line_i) => {
        lineNo = line_i.lineNo()
        tokens = cm.getLineTokens(lineNo)

        i_token = 0
        if (since && lineNo === since.line) {
          for (; i_token < tokens.length; i_token++) {
            if (tokens[i_token].start >= since.ch) break
          }
        }

        for (; i_token < tokens.length; i_token++) {
          let token_tmp = tokens[i_token]
          if ((typeof condition === "function") ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)) {
            token = token_tmp
            return true // stop `eachLine`
          }
        }
      })
    }

    return token ? { lineNo, token, i_token } : null
  }

  /**
   * Reversely find next Token that matches the condition BEFORE current token (whose index is `i_token`), or SINCE a given position
   *
   * This function will NOT make the stream rewind! Use `setPos` to change position.
   *
   * @param condition a RegExp to check token.type, or a function check the Token
   * @param maySpanLines by default the searching will not span lines
   */
  findPrev(condition: TokenSeeker.ConditionType, maySpanLines?: boolean, since?: Position): TokenSeekResult

  /**
   * In current line, reversely find next Token that matches the condition SINCE the token with given index
   *
   * This function will NOT make the stream rewind! Use `setPos` to change position.
   *
   * @param condition a RegExp to check token.type, or a function check the Token
   * @param i_token_since default: i_token-1 (the prev of current token)
   */
  findPrev(condition: TokenSeeker.ConditionType, i_token_since: number): TokenSeekResult


  findPrev(condition: TokenSeeker.ConditionType, varg?: boolean | number, since?: Position): TokenSeekResult {
    var lineNo = this.lineNo
    var tokens = this.lineTokens
    var token: Token = null

    var i_token: number = this.i_token - 1
    var maySpanLines = false

    if (varg === true) {
      maySpanLines = true
    } else if (typeof varg === 'number') {
      i_token = varg
    }

    if (since) {
      if (since.line < lineNo) {
        i_token = -1 // just ignore current line
      } else if (since.line > lineNo) {
        // hmmm... we shall NEVER go forward
      } else {
        for (; i_token < tokens.length; i_token++) {
          if (tokens[i_token].start >= since.ch) break
        }
      }
    }

    if (i_token >= tokens.length) i_token = tokens.length - 1

    for (; i_token >= 0; i_token--) {
      var token_tmp = tokens[i_token]
      if ((typeof condition === "function") ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)) {
        token = token_tmp
        break
      }
    }

    if (!token && maySpanLines) {
      const cm = this.cm
      const startLine = Math.min(since ? since.line : cm.lastLine(), lineNo - 1)
      const endLine = cm.firstLine()

      // cm.eachLine doesn't support reversed searching
      // use while... loop to iterate

      lineNo = startLine + 1
      while (!token && endLine <= --lineNo) {
        const line_i = cm.getLineHandle(lineNo)
        tokens = cm.getLineTokens(lineNo)

        i_token = 0
        if (since && lineNo === since.line) {
          for (; i_token < tokens.length; i_token++) {
            if (tokens[i_token].start >= since.ch) break
          }
        }

        if (i_token >= tokens.length) i_token = tokens.length - 1

        for (; i_token >= 0; i_token--) {
          var token_tmp = tokens[i_token]
          if ((typeof condition === "function") ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)) {
            token = token_tmp
            break // FOUND token !
          }
        }
      }
    }

    return token ? { lineNo, token, i_token } : null
  }

  /**
   * return a range in which every token has the same style, or meet same condition
   */
  expandRange(style: string | TokenSeeker.ConditionType, maySpanLines?: boolean): { from: TokenSeekResult, to: TokenSeekResult } {
    const cm = this.cm
    var isStyled: TokenSeeker.ConditionFunction

    if (typeof style === "function") {
      isStyled = style
    } else {
      if (typeof style === "string") style = new RegExp("(?:^|\\s)" + style + "(?:\\s|$)")
      isStyled = (token) => (token ? (style as RegExp).test(token.type || "") : false)
    }

    var from: TokenSeekResult = {
      lineNo: this.lineNo,
      i_token: this.i_token,
      token: this.lineTokens[this.i_token]
    }
    var to: TokenSeekResult = Object.assign({}, from) as TokenSeekResult

    // find left
    var foundUnstyled = false, tokens = this.lineTokens, i = this.i_token
    while (!foundUnstyled) {
      if (i >= tokens.length) i = tokens.length - 1
      for (; i >= 0; i--) {
        let token = tokens[i]
        if (!isStyled(token, tokens, i)) {
          foundUnstyled = true
          break
        } else {
          from.i_token = i
          from.token = token
        }
      }

      if (foundUnstyled || !(maySpanLines && from.lineNo > cm.firstLine())) break // found, or no more lines
      tokens = cm.getLineTokens(--from.lineNo)
      i = tokens.length - 1;
    }

    // find right
    var foundUnstyled = false, tokens = this.lineTokens, i = this.i_token
    while (!foundUnstyled) {
      if (i < 0) i = 0
      for (; i < tokens.length; i++) {
        let token = tokens[i]
        if (!isStyled(token, tokens, i)) {
          foundUnstyled = true
          break
        } else {
          to.i_token = i
          to.token = token
        }
      }

      if (foundUnstyled || !(maySpanLines && to.lineNo < cm.lastLine())) break // found, or no more lines
      tokens = cm.getLineTokens(++to.lineNo)
      i = 0;
    }

    return { from, to }
  }


  setPos(ch: number);
  setPos(line: number | CodeMirror.LineHandle, ch: number);

  /**
   * Update seeker's cursor position
   *
   * @param precise if true, lineTokens will be refresh even if lineNo is not changed
   */
  setPos(line: number | CodeMirror.LineHandle, ch: number, precise?: boolean);

  setPos(line: number | CodeMirror.LineHandle, ch?: number, precise?: boolean) {
    if (ch === void 0) { ch = line as number; line = this.line }
    else if (typeof line === 'number') line = this.cm.getLineHandle(line);

    const sameLine = line === this.line;
    var i_token = 0

    if (precise || !sameLine) {
      this.line = line
      this.lineNo = line.lineNo()
      this.lineTokens = this.cm.getLineTokens(this.lineNo)
    } else {
      // try to speed-up seeking
      i_token = this.i_token
      let token = this.lineTokens[i_token]
      if (token.start > ch) i_token = 0
    }

    var tokens = this.lineTokens
    for (; i_token < tokens.length; i_token++) {
      if (tokens[i_token].end > ch) break // found
    }

    this.i_token = i_token
  }

  /** get (current or idx-th) token */
  getToken(idx?: number) {
    if (typeof idx !== 'number') idx = this.i_token
    return this.lineTokens[idx]
  }

  /** get (current or idx-th) token type. always return a string */
  getTokenType(idx?: number) {
    if (typeof idx !== 'number') idx = this.i_token
    var t = this.lineTokens[idx]
    return t && t.type || ""
  }
}

export namespace TokenSeeker {
  export type ConditionFunction = (token: Token, lineTokens: Token[], token_index: number) => boolean;
  export type ConditionType = RegExp | ConditionFunction;
  export type ResultType = {
    lineNo: number,
    token: Token,
    i_token: number
  };
}

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
