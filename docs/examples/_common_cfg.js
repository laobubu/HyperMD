// This file configures RequireJS for most demos
// also provides some useful utils

/////////////////////////////////////////////////////////////
/// PLEASE READ basic-requirejs.html                      ///
/////////////////////////////////////////////////////////////

requirejs.config({
  // baseUrl: "node_modules/",                   // using local version
  baseUrl: "https://cdn.jsdelivr.net/npm/",   // or use CDN

  // Remove this, if you are using HyperMD outside "HyperMD" online demo site
  paths: {
    "hypermd": location.href.substr(0, location.href.indexOf('docs/examples/')) + ".",
    "Raphael": "raphael", // flowchart.js bug
  },

  // Remove this, if you occur errors with CDN
  packages: requirejs_packages, // see: ../../demo/requirejs_packages.js

  // You may add more RequireJS config
  waitSeconds: 30
})
