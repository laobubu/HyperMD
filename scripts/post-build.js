// this script runs when `npm run build-js` finished

const path = require('path')
const fs = require('fs')
const glob = require('glob')
const config = require('./HyperMD.config.js')
const utils = require('./utils')

process.chdir(path.join(__dirname, ".."))

//--------------------------------------------------------------
// Add "export as namespace HyperMD;" mark (for plain browser env)

utils.processTextFile("everything.d.ts", (text) => {
  const mark = "\nexport as namespace HyperMD;\n"
  if (text.includes(mark)) return

  return text + mark
})


//--------------------------------------------------------------
// inactive ai1.js when CommonJS or AMD is presented

utils.processTextFile("ai1.js", (text) => {
  return text.replace(/(\){).+?(\w+\(\w+\.HyperMD=)/, (_, lead, tail) => {
    return lead +
      `(("object"==typeof exports&&"undefined"!=typeof module)||("function"==typeof define&&define.amd))?` +
      `console.error("Don't use HyperMD ai1.js with any Module Loaders!\\nPlease use everything.js, or load modules on demand."):` +
      tail
  })
})
