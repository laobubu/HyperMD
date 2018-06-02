# HyperMD Documentation

![HyperMD Logo](../demo/logo.png)

[中文文档](./zh-CN/index.md)

> **Notice**
>
> All links are DIRECTLY clickable. Feel free to click without `Ctrl` or `Alt`!
> [Try out]

Still under construction... Consider:

1. Read [README](../README.md) if you use RequireJS
2. Read the source code of [this demo](./examples/ai1.html) if you prefer old-school HTML tags
3. Read the [source code](https://github.com/laobubu/HyperMD/) if you want to dive into HyperMD addons
   - VSCode is highly recommended.
   - Maybe someday the documentation will be generated with TypeScript.

## Quickstart

**Note**

1. **CSS must be loaded before initializing editor.**
2. If there are addons you don't need, you may disable them via *editor options*, see [Configurations](./configurations.md)
3. **Third-party libraries** must be loaded before hypermd.
4. Some libraries (like **MathJax**) require further configuration, see [Configurations](./configurations.md)

### with bundlers (webpack / parcel-bundler...)

First of all, run `npm install hypermd codemirror`
and `npm install katex marked` (or you may skip latter two libs and remove `powerpack` parts from the code)

Now, code time. Make a simple `index.html`

```html
<!DOCTYPE HTML>
<html>
  <head>
    <title>My Awesome Webpage</title>
  </head>
  <body>
    <textarea id="myTextarea"># Hello World</textarea>

    <script src="index.js"></script>
  </body>
</html>
```

And write several lines into `index.js`:

```js
var HyperMD = require("hypermd")
// some .css files will be implicitly imported by "hypermd"
// you may get the list with HyperMD Dependency Walker

require("hypermd/powerpack/fold-math-with-katex") // implicitly requires "katex"
require("hypermd/powerpack/hover-with-marked") // implicitly requires "marked"
// and other power packs...
// Power packs need 3rd-party libraries. Don't forget to install them!

var myTextarea = document.getElementById("myTextarea")
var cm = HyperMD.fromTextArea(myTextarea, {
  /* optional editor options here */
  hmdModeLoader: false, // see NOTEs below
})
```

Let's say you are using [parcel-bundler][], simpily run `parcel index.html` and voila!

[parcel-bundler]: https://parceljs.org/  Blazing fast, zero configuration web application bundler

> **You would need css-loader**
>
> HyperMD contains code like `require("xxx.css")`. Make sure you have [css-loader](https://github.com/webpack-contrib/css-loader) configured.
> Some bundlers might have already prepared it for you, like [parcel-bundler][].

> ***mode-loader* will be unavaliable**
>
> Bundlers use closures, making CodeMirror invisible to global. You may...
> Expose `CodeMirror` to global and set editor option `hmdModeLoader` to something like `"https://cdn.jsdelivr.net/npm/codemirror/"`.
> Or load language modes via `require("codemirror/mode/haskell/haskell")` before creating a editor.

### with [RequireJS](http://requirejs.org/) the module loader

First of all, *hypermd* requires CSS files in JavaScript,
and RequireJS doesn't support `require("./style.css")`.
Thus, **you have to load a [patch](../demo/patch-requirejs.js) before using RequireJS**

Besides, you might find [this demo script](../demo/index.js) helpful.

```js

// 1. Configure RequireJS

requirejs.config({
  // baseUrl: "/node_modules/",                  // using local version
  // baseUrl: "https://cdn.jsdelivr.net/npm/",   // or use CDN
  baseUrl: "/node_modules/",

  // (Remove this section if you occur errors with CDN)
  // RequireJS doesn't read package.json or detect entry file.
  packages: [
    { name: 'codemirror', main: 'lib/codemirror.js' },
    { name: 'mathjax', main: 'MathJax.js' },
    { name: 'katex', main: 'dist/katex.min.js' },
    { name: 'marked', main: 'lib/marked.js' },
    { name: 'turndown', main: 'lib/turndown.browser.umd.js' },
    { name: 'turndown-plugin-gfm', main: 'dist/turndown-plugin-gfm.js' },
  ],
  waitSeconds: 15
})

// 2. Declare your main module

require([
  'codemirror/lib/codemirror',
  'hypermd/ai1',

  // If you doesn't want ai1 (all in one) build, see demo/index.js

  // Then, use PowerPack to power-up HyperMD, with third-party libraries
  // The list can be found in documents, or demo/index.js
  'hypermd/powerpack/fold-math-with-katex',

  'hypermd/powerpack/paste-with-turndown',
  'turndown-plugin-gfm',

], function (CodeMirror, HyperMD) {
  var myTextarea = document.getElementById('myTextareaID')
  var editor = HyperMD.fromTextArea(myTextarea, {
    /* optional editor options here */
  })
})

```

### with plain HTML

Don't want to use either bundler or module loader? You can still load HyperMD in plain browser environment.

Please read the source code of [this demo](./examples/ai1.html)
