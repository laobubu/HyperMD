// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// Auto show/hide markdown tokens like `##` or `*`
// Works with `hypermd` mode, require special CSS rules
//

import CodeMirror from 'codemirror'
import { Addon, FlipFlop, cm_internal } from '../core'
import { cm_t } from '../core/type'

const DEBUG = true

/********************************************************************************** */
//#region Addon Options

export interface MyOptions extends Addon.AddonOptions {
  enabled: boolean
  tokenTypes: string[]
}

export const defaultOption: MyOptions = {
  enabled: false,
  tokenTypes: "em|strong|strikethrough|code|link".split("|"),
}

const OptionName = "hmdHideToken"
type OptionValueType = Partial<MyOptions> | boolean | string | string[];

CodeMirror.defineOption(OptionName, defaultOption, function (cm: cm_t, newVal: OptionValueType) {
  const enabled = !!newVal

  if (!enabled || typeof newVal === "boolean") {
    newVal = { enabled: enabled }
  } else if (typeof newVal === "string") {
    newVal = { enabled: true, tokenTypes: newVal.split("|") }
  } else if (newVal instanceof Array) {
    newVal = { enabled: true, tokenTypes: newVal }
  }

  var newCfg = Addon.migrateOption(newVal, defaultOption)

  ///// apply config
  var inst = getAddon(cm)

  inst.ff_enable.setBool(newCfg.enabled)

  ///// write new values into cm
  for (var k in defaultOption) inst[k] = newCfg[k]
})

declare global { namespace HyperMD { interface EditorConfiguration { [OptionName]?: OptionValueType } } }

//#endregion

/********************************************************************************** */
//#region Addon Class

const hideClassName = "hmd-hidden-token"

/**
 * 1. when renderLine, add "hmd-hidden-token" to each <span>
 * 2.
 */
export class HideToken implements Addon.Addon, MyOptions /* if needed */ {
  tokenTypes: string[];
  enabled: boolean;

  public ff_enable: FlipFlop  // bind/unbind events

  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption (if exists)
    // add your code here

    this.ff_enable = new FlipFlop(
      /* ON  */() => {
        cm.on("cursorActivity", this.cursorActivityHandler)
        cm.on("renderLine", this.renderLineHandler)
      },
      /* OFF */() => {
        cm.off("cursorActivity", this.cursorActivityHandler)
        cm.off("renderLine", this.renderLineHandler)
      }
    )
  }

  /** a map storing shown tokens' beginning ch */
  shownTokensStart: { [line: number]: number[] } = {}

  renderLineHandler = (cm: cm_t, line: CodeMirror.LineHandle, el: HTMLPreElement) => {
    this.procLine(line)
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
    for (let i = 0; i < lineTokens.length; i++) {
      const token = lineTokens[i]

      if (i_cursor === -1 && token.end > cpos.ch) {
        i_cursor = i // token of cursor, is found!
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

    return ans
  }

  /**
   * hide/show <span>s in one line
   * @see this.shownTokensStart
   * @returns apperance changed since which char. -1 means nothing changed.
   */
  procLine(line: CodeMirror.LineHandle): number {
    const cm = this.cm
    const lineNo = line.lineNo()
    const lv = cm_internal.findViewForLine(cm, lineNo)
    const mapInfo = cm_internal.mapFromLineView(lv, line, lineNo)

    const map = mapInfo.map
    const nodeCount = map.length / 3

    const startChs = (lineNo in this.shownTokensStart) ? this.shownTokensStart[lineNo].sort((a, b) => (a - b)) : null

    let ans = -1

    for (let idx = 0, i = 0; idx < nodeCount; idx++ , i += 3) {
      const start = map[i] as number
      const end = map[i + 1] as number
      const text = map[i + 2] as Text
      const span = text.parentElement
      if (text.nodeType !== Node.TEXT_NODE || !span || !/^span$/i.test(span.nodeName)) continue

      const spanClass = span.className
      for (const type of this.tokenTypes) {
        if (type === 'link' && /cm-hmd-footref|cm-hmd-footnote|cm-hmd-barelink/.test(spanClass)) {
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

    return ans
  }

  cursorActivityHandler = (doc: CodeMirror.Doc) => {
    const cm = this.cm
    const cpos = cm.getCursor()
    this.shownTokensStart = this.calcShownTokenStart()
    this.procLine(cm.getLineHandle(cpos.line))
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one MyAddon instance */
const AddonAlias = "hideToken"
export const getAddon = Addon.Getter(AddonAlias, HideToken, defaultOption)
declare global { namespace HyperMD { interface HelperCollection { [AddonAlias]?: HideToken } } }
