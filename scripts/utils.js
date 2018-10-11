const fs = require('fs')
const path = require('path')
const child_process = require('child_process')

const platform_suffix = process.platform === "win32" ? ".cmd" : ""

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

function node_bin_run(execName, args) {
  const proc = child_process.spawn(
    path.resolve(__dirname, '../node_modules/.bin/' + execName + platform_suffix),
    args
  )
  process.stdin.pipe(proc.stdin)
  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)

  return proc
}

/**
 * @param {child_process.ChildProcess} proc
 * @returns {Promise<void>}
 */
function wait_for_process(proc) {
  return new Promise((res, rej) => {
    proc.on('exit', (code) => {
      if (code == 0) res()
      else rej(new Error(`Process exited with code ${code}`))
    })
    proc.on('error', (err) => {
      rej(err)
    })
  })
}

/**
 * @template T -- array item type
 * @param {T[]} array
 * @param {T} needle
 * @returns {boolean}
 */
function find_and_remove(array, needle) {
  let idx = array.indexOf(needle)
  if (idx === -1) return false
  array.splice(idx, 1)
  return true
}

module.exports = {
  processTextFile,
  getRelativePath,
  npm_run,
  node_bin_run,
  wait_for_process,
  find_and_remove,
}
