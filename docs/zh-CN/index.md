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

## 快速开始

**注意**

1. **必须等 CSS 样式加载好后，再初始化编辑器！**
2. 如果有不需要的扩展，可以在 *编辑器选项* 里禁用。参考 [编辑器配置](./configurations.md)
3. 用到的 **第三方库** 必须在 HyperMD 载入前载入。
4. 一些库（例如 **MathJax**）需要特殊的配置才能用，参考 [编辑器配置](./configurations.md)

### 使用打包器 (webpack / parcel-bundler...)

首先，运行 `npm i hypermd codemirror` 下载库。然后，试着做一个简单的 `index.html`：

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

> **一些基于 CodeMirror 自带插件的功能，需要手动 import**
>
> 有的功能是基于 CodeMirror 自带插件 `codemirror/addon/*` 的，例如折叠段落，需要手动引入对应模块。
> 如果需要的话，请在初始化编辑器之前引入它们，相关的 addon 列表在[这里](../demo/index.js)。

> ***mode-loader* 不可用**
>
> 打包器的闭包会将 CodeMirror 隐藏起来。你可以把 `CodeMirror` 暴露到全局，并且设置 `hmdLoadModeFrom` 属性为 `"https://cdn.jsdelivr.net/npm/codemirror/"` 之类的值。
>
> Or you can just bundle and pre-load all modes you need, which might make the js build larger.

### 使用 [RequireJS](http://requirejs.org/) 模块加载器

载入 CSS 和 require.js 之后，你大概只需要像这样写就行了（[参考这个文件](../../demo/index.js) ）:

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

### 使用纯 HTML 标签

不喜欢打包器和模块加载器？你可以用纯 HTML 标签来引入 HyperMD 编辑器！

请参考 [这个文件](../examples/ai1.html) 的源代码
