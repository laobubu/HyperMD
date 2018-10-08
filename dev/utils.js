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
  getRelativePath,
  npm_run,
}
