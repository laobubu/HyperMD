/// <reference path="bootstrap.js" />

// --------------------------------------------------------------
// Declare all testCases
var caseNames = [
  'mode/hashtag',
]

// --------------------------------------------------------------
// Remove unused testCases

// --------------------------------------------------------------
// Load and Run testcases

var basic_mods = ['hypermd_test/tester']
var require_mods = caseNames.map(function (x) { return "hypermd_test/" + x })

boot_test(
  basic_mods.concat(require_mods),
  function (tester) {
    var modules = Array.prototype.slice.call(arguments, basic_mods.length)

    for (var idx = 0; idx < caseNames.length; idx++) {
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
        var oldTitle = document.title
        if (result.fail) document.title = "[FAILED] " + oldTitle
        else document.title = "[SUCCESS] " + oldTitle
      })
    }
  }
)
