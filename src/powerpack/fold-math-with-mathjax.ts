// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-math"
//
// Use MathJax to render TeX formulars.
//
// :warning: **Configuration Required**
//
// Before loading this module, make sure that you've finished [configuring MathJax](http://docs.mathjax.org/en/latest/configuration.html) like this:
//
// ```html
// <script type="text/x-mathjax-config">
// MathJax.Hub.Config({
//     jax: ["input/TeX", "output/HTML-CSS","output/NativeMML","output/SVG"],
//     extensions: ["MathMenu.js","MathZoom.js", "AssistiveMML.js", "a11y/accessibility-menu.js"],
//     TeX: {
//         extensions: ["AMSmath.js","AMSsymbols.js","noErrors.js","noUndefined.js"]
//     }
// });
// </script>
// ```

declare global { const MathJax } // @types/MathJax is not fully typed

import 'mathjax'
import { defaultOption, MathRenderer, MathRenderMode } from '../addon/fold-math';

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
      MathJax.Hub.Queue(["Typeset", MathJax.Hub, script], ["_TypesetDoneCB", this, expr]);
    }
  }

  /** Callback for MathJax when typeset is done*/
  private _TypesetDoneCB(finished_expr) {
    if (this._cleared) {
      return;
    }
    if (!this.jax) this.jax = MathJax.Hub.getJaxFor(this.script);
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
    return MathJax.isReady
  }
}

if (typeof MathJax !== "object") {
  // MathJax not exists. Do nothing
  console.error("[HyperMD] PowerPack fold-math-with-mathjax loaded, but MathJax not found.")
} else if (0 == MathJax.Hub.config.jax.length) {
  // IF NOT FOUND, throw a warning
  console.error("[HyperMD] Looks like MathJax is not configured.\nPlease do this BEFORE loading MathJax.\nSee http://docs.mathjax.org/en/latest/configuration.html")
  MathJax.isReady = false
} else {
  // Use MathJaxRenderer as default MathRenderer
  defaultOption.renderer = MathJaxRenderer
}
