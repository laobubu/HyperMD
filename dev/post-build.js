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

utils.processTextFile("everything.d.ts", (text) => {
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
 * **tsc** built AMD modules, let's do a post-process and convert them to UMD modules
 *
 * This doesn't matter while developing (compatible with require.js)
 *
 * @param {string} file "addon/foobar.js", will be overwritten
 */
function patchUMD(file) {
  utils.processTextFile(file, (data) => {
    const doneMark = `//[HyperMD] UMD patched!`
    if (data.includes(doneMark)) return;

    var tmp = data.match(/\bdefine\((\[.+?\]),\s*/)
    if (!tmp) return;

    // data format:
    //
    // ... LEADING COMMENTS ...
    // define(["require", "exports", "module1", "module2", "module3"], function (require, exports, foo, bar, baz) {
    //    ... MAIN CODE ...
    // });

    var data_head = data.slice(0, tmp.index)  // comments before define([
    var data_tail = data.slice(tmp.index + tmp[0].length)  // function(require, exports, xxx) { ... });
    var actualRefCount = data_tail.slice(0, data_tail.indexOf(')')).split(',').length - 2 // (argument count of mod function) - 2

    { // dynamic require is forbidden
      if (data_tail.indexOf('require(') !== -1) throw new Error("[HyperMD] require('xxx') is not allowed in " + file)
    }

    /** @type {string[]} */
    var modules = JSON.parse(tmp[1]).slice(2) // "require" and "exports" are excluded
    var exportsAlias = "" // "HyperMD.FooBar"  global name in plain env
    var moduleGlobalNames = [] // ["CodeMirror", "MathJax", "HyperMD", "HyperMD.Fold"]  global names in plain env

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

    { // check bad references and build moduleGlobalNames
      for (let i = 0; i < modules.length; i++) {
        let mod = modules[i]
        if (mod == "require" || mod == "exports") throw new Error("WTF?");

        let tmp = /^(\.[\.\/]*\/)(core\/.+|everything)$/.exec(mod)
        if (tmp) {
          let corrected = tmp[1] + "core"
          console.warn(`[HyperMD][WARN] Please import "${corrected}" instead of "${mod}". Found in ${file}`)
          mod = modules[i] = corrected
        }

        if (i < actualRefCount) {
          let globalName = config.getGlobalName(mod, file)
          moduleGlobalNames.push(globalName || "null")

          if (!globalName)
            console.warn(`[HyperMD][WARN] Module "${mod}" is NOT accessible in plain browser env! Found in ${file}`)
        }
      }
    }

    var interopData = `
(function (mod){ ${doneMark}
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, ${modules.map(x => `require("${x}")`).join(", ")}) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(${ JSON.stringify(["require", "exports"].concat(modules))}, mod) :
  /*plain env*/ mod(null, ${exportsAlias}, ${moduleGlobalNames.slice(0, actualRefCount).join(", ")});
})(`

    data = data_head + interopData + data_tail

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
