// this script runs when `npm run build` finished

const path = require('path')
const child_process = require('child_process')
const fs = require('fs')
const glob = require('glob')
const config = require('./HyperMD.config.js')
const utils = require('./utils')

process.chdir(path.join(__dirname, ".."))

//--------------------------------------------------------------
// Make TypeScript-built files work in plain browser environment

function patchUMD(file) {
  utils.processTextFile(file, (data) => {
    const doneMark = `//[HyperMD] UMD for plain environment!`
    if (data.includes(doneMark)) return

    var tmp = data.match(/define\((\[.+?\]),\s*(\w+)/)
    if (!tmp) return

    var factoryFnName = tmp[2]
    var modules = JSON.parse(tmp[1]).slice(2) // skip require and exports

    var requireBody = []  // [ 'if (m === "../addon/fold") return HyperMD.Fold' ]
    var exportAs = "{}"  // "(HyperMD.ModuleX = HyperMD.ModuleX || {})"

    { // build lut_json
      let lut = {}
      for (const mod of modules) {
        let globalName = config.getGlobalName(mod, file)
        if (globalName) requireBody.push(`if (m === ${JSON.stringify(mod)}) return ${globalName};`)
      }
    }

    { // build exportAs
      let fileModName = file.replace(/\.[jt]s$|^\.[\/\\]/ig, '').replace(/\\/g, '/')
      let tmp2 = config.components[fileModName]
      if (tmp2) {
        tmp2 = "HyperMD." + tmp2
        exportAs = `(${tmp2} = ${tmp2} || {})`
      }
    }

    var insertTo = data.indexOf('}', tmp.index + tmp[0].length) + 1
    var inserted = ` else {
      ${factoryFnName}(function(m){
        ${requireBody.join("\n        ")}
        return null;
      }, ${exportAs});
    }`

    data = data.slice(0, insertTo) + inserted + data.slice(insertTo)
    return data
  })
}

config.plainEnvFiles.forEach(pattern =>
  glob(pattern, (err, matches) => {
    if (err) return; else matches.forEach(patchUMD)
  }))
