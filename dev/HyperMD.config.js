const path = require("path");
const nodeResolve = require("rollup-plugin-node-resolve");
const commonJS = require("rollup-plugin-commonjs");

/**
 * Components that will be bundled into ai1.js (all in one bundle)
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
  "addon/fold-image": "FoldImage",
  "addon/fold-link": "FoldLink",
  "addon/fold-widget": "FoldWidget",
  "addon/fold-code": "FoldCode",
  "addon/fold-box": "FoldBox",
  "addon/fold-math": "FoldMath",
  "addon/fold-emoji": "FoldEmoji",
  "addon/fold-html": "FoldHTML",
  "addon/table-align": "TableAlign",
  "addon/auto-complete": "AutoComplete",
  "addon/mode-loader": "ModeLoader",
  "addon/hide-token": "HideToken",
  "addon/cursor-debounce": "CursorDebounce",
  "keymap/hypermd": "KeyMap",

  // * 👇 0xGG team
  // ** Fold
  "powerpack/fold-code-with-plantuml": "FoldCodeWithPlantUML",
  "powerpack/fold-code-with-echarts": "FoldCodeWithEcharts",
  "powerpack/fold-code-with-mermaid": "FoldCodeWithMermaid",
  "powerpack/fold-code-with-wavedrom": "FoldCodeWithWavedrom",
  "powerpack/fold-code-with-vega": "FoldCodeWithVega",
  "powerpack/fold-code-with-vega-lite": "FoldCodeWithVegaLite",
  // ** Widget
  "addon/fold-widget": "FoldWidget",
  "widget/index": "Widget",
  "widget/component/widget": "WidgetComponent",
  "widget/hello/hello": "HelloWidget",
  "widget/box/box": "BoxWidget",
  // ** Attribute
  "addon/attributes/index": "AttributesAddon",
  "addon/attributes/normalize": "AttributesNormalize",
  "addon/attributes/parse": "AttributesParse",
  "addon/attributes/stringify": "AttributesStringify",
  // ** Block Info
  "addon/block-info/index": "BlockInfoAddon",
  "addon/block-info/normalize": "BlockInfoNormalize",
  "addon/block-info/parse": "BlockInfoParse",
  // ** Preview
  "preview/index": "Preview",
  "preview/custom-subjects": "PreviewCustomSubjects",
  "preview/heading-id-generator": "PreviewHeadingIDGenerator",
  "preview/transform": "PreviewTransform",
  "preview/slide": "PreviewSlide",
  "preview/features/math": "PreviewFeatureMath",
  "preview/features/tag": "PreviewFeatureTag",
  "preview/features/widget": "PreviewFeatureWidget",
  "preview/features/fence": "PreviewFeatureFence",
  "preview/features/wikilink": "PreviewFeatureWikiLink",
  // ** Theme
  "theme/index": "Theme",
  // ** Emoji
  "addon/emoji/index": "Emoji",
};

/**
 * These files are also parts of HyperMD, but not included in all-in-one bundle.
 *
 * Support minimatch pattern syntax
 */
exports.dummyComponents = ["addon/skeleton", "powerpack/*", "widget/*"];

/**
 * If not using mode loader, try to get 3rd party libraries via these global names
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

  // 0xGG Team
  yamljs: "YAML",
  "markdown-it": "MarkdownIt",
  "markdown-it-footnote": "MarkdownItFootnote",
  "markdown-it-emoji": "MarkdownItEmoji",
  "markdown-it-task-lists": "MarkdownItTaskLists",
  "markdown-it-mark": "MarkdownItMark",
  "markdown-it-ins": "MarkdownItIns",
  "markdown-it-sub": "MarkdownItSub",
  "markdown-it-sup": "MarkdownItSup",
  react: "React",
  "react-dom": "ReactDOM",
  vega: "vega",
  "vega-embed": "vegaEmbed",
  // prismjs: "Prism"
};

exports.externalNames = Object.keys(exports.globalNames);

/**
 * Use RollUp Bundler to make these file(s)
 */
exports.bundleFiles = [
  {
    entry: "src/everything.ts",
    output: "ai1.js",
    name: "HyperMD",
    uglify: true,
    banner: [
      "//-----------------------------------------------//",
      "// !! This file is for Plain Browser Env ONLY !! //",
      "// !! Not Work With Bundlers                  !! //",
      "//-----------------------------------------------//",
    ].join("\n"),

    /*
    // 0xGG 👇 doesn't work
    plugins: [
      nodeResolve({
        jsNext: true
      }),
      commonJS({
        include: ["node_modules/**"]
      })
    ]
    */
  },
  {
    // not necessary but maybe you just want the core utils?
    entry: "src/core.ts",
    output: "core.js",
    name: "HyperMD",
  },
];

exports.banner = `
/*!
 * HyperMD, copyright (c) by laobubu
 * Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
 *
 * Break the Wall between writing and preview, in a Markdown Editor.
 *
 * HyperMD makes Markdown editor on web WYSIWYG, based on CodeMirror
 *
 * Homepage: http://laobubu.net/HyperMD/
 * Issues: https://github.com/laobubu/HyperMD/issues
 */
`.trim();

/**
 * Get modules' object name in plain browser env
 *
 * @example
 *     // two arguments:
 *     getGlobalName("codemirror", "src/addon/foobar") // => "CodeMirror"
 *     getGlobalName("./fold", "src/addon/foobar") // => "HyperMD.Fold", see `components`
 *     getGlobalName("../core", "src/addon/foobar") // => "HyperMD"
 *
 *     // one argument:
 *     getGlobalName("codemirror")   // => null
 *     getGlobalName("addon/fold")   // => "HyperMD.Fold"
 * @param {string} moduleID
 * @param {string} [currentFile] if is set, and `moduleID` is relative path, will try to resolve `moduleID`
 * @returns {string}
 */
exports.getGlobalName = function getGlobalName(moduleID, currentFile) {
  if (!moduleID) return moduleID;
  if (currentFile && moduleID.charAt(0) !== ".")
    return exports.globalNames[moduleID] || null;

  // get clean module name
  var cleanModuleID = moduleID;
  if (currentFile)
    cleanModuleID = path
      .normalize(path.join(path.dirname(currentFile), moduleID))
      .replace(/\\/g, "/")
      .replace(/^\.\//, "");

  var ans = exports.components[cleanModuleID];

  if (ans) return "HyperMD." + ans;
  if (/^core(\/.+)?$/.test(cleanModuleID)) return "HyperMD";
  if ("everything" === cleanModuleID) return "HyperMD";

  return null;
};
