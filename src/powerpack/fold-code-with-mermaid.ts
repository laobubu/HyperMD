// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-code"
//
// This module provides `MermaidRenderer` for FoldCode addon
// so that you can render flowchart / diagram with powerful [mermaid](https://mermaidjs.github.io/)
//
// By default the renderer is enabled. You may disable it by setting `hmdFoldCode.mermaid` to `false`
//
// **Example**: https://laobubu.net/HyperMD/docs/examples/mermaid.html
//
// :hint: to change mermaid configuration
//
// :warning: **Please include mermaid via HTML tag**
//
// mermaid's module declaration is buggy (v8.0.0). HyperMD gave up importing it.
//
// If using RequireJS or bundler (eg. webpack), include `<script src="path/to/mermaid.min.js"></script>` manually,
// before RequireJS or `dist/your_app.js`

import * as CodeMirror from "codemirror"
import { registerRenderer, CodeRenderer, getAddon as getFoldCode } from "../addon/fold-code"
import { getAddon as getFold } from "../addon/fold"

/** global mermaid */
declare var mermaid: typeof import("mermaid").default

export const MermaidRenderer: CodeRenderer = (code, info) => {
  var id = "_mermaid_id_" + Math.round(1e9 * Math.random()).toString(36)

  var el = document.createElement('div')
  el.setAttribute('id', id)
  el.setAttribute('class', 'hmd-fold-code-image hmd-fold-code-mermaid')

  mermaid.render(id, code, (svgCode, bindFunctions) => {
    el.innerHTML = svgCode
    el.removeAttribute('id')
    bindFunctions(el)
    info.changed()
  });

  return el
}

if (typeof mermaid === "object") {
  CodeMirror.defineOption("mermaid", null, (cm: CodeMirror.Editor) => {
    getFoldCode(cm).clear("mermaid")
    getFold(cm).startFold()
  });

  registerRenderer({
    name: "mermaid",
    pattern: /^mermaid$/i,
    renderer: MermaidRenderer,
    suggested: true,
  })
} else {
  console.error("[HyperMD] PowerPack fold-code-with-mermaid loaded, but mermaid not found.")
}
