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

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("flowchart.js"), require("../addon/fold-code"), require("../addon/fold")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","flowchart.js","../addon/fold-code","../addon/fold"], mod) :
  /*plain env*/ mod(null, (this.HyperMD_PowerPack = this.HyperMD_PowerPack || {}, this.HyperMD_PowerPack["fold-code-with-flowchart"] = {}), CodeMirror, flowchart, HyperMD.FoldCode, HyperMD.Fold);
})(function (require, exports, CodeMirror, flowchart, fold_code_1, fold_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FlowchartRenderer = function (code, info) {
        var fc = flowchart.parse(code);
        if (Object.keys(fc.symbols).length === 0)
            return null;
        var el = document.createElement('div');
        el.setAttribute('class', 'hmd-fold-code-image hmd-fold-code-flowchart');
        // tell Raphael the viewport width
        var tmpContainer = document.createElement('div');
        tmpContainer.setAttribute('style', 'position: absolute;left:0;top:0;width:' + info.editor.getScrollInfo().clientWidth + 'px;height:1px;overflow:hidden');
        document.body.appendChild(tmpContainer);
        tmpContainer.appendChild(el);
        fc.drawSVG(el, info.editor.getOption("flowchart"));
        setTimeout(function () {
            document.body.removeChild(tmpContainer);
        }, 100);
        info.onRemove = function () {
            fc.clean();
            fc = null;
        };
        return el;
    };
    if (typeof flowchart === "object") {
        CodeMirror.defineOption("flowchart", null, function (cm) {
            fold_code_1.getAddon(cm).clear("flowchart");
            fold_1.getAddon(cm).startFold();
        });
        fold_code_1.registerRenderer({
            name: "flowchart",
            pattern: /^flow(?:charts?)?$/i,
            renderer: exports.FlowchartRenderer,
            suggested: true,
        });
    }
    else {
        console.error("[HyperMD] PowerPack fold-code-with-flowchart loaded, but flowchart not found.");
    }
});
