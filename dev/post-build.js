// this script runs when `npm run build_js` finished

const path = require('path')
const fs = require('fs')
const glob = require('glob')
const config = require('./HyperMD.config.js')
const utils = require('./utils')

process.chdir(path.join(__dirname, ".."))

//--------------------------------------------------------------
// Add "export as namespace HyperMD;" mark

utils.processTextFile("everything.d.ts", (text) => {
  const mark = "\nexport as namespace HyperMD;\n"
  if (text.includes(mark)) return

  return text + mark
})

//--------------------------------------------------------------
// Make TypeScript-built files work in plain browser environment

const srcPattern = "src/**/*.ts"
glob(srcPattern, (err, matches) => {
  if (err) {
    console.error("[HyperMD] Error while searching output files. Pattern = " + srcPattern)
    console.error(err)
    process.exit(2)
    return
  }

  for (var file of matches) {
    if (file.slice(-5) === '.d.ts') continue
    file = './' + file.slice(4, -3) + ".js"
    if (!fs.existsSync(file)) continue // file not emitted

    utils.patchUMD(file, pbeModuleResolver)
  }
})

function pbeModuleResolver(path) {
  const c = config.components[path]
  const cc = config.coreComponents[path]
  return (
    config.globalNames[path] ||
    (typeof c === 'string' && ('HyperMD.' + c)) ||
    (typeof cc === 'string' && ('HyperMD.Core.' + cc)) ||
    (path === './everything' && 'HyperMD') ||
    null
  )
}
