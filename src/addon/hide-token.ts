// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Auto show/hide markdown tokens like `##` or `*`
//
// Only works with `hypermd` mode, require special CSS rules
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, cm_internal, updateCursorDisplay, debounce, suggestedEditorConfig } from '../core'

import { cm_t } from '../core/type'

const DEBUG = false

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /** Enable HideToken features or not. */
  enabled: boolean

  /** Add `hmd-inactive-line` style to inactive lines or not */
  line: boolean

  /** @internal reserved yet */
  tokenTypes: string[]
}

export const defaultOption: Options = {
  enabled: false,
  line: true,
  tokenTypes: "em|strong|strikethrough|code|link|task".split("|"),
}

export const suggestedOption: Partial<Options> = {
  enabled: true,  // we recommend lazy users to enable this fantastic addon!
}

export type OptionValueType = Partial<Options> | boolean | string | string[];

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for HideToken.
       *
       * You may also provide a `false` to disable it; a `true` to enable it with defaultOption (except `enabled`);
       * or token types (as string array, or just a string with "|" as separator inside)
       */
      hmdHideToken?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdHideToken = suggestedOption

CodeMirror.defineOption("hmdHideToken", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal || typeof newVal === "boolean") {
    newVal = { enabled: !!newVal }
  } else if (typeof newVal === "string") {
    newVal = { enabled: true, tokenTypes: newVal.split("|") }
  } else if (newVal instanceof Array) {
    newVal = { enabled: true, tokenTypes: newVal }
  }

  ///// apply config and write new values into cm

  var inst = getAddon(cm)
  for (var k in defaultOption) {
    inst[k] = (k in newVal) ? newVal[k] : defaultOption[k]
  }
})

//#endregion

/********************************************************************************** */
//#region Addon Class

const hideClassName = "hmd-hidden-token"
const lineDeactiveClassName = "hmd-inactive-line"

export class HideToken implements Addon.Addon, Options {
  tokenTypes: string[];
  line: boolean;
  enabled: boolean;

  constructor(public cm: cm_t) {
    new FlipFlop(
      /* ON  */() => {
        cm.on("cursorActivity", this.cursorActivityHandler)
        cm.on("renderLine", this.renderLineHandler)
        cm.on("update", this.update)
        this.update()
        cm.refresh()
      },
      /* OFF */() => {
        cm.off("cursorActivity", this.cursorActivityHandler)
        cm.off("renderLine", this.renderLineHandler)
        cm.off("update", this.update)
        this.update.stop()
        cm.refresh()
      }
    ).bind(this, "enabled", true)
  }

  /** a map storing shown tokens' beginning ch */
  shownTokensStart: { [line: number]: number[] } = {}

  renderLineHandler = (cm: cm_t, line: CodeMirror.LineHandle, el: HTMLPreElement) => {
    this.procLine(line, el)
  }

  /**
   * fetch cursor position and re-calculate shownTokensStart
   */
  calcShownTokenStart(): { [line: number]: number[] } {
    const cm = this.cm
    const cpos = cm.getCursor()
    const tokenTypes = this.tokenTypes
    const formattingRE = new RegExp(`\\sformatting-(${tokenTypes.join("|")})\\s`)
    let ans = {}

    let lineTokens = cm.getLineTokens(cpos.line)
    let i_cursor = -1
    let fstack: [CodeMirror.Token, string][] = []
    let currentType = null

    let tokens_to_show: CodeMirror.Token[] = []

    if (DEBUG) console.log("-----------calcShownTokenStart")

    // construct fstack until we find current char's position
    // i <- current token index
    for (var i = 0; i < lineTokens.length; i++) {
      const token = lineTokens[i]

      if (i_cursor === -1 && (token.end > cpos.ch || i === lineTokens.length - 1)) {
        i_cursor = i // token of cursor, is found!
        if (DEBUG) console.log("--------TOKEN OF CURSOR FOUND AT ", i_cursor, token)
      }

      let mat = token.type && token.type.match(formattingRE)
      if (mat) { // current token is a formatting-* token
        const type = mat[1] // type without "formatting-"

        if (type !== currentType) {
          // change the `fstack` (push or pop)
          // and, if token on cursor is found, stop searching

          const fstack_top = fstack[fstack.length - 1]

          if (fstack_top && fstack_top[1] === type) {
            fstack.pop()

            if (i_cursor !== -1 || token.end === cpos.ch) {
              tokens_to_show.push(fstack_top[0], token)
              break
            }
          } else {
            fstack.push([token, type])

            if (i_cursor !== -1) {
              // token on cursor, is a beginning formatting token
              tokens_to_show.push(token)

              const testRE = new RegExp(`\\sformatting-${type}\\s`)

              if (DEBUG) console.log("-> cursor token already found. ", token, testRE)

              for (i += 1; i < lineTokens.length; i++) {
                const token2 = lineTokens[i]
                if (token2.type && testRE.test(token2.type)) {
                  // found the ending formatting token
                  tokens_to_show.push(token2)
                  if (DEBUG) console.log(token2, token2.type)
                  break
                }
              }

              break
            }
          }

          if (DEBUG) console.log(fstack.map(x => `${x[0].start} ${x[1]}`))

          currentType = type
        }
      } else {
        if (i_cursor !== -1) { // token on cursor, is found

          if (fstack.length > 0) {
            // token on cursor, is wrapped by a formatting token

            const [token_1, type] = fstack.pop()
            const testRE = new RegExp(`\\sformatting-${type}\\s`)

            if (DEBUG) console.log("cursor is wrapped by ", type, token_1, "...")

            tokens_to_show.push(token_1)

            for (i += 1; i < lineTokens.length; i++) {
              const token2 = lineTokens[i]
              if (token2.type && testRE.test(token2.type)) {
                // found the ending formatting token
                tokens_to_show.push(token2)
                if (DEBUG) console.log("to ", token2, token2.type)

                break
              }
            }
          } else {
            // token on cursor, is not styled
          }

          break
        }

        currentType = null
      }

      if (i_cursor !== -1 && fstack.length === 0) break // cursor is not wrapped by formatting-*
    }

    let ans_of_line = ans[cpos.line] = []
    for (const it of tokens_to_show) {
      ans_of_line.push(it.start)
    }

    if (i >= lineTokens.length - 1) {
      for (const stack_it of fstack) {
        let pos = stack_it[0].start
        if (ans_of_line.indexOf(pos) === -1) ans_of_line.push(pos)
      }
    }

    return ans
  }

  /**
   * hide/show <span>s in one line
   * @see this.shownTokensStart
   * @returns apperance changed since which char. -1 means nothing changed.
   */
  procLine(line: CodeMirror.LineHandle, pre?: HTMLPreElement): number {
    if (!line) return -1

    const cm = this.cm
    const lineNo = line.lineNo()
    const lv = cm_internal.findViewForLine(cm, lineNo)
    if (!lv || lv.hidden || !lv.measure) return -1
    const mapInfo = cm_internal.mapFromLineView(lv, line, lineNo)

    const map = mapInfo.map
    const nodeCount = map.length / 3

    const startChs = (lineNo in this.shownTokensStart) ? this.shownTokensStart[lineNo].slice().sort((a, b) => (a - b)) : null

    let ans = -1

    for (let idx = 0, i = 0; idx < nodeCount; idx++ , i += 3) {
      const start = map[i] as number
      const end = map[i + 1] as number
      const text = map[i + 2] as Text
      const span = text.parentElement
      if (text.nodeType !== Node.TEXT_NODE || !span || !/^span$/i.test(span.nodeName)) continue

      const spanClass = span.className
      for (const type of this.tokenTypes) {
        if (type === 'link' && /(?:^|\s)(?:cm-hmd-footref|cm-hmd-footnote|cm-hmd-barelink)(?:\s|$)/.test(spanClass)) {
          // ignore footnote names, footrefs, barelinks
          continue
        }
        if (spanClass.indexOf("cm-formatting-" + type + " ") === -1) continue

        // found one! decide next action, hide or show?

        let toHide = true

        if (startChs && startChs.length > 0) {
          while (startChs[0] < start) startChs.shift() // remove passed chars
          toHide = (startChs[0] !== start) // hide if not hit
        }

        // hide or show token

        if (toHide) {
          if (spanClass.indexOf(hideClassName) === -1) {
            span.className += " " + hideClassName
            if (ans === -1) ans = start
          }
        } else {
          if (spanClass.indexOf(hideClassName) !== -1) {
            span.className = spanClass.replace(hideClassName, "")
            if (ans === -1) ans = start
          }
        }

        break
      }
    }

    if (this.line && (pre = pre || lv.text)) {
      const preClass = pre.className
      const preIsActive = preClass.indexOf(lineDeactiveClassName) === -1
      const preShouldActive = startChs !== null

      if (preIsActive != preShouldActive) {
        if (DEBUG) console.log("[hide-token] <pre>" + lineNo, preClass, "should ", preIsActive ? "deactive" : "active")

        if (preShouldActive) {
          pre.className = preClass.replace(lineDeactiveClassName, "")
        } else {
          pre.className = preClass + " " + lineDeactiveClassName
        }

        ans = 0
      }
    }

    if (ans !== -1 && lv.measure.cache) lv.measure.cache = {} // clean cache
    return ans
  }

  cursorActivityHandler = (doc: CodeMirror.Doc) => {
    this.update()
  }

  update = debounce(() => this.updateImmediately(), 100)

  updateImmediately() {
    const cm = this.cm
    const cpos = cm.getCursor()

    const sts_old = this.shownTokensStart
    const sts_new = this.shownTokensStart = (this.enabled ? this.calcShownTokenStart() : {})

    let cpos_line_changed = false

    // find the numbers of changed line
    let changed_lines: number[] = []
    for (const line_str in sts_old) changed_lines.push(~~line_str)
    for (const line_str in sts_new) changed_lines.push(~~line_str)
    changed_lines.sort((a, b) => (a - b)) // NOTE: numbers could be duplicated

    cm.operation(() => {
      // process every line, skipping duplicated numbers
      let lastLine = -1
      for (const line of changed_lines) {
        if (line === lastLine) continue // duplicated
        lastLine = line
        const procAns = this.procLine(cm.getLineHandle(line))
        if (procAns !== -1 && cpos.line === line) cpos_line_changed = true
      }

      // refresh cursor position if needed
      if (cpos_line_changed) {
        updateCursorDisplay(cm, true)
        if (cm.hmd.TableAlign && cm.hmd.TableAlign.enabled) cm.hmd.TableAlign.updateStyle()
      }
    })
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one HideToken instance */
export const getAddon = Addon.Getter("HideToken", HideToken, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { HideToken?: HideToken } } }
