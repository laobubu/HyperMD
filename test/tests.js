/// <reference path="bootstrap.js" />

// --------------------------------------------------------------
// Declare all testCases
var caseNames = [
  'addon/fold-code',
  'mode/basic',
  'mode/hashtag',
  'powerpack/fold-code-with-flowchart',
]

// --------------------------------------------------------------
// Remove unused testCases

// extract ?cases=foo/*,bar/baz from location
var tmp = /[?&]cases=([^&]+)/.exec(location.search)
if (tmp) {
  let regexps = decodeURIComponent(tmp[1]).split(",").map((s) => {
    s = s.replace(/\*/g, '.*').replace(/\?/g, '.')
    return new RegExp('^' + s + '$')
  })
  caseNames = caseNames.filter(name => regexps.some(regexp => regexp.test(name)))
}

// --------------------------------------------------------------
// Load and Run testcases

var basic_mods = [
  'hypermd_test/tester',
  'hypermd_test/dummy-editor',
]
var require_mods = caseNames.map(function (x) { return "hypermd_test/" + x })

boot_test(
  basic_mods.concat(require_mods),
  function (tester, dummyEditor) {
    var modules = Array.prototype.slice.call(arguments, basic_mods.length)
    var oldTitle = document.title
    var idx = 0

    if (caseNames.length > 0) {
      dummyEditor.parent = document.body;
      runNext();
    } else {
      document.title = "[FAILED] " + oldTitle
      document.body.appendChild(elt("p", { style: 'color:red' }, "No case selected. Add ?cases=*/* to the URL"))
    }

    function runNext() {
      var modName = caseNames[idx]
      var test = modules[idx].test

      test.run((test, task_s, test_s) => {
        if (!task_s.success) {
          document.getElementById("progress-bar").classList.add("failed")
          document.body.appendChild(tester.renderResult(task_s))
        }

        var percent = Math.round((test_s.success + test_s.fail) / test_s.count * 100) + '%'
        document.getElementById("running-name").textContent = task_s.name
        document.getElementById("progress-fill").style.width = percent
        document.getElementById("progress-percent").textContent = percent
      }).then((result) => {
        console.log(`Ran case ${modName} S/F/C ${result.success}/${result.fail}/${result.count}`)

        if (result.fail) {
          // stop at current case
          document.title = "[FAILED] " + oldTitle
        } else {
          if (++idx < caseNames.length) {
            runNext()
          } else {
            // all cases pass!
            document.title = "[SUCCESS] " + oldTitle
          }
        }
      })
    }
  }
)
