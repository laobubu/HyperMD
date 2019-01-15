# HyperMD 中文文档

![HyperMD Logo](../../demo/logo.png)

[English](../index.md)

> **提示**
>
> 页面上所有的链接都是可以直接点开的。不用按着 `Ctrl` 或者 `Alt`，随便点！

> **提示**
>
> 文档里有些东西是由程序生成的，不在 master 分枝里。
>
> 如果要阅读文档，请访问
> [HyperMD 在线演示](https://laobubu.net/HyperMD/?directOpen#./docs/zh-CN/index.md)
> 或者
> [GitHub gh-pages 分枝](https://github.com/laobubu/HyperMD/blob/gh-pages/docs/zh-CN/index.md)

文档还没写完……请考虑：

0. 看英文版：[English Version](../index.md)
1. 如果你使用模块加载器，请参考 [主页的README文档](./README.md)
2. 如果你更喜欢用传统 HTML 标签来引入编辑器，请参考 [这个文件](../examples/ai1.html) 的源代码
3. 如果想深入了解 HyperMD 的插件，请浏览[源代码](https://github.com/laobubu/HyperMD/)
   - 推荐使用 VSCode。
   - 以后说不准会用 TypeScript 生成文档。
4. 阅读 [插件相关的编辑器选项][]


## Level 1

在这一关，你将学会如何把 HyperMD 放到你的网页上运行。

+ [**快速入门教程**](./quick-start.md): 新手村基础任务
+ [**PowerPacks**](../powerpacks.md): 想使用第三方库增强 HyperMD 功能？引入对应的 PowerPack 就行了！

一旦编辑器就绪，你就可以用它提供的 API 为所欲为了。离开这一关之前，你可以看看：

+ [**CodeMirror API**](https://codemirror.net/doc/manual.html#api): 别忘了， HyperMD 编辑器同时也是一个 CodeMirror 编辑器！所有 API、插件…… 都是通用的！


## Level 2

在这一关，你将使用 JavaScript 为编辑器添加一些有趣的功能。

假设你的编辑器实例存放在一个叫做 `editor` 的变量里。

+ **读取和设置内容**
  - `editor.getValue()` 返回 Markdown 字符串
  - `editor.setValue(text)`

+ **开启和关闭 所见即所得模式**
  - `HyperMD.switchToNormal(editor)`  切换到 Markdown 源代码
  - `HyperMD.switchToHyperMD(editor)`   切换到实时预览

+ **修改 HyperMD 编辑器、插件 的配置**
  - 在运行过程中，可以使用 `editor.setOption(name, value)` 来修改配置项
  - HyperMD 相关的插件的配置项，名字都以 "hmd" 开头
    完整的配置项列表可以参考这个文件: [Options-for-Addons](./options-for-addons.md)

+ **处理相对路径 URL**
  - 在 Markdown 里，图片和连接的地址可以是相对路径。
  - HyperMD 内置的 _ReadLink_ 插件提供了实用的 API `editor.hmdResolveURL("../relative/url")`
  - _ReadLink_ 用于解析相对路径，其 `baseURI` 参数是可配置的
  - 在载入你的 Markdown 文档前，记得配置那个参数： `editor.setOption('hmdReadLink', { baseURI: "xxx" })`
    其中 `xxx` 是文档所在的文件夹的 __绝对路径__ ，例如. `http://laobubu.net/notes/2018/6/` (注意，是没有文件名的)

## 其他还没写完...

[帮我买杯咖啡](https://laobubu.net/donate.html)，为我加个油 :joy:
