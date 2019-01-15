/* INDEX */

var categories = {
  basic: { order: 0, name: "Basic", desc: "Basic examples for HyperMD" },
  mode: { order: 1, name: "Mode", desc: "HyperMD's Markdown mode is advanced" },
  powerpack: { order: 2, name: "PowerPack", desc: "Dance with 3rd Parties" },
  fun: { order: 0.5, name: "Misc & Fun", desc: "Some interesting usage" },
}

var tags = {
  plainenv: { name: "PlainEnv", desc: "Use HTML tags only. No module loader" },
  requirejs: { name: "RequireJS", desc: "in-browser module loader" },
  'fold-code': { name: "FoldCode", desc: "addon/fold-code" },
}

/** @type {{name:string,page:string,desc:string,cat:(keyof categories)[],tags:(keyof tags)[]}[]} */
var items = [
  {
    name: "Basic (with all-in-one build)",
    page: "ai1",
    cat: ["basic"],
    tags: ["plainenv"],
    desc: "In plain browser env, use <script> <link> tags, to include HyperMD",
  },
  {
    name: "Basic (with RequireJS)",
    page: "basic-requirejs",
    cat: ["basic"],
    tags: ["requirejs"],
    desc: "Load HyperMD with RequireJS the module loader",
  },
  {
    name: "Convert existing CodeMirror editor",
    page: "convert-cm",
    cat: ["basic"],
    tags: ["plainenv"],
    desc: "It's ridiculously easy to turn existing CodeMirror editor into HyperMD"
  },

  {
    name: "Hashtag",
    page: "hashtag",
    cat: ["mode"],
    tags: [],
    desc: "HyperMD supports #hashtag in Markdown",
  },

  {
    name: "Flowchart",
    page: "flowchart",
    cat: ["powerpack"],
    tags: ["fold-code"],
    desc: "With flowchart.js, you can turn code blocks into flowcharts",
  },
  {
    name: "Lots of Diagrams (mermaid)",
    page: "mermaid",
    cat: ["powerpack"],
    tags: ["fold-code"],
    desc: "With mermaid, you can draw sequence diagram, gantt diagram, flowchart, with a easy script language",
  },

  {
    name: "Custom Emoji + Emoji AutoComplete",
    page: "custom-emoji",
    cat: ["fun"],
    tags: [],
    desc: "AutoComplete can work with emojis. And, yes, you can define your own emojis, like :doge:",
  },
]
