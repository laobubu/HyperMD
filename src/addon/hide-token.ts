// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Auto show/hide markdown tokens like `##` or `*`
//
// Only works with `hypermd` mode, require special CSS rules
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, cm_internal, debounce, suggestedEditorConfig, normalVisualConfig } from '../core'

import { cm_t } from '../core/type'
import { OrderedRange, orderedRange, rangesIntersect } from '../core/cm_utils';
import { getLineSpanExtractor, Span } from '../core/line-spans';

const DEBUG = false

//#region Internal Function...

/** check if has the class and remove it */
function rmClass(el: HTMLElement, className: string): boolean {
  let c = ' ' + el.className + ' ', cnp = ' ' + className + ' '
  if (c.indexOf(cnp) === -1) return false
  el.className = c.replace(cnp, '').trim()
  return true
}

/** check if NOT has the class and add it */
function addClass(el: HTMLElement, className: string): boolean {
  let c = ' ' + el.className + ' ', cnp = ' ' + className + ' '
  if (c.indexOf(cnp) !== -1) return false
  el.className = (el.className + ' ' + className)
  return true
}

//#endregion

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
  tokenTypes: "em|strong|strikethrough|code|linkText|task".split("|"),
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
normalVisualConfig.hmdHideToken = false

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
const lineInactiveClassName = "hmd-inactive-line"

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

  renderLineHandler = (cm: cm_t, line: CodeMirror.LineHandle, el: HTMLPreElement) => {
    // TODO: if we procLine now, we can only get the outdated lineView, lineViewMeasure and lineViewMap. Calling procLine will be wasteful!
    const changed = this.procLine(line, el)
    if (DEBUG) console.log("renderLine return " + changed)
  }

  cursorActivityHandler = (doc: CodeMirror.Doc) => {
    this.update()
  }

  update = debounce(() => this.updateImmediately(), 100)

  /**
   * hide/show <span>s in one line, based on `this._rangesInLine`
   * @returns line changed or not
   */
  procLine(line: CodeMirror.LineHandle | number, pre?: HTMLPreElement): boolean {
    const cm = this.cm
    const lineNo = typeof line === 'number' ? line : line.lineNo()
    if (typeof line === 'number') line = cm.getLineHandle(line)

    const rangesInLine = this._rangesInLine[lineNo] || []

    const lv = cm_internal.findViewForLine(cm, lineNo)
    if (!lv || lv.hidden || !lv.measure) return false
    if (!pre) pre = lv.text
    if (!pre) return false

    if (DEBUG) if (!pre.isSameNode(lv.text)) console.warn("procLine got different node... " + lineNo)

    const mapInfo = cm_internal.mapFromLineView(lv, line, lineNo)
    const map = mapInfo.map
    const nodeCount = map.length / 3

    let changed = false

    // change line status

    if (rangesInLine.length === 0) { // inactiveLine
      if (addClass(pre, lineInactiveClassName)) changed = true
    } else { // activeLine
      if (rmClass(pre, lineInactiveClassName)) changed = true
    }

    // show or hide tokens

    /**
     * @returns if there are Span Nodes changed
     */
    function changeVisibilityForSpan(span: Span, shallHideTokens: boolean, iNodeHint?: number): boolean {
      let changed: boolean = false

      iNodeHint = iNodeHint || 0

      // iterate the map
      for (let i = iNodeHint; i < nodeCount; i++) {
        const begin = map[i * 3] as number, end = map[i * 3 + 1] as number
        const domNode = map[i * 3 + 2] as (Text | HTMLSpanElement)

        if (begin === span.head.start) {
          // find the leading token!

          if (/formatting-/.test(span.head.type) && domNode.nodeType === Node.TEXT_NODE) {
            // if (DEBUG) console.log("DOMNODE", shallHideTokens, domNode, begin, span)

            // good. this token can be changed
            const domParent = domNode.parentElement as HTMLSpanElement
            if (shallHideTokens ? addClass(domParent, hideClassName) : rmClass(domParent, hideClassName)) {
              // if (DEBUG) console.log("HEAD DOM CHANGED")
              changed = true
            }
          }

          //FIXME: if leading formatting token is separated into two, the latter will not be hidden/shown!

          // search for the tailing token
          if (span.tail && /formatting-/.test(span.tail.type)) {
            for (let j = i + 1; j < nodeCount; j++) {
              const begin = map[j * 3] as number, end = map[j * 3 + 1] as number
              const domNode = map[j * 3 + 2] as (Text | HTMLSpanElement)

              if (begin == span.tail.start) {
                // if (DEBUG) console.log("TAIL DOM CHANGED", domNode)
                if (domNode.nodeType === Node.TEXT_NODE) {
                  // good. this token can be changed
                  const domParent = domNode.parentElement as HTMLSpanElement
                  if (shallHideTokens ? addClass(domParent, hideClassName) : rmClass(domParent, hideClassName)) {
                    changed = true
                  }
                }
              }

              if (begin >= span.tail.end) break
            }
          }
        }

        // whoops, next time we can start searching since here
        // return the hint value
        if (begin >= span.begin) break
      }

      return changed
    }

    const spans = getLineSpanExtractor(cm).extract(lineNo)
    let iNodeHint = 0
    for (let iSpan = 0; iSpan < spans.length; iSpan++) {
      const span = spans[iSpan]
      if (this.tokenTypes.indexOf(span.type) === -1) continue // not-interested span type

      /* TODO: Use AST, instead of crafted Position */
      const spanRange: OrderedRange = [{ line: lineNo, ch: span.begin }, { line: lineNo, ch: span.end }]
      /* TODO: If use AST, compute `spanBeginCharInCurrentLine` in another way */
      const spanBeginCharInCurrentLine: number = span.begin

      while (iNodeHint < nodeCount && map[iNodeHint * 3 + 1] < spanBeginCharInCurrentLine) iNodeHint++

      let shallHideTokens = true

      for (let iLineRange = 0; iLineRange < rangesInLine.length; iLineRange++) {
        const userRange = rangesInLine[iLineRange]
        if (rangesIntersect(spanRange, userRange)) {
          shallHideTokens = false
          break
        }
      }

      if (changeVisibilityForSpan(span, shallHideTokens, iNodeHint)) changed = true
    }

    // finally clean the cache (if needed) and report the result

    if (changed) {
      // clean CodeMirror measure cache
      delete lv.measure.heights
      lv.measure.cache = {}
    }

    return changed
  }

  /** Current user's selections, in each line */
  private _rangesInLine: Record<number, OrderedRange[]> = {}

  updateImmediately() {
    this.update.stop()

    const cm = this.cm
    const selections = cm.listSelections()
    const caretAtLines: Record<number, boolean> = {}

    var activedLines: Record<number, OrderedRange[]> = {}
    var lastActivedLines = this._rangesInLine

    // update this._activedLines and caretAtLines
    for (const selection of selections) {
      let oRange = orderedRange(selection)
      let line0 = oRange[0].line, line1 = oRange[1].line
      caretAtLines[line0] = caretAtLines[line1] = true

      for (let line = line0; line <= line1; line++) {
        if (!activedLines[line]) activedLines[line] = [oRange]
        else activedLines[line].push(oRange)
      }
    }

    this._rangesInLine = activedLines

    if (DEBUG) console.log("======= OP START " + Object.keys(activedLines))

    cm.operation(() => {
      // adding "inactive" class
      for (const line in lastActivedLines) {
        if (activedLines[line]) continue // line is still active. do nothing
        this.procLine(~~line) // or, try adding "inactive" class to the <pre>s
      }

      let caretLineChanged = false

      // process active lines
      for (const line in activedLines) {
        let lineChanged = this.procLine(~~line)
        if (lineChanged && caretAtLines[line]) caretLineChanged = true
      }

      // refresh cursor position if needed
      if (caretLineChanged) {
        if (DEBUG) console.log("caretLineChanged")
        cm.refresh()

        // legacy unstable way to update display and caret position:
        // updateCursorDisplay(cm, true)
        // if (cm.hmd.TableAlign && cm.hmd.TableAlign.enabled) cm.hmd.TableAlign.updateStyle()
      }
    })

    if (DEBUG) console.log("======= OP END ")
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one HideToken instance */
export const getAddon = Addon.Getter("HideToken", HideToken, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { HideToken?: HideToken } } }
