const path = require('path')
const fs = require('fs')

/**
 * Components (except core/*) that will be imported when a user imports HyperMD like this:
 *
 * `import * as HyperMD from "hypermd"`
 *
 * For each component, you may specific a global name,
 * which will be the only approach to access the module in plain browser env.
 * For example, global name `FooBar` will make your module accessible via `HyperMD.FooBar`
 *
 * The path of each component is relative to the `src` dir.
 *
 * - Don't define `./core/*` here -- unless it needs a good name
 * - Don't define `./goods/*` or `./powerpack/*` -- they shall be bundled into ai1.js
 *
 * @type {{ [path: string]: string }}
 */
exports.components = {
  // "./addon/skeleton": "Skeleton",  // <- example
  "./addon/insert-file": "InsertFile",
  "./addon/read-link": "ReadLink",
  "./addon/hover": "Hover",
  "./addon/click": "Click",
  "./addon/paste": "Paste",
  "./addon/fold": "Fold",
  "./addon/fold-image": "FoldImage",
  "./addon/fold-link": "FoldLink",
  "./addon/fold-code": "FoldCode",
  "./addon/fold-math": "FoldMath",
  "./addon/fold-emoji": "FoldEmoji",
  "./addon/fold-html": "FoldHTML",
  "./addon/table-align": "TableAlign",
  "./addon/mode-loader": "ModeLoader",
  "./addon/hide-token": "HideToken",
  "./addon/cursor-debounce": "CursorDebounce",

  "./mode/hypermd": "Mode",
  "./keymap/hypermd": "KeyMap",

  "./common": "__common__",
};

/**
 * third-party libraries in plain browser env
 *
 * @type {{ [modulePath: string]: string }}
 */
exports.globalNames = {
  codemirror: "CodeMirror",
  marked: "marked",
  katex: "katex",
  mathjax: "MathJax",
  turndown: "TurndownService",
  emojione: "emojione",
  twemoji: "twemoji",
  "flowchart.js": "flowchart",
  mermaid: "mermaid",
}

/**
 * Common Banner Comment
 */
exports.banner = `
/*!
 * HyperMD, copyright (c) by laobubu
 * Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
 *
 * Break the Wall between writing and preview, in a Markdown Editor.
 *
 * HyperMD turns your Markdown CodeMirror editor into WYSIWYG mode!
 *
 * Homepage: https://laobubu.net/HyperMD/
 * Issues: https://github.com/laobubu/HyperMD/issues
 */
`.trimLeft()

/**
 * Full of side-effects
 */
exports.ambientComponents = [
  "./core/polyfill",
]

/**
 * Core Components. in plain browser env, they are provided as `HyperMD.Core.xxx`
 */
var coreComponents = exports.coreComponents = {}

fs.readdirSync(__dirname + "/../src/core").forEach(name => {
  if (!/^\w.+\.ts$/.test(name)) return
  name = name.slice(0, -3)
  let relPath = './core/' + name
  if (exports.ambientComponents.includes(relPath)) return
  if (relPath in exports.components) return

  // turn "name-like-this" into "nameLikeThis", underscores are kept intact
  let camelName = name.replace(/-(\w)/g, (_, ch) => ch.toUpperCase())

  coreComponents[relPath] = camelName
});
