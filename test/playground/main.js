'use strict'

///<reference path="./utils.js" />

requirejs.config({
  baseUrl: "/node_modules",
  paths: { hypermd: "/." },
  packages: [
    { name: "hypermd", main: "ai1.js" },
    { name: "codemirror", main: "lib/codemirror.js" },
  ]
})

require(
  [
    'hypermd'
  ],

  function (hypermd_0) {
    HyperMD = hypermd_0

    var textarea = document.getElementById('my-textarea')
    editor = HyperMD.fromTextArea(textarea, {
      theme: args.theme,
    })

    fetch_text(args.file).then(text => editor.setValue(text))
  }
)
