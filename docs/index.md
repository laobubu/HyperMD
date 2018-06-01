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

First of all, run `npm i hypermd codemirror`, then let's make a simpliest `index.html`.

```html
<html>
  <head>
    <title>My Awesome Webpage</title>
  </head>
  <body>
    <textarea id="myTextarea"></textarea>

    <!-- NOTE: CSS must be loaded BEFORE JS ! -->
    <link rel="stylesheet" href="index.css">
    <script src="index.js"></script>
  </body>
</html>
```

Adding 4 lines into `index.css`:

```css
@import "codemirror/lib/codemirror.css";
@import "codemirror/addon/fold/foldgutter.css";
@import "hypermd/mode/hypermd.css";
@import "hypermd/theme/hypermd-light.css";
```

And 4 lines into `index.js`:

```js
// require other 3rd-party libraries here
var HyperMD = require("hypermd")
var myTextarea = document.getElementById("myTextarea")
var cm = HyperMD.fromTextArea(myTextarea, { /* optional editor options here */ })
```

Let's say you are using [parcel-bundler](https://parceljs.org/), simpily run `parcel index.html` and voila!

> **some CodeMirror features will be unavaliable** unless you load them.
>
> Features that provided by CodeMirror built-in addons `codemirror/addon/*`, like folding, will be unavaliable.
> You may import them before initializing editor. The list can be found [here](../demo/index.js).

> ***mode-loader* will be unavaliable**
>
> Bundlers use closures, making CodeMirror invisible to global. You may expose `CodeMirror` to global and set editor option `hmdLoadModeFrom` to something like `"https://cdn.jsdelivr.net/npm/codemirror/"`.
>
> Or you can just bundle and pre-load all modes you need, which might make the js build larger.

### with [RequireJS](http://requirejs.org/) the module loader

1. Read [this](../demo/index.js)

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
    // HyperMD doesn't need this, unless you use all-in-one build
  ],
  waitSeconds: 15
})

// 2. Declare your main module

require([
  'codemirror/lib/codemirror',
  'hypermd/core',

  // ESSENTIAL
  'hypermd/mode/hypermd',

  // Enable these components:
  'hypermd/addon/hide-token',
  'hypermd/addon/cursor-debounce',
  'hypermd/addon/fold',
  'hypermd/addon/fold-math',
  'hypermd/addon/read-link',
  'hypermd/addon/click',
  'hypermd/addon/hover',
  'hypermd/addon/paste',
  'hypermd/addon/insert-file',
  'hypermd/addon/mode-loader',
  'hypermd/addon/table-align',
  'hypermd/keymap/hypermd',

  // Use PowerPack to power-up HyperMD, with third-party libraries
  // see deom/index.js

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
