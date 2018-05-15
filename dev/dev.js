'use strict'

/*
  This script will:
  - Compile *.scss files
  - (if --dev is provided) open dev server and watch scss/js files
 */

const path = require('path')
const express = require('express')
const child_process = require('child_process')
const fs = require('fs')
const glob = require('glob')
const sass = require('sass')

process.chdir(path.join(__dirname, ".."))

const openDevServer = process.argv.includes("--dev")

glob("**/*.scss", {
  ignore: "node_modules/"
}, (err, matches) => {
  matches.forEach(filename => {
    compile_sass(filename)

    if (openDevServer) {
      // `watch` option is currently not supported by new SASS
      // https://github.com/sass/dart-sass/issues/264
      fs.watchFile(filename, () => { compile_sass(filename) })
    }
  })
})

if (openDevServer) {
  const app = express()
  app.use(express.static(process.cwd()))
  app.listen(8000, () => console.log('[HyperMD] http://127.0.0.1:8000 is now ready'))

  npm_run("watch_js")
}

function npm_run(command) {
  var platform_suffix = process.platform === "win32" ? ".cmd" : ""

  var proc = child_process.spawn(`npm${platform_suffix}`, ["run", command])
  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)

  return proc
}

function compile_sass(sourceFilename) {
  console.log("[SCSS] Compiling " + sourceFilename)
  var proc = sass.render({
    file: sourceFilename,
    outFile: sourceFilename.replace(/\.s[ac]ss$/, ".css")
  }, function (err, result) {
    if (err) console.log(err)
  })
}
