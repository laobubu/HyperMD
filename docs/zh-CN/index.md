# HyperMD 中文文档

![HyperMD Logo](../../demo/logo.png)

[English](../index.md)

> **提示**
>
> 页面上所有的链接都是可以直接点开的。不用按着 `Ctrl` 或者 `Alt`，随便点！
> [试试看]

文档还没写完……请考虑：

1. 如果你使用模块加载器，请参考 [主页的README文档](../../demo/README.zh-CN.md)
2. 如果你更喜欢用传统 HTML 标签来引入编辑器，请参考 <../examples/ai1.html>
3. 如果想深入了解 HyperMD 的插件，请浏览[源代码](https://github.com/laobubu/HyperMD/)
   - 推荐使用 VSCode。
   - 以后说不准会用 TypeScript 生成文档。

## 快速开始

**注意**

1. **必须等 CSS 样式加载好后，再初始化编辑器！**
2. 如果有不需要的扩展，可以在 *编辑器选项* 里禁用。参考 [编辑器配置](./configurations.md)
3. 用到的 **第三方库** 必须在 HyperMD 载入前载入。
4. 一些库（例如 **MathJax**）需要特殊的配置才能用，参考 [编辑器配置](./configurations.md)

### 使用打包器 (webpack / parcel-bundler...)

首先，运行 `npm i hypermd` 下载库。然后，试着做一个简单的 `index.html`：

```html
<html>
  <head>
    <title>绝赞编辑器</title>
  </head>
  <body>
    <textarea id="myTextarea"></textarea>

    <!-- NOTE: 样式必须在js之前载入 ! -->
    <link rel="stylesheet" href="index.css">
    <script src="index.js"></script>
  </body>
</html>
```

丢四行代码到 `index.css` 里:

```css
@import "codemirror/lib/codemirror.css";
@import "codemirror/addon/fold/foldgutter.css";
@import "hypermd/mode/hypermd.css";
@import "hypermd/theme/hypermd-light.css";
```

再丢四行代码到 `index.js` 里:

```js
// 在此处 require 其他第三方库
var HyperMD = require("hypermd")
var myTextarea = document.getElementById("myTextarea")
var cm = HyperMD.fromTextArea(myTextarea, { /* 在此添加其他编辑器选项 */ })
```

假设你用的是 [parcel 打包器](https://parceljs.org/)，只需要运行 `parcel index.html` 就可以了。

> **some CodeMirror features will be unavaliable** unless you load them.
>
> Features that provided by CodeMirror built-in addons `codemirror/addon/*`, like folding, will be unavaliable.
> You may import them before initializing editor. The list can be found in <../demo/index.js>.

> ***mode-loader* will be unavaliable**
>
> Bundlers use closures, making CodeMirror invisible to global. You may expose `CodeMirror` to global and set editor option `hmdLoadModeFrom` to something like `"https://cdn.jsdelivr.net/npm/codemirror/"`.
>
> Or you can just bundle and pre-load all modes you need, which might make the js build larger.

### 使用 [RequireJS](http://requirejs.org/) 模块加载器

载入 CSS 和 require.js 之后，你大概只需要像这样写就行了（别忘记看一下 <../demo/index.js> ）:

```js

// 1. 配置 RequireJS

requirejs.config({
  // baseUrl: "/node_modules/",                  // 使用本地保存的库
  // baseUrl: "https://cdn.jsdelivr.net/npm/",   // 使用CDN加载库
  baseUrl: "/node_modules/",

  // (如果你使用 CDN 遇到问题，删除这段)
  // RequireJS doesn't read package.json or detect entry file.
  packages: [
    {
      name: 'codemirror',
      main: 'lib/codemirror'
    },
    {
      name: 'mathjax',
      main: 'MathJax.js'
    },
    {
      name: 'marked',
      main: 'lib/marked'
    },
    // HyperMD doesn't need this, unless you use all-in-one build
  ],
  waitSeconds: 15
})

// 2. Declare your main module

require([
  'codemirror/lib/codemirror',
  'hypermd/core',

  // ...
  // 在这里引入各个组件和第三方库
  // 参考 demo/index.js
  // ...

], function (CodeMirror, HyperMD) {
  var myTextarea = document.getElementById('myTextareaID')
  var editor = HyperMD.fromTextArea(myTextarea, {
    /* optional editor options here */
  })
})

```

### with plain HTML

Don't want to use either bundler or module loader? You can still load HyperMD in plain browser environment.

Please read the source code of <./examples/ai1.html>
