// this script runs when `npm run build` finished

const path = require('path')
const child_process = require('child_process')
const fs = require('fs')
const glob = require('glob')
const config = require('./HyperMD.config.js')
const utils = require('./utils')

process.chdir(path.join(__dirname, ".."))

//--------------------------------------------------------------
// Add "export as namespace HyperMD;" mark

utils.processTextFile("ai1.d.ts", (text) => {
  const mark = "\nexport as namespace HyperMD;\n"
  if (text.includes(mark)) return

  return text + mark
})

//--------------------------------------------------------------
// Fix rollup-js path problem
// "./src/theme/xxx.css"  =>  "./theme/xxx.css"

config.bundleFiles.forEach(item => {
  utils.processTextFile(item.output, (text) => {
    text = text.replace(/(\/)src\/([^"']+?\.css["'])/g, '$1$2')
    return text
  })
})

//--------------------------------------------------------------
// Make TypeScript-built files work in plain browser environment

/**
 * **tsc** may compile files to UMD modules.
 * However, TypeScript's UMD declaration is not compatible with plain browser env nor some bundler (like parcel-bunder)
 * and we shall do a post-process here.
 *
 * This doesn't matter while developing (compatible with require.js)
 *
 * @param {string} file "addon/foobar.js", will be overwritten
 */
function patchUMD(file) {
  utils.processTextFile(file, (data) => {
    const doneMark = `//[HyperMD] UMD for plain environment!`
    if (data.includes(doneMark)) return

    var tmp = data.match(/define\((\[.+?\]),\s*(\w+)/)
    if (!tmp) return

    var factoryFnName = tmp[2]
    var modules = JSON.parse(tmp[1]).slice(2) // skip require and exports

    var requiredModules = [] // ["codemirror", "../addon/xxx"]
    var lutBody = []  // [ 'if (m === "../addon/fold") return HyperMD.Fold' ]
    var exportsAlias = "{}"  // "(HyperMD.ModuleX = HyperMD.ModuleX || {})"

    { // build lut and requiredModules
      let lut = {}
      for (const mod of modules) {
        if (mod == "require" || mod == "exports") continue;
        if (mod in lut) continue;
        let globalName = lut[mod] = config.getGlobalName(mod, file)
        requiredModules.push(mod)
        if (globalName) lutBody.push(`if (m === ${JSON.stringify(mod)}) return ${globalName};`)
      }
    }

    { // decide exportsAlias
      let fileModName = file.replace(/\.[jt]s$|^\.[\/\\]/ig, '').replace(/\\/g, '/')
      let tmp2 = config.components[fileModName]
      if (tmp2) {
        tmp2 = "HyperMD." + tmp2
        exportsAlias = `(${tmp2} = ${tmp2} || {})`
      }
    }

    // pbe = plain browser env
    var pbeInsertPos = data.indexOf('}', tmp.index + tmp[0].length) + 1
    var pbeInsert = `
    else { ${doneMark}
      ${factoryFnName}(function (m){
        ${lutBody.join("\n        ")}
      }, ${exportsAlias});
    }`

    // add explicit require("")-s before factory(require, exports)
    var textBeforePBE = data.slice(0, pbeInsertPos)
    var reqInsertPos = textBeforePBE.lastIndexOf(factoryFnName, tmp.index)
    reqInsertPos = textBeforePBE.lastIndexOf("{", reqInsertPos) + 1 // pos after "{"
    var reqInsert = requiredModules.map(x => `\n        require(${JSON.stringify(x)});`).join("")

    textBeforePBE = textBeforePBE.slice(0, reqInsertPos) + reqInsert + textBeforePBE.slice(reqInsertPos)

    data = textBeforePBE + pbeInsert + data.slice(pbeInsertPos)

    return data
  })
}

config.plainEnvFiles.forEach(pattern =>
  glob(pattern, (err, matches) => {
    if (err) return; else matches.forEach(patchUMD)
  }))
