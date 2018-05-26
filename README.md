# HyperMD

![HyperMD Markdown Editor](./demo/logo.png)

**Breaks the Wall** between *writing* and *preview*, in a Markdown Editor.

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
    - [MathJax] Formula, like $ e^{ i\pi } + 1 = 0 $ and math block [^4]
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
9. **[And More...][doc]**

## Quickstart

[RequireJS] is recommended and used during developing HyperMD.
If you prefer importing all css/js with HTML tags manually, see [demo with HyperMD all-in-one build](./docs/examples/ai1.html).

Once you've loaded [RequireJS] and CSS files, you may set-up a editor like `demo/index.js` does.

Usually, to transform your `<textarea>` into HyperMD editor, all you need is just two lines:

```javascript
var myTextarea = document.getElementById('input-area')
var editor = HyperMD.fromTextArea(myTextarea)
```

And that's all. Configuration guide can be found in [doc].

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
[^4]: Math block is just like code block. Use `$$` to wrap your math expression.
[^5]: Use `Ctrl+Shift+V` to paste plain text.
