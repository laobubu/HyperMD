// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// Provide a MathFolder and add it into fold the add-on's built-in folder list
//

import CodeMirror, { TextMarker, Position, Token } from 'codemirror'
import { Addon, FlipFlop, debounce, tryToRun } from '../core'
import { cm_t } from '../core/type'
import { builtinFolder, breakMark, FolderFunc, RequestRangeResult } from './fold'
import 'mathjax'

const DEBUG = false

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
    let nextToken = stream.lineTokens[stream.i_token + 1]
    if (!nextToken || !mathBeginRE.test(nextToken.type)) return null
  }

  // Find the position of the "$" tail and compose a range

  const end_info = stream.findNext(/formatting-math-end\b/, maySpanLines)

  var from: Position = { line, ch: token.start }
  var to: Position

  if (end_info) {
    to = { line: end_info.lineNo, ch: end_info.token.start + tokenLength }
  } else if (maySpanLines) {
    // end not found, but this is a multi-line math block.
    // fold to the end of doc
    let lastLineNo = cm.lastLine()
    to = { line: lastLineNo, ch: cm.getLine(lastLineNo).length }
  } else {
    // Hmm... corrupted math ?
    return null
  }

  // Range is ready. request the range

  var expr_from: Position = { line: from.line, ch: from.ch + tokenLength }
  var expr_to: Position = { line: to.line, ch: to.ch - tokenLength }
  var expr: string = cm.getRange(expr_from, expr_to).trim()

  const foldMathAddon = getAddon(cm)

  const reqAns = stream.requestRange(from, to)
  if (reqAns !== RequestRangeResult.OK) {
    if (reqAns === RequestRangeResult.CURSOR_INSIDE) foldMathAddon.ff_pv.set(expr) // try to trig preview event
    return null
  }

  // Now let's make a math widget!

  var marker = insertMathMark(cm, from, to, expr, tokenLength, "math-" + tokenLength)
  foldMathAddon.ff_pv.set(null) // try to hide preview
  return marker
}

/**
 * Insert a TextMarker, and try to render it with configured MathRenderer.
 */
export function insertMathMark(cm: cm_t, p1: Position, p2: Position, expression: string, tokenLength: number, className?: string): TextMarker {
  var span = document.createElement("span")
  span.setAttribute("class", "hmd-fold-math " + (className || ''))
  span.setAttribute("title", expression)

  var mathPlaceholder = document.createElement("span")
  mathPlaceholder.setAttribute("class", "hmd-fold-math-placeholder")
  mathPlaceholder.textContent = expression

  span.appendChild(mathPlaceholder)

  if (DEBUG) {
    console.log("insert", p1, p2, expression)
  }

  var marker: TextMarker = cm.markText(p1, p2, {
    className: "hmd-fold-math",
    replacedWith: span,
    clearOnEnter: true
  })

  span.addEventListener("click", () => breakMark(cm, marker, tokenLength), false)

  // const foldMathAddon = getAddon(cm)
  const Renderer = cm.hmd.foldMath.renderer || (typeof MathJax === 'undefined' ? StupidRenderer : MathJaxRenderer) as any
  var mathRenderer = new Renderer(span, "") as MathRenderer
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

//////////////////////////////////////////////////////////////////
///

builtinFolder["math"] = MathFolder // inject fold's builtinFolders! Not cool but it works

//////////////////////////////////////////////////////////////////
/// MATH ENGINE

/**
 * You may implement a MathRenderer to use other engine, instead of MathJax
 */

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

//////////////////////////////////////////////////////////////////
/// Stupid MATH ENGINE

export class StupidRenderer implements MathRenderer {
  public img: HTMLImageElement
  public last_expr: string

  constructor(public container: HTMLElement, mode: MathRenderMode) {
    var img = document.createElement("img")
    img.setAttribute("class", "hmd-stupid-math")
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

//////////////////////////////////////////////////////////////////
/// MathJax MATH ENGINE

declare global { const MathJax: any }

export class MathJaxRenderer implements MathRenderer {
  public onChanged: (expr: string) => void = null

  public jax: any = null
  public script: HTMLScriptElement

  private _cleared: boolean = false
  private _renderingExpr: string = "" // Currently rendering expr

  constructor(
    public div: HTMLElement,
    public mode: MathRenderMode
  ) {
    var script = document.createElement("script")
    script.setAttribute("type", mode ? 'math/tex; mode=' + mode : 'math/tex')
    div.appendChild(script)
    this.script = script
  }

  clear() {
    var script = this.script;
    script.innerHTML = '';
    if (this.jax)
      this.jax.Remove();
    this._cleared = true;
  }

  startRender(expr: string) {
    if (this._cleared) {
      return;
    }
    if (this._renderingExpr) {
      // A new rendering job comes, while previous one is still in progress
      // Do rendering later, in _TypesetDoneCB function
      this._renderingExpr = expr;
      return;
    }
    this._renderingExpr = expr;
    var script = this.script;
    script.innerHTML = expr;
    if (this.jax) {
      MathJax.Hub.Queue(["Text", this.jax, expr], ["_TypesetDoneCB", this, expr]);
    }
    else {
      this.jax = MathJax.Hub.getJaxFor(script);
      MathJax.Hub.Queue(["Typeset", MathJax.Hub, script], ["_TypesetDoneCB", this, expr]);
    }
  }

  /** Callback for MathJax when typeset is done*/
  private _TypesetDoneCB(finished_expr) {
    if (this._cleared) {
      return;
    }
    if (this._renderingExpr !== finished_expr) {
      // Current finished rendering job is out-of-date
      // re-render with newest Tex expr
      var expr_new = this._renderingExpr;
      this._renderingExpr = "";
      this.startRender(expr_new);
      return;
    }
    // Rendering finished. Nothing wrong
    this._renderingExpr = "";
    if (typeof (this.onChanged) === 'function')
      this.onChanged(finished_expr)
  }

  public isReady() {
    return typeof MathJax === 'object' && MathJax.isReady
  }
}

//////////////////////////////////////////////////////////////////
/// CodeMirror editor options!

export interface FoldMathOptions {
  renderer: typeof MathRenderer
  /** a callback whenever you shall show/update a math preview */
  onPreview: (expr: string) => void
  /** a callback whenever you shall hide the preview box */
  onPreviewEnd: () => void
}

export var defaultOption: FoldMathOptions = {
  renderer: null,  // use null to let HyperMD choose StupidRenderer or MathJaxRenderer
  onPreview: null,
  onPreviewEnd: null,
}

/**
 * This is not a real addon.
 *
 * If you want to stop folding math. set options.hmdFold.math = false
 */
class FoldMath implements Addon.Addon, FoldMathOptions {
  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption (if exists)
  }

  /** Use a FlipFlop to emit events! How smart I am! */
  public ff_pv = new FlipFlop<string>(
    /** CHANGED */(expr) => { this.onPreview && this.onPreview(expr) },
    /** HIDE    */() => { this.onPreviewEnd && this.onPreviewEnd() },
    null
  )

  renderer: typeof MathRenderer;
  onPreview: (expr: string) => void;
  onPreviewEnd: () => void;
}

const OptionName = "hmdFoldMath"
type OptionValueType = Partial<FoldMathOptions>;

CodeMirror.defineOption(OptionName, defaultOption, function (cm: cm_t, newVal: OptionValueType) {
  var newCfg: FoldMathOptions = defaultOption
  if (typeof newVal === 'object') {
    newCfg = Addon.migrateOption(newVal, defaultOption)
  } else {
    console.warn("[HyperMD FoldMath] wrong option format. If you want to stop folding math. set options.hmdFold.math = false")
  }

  var inst = getAddon(cm)
  for (var k in newCfg) inst[k] = newCfg[k]
})

const AddonAlias = "foldMath"
declare global { namespace HyperMD { interface EditorConfiguration { [OptionName]?: OptionValueType } } }
declare global { namespace HyperMD { interface HelperCollection { [AddonAlias]?: FoldMath } } }
export const getAddon = Addon.Getter(AddonAlias, FoldMath, defaultOption)
