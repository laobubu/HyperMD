'use strict'

const path = require('path')
const fs = require('fs')
const glob = require('glob')
const sass = require('sass')

function scan_and_compile(pattern = "**/*.scss", watch = false) {
  glob(pattern, {
    ignore: "node_modules/**/*"
  }, (err, matches) => {
    matches.forEach(filename => {
      compile_sass(filename)

      if (watch) {
        // `watch` option is currently not supported by new SASS
        // https://github.com/sass/dart-sass/issues/264
        fs.watchFile(filename, () => { compile_sass(filename) })
      }
    })
  })
}

function compile_sass(sourceFilename) {
  console.log("[SCSS] Compiling " + sourceFilename)
  var outputFilename = sourceFilename.replace(/\.s[ac]ss$/, ".css")
  var proc = sass.render({
    file: sourceFilename,
    outFile: outputFilename
  }, function (err, result) {
    if (err) console.log(err)
    else {
      fs.writeFile(outputFilename, result.css, function (err) {
        if (!err) {
          console.log("[SCSS] finished " + sourceFilename)
          if (exports.onChanged) exports.onChanged(sourceFilename, outputFilename)
        }
      });
    }
  })
}

if (require.main === module) {
  process.chdir(path.join(__dirname, ".."))
  const watch = process.argv.includes("-w")

  scan_and_compile("**/*.scss", watch)
}

var exports = {
  compile_sass,
  scan_and_compile,
  onChanged: null,
}

module.exports = exports
