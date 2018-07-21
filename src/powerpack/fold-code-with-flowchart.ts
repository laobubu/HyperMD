// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-code"
//
// This module provides `FlowchartRenderer` for FoldCode addon
// so that you can render flowchart with [flowchart.js](http://flowchart.js.org/)
//
// By default the renderer is enabled. You may disable it by setting `hmdFoldCode.flowchart` to `false`
//
// **Example**: https://laobubu.net/HyperMD/docs/examples/flowchart.html
//
// :hint: to change flowchart.js configuration, use `editor.setOption("flowchart", { /* YOUR_CONFiG */ })`
//
// :warning: **flowchart.js bug**
//
// If you are using RequireJS, add `"Raphael": "raphael"` to its `paths` option like this:
//
// ```js
// requirejs.config({
//   // ...
//   paths: {
//     "Raphael": "raphael", // adapt flowchart.js bug
//   },
//   //...
// })
// ```

import * as CodeMirror from "codemirror"
import * as flowchart from "flowchart.js"
import { registerRenderer, CodeRenderer, getAddon as getFoldCode } from "../addon/fold-code"
import { getAddon as getFold } from "../addon/fold"

export const FlowchartRenderer: CodeRenderer = (code, info) => {
  var fc = flowchart.parse(code)
  if (Object.keys(fc.symbols).length === 0) return null

  var el = document.createElement('div')
  el.setAttribute('class', 'hmd-fold-code-image hmd-fold-code-flowchart')

  // tell Raphael the viewport width
  var tmpContainer = document.createElement('div')
  tmpContainer.setAttribute('style', 'position: absolute;left:0;top:0;width:' + info.editor.getScrollInfo().clientWidth + 'px;height:1px;overflow:hidden')
  document.body.appendChild(tmpContainer)
  tmpContainer.appendChild(el)

  fc.drawSVG(el, info.editor.getOption("flowchart"))

  setTimeout(() => {
    document.body.removeChild(tmpContainer)
  }, 100);

  info.onRemove = () => {
    fc.clean()
    fc = null
  }

  return el
}

if (typeof flowchart === "object") {
  CodeMirror.defineOption("flowchart", null, (cm: CodeMirror.Editor) => {
    getFoldCode(cm).clear("flowchart")
    getFold(cm).startFold()
  });

  registerRenderer({
    name: "flowchart",
    pattern: /^flow(?:charts?)?$/i,
    renderer: FlowchartRenderer,
    suggested: true,
  })
} else {
  console.error("[HyperMD] PowerPack fold-code-with-flowchart loaded, but flowchart not found.")
}
