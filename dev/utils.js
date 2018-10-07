const fs = require('fs')
const path = require('path')
const child_process = require('child_process')

/**
 *
 * @param {string} srcFile
 * @param {(text:string)=>string} procFunc may return non-string to avoid writing
 * @param {string} dstFile if not set, same as srcFile
 */
function processTextFile(srcFile, procFunc, dstFile = null) {
  dstFile = dstFile || srcFile

  fs.readFile(srcFile, "utf-8", (err, data) => {
    if (err) {
      console.error(`[!] Failed to read ${srcFile}`)
      console.error(err)
    }

    data = procFunc(data)
    if (typeof (data) !== "string") return

    fs.writeFile(dstFile, data, (err) => {
      if (err) {
        console.error(`[!] Failed to write ${dstFile}`)
        console.error(err)
      }
    })
  })
}

/**
 *
 * @param {string} name something like
 * - HyperMD
 * - HyperMD.Foobar
 * - HyperMD.ABC.DEF
 * - `XXX["yyy"]`     **(Don't use `.` inside the name!)**
 * - `XXX.YYY["ZZZ"].BAR`
 *
 * @returns valid js expression. eg:
 *
 * `HyperMD.HAX` => `(this.HyperMD = this.HyperMD || {}, this.HyperMD.HAX = this.HyperMD.HAX || {})`
 */
function umdGetPlainEnvExports(name, prefix = "this") {
  if (!name) return '({})'

  var parts = name.replace(/['"]\]/g, '').split(/\.|\[['"]/g)
  // (this.HyperMD_PowerPack = this.HyperMD_PowerPack || {}, this.HyperMD_PowerPack["fold-math-with-katex"] = {})

  var ans = []

  for (const part of parts) {
    if (/^[a-zA-Z_]\w*$/.test(part)) prefix += "." + part
    else prefix += `["${part}"]`

    ans.push(`${prefix} = ${prefix} || {}`)
  }

  return `(${ans.join(", ")})`
}

/**
 * Get relative path. Answer
 * @param {string} filename
 * @param {string} baseDir
 * @returns relPath always uses `/` (UNIX style path separator), and starts with `./` or `../`
 */
function getRelativePath(filename, baseDir) {
  let dir = path.dirname(filename)
  let relDir = path.relative(baseDir, dir).replace(/\\/g, '/')
  if (relDir.charAt(0) !== '.') relDir = './' + relDir
  if (relDir.slice(-1) !== '/') relDir += '/'
  return relDir + path.basename(filename)
}

/**
 * **tsc** built AMD modules, let's do a post-process and convert them to UMD modules
 *
 * This doesn't matter while developing (tsc original outputs are compatible with require.js)
 *
 * @param {string} file js filename like "addon/foobar.js", will be overwritten
 *
 * @param {(file: string)=>string} parseName A function to determine a module's global name in Plain Env.
 *
 * The function accepts one string parameter `file`, then return a string `moduleName`
 *
 * If the 1st char of `file` is NOT ".", this is a node_module.
 * otherwise, `file` is a relative path to files under your project.
 *
 * Example:
 *
 * - `"./index.js"` => `"HyperMD_PowerPack['fold-math-with-katex']"`
 * - `"hypermd"` => `"HyperMD"`
 * - `"codemirror"` => `"CodeMirror"`
 *
 * @param {(path: string)=>string|null} parseName a function to retrive global variable name of a module.
 *   examples:
 *   - `parseName("jquery") === '$'`
 *   - `parseName("codemirror") === 'CodeMirror'`
 *   - `parseName("unknown_module") === null`
 *   - `parseName("./foobar") === 'HyperMD.FooBar'` -- path is relative to baseDir
 *   - `parseName("./addon/current_module") === null` -- current_module is not exposured in global
 * @param {string} [baseDir] optional. if not set, use `process.cwd()`
 */
function patchUMD(file, parseName, baseDir) {
  if (!baseDir) baseDir = process.cwd()
  var current_module_dir = path.dirname(file)

  return processTextFile(file, (data) => {
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
    var exportsAlias = "({})" // "HyperMD.FooBar"  global name in plain env
    var moduleGlobalNames = [] // ["CodeMirror", "MathJax", "HyperMD", "HyperMD.Fold"]  global names in plain env

    { // check bad references and build moduleGlobalNames
      moduleGlobalNames = modules.slice(0, actualRefCount).map(modulePath => {
        if (modulePath.charAt(0) === '.') {
          // if module is under project dir, make it relative to baseDir
          let moduleFullPath = path.resolve(current_module_dir, modulePath)
          modulePath = getRelativePath(moduleFullPath, baseDir)
        }
        var parsedName = parseName(modulePath)
        if (!parsedName) throw new Error(`Module "${modulePath}" of "${baseDir}" is not accessible in plain browser env.`)
        return parsedName
      })

      // decide this module's global variable name
      tmp = data_head.match(/\/\*\* @export as (\S+)/)
      exportsAlias = umdGetPlainEnvExports(
        tmp ? tmp[1] : parseName(getRelativePath(file, baseDir))
      )
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

function npm_run(command) {
  var platform_suffix = process.platform === "win32" ? ".cmd" : ""

  var proc = child_process.spawn(`npm${platform_suffix}`, ["run", command])
  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)
  proc.on('exit', (code) => {
    if (code) {
      console.error(`npm run ${command}: exit code ${code}`)
      process.exit(code)
    }
  })

  return proc
}

module.exports = {
  processTextFile,
  umdGetPlainEnvExports,
  getRelativePath,
  patchUMD,
  npm_run,
}
