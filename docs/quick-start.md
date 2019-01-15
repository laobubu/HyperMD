# Quick Start

**Note**

1. **CSS will be require-d by HyperMD core lib**
2. If there are addons you don't need, you may disable them via *editor options*, see [Options-For-Addons][]
3. If you want to utilize **third-party libraries**, use [PowerPacks][]; HyperMD only requires CodeMirror



## with bundlers (webpack / parcel-bundler...)

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

// Load these modes if you want highlighting ...
require("codemirror/mode/htmlmixed/htmlmixed") // for embedded HTML
require("codemirror/mode/stex/stex") // for Math TeX Formular
require("codemirror/mode/yaml/yaml") // for Front Matters

// Load PowerPacks if you want to utilize 3rd-party libs
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
If you are using **webpack**, make sure it's correctly configured(see below).

> ***mode-loader* will be unavaliable**
>
> Bundlers use closures, making CodeMirror invisible to global. You may...
> Expose `CodeMirror` to global and set editor option `hmdModeLoader` to something like `"https://cdn.jsdelivr.net/npm/codemirror/"`.
> Or load language modes via `require("codemirror/mode/haskell/haskell")` before creating a editor.


### Notice for `webpack` users!

HyperMD contains code like `require("xxx.css")` in order to import styles.
Make sure you have these loader:

` npm install -D  css-loader  style-loader  url-loader `

Then, make sure your webpack config file looks like this:

```js
// webpack.config.js
module.exports = {

  /* ... other webpack config ... */

  module: {
    rules: [
      {
        test: /\.(png|jpg|gif|ttf|eot|woff|woff2)$/i,
        use: [
          {
            loader: 'url-loader',
            options: { limit: 8192 }
          }
        ]
      },
      {
        test: /\.css$/,
        use: [
          { loader: "style-loader" },
          { loader: "css-loader" }
        ]
      },
      /* ... your other loader ... */
    ]
  }
}
```



## with [RequireJS](http://requirejs.org/) the module loader

[**🙋 Example Here**](./examples/basic-requirejs.html)

First of all, *hypermd* requires CSS files in JavaScript, and RequireJS doesn't support `require("./style.css")`.
Thus, when RequireJS is loaded, before using it, **load [this patch to make RequireJS support css files](../goods/patch-requirejs.js)**

(This patch can be found in HyperMD package. Its file path is  `goods/patch-requirejs.js` and you can load it via some URL like `https://laobubu.net/HyperMD/goods/patch-requirejs.js` )

As for the `packages` field, [this reference](../demo/requirejs_packages.js) can be helpful.

```js

// 1. Configure RequireJS

requirejs.config({
  // baseUrl: "/node_modules/",                  // using local version
  // baseUrl: "https://cdn.jsdelivr.net/npm/",   // or use CDN
  baseUrl: "/node_modules/",

  // (Remove this section if you occur errors with CDN)
  // RequireJS doesn't read package.json. Let's tell it the entries of modules.
  packages: [
    { name: 'hypermd', main: 'everything.js' },
    { name: 'codemirror', main: 'lib/codemirror.js' },
    { name: 'mathjax', main: 'MathJax.js' },
    { name: 'katex', main: 'dist/katex.min.js' },
    { name: 'marked', main: 'lib/marked.js' },
    { name: 'turndown', main: 'lib/turndown.browser.umd.js' },
    { name: 'turndown-plugin-gfm', main: 'dist/turndown-plugin-gfm.js' },
    { name: 'emojione', main: 'lib/js/emojione.min.js' },
    { name: 'twemoji', main: '2/twemoji.amd.js' },
    // ... more 3rd parties
  ],
  waitSeconds: 15
})

// 2. Declare your main module

require([
  'codemirror/lib/codemirror',
  'hypermd/everything',  // Want to tailor and pick components? Please see demo/index.js

  // Load these modes if you want highlighting ...
  "codemirror/mode/htmlmixed/htmlmixed", // for embedded HTML
  "codemirror/mode/stex/stex", // for Math TeX Formular
  "codemirror/mode/yaml/yaml", // for Front Matters

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




## with plain HTML

Don't want to use either bundler or module loader? You can still load HyperMD in plain browser environment.

Please read the source code of [this demo](./examples/ai1.html)



## convert existing CodeMirror markdown editor to HyperMD editor

If a markdown editor (based on CodeMirror ≥ 5.37.0) is already initialized and presented on page,
you can easily turn it into HyperMD markdown editor!

**Invoke `HyperMD.switchToHyperMD(editor);`** where `editor` is the CodeMirror editor instance.

> :warning: **Closure problem**, again...
>
> CodeMirror and HyperMD __must__ be loaded by the same method: either bundler, RequireJS or `<script>` tags.
> If not same, HyperMD might not work properly because it can't access the correct CodeMirror!
>
> Some components (eg. SimpleMDE, React-CodeMirror) use their __private__ CodeMirror build,
> which is __not supported__ by HyperMD. Further tweaking is required.
> [(example for react-codemirror)](https://github.com/laobubu/HyperMD/issues/26#issuecomment-391420190)

This will update editor options with `HyperMD.suggestedEditorConfig`.
If there are options you don't like, you may overwrite it, with the 2nd parameter of `switchToHyperMD`:

```js
// example: I want to keep "vim" keyMap
HyperMD.switchToHyperMD(editor, {
  keyMap: "vim"
})
```



[parcel-bundler]: https://parceljs.org/
[options-for-addons]: ./options-for-addons.md
[PowerPacks]: ./powerpacks.md
