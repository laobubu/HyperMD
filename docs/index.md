# HyperMD Documentation

![HyperMD Logo](../demo/logo.png)

[中文文档](./zh-CN/index.md)

> **Notice**
>
> All links are DIRECTLY clickable. Feel free to click without `Ctrl` or `Alt`!
> [Try out]


## Level 1

In this section, you will learn how to make HyperMD basically runs on your webpage.

+ [**Quick Start**](./quick-start.md): first of all, let's put HyperMD into your webpage...
+ [**PowerPacks**](./powerpacks.md): and integrate 3rd-party libs and services, make HyperMD more powerful!

Once a editor is ready, lots of API and methods are available. These pages can be helpful.

+ [**CodeMirror's API**](https://codemirror.net/doc/manual.html#api): remember that a HyperMD editor is also a CodeMirror editor!

## Level 2

In this section, you will try to add some interesting features to your editor.

Assuming there is a variable named as `cm`, storing your editor instance.

+ **Load and Save Content**
  - `cm.getValue()` returns Markdown text string
  - `cm.setValue(text)`

+ **Toggle WYSIWYG mode**
  - `HyperMD.switchToNormal(cm)`
  - `HyperMD.switchToHyperMD(cm)`

+ **Handle Relative URL**
  - Image and Link URL in Markdown can be relative URL.
  - HyperMD editors have a API `cm.hmdResolveURL("../relative/url")`, which is provided by addon _ReadLink_.
  - _ReadLink_ the addon resolves relative paths, and its `baseURI` is configurable.
  - Before loading Markdown text, `cm.setOption('hmdReadLink', { baseURI: "xxx" })`
    where `xxx` is the absolute path to current markdown file. eg. `http://laobubu.net/notes/2018/test.md`

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

## Level 4

In this section, you will learn how to write a HyperMD addon.

## Level 5

Understand TypeScript and CodeMirror? Want to add new features to HyperMD core? Great! Let's dive into HyperMD.

[The source code of HyperMD](https://github.com/laobubu/HyperMD/) is open on GitHub! To develop, VSCode is highly recommended.
