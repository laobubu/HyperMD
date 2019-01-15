# HyperMD Documentation

![HyperMD Logo](../demo/logo.png)

[中文文档](./zh-CN/index.md)

> **Notice**
>
> All links are DIRECTLY clickable. Feel free to click without `Ctrl` or `Alt`!

> **Notice**
>
> Some document files are auto generated and excluded in source code repository.
>
> Please read this document on
> [HyperMD Demo](https://laobubu.net/HyperMD/?directOpen#./docs/index.md)
> or
> [GitHub gh-pages branch](https://github.com/laobubu/HyperMD/blob/gh-pages/docs/index.md)

## Level 1

In this section, you will learn how to make HyperMD basically runs on your webpage.

+ [**Quick Start**](./quick-start.md): first of all, let's put HyperMD into your webpage...
+ [**PowerPacks**](./powerpacks.md): and integrate 3rd-party libs and services, make HyperMD more powerful!

Once a editor is ready, lots of API and methods are available. These pages can be helpful.

+ [**CodeMirror's API**](https://codemirror.net/doc/manual.html#api): remember that a HyperMD editor is also a CodeMirror editor!

## Level 2

In this section, you will try to add some interesting features to your editor.

Assuming there is a variable named as `editor`, storing your editor instance.

+ **Load and Save Content**
  - `editor.getValue()` returns Markdown text string
  - `editor.setValue(text)`

+ **Toggle WYSIWYG mode**
  - `HyperMD.switchToNormal(editor)`
  - `HyperMD.switchToHyperMD(editor)`

+ **Update HyperMD Editor/Addon Options**
  - You can use `editor.setOption(name, value)` during runtime
  - HyperMD-related addon option names always start with "hmd",
    the full list can be found here: [Options-for-Addons][]

+ **Handle Relative URL**
  - Image and Link URL in Markdown can be relative URL.
  - HyperMD editors have a API `editor.hmdResolveURL("../relative/url")`, which is provided by addon _ReadLink_.
  - _ReadLink_ the addon resolves relative paths, and its `baseURI` is configurable.
  - Before loading Markdown text, `editor.setOption('hmdReadLink', { baseURI: "xxx" })`
    where `xxx` is the absolute path to the directory. eg. `http://laobubu.net/notes/2018/6/` (without filename)

## Level 3

In this section, you will learn how HyperMD magic works, and write some advanced handlers.

1. A document (Markdown text) is loaded
2. __HyperMD Mode__ parses, tokenizes and styles the text
3. __Addons__ use the parsed info to implement features
   + __HideToken__ hides `*`s, `~~`s and more formatting tokens
   + __Click__ checks the clicked element's token type, and call ClickHandler
   + __FoldMath__ checks if a token is the beginning of a formula (usually, a `$`), folds to the end and renders $\TeX$ formula
   + _and more_

**Conclusion**:

1. To support some syntax-based feature, eg. #hashtag , you have to
   - [Configure the Mode](./options-for-mode.md)
   - or [submit a feature request](https://github.com/laobubu/HyperMD/issues/new) if the syntax is not supported yet.
2. The parsed token info is essential and useful.
   - :bulb: **Hint**: You can use [CodeMirror mode-related API](https://codemirror.net/doc/manual.html#api_mode) to extract the parsed info.
     + [getTokenAt](https://codemirror.net/doc/manual.html#getTokenAt)
     + [getLineTokens](https://codemirror.net/doc/manual.html#getLineTokens)
     + [getTokenTypeAt](https://codemirror.net/doc/manual.html#getTokenTypeAt)
     + _and more_

## Level 4

In this section, you will learn how to write a HyperMD addon / powerpack.

**PowerPacks** are optional modules that integrate 3rd-party libs and services to HyperMD.
They work with specific addons and 3rd-party libs.

Here is a list of [HyperMD built-in PowerPacks](./powerpacks.md) and their source code can be found [here](https://github.com/laobubu/HyperMD/tree/master/src/powerpack).

(this part is under construction)

## Level 5

Understand TypeScript and CodeMirror? Want to add new features to HyperMD core? Great! Let's dive into HyperMD.

[The source code of HyperMD](https://github.com/laobubu/HyperMD/) is open on GitHub! To develop, VSCode is highly recommended.

(this part is under construction)

## Documentation is unfinished

[Buy me a coffee](https://laobubu.net/donate.html) to encourage me?

-----

[options-for-addons]: ./options-for-addons.md
