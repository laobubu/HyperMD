// RequireJS doesn't read package.json
// Please, configure it before loading HyperMD:
//
// requirejs.config({
//   packages: [
//     { name: 'codemirror', main: 'lib/codemirror.js' },
//     { name: 'katex', main: 'dist/katex.min.js' },
//     /* ... and more  */
//   ]
// })
//

// (This configuration is just a example / reference. Feel free to modify it)

var requirejs_packages = [
  { name: "hypermd", main: "everything.js" },
  { name: "codemirror", main: "lib/codemirror.js" },
  { name: "mathjax", main: "MathJax.js" },
  { name: "katex", main: "dist/katex.min.js" },
  { name: "marked", main: "lib/marked.js" },
  { name: "turndown", main: "lib/turndown.browser.umd.js" },
  { name: "turndown-plugin-gfm", main: "dist/turndown-plugin-gfm.js" },
  { name: "emojione", main: "lib/js/emojione.min.js" },
  { name: "twemoji", main: "2/twemoji.amd.js" },
  { name: "flowchart.js", main: "release/flowchart.min.js" },
  { name: "Raphael", main: "raphael.min.js" }, // stupid
  { name: "raphael", main: "raphael.min.js" },
  // { name: 'mermaid', main: 'dist/mermaid.js' }, // mermaid AMD is buggy and unavaliable

  // 0xGG TEAM
  // ☝️ All above are relatives links to jsdeliver CDN. Check ./index.js for more information.
  { name: "yamljs", main: "dist/yaml.min.js" },
  { name: "plantumlEncoder", main: "dist/plantuml-encoder.min.js" }, // 👈  0xGG doesn't work
  { name: "markdown-it", main: "dist/markdown-it.min.js" },
  { name: "markdown-it-footnote", main: "dist/markdown-it-footnote.min.js" },
  { name: "markdown-it-emoji", main: "dist/markdown-it-emoji.min.js" },
  { name: "markdown-it-mark", main: "dist/markdown-it-mark.min.js" },
  { name: "markdown-it-ins", main: "dist/markdown-it-ins.min.js" },
  { name: "markdown-it-sub", main: "dist/markdown-it-sub.min.js" },
  { name: "markdown-it-sup", main: "dist/markdown-it-sup.min.js" },

  {
    name: "markdown-it-task-lists",
    main: "dist/markdown-it-task-lists.min.js",
  },
  // { name: "prismjs", main: "prism.min.js" }
  // I still don't know how to import
  { name: "react-dom", main: "umd/react-dom.production.min.js" },
  { name: "react", main: "umd/react.production.min.js" },

  // Vega
  // { name: "vega", main: "build/vega.min.js" } // <= vega AMD is not working
];
