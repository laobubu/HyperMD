const path = require('path')
const express = require('express')
const child_process = require('child_process')
const fs = require('fs')
const glob = require('glob')
const opn = require('opn')
const buildCSS = require('./build-css')

process.chdir(path.join(__dirname, ".."))

const app = express()
app.use(express.static(process.cwd()))
app.listen(8000, () => console.log('[HyperMD] http://127.0.0.1:8000 is now ready'))
opn('http://127.0.0.1:8000')

npm_run("watch_js")
buildCSS.scan_and_compile("**/*.scss", true)

function npm_run(command) {
  var platform_suffix = process.platform === "win32" ? ".cmd" : ""

  var proc = child_process.spawn(`npm${platform_suffix}`, ["run", command])
  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)

  return proc
}
