# HyperMD

![HyperMD Markdown Editor](./demo/logo.png)

**打破** Markdown *写作* 和 *预览* 的 **次元壁**！

[在线演示](https://laobubu.net/HyperMD/)
[English](../README.md)

## 选择 HyperMD 的 N 个理由

HyperMD 是一组 [CodeMirror] 插件、模式和主题。

你可以在一个页面上同时使用 HyperMD 和 CodeMirror。

1. Markdown 写作和预览，一个框就够了
    - **粗体字**、*斜体字*、~~删除线~~、`Code`
    - [链接](https://laobubu.net)、图片、脚注
    - 引用块、代码块
    - 标题
    - 水平线
    - [x] 列表（支持层叠列表、待办事项框）
    - TeX 公式渲染，例如 $ e^{ i\pi } + 1 = 0 $ 或者公式块 [^4]
    - 普通表格
2. **按着 Alt 点击** 可以打开链接，或者跳到脚注 [^1]
3. **代码块语法高亮** 支持数百种语言 [^2]
4. **鼠标悬停** 可以查看脚注内容
5. **复制粘贴** 自动转换网页内容为 Markdown [^5]
6. **可复用大量 CodeMirror 插件**，包括
    - VIM/Emacs 模式、自定义按键绑定
    - Diff and Merge
    - 全屏
    - 各种主题 [^3]
7. **自动载入语法高亮规则**
8. **上传图片** 只需要复制粘贴，或者把文件拖进来就行了
9. **[还有更多...][doc]**

## 快速开始

首先，推荐使用 [RequireJS] 来载入依赖项，这也是 HyperMD 开发时的做法。
如果你想使用 HTML 标签逐个导入 CSS 和 JS，请参考 <./docs/examples/ai1.html>。

在导入 CSS 样式、载入并配置了 [RequireJS] 之后，照着 `demo/index.js` 里面的方式初始化编辑器即可。

一切准备就绪后，只需要几行代码，就可以把你的 `<textarea>` 变成 HyperMD 编辑器：

```javascript
var myTextarea = document.getElementById('input-area')
var editor = HyperMD.fromTextArea(myTextarea)
```

具体的配置选项可以查阅[参考文档][doc] 。

## 一起来搞事

HyperMD 是 [laobubu] 的一个开源项目，欢迎你：

 - [在 GitHub 贡献代码](https://github.com/laobubu/HyperMD/) ，编写你的组件和主题
 - [帮我买杯咖啡](https://laobubu.net/donate.html)
 - 将 HyperMD 分享给更多人



-------------------------------------------------------
[CodeMirror]: https://codemirror.net/   很强的网页端文本编辑器
[RequireJS]:  http://requirejs.org/   用于 JavaScript 的 AMD 模块加载器
[MathJax]:  https://www.mathjax.org/  支持 Tex 的数学公式渲染组件
[marked]:   https://github.com/chjj/marked/  一个 markdown 解析器和渲染器
[turndown]: https://github.com/domchristie/turndown 一个 HTML 转 Markdown 的组件
[turndown-plugin-gfm]: https://github.com/domchristie/turndown-plugin-gfm 为 turndown 添加删除线和表格支持
[laobubu]:  https://laobubu.net/  HyperMD 的作者
[doc]: https://laobubu.net/HyperMD/docs/ HyperMD 的文档

[^1]: 按着 Ctrl 点击也行
[^2]: 只要是 CodeMirror 支持的都能用
[^3]: 如果主题没有为 HyperMD 特殊设计，那么用起来可能会有点难受
[^4]: 公式块和代码块类似， 使用 `$$` 包裹你的公式，支持多行
[^5]: 使用 `Ctrl+Shift+V` 可以粘贴纯文本
