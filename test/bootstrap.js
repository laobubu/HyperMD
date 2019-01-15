// Provides essential functions.
// Only support Edge & Chrome & FireFox(58+)
//
// (Maybe you want to edit ./tests.js rather than this)
//

'use strict'

/** createElement */
function elt(tagName, attrs, text) {
  var el = document.createElement(tagName)
  if (attrs) for (var attr in attrs) el.setAttribute(attr, attrs[attr])
  if (text) el.textContent = text
  return el
}

/** Load JavaScript or CSS */
function getResource(url) {
  return new Promise(function (res, rej) {
    var el = null

    if (/\.js(\?.*)?$/.test(url)) {
      el = elt("script", { src: url })
    } else if (/\.css(\?.*)?$/.test(url)) {
      el = elt("link", { rel: "stylesheet", href: url })
    } else {
      return rej("Unsupported asset type")
    }

    el.addEventListener('load', res)
    el.addEventListener('error', rej)
    document.head.appendChild(el)
  })
}

/**
 * Load and configure RequireJS, then call `loaded`
 *
 * @param {string[]} modules
 * @param {function} loaded
 */
function boot_test(modules, loaded, opts) {
  var title = document.title
  document.title = "[Loading] " + title
  if (!opts) opts = {}

  var basepath = "" // base path to HyperMD project
  if ("basepath" in opts) {
    basepath = opts.basepath
  } else {
    basepath = location.href
    basepath = basepath.slice(0, basepath.indexOf('/test'))
  }

  var npm = basepath + "/node_modules/"
  if ("npm" in opts) npm = opts.npm

  return Promise.resolve()
    .then(() => getResource(basepath + "/demo/vendor/require.js"))
    .then(() => getResource(basepath + "/demo/requirejs_packages.js"))
    .then(() => getResource(basepath + "/goods/patch-requirejs.js"))
    .then(() => configureRequireJS())
    .then(() => invokeCallback())

  function configureRequireJS() {
    requirejs.config({
      baseUrl: npm,

      paths: {
        "hypermd": basepath,
        "hypermd_test": basepath + "/test/js",
      },

      // Remove `packages` if you occur errors with CDN
      packages: requirejs_packages, // see /demo/requirejs_packages.js
      waitSeconds: 15
    })
  }

  function invokeCallback() {
    require(
      modules,
      function () {
        document.title = title
        loaded.apply(this, arguments)
      },
      function (err) {
        var ul = elt("ul", { style: "color: red;" })
        var mods = err.requireModules
        for (var i = 0; i < mods.length; i++) {
          var li = document.createElement("li")
          li.textContent = mods[i]
          ul.appendChild(li)
        }

        document.title = "[FAILED] " + title
        document.body.appendChild(elt("p", { style: "color: red; font-weight: 800;" }, "Some modules are not loaded..."))
        document.body.appendChild(ul)
      }
    )
  }
}

function tryRun(fn) {
  if (typeof (fn) !== "function") return
  fn.apply(this, Array.prototype.slice(arguments, 1))
}
