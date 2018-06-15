# HyperMD 中文文档

![HyperMD Logo](../../demo/logo.png)

[English](../index.md)

> **提示**
>
> 页面上所有的链接都是可以直接点开的。不用按着 `Ctrl` 或者 `Alt`，随便点！
> [试试看]

文档还没写完……请考虑：

1. 如果你使用模块加载器，请参考 [主页的README文档](../../demo/README.zh-CN.md)
2. 如果你更喜欢用传统 HTML 标签来引入编辑器，请参考 [这个文件](../examples/ai1.html) 的源代码
3. 如果想深入了解 HyperMD 的插件，请浏览[源代码](https://github.com/laobubu/HyperMD/)
   - 推荐使用 VSCode。
   - 以后说不准会用 TypeScript 生成文档。
4. 阅读 [插件相关的编辑器选项][]

## 快速开始

**注意**

1. **HyperMD 会在代码里 require 初始化所需的CSS样式文件**
2. 如果有不需要的扩展，可以在 *编辑器选项* 里禁用。参考 [插件相关的编辑器选项][]
3. 如果想利用 **第三方库** 增强 HyperMD 的功能，请使用 [PowerPack][] 来载入它们。

### 使用打包器 (webpack / parcel-bundler...)

首先，在项目文件夹下运行 `npm install hypermd codemirror`
以及 `npm install katex marked` （或者你也可以不安装后面这两个库，但是要删除代码里 `powerpack` 相关部分）

然后开始编码！试着做一个简单的 `index.html`

```html
<!DOCTYPE HTML>
<html>
  <head>
    <title>绝赞编辑器</title>
  </head>
  <body>
    <textarea id="myTextarea"># Hello World</textarea>

    <script src="index.js"></script>
  </body>
</html>
```

再丢几行代码到 `index.js` 里:

```js
var HyperMD = require("hypermd")
// hypermd 模块会引入 codemirror 和一堆 css 文件

// 如果需要为特殊元素添加语法高亮，请载入对应的模式
require("codemirror/mode/htmlmixed/htmlmixed") // Markdown 内嵌HTML
require("codemirror/mode/stex/stex") // TeX 数学公式
require("codemirror/mode/yaml/yaml") // Front Matter

// 如果需要用第三方库增强 HyperMD 功能，请载入所需的 PowerPacks
require("hypermd/powerpack/fold-math-with-katex") // 将会自动引入 "katex"
require("hypermd/powerpack/hover-with-marked") // 将会自动引入 "marked"
// 你还可以再此添加其他 power packs...
// Power packs 需要第三方库，别忘记安装它们！

var myTextarea = document.getElementById("myTextarea")
var cm = HyperMD.fromTextArea(myTextarea, {
  /* 在此添加其他编辑器选项 */
  hmdModeLoader: false, // 见下面的备注
})
```

假设你用的是 [parcel 打包器][]，只需要运行 `parcel index.html` 就可以了。

[parcel 打包器]: https://parceljs.org/ 极速零配置Web应用打包工具

> **你可能需要 css-loader**
>
> HyperMD 使用 `require("xxx.css")` 的方式引入 css 样式。请确保你已经配置了 [css-loader](https://github.com/webpack-contrib/css-loader)。
> 有的打包器自带此功能，例如 [parcel-bundler][] 就不需要配置。

> ***mode-loader* 不可用**
>
> 打包器的闭包会将 CodeMirror 隐藏起来。
> 你可以把 `CodeMirror` 暴露到全局，并且设置 `hmdModeLoader` 属性为 `"https://cdn.jsdelivr.net/npm/codemirror/"` 之类的值。
>
> 或者在初始化编辑器之前引入语法高亮组件，例如 `require("codemirror/mode/haskell/haskell")`

### 使用 [RequireJS](http://requirejs.org/) 模块加载器

首先，*hypermd* 在 JavaScript 里用 require 引入 CSS 文件，
然而 RequireJS 默认不支持 `require("./style.css")` 这种写法。
因此，**在使用 RequireJS 前，请先载入 [这个补丁](../demo/patch-requirejs.js)！**

载入 require.js 并打补丁之后，你大概只需要像这样写就行了（[参考这个文件](../../demo/index.js) ）:

```js

// 1. 配置 RequireJS

requirejs.config({
  // baseUrl: "/node_modules/",                  // 使用本地保存的库
  // baseUrl: "https://cdn.jsdelivr.net/npm/",   // 使用CDN加载库
  baseUrl: "/node_modules/",

  // (如果你使用 CDN 遇到问题，删除这段)
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
  'hypermd/everything',  // 如果想选择性地只载入部分组件, 参考 demo/index.js

  // 如果需要为特殊元素添加语法高亮，请载入对应的模式
  "codemirror/mode/htmlmixed/htmlmixed", // Markdown 内嵌HTML
  "codemirror/mode/stex/stex", // TeX 数学公式
  "codemirror/mode/yaml/yaml", // Front Matter

  // 随后，使用 PowerPack 和各种第三方库来增强 HyperMD 功能。
  // 具体可用列表请参考文档，或者 demo/index.js
  'hypermd/powerpack/fold-math-with-katex',

  'hypermd/powerpack/paste-with-turndown',
  'turndown-plugin-gfm',

], function (CodeMirror, HyperMD) {
  var myTextarea = document.getElementById('myTextareaID')
  var editor = HyperMD.fromTextArea(myTextarea, {
    /* 这里可以设置一些 编辑器选项 */
  })
})

```

### 使用纯 HTML 标签

不喜欢打包器和模块加载器？你可以用纯 HTML 标签来引入 HyperMD 编辑器！

请参考 [这个文件](../examples/ai1.html) 的源代码


[插件相关的编辑器选项]: ./options-for-addons.md
[PowerPack]: ../powerpacks.md
