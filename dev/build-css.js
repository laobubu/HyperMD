"use strict";

const path = require("path");
const fs = require("fs");
const glob = require("glob");
const sass = require("sass");
const CleanCSS = require("clean-css");
const CleanCSSOptions = {};

const cleanCSSWorker = new CleanCSS(CleanCSSOptions);

function scan_and_compile(pattern = "**/*.scss", watch = false) {
  glob(
    pattern,
    {
      ignore: "node_modules/**/*",
    },
    (err, matches) => {
      matches.forEach((filename) => {
        compile_sass(filename);

        if (watch) {
          // `watch` option is currently not supported by new SASS
          // https://github.com/sass/dart-sass/issues/264
          fs.watchFile(filename, () => {
            compile_sass(filename);
          });
        }
      });
    }
  );
}

function compile_sass(sourceFilename) {
  const now = new Date();
  const nowStr = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
  console.log("[SCSS] Compiling " + sourceFilename + " " + nowStr);
  var outputFilename = sourceFilename.replace(/\.s[ac]ss$/, ".css");
  var proc = sass.render(
    {
      file: sourceFilename,
      outFile: outputFilename,
    },
    function (err, result) {
      if (err) console.log(err);
      else {
        cleanCSSWorker.minify(result.css, (err, output) => {
          if (err) {
            console.log(err);
          } else {
            fs.writeFile(outputFilename, output.styles, function (err) {
              if (!err) {
                console.log("[SCSS] finished " + sourceFilename);
                if (exports.onChanged)
                  exports.onChanged(sourceFilename, outputFilename);
              }
            });
          }
        });
      }
    }
  );
}

if (require.main === module) {
  process.chdir(path.join(__dirname, ".."));
  const watch = process.argv.includes("-w");

  scan_and_compile("**/*.scss", watch);
}

var exports = {
  compile_sass,
  scan_and_compile,
  onChanged: null,
};

module.exports = exports;
