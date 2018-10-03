# 快速开始

**注意**

1. **HyperMD 会在代码里 require 所需的CSS样式文件**
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


> ***mode-loader* 不可用**
>
> 打包器的闭包会将 CodeMirror 隐藏起来。
> 你可以把 `CodeMirror` 暴露到全局，并且设置 `hmdModeLoader` 属性为 `"https://cdn.jsdelivr.net/npm/codemirror/"` 之类的值。
>
> 或者在初始化编辑器之前引入语法高亮组件，例如 `require("codemirror/mode/haskell/haskell")`


### 如果你使用了 `webpack`

HyperMD 包含一些类似 `require("xxx.css")` 的代码来引入样式。
因此，请确保你安装了这几个 loader：

` npm install -D  css-loader  style-loader  url-loader `

然后，你的 webpack 配置文件得配置好他们：

```js
// webpack.config.js
module.exports = {

  /* ... 你的其他配置项 ... */

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
      /* ... 在此添加其他 loader ... */
    ]
  }
}
```




### 使用 [RequireJS](http://requirejs.org/) 模块加载器

[**🙋 直接看例子**](../examples/basic-requirejs.html)

首先，*hypermd* 在 JavaScript 里用 require 引入 CSS 文件，
然而 RequireJS 默认不支持 `require("./style.css")` 这种写法。
因此，**在载入 RequireJS 之后，开始使用它前，请先载入 [一个让 RequireJS 能导入 CSS 的补丁](../../goods/patch-requirejs.js)！**

（这个补丁文件已包含在 HyperMD 包中，文件名是 `goods/patch-requirejs.js` 。你可以通过类似 `https://laobubu.net/HyperMD/goods/patch-requirejs.js` 的地址引用到它 ）

载入 require.js 并打补丁之后，你大概只需要像这样写就行了（[参考这个文件](../../demo/index.js) ）:

注意其中的 packages 字段，你可以参考 [这个文件的内容](../../demo/requirejs_packages.js)

```js

// 1. 配置 RequireJS

requirejs.config({
  // baseUrl: "/node_modules/",                  // 使用本地保存的库
  // baseUrl: "https://cdn.jsdelivr.net/npm/",   // 使用CDN加载库
  baseUrl: "/node_modules/",

  // (如果你使用 CDN 遇到问题，删除这段)
  // RequireJS 不会去解析 package.json ，需要手动设置各个模块的入口文件名
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
    // ... 其他第三方资源
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


## 将已有的 CodeMirror markdown 编辑器转成 HyperMD 模式

如果你的页面上已经有一个基于 CodeMirror（版本 ≥ 5.37.0） 的 Markdown 编辑器了，
你可以很轻松地将它转换为 HyperMD 模式：

**调用 `HyperMD.switchToHyperMD(editor);` 即可**，其中 `editor` 是那个 CodeMirror 编辑器实例

> :warning: **还是闭包的问题**...
>
> CodeMirror 和 HyperMD __必须__ 用相同的方法载入：要么用打包器, 要么 RequireJS 或者 `<script>` 标签。
> 如果不一致，HyperMD 可能会无法正常工作，因为它无法访问正确的 CodeMirror！
>
> 有的组件 (例如 SimpleMDE, React-CodeMirror) 使用了其 __私有的__ CodeMirror 版本,
> HyperMD 是不支持的。如果要支持的话，可能得花一点功夫……
> [(例如 react-codemirror 得这样搞)](https://github.com/laobubu/HyperMD/issues/26#issuecomment-391420190)

此操作会把 `HyperMD.suggestedEditorConfig` 里面的配置逐个应用到你的编辑器上，
如果有不喜欢的配置项，你可以使用 `switchToHyperMD` 的第二个可选参数来覆盖之：

```js
// 举个栗子： 我就是想用 "vim" 按键绑定
HyperMD.switchToHyperMD(editor, {
  keyMap: "vim"
})
```



[插件相关的编辑器选项]: ./options-for-addons.md
[PowerPack]: ../powerpacks.md
