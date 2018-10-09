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
