const path = require('path')
const utils = require('./utils')

process.chdir(path.join(__dirname, ".."));

[
  "build_js",
  "build_css",
  "build_doc",
].forEach(task => utils.npm_run(task));
