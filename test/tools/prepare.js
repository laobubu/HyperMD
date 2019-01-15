const path = require('path');
const fs = require('fs');
const glob = require('glob');

process.chdir(path.resolve(path.dirname(__filename), ".."));

Promise.all([
  updateCaseNames(),
]).then(() => {
  console.log("OK. You are ready to run tests.")
})



/** if err occurs, print it and exit process */
function perror(err) {
  if (!err) return;
  console.error(err);
  process.exit(1);
}

/** Update the caseNames in tests.js */
function updateCaseNames() {
  return new Promise(resolve => {
    fs.readFile("tests.js", "utf-8", (err, data) => {
      perror(err);

      var list = glob.sync("src/*/**/*.ts")
        .filter(fn => !/[\\\/]_/.test(fn)) // filter out files whose name starts with underscore
        .map(fn => fn.slice(4, -3)) // remove "src/" and ext name
        .sort()

      data = data.replace(/(caseNames\s*=\s*\[)[^\]]+\]/, (_, lead) => {
        return lead + "\n" + list.map(fn => `  '${fn}',\n`).join('') + "]";
      })

      fs.writeFile("tests.js", data, (err) => {
        perror(err);
        console.info(`Found ${list.length} cases.`)
        resolve();
      });
    })
  })
}
