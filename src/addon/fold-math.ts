// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold and Render TeX formula expressions. Works with *fold* addon.
//
// Provides *DumbRenderer* as the Default MathRenderer.
// You may use others like MathJax, KaTeX via PowerPacks
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, tryToRun, suggestedEditorConfig } from '../core'
import { TextMarker, Position, Token } from 'codemirror'
import { cm_t } from '../core/type'
import { registerFolder, breakMark, FolderFunc, RequestRangeResult } from './fold'

const DEBUG = false

/********************************************************************************** */
/// MATH ENGINE DECLARATION
/// You may implement a MathRenderer to use other engine, eg. MathJax or KaTex

export type MathRenderMode = "display" | ""
export declare abstract class MathRenderer {
  constructor(container: HTMLElement, mode: MathRenderMode)

  startRender(expr: string): void
  clear(): void

  /** a callback function, called when a rendering work is done */
  onChanged: (expr: string) => void

  /** indicate that if the Renderer is ready to execute */
  isReady(): boolean
}

/********************************************************************************** */
//#region Exports

/**
 * Detect if a token is a beginning of Math, and fold it!
 *
 * @see FolderFunc in ./fold.ts
 */
export const MathFolder: FolderFunc = (stream, token) => {
  const mathBeginRE = /formatting-math-begin\b/

  if (!mathBeginRE.test(token.type)) return null

  const cm = stream.cm
  const line = stream.lineNo
  const maySpanLines = /math-2\b/.test(token.type) // $$ may span lines!
  const tokenLength = maySpanLines ? 2 : 1 // "$$" or "$"

  // CodeMirror GFM mode split "$$" into two tokens, so do a extra check.

  if (tokenLength == 2 && token.string.length == 1) {
    if (DEBUG) console.log("[FoldMath] $$ is splitted into 2 tokens")
    let nextToken = stream.lineTokens[stream.i_token + 1]
    if (!nextToken || !mathBeginRE.test(nextToken.type)) return null
  }

  // Find the position of the "$" tail and compose a range

  const end_info = stream.findNext(/formatting-math-end\b/, maySpanLines)

  var from: Position = { line, ch: token.start }
  var to: Position
  var noEndingToken = false

  if (end_info) {
    to = { line: end_info.lineNo, ch: end_info.token.start + tokenLength }
  } else if (maySpanLines) {
    // end not found, but this is a multi-line math block.
    // fold to the end of doc
    let lastLineNo = cm.lastLine()
    to = { line: lastLineNo, ch: cm.getLine(lastLineNo).length }
    noEndingToken = true
  } else {
    // Hmm... corrupted math ?
    return null
  }

  // Range is ready. request the range

  var expr_from: Position = { line: from.line, ch: from.ch + tokenLength }
  var expr_to: Position = { line: to.line, ch: to.ch - (noEndingToken ? 0 : tokenLength) }
  var expr: string = cm.getRange(expr_from, expr_to).trim()

  const foldMathAddon = getAddon(cm)

  const reqAns = stream.requestRange(from, to)
  if (reqAns !== RequestRangeResult.OK) {
    if (reqAns === RequestRangeResult.CURSOR_INSIDE) foldMathAddon.editingExpr = expr // try to trig preview event
    return null
  }

  // Now let's make a math widget!

  const isDisplayMode = tokenLength > 1 && from.ch == 0 && (noEndingToken || to.ch >= cm.getLine(to.line).length)
  var marker = insertMathMark(cm, from, to, expr, tokenLength, isDisplayMode)
  foldMathAddon.editingExpr = null // try to hide preview
  return marker
}

/**
 * Insert a TextMarker, and try to render it with configured MathRenderer.
 */
export function insertMathMark(cm: cm_t, p1: Position, p2: Position, expression: string, tokenLength: number, isDisplayMode?: boolean): TextMarker {
  var span = document.createElement("span")
  span.setAttribute("class", "hmd-fold-math math-" + (isDisplayMode ? 2 : 1))
  span.setAttribute("title", expression)

  var mathPlaceholder = document.createElement("span")
  mathPlaceholder.setAttribute("class", "hmd-fold-math-placeholder")
  mathPlaceholder.textContent = expression

  span.appendChild(mathPlaceholder)

  if (DEBUG) {
    console.log("insert", p1, p2, expression)
  }

  var marker: TextMarker = cm.markText(p1, p2, {
    replacedWith: span,
  })

  span.addEventListener("click", () => breakMark(cm, marker, tokenLength), false)

  const foldMathAddon = getAddon(cm)
  var mathRenderer = foldMathAddon.createRenderer(span, isDisplayMode ? "display" : "")
  mathRenderer.onChanged = function () {
    if (mathPlaceholder) {
      span.removeChild(mathPlaceholder)
      mathPlaceholder = null
    }
    marker.changed()
  }
  marker.on("clear", function () { mathRenderer.clear() })
  marker["mathRenderer"] = mathRenderer

  tryToRun(() => {
    if (DEBUG) console.log("[MATH] Trying to render ", expression)
    if (!mathRenderer.isReady()) return false
    mathRenderer.startRender(expression)
    return true
  }, 5, () => { // if failed 5 times...
    marker.clear()
    if (DEBUG) {
      console.log("[MATH] engine always not ready. faild to render ", expression, p1)
    }
  })

  return marker
}

//#endregion

registerFolder("math", MathFolder, true)

/********************************************************************************** */
//#region Default Renderer

export class DumbRenderer implements MathRenderer {
  public img: HTMLImageElement
  public last_expr: string

  constructor(public container: HTMLElement, mode: MathRenderMode) {
    var img = document.createElement("img")
    img.setAttribute("class", "hmd-math-dumb")
    img.addEventListener("load", () => { if (this.onChanged) this.onChanged(this.last_expr) }, false)

    this.img = img
    container.appendChild(img)
  }

  startRender(expr: string): void {
    this.last_expr = expr
    this.img.src = "https://latex.codecogs.com/gif.latex?" + encodeURIComponent(expr)
  }

  clear(): void {
    this.container.removeChild(this.img)
  }

  /** a callback function, called when a rendering work is done */
  onChanged: (expr: string) => void;

  /** indicate that if the Renderer is ready to execute */
  isReady(): boolean {
    return true // I'm always ready!
  }
}

//#endregion

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /**
   * custom renderer
   *
   * @see MathRenderer
   * @see DumbRenderer
   */
  renderer: typeof MathRenderer

  /** a callback whenever you shall show/update a math preview */
  onPreview: (expr: string) => void

  /** a callback whenever you shall hide the preview box */
  onPreviewEnd: () => void
}

export const defaultOption: Options = {
  renderer: DumbRenderer,
  onPreview: null,
  onPreviewEnd: null,
}

export const suggestedOption: Partial<Options> = {

}

export type OptionValueType = Partial<Options> | (typeof MathRenderer);

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for FoldMath.
       *
       * **NOTE**: to switch this feature off, please modify `hmdFold.math` instead.
       *
       * You may also provide a MathRenderer class constructor
       *
       * @see MathRenderer
       */
      hmdFoldMath?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdFoldMath = suggestedOption

CodeMirror.defineOption("hmdFoldMath", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal) {
    newVal = {}
  } else if (typeof newVal === "function") {
    newVal = { renderer: newVal }
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

export class FoldMath implements Addon.Addon, Options {
  renderer: typeof MathRenderer;
  onPreview: (expr: string) => void;
  onPreviewEnd: () => void;

  /** current previewing TeX expression. could be null */
  editingExpr: string

  constructor(public cm: cm_t) {
    new FlipFlop<string>(
      /** CHANGED */(expr) => { this.onPreview && this.onPreview(expr) },
      /** HIDE    */() => { this.onPreviewEnd && this.onPreviewEnd() },
      null
    ).bind(this, "editingExpr")
  }

  public createRenderer(container: HTMLElement, mode: MathRenderMode): MathRenderer {
    var RendererClass = this.renderer || DumbRenderer as any
    return new RendererClass(container, mode)
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one FoldMath instance */
export const getAddon = Addon.Getter("FoldMath", FoldMath, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { FoldMath?: FoldMath } } }
