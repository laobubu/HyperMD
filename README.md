# HyperMD

![HyperMD Markdown Editor](./demo/logo.png)

**Breaks the Wall** between *writing* and *preview*, in a Markdown Editor.

[![NPM version](https://img.shields.io/npm/v/hypermd.svg?style=flat-square)](https://npmjs.org/package/hypermd) [![Build Status](https://travis-ci.org/laobubu/HyperMD.svg?branch=master)](https://travis-ci.org/laobubu/HyperMD)

[Online Demo](https://laobubu.net/HyperMD/)
[中文介绍](./demo/README.zh-CN.md)

## Why use HyperMD?

HyperMD is a set of [CodeMirror] add-ons / modes / themes.

You may use both original CodeMirror and HyperMD on the same page.

1. Write, and preview on the fly
    - **Strong**, *Emphasis*, ~~Strikethrough~~, `Code`
    - [Links](https://laobubu.net), Images, Footnotes
    - Block-quotes, code blocks
    - Headers
    - Horizontal Rules
    - [x] Lists (nested, ordered, unordered, tasks with checkbox)
    - TeX Formula, like $ e^{ i\pi } + 1 = 0 $ or multi-line math blocks [^4]
    - Simple Tables
2. **Alt+Click** to follow link / footnote [^1]
3. **Syntax Highlight** for 120+ languages code blocks [^2]
4. **Hover** to read footnotes
5. **Copy and Paste**, translate HTML into Markdown [^5]
6. **Massive CodeMirror Add-ons** can be loaded, including:
    - VIM/Emacs mode and Configurable keybindings
    - Diff and Merge
    - Fullscreen
    - Themes [^3]
7. **Code Block Highlighting** language modes are loaded automatically
8. **Upload Images** copy and paste, or drag'n'drop
9. **Power Packs** power up HyperMD with 3rd-party libs like [MathJax][], [marked][], KaTeX ...
10. **[And More...][doc]**

## Quickstart

```javascript
// npm install --save hypermd codemirror
var HyperMD = require('hypermd')
var myTextarea = document.getElementById('input-area')
var editor = HyperMD.fromTextArea(myTextarea)
```

If you use bundlers, that's all. CSS will be imported via "hypermd" javascript.

For [RequireJS][] users and pure HTML lovers, please read [QuickStart Section in Documentation][doc]!

## Contributing

HyperMD is a personal Open-Source project by [laobubu].
Contributions are welcomed. You may:

 - [Fork on GitHub](https://github.com/laobubu/HyperMD/) , create your amazing themes and add-ons.
 - [Buy me a Coffee](https://laobubu.net/donate.html)
 - Spread HyperMD to the world!



-------------------------------------------------------
[CodeMirror]: https://codemirror.net/   A powerful text editor for the browser.
[RequireJS]:  http://requirejs.org/   A JavaScript AMD module loader.
[MathJax]:  https://www.mathjax.org/  A display engine for mathematics.
[marked]:   https://github.com/chjj/marked/  A markdown parser and compiler.
[turndown]: https://github.com/domchristie/turndown An HTML to Markdown converter
[turndown-plugin-gfm]: https://github.com/domchristie/turndown-plugin-gfm Turndown plugin to add GitHub Flavored Markdown extensions
[laobubu]:  https://laobubu.net/  The author of HyperMD.
[doc]: https://laobubu.net/HyperMD/docs/ HyperMD Documentation

[^1]: Ctrl+Click works too, but will jump to the footnote if exists.
[^2]: Languages as many as CodeMirror supports.
[^3]: If the theme is not designed for HyperMD, some features might not be present.
[^4]: Math block use `$$` to wrap your TeX expression.
[^5]: Use `Ctrl+Shift+V` to paste plain text.
