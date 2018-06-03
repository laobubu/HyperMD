const path = require('path')

/**
 * Components that will be bundled into index.js
 * For each component, you may specific a global name and expose it to global like `HyperMD.FooBar`
 */
exports.components = {
  "mode/hypermd": "Mode",
  // "addon/skeleton": "Skeleton",
  "addon/insert-file": "InsertFile",
  "addon/read-link": "ReadLink",
  "addon/hover": "Hover",
  "addon/click": "Click",
  "addon/paste": "Paste",
  "addon/fold": "Fold",
  "addon/fold-math": "FoldMath",
  "addon/table-align": "TableAlign",
  "addon/mode-loader": "ModeLoader",
  "addon/hide-token": "HideToken",
  "addon/cursor-debounce": "CursorDebounce",
  "keymap/hypermd": "KeyMap",
};

/**
 * If not using mode loader, try to get 3rd party libraries via these global names
 */
exports.globalNames = {
  codemirror: "CodeMirror",
  marked: "marked",
  katex: "katex",
  mathjax: "MathJax",
  turndown: "TurndownService",
}

exports.externalNames = Object.keys(exports.globalNames)

/**
 * Use bundler to process these file(s)
 */
exports.bundleFiles = [
  {
    entry: "src/ai1.ts",
    output: "ai1.js",
    name: "HyperMD",
    uglify: true,
  },
  {
    // not necessary but maybe you just want the core utils?
    entry: "src/core.ts",
    output: "core.js",
    name: "HyperMD",
  },
]

/**
 * **tsc** may compile files to UMD modules.
 * However, TypeScript's UMD declaration is not compatible with plain browser env nor some bundler (like parcel-bunder)
 * and we shall do a post-process in `post-build.js`
 *
 * This doesn't matter while developing (compatible with require.js)
 */
exports.plainEnvFiles = [
  "powerpack/*.js",
  "addon/*.js",
]

/**
 * Get modules' object name in plain browser env
 *
 * @example
 *     getGlobalName("codemirror", "src/addon/foobar") // => "CodeMirror"
 *     getGlobalName("./fold", "src/addon/foobar") // => "HyperMD.Fold", see `components`
 *     getGlobalName("../core", "src/addon/foobar") // => "HyperMD"
 * @param {string} moduleID
 * @param {string} currentFile relative to rootdir of this project
 */
exports.getGlobalName = function getGlobalName(moduleID, currentFile) {
  if (!moduleID) return moduleID
  if (moduleID.charAt(0) !== ".") return exports.globalNames[moduleID] || null

  var components = exports.components
  var mpath = path.normalize(path.join(path.dirname(currentFile), moduleID)).replace(/\\/g, '/').replace(/^\.\//, '')

  var ans = components[mpath]

  if (ans) return "HyperMD." + ans
  else if (/^core(\/.+)?$/.test(mpath)) return "HyperMD"
  else {
    if (!/\.css$/.test(mpath)) {
      console.warn(`[HyperMD] file ${currentFile} requires non-exported "${mpath}".`)
    }
    return null
  }
}
