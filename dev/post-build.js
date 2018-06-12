// this script runs when `npm run build_js` finished

const path = require('path')
const fs = require('fs')
const glob = require('glob')
const minimatch = require('minimatch')
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
    var exportsAlias = null // "HyperMD.FooBar"  global name in plain env

    { // build lut and requiredModules
      let lut = {}
      for (const mod of modules) {
        if (mod == "require" || mod == "exports") continue;
        if (mod in lut) continue;
        let globalName = lut[mod] = config.getGlobalName(mod, file)
        requiredModules.push(mod)
        if (globalName) lutBody.push(`if (m === ${JSON.stringify(mod)}) return ${globalName};`)
        else if (mod[0] == '.' && !/\.css$/.test(mod)) {
          // "./not-exported/module"
          console.warn(`[HyperMD] "${file}" 's dependency "${mod}" is NOT accessible in plain browser env!`)
        }
      }
    }

    { // decide exportsAlias
      let fileModName = file.replace(/\.[jt]s$|^\.[\/\\]/ig, '').replace(/\\/g, '/') // => "addon/foobar"
      exportsAlias = config.getGlobalName(fileModName)

      if (!exportsAlias) {
        exportsAlias = "{}" // give a dist container anyway.
        if (!config.dummyComponents.some(x => minimatch(fileModName, x))) {
          console.warn("[HyperMD] Not defined item in HyperMD.config: " + fileModName)
        }

        if (/^powerpack\//.test(fileModName)) {
          let baseName = path.basename(fileModName)
          exportsAlias = `(this.HyperMD_PowerPack = this.HyperMD_PowerPack || {}, this.HyperMD_PowerPack["${baseName}"] = {})`
        }
      } else {
        exportsAlias = `(this.${exportsAlias} = this.${exportsAlias} || {})` // "(HyperMD.ModuleX = HyperMD.ModuleX || {})"
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

var tsconfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf-8"))
var bundleFileOutputs = config.bundleFiles.map(x => x.output)
var dst_dir = tsconfig.compilerOptions.outDir + "/"
if (dst_dir === "./") dst_dir = ""

tsconfig.include.forEach(pattern => {
  var tmp = pattern.indexOf('*')
  if (tmp < 0) tmp = pattern.lastIndexOf('/') + 1

  var src_dir = pattern.slice(0, tmp) // "src/"

  glob(pattern, (err, matches) => {
    if (err) {
      console.error("[HyperMD] Error while searching output files. Pattern = " + pattern)
      console.error(err)
      process.exit(2)
      return
    }

    for (var file of matches) {
      if (/\.d\.ts$/.test(file)) continue
      file = dst_dir + file.slice(src_dir.length, -3) + ".js"
      if (bundleFileOutputs.includes(file)) continue // not process rollup's output
      if (!fs.existsSync(file)) continue // file not emitted

      patchUMD(file)
    }
  })
})
