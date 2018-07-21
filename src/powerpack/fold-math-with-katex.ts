// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-math"
//
// Use KaTeX to render TeX formulars.
//
// :warning: In plain browser env, don't forget to load `katex/dist/katex.min.css`.
//

import * as katex from 'katex'
import { defaultOption, MathRenderer, MathRenderMode } from '../addon/fold-math'

import 'katex/dist/katex.min.css'

export class KatexRenderer implements MathRenderer {
  private isDisplay: boolean
  private el: HTMLSpanElement
  private errorEl: HTMLSpanElement

  constructor(public container: HTMLElement, mode: MathRenderMode) {
    this.isDisplay = mode === "display"

    var elClass = "hmd-math-katex"
    if (mode) elClass += " hmd-math-katex-" + mode

    var errorEl = this.errorEl = document.createElement("span")
    errorEl.setAttribute("style", "white-space: pre-wrap; font-size: 90%; border: 1px solid #900; color: #C00")

    var el = this.el = document.createElement("span")
    el.className = elClass
    container.appendChild(el)
  }

  startRender(expr: string): void {
    const el = this.el, errorEl = this.errorEl

    try {
      katex.render(expr, el, {
        displayMode: this.isDisplay
      })

      // remove "error" mark if exists
      if (errorEl.parentElement === el) {
        el.removeChild(errorEl)
        el.className = el.className.replace(" hmd-math-katex-error", "")
      }
    } catch (err) {
      // failed to render!
      errorEl.textContent = err && err.message

      if (errorEl.parentElement !== el) {
        el.textContent = ""
        el.appendChild(errorEl)
        el.className += " hmd-math-katex-error"
      }
    }

    const onChanged = this.onChanged
    if (onChanged) setTimeout(onChanged.bind(this, expr), 0)
  }

  clear(): void {
    this.container.removeChild(this.el)
  }

  /** a callback function, called when a rendering work is done */
  onChanged: (expr: string) => void;

  /** indicate that if the Renderer is ready to execute */
  isReady(): boolean {
    return true // I'm always ready!
  }
}

// Use KatexRenderer as default MathRenderer
if (typeof katex != "undefined") {
  defaultOption.renderer = KatexRenderer
} else {
  console.error("[HyperMD] PowerPack fold-math-with-katex loaded, but katex not found.")
}
